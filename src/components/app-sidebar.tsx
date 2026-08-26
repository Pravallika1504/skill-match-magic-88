import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sparkles,
  LayoutDashboard,
  Briefcase,
  PlayCircle,
  MessageSquare,
  History,
  CircleHelp,
  Moon,
  Sun,
  LogOut,
  User,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useCurrentUser } from "@/lib/current-user";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const navSections = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Jobs", url: "/jobs", icon: Briefcase },
      { title: "Live Demo", url: "/live-demo", icon: PlayCircle },
      { title: "AI Chat", url: "/chat", icon: MessageSquare },
      { title: "History", url: "/history", icon: History },
    ],
  },
  {
    label: "Product",
    items: [{ title: "How It Works", url: "/how-it-works", icon: CircleHelp }],
  },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { theme, toggle } = useTheme();
  const { role } = useCurrentUser();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <Link
        to="/"
        onClick={onNavigate}
        className="flex h-16 shrink-0 items-center gap-2 border-b border-border/60 px-5 font-semibold tracking-tight"
      >
        <div className="bg-gradient-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-glow">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="truncate">SkillMatch AI</span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.url);
                return (
                  <li key={item.url}>
                    <Link
                      to={item.url}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground shadow-elegant"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-border/60 p-3">
        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>

        <div className="flex items-center gap-3 rounded-lg bg-accent/40 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium capitalize">{role ?? "Member"}</div>
            <div className="truncate text-xs text-muted-foreground">Signed in</div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
        </Button>
      </div>
    </div>
  );
}
