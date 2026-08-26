import { useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Menu, Moon, Sun, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarNav, navSections } from "@/components/app-sidebar";
import { useTheme } from "@/lib/theme";
import { useCurrentUser } from "@/lib/current-user";

function usePageTitle() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const all = navSections.flatMap((s) => s.items);
  const match = all.find((i) => pathname === i.url || pathname.startsWith(i.url + "/"));
  if (match) return match.title;
  if (pathname.startsWith("/interviews")) return "Interviews";
  if (pathname.startsWith("/resumes")) return "Resume";
  return "SkillMatch AI";
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { role } = useCurrentUser();
  const title = usePageTitle();

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
      <aside className="hidden shrink-0 border-r border-border/60 md:block md:w-[220px] lg:w-[252px]">
        <div className="fixed inset-y-0 left-0 w-[220px] border-r border-border/60 lg:w-[252px]">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[260px] p-0">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <SidebarNav onNavigate={() => setOpen(false)} />
                </SheetContent>
              </Sheet>
              <h2 className="truncate text-base font-semibold sm:text-lg">{title}</h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <div className="flex items-center gap-2 rounded-full border border-border/60 py-1 pl-1 pr-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span className="hidden text-xs font-medium capitalize sm:inline">{role ?? "Member"}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
