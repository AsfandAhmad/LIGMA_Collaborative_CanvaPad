"use client";

import { AppSidebar } from "@/components/ligma/AppSidebar";
import { WorkspaceTopbar } from "@/components/ligma/WorkspaceTopbar";
import { SessionGrid } from "@/components/ligma/SessionGrid";
import { useDemo, demoActions } from "@/lib/demoStore";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Trash() {
  const trashed = useDemo(s => s.sessions.filter(s => s.trashed));
  const empty = trashed.length === 0;
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <WorkspaceTopbar label="/trash" title="Trash" />
        <div className="px-8 py-8 space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="zine-label mb-1">§ deleted</div>
              <h2 className="text-xl font-bold">Items in your trash</h2>
              <p className="text-sm text-muted-foreground mt-1">Items here will be permanently deleted after 30 days.</p>
            </div>
            {!empty && (
              <Button variant="outline" onClick={() => {
                trashed.forEach(t => demoActions.deleteSessionForever(t.id));
                toast({ title: "Trash emptied" });
              }}><Trash2 className="h-3.5 w-3.5"/> Empty trash</Button>
            )}
          </div>
          <SessionGrid sessions={trashed} variant="trash" empty={<p className="text-muted-foreground">Trash is empty ✦</p>} />
        </div>
      </main>
    </div>
  );
}