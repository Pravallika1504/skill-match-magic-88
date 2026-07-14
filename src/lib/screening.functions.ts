import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const AnalyzeInput = z.object({
  jobId: z.string().uuid(),
  resumeId: z.string().uuid(),
});

const SYSTEM = `You are SkillMatch AI, an expert technical recruiter and resume analyst.
Analyze a candidate's resume against a job description. Return ONLY valid JSON (no prose, no markdown fences) matching this schema:

{
  "candidate_name": string,
  "candidate_email": string,
  "raw_text_excerpt": string, // 500 chars of extracted resume text
  "score": number,           // 0-100 overall match
  "ats_score": number,       // 0-100 ATS compatibility
  "skill_match": number,     // 0-100
  "experience_match": number,// 0-100
  "education_match": number, // 0-100
  "matched_skills": string[],
  "missing_skills": string[],
  "missing_keywords": string[],
  "strengths": string[],       // 3-6 bullets
  "weaknesses": string[],      // 3-6 bullets
  "recommendations": string[], // 4-8 actionable improvements
  "summary": string,           // 2-3 sentence explanation of the score
  "grammar_issues": string[],
  "formatting_issues": string[],
  "project_relevance": string,
  "experience_analysis": string,
  "education_analysis": string,
  "certification_analysis": string
}

Be strict but fair. Base the score on skills coverage, experience, project relevance, education, keyword alignment, and ATS friendliness.`;

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, title, company, description, required_skills, min_experience_years, shortlist_threshold, recruiter_id")
      .eq("id", data.jobId)
      .maybeSingle();
    if (jobErr || !job) throw new Error("Job not found");

    const { data: resume, error: rErr } = await supabase
      .from("resumes")
      .select("id, user_id, file_path, file_name")
      .eq("id", data.resumeId)
      .maybeSingle();
    if (rErr || !resume) throw new Error("Resume not found");

    // Download PDF from storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("resumes")
      .download(resume.file_path);
    if (dlErr || !fileData) throw new Error("Could not download resume file");

    const buffer = new Uint8Array(await fileData.arrayBuffer());
    // base64 encode
    let binary = "";
    for (let i = 0; i < buffer.length; i++) binary += String.fromCharCode(buffer[i]);
    const b64 = btoa(binary);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-flash");

    const userPrompt = `JOB TITLE: ${job.title}\nCOMPANY: ${job.company ?? "N/A"}\nREQUIRED SKILLS: ${(job.required_skills ?? []).join(", ") || "(inferred from description)"}\nMIN EXPERIENCE (years): ${job.min_experience_years ?? 0}\n\nJOB DESCRIPTION:\n${job.description}\n\nAnalyze the attached candidate resume PDF against this job. Respond with the JSON object only.`;

    const { text } = await generateText({
      model,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "file",
              data: b64,
              mediaType: "application/pdf",
              filename: resume.file_name,
            },
          ],
        },
      ],
    });


    // Extract JSON (model sometimes wraps in fences despite instruction)
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned unparseable output");
      parsed = JSON.parse(match[0]);
    }

    const clamp = (v: any) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
    const score = clamp(parsed.score);

    // Update resume metadata
    await supabase
      .from("resumes")
      .update({
        candidate_name: parsed.candidate_name ?? null,
        candidate_email: parsed.candidate_email ?? null,
        parsed,
        raw_text: parsed.raw_text_excerpt ?? null,
      })
      .eq("id", resume.id);

    const status: "shortlisted" | "reviewed" =
      score >= (job.shortlist_threshold ?? 80) ? "shortlisted" : "reviewed";

    // Upsert screening (unique on job_id + resume_id)
    const payload = {
      job_id: job.id,
      resume_id: resume.id,
      candidate_id: resume.user_id,
      score,
      ats_score: clamp(parsed.ats_score),
      skill_match: clamp(parsed.skill_match),
      experience_match: clamp(parsed.experience_match),
      education_match: clamp(parsed.education_match),
      matched_skills: parsed.matched_skills ?? [],
      missing_skills: parsed.missing_skills ?? [],
      missing_keywords: parsed.missing_keywords ?? [],
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
      recommendations: parsed.recommendations ?? [],
      summary: parsed.summary ?? null,
      analysis: parsed,
      status,
    };

    const { data: screening, error: sErr } = await supabase
      .from("screenings")
      .upsert(payload, { onConflict: "job_id,resume_id" })
      .select()
      .single();
    if (sErr) throw new Error(sErr.message);

    void userId;
    return { screeningId: screening.id, score, status };
  });

const ScheduleInput = z.object({
  screeningId: z.string().uuid(),
  scheduled_at: z.string(),
  mode: z.enum(["online", "offline"]),
  interviewer: z.string().optional(),
  meeting_link: z.string().optional(),
  venue: z.string().optional(),
  notes: z.string().optional(),
});

export const scheduleInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ScheduleInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: iv, error } = await supabase
      .from("interviews")
      .insert({
        screening_id: data.screeningId,
        scheduled_at: data.scheduled_at,
        mode: data.mode,
        interviewer: data.interviewer ?? null,
        meeting_link: data.meeting_link ?? null,
        venue: data.venue ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("screenings").update({ status: "interview" }).eq("id", data.screeningId);
    return iv;
  });
