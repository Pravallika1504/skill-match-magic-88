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

function Interviews() {
  const { data } = useQuery({
    queryKey: ["interviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interviews")
        .select("id, scheduled_at, mode, meeting_link, venue, interviewer, notes, screenings(id, score, jobs(title, company), resumes(candidate_name, file_name))")
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
        {(data ?? []).map((iv: any) => (
          <Card key={iv.id} className="shadow-card border-border/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{iv.screenings?.jobs?.title} @ {iv.screenings?.jobs?.company ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Candidate: {iv.screenings?.resumes?.candidate_name ?? iv.screenings?.resumes?.file_name}</div>
              </div>
              <Badge className="bg-gradient-primary text-primary-foreground">Score {iv.screenings?.score}</Badge>
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> {new Date(iv.scheduled_at).toLocaleString()}</div>
              <div className="flex items-center gap-2 capitalize">
                {iv.mode === "online" ? <Video className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-primary" />}
                {iv.mode} · {iv.meeting_link || iv.venue || "TBD"}
              </div>
              {iv.interviewer && <div className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /> {iv.interviewer}</div>}
            </div>
            {iv.notes && <p className="mt-3 text-sm text-muted-foreground">{iv.notes}</p>}
          </Card>
        ))}
        {(data?.length ?? 0) === 0 && (
          <Card className="shadow-card p-8 text-center text-sm text-muted-foreground">No interviews scheduled yet.</Card>
        )}
      </div>
    </div>
  );
}
