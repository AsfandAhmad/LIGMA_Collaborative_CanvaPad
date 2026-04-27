# LIGMA Collaborative CanvaPad

Real-time collaborative canvas with AI-powered features, event sourcing, and role-based access control.

## Recent Updates

### Backend Implementation ✅
- **JWT Authentication** - Secure auth with Lead/Contributor/Viewer roles
- **RBAC Middleware** - Node-level access control with ACL support
- **AI Classification** - Claude API integration (debounced 1500ms) for node intent detection
- **AI Summary Export** - Generate markdown summaries of canvas content
- **Event Sourcing** - Immutable event log for state reconstruction
- **WebSocket Server** - Real-time collaboration with presence tracking

## Quick Start

### Backend Setup
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

See [backend/README.md](backend/README.md) for detailed documentation.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Tech Stack

**Backend:**
- Node.js + Express
- PostgreSQL + Prisma
- WebSocket (ws)
- JWT + bcrypt
- Claude API (Anthropic)

**Frontend:**
- Next.js 15
- TypeScript
- Yjs (CRDT)
- WebSocket

## Features

- 🔐 Role-based permissions (Lead/Contributor/Viewer)
- 🤖 AI-powered node classification
- 📝 Auto task creation from action items
- 📊 AI canvas summary export
- 🔄 Real-time collaboration
- 📜 Event sourcing architecture
- 🎯 Node-level access control

## License

MIT
