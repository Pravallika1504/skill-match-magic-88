import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listJobsTool from "./tools/list-jobs";
import listResumesTool from "./tools/list-resumes";
import listScreeningsTool from "./tools/list-screenings";
import getScreeningReportTool from "./tools/get-screening-report";
import listInterviewsTool from "./tools/list-interviews";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "skillmatch-ai",
  title: "SkillMatch AI",
  version: "0.1.0",
  instructions:
    "Tools for SkillMatch AI, an AI resume screening app. List jobs and resumes, review ATS screening results for a job, fetch a full screening report, and list scheduled interviews. All data is scoped to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listJobsTool, listResumesTool, listScreeningsTool, getScreeningReportTool, listInterviewsTool],
});
