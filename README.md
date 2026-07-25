# SkillMatch AI 🎯

> **AI-Powered Resume Screening & Career Intelligence Platform**

SkillMatch AI is a full-stack, enterprise-grade resume screening tool that helps recruiters shortlist top candidates in seconds and empowers students to optimize their resumes with actionable AI feedback. Powered by Google Gemini 2.5 Flash and a RAG-based chat engine, it delivers deep ATS analysis, semantic job matching, and conversational resume insights.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stack](https://img.shields.io/badge/stack-TanStack%20Start%20%7C%20React%2019%20%7C%20Supabase-black)
![AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Folder Structure](#-folder-structure)
- [Screenshots](#-screenshots)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Future Enhancements](#-future-enhancements)
- [Contributors](#-contributors)
- [License](#-license)

---

## 🌟 Overview

Hiring teams spend hours manually reviewing resumes; candidates guess what recruiters actually want. **SkillMatch AI** closes both gaps:

- **For Recruiters** — Upload job descriptions, drop in candidate resumes, and get instant weighted ATS scores, ranked leaderboards, and interview scheduling — all in one dashboard.
- **For Candidates (Students)** — Upload your resume, receive a detailed AI report with strengths, weaknesses, missing keywords, and personalized recommendations. Chat with your resume using natural language via a Retrieval-Augmented Generation (RAG) engine.

---

## ✨ Features

### 🔐 Authentication & Security
- Email/password auth with confirm-password validation
- Google OAuth (via managed Lovable gateway)
- Password reset & recovery flows
- Premium split-screen glassmorphism auth UI
- Row-Level Security (RLS) on every table
- Role-based access control (`admin`, `recruiter`, `student`) — roles stored in a separate `user_roles` table to prevent privilege escalation
- Hardcoded default role on signup (client cannot self-elevate)

### 👔 Recruiter Workflow
- Create jobs with title, company, description, required skills, min experience, and shortlist threshold
- Bulk-upload candidate resumes (PDF)
- Automatic weighted ATS scoring per candidate
- Real-time leaderboard ranked by match score
- Detailed per-candidate analysis reports
- Interview scheduling (online/offline) with meeting links, venues, and notes

### 🎓 Student Workflow
- Upload resumes to a private storage bucket
- View full ATS breakdown with strengths, weaknesses, and personalized recommendations
- Track application history across jobs

### 🤖 AI Resume Chat (RAG)
- Semantic search across indexed resumes using `pgvector` + `openai/text-embedding-3-small` (1536-D)
- Chunked full-text extraction (900 chars, 150 overlap) via Gemini 2.5 Flash
- Inline source citations (`[S1]`, `[S2]`) and confidence scores
- Multi-turn chat history persisted per resume
- 3-column layout: resume sidebar · chat interface · candidate detail panel

### 📊 Scoring Engine
Weighted ATS formula (0–100):

| Signal | Weight |
|--------|--------|
| Keyword Match | 30% |
| Skill Match | 25% |
| Experience Match | 15% |
| Education Match | 10% |
| Project Match | 10% |
| Certification Match | 5% |
| Formatting Score | 5% |

---

## 🛠 Tech Stack

**Frontend**
- [TanStack Start v1](https://tanstack.com/start) (React 19 + SSR)
- [TanStack Router](https://tanstack.com/router) — file-based routing
- [TanStack Query](https://tanstack.com/query) — server state
- [Tailwind CSS v4](https://tailwindcss.com/) + shadcn/ui
- Vite 7 build tool

**Backend**
- Supabase (Postgres + Auth + Storage) via Lovable Cloud
- `createServerFn` (TanStack Start server functions)
- `pgvector` extension for embeddings
- Row-Level Security everywhere

**AI**
- Lovable AI Gateway
- `google/gemini-2.5-flash` — resume text extraction & analysis
- `openai/text-embedding-3-small` — 1536-D embeddings for RAG

**Runtime**
- Cloudflare Workers (edge) via TanStack Start

---

## 🏗 Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                      Browser (React 19)                       │
│  TanStack Router · TanStack Query · shadcn/ui · Tailwind v4   │
└──────────────────────────┬───────────────────────────────────┘
                           │ createServerFn (RPC)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│           TanStack Start Server (Cloudflare Workers)          │
│   requireSupabaseAuth middleware · Zod validation · RLS       │
└──────┬─────────────────────────┬───────────────────┬─────────┘
       │                         │                   │
       ▼                         ▼                   ▼
┌─────────────┐        ┌──────────────────┐   ┌────────────────┐
│  Supabase   │        │ Lovable AI       │   │ Supabase       │
│  Postgres   │        │ Gateway          │   │ Storage        │
│  + pgvector │        │ Gemini · OpenAI  │   │ (resumes/)     │
└─────────────┘        └──────────────────┘   └────────────────┘
```

**Request Flow (Screening):**
1. Recruiter uploads PDF → Supabase Storage
2. `analyzeResume` server fn downloads PDF, base64-encodes it
3. Gemini 2.5 Flash extracts + scores against job description → JSON
4. Weighted ATS formula computes final score
5. Result persisted to `screenings` table → leaderboard updates via TanStack Query

**Request Flow (Chat / RAG):**
1. `indexResume` extracts full text → chunks → embeddings → `resume_chunks`
2. `chatWithResume` embeds query → `match_resume_chunks` RPC (cosine similarity)
3. Retrieved chunks + history sent to Gemini → answer with citations

---

## 🚀 Installation

### Prerequisites
- Node.js 20+ / Bun 1.1+
- A Supabase project (or use Lovable Cloud, which provisions one automatically)
- A Lovable AI Gateway API key

### Steps

```bash
# 1. Clone
git clone https://github.com/<your-org>/skillmatch-ai.git
cd skillmatch-ai

# 2. Install
bun install

# 3. Configure environment (see below)
cp .env.example .env

# 4. Run migrations
# Migrations under supabase/migrations are applied automatically on Lovable Cloud.
# For local Supabase: `supabase db push`

# 5. Start dev server
bun run dev
```

App runs at **http://localhost:8080**.

---

## 🔑 Environment Variables

| Variable | Scope | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | client | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | Supabase publishable/anon key |
| `VITE_SUPABASE_PROJECT_ID` | client | Supabase project ref |
| `LOVABLE_API_KEY` | **server-only** | Lovable AI Gateway key (Gemini + embeddings) |

> `LOVABLE_API_KEY` must never be exposed to the browser. It is read only inside server function handlers.

---

## 📁 Folder Structure

```text
skillmatch-ai/
├── src/
│   ├── routes/                      # File-based routing (TanStack)
│   │   ├── __root.tsx               # App shell
│   │   ├── index.tsx                # Landing page
│   │   ├── auth.tsx                 # Premium split-screen auth
│   │   ├── reset-password.tsx
│   │   ├── how-it-works.tsx
│   │   ├── live-demo.tsx
│   │   └── _authenticated/          # Protected subtree
│   │       ├── route.tsx            # Auth gate
│   │       ├── dashboard.tsx
│   │       ├── jobs.index.tsx
│   │       ├── jobs.new.tsx
│   │       ├── jobs.$id.tsx         # Job detail + leaderboard
│   │       ├── resumes.$id.tsx      # AI analysis report
│   │       ├── chat.tsx             # RAG chat UI
│   │       ├── interviews.tsx
│   │       └── history.tsx
│   ├── lib/
│   │   ├── screening.functions.ts   # analyzeResume + scheduleInterview
│   │   ├── chat.functions.ts        # indexResume + chatWithResume
│   │   ├── ai-gateway.server.ts     # Lovable AI provider
│   │   └── utils.ts
│   ├── components/
│   │   ├── ui/                      # shadcn/ui primitives
│   │   ├── app-header.tsx
│   │   └── score-ring.tsx
│   ├── integrations/
│   │   ├── supabase/                # Auto-generated client + types
│   │   └── lovable/                 # OAuth helper
│   ├── styles.css                   # Tailwind v4 + design tokens
│   ├── router.tsx
│   ├── start.ts
│   └── server.ts
├── supabase/
│   ├── config.toml
│   └── migrations/                  # SQL migrations
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 📸 Screenshots

> Replace the placeholders below with real screenshots (drop images in `docs/screenshots/`).

| Screen | Preview |
|--------|---------|
| Landing Page | `![Landing](docs/screenshots/landing.png)` |
| Auth (Split-Screen) | `![Auth](docs/screenshots/auth.png)` |
| Recruiter Dashboard | `![Dashboard](docs/screenshots/dashboard.png)` |
| Job Detail + Leaderboard | `![Leaderboard](docs/screenshots/leaderboard.png)` |
| Resume Analysis Report | `![Report](docs/screenshots/report.png)` |
| AI Resume Chat | `![Chat](docs/screenshots/chat.png)` |
| Interview Scheduling | `![Interview](docs/screenshots/interview.png)` |

---

## 🔌 API Endpoints

All app logic uses **TanStack Start server functions** (`createServerFn`), typed RPC callable from the client via `useServerFn`.

### Screening

| Function | Method | Auth | Purpose |
|----------|--------|------|---------|
| `analyzeResume` | POST | ✅ | Run AI ATS analysis of a resume vs a job |
| `scheduleInterview` | POST | ✅ | Schedule online/offline interview for a screening |

**Input — `analyzeResume`**
```ts
{ jobId: string (uuid), resumeId: string (uuid) }
```

**Response**
```ts
{ screeningId: string, score: number, ats_score: number, status: "shortlisted" | "reviewed", shortlisted: boolean }
```

### Chat (RAG)

| Function | Method | Auth | Purpose |
|----------|--------|------|---------|
| `indexResume` | POST | ✅ | Extract, chunk, and embed a resume for RAG |
| `chatWithResume` | POST | ✅ | Ask a natural-language question against a resume |

**Input — `chatWithResume`**
```ts
{ resumeId: string, conversationId?: string, message: string }
```

**Response**
```ts
{ conversationId: string, answer: string, confidence: number | null, sources: Source[] }
```

### Public Routes
Add webhooks / cron endpoints under `src/routes/api/public/*` (bypasses auth — verify signatures inside the handler).

---

## 🗄 Database Schema

All tables live in the `public` schema with RLS enabled and explicit GRANTs.

### Core Tables

**`profiles`** — extends `auth.users`
```
id uuid PK → auth.users.id
full_name text
avatar_url text
created_at timestamptz
```

**`user_roles`** — role assignments (separate table to prevent escalation)
```
id uuid PK
user_id uuid → auth.users.id
role app_role  -- enum: admin | recruiter | student
UNIQUE (user_id, role)
```

**`jobs`** — recruiter-created postings
```
id uuid PK
recruiter_id uuid → auth.users.id
title text
company text
description text
required_skills text[]
min_experience_years int
shortlist_threshold int  -- default 80
status text              -- active | closed
created_at timestamptz
```

**`resumes`** — uploaded candidate CVs
```
id uuid PK
user_id uuid → auth.users.id
file_path text          -- storage path in `resumes` bucket
file_name text
candidate_name text
candidate_email text
raw_text text
parsed jsonb            -- full AI analysis JSON
created_at timestamptz
```

**`screenings`** — one per (job, resume) pair
```
id uuid PK
job_id uuid → jobs
resume_id uuid → resumes
candidate_id uuid → auth.users
score int, ats_score int
skill_match int, experience_match int, education_match int
matched_skills text[], missing_skills text[], missing_keywords text[]
strengths text[], weaknesses text[], recommendations text[]
summary text
analysis jsonb
status text             -- reviewed | shortlisted | interview | rejected | hired
UNIQUE (job_id, resume_id)
```

**`interviews`**
```
id uuid PK
screening_id uuid → screenings
scheduled_at timestamptz
mode text               -- online | offline
interviewer text
meeting_link text
venue text
notes text
```

### RAG Tables

**`resume_chunks`** — vector store
```
id uuid PK
resume_id uuid → resumes
user_id uuid
chunk_index int
content text
embedding vector(1536)  -- pgvector
```

**`chat_conversations`**
```
id uuid PK, user_id uuid, resume_id uuid
title text, created_at, updated_at
```

**`chat_messages`**
```
id uuid PK
conversation_id uuid → chat_conversations
role text               -- user | assistant
content text
sources jsonb           -- [{ label, chunk_index, similarity, excerpt }]
confidence int
created_at
```

### Functions
- `public.has_role(_user_id uuid, _role app_role) → boolean` — SECURITY INVOKER helper for RLS policies
- `public.handle_new_user()` — trigger on `auth.users`, hardcodes new users to `student` role
- `public.match_resume_chunks(p_resume_id, query_embedding, match_count)` — pgvector cosine similarity search

---

## 🚧 Future Enhancements

- 📄 **DOCX support** in addition to PDF
- 🌍 **Multi-language resumes** (Gemini already supports; add locale-aware prompts)
- 🧠 **Cross-resume comparison mode** — side-by-side leaderboard analysis in chat
- 📧 **Automated candidate emails** (interview invites, rejection notes) via connectors
- 📈 **Recruiter analytics dashboard** — funnel conversion, avg time-to-shortlist
- 🔗 **ATS integrations** (Greenhouse, Lever, Workday) via webhooks
- 🎥 **Async video interviews** with AI transcript scoring
- 🏷 **Custom scoring weights** per job (override the default weighted formula)
- 📱 **Mobile app** (React Native / Expo) sharing the same server functions
- 🧪 **A/B prompt evaluation** framework for continuously improving the analysis prompt

---

## 👥 Contributors

Built with ❤️ by the SkillMatch AI team.

| Role | Name |
|------|------|
| Project Lead | _Your Name_ |
| AI / Backend | _Contributor_ |
| Frontend / UX | _Contributor_ |
| DevOps | _Contributor_ |

Contributions welcome! Open a PR or file an issue.

---

## 📄 License

Released under the **MIT License**. See [`LICENSE`](./LICENSE) for details.

```
MIT License © 2026 SkillMatch AI
```
