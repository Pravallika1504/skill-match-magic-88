import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/current-user";
import { useServerFn } from "@tanstack/react-start";
import { analyzeResume } from "@/lib/screening.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Sparkles, Trophy, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jobs/$id")({
  component: JobDetail,
});

function JobDetail() {
  const { id } = useParams({ from: "/_authenticated/jobs/$id" });
  const { user, role } = useCurrentUser();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeResume);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [search, setSearch] = useState("");

  const { data: job } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: screenings } = useQuery({
    queryKey: ["screenings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screenings")
        .select("id, score, ats_score, skill_match, status, candidate_id, resume_id, matched_skills, missing_skills, resumes!inner(candidate_name, candidate_email, file_name)")
        .eq("job_id", id)
        .order("score", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    setProcessing(true);
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        toast.error(`${file.name} is not a PDF`);
        continue;
      }
      try {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const up = await supabase.storage.from("resumes").upload(path, file, { contentType: "application/pdf" });
        if (up.error) throw up.error;
        const { data: resume, error: rErr } = await supabase
          .from("resumes")
          .insert({ user_id: user.id, file_path: path, file_name: file.name })
          .select().single();
        if (rErr) throw rErr;

        toast.info(`Analyzing ${file.name}…`);
        const res = await analyze({ data: { jobId: id, resumeId: resume.id } });
        toast.success(`Scored ${res.score}/100`);
      } catch (e: any) {
        toast.error(e.message || "Upload failed");
      }
    }
    setProcessing(false);
    qc.invalidateQueries({ queryKey: ["screenings", id] });
  };

  const canRecruit = role === "recruiter" || role === "admin";
  const filtered = (screenings ?? []).filter((s: any) =>
    s.score >= minScore &&
    (!search ||
      (s.resumes?.candidate_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.matched_skills ?? []).some((sk: string) => sk.toLowerCase().includes(search.toLowerCase())))
  );

  if (!job) return <div className="mx-auto max-w-6xl px-4 py-8">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Card className="shadow-elegant p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{job.title}</h1>
            <p className="text-sm text-muted-foreground">{job.company ?? "—"} · {job.location ?? "Remote"}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {(job.required_skills ?? []).map((s: string) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            Shortlist ≥ <span className="font-semibold text-primary">{job.shortlist_threshold}</span>
          </div>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{job.description}</p>
      </Card>

      <Card
        className={`shadow-card mt-6 border-2 border-dashed p-8 text-center transition ${dragOver ? "border-primary bg-accent/50" : "border-border"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
          <Upload className="h-5 w-5" />
        </div>
        <h3 className="mt-3 font-semibold">Drop resumes here</h3>
        <p className="text-xs text-muted-foreground">PDF only · Multiple files supported</p>
        <Input ref={inputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <Button className="mt-4 bg-gradient-primary text-primary-foreground" onClick={() => inputRef.current?.click()} disabled={processing}>
          {processing ? <><Sparkles className="mr-1 h-4 w-4 animate-pulse" /> Analyzing…</> : "Choose files"}
        </Button>
      </Card>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Trophy className="h-5 w-5 text-primary" /> Leaderboard</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-48 pl-8" />
          </div>
          <select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
            <option value={0}>All scores</option>
            <option value={80}>≥ 80</option>
            <option value={60}>≥ 60</option>
            <option value={40}>≥ 40</option>
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {filtered.length === 0 && (
          <Card className="shadow-card p-8 text-center text-sm text-muted-foreground">
            No resumes screened yet. {canRecruit ? "Upload some PDFs to get started." : "Upload your resume above to apply."}
          </Card>
        )}
        {filtered.map((s: any, i: number) => (
          <Link key={s.id} to="/resumes/$id" params={{ id: s.resume_id }}>
            <Card className="shadow-card group flex items-center gap-4 border-border/60 p-4 transition hover:border-primary hover:shadow-elegant">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-sm font-bold tabular-nums">#{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate font-medium">{s.resumes?.candidate_name ?? s.resumes?.file_name}</span>
                  <Badge variant="outline" className="capitalize">{s.status}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(s.matched_skills ?? []).slice(0, 5).map((sk: string) => (
                    <Badge key={sk} variant="secondary" className="text-[10px]">{sk}</Badge>
                  ))}
                </div>
              </div>
              <div className="w-32">
                <div className="text-right text-xs text-muted-foreground">Score</div>
                <div className="flex items-center gap-2">
                  <Progress value={s.score} />
                  <span className="w-8 text-right text-sm font-bold tabular-nums">{s.score}</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
