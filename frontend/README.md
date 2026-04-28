# LIGMA Frontend

Next.js 16 (App Router) · TypeScript · Tailwind · Yjs · Shadcn UI

## Setup

```bash
npm install
npm run dev   # → http://localhost:3000
```

Requires `frontend/.env.local` — see root README for variables.

## Structure

```
app/                    Pages (App Router)
  layout.tsx            Root layout + providers
  page.tsx              Landing
  auth/                 Login / register
  dashboard/            Home dashboard
  editor/               Collaborative canvas editor
  lobby/                Session list
  projects|recent|...   Other views

components/
  ligma/                App-specific components
    AppSidebar.tsx      Navigation sidebar
    WorkspaceTopbar.tsx Top bar with search + notifications
    SessionGrid.tsx     Session cards grid
  ui/                   Shadcn/Radix primitives (50+ components)
  NavLink.tsx           Next.js Link with active-state support
  providers.tsx         QueryClient + AuthProvider + Toaster

lib/
  api.ts                REST API client (auth, canvas, tasks, rooms)
  auth-context.tsx      useAuth() — JWT storage + login/logout
  demoStore.ts          Local demo state (sessions, notifications)
  yjs/
    yjsProvider.ts      WebSocket ↔ Y.Doc sync (binary protocol)
    syncManager.ts      Y.Map CRUD wrapper for canvas nodes
    awareness.ts        Cursor presence tracker
  hooks/
    useCanvas.ts        Canvas nodes via Yjs
    usePresence.ts      Live cursors via /ws WebSocket
    useTasks.ts         Tasks via REST API
    use-toast.ts        Toast notification system
    use-mobile.tsx      Responsive breakpoint hook
```

## Key Patterns

**Auth** — `useAuth()` from `lib/auth-context.tsx`. JWT stored in `localStorage`. All API calls inject `Authorization: Bearer <token>` automatically via `fetchWithAuth`.

**Real-time canvas** — `useCanvas({ roomId })` connects to `/yjs` WebSocket, syncs a `Y.Map<nodes>` via Yjs CRDT. Changes propagate to all clients conflict-free.

**Cursors** — `usePresence({ roomId })` connects to `/ws` WebSocket, sends `CURSOR_MOVE` messages and receives broadcasts from other users.

**Tasks** — `useTasks({ roomId })` fetches from `GET /api/tasks/:roomId`. AI-classified `action_item` nodes auto-create tasks on the backend.

**Demo mode** — `demoStore.ts` provides localStorage-backed state for pages that don't yet call the backend (dashboard, lobby, etc.). The editor uses real backend data.

## Design System

Blueprint Retro Zine theme — custom Tailwind tokens:

- Colors: `coral`, `indigo`, `success`, `warning`, `primary`
- Sticky note colors: `sticky-yellow`, `sticky-pink`, `sticky-mint`, `sticky-sky`
- Intent colors: `intent-action`, `intent-decision`, `intent-question`, `intent-reference`
- Fonts: `font-hand` (handwritten), `font-mono` (monospace labels)
- Utilities: `zine-label`, `shadow-sticky`, `bg-blueprint-grid`

## Recent Fixes

- ✅ All TypeScript build errors resolved
- ✅ Suspense boundaries added for useSearchParams
- ✅ Real-time hooks fully implemented (useCanvas, usePresence, useTasks)
- ✅ Yjs CRDT sync with WebSocket ready
- ✅ Complete API client with auth, canvas, tasks, rooms endpoints

## Troubleshooting

| Problem | Fix |
|---|---|
| Module not found errors | Run `npm install` |
| EBUSY: resource busy | Stop dev server (`Ctrl+C`), delete `.next` folder, restart |
| Hydration errors | Check for client-only code in server components |
| Port 3000 in use | Use `npm run dev -- -p 3001` |
| Build fails | Clear cache: `rm -rf .next` then `npm run dev` |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server at :3000 |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Notes

- Next.js 16 has breaking changes from earlier versions — check official docs for migration
- All interactive components use "use client" directive
- Fonts loaded via Next.js font optimization
- Ready for deployment to Vercel
