"use client";

import { useState } from "react";
import { Sparkles, Users, Infinity as InfIcon, ListChecks, Lock, History, Play, ArrowRight, Star } from "lucide-react";
import { Navbar } from "@/components/ligma/Navbar";
import { Footer } from "@/components/ligma/Footer";
import { HeroMockup } from "@/components/ligma/HeroMockup";
import { ScribbleArrow, StarBurst, CornerStamp } from "@/components/ligma/Doodles";
import { AuthModal } from "@/components/ligma/AuthModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function Home() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const openSignup = () => {
    if (isAuthenticated) { router.push("/dashboard"); return; }
    setAuthMode("signup");
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      {/* HERO */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="absolute inset-0 bg-blueprint-grid opacity-60" />
        <div className="absolute inset-0 bg-gradient-glow" />
        <div className="container relative">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-card/70 backdrop-blur px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Issue 09 · Spring 26 · live in 12 workspaces
              </div>
              <h1 className="text-5xl md:text-7xl font-bold leading-[1.02] tracking-tight">
                Brainstorm together. <br/>
                Leave with <span className="underline-marker">action</span>,<br/>
                <span className="font-hand text-coral text-6xl md:text-8xl">not chaos.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                A collaborative canvas that turns ideas, decisions, and questions into a structured task board — in real time, with the team you already have.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="paper" size="xl" onClick={openSignup}>
                  Start free <ArrowRight className="h-4 w-4"/>
                </Button>
                <Button variant="ghost" size="xl"><Play className="h-4 w-4" /> Watch 90s demo</Button>
              </div>

              {/* social proof */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4">
                <div className="flex -space-x-2">
                  {["bg-coral","bg-warning","bg-success","bg-indigo","bg-accent"].map((c,i)=>(
                    <span key={i} className={`h-8 w-8 rounded-full ${c} border-2 border-background`} />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-warning">
                    {[...Array(5)].map((_,i)=><Star key={i} className="h-4 w-4 fill-current"/>)}
                    <span className="ml-1 text-foreground font-medium text-sm">4.9</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">trusted by 2,400+ remote teams</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 relative">
              <CornerStamp className="absolute -top-6 -right-2 z-10" label="LIVE DEMO" />
              <ScribbleArrow className="absolute -left-16 top-1/2 w-28 text-primary hidden lg:block" />
              <HeroMockup />
              <p className="font-hand text-2xl text-primary mt-3 ml-2 rotate-[-2deg] inline-block">↑ this is the killer moment</p>
            </div>
          </div>
        </div>
      </section>

      {/* LOGO STRIP */}
      <section className="border-y border-foreground/10 bg-muted/40">
        <div className="container py-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          <span>orbital labs</span><span>·</span>
          <span>mercury studio</span><span>·</span>
          <span>pendulum</span><span>·</span>
          <span>halftone</span><span>·</span>
          <span>field notes co.</span><span>·</span>
          <span>nine industries</span>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="max-w-2xl mb-14">
            <div className="zine-label mb-3">§ 01 — what's inside</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Six tools. <span className="font-hand text-primary">One workflow.</span></h2>
            <p className="mt-4 text-muted-foreground text-lg">Built for the moment a brainstorm needs to become a plan, not another whiteboard graveyard.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Users, title: "Real-time collaboration", desc: "See cursors, presence halos, and teammates editing in motion.", note: "everyone, in flow" },
              { icon: InfIcon, title: "Infinite ideation canvas", desc: "Sticky notes, shapes, connectors, frames — built for fast thinking.", note: "no walls" },
              { icon: Sparkles, title: "AI intent extraction", desc: "Notes auto-classified into actions, decisions, questions, references.", note: "the magic part" },
              { icon: ListChecks, title: "Synced task board", desc: "Every classified note becomes a card. Click → jump to source.", note: "no copy-paste" },
              { icon: Lock, title: "Node-level permissions", desc: "Lock critical decisions. Roles per section. Real governance.", note: "lead-friendly" },
              { icon: History, title: "Replayable history", desc: "Scrub the session. See how the idea became the decision.", note: "audit-ready" },
            ].map((f, i) => (
              <div key={i} className="group relative rounded-2xl border-2 border-foreground/15 bg-card p-6 hover:border-foreground hover:-translate-y-1 transition-all duration-200 shadow-sm hover:shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-foreground text-background group-hover:bg-primary transition-colors">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">0{i+1}</span>
                </div>
                <h3 className="text-lg font-bold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                <p className="font-hand text-xl text-primary mt-3">— {f.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 bg-foreground text-background relative overflow-hidden">
        <div className="absolute inset-0 bg-blueprint-grid opacity-20" />
        <div className="container relative">
          <div className="max-w-2xl mb-14">
            <div className="zine-label mb-3 text-warning">§ 02 — the loop</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">From scribble to <span className="text-warning font-hand">shipped</span> in one session.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <ScribbleArrow className="hidden md:block absolute top-12 left-[28%] w-32 text-warning rotate-[-3deg]" color="hsl(var(--warning))"/>
            <ScribbleArrow className="hidden md:block absolute top-12 left-[60%] w-32 text-warning rotate-[2deg]" color="hsl(var(--warning))"/>
            {[
              { n: "01", t: "Brainstorm", d: "Drop sticky notes, sketch shapes, drag arrows. Your team works as one cursor swarm.", color: "bg-sticky-yellow" },
              { n: "02", t: "Classify", d: "AI sorts notes into actions, decisions, questions, references — confidence-tagged.", color: "bg-sticky-pink" },
              { n: "03", t: "Execute", d: "The task board auto-syncs. Click a card to leap to the original note. Ship.", color: "bg-sticky-mint" },
            ].map((s, i) => (
              <div key={i} className="relative">
                <div className={`${s.color} text-foreground rounded-xl border-2 border-background p-6 shadow-sticky`} style={{transform: `rotate(${i%2===0?-1:1}deg)`}}>
                  <div className="font-mono text-xs mb-2">STEP {s.n}</div>
                  <h3 className="text-2xl font-bold mb-2">{s.t}</h3>
                  <p className="text-sm leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEMPLATES */}
      <section id="templates" className="py-24">
        <div className="container">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <div className="zine-label mb-3">§ 03 — start somewhere</div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Templates that <span className="underline-coral">don't waste</span> your kickoff.</h2>
            </div>
            <Button variant="ghost">Browse all 40+ <ArrowRight className="h-4 w-4"/></Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { t: "Brainstorm map", d: "Open canvas, semantic auto-grouping", tag: "Ideation", color: "bg-sticky-yellow" },
              { t: "Sprint retro", d: "Liked / Learned / Lacked / Longed-for", tag: "Agile", color: "bg-sticky-pink" },
              { t: "Product planning", d: "Now / Next / Later with assignees", tag: "Roadmap", color: "bg-sticky-sky" },
              { t: "Architecture review", d: "Locked decision nodes by lead", tag: "Engineering", color: "bg-sticky-mint" },
              { t: "Content planning", d: "Calendar-linked task export", tag: "Marketing", color: "bg-sticky-yellow" },
              { t: "UX flow workshop", d: "Frames + journey + open questions", tag: "Design", color: "bg-sticky-pink" },
            ].map((tpl, i) => (
              <a key={i} href="#" className="group block">
                <div className={`${tpl.color} aspect-[4/3] rounded-xl border-2 border-foreground/20 p-4 relative overflow-hidden group-hover:-translate-y-1 group-hover:border-foreground transition-all shadow-sticky`}>
                  <div className="bg-blueprint-grid absolute inset-0 opacity-20" />
                  <div className="relative h-full flex flex-col justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-foreground/70 self-start bg-background/60 backdrop-blur px-2 py-0.5 rounded">{tpl.tag}</span>
                    <div className="flex gap-1.5">
                      <span className="h-6 w-10 bg-background rounded rotate-[-4deg] shadow-sm" />
                      <span className="h-6 w-12 bg-background rounded rotate-[3deg] shadow-sm" />
                      <span className="h-6 w-8 bg-background rounded rotate-[-2deg] shadow-sm" />
                    </div>
                  </div>
                </div>
                <h3 className="mt-3 font-bold group-hover:text-primary transition-colors">{tpl.t}</h3>
                <p className="text-sm text-muted-foreground">{tpl.d}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-muted/40 border-y border-foreground/10">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="zine-label mb-3">§ 04 — the price tag</div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Start free. <span className="font-hand text-primary">Pay when it ships.</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {[
              { name: "Free", price: "$0", tag: "for the curious", features: ["Up to 3 sessions", "5 collaborators", "Basic AI extraction", "7-day replay"], cta: "Start free", featured: false },
              { name: "Pro", price: "$12", tag: "the sweet spot", features: ["Unlimited sessions", "20 collaborators", "Full AI + summaries", "Unlimited replay", "Node permissions"], cta: "Start Pro trial", featured: true },
              { name: "Team", price: "$29", tag: "for the org", features: ["Everything in Pro", "Unlimited seats", "SSO + audit log", "Workspace roles", "Priority support"], cta: "Talk to us", featured: false },
            ].map((p) => (
              <div key={p.name} className={`relative rounded-2xl border-2 p-6 bg-card ${p.featured ? "border-foreground shadow-[6px_6px_0_hsl(var(--foreground))]" : "border-foreground/15"}`}>
                {p.featured && <span className="absolute -top-3 left-6 stamp text-coral text-xs bg-card">most picked</span>}
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{p.tag}</div>
                <h3 className="text-2xl font-bold mt-1">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-bold tracking-tight">{p.price}</span>
                  <span className="text-muted-foreground">/seat/mo</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2"><span className="text-primary mt-1">✓</span> {f}</li>
                  ))}
                </ul>
                <Button
                  variant={p.featured ? "paper" : "outline"}
                  className="w-full mt-6"
                  onClick={openSignup}
                >
                  {p.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="community" className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-blueprint-grid opacity-50" />
        <StarBurst className="absolute top-12 left-12 w-16 text-coral opacity-50" />
        <StarBurst className="absolute bottom-16 right-16 w-12 text-primary opacity-40" />
        <div className="container relative text-center max-w-3xl">
          <div className="zine-label mb-4">§ end ─ go make something</div>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Your next session <br/>
            <span className="font-hand text-primary text-6xl md:text-8xl">should ship.</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">Open a canvas, invite the team, walk out with a task board. That's the loop.</p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Button variant="paper" size="xl" onClick={openSignup}>
              Start free workspace <ArrowRight className="h-4 w-4"/>
            </Button>
            <Button variant="ghost" size="xl">Book a demo</Button>
          </div>
          <p className="font-hand text-xl text-muted-foreground mt-6">no credit card · no onboarding call · just a canvas</p>
        </div>
      </section>

      <Footer />

      <AuthModal open={authOpen} defaultMode={authMode} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
