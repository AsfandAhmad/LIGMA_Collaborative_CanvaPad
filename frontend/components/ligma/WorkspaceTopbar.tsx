"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Plus, Sparkles, LogOut, Settings, User as UserIcon, Check, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useDemo, demoActions } from "@/lib/demoStore";
import { useAuth } from "@/lib/auth-context";
import { roomsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  title?: string;
  showSearch?: boolean;
};

export function WorkspaceTopbar({ label = "/home", title = "Welcome back", showSearch = true }: Props) {
  const demoUser = useDemo(s => s.user);
  const { user: authUser, logout, isLoading: authLoading } = useAuth();
  const notifications = useDemo(s => s.notifications);
  const sessions = useDemo(s => s.sessions);
  const [mounted, setMounted] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const router = useRouter();

  // Only fall back to demoUser once auth has finished loading and confirmed no real user
  const user = mounted ? (authUser ?? (!authLoading ? demoUser : null)) : null;
  const initials = user?.name ? user.name.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() : "?";
  const firstName = user?.name ? user.name.split(" ")[0] : "";
  const avatarUrl = mounted && !authLoading ? (authUser as any)?.avatar_url ?? null : null;

  useState(() => { setMounted(true); });

  useEffect(() => { setMounted(true); }, []);

  const unread = notifications.filter(n => !n.read).length;

  const filtered = search
    ? sessions.filter(s => !s.trashed && s.name.toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : [];

  const handleCreate = async () => {
    const name = newName.trim() || "Untitled session";
    setCreating(true);
    try {
      const room = await roomsApi.createRoom(name);
      setOpenNew(false);
      setNewName("");
      toast({ title: "Session created", description: `"${room.name}" is ready in your lobby.` });
      router.push(`/lobby?roomId=${room.id}&name=${encodeURIComponent(room.name)}`);
    } catch {
      // Fallback to demo store if not authenticated / backend unavailable
      const s = demoActions.createSession(name);
      setOpenNew(false);
      setNewName("");
      toast({ title: "Session created", description: `"${s.name}" is ready in your lobby.` });
      router.push(`/lobby?roomId=${s.id}&name=${encodeURIComponent(s.name)}`);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    setSignOutOpen(false);
    await logout();
  };

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-foreground/10">
      <div className="px-8 py-4 flex items-center gap-4">
        <div className="min-w-0">
          <div className="zine-label">{label}</div>
          <h1 className="text-2xl font-bold tracking-tight truncate">{title}{title === "Welcome back" && firstName ? `, ${firstName}` : ""}</h1>
        </div>

        {showSearch && (
          <div className="flex-1 max-w-2xl mx-auto">
            <Popover open={searchOpen && filtered.length > 0} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    placeholder="Describe a workshop or search a session…"
                    className="pl-10 pr-24 h-11 bg-card border-2 border-foreground/15 focus-visible:border-foreground rounded-xl"
                    value={search}
                    onFocus={() => setSearchOpen(true)}
                    onChange={e => { setSearch(e.target.value); setSearchOpen(true); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && filtered[0]) router.push(`/lobby?roomId=${filtered[0].id}&name=${encodeURIComponent(filtered[0].name)}`);
                    }}
                  />
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">⌘ K</kbd>
                </div>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[28rem] p-1">
                <div className="px-2 py-1 zine-label">{filtered.length} matches</div>
                {filtered.map(s => (
                  <Link key={s.id} href={`/lobby?roomId=${s.id}&name=${encodeURIComponent(s.name)}`}
                    onClick={() => { demoActions.touchSession(s.id); setSearchOpen(false); }}
                    className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted text-sm">
                    <span className={cn("h-2 w-2 rounded-sm", s.folderColor)} />
                    <span className="font-medium truncate flex-1">{s.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{s.folder}</span>
                  </Link>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-coral text-background text-[10px] font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="px-4 py-3 flex items-center justify-between border-b border-border">
              <div>
                <div className="zine-label">/inbox</div>
                <div className="font-bold text-sm">Notifications</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { demoActions.markAllRead(); toast({ title: "Marked all as read" }); }}>
                <Check className="h-3.5 w-3.5"/> Mark all
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up ✦</div>
              )}
              {notifications.map(n => (
                <button key={n.id}
                  onClick={() => demoActions.markRead(n.id)}
                  className={cn("w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted transition-colors",
                    !n.read && "bg-muted/40")}>
                  <span className={cn("h-7 w-7 rounded-full text-background text-[10px] font-bold flex items-center justify-center shrink-0", n.whoColor)}>{n.who[0]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-snug"><span className="font-medium">{n.who}</span> <span className="text-muted-foreground">{n.text}</span></div>
                    <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{n.time} ago</div>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-coral shrink-0" />}
                </button>
              ))}
            </div>
            <div className="border-t border-border p-2">
              <Button asChild variant="ghost" size="sm" className="w-full"><Link href="/notifications">Open inbox</Link></Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-9 w-9 rounded-full overflow-hidden bg-gradient-blueprint flex items-center justify-center font-bold text-primary-foreground text-xs hover:opacity-90 transition-opacity ring-2 ring-transparent hover:ring-foreground/20">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user?.name || "avatar"} className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2.5 py-1">
                <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-blueprint flex items-center justify-center font-bold text-primary-foreground text-xs shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user?.name || "avatar"} className="h-full w-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{user?.name || "Guest"}</div>
                  <div className="text-xs text-muted-foreground font-normal truncate">{user?.email || ""}</div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/settings"><UserIcon className="h-3.5 w-3.5"/> Profile</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/settings"><Settings className="h-3.5 w-3.5"/> Settings</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSignOutOpen(true)} className="text-coral focus:text-coral">
              <LogOut className="h-3.5 w-3.5"/> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="paper" onClick={() => setOpenNew(true)}><Plus className="h-4 w-4"/> New session</Button>
      </div>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New session</DialogTitle>
            <DialogDescription>Spin up a fresh canvas. You can rename and invite later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input autoFocus placeholder="e.g. Sprint 45 — kickoff" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}/>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">→ opens in lobby</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancel</Button>
            <Button variant="paper" onClick={handleCreate} disabled={creating}>
              <Sparkles className="h-3.5 w-3.5"/> {creating ? "Creating…" : "Create session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign-out confirmation */}
      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-full bg-coral/15 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-coral" />
              </div>
              <DialogTitle>Sign out?</DialogTitle>
            </div>
            <DialogDescription>
              You'll be taken back to the login page. Any unsaved canvas changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setSignOutOpen(false)}>Stay</Button>
            <Button
              onClick={handleLogout}
              className="bg-coral text-background hover:bg-coral/90"
            >
              <LogOut className="h-3.5 w-3.5"/> Yes, sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}

export function GlobalSearchHint() {
  return <Search className="h-4 w-4" />;
}
