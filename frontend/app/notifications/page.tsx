"use client";

import { AppSidebar } from "@/components/ligma/AppSidebar";
import { WorkspaceTopbar } from "@/components/ligma/WorkspaceTopbar";
import { useDemo, demoActions } from "@/lib/demoStore";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function Notifications() {
  const notifications = useDemo(s => s.notifications);
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <WorkspaceTopbar label="/inbox" title="Notifications" showSearch={false}/>
        <div className="px-8 py-8 max-w-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="zine-label mb-1">§ everything</div>
              <h2 className="text-xl font-bold">{notifications.filter(n => !n.read).length} unread</h2>
            </div>
            <Button variant="outline" onClick={() => { demoActions.markAllRead(); toast({ title: "Marked all as read" }); }}>
              <Check className="h-3.5 w-3.5"/> Mark all read
            </Button>
          </div>
          <div className="rounded-2xl border-2 border-foreground/15 bg-card divide-y divide-border overflow-hidden">
            {notifications.map(n => (
              <button key={n.id} onClick={() => demoActions.markRead(n.id)}
                className={cn("w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted transition-colors",
                  !n.read && "bg-muted/40")}>
                <span className={cn("h-9 w-9 rounded-full text-background text-xs font-bold flex items-center justify-center shrink-0", n.whoColor)}>{n.who[0]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-snug"><span className="font-medium">{n.who}</span> <span className="text-muted-foreground">{n.text}</span></div>
                  <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{n.time} ago</div>
                </div>
                {!n.read && <span className="mt-2 h-2 w-2 rounded-full bg-coral shrink-0" />}
              </button>
            ))}
            {notifications.length === 0 && (
              <div className="px-6 py-12 text-center text-muted-foreground">No notifications ✦</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}