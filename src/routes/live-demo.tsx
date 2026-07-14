import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/score-ring";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/live-demo")({
  head: () => ({
    meta: [
      { title: "Live demo — SkillMatch AI" },
      { name: "description", content: "See a sample AI resume analysis with score, skills match, ATS, gaps, and recommendations." },
    ],
  }),
  component: LiveDemo,
});

const sample = {
  candidate: "Priya Sharma",
  email: "priya.sharma@example.com",
  job: "Senior Frontend Engineer @ Nova Labs",
  score: 87,
  ats: 92,
  skill: 84,
  exp: 88,
  edu: 90,
  matched: ["React", "TypeScript", "Next.js", "Tailwind", "GraphQL", "Vitest", "Accessibility"],
  missing: ["Rust", "WebAssembly", "Design systems ownership"],
  strengths: [
    "5+ years shipping consumer-grade React apps",
    "Clear metrics on performance wins (LCP -38%)",
    "Led a design system rollout across 3 squads",
    "Strong open-source presence (2.1k GH stars)",
  ],
  weaknesses: [
    "No mention of Rust/WASM required for compute layer",
    "Limited leadership signal beyond one squad",
    "Certifications section missing",
  ],
  recs: [
    "Add a bullet quantifying team size you've led.",
    "List Rust exposure — even a side project counts.",
    "Move Skills section above Experience for ATS parsing.",
    "Add a Certifications section with recent courses.",
  ],
  summary:
    "Strong senior frontend candidate with excellent React/TS foundation and shipped design-system experience. Score is limited by missing Rust/WASM stack and thin leadership signal.",
};

function LiveDemo() {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-8">
          <Badge className="bg-gradient-primary text-primary-foreground"><Sparkles className="mr-1 h-3 w-3" /> Live demo</Badge>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Sample AI Resume Analysis</h1>
          <p className="mt-1 text-muted-foreground">This is what recruiters and students see after a screening.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="shadow-elegant lg:col-span-1 flex flex-col items-center p-8 text-center">
            <ScoreRing score={sample.score} size={140} label="Overall" />
            <h2 className="mt-4 text-lg font-semibold">{sample.candidate}</h2>
            <p className="text-sm text-muted-foreground">{sample.email}</p>
            <p className="mt-2 text-xs text-muted-foreground">{sample.job}</p>
            <Badge className="mt-4 bg-success/15 text-success">Shortlisted</Badge>
          </Card>

          <Card className="shadow-card lg:col-span-2 p-6">
            <h3 className="font-semibold">Score breakdown</h3>
            <div className="mt-4 space-y-4">
              {[
                { l: "ATS compatibility", v: sample.ats },
                { l: "Skill match", v: sample.skill },
                { l: "Experience match", v: sample.exp },
                { l: "Education match", v: sample.edu },
              ].map((r) => (
                <div key={r.l}>
                  <div className="mb-1 flex justify-between text-sm"><span>{r.l}</span><span className="font-medium tabular-nums">{r.v}</span></div>
                  <Progress value={r.v} />
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg bg-muted/50 p-4 text-sm">
              <div className="font-medium">Why this score</div>
              <p className="mt-1 text-muted-foreground">{sample.summary}</p>
            </div>
          </Card>

          <Card className="shadow-card p-6">
            <h3 className="mb-3 font-semibold">Matched skills</h3>
            <div className="flex flex-wrap gap-2">
              {sample.matched.map((s) => (
                <Badge key={s} className="bg-success/15 text-success hover:bg-success/20">{s}</Badge>
              ))}
            </div>
          </Card>

          <Card className="shadow-card p-6">
            <h3 className="mb-3 font-semibold">Missing skills</h3>
            <div className="flex flex-wrap gap-2">
              {sample.missing.map((s) => (
                <Badge key={s} variant="outline" className="border-destructive/40 text-destructive">{s}</Badge>
              ))}
            </div>
          </Card>

          <Card className="shadow-card p-6">
            <h3 className="mb-3 font-semibold">Strengths</h3>
            <ul className="space-y-2 text-sm">
              {sample.strengths.map((s) => (
                <li key={s} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{s}</li>
              ))}
            </ul>
          </Card>

          <Card className="shadow-card p-6 lg:col-span-2">
            <h3 className="mb-3 font-semibold">Weaknesses</h3>
            <ul className="space-y-2 text-sm">
              {sample.weaknesses.map((s) => (
                <li key={s} className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{s}</li>
              ))}
            </ul>
          </Card>

          <Card className="shadow-card p-6 lg:col-span-3">
            <h3 className="mb-3 font-semibold">Personalized recommendations</h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm marker:text-primary">
              {sample.recs.map((r) => <li key={r}>{r}</li>)}
            </ol>
          </Card>
        </div>
      </section>
    </div>
  );
}
