# LIGMA Backend

Express + WebSocket server with event sourcing, RBAC, and Groq AI.

## Setup

```bash
npm install
npx prisma migrate dev --schema=src/db/schema.prisma --name init
npm start
```

Requires `backend/.env` — see root README for variables.

## Structure

```
src/
  app.js          Express app + routes
  index.js        HTTP server + WebSocket upgrade router
  routes/
    auth.js       POST /api/auth/register|login
    canvas.js     GET|POST /api/canvas/:roomId
    nodes.js      PATCH|DELETE /api/nodes/:nodeId
    tasks.js      GET|PATCH /api/tasks
    rooms.js      GET|POST /api/rooms
  ws/
    wsServer.js   /ws  — presence, cursors, events (JSON)
    yjsServer.js  /yjs — Yjs CRDT sync (binary)
    wsHandler.js  NODE_CREATE|UPDATE|DELETE|MOVE handlers
    presence.js   In-memory cursor map
  services/
    canvasService.js   Replay events → canvas state
    eventService.js    Append-only event log
    intentService.js   Groq AI classification (debounced)
    rbacService.js     Node ACL checks
  middleware/
    auth.js       JWT verify → req.user
    rbac.js       requireRole() / checkNodePermission()
  db/
    schema.prisma  User · Room · Event · NodeAcl · Task
    prisma.js      PrismaClient singleton
  utils/
    crdt.js        decodeYjsUpdate, safeApplyUpdate
    errors.js      AppError, AuthenticationError, etc.
    validation.js  isValidWSMessage, isValidYjsMessage
    wsUtils.js     parseWsQuery, broadcastToRoom*, safeClose
```

## Event Types

All mutations are stored as immutable events (never UPDATE/DELETE):

`NODE_CREATED` · `NODE_UPDATED` · `NODE_DELETED` · `NODE_MOVED` · `LOCK_NODE` · `RESET` · `TASK_CREATED` · `CRDT_NODE_*` · `RBAC_VIOLATION`

## AI Intent Classification

When a node's text changes, `intentService` debounces 1.5 s then calls Groq (Llama 3.3 70B). If classified as `action_item` with >70% confidence, a `Task` record is created automatically.

If `GROQ_API_KEY` is missing or invalid, classification returns `reference` silently — the app keeps working.

## Tests

```bash
npm test                    # Jest — all __tests__ files
node src/ws/__tests__/yjsServer.test.js    # JWT auth scenarios
node src/ws/__tests__/wsServer.cursor.test.js  # cursor integration
```

Tests mock `groq-sdk` and `@prisma/client` via `jest.setup.js` — no real DB or API key needed.

## Scripts

| Script | What it does |
|---|---|
| `npm start` | `node src/index.js` |
| `npm run dev` | `nodemon src/index.js` |
| `npm test` | Jest test suite |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Run migrations |
| `npm run prisma:studio` | Open Prisma Studio at :5555 |
