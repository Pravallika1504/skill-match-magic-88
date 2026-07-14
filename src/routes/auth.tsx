import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const search = z.object({ mode: z.enum(["signin", "signup", "forgot"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => search.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { mode } = useSearch({ from: "/auth" });
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">(mode ?? "signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "recruiter">("student");
  const [loading, setLoading] = useState(false);

  const goDashboard = () => nav({ to: "/dashboard" });

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    goDashboard();
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, role },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Check your email if confirmation is required.");
    goDashboard();
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Reset link sent to your email.");
  };

  const onGoogle = async () => {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    setLoading(false);
    if (res.error) return toast.error(res.error.message || "Google sign-in failed");
    if (res.redirected) return;
    goDashboard();
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Welcome to SkillMatch AI</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to continue screening resumes.</p>

        <Card className="shadow-elegant mt-8 w-full border-border/60 p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
              <TabsTrigger value="forgot">Forgot</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-5">
              <form onSubmit={onSignIn} className="space-y-3">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button className="w-full bg-gradient-primary text-primary-foreground" disabled={loading}>Sign in</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <form onSubmit={onSignUp} className="space-y-3">
                <div><Label>Full name</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <div>
                  <Label className="mb-2 block">I am a…</Label>
                  <RadioGroup value={role} onValueChange={(v) => setRole(v as any)} className="grid grid-cols-2 gap-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-accent/60">
                      <RadioGroupItem value="student" /> Student
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-accent/60">
                      <RadioGroupItem value="recruiter" /> Recruiter
                    </label>
                  </RadioGroup>
                </div>
                <Button className="w-full bg-gradient-primary text-primary-foreground" disabled={loading}>Create account</Button>
              </form>
            </TabsContent>

            <TabsContent value="forgot" className="mt-5">
              <form onSubmit={onForgot} className="space-y-3">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <Button className="w-full bg-gradient-primary text-primary-foreground" disabled={loading}>Send reset link</Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={loading}>
            Continue with Google
          </Button>
        </Card>
      </div>
    </div>
  );
}
