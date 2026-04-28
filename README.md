# LIGMA Collaborative CanvaPad

Real-time collaborative canvas with AI-powered features, event sourcing, and role-based access control.

## 🚀 Quick Start

### Backend Setup (2 minutes)

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

**Note:** Database connection might fail initially if Supabase is paused. See [Database Setup](#database-setup) below.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Backend Setup](#backend-setup)
- [Database Setup](#database-setup)
- [API Endpoints](#api-endpoints)
- [WebSocket](#websocket)
- [AI Features](#ai-features)
- [RBAC System](#rbac-system)
- [Architecture](#architecture)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### Authentication & Authorization
- 🔐 JWT authentication with 7-day expiry
- 👥 Three role levels: Lead, Contributor, Viewer
- 🛡️ Node-level access control (ACL)
- 🔒 Password hashing with bcrypt

### Real-time Collaboration
- ⚡ WebSocket for presence & events
- 🔄 Yjs CRDT for conflict-free synchronization
- 👆 Real-time cursor tracking
- 📡 User join/leave notifications

### Event Sourcing
- 📜 Immutable event log
- ⏮️ State reconstruction by replay
- 📊 Complete audit trail
- 🕐 Time-travel debugging support

### AI Features (Groq - Llama 3.3 70B)
- 🤖 Intent classification (500+ tokens/sec)
  - Classifies as: action_item, decision, question, reference
  - Auto-creates tasks for action items
  - Debounced (1500ms)
- 📝 Canvas summary export
  - Generates markdown summaries
  - Groups related content
  - Includes metadata

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js + Express
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **WebSocket:** ws + Yjs
- **Authentication:** JWT + bcrypt
- **AI:** Groq (Llama 3.3 70B)

### Frontend
- **Framework:** Next.js 15
- **Language:** TypeScript
- **CRDT:** Yjs
- **Real-time:** WebSocket

---

## 🔧 Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create `backend/.env`:

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/postgres

# Authentication
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# AI (Groq)
GROQ_API_KEY=your_groq_api_key_here

# Server
PORT=4000
NODE_ENV=development
```

**Get Groq API Key:**
1. Visit: https://console.groq.com
2. Sign up or login
3. Go to API Keys section
4. Create new key
5. Copy and paste in `.env`

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

### 4. Setup Database

See [Database Setup](#database-setup) section below.

### 5. Start Server

```bash
npm run dev
```

You should see:
```
✅ Raw WebSocket server initialized on /ws
✅ Yjs WebSocket server initialized on /yjs
🚀 Server running on port 4000
```

---

## 💾 Database Setup

### Option 1: Supabase (Recommended for Production)

**If database is paused:**

1. Go to: https://supabase.com/dashboard
2. Login to your account
3. Find your project
4. Click "Resume" if paused
5. Wait 30 seconds

**Push schema:**

```bash
cd backend
npx prisma db push --schema=src/db/schema.prisma
```

### Option 2: Local PostgreSQL (Development)

**Install PostgreSQL:**

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
```

**Create database:**

```bash
sudo -u postgres psql
CREATE DATABASE ligma;
CREATE USER ligma_user WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE ligma TO ligma_user;
\q
```

**Update `.env`:**

```env
DATABASE_URL=postgresql://ligma_user:password123@localhost:5432/ligma
```

**Push schema:**

```bash
npx prisma db push --schema=src/db/schema.prisma
```

### Verify Database

```bash
# Open Prisma Studio
npm run prisma:studio

# Opens browser at http://localhost:5555
```

---

## 📡 API Endpoints

### Authentication

**Register:**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "Lead"  # Lead, Contributor, or Viewer
}
```

**Login:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Canvas

**Get Canvas State:**
```bash
GET /api/canvas/:roomId
Authorization: Bearer <JWT_TOKEN>
```

**Reset Canvas (Lead only):**
```bash
POST /api/canvas/:roomId/reset
Authorization: Bearer <JWT_TOKEN>
```

**Export AI Summary:**
```bash
GET /api/canvas/:roomId/export
Authorization: Bearer <JWT_TOKEN>
```

### Nodes

**Get Node:**
```bash
GET /api/nodes/:nodeId
Authorization: Bearer <JWT_TOKEN>
```

**Lock Node (Lead only):**
```bash
PATCH /api/nodes/:nodeId/lock
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "locked": true,
  "roomId": "room123"
}
```

**Set Node ACL (Lead only):**
```bash
PATCH /api/nodes/:nodeId/acl
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "allowedRoles": ["Lead", "Contributor"],
  "roomId": "room123"
}
```

**Delete Node:**
```bash
DELETE /api/nodes/:nodeId
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "roomId": "room123"
}
```

### Tasks

**Get Tasks:**
```bash
GET /api/tasks/:roomId
Authorization: Bearer <JWT_TOKEN>
```

**Update Task Status:**
```bash
PATCH /api/tasks/:taskId/status
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "status": "done"  # todo or done
}
```

---

## 🔌 WebSocket

### Raw WebSocket (Presence & Events)

**Connect:**
```javascript
const ws = new WebSocket('ws://localhost:4000/ws?token=JWT_TOKEN&roomId=room123');

ws.onopen = () => {
  console.log('Connected!');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

**Send Messages:**
```javascript
// Create node
ws.send(JSON.stringify({
  type: 'NODE_CREATE',
  payload: {
    nodeId: 'node123',
    text: 'Hello World',
    x: 100,
    y: 200
  }
}));

// Update node
ws.send(JSON.stringify({
  type: 'NODE_UPDATE',
  nodeId: 'node123',
  payload: {
    text: 'Updated text'
  }
}));

// Move cursor
ws.send(JSON.stringify({
  type: 'CURSOR_MOVE',
  payload: { x: 150, y: 250 }
}));
```

### Yjs WebSocket (CRDT Sync)

```javascript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const ydoc = new Y.Doc();
const wsProvider = new WebsocketProvider(
  'ws://localhost:4000/yjs',
  'room123',
  ydoc,
  { params: { token: 'JWT_TOKEN' } }
);

const ymap = ydoc.getMap('nodes');
ymap.set('node1', { text: 'Hello', x: 0, y: 0 });
```

---

## 🤖 AI Features

### 1. Intent Classification (Automatic)

**How it works:**
1. User creates/updates node with text
2. System waits 1500ms (debounce)
3. Calls Groq AI (Llama 3.3 70B)
4. Classifies as: action_item, decision, question, reference
5. If action_item with >70% confidence → auto-creates task

**Example:**
```
User types: "Need to fix the login bug"
→ Groq classifies: { intent: "action_item", confidence: 0.95 }
→ System auto-creates task
```

### 2. Canvas Summary Export

**Endpoint:** `GET /api/canvas/:roomId/export`

**How it works:**
1. Replays all events to get current state
2. Extracts node content
3. Sends to Groq AI
4. Returns markdown summary

**Output:**
```markdown
# Canvas Summary: Project Planning

**Generated:** 2024-01-15T10:30:00Z
**Total Nodes:** 15
**AI Model:** Llama 3.3 70B (Groq)

---

## Key Decisions
- Decided to use PostgreSQL for database
- Chose Next.js for frontend framework

## Action Items
- [ ] Fix login bug
- [ ] Implement user authentication
- [ ] Add real-time cursor tracking

## Questions
- Should we use TypeScript or JavaScript?
- What hosting provider to use?
```

### Groq AI Details

- **Model:** Llama 3.3 70B Versatile
- **Speed:** 500+ tokens/second
- **Free Tier:** 30 requests/minute
- **Cost:** $0.59 per million tokens
- **Reliability:** 99.9% uptime

---

## 🛡️ RBAC System

### Roles

| Role | Permissions |
|------|-------------|
| **Lead** | Full access: create, update, delete, lock nodes, set ACLs, reset canvas |
| **Contributor** | Create, update, delete nodes (if allowed by ACL) |
| **Viewer** | Read-only access |

### Node-Level ACL

Each node can have specific allowed roles:

```javascript
// Set node ACL (Lead only)
PATCH /api/nodes/:nodeId/acl
{
  "allowedRoles": ["Lead", "Contributor"],
  "roomId": "room123"
}
```

### RBAC Flow

```
1. User sends request with JWT token
2. Server verifies token → extracts user role
3. For node operations:
   a. Check user role (Viewer → reject)
   b. Check node ACL (if exists)
   c. Allow or deny operation
4. Log RBAC violations
```

---

## 🏗️ Architecture

### System Overview

```
Frontend (Next.js)
       ↓
Backend (Node.js + Express)
       ↓
┌──────┴──────┐
│             │
REST API    WebSocket
│             │
├─ Auth      ├─ Raw WS (/ws)
├─ Canvas    │  ├─ Presence
├─ Nodes     │  ├─ Cursors
└─ Tasks     │  └─ Events
             │
             └─ Yjs WS (/yjs)
                └─ CRDT Sync
       ↓
┌──────┴──────┐
│             │
PostgreSQL   Groq AI
(Supabase)   (Llama 3.3)
```

### Event Sourcing

**Traditional Approach:**
```
nodes table → Direct updates (UPDATE, DELETE)
❌ Lost history
❌ No audit trail
```

**Our Approach:**
```
events table → Append-only (INSERT only)
✅ Full history
✅ Complete audit trail
✅ Can replay to any point
✅ Time-travel debugging
```

**Event Types:**
- `NODE_CREATED`
- `NODE_UPDATED`
- `NODE_DELETED`
- `NODE_MOVED`
- `LOCK_NODE`
- `RESET`
- `TASK_CREATED`
- `CRDT_NODE_CREATED`
- `CRDT_NODE_UPDATED`
- `CRDT_NODE_DELETED`
- `CRDT_NODE_MOVED`

### Database Schema

```
User
├─ id (uuid)
├─ name
├─ email (unique)
├─ passwordHash
├─ role (Lead/Contributor/Viewer)
└─ createdAt

Room
├─ id (uuid)
├─ name
├─ createdBy (FK → User)
└─ createdAt

Event (Immutable)
├─ id (autoincrement)
├─ type
├─ payload (JSON)
├─ userId (FK → User)
├─ roomId (FK → Room)
└─ timestamp

NodeAcl
├─ id (uuid)
├─ nodeId (unique)
├─ roomId (FK → Room)
├─ allowedRoles (array)
└─ createdAt

Task
├─ id (uuid)
├─ text
├─ authorId (FK → User)
├─ nodeId
├─ roomId (FK → Room)
├─ status (todo/done)
└─ createdAt
```

---

## 🔐 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# AI
GROQ_API_KEY=your_groq_api_key_here

# Server
PORT=4000
NODE_ENV=development
```

**Important:**
- Never commit `.env` to git (already in `.gitignore`)
- Use strong `JWT_SECRET` in production
- Get Groq API key from: https://console.groq.com

---

## 🧪 Testing

### Test Health Check

```bash
curl http://localhost:4000/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### Test Registration

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@test.com",
    "password": "password123",
    "role": "Lead"
  }'
```

### Test AI Summary

```bash
# Get JWT token from login first
curl http://localhost:4000/api/canvas/room123/export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'groq-sdk'"

```bash
cd backend
npm install
```

### Error: "Prisma Client not initialized"

```bash
npm run prisma:generate
```

### Error: "Can't reach database server"

**Supabase paused:**
1. Go to https://supabase.com/dashboard
2. Find your project
3. Click "Resume"
4. Wait 30 seconds
5. Run: `npx prisma db push --schema=src/db/schema.prisma`

**Local PostgreSQL:**
```bash
sudo service postgresql start
```

### Error: "GROQ_API_KEY is not defined"

1. Get key from https://console.groq.com/keys
2. Add to `backend/.env`
3. Restart server

### Error: "Rate limit exceeded"

- Free tier: 30 requests/minute
- Wait 1 minute or upgrade plan
- Check: https://console.groq.com/settings/limits

---

## 📚 Resources

- **Groq Console:** https://console.groq.com
- **Groq Documentation:** https://console.groq.com/docs
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Prisma Documentation:** https://www.prisma.io/docs
- **Yjs Documentation:** https://docs.yjs.dev

---

## 🚀 Production Deployment

### Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Use production database
- [ ] Enable HTTPS/WSS
- [ ] Configure CORS properly
- [ ] Add rate limiting
- [ ] Set up monitoring (Sentry)
- [ ] Configure backup strategy
- [ ] Load test WebSocket connections
- [ ] Set up CI/CD pipeline

---

## 📄 License

MIT

---

## 🎉 You're Ready!

Your backend is fully integrated with Groq AI. Just run:

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

**Start building with super-fast AI! ⚡🚀**
