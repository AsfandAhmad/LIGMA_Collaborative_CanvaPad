"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/ligma/AppSidebar";
import { WorkspaceTopbar } from "@/components/ligma/WorkspaceTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDemo, demoActions } from "@/lib/demoStore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const tabs = ["Profile", "Workspace", "Notifications", "Billing", "Danger zone"] as const;
type Tab = typeof tabs[number];

export default function Settings() {
  const user = useDemo(s => s.user);
  const [tab, setTab] = useState<Tab>("Profile");
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifMentions, setNotifMentions] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);
  const router = useRouter();

  const save = () => {
    const initials = name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
    demoActions.updateProfile({ name, email, role, initials });
    toast({ title: "Profile saved", description: "Your demo profile was updated." });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <WorkspaceTopbar label="/settings" title="Settings" showSearch={false}/>
        <div className="px-8 py-8 grid lg:grid-cols-[200px_1fr] gap-8 max-w-5xl">
          <nav className="space-y-1">
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)} className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                tab === t ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:bg-muted"
              )}>{t}</button>
            ))}
          </nav>

          <section className="space-y-6">
            {tab === "Profile" && (
              <div className="rounded-2xl border-2 border-foreground/15 bg-card p-6 space-y-5">
                <div>
                  <div className="zine-label">§ profile</div>
                  <h2 className="text-xl font-bold">Your account</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-blueprint flex items-center justify-center font-bold text-primary-foreground text-xl">{user.initials}</div>
                  <Button variant="outline" onClick={() => toast({ title: "Avatar upload", description: "Connect Cloud to enable image uploads." })}>Change avatar</Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={e => setName(e.target.value)}/></div>
                  <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)}/></div>
                  <div className="space-y-1.5 sm:col-span-2"><Label>Role / title</Label><Input value={role} onChange={e => setRole(e.target.value)}/></div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setName(user.name); setEmail(user.email); setRole(user.role); }}>Reset</Button>
                  <Button variant="paper" onClick={save}>Save changes</Button>
                </div>
              </div>
            )}

            {tab === "Workspace" && (
              <div className="rounded-2xl border-2 border-foreground/15 bg-card p-6 space-y-4">
                <div>
                  <div className="zine-label">§ workspace</div>
                  <h2 className="text-xl font-bold">Orbital Studio</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Workspace name</Label><Input defaultValue="Orbital Studio"/></div>
                  <div className="space-y-1.5"><Label>Subdomain</Label><Input defaultValue="orbital"/></div>
                </div>
                <div className="flex justify-end"><Button variant="paper" onClick={() => toast({ title: "Workspace saved" })}>Save</Button></div>
              </div>
            )}

            {tab === "Notifications" && (
              <div className="rounded-2xl border-2 border-foreground/15 bg-card p-6 space-y-4">
                <div>
                  <div className="zine-label">§ notifications</div>
                  <h2 className="text-xl font-bold">What pings you</h2>
                </div>
                <Toggle label="Email digests" desc="Daily summary of activity in your sessions" checked={notifEmail} onChange={setNotifEmail}/>
                <Toggle label="Mentions" desc="When teammates @ you in notes or comments" checked={notifMentions} onChange={setNotifMentions}/>
                <Toggle label="Weekly recap" desc="Friday recap with extracted tasks & decisions" checked={notifWeekly} onChange={setNotifWeekly}/>
                <div className="flex justify-end"><Button variant="paper" onClick={() => toast({ title: "Preferences saved" })}>Save preferences</Button></div>
              </div>
            )}

            {tab === "Billing" && (
              <div className="rounded-2xl border-2 border-foreground bg-warning p-6 space-y-3">
                <div className="zine-label">§ billing</div>
                <h2 className="text-xl font-bold">You're on the Free plan</h2>
                <p className="text-sm">Upgrade to Pro for unlimited sessions, replays, and node permissions.</p>
                <Button variant="ink" onClick={() => toast({ title: "Upgrade", description: "Hook up payments to start billing in production." })}>Upgrade to Pro · $12/seat</Button>
              </div>
            )}

            {tab === "Danger zone" && (
              <div className="rounded-2xl border-2 border-coral/60 bg-coral/5 p-6 space-y-4">
                <div>
                  <div className="zine-label text-coral">§ danger</div>
                  <h2 className="text-xl font-bold">Reset & delete</h2>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">Reset demo data</div>
                    <p className="text-sm text-muted-foreground">Restores sessions, notifications, and folders to defaults.</p>
                  </div>
                  <Button variant="outline" onClick={() => { demoActions.reset(); toast({ title: "Demo reset" }); }}>Reset</Button>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">Delete account</div>
                    <p className="text-sm text-muted-foreground">Signs you out of the demo.</p>
                  </div>
                  <Button variant="outline" onClick={() => { demoActions.logout(); router.push("/auth"); toast({ title: "Account deleted" }); }}>Delete</Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
      <div>
        <div className="font-medium text-sm">{label}</div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}


