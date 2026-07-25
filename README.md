# SkillMatch AI

AI-powered resume screening and career intelligence platform.

## Features

- **ATS Resume Screening** — weighted scoring across keywords, skills, experience, education, projects, certifications, and formatting.
- **Recruiter Dashboard** — create jobs, bulk-upload resumes, view ranked leaderboards, and schedule interviews.
- **Candidate Reports** — detailed strengths, weaknesses, missing keywords, and personalized recommendations.
- **AI Resume Chat (RAG)** — ask natural-language questions against indexed resumes with source citations.
- **Premium Auth** — email/password + Google OAuth, role-based access (admin, recruiter, student), and RLS-protected data.

## Tech Stack

- **Frontend:** TanStack Start v1, React 19, TanStack Router, TanStack Query, Tailwind CSS v4, shadcn/ui
- **Backend:** Supabase (Postgres + Auth + Storage), TanStack `createServerFn`
- **AI:** Lovable AI Gateway — `google/gemini-2.5-flash` for analysis, `openai/text-embedding-3-small` for RAG
- **Runtime:** Cloudflare Workers (edge)

## Quick Start

```bash
bun install
cp .env.example .env
bun run dev
```

App runs at `http://localhost:8080`.

## Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | client | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | client | Supabase project ref |
| `LOVABLE_API_KEY` | server-only | Lovable AI Gateway key |

## License

MIT © 2026 SkillMatch AI
