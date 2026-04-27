# Ligma Backend

Collaborative canvas backend with event sourcing, RBAC, and AI-powered features.

## Features

✅ **JWT Authentication** - Secure token-based auth with role support (Lead/Contributor/Viewer)  
✅ **RBAC Middleware** - Role-based access control at route and node level  
✅ **AI Classification** - Claude API integration for node intent classification (debounced)  
✅ **AI Summary Export** - Generate markdown summaries of canvas content  
✅ **Event Sourcing** - Immutable event log for canvas state reconstruction  
✅ **WebSocket Real-time** - Live collaboration with presence and cursor tracking  

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/ligma
JWT_SECRET=your_secret_key_here
PUTER_API_KEY=your_puter_api_key_here
PORT=4000
NODE_ENV=development
```

**Get Puter API Key:**
1. Visit [puter.com](https://puter.com)
2. Sign up/login
3. Get your API key from dashboard
4. Grok AI is integrated via Puter.js (x-ai/grok-beta)

### 3. Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Optional: Open Prisma Studio
npm run prisma:studio
```

### 4. Start Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Canvas

- `GET /api/canvas/:roomId` - Get full canvas state (event replay)
- `POST /api/canvas/:roomId/reset` - Reset canvas (Lead only)
- `GET /api/canvas/:roomId/export` - Export AI summary as markdown

### Nodes

- `GET /api/nodes/:nodeId` - Get node with ACL
- `PATCH /api/nodes/:nodeId/lock` - Lock/unlock node (Lead only)
- `PATCH /api/nodes/:nodeId/acl` - Set node ACL (Lead only)
- `DELETE /api/nodes/:nodeId` - Soft delete node

### Tasks

- `GET /api/tasks/:roomId` - Get all tasks for room
- `PATCH /api/tasks/:taskId/status` - Update task status

## WebSocket

Connect to `ws://localhost:4000/ws?token=JWT_TOKEN&roomId=ROOM_ID`

### Message Types

**Client → Server:**
- `NODE_CREATE` - Create new node
- `NODE_UPDATE` - Update node (triggers AI classification)
- `NODE_DELETE` - Delete node
- `NODE_MOVE` - Move node position
- `CURSOR_MOVE` - Update cursor position

**Server → Client:**
- `NODE_CREATED` - Node created event
- `NODE_UPDATED` - Node updated event
- `NODE_DELETED` - Node deleted event
- `NODE_MOVED` - Node moved event
- `CURSOR_MOVE` - Cursor position update
- `USER_JOINED` - User joined room
- `USER_LEFT` - User left room
- `SYNC` - Missed events sync
- `ERROR` - Error message

## Roles & Permissions

### Lead
- Full access to all operations
- Can lock/unlock nodes
- Can set node ACLs
- Can reset canvas

### Contributor
- Can create, update, move nodes
- Can delete nodes (if allowed by ACL)
- Cannot lock nodes or modify ACLs

### Viewer
- Read-only access
- Cannot create, update, or delete nodes
- Can view canvas and tasks

## AI Features

### Intent Classification
- Automatically classifies node text as: `action_item`, `decision`, `question`, or `reference`
- Powered by **Grok AI** via Puter.js API
- Debounced (1500ms) to avoid excessive API calls
- Auto-creates tasks for action items with >70% confidence

### Canvas Summary Export
- Uses **Grok AI** (x-ai/grok-beta) via Puter.js to generate coherent markdown summary
- Groups related content and identifies key items
- Includes metadata (room name, node count, timestamp)

## Architecture

### Event Sourcing
All canvas mutations are stored as immutable events. State is reconstructed by replaying events in order.

### RBAC Enforcement
- JWT middleware verifies user identity
- Role middleware checks user role
- Node-level ACL checks in WebSocket handler
- Viewers blocked at service layer

### Debounced AI
Intent classification uses a debounce map to batch API calls, reducing costs and latency.

## Development

```bash
# Watch mode
npm run dev

# View database
npm run prisma:studio

# Create migration
npx prisma migrate dev --name migration_name
```

## License

MIT
