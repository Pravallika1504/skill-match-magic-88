import { Link } from "@tanstack/react-router";
import { Moon, Sun, Sparkles, LogOut } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/current-user";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const { user, role } = useCurrentUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="bg-gradient-primary flex h-8 w-8 items-center justify-center rounded-lg shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span>SkillMatch AI</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground">How it works</Link>
          <Link to="/live-demo" className="text-muted-foreground hover:text-foreground">Live demo</Link>
          {user && (
            <>
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link>
              <Link to="/jobs" className="text-muted-foreground hover:text-foreground">Jobs</Link>
              <Link to="/chat" className="text-muted-foreground hover:text-foreground">AI Chat</Link>
              <Link to="/history" className="text-muted-foreground hover:text-foreground">History</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline capitalize">{role}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
              >
                <LogOut className="mr-1 h-3.5 w-3.5" /> Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground shadow-elegant">
              <Link to="/auth">Get started</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
