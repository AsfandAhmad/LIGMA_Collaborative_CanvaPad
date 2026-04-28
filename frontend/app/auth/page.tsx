"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ligma/Logo";
import { ScribbleArrow, StarBurst } from "@/components/ligma/Doodles";
import { useAuth } from "@/lib/auth-context";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (error) {
      // Error is handled in auth context with toast
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (provider: "google" | "github") => {
    setIsLoading(true);
    try {
      // Demo login with preset credentials
      await login(`demo-${provider}@ligma.app`, 'demo123');
    } catch (error) {
      console.error('Demo login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-background">
      {/* Left visual */}
      <div className="hidden lg:flex lg:col-span-5 bg-paper bg-blueprint-grid relative overflow-hidden p-12 flex-col justify-between">
        <Logo />
        <div className="relative">
          <StarBurst className="absolute -top-8 -left-4 w-12 text-coral opacity-60"/>
          <h2 className="text-5xl font-bold leading-tight">
            Brainstorm together. <br/>
            <span className="font-hand text-primary text-6xl">Leave with action.</span>
          </h2>
          <ScribbleArrow className="w-32 mt-4 text-primary"/>
          <div className="mt-10 space-y-3 max-w-sm">
            {[
              { t: "Collaborate live", d: "cursors, presence, real flow" },
              { t: "Notes → tasks", d: "AI sorts, board syncs" },
              { t: "Lock decisions", d: "node-level permissions" },
              { t: "Replay sessions", d: "scrub the timeline" },
            ].map((b, i) => (
              <div key={i} className="rounded-lg border-2 border-foreground/15 bg-card p-3 hover:rotate-[-1deg] transition-transform">
                <div className="font-bold text-sm">{b.t}</div>
                <div className="text-xs text-muted-foreground font-mono">{b.d}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">issue 09 · spring 26</p>
      </div>

      {/* Right form */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden mb-4"><Logo /></div>
          <div>
            <div className="zine-label mb-2">§ welcome</div>
            <h1 className="text-3xl font-bold">
              {isLogin ? 'Sign in to your workspace' : 'Create your workspace'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {isLogin ? 'Welcome back! Enter your credentials.' : 'No credit card. No setup call. Just a canvas.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              className="h-11" 
              onClick={() => handleDemoLogin("google")}
              disabled={isLoading}
            >
              Continue with Google
            </Button>
            <Button 
              variant="outline" 
              className="h-11" 
              onClick={() => handleDemoLogin("github")}
              disabled={isLoading}
            >
              Continue with GitHub
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex-1 h-px bg-border"/>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">or email</span>
            <span className="flex-1 h-px bg-border"/>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            {!isLogin && (
              <Input 
                type="text" 
                placeholder="Your name" 
                className="h-11" 
                value={name} 
                onChange={e => setName(e.target.value)}
                required
              />
            )}
            <Input 
              type="email" 
              placeholder="you@studio.com" 
              className="h-11" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Input 
              type="password" 
              placeholder="••••••••" 
              className="h-11" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button 
              type="submit" 
              variant="paper" 
              className="w-full h-11"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : (isLogin ? 'Sign in →' : 'Create workspace →')}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-foreground underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          <p className="text-[10px] text-muted-foreground text-center font-mono uppercase tracking-wider">
            by continuing you agree to our terms · privacy
          </p>
        </div>
      </div>
    </div>
  );
}
