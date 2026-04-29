import { useSyncExternalStore, useRef } from "react";

// ───────────────────────────────────────────────────────────
// Demo store: a tiny localStorage-backed reactive state layer
// so every "feature" in LIGMA can pretend to work end-to-end
// without a real backend.
// ───────────────────────────────────────────────────────────

export type SessionStatus = "live" | "idle" | "archived";
export type DemoSession = {
  id: string;
  name: string;
  folder: string;
  folderColor: string;
  thumb: string;
  live: number;
  time: string;
  pulse?: boolean;
  tasks: number;
  starred?: boolean;
  shared?: boolean;
  trashed?: boolean;
  status: SessionStatus;
  updatedAt: number;
};

export type DemoNotification = {
  id: string;
  who: string;
  whoColor: string;
  text: string;
  time: string;
  read: boolean;
};

export type DemoUser = {
  name: string;
  email: string;
  initials: string;
  role: string;
  loggedIn: boolean;
};

type State = {
  user: DemoUser;
  sessions: DemoSession[];
  notifications: DemoNotification[];
};

const STORAGE_KEY = "ligma-demo-state-v1";

const initialSessions: DemoSession[] = [
  { id: "s1", name: "Sprint 44 — kickoff", folder: "Sprint 44", folderColor: "bg-coral", thumb: "bg-sticky-yellow", live: 3, time: "live now", pulse: true, tasks: 14, starred: true, status: "live", updatedAt: Date.now() - 1000 * 60 * 2 },
  { id: "s2", name: "Q2 roadmap workshop", folder: "Q2 Planning", folderColor: "bg-warning", thumb: "bg-sticky-pink", live: 0, time: "edited 2h ago", tasks: 32, status: "idle", updatedAt: Date.now() - 1000 * 60 * 60 * 2 },
  { id: "s3", name: "Architecture review v3", folder: "Design Reviews", folderColor: "bg-success", thumb: "bg-sticky-mint", live: 2, time: "live now", pulse: true, tasks: 9, status: "live", shared: true, updatedAt: Date.now() - 1000 * 60 * 5 },
  { id: "s4", name: "Onboarding revamp", folder: "Onboarding", folderColor: "bg-indigo", thumb: "bg-sticky-sky", live: 0, time: "yesterday", tasks: 21, starred: true, shared: true, status: "idle", updatedAt: Date.now() - 1000 * 60 * 60 * 26 },
  { id: "s5", name: "Pricing page brainstorm", folder: "Q2 Planning", folderColor: "bg-warning", thumb: "bg-sticky-yellow", live: 0, time: "3 days ago", tasks: 7, status: "idle", updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 3 },
  { id: "s6", name: "Retro — March", folder: "Sprint 44", folderColor: "bg-coral", thumb: "bg-sticky-pink", live: 0, time: "1 week ago", tasks: 18, status: "idle", updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 7 },
  { id: "s7", name: "Old prototype scratch", folder: "Sprint 44", folderColor: "bg-coral", thumb: "bg-sticky-mint", live: 0, time: "deleted yesterday", tasks: 3, status: "archived", trashed: true, updatedAt: Date.now() - 1000 * 60 * 60 * 24 },
];

const initialNotifications: DemoNotification[] = [
  { id: "n1", who: "Jin", whoColor: "bg-indigo", text: "locked “LISTEN/NOTIFY” in Sprint 44", time: "2m", read: false },
  { id: "n2", who: "AI", whoColor: "bg-primary", text: "extracted 4 new tasks from Architecture review", time: "5m", read: false },
  { id: "n3", who: "Sam", whoColor: "bg-success", text: "mentioned you in Onboarding revamp", time: "12m", read: false },
  { id: "n4", who: "Lia", whoColor: "bg-warning", text: "shared Q2 roadmap workshop with you", time: "1h", read: true },
  { id: "n5", who: "Maya", whoColor: "bg-coral", text: "started Sprint 44 — kickoff", time: "25m", read: true },
];

const defaultState: State = {
  user: { name: "Maya Kane", email: "maya@orbital.studio", initials: "MK", role: "Facilitator · Orbital", loggedIn: false },
  sessions: initialSessions,
  notifications: initialNotifications,
};

let state: State = load();
const listeners = new Set<() => void>();

function load(): State {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function emit() {
  persist();
  listeners.forEach(l => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getState() { return state; }

export function useDemo<T>(selector: (s: State) => T): T {
  // Cache the last result so selectors that derive new arrays/objects (e.g. .filter)
  // don't break referential equality and trigger infinite re-renders.
  const ref = useRef<{ value: T; state: State } | null>(null);
  const get = () => {
    if (ref.current && ref.current.state === state) return ref.current.value;
    const value = selector(state);
    if (ref.current && shallowEqual(ref.current.value, value)) {
      ref.current = { value: ref.current.value, state };
      return ref.current.value;
    }
    ref.current = { value, state };
    return value;
  };
  return useSyncExternalStore(subscribe, get, get);
}

function shallowEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
    return true;
  }
  const ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (!Object.is(a[k], b[k])) return false;
  return true;
}

// ── actions ──
export const demoActions = {
  login(email: string) {
    const name = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Maya Kane";
    const initials = name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
    state = { ...state, user: { ...state.user, name, email, initials, loggedIn: true } };
    emit();
  },
  logout() {
    state = { ...state, user: { ...state.user, loggedIn: false } };
    emit();
  },
  ensureGuest() {
    if (!state.user.loggedIn) {
      state = { ...state, user: { ...state.user, loggedIn: true } };
      emit();
    }
  },
  updateProfile(patch: Partial<DemoUser>) {
    state = { ...state, user: { ...state.user, ...patch } };
    emit();
  },
  markAllRead() {
    state = { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
    emit();
  },
  markRead(id: string) {
    state = { ...state, notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n) };
    emit();
  },
  toggleStar(id: string) {
    state = { ...state, sessions: state.sessions.map(s => s.id === id ? { ...s, starred: !s.starred } : s) };
    emit();
  },
  trashSession(id: string) {
    state = { ...state, sessions: state.sessions.map(s => s.id === id ? { ...s, trashed: true, updatedAt: Date.now() } : s) };
    emit();
  },
  restoreSession(id: string) {
    state = { ...state, sessions: state.sessions.map(s => s.id === id ? { ...s, trashed: false, updatedAt: Date.now() } : s) };
    emit();
  },
  deleteSessionForever(id: string) {
    state = { ...state, sessions: state.sessions.filter(s => s.id !== id) };
    emit();
  },
  createSession(name: string, folder = "Sprint 44") {
    const colorMap: Record<string, string> = {
      "Sprint 44": "bg-coral", "Q2 Planning": "bg-warning",
      "Design Reviews": "bg-success", "Onboarding": "bg-indigo",
    };
    const thumbs = ["bg-sticky-yellow", "bg-sticky-pink", "bg-sticky-mint", "bg-sticky-sky"];
    const session: DemoSession = {
      id: "s" + Math.random().toString(36).slice(2, 8),
      name: name || "Untitled session",
      folder,
      folderColor: colorMap[folder] || "bg-coral",
      thumb: thumbs[Math.floor(Math.random() * thumbs.length)],
      live: 1, time: "just now", pulse: true, tasks: 0,
      status: "live", updatedAt: Date.now(),
    };
    state = { ...state, sessions: [session, ...state.sessions] };
    emit();
    return session;
  },
  touchSession(id: string) {
    state = { ...state, sessions: state.sessions.map(s => s.id === id ? { ...s, updatedAt: Date.now(), time: "just now" } : s) };
    emit();
  },
  reset() {
    state = defaultState;
    emit();
  },
};

export function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
