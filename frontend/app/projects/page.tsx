"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppSidebar } from "@/components/ligma/AppSidebar";
import { WorkspaceTopbar } from "@/components/ligma/WorkspaceTopbar";
import { SessionGrid } from "@/components/ligma/SessionGrid";
import { useDemo } from "@/lib/demoStore";
import { cn } from "@/lib/utils";

const folders = [
  { name: "All projects", color: "bg-foreground" },
  { name: "Sprint 44", color: "bg-coral" },
  { name: "Q2 Planning", color: "bg-warning" },
  { name: "Design Reviews", color: "bg-success" },
  { name: "Onboarding", color: "bg-indigo" },
];

function ProjectsContent() {
  const searchParams = useSearchParams();
  const folder = searchParams.get("folder") || "All projects";
  const sessions = useDemo(s => s.sessions.filter(s => !s.trashed));
  const filtered = folder === "All projects" ? sessions : sessions.filter(s => s.folder === folder);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <WorkspaceTopbar label="/projects" title="Projects" />
        <div className="px-8 py-8 space-y-6">
          <div className="flex gap-2 flex-wrap">
            {folders.map(f => {
              const active = folder === f.name;
              return (
                <button key={f.name}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    if (f.name === "All projects") {
                      params.delete("folder");
                    } else {
                      params.set("folder", f.name);
                    }
                    window.history.pushState(null, "", `?${params.toString()}`);
                  }}
                  className={cn("inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm transition-colors",
                    active ? "border-foreground bg-foreground text-background" : "border-foreground/15 hover:border-foreground/40")}>
                  <span className={cn("h-2 w-2 rounded-sm", f.color)} />
                  {f.name}
                </button>
              );
            })}
          </div>
          <SessionGrid sessions={filtered} empty={<p className="text-muted-foreground">No sessions in this project.</p>}/>
        </div>
      </main>
    </div>
  );
}

export default function Projects() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    }>
      <ProjectsContent />
    </Suspense>
  );
}
