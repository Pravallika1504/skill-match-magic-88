import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar, Video, MapPin, User, Briefcase, Sparkles, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/interviews")({
  component: Interviews,
});

function normalizeOne<T>(rel: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(rel)) return rel[0];
  return rel ?? undefined;
}

function Interviews() {
  const { data } = useQuery({
    queryKey: ["interviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select("id, scheduled_at, mode, meeting_link, venue, interviewer, notes, status, screenings(id, score, ats_score, skill_match, experience_match, matched_skills, missing_skills, missing_keywords, strengths, weaknesses, recommendations, summary, jobs(title, company, description), resumes(candidate_name, file_name))")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl"><Calendar className="h-6 w-6 text-primary" /> Interviews</h1>
      <p className="text-sm text-muted-foreground">Upcoming and past interview invitations.</p>

      <div className="mt-6 grid gap-3">
        {(data ?? []).map((iv: any) => {
          const screening = normalizeOne(iv.screenings);
          const job = normalizeOne(screening?.jobs);
          const resume = normalizeOne(screening?.resumes);
          return (
          <Card key={iv.id} className="shadow-card border-border/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{job?.title} @ {job?.company ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Candidate: {resume?.candidate_name ?? resume?.file_name}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{iv.status ?? "scheduled"}</Badge>
                <Badge className="bg-gradient-primary text-primary-foreground">Score {iv.screenings?.score}</Badge>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> {new Date(iv.scheduled_at).toLocaleString()}</div>
              <div className="flex items-center gap-2 capitalize">
                {iv.mode === "online" ? <Video className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-primary" />}
                {iv.mode} · {iv.meeting_link || iv.venue || "TBD"}
              </div>
              {iv.interviewer && <div className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /> {iv.interviewer}</div>}
              <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> {iv.screenings?.jobs?.title ?? "Role"}</div>
            </div>
            {iv.mode === "online" && iv.meeting_link && (
              <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground">
                <a href={iv.meeting_link} target="_blank" rel="noopener noreferrer">
                  <Video className="mr-1 h-4 w-4" /> Join Interview <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            {iv.notes && <p className="mt-3 text-sm text-muted-foreground">{iv.notes}</p>}

            <Accordion type="single" collapsible className="mt-4">
              <AccordionItem value="prep" className="border-b-0">
                <AccordionTrigger className="text-sm font-medium">
                  <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Interview Preparation</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 text-sm md:grid-cols-2">
                    {iv.screenings?.summary && (
                      <div className="md:col-span-2 rounded-lg bg-muted/50 p-3 text-muted-foreground">{iv.screenings.summary}</div>
                    )}
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Lead with these strengths</div>
                      <div className="flex flex-wrap gap-2">
                        {(iv.screenings?.matched_skills ?? []).map((x: string) => (
                          <Badge key={x} className="bg-success/15 text-success">{x}</Badge>
                        ))}
                        {(iv.screenings?.matched_skills ?? []).length === 0 && <span className="text-muted-foreground">—</span>}
                      </div>
                      <ul className="mt-3 space-y-1">
                        {(iv.screenings?.strengths ?? []).map((x: string) => (
                          <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{x}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Prepare answers for these gaps</div>
                      <div className="flex flex-wrap gap-2">
                        {[...(iv.screenings?.missing_skills ?? []), ...(iv.screenings?.missing_keywords ?? [])].map((x: string) => (
                          <Badge key={x} variant="outline" className="border-destructive/40 text-destructive">{x}</Badge>
                        ))}
                        {[...(iv.screenings?.missing_skills ?? []), ...(iv.screenings?.missing_keywords ?? [])].length === 0 && <span className="text-muted-foreground">—</span>}
                      </div>
                      <ul className="mt-3 space-y-1">
                        {(iv.screenings?.weaknesses ?? []).map((x: string) => (
                          <li key={x} className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{x}</li>
                        ))}
                      </ul>
                    </div>
                    {(iv.screenings?.recommendations ?? []).length > 0 && (
                      <div className="md:col-span-2">
                        <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Action plan before the interview</div>
                        <ol className="list-decimal space-y-1 pl-5 marker:text-primary">
                          {(iv.screenings?.recommendations ?? []).map((r: string) => <li key={r}>{r}</li>)}
                        </ol>
                      </div>
                    )}
                    {iv.screenings?.jobs?.description && (
                      <div className="md:col-span-2">
                        <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Job description to review</div>
                        <p className="whitespace-pre-wrap text-muted-foreground line-clamp-6">{iv.screenings.jobs.description}</p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        );
        })}
        {(data?.length ?? 0) === 0 && (
          <Card className="shadow-card p-8 text-center text-sm text-muted-foreground">No interviews scheduled yet.</Card>
        )}
      </div>
    </div>
  );
}
