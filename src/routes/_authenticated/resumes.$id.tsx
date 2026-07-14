import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/current-user";
import { useServerFn } from "@tanstack/react-start";
import { scheduleInterview } from "@/lib/screening.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/score-ring";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Sparkles, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/resumes/$id")({
  component: ResumeDetail,
});

function ResumeDetail() {
  const { id } = useParams({ from: "/_authenticated/resumes/$id" });
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const schedule = useServerFn(scheduleInterview);

  const [when, setWhen] = useState("");
  const [mode, setMode] = useState<"online" | "offline">("online");
  const [link, setLink] = useState("");
  const [interviewer, setInterviewer] = useState("");

  const { data: resume } = useQuery({
    queryKey: ["resume", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("resumes").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: screenings } = useQuery({
    queryKey: ["screenings-for-resume", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screenings")
        .select("*, jobs(id, title, company, shortlist_threshold, recruiter_id)")
        .eq("resume_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const s = screenings?.[0];
  const analysis = (s?.analysis ?? {}) as any;

  const doSchedule = async () => {
    if (!s || !when) return;
    try {
      await schedule({
        data: {
          screeningId: s.id,
          scheduled_at: new Date(when).toISOString(),
          mode,
          meeting_link: mode === "online" ? link : undefined,
          venue: mode === "offline" ? link : undefined,
          interviewer,
        },
      });
      toast.success("Interview scheduled");
      qc.invalidateQueries({ queryKey: ["screenings-for-resume", id] });
    } catch (e: any) {
      toast.error(e.message || "Failed");
    }
  };

  if (!resume) return <div className="mx-auto max-w-6xl px-4 py-8">Loading…</div>;
  if (!s) return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-xl font-bold">No analysis yet</h1>
      <p className="mt-2 text-sm text-muted-foreground">This resume hasn't been screened against a job yet.</p>
    </div>
  );

  const canSchedule = (role === "recruiter" || role === "admin") && s.jobs?.recruiter_id === user?.id;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-elegant flex flex-col items-center p-8 text-center">
          <ScoreRing score={s.score} size={140} label="Overall" />
          <h2 className="mt-4 text-lg font-semibold">{resume.candidate_name ?? resume.file_name}</h2>
          {resume.candidate_email && <p className="text-sm text-muted-foreground">{resume.candidate_email}</p>}
          <p className="mt-2 text-xs text-muted-foreground">{s.jobs?.title}</p>
          <Badge className="mt-4 capitalize">{s.status}</Badge>
          {canSchedule && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="mt-4 w-full bg-gradient-primary text-primary-foreground"><Calendar className="mr-1 h-4 w-4" /> Schedule interview</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Schedule interview</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>When</Label><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
                  <div><Label>Mode</Label>
                    <div className="mt-1 flex gap-2">
                      {(["online", "offline"] as const).map((m) => (
                        <Button key={m} type="button" variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)} className={mode === m ? "bg-gradient-primary text-primary-foreground" : ""}>{m}</Button>
                      ))}
                    </div>
                  </div>
                  <div><Label>{mode === "online" ? "Meeting link" : "Venue"}</Label><Input value={link} onChange={(e) => setLink(e.target.value)} /></div>
                  <div><Label>Interviewer</Label><Input value={interviewer} onChange={(e) => setInterviewer(e.target.value)} placeholder="Name & role" /></div>
                  <Button onClick={doSchedule} className="w-full bg-gradient-primary text-primary-foreground">Send invite</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </Card>

        <Card className="shadow-card lg:col-span-2 p-6">
          <h3 className="font-semibold">Score breakdown</h3>
          <div className="mt-4 space-y-3">
            {[
              { l: "ATS compatibility", v: s.ats_score },
              { l: "Skill match", v: s.skill_match },
              { l: "Experience match", v: s.experience_match },
              { l: "Education match", v: s.education_match },
            ].map((r) => (
              <div key={r.l}>
                <div className="mb-1 flex justify-between text-sm"><span>{r.l}</span><span className="font-medium tabular-nums">{r.v}</span></div>
                <Progress value={r.v} />
              </div>
            ))}
          </div>
          {s.summary && (
            <div className="mt-6 rounded-lg bg-muted/50 p-4 text-sm">
              <div className="mb-1 flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4 text-primary" /> Why this score</div>
              <p className="text-muted-foreground">{s.summary}</p>
            </div>
          )}
        </Card>

        <Card className="shadow-card p-6">
          <h3 className="mb-3 font-semibold">Matched skills</h3>
          <div className="flex flex-wrap gap-2">
            {(s.matched_skills ?? []).map((x: string) => <Badge key={x} className="bg-success/15 text-success">{x}</Badge>)}
            {(s.matched_skills ?? []).length === 0 && <span className="text-sm text-muted-foreground">None</span>}
          </div>
        </Card>
        <Card className="shadow-card p-6">
          <h3 className="mb-3 font-semibold">Missing skills</h3>
          <div className="flex flex-wrap gap-2">
            {(s.missing_skills ?? []).map((x: string) => <Badge key={x} variant="outline" className="border-destructive/40 text-destructive">{x}</Badge>)}
            {(s.missing_skills ?? []).length === 0 && <span className="text-sm text-muted-foreground">None</span>}
          </div>
        </Card>
        <Card className="shadow-card p-6">
          <h3 className="mb-3 font-semibold">Missing keywords</h3>
          <div className="flex flex-wrap gap-2">
            {(s.missing_keywords ?? []).map((x: string) => <Badge key={x} variant="outline">{x}</Badge>)}
            {(s.missing_keywords ?? []).length === 0 && <span className="text-sm text-muted-foreground">None</span>}
          </div>
        </Card>

        <Card className="shadow-card p-6">
          <h3 className="mb-3 font-semibold">Strengths</h3>
          <ul className="space-y-2 text-sm">
            {(s.strengths ?? []).map((x: string) => (
              <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{x}</li>
            ))}
          </ul>
        </Card>
        <Card className="shadow-card p-6 lg:col-span-2">
          <h3 className="mb-3 font-semibold">Weaknesses</h3>
          <ul className="space-y-2 text-sm">
            {(s.weaknesses ?? []).map((x: string) => (
              <li key={x} className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{x}</li>
            ))}
          </ul>
        </Card>

        <Card className="shadow-card p-6 lg:col-span-3">
          <h3 className="mb-3 font-semibold">Personalized recommendations</h3>
          <ol className="list-decimal space-y-2 pl-5 text-sm marker:text-primary">
            {(s.recommendations ?? []).map((r: string) => <li key={r}>{r}</li>)}
          </ol>
        </Card>

        {(analysis.project_relevance || analysis.experience_analysis || analysis.education_analysis) && (
          <Card className="shadow-card p-6 lg:col-span-3">
            <h3 className="mb-4 font-semibold">Deep analysis</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {analysis.project_relevance && <div><div className="mb-1 text-xs font-medium uppercase text-muted-foreground">Projects</div><p className="text-sm">{analysis.project_relevance}</p></div>}
              {analysis.experience_analysis && <div><div className="mb-1 text-xs font-medium uppercase text-muted-foreground">Experience</div><p className="text-sm">{analysis.experience_analysis}</p></div>}
              {analysis.education_analysis && <div><div className="mb-1 text-xs font-medium uppercase text-muted-foreground">Education</div><p className="text-sm">{analysis.education_analysis}</p></div>}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
