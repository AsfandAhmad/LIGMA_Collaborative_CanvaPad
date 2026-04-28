"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how" },
  { label: "Templates", href: "#templates" },
  { label: "Pricing", href: "#pricing" },
  { label: "Community", href: "#community" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn(
      "fixed top-0 inset-x-0 z-50 transition-all duration-300",
      scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border" : "bg-transparent"
    )}>
      <div className="container flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-7">
          {links.map(l => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link href="/auth">Log in</Link></Button>
          <Button asChild variant="paper" size="sm"><Link href="/dashboard">Start free →</Link></Button>
        </div>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-background border-t border-border animate-fade-in">
          <div className="container py-6 flex flex-col gap-4">
            {links.map(l => (
              <a key={l.href} href={l.href} className="text-lg font-medium" onClick={() => setOpen(false)}>{l.label}</a>
            ))}
            <div className="flex flex-col gap-2 pt-3 border-t border-border">
              <Button asChild variant="ghost"><Link href="/auth">Log in</Link></Button>
              <Button asChild variant="paper"><Link href="/dashboard">Start free</Link></Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}


