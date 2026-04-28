"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Users, Star, MoreHorizontal, Trash2, RotateCcw, Share2 } from "lucide-react";
import { type DemoSession, demoActions } from "@/lib/demoStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

type Variant = "default" | "trash";

export function SessionGrid({ sessions, empty, variant = "default" }: { sessions: DemoSession[]; empty?: React.ReactNode; variant?: Variant }) {
  const router = useRouter();

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-foreground/20 bg-card p-12 text-center">
        {empty || <p className="text-muted-foreground">Nothing here yet.</p>}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sessions.map((s) => (
        <div key={s.id} className="group rounded-2xl border-2 border-foreground/15 bg-card p-3 hover:border-foreground hover:-translate-y-0.5 transition-all relative">
          <button
            onClick={() => variant === "default" ? router.push("/lobby") : null}
            className="block w-full text-left"
            disabled={variant === "trash"}
          >
            <div className={`relative aspect-[16/10] rounded-xl ${s.thumb} overflow-hidden border border-foreground/10 ${variant === "trash" ? "opacity-60 grayscale" : ""}`}>
              <div className="absolute inset-0 bg-blueprint-grid opacity-30" />
              <div className="absolute top-3 left-3 h-8 w-12 bg-card rounded shadow-sm rotate-[-3deg]" />
              <div className="absolute top-6 left-14 h-10 w-14 bg-card rounded shadow-sm rotate-[2deg]" />
              <div className="absolute bottom-3 right-3 h-6 w-10 bg-card rounded shadow-sm rotate-[-1deg]" />
              {s.pulse && variant === "default" && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-success/90 text-background px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-background animate-pulse" /> live
                </span>
              )}
            </div>
            <div className="pt-3 px-1 pb-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`h-2 w-2 rounded-sm ${s.folderColor}`} />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{s.folder}</span>
                {s.starred && <Star className="h-3 w-3 text-warning fill-warning ml-auto" />}
              </div>
              <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">{s.name}</h3>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3"/> {s.time}</span>
                <span className="flex items-center gap-2">
                  {s.live > 0 && (
                    <span className="flex items-center gap-1 text-success"><Users className="h-3 w-3"/> {s.live}</span>
                  )}
                  <span>{s.tasks} tasks</span>
                </span>
              </div>
            </div>
          </button>

          <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="h-7 w-7 bg-background/80 backdrop-blur"><MoreHorizontal className="h-3.5 w-3.5"/></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {variant === "default" ? (
                  <>
                    <DropdownMenuItem onClick={() => { demoActions.toggleStar(s.id); toast({ title: s.starred ? "Removed from favorites" : "Starred" }); }}>
                      <Star className="h-3.5 w-3.5"/> {s.starred ? "Unstar" : "Star"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { navigator.clipboard?.writeText(`https://ligma.app/s/${s.id}`).catch(()=>{}); toast({ title: "Link copied", description: s.name }); }}>
                      <Share2 className="h-3.5 w-3.5"/> Copy share link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { demoActions.trashSession(s.id); toast({ title: "Moved to trash", description: s.name }); }}>
                      <Trash2 className="h-3.5 w-3.5"/> Move to trash
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => { demoActions.restoreSession(s.id); toast({ title: "Restored", description: s.name }); }}>
                      <RotateCcw className="h-3.5 w-3.5"/> Restore
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { demoActions.deleteSessionForever(s.id); toast({ title: "Deleted forever" }); }}>
                      <Trash2 className="h-3.5 w-3.5"/> Delete forever
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}


