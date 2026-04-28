"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Clock, Share2, LayoutTemplate, FolderKanban, Trash2, Settings, Plus, Sparkles } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demoStore";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/hooks/use-toast";

const items = [
  { icon: Home, label: "Home", to: "/dashboard" },
  { icon: Clock, label: "Recent", to: "/recent" },
  { icon: Share2, label: "Shared with me", to: "/shared" },
  { icon: LayoutTemplate, label: "Templates", to: "/templates" },
  { icon: FolderKanban, label: "Projects", to: "/projects" },
  { icon: Trash2, label: "Trash", to: "/trash" },
];

const folders = [
  { name: "Sprint 44", color: "bg-coral" },
  { name: "Q2 Planning", color: "bg-warning" },
  { name: "Design Reviews", color: "bg-success" },
  { name: "Onboarding", color: "bg-indigo" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const demoUser = useDemo(s => s.user);
  const { user: authUser } = useAuth();
  const user = authUser || demoUser;
  
  return (
    <aside className="w-64 shrink-0 border-r-2 border-foreground/10 bg-sidebar h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-4 border-b border-sidebar-border">
        <Logo />
      </div>

      <div className="px-3 py-4">
        <button onClick={() => router.push("/settings")} className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors text-left">
          <div className="h-9 w-9 rounded-full bg-gradient-blueprint flex items-center justify-center font-bold text-primary-foreground text-sm">
            {user?.name ? user.name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase() : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.name || "Guest"}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">{user?.role || "viewer"}</div>
          </div>
        </button>
      </div>

      <nav className="px-3 flex-1 overflow-y-auto">
        <div className="space-y-0.5">
          {items.map(it => {
            const active = pathname === it.to;
            return (
              <Link key={it.label} href={it.to} className={cn(
                "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                active ? "bg-foreground text-background font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}>
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="zine-label px-2 mb-2">workspace folders</div>
          <div className="space-y-0.5">
            {folders.map(f => (
              <Link key={f.name} href={`/projects?folder=${encodeURIComponent(f.name)}`} className="w-full flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm hover:bg-sidebar-accent transition-colors">
                <span className={cn("h-2.5 w-2.5 rounded-sm", f.color)} />
                <span className="truncate">{f.name}</span>
              </Link>
            ))}
            <button onClick={() => toast({ title: "New folder", description: "Folders are coming soon to this demo." })} className="w-full flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors">
              <Plus className="h-3.5 w-3.5" /> New folder
            </button>
          </div>
        </div>
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="rounded-xl border-2 border-foreground bg-warning p-3 relative">
          <span className="stamp absolute -top-3 right-3 bg-card text-coral text-[10px]">hackathon</span>
          <div className="font-mono text-[10px] uppercase tracking-wider mb-1">Issue 09</div>
          <p className="text-sm font-medium leading-snug">Invite 3 teammates, get a free Pro month.</p>
          <Button variant="ink" size="sm" className="mt-2 w-full" onClick={() => {
            navigator.clipboard?.writeText("https://ligma.app/invite/orbital-2026").catch(()=>{});
            toast({ title: "Invite link copied", description: "Share it with your team to unlock Pro." });
          }}><Sparkles className="h-3.5 w-3.5"/> Invite team</Button>
        </div>
        <Link href="/settings" className={cn("flex items-center gap-3 rounded-md px-2.5 py-2 text-sm hover:bg-sidebar-accent", pathname === "/settings" ? "bg-foreground text-background font-medium" : "text-muted-foreground")}>
          <Settings className="h-4 w-4"/> Settings
        </Link>
      </div>
    </aside>
  );
}
