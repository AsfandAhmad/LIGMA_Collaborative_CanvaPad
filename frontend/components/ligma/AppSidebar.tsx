"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock, Share2, LayoutTemplate, FolderKanban, Trash2, Settings, Plus } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const items = [
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
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const user = mounted ? authUser : null;
  const initials = user?.name ? user.name.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() : "?";
  const displayName = user?.name || "Guest";
  const displayRole = user?.role || "viewer";

  return (
    <aside className="w-64 shrink-0 border-r-2 border-foreground/10 bg-sidebar h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-4 border-b border-sidebar-border">
        <Logo />
      </div>

      <div className="px-3 py-4">
        <button onClick={() => router.push("/settings")} className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors text-left">
          <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-blueprint flex items-center justify-center font-bold text-primary-foreground text-sm shrink-0">
            {(authUser as any)?.avatar_url && mounted && !authLoading ? (
              <img src={(authUser as any).avatar_url} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{displayName}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">{displayRole}</div>
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
        <Link href="/settings" className={cn("flex items-center gap-3 rounded-md px-2.5 py-2 text-sm hover:bg-sidebar-accent", pathname === "/settings" ? "bg-foreground text-background font-medium" : "text-muted-foreground")}>
          <Settings className="h-4 w-4"/> Settings
        </Link>
      </div>
    </aside>
  );
}
