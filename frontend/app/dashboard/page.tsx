"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Grid3x3, List, Filter, ArrowRight, CheckCircle2, Circle, AlertCircle, MoreHorizontal } from "lucide-react";
import { AppSidebar } from "@/components/ligma/AppSidebar";
import { WorkspaceTopbar } from "@/components/ligma/WorkspaceTopbar";
import { SessionGrid } from "@/components/ligma/SessionGrid";
import { Button } from "@/components/ui/button";
import { useDemo, demoActions } from "@/lib/demoStore";
import { toast } from "@/hooks/use-toast";

const tasks = [
  { t: "Wire LISTEN/NOTIFY in canvas client", status: "in_progress", session: "Architecture review v3", due: "Tomorrow" },
  { t: "Draft pricing copy v2", status: "todo", session: "Pricing page brainstorm", due: "Fri" },
  { t: "Lock decision nodes for review", status: "done", session: "Sprint 44 — kickoff", due: "Today" },
  { t: "Schedule design crit", status: "todo", session: "Onboarding revamp", due: "Mon" },
];

const Dashboard = () => {
  const sessions = useDemo(s => s.sessions.filter(s => !s.trashed));
  useEffect(() => { demoActions.ensureGuest(); }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 min-w-0">
        <WorkspaceTopbar label="/home" title="Welcome back" />

        <div className="px-8 py-8 space-y-12">
          {/* Continue working */}
          <section>
            <div className="flex items-end justify-between mb-5">
              <div>
                <div className="zine-label mb-1">§ continue working</div>
                <h2 className="text-xl font-bold">Pick up where you left off</h2>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => toast({ title: "Filters", description: "Filter UI is coming soon." })}><Filter className="h-3.5 w-3.5"/> Filter</Button>
                <Button variant="ghost" size="icon-sm"><Grid3x3 className="h-3.5 w-3.5"/></Button>
                <Button variant="ghost" size="icon-sm" onClick={() => toast({ title: "List view", description: "Switch to grid for now." })}><List className="h-3.5 w-3.5"/></Button>
              </div>
            </div>
            <SessionGrid sessions={sessions} />
          </section>

          {/* Tasks snapshot */}
          <section className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border-2 border-foreground/15 bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="zine-label mb-1">§ assigned to you</div>
                  <h2 className="text-xl font-bold">Tasks across sessions</h2>
                </div>
                <Button asChild variant="ghost" size="sm"><Link href="/projects">View all <ArrowRight className="h-3.5 w-3.5"/></Link></Button>
              </div>
              <div className="divide-y divide-foreground/10">
                {tasks.map((t, i) => {
                  const Icon = t.status === "done" ? CheckCircle2 : t.status === "in_progress" ? AlertCircle : Circle;
                  const color = t.status === "done" ? "text-success" : t.status === "in_progress" ? "text-warning" : "text-muted-foreground";
                  return (
                    <div key={i} className="py-3 flex items-center gap-3 hover:bg-muted/40 -mx-3 px-3 rounded-md transition-colors">
                      <Icon className={`h-4 w-4 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.t}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{t.session}</div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{t.due}</span>
                      <Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-3.5 w-3.5"/></Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-foreground bg-foreground text-background p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-blueprint-grid opacity-15" />
              <div className="relative">
                <div className="zine-label text-warning mb-2">§ this week</div>
                <h2 className="text-xl font-bold mb-4">Workspace pulse</h2>
                <div className="space-y-4">
                  {[
                    { l: "Active sessions", v: "12", c: "text-warning" },
                    { l: "Notes captured", v: "284", c: "text-accent" },
                    { l: "Tasks extracted", v: "67", c: "text-success" },
                    { l: "Decisions locked", v: "9", c: "text-coral" },
                  ].map(s => (
                    <div key={s.l} className="flex items-baseline justify-between border-b border-background/10 pb-3">
                      <span className="text-sm text-background/70">{s.l}</span>
                      <span className={`text-3xl font-bold font-mono ${s.c}`}>{s.v}</span>
                    </div>
                  ))}
                </div>
                <p className="font-hand text-xl text-warning mt-5">↑ best week so far</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
