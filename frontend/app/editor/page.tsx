"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, MousePointer2, Hand, StickyNote, Type, Square, Circle as CircleIcon,
  Diamond, ArrowUpRight, Minus, Pencil, Image as ImageIcon, Stamp, MessageCircle,
  Frame, Lock, Eraser, MoreHorizontal, Sparkles, Share2, Download, History,
  Users, Search, Command, Play, ChevronRight, X, CheckCircle2, Circle,
  Plus, Filter, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useCanvas } from "@/lib/hooks/useCanvas";
import { CanvasWrapper } from "@/components/canvas/CanvasWrapper";
import { usePresence } from "@/lib/hooks/usePresence";
import { useTaskBoard } from "@/lib/hooks/useTaskBoard";
import { useAuth } from "@/lib/auth-context";
import { ShareModal } from "@/components/ligma/ShareModal";
import { useRoleSync } from "@/lib/hooks/useRoleSync";

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
  const router = useRouter();
  
  // Auto-generate roomId if not provided
  const urlRoomId = searchParams.get('roomId');
  const [roomId, setRoomId] = useState<string>(() => {
    if (urlRoomId) return urlRoomId;
    // Generate unique roomId
    return `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  });
  
  // Update URL with generated roomId (only once, after mount)
  useEffect(() => {
    if (!urlRoomId && roomId) {
      router.replace(`/editor?roomId=${roomId}`, { scroll: false });
    }
  }, []); // Empty deps - only run once on mount
  
  const { user } = useAuth();
  
  // Real-time canvas data
  const { 
    nodes: canvasNodes, 
    isConnected: canvasConnected, 
    isSynced,
    status: canvasStatus,
    addNode,
    updateNode,
    deleteNode,
    setNodeLocked,
  } = useCanvas({ roomId });

  // Real-time presence/cursors
  const { 
    cursors: liveCursors, 
    isConnected: presenceConnected,
    updateCursor,
  } = usePresence({ roomId });

  // Tasks from backend with real-time WebSocket updates
  const { tasks, updateTaskStatus: updateTaskStatusAPI, ws: taskBoardWs } = useTaskBoard(roomId);

  // Sync role changes from WebSocket
  useRoleSync(taskBoardWs);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"canvas" | "split" | "review">("split");
  const [shareOpen, setShareOpen] = useState(false);

  // Scroll canvas to a specific node
  const scrollToNode = useCallback((nodeId: string) => {
    // Dispatch custom event that CanvasWrapper will listen to
    window.dispatchEvent(new CustomEvent("canvas:scrollToNode", {
      detail: { nodeId }
    }));
  }, []);

  // Convert canvas nodes to Note format (for task board only)
  const notes: Note[] = canvasNodes.filter((n: any) => n.type === 'sticky').map((node: any) => {
    const intent = (node.intent || 'action') as Intent;
    return {
      id: node.id,
      text: node.content?.text || '',
      intent: intent,
      color: node.color || intentToColor[intent],
      x: node.x || 0,
      y: node.y || 0,
      rot: node.rotation || 0,
      author: {
        name: node.createdBy,
        color: getUserColor(node.createdBy),
      },
      locked: node.locked,
      taskStatus: node.taskStatus,
      assignee: node.assignee,
    };
  });

  const selected = notes.find(n => n.id === selectedId);
  const linkedTaskNotes = notes.filter(n => n.taskStatus);

  return (
    <>
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
        <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 className="h-3.5 w-3.5"/> Share
        </Button>
        <Button variant="paper" size="sm" onClick={() => toast({ title: "Export started", description: "Your PDF will download shortly." })}><Download className="h-3.5 w-3.5"/> Export</Button>
      </header>

      <div className="flex-1 flex min-h-0">

        {/* CANVAS */}
        <section 
          className={cn("relative bg-paper overflow-hidden", mode === "split" ? "flex-1" : "flex-1")}
        >
          {/* Viewer Read-Only Banner */}
          {user?.role === 'viewer' || user?.role === 'Viewer' ? (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border-2 border-warning/30 bg-warning/10 text-warning backdrop-blur">
                <Lock className="h-4 w-4" />
                View-Only Mode — You cannot edit this canvas
              </div>
            </div>
          ) : null}
          
          <CanvasWrapper
            nodes={canvasNodes as any}
            onNodeAdd={addNode as any}
            onNodeUpdate={updateNode}
            onNodeDelete={deleteNode}
            cursors={liveCursors}
            onCursorMove={updateCursor}
            externalSelectedId={selectedId}
            onSelectionChange={(ids) => setSelectedId(ids[0] ?? null)}
          />
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
              {(["todo","in_progress","done"] as const).map(col => {
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
                      {backendItems.map(t => {
                        const isLinked = selectedId === t.nodeId;
                        return (
                          <div key={t.id} className="w-full rounded-lg border-2 p-3 bg-background border-foreground/15 space-y-2">
                            <div className="flex items-start gap-2">
                              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", col === "done" ? "text-success" : "text-muted-foreground")}/>
                              <div className="flex-1 min-w-0">
                                <div className={cn("text-[13px] font-medium leading-snug", col === "done" && "line-through text-muted-foreground")}>{t.text}</div>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className="text-[10px] font-mono text-muted-foreground">@{t.authorName?.toLowerCase() ?? 'unknown'}</span>
                                  <span className="ml-auto text-[10px] font-mono text-success flex items-center gap-0.5"><Zap className="h-2.5 w-2.5"/>AI task</span>
                                </div>
                              </div>
                            </div>
                            {/* Action buttons */}
                            <div className="flex gap-2">
                              {t.nodeId && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1 text-xs h-7"
                                  onClick={() => {
                                    scrollToNode(t.nodeId);
                                    setSelectedId(t.nodeId);
                                    toast({ title: "Scrolling to node", description: "Canvas will pan to the linked sticky note" });
                                  }}
                                >
                                  <ChevronRight className="h-3 w-3 mr-1"/> Go to Node
                                </Button>
                              )}
                              {user?.role !== 'viewer' && col !== 'done' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-xs h-7"
                                  onClick={async () => {
                                    try {
                                      const nextStatus = col === 'todo' ? 'in_progress' : 'done';
                                      await updateTaskStatusAPI(t.id, nextStatus);
                                      toast({ title: "Task updated", description: `Moved to ${nextStatus.replace('_', ' ')}` });
                                    } catch (error) {
                                      toast({ title: "Failed to update task", variant: "destructive" });
                                    }
                                  }}
                                >
                                  {col === 'todo' ? 'Start' : 'Complete'}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
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

    {shareOpen && (
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        roomId={roomId}
        roomName="Sprint 44 — kickoff"
      />
    )}
    </>
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const roomId = searchParams?.get('roomId');

  const handleGenerateSummary = async () => {
    if (!roomId) {
      toast({ title: "Error", description: "No room ID found", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      const response = await fetch(`${API_URL}/api/canvas/${roomId}/export`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const summaryText = await response.text();
      setSummary(summaryText);
      toast({ title: "Success", description: "Session summary generated!" });
    } catch (error: any) {
      console.error('Summary generation error:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to generate summary", 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
        <Button 
          variant="paper" 
          className="w-full" 
          onClick={handleGenerateSummary}
          disabled={isGenerating}
        >
          <Sparkles className="h-3.5 w-3.5"/> 
          {isGenerating ? "Generating..." : "Generate session summary"}
        </Button>

        {summary && (
          <div className="mt-4 p-3 rounded-lg border border-foreground/10 bg-muted/30 max-h-96 overflow-y-auto">
            <div className="zine-label mb-2">AI Summary</div>
            <div className="prose prose-sm max-w-none text-xs whitespace-pre-wrap">
              {summary}
            </div>
          </div>
        )}
      </div>
    </>
  );
}


