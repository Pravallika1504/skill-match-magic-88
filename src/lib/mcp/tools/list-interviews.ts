import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_interviews",
  title: "List interviews",
  description: "List scheduled interviews visible to the signed-in user, soonest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum interviews to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("interviews")
      .select("id, screening_id, scheduled_at, mode, interviewer, meeting_link, venue, notes")
      .order("scheduled_at", { ascending: true })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { interviews: data ?? [] },
    };
  },
});
