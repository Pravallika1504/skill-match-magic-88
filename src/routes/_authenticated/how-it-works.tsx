import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Brain, Trophy, MessageSquare, Calendar, CheckCircle2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — SkillMatch AI" },
      { name: "description", content: "See exactly how SkillMatch AI screens, scores, ranks, and shortlists resumes with AI." },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  { icon: FileText, title: "Upload Job Description", body: "Recruiter posts a JD or uploads a PDF/DOCX. AI extracts required skills and keywords." },
  { icon: Upload, title: "Upload Resumes", body: "Students drag-and-drop PDFs. Each file is validated and stored securely." },
  { icon: Brain, title: "AI Extracts Data", body: "Gemini parses each PDF into structured data: skills, projects, education, experience." },
  { icon: Brain, title: "AI Matches Skills", body: "Semantic embeddings compare candidate to JD beyond keyword matching." },
  { icon: Trophy, title: "AI Scores & Ranks", body: "0–100 score with breakdown (skill, ATS, experience, education). Live leaderboard." },
  { icon: MessageSquare, title: "Feedback Generated", body: "Strengths, gaps, missing skills, ATS issues, and personalized recommendations." },
  { icon: CheckCircle2, title: "Shortlist Created", body: "Anything above your threshold (e.g. 80) is auto-shortlisted." },
  { icon: Calendar, title: "Interview Scheduled", body: "One click sets date, mode, and meeting link. Candidate sees it instantly." },
];

function HowItWorks() {
  return (
    <div className="min-h-screen">
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4">The full workflow</Badge>
          <h1 className="text-4xl font-bold sm:text-5xl">How SkillMatch AI works</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Every step is automated end-to-end. Recruiters focus on interviews. Students get actionable feedback.
          </p>
        </div>

        <ol className="mt-12 space-y-4">
          {steps.map((s, i) => (
            <Card key={s.title} className="shadow-card flex items-start gap-4 border-border/60 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step {i + 1}</div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </Card>
          ))}
        </ol>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-elegant">
            <Link to="/auth">Start free <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline"><Link to="/live-demo">Try the demo</Link></Button>
        </div>
      </section>
    </div>
  );
}
