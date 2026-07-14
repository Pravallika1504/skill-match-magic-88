import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/current-user";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jobs/new")({
  component: NewJob,
});

function NewJob() {
  const nav = useNavigate();
  const { user, role } = useCurrentUser();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [threshold, setThreshold] = useState(80);
  const [minExp, setMinExp] = useState(0);
  const [saving, setSaving] = useState(false);

  if (user && role === "student") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Recruiter access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only recruiters and admins can post jobs.</p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        recruiter_id: user.id,
        title,
        company: company || null,
        location: location || null,
        description,
        required_skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        min_experience_years: minExp,
        shortlist_threshold: threshold,
      })
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Job posted");
    nav({ to: "/jobs/$id", params: { id: data.id } });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Post a job</h1>
      <p className="text-sm text-muted-foreground">Candidates will see this and can upload resumes to be screened.</p>
      <Card className="shadow-elegant mt-6 p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Title *</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Frontend Engineer" /></div>
            <div><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nova Labs" /></div>
            <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Remote / Bangalore" /></div>
            <div><Label>Min experience (years)</Label><Input type="number" min={0} step={0.5} value={minExp} onChange={(e) => setMinExp(Number(e.target.value))} /></div>
          </div>
          <div>
            <Label>Required skills (comma separated)</Label>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, TypeScript, GraphQL" />
          </div>
          <div>
            <Label>Job description *</Label>
            <Textarea required rows={8} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the role, responsibilities, must-haves, and nice-to-haves…" />
            <p className="mt-1 text-xs text-muted-foreground">AI extracts skills and keywords from this text.</p>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <Label>Auto-shortlist threshold</Label>
              <span className="font-semibold text-primary">{threshold}</span>
            </div>
            <Slider value={[threshold]} min={50} max={100} step={5} onValueChange={([v]) => setThreshold(v)} />
          </div>
          <Button className="w-full bg-gradient-primary text-primary-foreground" disabled={saving}>{saving ? "Posting…" : "Post job"}</Button>
        </form>
      </Card>
    </div>
  );
}
