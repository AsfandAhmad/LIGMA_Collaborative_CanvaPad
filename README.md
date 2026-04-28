# LIGMA — Collaborative CanvaPad

Real-time collaborative canvas with AI intent classification, event sourcing, and role-based access control.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind, Yjs |
| Backend | Node.js, Express, WebSocket, Prisma |
| Database | PostgreSQL (Docker) |
| AI | Groq — Llama 3.3 70B |

## Quick Start

```bash
# 1. Start database
docker-compose up -d postgres

# 2. Backend
cd backend
npm install
npx prisma migrate dev --schema=src/db/schema.prisma --name init
npm start          # → http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev        # → http://localhost:3000
```

## Environment Variables

**`backend/.env`**
```env
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ligma_db?schema=public"
JWT_SECRET="change-this-in-production-min-32-chars"
GROQ_API_KEY="your-groq-api-key"        # get from console.groq.com
CORS_ORIGIN="http://localhost:3000"
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

> ⚠️ Never commit `.env` or `.env.local` — both are in `.gitignore`.

## Architecture

```
Frontend (Next.js)
  useCanvas  ──── binary WS ──▶  /yjs   (Yjs CRDT sync)
  usePresence ─── JSON WS ───▶  /ws    (cursors / presence)
  useTasks ─────── HTTP ──────▶  /api/* (REST)
  AuthContext ──── HTTP ──────▶  /api/auth/*

Backend (Express + ws)
  RBAC checks before every mutation
  Event sourcing — append-only Event table
  AI intent classification via Groq (debounced 1.5s)

Database (PostgreSQL)
  User · Room · Event · NodeAcl · Task
```

## API Reference

### Auth
| Method | Path | Body |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password, role? }` |
| POST | `/api/auth/login` | `{ email, password }` |

### Canvas
| Method | Path | Auth |
|---|---|---|
| GET | `/api/canvas/:roomId` | ✅ |
| POST | `/api/canvas/:roomId/reset` | Lead only |
| GET | `/api/canvas/:roomId/export` | ✅ |

### Nodes
| Method | Path | Auth |
|---|---|---|
| GET | `/api/nodes/:nodeId` | ✅ |
| PATCH | `/api/nodes/:nodeId/lock` | Lead only |
| PATCH | `/api/nodes/:nodeId/acl` | Lead only |
| DELETE | `/api/nodes/:nodeId` | ✅ + ACL |

### Tasks & Rooms
| Method | Path | Auth |
|---|---|---|
| GET | `/api/tasks/:roomId` | ✅ |
| PATCH | `/api/tasks/:taskId/status` | ✅ |
| GET | `/api/rooms` | ✅ |
| POST | `/api/rooms` | ✅ |

### WebSocket
```
ws://localhost:4000/ws?token=JWT&roomId=ROOM    # presence + events
ws://localhost:4000/yjs?token=JWT&roomId=ROOM   # Yjs CRDT
```

## RBAC

| Role | Can do |
|---|---|
| Lead | Everything — lock nodes, set ACLs, reset canvas |
| Contributor | Create / update / delete nodes (subject to ACL) |
| Viewer | Read only |

## Recent Fixes (QA Review)

**Build Issues - All Fixed ✅**
- Fixed Next.js Link compatibility (href instead of to)
- Fixed taskStatus type to include all statuses (backlog, todo, in_progress, done)
- Fixed TypeScript type errors in API client and hooks
- Added Suspense boundaries for useSearchParams

**Integration Status**
- ✅ Frontend builds successfully
- ✅ All real-time hooks implemented (useCanvas, usePresence, useTasks)
- ✅ Yjs CRDT sync ready
- ✅ WebSocket presence tracking ready
- ✅ Complete API client implemented
- ⚠️ Needs GROQ_API_KEY in backend/.env
- ⚠️ Needs Prisma migration: `npx prisma migrate dev --schema=src/db/schema.prisma --name init`

## Troubleshooting

| Problem | Fix |
|---|---|
| DB connection fails | `docker-compose restart postgres` |
| Port 4000 in use | `netstat -ano \| findstr :4000` then kill PID |
| Prisma client missing | `npx prisma generate --schema=src/db/schema.prisma` |
| GROQ_API_KEY missing | AI falls back gracefully; get key at console.groq.com |
| Frontend CORS error | Verify `CORS_ORIGIN` in `backend/.env` matches frontend port |
