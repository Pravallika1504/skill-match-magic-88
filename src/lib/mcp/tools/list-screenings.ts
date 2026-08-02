import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_screenings",
  title: "List screening results",
  description: "List AI screening results (ATS scores, matched/missing skills) for a job, best score first.",
  inputSchema: {
    job_id: z.string().uuid().describe("The job to list screening results for."),
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum results to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ job_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("screenings")
      .select(
        "id, job_id, resume_id, score, ats_score, skill_match, experience_match, education_match, matched_skills, missing_skills, status, summary, created_at",
      )
      .eq("job_id", job_id)
      .order("score", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { screenings: data ?? [] },
    };
  },
});
