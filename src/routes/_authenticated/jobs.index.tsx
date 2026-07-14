import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/current-user";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/jobs/")({
  component: JobsList,
});

function JobsList() {
  const { role } = useCurrentUser();
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, company, location, required_skills, shortlist_threshold, is_active, created_at, recruiter_id")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Jobs</h1>
          <p className="text-sm text-muted-foreground">Browse open roles and apply with your resume.</p>
        </div>
        {(role === "recruiter" || role === "admin") && (
          <Button asChild className="bg-gradient-primary text-primary-foreground">
            <Link to="/jobs/new"><Plus className="mr-1 h-4 w-4" /> Post a job</Link>
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {(jobs ?? []).map((j) => (
          <Link key={j.id} to="/jobs/$id" params={{ id: j.id }}>
            <Card className="shadow-card group cursor-pointer border-border/60 p-5 transition hover:border-primary hover:shadow-elegant">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold group-hover:text-primary">{j.title}</h3>
                  <p className="text-xs text-muted-foreground">{j.company ?? "—"} · {j.location ?? "Remote"}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(j.required_skills ?? []).slice(0, 5).map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>
                <Badge variant="outline">≥{j.shortlist_threshold}</Badge>
              </div>
            </Card>
          </Link>
        ))}
        {jobs?.length === 0 && (
          <Card className="shadow-card col-span-full p-8 text-center">
            <p className="text-sm text-muted-foreground">No jobs posted yet.</p>
            {(role === "recruiter" || role === "admin") && (
              <Button asChild className="mt-4 bg-gradient-primary text-primary-foreground"><Link to="/jobs/new">Post the first job</Link></Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
