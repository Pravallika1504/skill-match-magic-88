import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/current-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend
} from "recharts";
import { Briefcase, FileText, Trophy, Users, TrendingUp, ArrowRight, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, role } = useCurrentUser();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id, role],
    enabled: !!user,
    queryFn: async () => {
      if (role === "student") {
        const { data: resumes } = await supabase.from("resumes").select("id").eq("user_id", user!.id);
        const { data: screenings } = await supabase
          .from("screenings").select("id, score, status, job_id, created_at")
          .eq("candidate_id", user!.id).order("created_at", { ascending: false });
        return { resumes: resumes?.length ?? 0, screenings: screenings ?? [] };
      }
      // recruiter/admin
      const { data: jobs } = await supabase.from("jobs").select("id").eq("recruiter_id", user!.id);
      const jobIds = (jobs ?? []).map((j) => j.id);
      const { data: screenings } = jobIds.length
        ? await supabase.from("screenings").select("id, score, status, matched_skills, missing_skills, created_at").in("job_id", jobIds)
        : { data: [] as any[] };
      return { jobs: jobs?.length ?? 0, screenings: screenings ?? [] };
    },
  });

  const screenings = stats?.screenings ?? [];
  const avg = screenings.length ? Math.round(screenings.reduce((a: number, s: any) => a + s.score, 0) / screenings.length) : 0;
  const shortlisted = screenings.filter((s: any) => s.status === "shortlisted" || s.status === "interview" || s.status === "selected").length;
  const rejected = screenings.filter((s: any) => s.status === "rejected").length;

  const buckets = [0, 20, 40, 60, 80, 100];
  const distribution = buckets.slice(0, -1).map((b, i) => ({
    range: `${b}-${buckets[i + 1]}`,
    count: screenings.filter((s: any) => s.score >= b && s.score < buckets[i + 1]).length,
  }));

  const skillCount: Record<string, number> = {};
  const gapCount: Record<string, number> = {};
  for (const s of screenings) {
    for (const sk of s.matched_skills ?? []) skillCount[sk] = (skillCount[sk] ?? 0) + 1;
    for (const sk of s.missing_skills ?? []) gapCount[sk] = (gapCount[sk] ?? 0) + 1;
  }
  const topSkills = Object.entries(skillCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topGaps = Object.entries(gapCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const pieData = [
    { name: "Shortlisted", value: shortlisted, color: "var(--color-success)" },
    { name: "Reviewed", value: screenings.filter((s: any) => s.status === "reviewed").length, color: "var(--color-primary)" },
    { name: "Rejected", value: rejected, color: "var(--color-destructive)" },
    { name: "Pending", value: screenings.filter((s: any) => s.status === "pending").length, color: "var(--color-muted-foreground)" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {role === "student" ? "Track your applications and improve your resume." : "Overview of your hiring pipeline."}
          </p>
        </div>
        {role !== "student" ? (
          <Button asChild className="bg-gradient-primary text-primary-foreground">
            <Link to="/jobs/new">Post a job <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        ) : (
          <Button asChild className="bg-gradient-primary text-primary-foreground">
            <Link to="/jobs">Browse jobs <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label={role === "student" ? "My resumes" : "Resumes screened"} value={stats?.resumes ?? screenings.length} />
        <StatCard icon={Trophy} label="Shortlisted" value={shortlisted} tone="success" />
        <StatCard icon={TrendingUp} label="Average score" value={avg} />
        <StatCard icon={role === "student" ? Briefcase : Users} label={role === "student" ? "Applications" : "Active jobs"} value={role === "student" ? screenings.length : stats?.jobs ?? 0} />
      </div>

      {role !== "student" && (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="shadow-card p-6 lg:col-span-2">
            <h3 className="font-semibold">Score distribution</h3>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution}>
                  <XAxis dataKey="range" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="shadow-card p-6">
            <h3 className="font-semibold">Status breakdown</h3>
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                    {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="shadow-card p-6">
            <h3 className="font-semibold">Top skills found</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {topSkills.length === 0 && <li className="text-muted-foreground">No data yet</li>}
              {topSkills.map(([s, n]) => (
                <li key={s} className="flex items-center justify-between">
                  <span>{s}</span>
                  <Badge className="bg-success/15 text-success">{n}</Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="shadow-card p-6">
            <h3 className="font-semibold">Common gaps</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {topGaps.length === 0 && <li className="text-muted-foreground">No data yet</li>}
              {topGaps.map(([s, n]) => (
                <li key={s} className="flex items-center justify-between">
                  <span>{s}</span>
                  <Badge variant="outline" className="border-destructive/40 text-destructive">{n}</Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="shadow-card p-6">
            <h3 className="font-semibold">Recent activity</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {screenings.slice(0, 5).map((s: any) => (
                <li key={s.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-none">
                  <span className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                  <Badge>{s.score}</Badge>
                </li>
              ))}
              {screenings.length === 0 && <li className="text-muted-foreground">No screenings yet</li>}
            </ul>
          </Card>
        </div>
      )}

      {role === "student" && (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="shadow-card p-6 lg:col-span-2">
            <h3 className="font-semibold">My applications</h3>
            <div className="mt-4 space-y-3">
              {screenings.length === 0 && <p className="text-sm text-muted-foreground">No applications yet. <Link to="/jobs" className="text-primary underline">Browse jobs</Link>.</p>}
              {screenings.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div>
                    <div className="text-sm font-medium">Application #{s.id.slice(0, 6)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32"><Progress value={s.score} /></div>
                    <Badge className="capitalize">{s.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="shadow-card p-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Calendar className="h-4 w-4 text-primary" /> Interviews</div>
            <p className="text-xs text-muted-foreground">Scheduled interviews will appear here once a recruiter invites you.</p>
            <Button asChild variant="outline" className="mt-4 w-full"><Link to="/interviews">View interviews</Link></Button>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number | string; tone?: "success" }) {
  return (
    <Card className="shadow-card border-border/60 p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone === "success" ? "bg-success/15 text-success" : "bg-accent text-accent-foreground"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}
