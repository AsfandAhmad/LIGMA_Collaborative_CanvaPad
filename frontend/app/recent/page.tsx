"use client";

import { AppSidebar } from "@/components/ligma/AppSidebar";
import { WorkspaceTopbar } from "@/components/ligma/WorkspaceTopbar";
import { SessionGrid } from "@/components/ligma/SessionGrid";
import { useDemo } from "@/lib/demoStore";

export default function Recent() {
  const sessions = useDemo(s => s.sessions);
  const recent = [...sessions].filter(s => !s.trashed).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12);
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <WorkspaceTopbar label="/recent" title="Recently opened" />
        <div className="px-8 py-8 space-y-6">
          <div>
            <div className="zine-label mb-1">§ last 30 days</div>
            <h2 className="text-xl font-bold">Pick up where you left off</h2>
          </div>
          <SessionGrid sessions={recent} empty={<p className="text-muted-foreground">No recent sessions yet — start a new one.</p>} />
        </div>
      </main>
    </div>
  );
}
