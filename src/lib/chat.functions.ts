import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

// ---------- Embedding helper ----------
async function embed(apiKey: string, input: string | string[]): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embedding failed (${res.status}): ${t}`);
  }
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}

// ---------- Chunker ----------
function chunkText(text: string, size = 900, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(clean.length, i + size);
    chunks.push(clean.slice(i, end));
    if (end === clean.length) break;
    i = end - overlap;
  }
  return chunks;
}

// ---------- Index resume ----------
const IndexInput = z.object({ resumeId: z.string().uuid() });

export const indexResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IndexInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { data: resume, error } = await supabase
      .from("resumes")
      .select("id, user_id, file_path, file_name, raw_text")
      .eq("id", data.resumeId)
      .maybeSingle();
    if (error || !resume) throw new Error("Resume not found");

    // Check if already indexed
    const { count } = await supabase
      .from("resume_chunks")
      .select("*", { count: "exact", head: true })
      .eq("resume_id", resume.id);
    if ((count ?? 0) > 0) return { chunks: count, cached: true };

    // Get full text: extract via Gemini from the PDF
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("resumes")
      .download(resume.file_path);
    if (dlErr || !fileData) throw new Error("Could not download resume file");

    const buffer = new Uint8Array(await fileData.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buffer.length; i++) binary += String.fromCharCode(buffer[i]);
    const b64 = btoa(binary);

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-flash");
    const { text: fullText } = await generateText({
      model,
      system:
        "You extract the complete raw text from a resume PDF. Preserve section headings (SKILLS, EXPERIENCE, EDUCATION, PROJECTS, CERTIFICATIONS, ACHIEVEMENTS, CONTACT). Return plain text only — no commentary, no markdown fences.",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the full text of this resume." },
            { type: "file", data: b64, mediaType: "application/pdf", filename: resume.file_name },
          ],
        },
      ],
    });

    const chunks = chunkText(fullText);
    if (chunks.length === 0) throw new Error("No text extracted from resume");

    // Batch embed (openai supports large batches; keep well under limits)
    const BATCH = 64;
    const vectors: number[][] = [];
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      const v = await embed(apiKey, slice);
      vectors.push(...v);
    }

    const rows = chunks.map((content, idx) => ({
      resume_id: resume.id,
      user_id: resume.user_id,
      chunk_index: idx,
      content,
      embedding: vectors[idx] as unknown as string, // pgvector accepts number[] via supabase-js
    }));

    const { error: insErr } = await supabase.from("resume_chunks").insert(rows as any);
    if (insErr) throw new Error(insErr.message);

    // Persist full text on the resume for fallback
    await supabase.from("resumes").update({ raw_text: fullText.slice(0, 20000) }).eq("id", resume.id);

    return { chunks: chunks.length, cached: false };
  });

// ---------- Chat ----------
const ChatInput = z.object({
  resumeId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
});

export const chatWithResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    // Basic prompt-injection sanitization: strip control chars
    const question = data.message.replace(/[\u0000-\u001F\u007F]/g, " ").trim();

    // Ensure conversation
    let conversationId = data.conversationId;
    if (!conversationId) {
      const { data: conv, error } = await supabase
        .from("chat_conversations")
        .insert({
          user_id: userId,
          resume_id: data.resumeId,
          title: question.slice(0, 60),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      conversationId = conv.id;
    }

    // Save user message
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: question,
    });

    // Retrieve top chunks
    const [qEmbed] = await embed(apiKey, question);
    const { data: matches, error: matchErr } = await supabase.rpc("match_resume_chunks", {
      p_resume_id: data.resumeId,
      query_embedding: qEmbed as unknown as string,
      match_count: 6,
    });
    if (matchErr) throw new Error(matchErr.message);

    const sources = (matches ?? []) as Array<{
      id: string;
      chunk_index: number;
      content: string;
      similarity: number;
    }>;

    const context_text = sources
      .map((s, i) => `[Source ${i + 1} · chunk ${s.chunk_index}]\n${s.content}`)
      .join("\n\n---\n\n");

    // Load last few messages for continuity
    const { data: prior } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    const history = (prior ?? []).slice(-8);

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-flash");

    const system = `You are SkillMatch AI, a resume analysis assistant. Answer ONLY using the provided resume excerpts.
If the answer isn't in the excerpts, say so clearly and suggest what's missing. Never invent facts.
Format with short sections, bullet points, and bold headings when useful. Cite sources inline as [S1], [S2] when relevant.
End with a single line: "Confidence: N%" where N reflects how well the excerpts support the answer (10-95).`;

    const userMsg = `RESUME EXCERPTS:\n${context_text || "(no excerpts retrieved)"}\n\nQUESTION: ${question}`;

    const { text } = await generateText({
      model,
      system,
      messages: [
        ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: userMsg },
      ],
    });

    // Parse confidence
    const confMatch = text.match(/Confidence:\s*(\d{1,3})/i);
    const confidence = confMatch ? Math.max(0, Math.min(100, parseInt(confMatch[1], 10))) : null;
    const answer = text.replace(/Confidence:\s*\d{1,3}%?\s*$/i, "").trim();

    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: answer,
      sources: sources.map((s, i) => ({
        label: `S${i + 1}`,
        chunk_index: s.chunk_index,
        similarity: s.similarity,
        excerpt: s.content.slice(0, 240),
      })),
      confidence,
    });

    await supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return { conversationId, answer, confidence, sources };
  });
