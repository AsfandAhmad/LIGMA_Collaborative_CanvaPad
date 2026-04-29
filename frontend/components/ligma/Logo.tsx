"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export function Logo({ className, mark = false }: { className?: string; mark?: boolean }) {
  const { isAuthenticated } = useAuth();
  const href = isAuthenticated ? "/recent" : "/";

  return (
    <a href={href} className={cn("inline-flex items-center gap-2 group", className)}>
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background shadow-[2px_2px_0_hsl(var(--primary))]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M4 4 L4 20 L12 20" />
          <path d="M9 12 L20 12" />
          <circle cx="20" cy="12" r="1.6" fill="currentColor" />
          <path d="M16 6 L20 6" className="text-primary" />
        </svg>
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-coral" />
      </span>
      {!mark && (
        <span className="flex items-baseline gap-1">
          <span className="font-mono text-lg font-bold tracking-tight">LIGMA</span>
          <span className="font-hand text-sm text-muted-foreground hidden sm:inline">/v0.9</span>
        </span>
      )}
    </a>
  );
}
