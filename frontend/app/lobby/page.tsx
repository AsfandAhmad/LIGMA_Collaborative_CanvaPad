"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Users, Clock, ListChecks, Activity, Lock, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppSidebar } from "@/components/ligma/AppSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const members = [
  { n: "Maya Kane", role: "Lead", color: "bg-coral", initial: "MK" },
  { n: "Jin Park", role: "Contributor", color: "bg-indigo", initial: "JP" },
  { n: "Sam Ortega", role: "Contributor", color: "bg-success", initial: "SO" },
  { n: "Lia Chen", role: "Viewer", color: "bg-warning", initial: "LC" },
];

const tabs = ["Overview", "Tasks", "Members", "Activity", "Settings"] as const;
type Tab = typeof tabs[number];

export default function Lobby() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const share = () => {
    const url = "https://ligma.app/s/sprint-44-kickoff";
    navigator.clipboard?.writeText(url).catch(()=>{});
    toast({ title: "Share link copied", description: url });
  };

  const sendInvite = () => {
    if (!inviteEmail) return;
    toast({ title: "Invite sent", description: `${inviteEmail} will get an email.` });
    setInviteEmail("");
    setInviteOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-foreground/10">
          <div className="px-8 py-4 flex items-center gap-3">
            <Button asChild variant="ghost" size="icon"><Link href="/dashboard"><ArrowLeft className="h-4 w-4"/></Link></Button>
            <div className="font-mono text-xs text-muted-foreground">orbital / sprint-44 /</div>
            <div className="font-bold">Sprint 44 — kickoff</div>
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-success/15 text-success px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> live · 3 in room
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={share}>Share</Button>
              <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}><UserPlus className="h-3.5 w-3.5"/> Invite</Button>
              <Button asChild variant="paper" size="sm"><Link href="/editor"><Play className="h-3.5 w-3.5"/> Enter session</Link></Button>
            </div>
          </div>
          <div className="px-8 flex items-center gap-1">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn(
                "px-3 py-2.5 text-sm border-b-2 transition-colors",
                tab === t ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>{t}</button>
            ))}
          </div>
        </header>

        {tab === "Overview" && (
        <div className="px-8 py-8 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* preview */}
            <div className="rounded-2xl border-2 border-foreground/15 bg-card overflow-hidden">
              <div className="aspect-[16/8] relative bg-paper bg-blueprint-grid">
                <div className="absolute top-6 left-6 h-16 w-24 bg-sticky-yellow rounded shadow-sticky border border-foreground/10 rotate-[-3deg]" />
                <div className="absolute top-12 left-32 h-20 w-28 bg-sticky-pink rounded shadow-sticky border border-foreground/10 rotate-[2deg]" />
                <div className="absolute top-24 left-12 h-16 w-24 bg-sticky-mint rounded shadow-sticky border border-foreground/10 rotate-[1deg] ring-2 ring-primary" />
                <div className="absolute bottom-6 right-8 h-14 w-20 bg-sticky-sky rounded shadow-sticky border border-foreground/10 rotate-[-1deg]" />
                <span className="absolute top-3 right-3 stamp text-coral text-xs bg-card">snapshot</span>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-foreground/15 bg-card p-6">
              <div className="zine-label mb-2">§ session brief</div>
              <h2 className="text-2xl font-bold mb-3">Kick off Sprint 44</h2>
              <p className="text-muted-foreground leading-relaxed">
                Align on the top three execution risks for the upcoming sprint, lock the architecture decisions made last Friday, and convert open questions into either spikes or deferred items. Output: an actionable backlog by EOD.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-4">
                {[
                  { l: "Started", v: "2:14 PM", icon: Clock },
                  { l: "Tasks extracted", v: "14", icon: ListChecks },
                  { l: "Locked nodes", v: "3", icon: Lock },
                ].map(s => (
                  <div key={s.l} className="rounded-lg border border-foreground/10 p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs"><s.icon className="h-3.5 w-3.5"/> {s.l}</div>
                    <div className="text-xl font-bold font-mono mt-1">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-foreground/15 bg-card p-6">
              <div className="flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4 text-primary"/> <h3 className="font-bold">AI agenda suggestions</h3></div>
              <ul className="space-y-2">
                {["Review last session's open questions", "Lock the LISTEN/NOTIFY decision before continuing", "Assign owners to the 4 unassigned action items"].map(s => (
                  <li key={s} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border-2 border-foreground/15 bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2"><Users className="h-4 w-4"/> Members</h3>
                <Button variant="ghost" size="sm" onClick={() => setInviteOpen(true)}>Invite</Button>
              </div>
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.n} className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full ${m.color} text-background flex items-center justify-center text-xs font-bold`}>{m.initial}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.n}</div>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">{m.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-foreground/15 bg-card p-5">
              <h3 className="font-bold flex items-center gap-2 mb-3"><Activity className="h-4 w-4"/> Recent activity</h3>
              <ul className="space-y-3 text-sm">
                {[
                  { who: "Jin", act: "locked “LISTEN/NOTIFY”", t: "2m" },
                  { who: "AI", act: "extracted 4 new tasks", t: "5m" },
                  { who: "Sam", act: "added 7 sticky notes", t: "12m" },
                  { who: "Maya", act: "started the session", t: "25m" },
                ].map((a, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground mt-1 w-8">{a.t}</span>
                    <span><span className="font-medium">{a.who}</span> <span className="text-muted-foreground">{a.act}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
        )}

        {tab === "Tasks" && (
          <div className="px-8 py-8 max-w-3xl">
            <div className="zine-label mb-1">§ tasks</div>
            <h2 className="text-xl font-bold mb-4">Backlog from this session</h2>
            <div className="rounded-2xl border-2 border-foreground/15 bg-card divide-y divide-border">
              {[
                { t: "Wire LISTEN/NOTIFY in canvas client", who: "Sam", due: "Tomorrow" },
                { t: "Lock decision nodes for review", who: "Maya", due: "Today" },
                { t: "Draft pricing copy v2", who: "Lia", due: "Fri" },
                { t: "Schedule design crit", who: "Jin", due: "Mon" },
              ].map((r, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3 text-sm">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  <span className="flex-1">{r.t}</span>
                  <span className="font-mono text-xs text-muted-foreground">@{r.who.toLowerCase()}</span>
                  <span className="font-mono text-xs">{r.due}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Members" && (
          <div className="px-8 py-8 max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="zine-label mb-1">§ members</div>
                <h2 className="text-xl font-bold">Who's in this session</h2>
              </div>
              <Button variant="paper" onClick={() => setInviteOpen(true)}><UserPlus className="h-3.5 w-3.5"/> Invite</Button>
            </div>
            <div className="rounded-2xl border-2 border-foreground/15 bg-card divide-y divide-border">
              {members.map(m => (
                <div key={m.n} className="flex items-center gap-3 p-4">
                  <div className={`h-10 w-10 rounded-full ${m.color} text-background flex items-center justify-center text-sm font-bold`}>{m.initial}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{m.n}</div>
                    <div className="text-xs text-muted-foreground font-mono">@{m.n.toLowerCase().replace(" ", "")}</div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Activity" && (
          <div className="px-8 py-8 max-w-2xl">
            <div className="zine-label mb-1">§ activity</div>
            <h2 className="text-xl font-bold mb-4">Session timeline</h2>
            <div className="rounded-2xl border-2 border-foreground/15 bg-card p-5 space-y-3 text-sm">
              {[
                { who: "Jin", act: "locked “LISTEN/NOTIFY”", t: "2m" },
                { who: "AI", act: "extracted 4 new tasks", t: "5m" },
                { who: "Sam", act: "added 7 sticky notes", t: "12m" },
                { who: "Maya", act: "started the session", t: "25m" },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-border last:border-0 pb-3 last:pb-0">
                  <span className="font-mono text-[10px] text-muted-foreground mt-1 w-10">{a.t}</span>
                  <span><span className="font-medium">{a.who}</span> <span className="text-muted-foreground">{a.act}</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Settings" && (
          <div className="px-8 py-8 max-w-2xl space-y-4">
            <div className="zine-label mb-1">§ session settings</div>
            <h2 className="text-xl font-bold">Configure this session</h2>
            <div className="rounded-2xl border-2 border-foreground/15 bg-card p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Session name</label>
                <Input defaultValue="Sprint 44 — kickoff" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Folder</label>
                <Input defaultValue="Sprint 44" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost">Cancel</Button>
                <Button variant="paper" onClick={() => toast({ title: "Settings saved" })}>Save</Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to Sprint 44 — kickoff</DialogTitle>
            <DialogDescription>Add a teammate by email. They'll join as a Contributor.</DialogDescription>
          </DialogHeader>
          <Input type="email" placeholder="teammate@studio.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendInvite(); }}/>
          <DialogFooter>
            <Button variant="ghost" onClick={share}>Copy link instead</Button>
            <Button variant="paper" onClick={sendInvite}>Send invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}