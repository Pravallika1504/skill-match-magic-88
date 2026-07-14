import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPage });

function ResetPage() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses the hash and creates a recovery session automatically
    supabase.auth.getSession().then(() => setReady(true));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated. You're signed in.");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="shadow-elegant p-6">
          <h1 className="text-xl font-bold">Set a new password</h1>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div><Label>New password</Label><Input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <Button className="w-full bg-gradient-primary text-primary-foreground" disabled={!ready}>Update password</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
