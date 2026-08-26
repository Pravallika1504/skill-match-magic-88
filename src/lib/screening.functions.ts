import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { parseLooseJson } from "./json-repair";


const AnalyzeInput = z.object({
  jobId: z.string().uuid(),
  resumeId: z.string().uuid(),
});

const SYSTEM = `You are SkillMatch AI, an expert technical recruiter and ATS resume analyst.
Read the ATTACHED candidate resume PDF and analyze it against the provided job description.
Return ONLY a single valid JSON object (no prose, no markdown fences) with EXACTLY this schema:

{
  "candidate_name": string,
  "candidate_email": string,
  "raw_text_excerpt": string,          // first ~600 chars of extracted resume text
  "keyword_match": number,             // 0-100 how many JD keywords appear in resume
  "skill_match": number,               // 0-100 required-skills coverage
  "experience_match": number,          // 0-100 relevance & years vs JD
  "education_match": number,           // 0-100 degree/field relevance
  "project_match": number,             // 0-100 project relevance to JD
  "certification_match": number,       // 0-100 relevant certifications
  "formatting_score": number,          // 0-100 ATS-friendly layout (sections, no tables/images blockers)
  "grammar_score": number,             // 0-100 grammar & readability
  "job_match_score": number,           // 0-100 overall semantic fit to JD
  "matched_skills": string[],
  "missing_skills": string[],
  "matched_keywords": string[],
  "missing_keywords": string[],
  "education": string[],               // one line per degree
  "experience": string[],              // one line per role: "Title @ Company (dates) — impact"
  "projects": string[],
  "certifications": string[],
  "achievements": string[],
  "strengths": string[],               // 3-6 bullets
  "weaknesses": string[],              // 3-6 bullets
  "recommendations": string[],         // 4-8 actionable, personalized improvements
  "formatting_issues": string[],
  "grammar_issues": string[],
  "summary": string,                   // 2-3 sentence justification of scores
  "experience_analysis": string,
  "education_analysis": string,
  "project_relevance": string,
  "certification_analysis": string
}

Rules:
- Base every score on the ACTUAL resume content vs the JD. Do not invent facts.
- Be strict but fair. Different resumes MUST get different scores.
- Never return placeholders like "N/A" for the scores; use a number 0-100.`;


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


    // Extract JSON (model sometimes wraps in fences or emits slightly invalid JSON)
    let parsed: any;
    try {
      parsed = parseLooseJson(text);
    } catch {
      // One repair pass: ask the model to re-emit strictly valid JSON.
      const { text: repaired } = await generateText({
        model,
        system:
          "You convert malformed JSON into strictly valid JSON. Output ONLY the JSON object, no fences, no commentary. Preserve all data.",
        messages: [{ role: "user", content: text.slice(0, 30000) }],
      });
      parsed = parseLooseJson(repaired);
    }


    const clamp = (v: any) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));



    // Weighted ATS score per spec
    const keyword_match = clamp(parsed.keyword_match);
    const skill_match = clamp(parsed.skill_match);
    const experience_match = clamp(parsed.experience_match);
    const education_match = clamp(parsed.education_match);
    const project_match = clamp(parsed.project_match);
    const certification_match = clamp(parsed.certification_match);
    const formatting_score = clamp(parsed.formatting_score);
    const grammar_score = clamp(parsed.grammar_score);
    const job_match_score = clamp(parsed.job_match_score);

    const ats_score = clamp(
      keyword_match * 0.30 +
        skill_match * 0.25 +
        experience_match * 0.15 +
        education_match * 0.10 +
        project_match * 0.10 +
        certification_match * 0.05 +
        formatting_score * 0.05,
    );
    const score = ats_score;

    // Persist enriched analysis JSON with computed sub-scores
    const analysis = {
      ...parsed,
      keyword_match,
      skill_match,
      experience_match,
      education_match,
      project_match,
      certification_match,
      formatting_score,
      grammar_score,
      job_match_score,
      ats_score,
    };

    await supabase
      .from("resumes")
      .update({
        candidate_name: parsed.candidate_name ?? null,
        candidate_email: parsed.candidate_email ?? null,
        parsed: analysis,
        raw_text: parsed.raw_text_excerpt ?? null,
      })
      .eq("id", resume.id);

    const shortlisted = score >= (job.shortlist_threshold ?? 80);
    const status: "shortlisted" | "reviewed" = shortlisted ? "shortlisted" : "reviewed";

    const payload = {
      job_id: job.id,
      resume_id: resume.id,
      candidate_id: resume.user_id,
      score,
      ats_score,
      skill_match,
      experience_match,
      education_match,
      matched_skills: parsed.matched_skills ?? [],
      missing_skills: parsed.missing_skills ?? [],
      missing_keywords: parsed.missing_keywords ?? [],
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
      recommendations: parsed.recommendations ?? [],
      summary: parsed.summary ?? null,
      analysis,
      status,
    };

    const { data: screening, error: sErr } = await supabase
      .from("screenings")
      .upsert(payload, { onConflict: "job_id,resume_id" })
      .select()
      .single();
    if (sErr) throw new Error(sErr.message);

    void userId;
    return { screeningId: screening.id, score, ats_score, status, shortlisted };
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
