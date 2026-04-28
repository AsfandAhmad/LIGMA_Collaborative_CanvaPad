# LIGMA — Collaborative CanvaPad

Real-time collaborative canvas with Yjs CRDT sync, AI intent classification, event sourcing, and RBAC.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind, Yjs |
| Backend | Node.js, Express, WebSocket, Prisma |
| Database | PostgreSQL via Supabase |
| AI | Groq — Llama 3.3 70B |

## Quick Start

```bash
# Backend
cd backend && npm install && npm run dev   # → http://localhost:4000

# Frontend (new terminal)
cd frontend && npm install && npm run dev  # → http://localhost:3000
```

## Environment Variables

**`backend/.env`**
```env
PORT=4000
DATABASE_URL=postgresql://...   # Supabase Session Pooler URL
JWT_SECRET=change-this-in-production
GROQ_API_KEY=your-groq-api-key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

> See `SUPABASE_SETUP.md` to connect the database.

## Architecture

```
Frontend (Next.js)
  useCanvas   ── binary WS ──▶  /yjs   (Yjs CRDT sync)
  usePresence ── JSON WS ────▶  /ws    (cursors / presence)
  REST calls  ── HTTP ────────▶  /api/*

Backend (Express + ws)
  RBAC checks before every mutation
  Event sourcing — append-only Event table
  Disk persistence — Y.Doc snapshots in backend/data/ydocs/
  AI intent classification via Groq (debounced 1.5s)
```

## Sharing a Canvas

1. Open `/editor` — a unique `roomId` is auto-generated
2. Click **Share** — copies the URL with the `roomId`
3. Anyone with the link joins the same live session

## RBAC

| Role | Permissions |
|---|---|
| Lead | Everything — lock nodes, set ACLs, reset canvas |
| Contributor | Create / update / delete nodes (subject to ACL) |
| Viewer | Read only |

## API Reference

### Auth
| Method | Path | Body |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password, role? }` |
| POST | `/api/auth/login` | `{ email, password }` |

### Canvas & WebSocket
| | Path | Notes |
|---|---|---|
| GET | `/api/canvas/:roomId` | Replay events → current state |
| POST | `/api/canvas/:roomId/reset` | Lead only |
| GET | `/api/canvas/:roomId/export` | AI markdown summary |
| WS | `/yjs?token=JWT&roomId=X` | Yjs CRDT binary sync |
| WS | `/ws?token=JWT&roomId=X` | Presence + cursors |

## Troubleshooting

| Problem | Fix |
|---|---|
| DB connection fails | See `SUPABASE_SETUP.md` — use Session Pooler URL |
| Prisma client missing | `cd backend && npm run prisma:generate` |
| Port in use | Kill process on 4000/3000 and restart |
| GROQ_API_KEY missing | AI falls back gracefully; get key at console.groq.com |
