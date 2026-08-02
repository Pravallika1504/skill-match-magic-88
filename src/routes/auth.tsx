import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Sparkles,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

type Mode = "signin" | "signup" | "forgot";

const search = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => search.parse(s),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(6, "At least 6 characters").max(72);
const nameSchema = z.string().trim().min(1, "Name is required").max(100);

/** Only allow same-origin relative paths as a post-login redirect target. */
function safeNext(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function AuthPage() {
  const nav = useNavigate();
  const { mode, next } = useSearch({ from: "/auth" });
  const redirectTo = safeNext(next);
  const [tab, setTab] = useState<Mode>(mode ?? "signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "recruiter">("student");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      if (redirectTo) window.location.replace(redirectTo);
      else nav({ to: "/dashboard" });
    });
  }, [nav, redirectTo]);

  const goDashboard = () => {
    if (redirectTo) window.location.replace(redirectTo);
    else nav({ to: "/dashboard" });
  };

  const validate = (m: Mode) => {
    const e: Record<string, string> = {};
    const emailR = emailSchema.safeParse(email);
    if (!emailR.success) e.email = emailR.error.issues[0].message;
    if (m !== "forgot") {
      const pwR = passwordSchema.safeParse(password);
      if (!pwR.success) e.password = pwR.error.issues[0].message;
    }
    if (m === "signup") {
      const nR = nameSchema.safeParse(fullName);
      if (!nR.success) e.fullName = nR.error.issues[0].message;
      if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSignIn = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate("signin")) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    goDashboard();
  };

  const onSignUp = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate("signup")) return;
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

  const onForgot = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate("forgot")) return;
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
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setLoading(false);
    if (res.error) return toast.error(res.error.message || "Google sign-in failed");
    if (res.redirected) return;
    goDashboard();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-secondary/40 blur-3xl" />
      </div>

      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* Left hero */}
        <section className="relative hidden flex-col justify-between p-12 lg:flex">
          <Link to="/" className="flex items-center gap-2 text-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">SkillMatch AI</span>
          </Link>

          <div className="max-w-lg">
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-foreground">
              Get your{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                ATS Score
              </span>{" "}
              in seconds.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Join thousands of job seekers and recruiters using AI to screen resumes
              recruiters actually respond to.
            </p>

            <div className="mt-8 space-y-3">
              {[
                "Real AI analysis of your actual resume",
                "Job match against any description",
                "Personalised interview prep",
              ].map((t) => (
                <div
                  key={t}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-elegant"
                >
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">{t}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SkillMatch AI · Enterprise-grade resume intelligence.
          </p>
        </section>

        {/* Right auth card */}
        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold">SkillMatch AI</span>
              </Link>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card/70 p-7 shadow-elegant backdrop-blur-xl sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                  {tab === "signup"
                    ? "Create your account"
                    : tab === "forgot"
                      ? "Reset your password"
                      : "Welcome back"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tab === "signup"
                    ? "Free forever plan — no card required."
                    : tab === "forgot"
                      ? "We'll email you a secure reset link."
                      : "Sign in to continue screening resumes."}
                </p>
              </div>

              {tab !== "forgot" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl border-border/70 bg-background/60 font-medium hover:bg-background"
                    onClick={onGoogle}
                    disabled={loading}
                  >
                    <GoogleIcon />
                    Continue with Google
                  </Button>
                  <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="h-px flex-1 bg-border" />
                    or continue with email
                    <div className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}

              {tab === "signin" && (
                <form onSubmit={onSignIn} className="space-y-4">
                  <Field
                    id="email"
                    label="Email"
                    icon={<Mail className="h-4 w-4" />}
                    type="email"
                    value={email}
                    onChange={setEmail}
                    error={errors.email}
                    placeholder="you@example.com"
                  />
                  <PasswordField
                    id="password"
                    label="Password"
                    value={password}
                    onChange={setPassword}
                    show={showPw}
                    setShow={setShowPw}
                    error={errors.password}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={remember}
                        onCheckedChange={(v) => setRemember(Boolean(v))}
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      onClick={() => setTab("forgot")}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <SubmitButton loading={loading}>
                    Sign in <ArrowRight className="h-4 w-4" />
                  </SubmitButton>
                  <p className="text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setTab("signup")}
                      className="font-semibold text-primary hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                </form>
              )}

              {tab === "signup" && (
                <form onSubmit={onSignUp} className="space-y-4">
                  <Field
                    id="name"
                    label="Full name"
                    icon={<User className="h-4 w-4" />}
                    value={fullName}
                    onChange={setFullName}
                    error={errors.fullName}
                    placeholder="Ada Lovelace"
                  />
                  <Field
                    id="email"
                    label="Email"
                    icon={<Mail className="h-4 w-4" />}
                    type="email"
                    value={email}
                    onChange={setEmail}
                    error={errors.email}
                    placeholder="you@example.com"
                  />
                  <PasswordField
                    id="password"
                    label="Password"
                    value={password}
                    onChange={setPassword}
                    show={showPw}
                    setShow={setShowPw}
                    error={errors.password}
                  />
                  <PasswordField
                    id="confirmPassword"
                    label="Confirm password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showPw}
                    setShow={setShowPw}
                    error={errors.confirmPassword}
                  />
                  <div>
                    <Label className="mb-2 block text-sm">I am a…</Label>
                    <RadioGroup
                      value={role}
                      onValueChange={(v) => setRole(v as "student" | "recruiter")}
                      className="grid grid-cols-2 gap-2"
                    >
                      {(["student", "recruiter"] as const).map((r) => (
                        <label
                          key={r}
                          className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3 text-sm capitalize transition-colors has-[:checked]:border-primary has-[:checked]:bg-accent/60"
                        >
                          <RadioGroupItem value={r} /> {r}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                  <SubmitButton loading={loading}>Create account</SubmitButton>
                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setTab("signin")}
                      className="font-semibold text-primary hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              )}

              {tab === "forgot" && (
                <form onSubmit={onForgot} className="space-y-4">
                  <Field
                    id="email"
                    label="Email"
                    icon={<Mail className="h-4 w-4" />}
                    type="email"
                    value={email}
                    onChange={setEmail}
                    error={errors.email}
                    placeholder="you@example.com"
                  />
                  <SubmitButton loading={loading}>Send reset link</SubmitButton>
                  <p className="text-center text-sm text-muted-foreground">
                    Remembered it?{" "}
                    <button
                      type="button"
                      onClick={() => setTab("signin")}
                      className="font-semibold text-primary hover:underline"
                    >
                      Back to sign in
                    </button>
                  </p>
                </form>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              By continuing you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  icon?: React.ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-sm">
        {label}
      </Label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`h-11 rounded-xl bg-background/70 ${icon ? "pl-9" : ""} ${
            error ? "border-destructive focus-visible:ring-destructive" : ""
          }`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  setShow,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  error?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-sm">
        {label}
      </Label>
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Lock className="h-4 w-4" />
        </div>
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          placeholder="••••••••"
          onChange={(e) => onChange(e.target.value)}
          className={`h-11 rounded-xl bg-background/70 pl-9 pr-10 ${
            error ? "border-destructive focus-visible:ring-destructive" : ""
          }`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="submit"
      disabled={loading}
      className="h-11 w-full gap-2 rounded-xl bg-gradient-primary text-primary-foreground shadow-glow transition-transform hover:scale-[1.01]"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.2 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.2 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.1z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.3C29.5 34.7 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.3C41.7 35.6 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
