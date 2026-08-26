import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, FileText, Upload, Brain, Trophy, MessageSquare, CheckCircle2,
  Sparkles, Zap, Shield, BarChart3, Users, Clock
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <AppHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-[0.08]" aria-hidden />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-24 sm:px-6 lg:pt-28 lg:pb-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 rounded-full border border-border/60 px-4 py-1.5">
              <Sparkles className="mr-1.5 h-3 w-3 text-primary" />
              Powered by Gemini + semantic matching
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Hire faster with{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">AI screening</span>
              {" "}that actually understands resumes.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Upload a job description, drop in resumes, and SkillMatch AI scores, ranks,
              and shortlists candidates in seconds — with a full breakdown of skills, ATS
              compatibility, and gaps.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-elegant">
                <Link to="/auth">Start screening free <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/live-demo">Try the live demo</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 text-center sm:mx-auto sm:max-w-xl">
              {[
                { k: "10x", v: "Faster shortlisting" },
                { k: "97%", v: "Recruiter satisfaction" },
                { k: "60s", v: "Per resume analyzed" },
              ].map((s) => (
                <div key={s.k}>
                  <div className="text-2xl font-bold sm:text-3xl">{s.k}</div>
                  <div className="text-xs text-muted-foreground sm:text-sm">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">From posting to interview in 4 steps</h2>
          <p className="mt-3 text-muted-foreground">Every stage is AI-assisted so your team focuses on people, not paperwork.</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: FileText, title: "Post a job", body: "Type or upload the JD. AI extracts required skills automatically." },
            { icon: Upload, title: "Collect resumes", body: "Candidates upload PDFs via drag-and-drop with instant validation." },
            { icon: Brain, title: "AI analyzes", body: "Semantic matching scores skills, ATS, projects, and experience." },
            { icon: Trophy, title: "Interview top talent", body: "Auto-shortlist above your threshold and schedule interviews." },
          ].map((s, i) => (
            <Card key={s.title} className="shadow-card relative overflow-hidden border-border/60 p-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-xs font-medium text-muted-foreground">Step {i + 1}</div>
              <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gradient-subtle py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Everything a modern hiring team needs</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Brain, title: "Semantic matching", body: "Embeddings + LLM reasoning surface true fit, not just keywords." },
              { icon: BarChart3, title: "Deep analytics", body: "Score distributions, top skills, gaps across the pipeline." },
              { icon: Trophy, title: "Auto leaderboard", body: "Live ranking with filters by score, skills, college, or experience." },
              { icon: Shield, title: "ATS scoring", body: "Every resume flagged for parsing, formatting, and readability." },
              { icon: MessageSquare, title: "Candidate feedback", body: "AI-written strengths, gaps, and personalized recommendations." },
              { icon: Clock, title: "Interview scheduling", body: "One click to invite. Students see it on their dashboard instantly." },
            ].map((f) => (
              <Card key={f.title} className="shadow-card border-border/60 p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Personas */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-elegant border-border/60 p-8">
            <Users className="h-8 w-8 text-primary" />
            <h3 className="mt-4 text-2xl font-bold">For recruiters & admins</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {["Post jobs & upload JDs (PDF/DOCX)", "Instant ranked leaderboards", "Score distribution & hiring analytics", "Shortlist thresholds & auto-invite", "Export candidates to PDF/Excel"].map((t) => (
                <li key={t} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> {t}</li>
              ))}
            </ul>
            <Button asChild className="mt-6 bg-gradient-primary text-primary-foreground"><Link to="/auth">Get recruiter access</Link></Button>
          </Card>
          <Card className="shadow-elegant border-border/60 p-8">
            <Zap className="h-8 w-8 text-primary" />
            <h3 className="mt-4 text-2xl font-bold">For students</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {["Upload resume once, apply everywhere", "AI feedback with concrete fixes", "Track application & interview status", "See your ATS score & missing skills", "Downloadable improvement report"].map((t) => (
                <li key={t} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> {t}</li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-6"><Link to="/auth">Improve my resume</Link></Button>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} SkillMatch AI · Built for modern hiring.
      </footer>
    </div>
  );
}
