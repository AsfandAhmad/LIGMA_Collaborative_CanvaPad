"use client";

/**
 * InfiniteCanvas - React wrapper around CanvasEngine
 * Manages canvas lifecycle, syncs nodes from Yjs, handles resize
 */

import { useEffect, useRef, useCallback } from "react";
import { CanvasEngine } from "@/lib/canvas/CanvasEngine";
import type { CanvasNode, ToolType } from "@/types/canvas";

interface InfiniteCanvasProps {
  nodes: CanvasNode[];
  selectedIds: string[];
  activeTool: ToolType;
  onNodeAdd: (node: Omit<CanvasNode, "id" | "createdBy" | "createdAt">) => string;
  onNodeUpdate: (id: string, updates: Partial<CanvasNode>) => void;
  onNodeDelete: (id: string) => void;
  onSelectionChange: (ids: string[]) => void;
  onCursorMove: (x: number, y: number) => void;
  onZoomChange: (zoom: number) => void;
  onEngineReady?: (engine: CanvasEngine) => void;
}

export function InfiniteCanvas({
  nodes,
  selectedIds,
  activeTool,
  onNodeAdd,
  onNodeUpdate,
  onNodeDelete,
  onSelectionChange,
  onCursorMove,
  onZoomChange,
  onEngineReady,
}: InfiniteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize engine once
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Set canvas size to container size
    const { width, height } = container.getBoundingClientRect();
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Scale context for HiDPI
    const ctx = canvas.getContext("2d")!;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const engine = new CanvasEngine(canvas, {
      onNodeAdd,
      onNodeUpdate,
      onNodeDelete,
      onSelectionChange,
      onCursorMove,
      onViewportChange: onZoomChange,
    });

    engineRef.current = engine;
    onEngineReady?.(engine);

    // Handle container resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx2 = canvas.getContext("2d")!;
        ctx2.scale(dpr, dpr);
        engine.resize(width, height);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync nodes from Yjs into engine
  useEffect(() => {
    engineRef.current?.setNodes(nodes);
  }, [nodes]);

  // Sync active tool
  useEffect(() => {
    engineRef.current?.setActiveTool(activeTool);
  }, [activeTool]);

  // Sync selected IDs (from external changes like right panel)
  useEffect(() => {
    engineRef.current?.setSelectedIds(selectedIds);
  }, [selectedIds]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        style={{ cursor: "default" }}
      />
    </div>
  );
}
