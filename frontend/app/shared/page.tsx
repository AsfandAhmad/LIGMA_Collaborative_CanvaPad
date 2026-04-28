"use client";

import { AppSidebar } from "@/components/ligma/AppSidebar";
import { WorkspaceTopbar } from "@/components/ligma/WorkspaceTopbar";
import { SessionGrid } from "@/components/ligma/SessionGrid";
import { useDemo } from "@/lib/demoStore";

export default function Shared() {
  const sessions = useDemo(s => s.sessions.filter(s => s.shared && !s.trashed));
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <WorkspaceTopbar label="/shared with me" title="Shared with you" />
        <div className="px-8 py-8 space-y-6">
          <div>
            <div className="zine-label mb-1">§ collaborations</div>
            <h2 className="text-xl font-bold">Sessions teammates invited you to</h2>
          </div>
          <SessionGrid sessions={sessions} empty={<p className="text-muted-foreground">Nothing shared with you yet.</p>}/>
        </div>
      </main>
    </div>
  );
}