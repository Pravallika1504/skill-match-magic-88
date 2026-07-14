import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/current-user";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  component: History,
});

function History() {
  const { user } = useCurrentUser();
  const { data } = useQuery({
    queryKey: ["history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screenings")
        .select("id, score, status, created_at, resume_id, jobs(title, company), resumes(candidate_name, file_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl"><Clock className="h-6 w-6 text-primary" /> History</h1>
      <p className="text-sm text-muted-foreground">Every screening session with timestamps and scores.</p>

      <div className="mt-6 space-y-2">
        {(data ?? []).map((s: any) => (
          <Link key={s.id} to="/resumes/$id" params={{ id: s.resume_id }}>
            <Card className="shadow-card flex items-center gap-4 border-border/60 p-4 transition hover:border-primary">
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{s.resumes?.candidate_name ?? s.resumes?.file_name}</div>
                <div className="text-xs text-muted-foreground">{s.jobs?.title} · {new Date(s.created_at).toLocaleString()}</div>
              </div>
              <div className="w-32"><Progress value={s.score} /></div>
              <Badge className="capitalize">{s.status}</Badge>
              <span className="w-10 text-right text-sm font-bold tabular-nums">{s.score}</span>
            </Card>
          </Link>
        ))}
        {(data?.length ?? 0) === 0 && (
          <Card className="shadow-card p-8 text-center text-sm text-muted-foreground">No history yet.</Card>
        )}
      </div>
    </div>
  );
}
