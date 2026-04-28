"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, MousePointer2, Hand, StickyNote, Type, Square, Circle as CircleIcon,
  Diamond, ArrowUpRight, Minus, Pencil, Image as ImageIcon, Stamp, MessageCircle,
  Frame, Lock, Eraser, MoreHorizontal, Sparkles, Share2, Download, History,
  Users, Search, Command, Play, ChevronRight, X, CheckCircle2, Circle,
  Plus, Filter, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useCanvas } from "@/lib/hooks/useCanvas";
import { usePresence } from "@/lib/hooks/usePresence";
import { useTasks } from "@/lib/hooks/useTasks";
import { useAuth } from "@/lib/auth-context";

type Intent = "action" | "decision" | "question" | "reference";
type Note = {
  id: string;
  text: string;
  intent: Intent;
  color: string;
  x: number; y: number; rot: number;
  author: { name: string; color: string };
  locked?: boolean;
  taskStatus?: "todo" | "done" | "backlog" | "in_progress";
  assignee?: string;
};

const intentMeta: Record<Intent, { label: string; color: string; chip: string }> = {
  action:    { label: "ACTION",   color: "text-intent-action",    chip: "bg-intent-action/15 text-intent-action" },
  decision:  { label: "DECISION", color: "text-intent-decision",  chip: "bg-intent-decision/15 text-intent-decision" },
  question:  { label: "QUESTION", color: "text-intent-question",  chip: "bg-intent-question/15 text-intent-question" },
  reference: { label: "REF",      color: "text-intent-reference", chip: "bg-intent-reference/15 text-intent-reference" },
};

const intentToColor: Record<Intent, string> = {
  action: "bg-sticky-yellow",
  decision: "bg-sticky-mint",
  question: "bg-sticky-pink",
  reference: "bg-sticky-sky",
};

const userColors = ["bg-coral", "bg-indigo", "bg-success", "bg-warning"];
const userColorMap = new Map<string, string>();

function getUserColor(userId: string): string {
  if (!userColorMap.has(userId)) {
    const colorIndex = userColorMap.size % userColors.length;
    userColorMap.set(userId, userColors[colorIndex]);
  }
  return userColorMap.get(userId)!;
}

const tools = [
  { icon: MousePointer2, k: "V" }, { icon: Hand, k: "H" }, { icon: StickyNote, k: "N", highlight: true },
  { icon: Type, k: "T" }, { icon: Square, k: "R" }, { icon: CircleIcon, k: "O" }, { icon: Diamond, k: "D" },
  { icon: ArrowUpRight, k: "A" }, { icon: Minus, k: "L" }, { icon: Pencil, k: "P" },
  { icon: ImageIcon, k: "I" }, { icon: Stamp, k: "S" }, { icon: MessageCircle, k: "C" },
  { icon: Frame, k: "F" }, { icon: Lock, k: "K" }, { icon: Eraser, k: "E" }, { icon: MoreHorizontal, k: "" },
];

function EditorContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') || 'default-room';
  const { user } = useAuth();
  
  // Real-time canvas data
  const { 
    nodes: canvasNodes, 
    isConnected: canvasConnected, 
    isSynced,
    status: canvasStatus,
    addNode,
    updateNode,
    setNodeLocked,
  } = useCanvas({ roomId });

  // Real-time presence/cursors
  const { 
    cursors: liveCursors, 
    isConnected: presenceConnected,
    updateCursor,
  } = usePresence({ roomId });

  // Tasks from backend
  const { tasks } = useTasks({ roomId });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"canvas" | "split" | "review">("split");
  const [activeTool, setActiveTool] = useState(2);
  const [zoom, setZoom] = useState(100);

  // Convert canvas nodes to Note format
  const notes: Note[] = canvasNodes.map(node => ({
    id: node.id,
    text: node.content?.text || '',
    intent: node.intent || 'action',
    color: node.color || intentToColor[node.intent || 'action'],
    x: node.position.x,
    y: node.position.y,
    rot: node.rotation || 0,
    author: {
      name: node.createdBy,
      color: getUserColor(node.createdBy),
    },
    locked: node.locked,
    taskStatus: node.taskStatus,
    assignee: node.assignee,
  }));

  const selected = notes.find(n => n.id === selectedId);
  const linkedTaskNotes = notes.filter(n => n.taskStatus);

  // Track cursor movement
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (presenceConnected) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      updateCursor(x, y);
    }
  }, [presenceConnected, updateCursor]);

  // Add a new sticky note
  const handleAddNote = useCallback(() => {
    if (!user) return;
    
    const newNodeId = addNode({
      type: 'sticky',
      content: { text: 'New note' },
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      rotation: Math.random() * 6 - 3,
      intent: 'action',
      color: 'bg-sticky-yellow',
    });

    toast({
      title: 'Note added',
      description: 'Click to edit the note',
    });
  }, [user, addNode]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* TOP BAR */}
      <header className="h-14 border-b-2 border-foreground/10 bg-card flex items-center px-3 gap-3 shrink-0">
        <Button asChild variant="ghost" size="icon-sm"><Link href="/lobby"><ArrowLeft className="h-4 w-4"/></Link></Button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[11px] text-muted-foreground truncate">orbital / sprint-44 /</span>
          <h1 className="font-bold truncate">Sprint 44 — kickoff</h1>
          <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">· {isSynced ? 'synced' : 'syncing...'} · {canvasStatus}</span>
          <span className={cn(
            "ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider",
            canvasConnected && presenceConnected 
              ? "bg-success/15 text-success" 
              : "bg-warning/15 text-warning"
          )}>
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              canvasConnected && presenceConnected ? "bg-success animate-pulse" : "bg-warning"
            )} /> 
            {canvasConnected && presenceConnected ? 'live' : 'connecting...'}
          </span>
        </div>

        {/* mode switch */}
        <div className="ml-auto flex items-center gap-1 rounded-lg border-2 border-foreground/15 bg-background p-0.5">
          {(["canvas","split","review"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all",
              mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}>{m === "split" ? "Split View" : m}</button>
          ))}
        </div>

        <Button variant="ghost" size="icon-sm" className="hidden md:inline-flex" onClick={() => toast({ title: "Search canvas", description: "Try ⌘K — node search is coming soon." })}><Search className="h-4 w-4"/></Button>
        <button onClick={() => toast({ title: "Command palette", description: "⌘K palette is coming next." })} className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
          <Command className="h-3 w-3"/> K
        </button>

        <div className="flex -space-x-1.5 ml-2">
          {[{c:"bg-coral",i:"M"},{c:"bg-indigo",i:"J"},{c:"bg-success",i:"S"},{c:"bg-warning",i:"L"}].map((u,i)=>(
            <span key={i} className={`h-7 w-7 rounded-full ${u.c} text-background border-2 border-card flex items-center justify-center text-[10px] font-bold`}>{u.i}</span>
          ))}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => toast({ title: "Replay history", description: "Scrub the timeline at the bottom of the canvas." })}><History className="h-4 w-4"/></Button>
        <Button variant="ghost" size="sm" onClick={() => {
          navigator.clipboard?.writeText("https://ligma.app/s/sprint-44-kickoff").catch(()=>{});
          toast({ title: "Share link copied" });
        }}><Share2 className="h-3.5 w-3.5"/> Share</Button>
        <Button variant="paper" size="sm" onClick={() => toast({ title: "Export started", description: "Your PDF will download shortly." })}><Download className="h-3.5 w-3.5"/> Export</Button>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* LEFT TOOLBAR */}
        <aside className="w-14 shrink-0 border-r-2 border-foreground/10 bg-card flex flex-col items-center py-3 gap-1">
          {tools.map((T, i) => (
            <button key={i} onClick={() => setActiveTool(i)} className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center transition-all relative group",
              activeTool === i
                ? "bg-foreground text-background"
                : T.highlight
                  ? "bg-warning/30 hover:bg-warning/50 text-foreground"
                  : "hover:bg-muted text-foreground"
            )}>
              <T.icon className="h-4 w-4" />
              {T.k && (
                <span className="absolute left-full ml-2 px-1.5 py-0.5 rounded font-mono text-[10px] bg-foreground text-background opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  {T.k}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* CANVAS */}
        <section 
          className={cn("relative bg-paper bg-blueprint-grid overflow-hidden", mode === "split" ? "flex-1" : "flex-1")}
          onMouseMove={handleMouseMove}
        >
          {/* Section frame */}
          <div className="absolute left-10 top-12 w-[640px] h-[400px] rounded-xl border-2 border-dashed border-primary/40 bg-primary/[0.02] pointer-events-none">
            <span className="absolute -top-3 left-4 bg-background px-2 font-hand text-lg text-primary">Architecture decisions</span>
            <span className="absolute -bottom-3 right-4 bg-background px-2 font-mono text-[10px] uppercase tracking-wider text-primary/70">{liveCursors.length} editing</span>
          </div>

          {/* Notes */}
          {notes.map(n => {
            const meta = intentMeta[n.intent];
            const isSelected = selectedId === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setSelectedId(n.id)}
                style={{ left: n.x, top: n.y, transform: `rotate(${n.rot}deg)` }}
                className={cn(
                  "absolute w-44 text-left rounded-lg p-3 border shadow-sticky transition-all",
                  n.color, "border-foreground/15 hover:scale-[1.03]",
                  isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background z-20 animate-pulse-ring"
                )}
              >
                {n.locked && (
                  <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center">
                    <Lock className="h-2.5 w-2.5"/>
                  </span>
                )}
                <div className="font-hand text-base leading-tight text-foreground">{n.text}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={cn("font-mono text-[9px] uppercase tracking-wider", meta.color)}>● {meta.label}</span>
                  <span className={`h-4 w-4 rounded-full ${n.author.color} text-background text-[8px] font-bold flex items-center justify-center`}>{n.author.name[0]}</span>
                </div>
              </button>
            );
          })}

          {/* Connector arrows */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="hsl(var(--primary))" />
              </marker>
            </defs>
            <path d="M210 320 Q 320 360 380 330" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arr)" />
          </svg>

          {/* Live cursors */}
          {liveCursors.map(c => (
            <div key={c.userId} className="absolute pointer-events-none transition-all duration-100" style={{ left: c.x, top: c.y }}>
              <svg className="h-5 w-5" style={{ color: c.userColor }} viewBox="0 0 24 24" fill="currentColor"><path d="M3 2 L3 22 L9 16 L13 22 L16 19 L12 14 L20 13 Z"/></svg>
              <span className="ml-3 -mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-background" style={{ backgroundColor: c.userColor }}>{c.userName}</span>
            </div>
          ))}

          {/* Bottom controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl border-2 border-foreground/15 bg-card px-2 py-1.5 shadow-soft">
            <Button variant="ghost" size="icon-sm" onClick={() => setZoom(z => Math.max(25, z - 10))}>−</Button>
            <span className="font-mono text-xs px-2 w-14 text-center">{zoom}%</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setZoom(z => Math.min(200, z + 10))}>+</Button>
            <span className="w-px h-4 bg-border mx-1" />
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setZoom(100)}><Frame className="h-3 w-3"/> Fit</Button>
          </div>

          {/* Bottom timeline */}
          <div className="absolute bottom-20 left-4 right-4 rounded-xl border-2 border-foreground/15 bg-card/95 backdrop-blur p-3 shadow-soft">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon-sm"><Play className="h-3.5 w-3.5"/></Button>
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">activity timeline</span>
              <div className="flex-1 relative h-8">
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-foreground/15" />
                {[
                  { p: 5, c: "bg-success", l: "joined" },
                  { p: 18, c: "bg-coral", l: "stickies" },
                  { p: 32, c: "bg-intent-decision", l: "decision" },
                  { p: 48, c: "bg-primary", l: "lock" },
                  { p: 62, c: "bg-warning", l: "AI" },
                  { p: 78, c: "bg-intent-action", l: "task" },
                  { p: 92, c: "bg-success", l: "now" },
                ].map((e, i) => (
                  <div key={i} className="absolute top-0 group" style={{ left: `${e.p}%` }}>
                    <span className={`block h-3 w-3 rounded-full ${e.c} ring-2 ring-card mt-2.5`} />
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full font-mono text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 whitespace-nowrap">{e.l}</span>
                  </div>
                ))}
                <div className="absolute top-1.5 h-5 w-0.5 bg-primary" style={{ left: "92%" }} />
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">25:14</span>
            </div>
          </div>
        </section>

        {/* SPLIT — Task Board */}
        {mode === "split" && (
          <section className="w-[400px] xl:w-[440px] shrink-0 border-l-2 border-foreground/10 bg-card flex flex-col">
            <div className="px-4 py-3 border-b border-foreground/10 flex items-center gap-2">
              <div>
                <div className="zine-label">/task board</div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  Synced from canvas
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] font-mono"><Sparkles className="h-2.5 w-2.5"/>AI</span>
                </h3>
              </div>
              <div className="ml-auto flex gap-1">
                <Button variant="ghost" size="icon-sm"><Filter className="h-3.5 w-3.5"/></Button>
                <Button variant="ghost" size="icon-sm"><Plus className="h-3.5 w-3.5"/></Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {(["todo","done"] as const).map(col => {
                // Combine: canvas nodes with taskStatus + real backend tasks
                const nodeItems = linkedTaskNotes.filter(n => n.taskStatus === col);
                const backendItems = tasks.filter(t => t.status === col);
                const Icon = col === "done" ? CheckCircle2 : Circle;
                return (
                  <div key={col}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="zine-label">{col}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{nodeItems.length + backendItems.length}</span>
                      <div className="flex-1 h-px bg-border ml-1" />
                    </div>
                    <div className="space-y-2">
                      {nodeItems.map(n => {
                        const meta = intentMeta[n.intent];
                        const isLinked = selectedId === n.id;
                        return (
                          <button
                            key={n.id}
                            onClick={() => setSelectedId(n.id)}
                            className={cn(
                              "w-full text-left rounded-lg border-2 p-3 bg-background transition-all",
                              isLinked ? "border-primary shadow-glow" : "border-foreground/15 hover:border-foreground/40"
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0",
                                col === "done" ? "text-success" : "text-muted-foreground"
                              )}/>
                              <div className="flex-1 min-w-0">
                                <div className={cn("text-[13px] font-medium leading-snug", col === "done" && "line-through text-muted-foreground")}>{n.text}</div>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded", meta.chip)}>● {meta.label}</span>
                                  {n.locked && <Lock className="h-3 w-3 text-foreground"/>}
                                  <span className="ml-auto text-[10px] font-mono text-primary flex items-center gap-0.5"><Zap className="h-2.5 w-2.5"/>canvas</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {backendItems.map(t => (
                        <div key={t.id} className="w-full text-left rounded-lg border-2 p-3 bg-background border-foreground/15">
                          <div className="flex items-start gap-2">
                            <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", col === "done" ? "text-success" : "text-muted-foreground")}/>
                            <div className="flex-1 min-w-0">
                              <div className={cn("text-[13px] font-medium leading-snug", col === "done" && "line-through text-muted-foreground")}>{t.text}</div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-mono text-muted-foreground">@{t.author?.name?.toLowerCase() ?? 'unknown'}</span>
                                <span className="ml-auto text-[10px] font-mono text-success flex items-center gap-0.5"><Zap className="h-2.5 w-2.5"/>AI task</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {nodeItems.length === 0 && backendItems.length === 0 && (
                        <div className="text-xs text-muted-foreground italic px-3 py-2 border border-dashed border-border rounded-md">no tasks here</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* RIGHT PANEL */}
        <aside className="w-80 shrink-0 border-l-2 border-foreground/10 bg-card flex flex-col">
          {selected ? (
            <>
              <div className="px-4 py-3 border-b border-foreground/10 flex items-center gap-2">
                <div className="zine-label">/node details</div>
                <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={() => setSelectedId(null)}><X className="h-3.5 w-3.5"/></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <div>
                  <div className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono mb-2", intentMeta[selected.intent].chip)}>
                    <Sparkles className="h-2.5 w-2.5"/> AI · {intentMeta[selected.intent].label} · 94%
                  </div>
                  <h3 className="font-bold leading-snug">{selected.text}</h3>
                </div>

                <div className="space-y-2 text-sm">
                  <Row k="Author" v={<span className="flex items-center gap-1.5"><span className={`h-4 w-4 rounded-full ${selected.author.color} text-background text-[8px] font-bold flex items-center justify-center`}>{selected.author.name[0]}</span>{selected.author.name}</span>}/>
                  <Row k="Created" v={<span className="font-mono text-xs">12 min ago</span>}/>
                  {selected.assignee && <Row k="Assignee" v={<span className="font-mono text-xs">@{selected.assignee.toLowerCase()}</span>}/>}
                  <Row k="Permissions" v={selected.locked ? <span className="inline-flex items-center gap-1 text-foreground"><Lock className="h-3 w-3"/> Lead-only</span> : <span className="text-muted-foreground">Open</span>}/>
                  {selected.taskStatus && <Row k="Linked task" v={<span className="text-primary font-mono text-xs flex items-center gap-1">{selected.taskStatus.replace("_"," ")} <ChevronRight className="h-3 w-3"/></span>}/>}
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <Button variant="paper" className="w-full justify-start" onClick={() => {
                    if (selected.taskStatus) {
                      toast({ title: "Already a task" });
                    } else {
                      updateNode(selected.id, { intent: "action", taskStatus: "todo" });
                      toast({ title: "Converted to task", description: selected.text });
                    }
                  }}><Sparkles className="h-3.5 w-3.5"/> Convert to task</Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => {
                    updateNode(selected.id, { intent: "decision" });
                    toast({ title: "Marked as decision" });
                  }}><CheckCircle2 className="h-3.5 w-3.5"/> Mark as decision</Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => {
                    setNodeLocked(selected.id, !selected.locked);
                    toast({ title: selected.locked ? "Node unlocked" : "Node locked" });
                  }}><Lock className="h-3.5 w-3.5"/> {selected.locked ? "Unlock node" : "Lock node"}</Button>
                </div>

                <div>
                  <div className="zine-label mb-2">§ comments · 2</div>
                  <div className="space-y-2">
                    {[{w:"Jin", c:"agree, locking this before we drift"}, {w:"Sam", c:"+1, will start the migration draft"}].map((c,i)=>(
                      <div key={i} className="rounded-lg border border-border p-2 text-xs">
                        <div className="font-medium mb-0.5">{c.w}</div>
                        <div className="text-muted-foreground">{c.c}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <RoomInsights />
          )}
        </aside>
      </div>
    </div>
  );
}

export default function Editor() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    }>
      <EditorContent />
    </Suspense>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{k}</span>
      <span className="text-sm">{v}</span>
    </div>
  );
}

function RoomInsights() {
  return (
    <>
      <div className="px-4 py-3 border-b border-foreground/10">
        <div className="zine-label">/room insights</div>
        <h3 className="font-bold text-sm mt-0.5 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary"/> AI is watching</h3>
      </div>
      <div className="p-4 space-y-5 text-sm">
        <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground"/> <span>Real-time collaboration active</span></div>
        <div>
          <div className="zine-label mb-2">latest extracted</div>
          <ul className="space-y-1.5 text-xs">
            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-intent-action shrink-0"/>Syncing with backend...</li>
            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-intent-decision shrink-0"/>AI intent classification active</li>
          </ul>
        </div>
        <div>
          <div className="zine-label mb-2">features</div>
          <ul className="space-y-1.5 text-xs">
            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-success shrink-0"/>Real-time CRDT sync (Yjs)</li>
            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-success shrink-0"/>Live cursor tracking</li>
            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-success shrink-0"/>Event sourcing</li>
            <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-success shrink-0"/>RBAC permissions</li>
          </ul>
        </div>
        <Button variant="paper" className="w-full"><Sparkles className="h-3.5 w-3.5"/> Generate session summary</Button>
      </div>
    </>
  );
}


