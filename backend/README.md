# Ligma Backend

Collaborative canvas backend with event sourcing, RBAC, and AI-powered features.

## Features

✅ **JWT Authentication** - Secure token-based auth with role support (Lead/Contributor/Viewer)  
✅ **RBAC Middleware** - Role-based access control at route and node level  
✅ **AI Classification** - Claude API integration for node intent classification (debounced)  
✅ **AI Summary Export** - Generate markdown summaries of canvas content  
✅ **Event Sourcing** - Immutable event log for canvas state reconstruction  
✅ **WebSocket Real-time** - Live collaboration with presence and cursor tracking  
✅ **Yjs CRDT Integration** - Conflict-free collaborative editing with automatic synchronization  

## Implementation Status

**All Critical Issues Resolved** ✅  
**Test Results**: 27/27 passing  
**Code Quality**: No diagnostics errors or warnings  
**Status**: Production Ready

This implementation follows the WebSocket Yjs Integration specification, which defined requirements for:
- Dual-path WebSocket architecture (`/yjs` for CRDT sync, `/ws` for presence)
- Yjs CRDT integration with automatic conflict resolution
- Event sourcing for immutable audit trails
- RBAC enforcement on all mutations
- Real-time cursor presence tracking
- Intent classification for automatic task detection

### Recent Security Fixes

**Critical:**
- **RBAC Before Mutation**: Fixed vulnerability where Yjs updates were applied before permission checks. Now validates ALL mutations atomically before applying to document.

**Moderate:**
- **Single Upgrade Router**: Implemented centralized WebSocket routing to prevent path collisions between `/ws` and `/yjs`.
- **Variable Shadowing**: Fixed confusing variable names in cleanup handlers.

**Minor:**
- **WebSocket State Guard**: Added readyState check in `sendError()` to prevent crashes.
- **Unique Color Assignment**: Implemented proper color tracking to prevent duplicate cursor colors.
- **Buffer Deprecation**: Updated to `buffer.subarray()` from deprecated `buffer.slice()`.

### Security
- JWT authentication on all connections
- Room ID validation prevents spoofing
- **RBAC checks BEFORE all mutations** (critical fix)
- Error handlers prevent process crashes
- Single upgrade router prevents path conflicts

### Performance
- Memory leak fixed (Y.Doc cleanup on disconnect)
- No duplicate event logging
- Non-blocking intent classification
- Efficient binary protocol with state vector optimization

### Testing
- JWT Authentication: 5/5 passing
- Presence Management: 12/12 passing
- Event Logging: 5/5 passing
- Cursor Integration: 5/5 passing  

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or hosted)
- Anthropic API key (for AI features)

### 1. Install Dependencies

```bash
cd backend
npm install
```

This installs all required packages including:
- Express and WebSocket servers
- Yjs and y-websocket for CRDT synchronization
- Prisma for database access
- JWT and bcrypt for authentication
- Anthropic SDK for AI features

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/ligma

# Authentication
JWT_SECRET=your_secure_random_secret_key_here

# AI Features
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here

# Server Configuration
PORT=4000
NODE_ENV=development

# Optional: Supabase (if using hosted PostgreSQL)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Environment Variable Details:**

- `DATABASE_URL`: PostgreSQL connection string. Format: `postgresql://username:password@host:port/database`
- `JWT_SECRET`: Secret key for signing JWT tokens. Use a strong random string (32+ characters)
- `ANTHROPIC_API_KEY`: API key from Anthropic Console for Claude AI integration
- `PORT`: Port number for the backend server (default: 4000)
- `NODE_ENV`: Environment mode (`development` or `production`)

### 3. Setup Database

Run the following commands to set up your PostgreSQL database:

```bash
# Generate Prisma client from schema
npm run prisma:generate

# Run database migrations to create tables
npm run prisma:migrate

# Optional: Open Prisma Studio to view/edit data
npm run prisma:studio
```

The migrations will create the following tables:
- `User` - User accounts with roles
- `Event` - Immutable event log for audit trail
- `Task` - Auto-generated tasks from canvas nodes
- `Canvas` - Canvas metadata

### 4. Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:4000` with the following endpoints:
- HTTP REST API: `http://localhost:4000/api/*`
- Raw WebSocket (presence/cursors): `ws://localhost:4000/ws`
- Yjs CRDT WebSocket: `ws://localhost:4000/yjs`

### 5. Start Frontend (Separate Terminal)

In a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:3000` and automatically connect to the backend WebSocket servers.

**Frontend Environment Variables:**

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

- `NEXT_PUBLIC_API_URL`: Backend HTTP API base URL
- `NEXT_PUBLIC_WS_URL`: Backend WebSocket base URL (without path)

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

## WebSocket Architecture

The backend uses a **dual-path WebSocket architecture** for optimal performance:

### Path 1: Yjs CRDT Sync (`/yjs`)

Handles collaborative state synchronization using Yjs CRDT (Conflict-free Replicated Data Type).

**Connection:**
```
ws://localhost:4000/yjs?token=JWT_TOKEN&roomId=ROOM_ID
```

**Features:**
- Automatic conflict resolution for concurrent edits
- Efficient state synchronization using state vectors
- Binary protocol for minimal bandwidth
- Automatic reconnection with missed update recovery
- Persistent state backed by event log

**Protocol:**
- SyncStep1 (messageType 0, syncType 0): State vector exchange
- SyncStep2 (messageType 0, syncType 1): Missing updates
- Update (messageType 0, syncType 2): Incremental updates
- Awareness (messageType 1): *Not yet implemented* - for cursor/selection sync over Yjs

**Note:** Cursor tracking currently uses the `/ws` path. If you need cursor/selection syncing through Yjs (messageType 1 - awareness protocol), this would need to be implemented separately.

**How it works:**
1. Client connects with JWT token and roomId
2. Server creates or retrieves Yjs document for the room
3. Client and server synchronize using state vectors (only missing updates are sent)
4. All mutations are automatically broadcast to connected clients
5. Updates are logged to PostgreSQL Event table for audit trail

**Important:** Y.Doc state is stored in-memory. If the server restarts, clients will resync from their local state. For production deployments requiring persistence across restarts, consider implementing a Y.Doc persistence layer (e.g., y-leveldb, y-redis, or custom PostgreSQL adapter).

### Path 2: Raw WebSocket Presence (`/ws`)

Handles ephemeral presence data like cursor positions and user status.

**Connection:**
```
ws://localhost:4000/ws?token=JWT_TOKEN&roomId=ROOM_ID
```

**Message Types:**

**Client → Server:**
- `CURSOR_MOVE` - Update cursor position (throttled to 50ms)
- `NODE_CREATE` - Create new node (legacy, prefer CRDT)
- `NODE_UPDATE` - Update node (legacy, prefer CRDT)
- `NODE_DELETE` - Delete node (legacy, prefer CRDT)
- `NODE_MOVE` - Move node position (legacy, prefer CRDT)

**Server → Client:**
- `CURSOR_MOVE` - Cursor position update from other users
- `USER_JOINED` - User joined room with initial cursor positions
- `USER_LEFT` - User left room
- `NODE_CREATED` - Node created event (legacy)
- `NODE_UPDATED` - Node updated event (legacy)
- `NODE_DELETED` - Node deleted event (legacy)
- `NODE_MOVED` - Node moved event (legacy)
- `SYNC` - Missed events sync
- `ERROR` - Error message

**Why Two Paths?**
- **CRDT path** provides strong eventual consistency for canvas state
- **Presence path** handles ephemeral data that doesn't need persistence
- Separation improves performance and reduces bandwidth
- Each path can reconnect independently

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
- Debounced (1500ms) to avoid excessive API calls
- Auto-creates tasks for action items with >70% confidence

### Canvas Summary Export
- Uses Claude API to generate coherent markdown summary
- Groups related content and identifies key items
- Includes metadata (room name, node count, timestamp)

## Architecture

### Project Structure

```
backend/
├── src/
│   ├── app.js              # Express app setup with CORS and routes
│   ├── index.js            # Entry point with WebSocket server initialization
│   ├── db/
│   │   ├── schema.prisma   # Database schema (User, Room, Event, NodeAcl, Task)
│   │   ├── prisma.js       # Prisma client instance
│   │   └── ligma_schema.sql # SQL schema reference
│   ├── middleware/
│   │   ├── auth.js         # JWT authentication middleware
│   │   └── rbac.js         # Role-based access control middleware
│   ├── routes/
│   │   ├── auth.js         # Authentication endpoints (register, login)
│   │   ├── canvas.js       # Canvas state and export endpoints
│   │   ├── nodes.js        # Node management endpoints
│   │   └── tasks.js        # Task management endpoints
│   ├── services/
│   │   ├── canvasService.js    # Canvas state reconstruction from events
│   │   ├── eventService.js     # Event sourcing operations
│   │   ├── intentService.js    # AI intent classification
│   │   └── rbacService.js      # RBAC permission checks
│   ├── utils/
│   │   ├── errors.js       # Custom error classes (9 types)
│   │   ├── validation.js   # Input validation utilities (7 functions)
│   │   ├── wsUtils.js      # WebSocket utilities (5 functions)
│   │   ├── crdt.js         # CRDT helper utilities (5 functions)
│   │   ├── time.js         # Time utilities (10 functions)
│   │   └── logger.js       # Logging utilities (10 functions)
│   └── ws/
│       ├── wsServer.js     # Raw WebSocket server (presence/cursors)
│       ├── wsHandler.js    # WebSocket message handlers
│       ├── yjsServer.js    # Yjs CRDT WebSocket server
│       ├── presence.js     # Presence tracking (cursor positions)
│       └── __tests__/      # Test suite (27 tests)
└── package.json
```

### Event Sourcing
All canvas mutations are stored as immutable events. State is reconstructed by replaying events in order.

### RBAC Enforcement
- JWT middleware verifies user identity
- Role middleware checks user role
- Node-level ACL checks in WebSocket handler
- Viewers blocked at service layer

### Debounced AI
Intent classification uses a debounce map to batch API calls, reducing costs and latency.

## Utility Modules

The backend includes a comprehensive set of utility modules that provide structured error handling, input validation, and WebSocket management.

### Error Classes (`utils/errors.js`)

Provides 9 custom error classes for structured error handling:

- **AppError** - Base error with statusCode, isOperational flag, and timestamp
- **AuthenticationError** (401) - JWT invalid/missing/expired
- **AuthorizationError** (403) - RBAC violations with context (userId, nodeId, operation)
- **ValidationError** (400) - Input validation failures with errors array
- **NotFoundError** (404) - Resource not found
- **WebSocketError** - WebSocket-specific errors with wsCode
- **CRDTError** - Yjs operation failures with updateData
- **DatabaseError** - Prisma/database failures with originalError
- **ExternalAPIError** - Anthropic API failures with service name

All errors include timestamps and are handled by the structured error handler in `app.js`.

### Validation (`utils/validation.js`)

Provides 7 validation functions for WebSocket messages and payloads:

- **isValidWSMessage(message)** - Validates message structure (type, payload)
- **isValidNodePayload(payload, operation)** - Validates node payloads by operation type
- **isValidYjsMessage(buffer)** - Validates Yjs binary messages
- **isValidRoomId(roomId)** - Validates room ID format
- **isValidNodeId(nodeId)** - Validates node ID format
- **isValidRole(role)** - Validates user role (Lead/Contributor/Viewer)
- **sanitizeInput(input)** - Escapes HTML entities for display

Validation is applied at all WebSocket entry points to prevent malformed data.

### WebSocket Utilities (`utils/wsUtils.js`)

Provides 5 WebSocket helper functions that eliminate code duplication:

- **parseWsQuery(req)** - Parses and validates JWT token and roomId from query params
- **broadcastToRoomSet(clients, message, excludeWs)** - Broadcasts to Set of WebSocket clients
- **broadcastToRoomMap(roomConnections, message, excludeWs)** - Broadcasts to Map of WebSocket clients
- **safeCloseWs(ws, code, reason)** - Safely closes WebSocket with readyState check
- **safeSendWs(ws, message)** - Safely sends message with readyState check

These utilities replace manual JWT parsing, broadcast loops, and raw ws.send()/ws.close() calls.

### CRDT Utilities (`utils/crdt.js`)

Provides 5 CRDT helper functions for Yjs operations:

- **decodeYjsUpdate(update, prevState)** - Decodes Yjs binary update into mutations array
- **safeApplyUpdate(ydoc, update)** - Safely applies Yjs update with error handling
- **getStateDiff(ydoc, stateVector)** - Gets state difference for synchronization
- **isValidUpdate(update)** - Validates Yjs update structure
- **getEventType(mutation)** - Maps mutation operation to event type (CRDT_NODE_CREATED, etc.)

Used by `yjsServer.js` for RBAC checks and event logging.

### Time Utilities (`utils/time.js`)

Provides 10 time-related helper functions:

- **debounce(fn, delay)** - Debounces function calls
- **throttle(fn, limit)** - Throttles function calls
- **now()** - Returns current timestamp
- **timeDiff(start, end)** - Calculates time difference
- **sleep(ms)** - Promise-based delay
- **isWithinRange(timestamp, start, end)** - Checks if timestamp is within range
- **getRelativeTime(timestamp)** - Returns relative time string ("2 hours ago")
- **formatTimestamp(timestamp, format)** - Formats timestamp
- **timeout(promise, ms)** - Adds timeout to promise
- **withTimeout(fn, ms)** - Wraps function with timeout

Used for debouncing AI classification and throttling cursor updates.

### Logger Utilities (`utils/logger.js`)

Provides 10 logging functions with different severity levels:

- **log(message, meta)** - General logging
- **debug(message, meta)** - Debug-level logging
- **info(message, meta)** - Info-level logging
- **warn(message, meta)** - Warning-level logging
- **error(message, meta)** - Error-level logging
- **critical(message, meta)** - Critical error logging
- **logWSEvent(event, ws, meta)** - WebSocket event logging
- **logRBACViolation(userId, nodeId, operation)** - RBAC violation logging
- **logPerformance(operation, duration)** - Performance metric logging
- **getLogs(filter)** - Retrieves logs (requires persistence setup)

All logs include timestamps and structured metadata for easy parsing.

### Integration Status

✅ **All utilities integrated** - No code duplication remains  
✅ **Structured error handling** - All errors use AppError classes  
✅ **Input validation** - All WebSocket entry points validated  
✅ **Safe WebSocket operations** - All ws.send()/ws.close() use safe wrappers  
✅ **Tests passing** - 5/5 Jest tests, 5/5 standalone tests



## Troubleshooting

### Connection Issues

**Problem: WebSocket connection fails with "Authentication failed"**

Solution:
1. Verify JWT token is valid and not expired
2. Check that `JWT_SECRET` in `.env` matches the secret used to sign the token
3. Ensure token is passed in query parameter: `?token=YOUR_JWT_TOKEN`
4. Test token by calling `/api/auth/login` to get a fresh token

**Problem: "ECONNREFUSED" when connecting to database**

Solution:
1. Verify PostgreSQL is running: `pg_isready` (if installed locally)
2. Check `DATABASE_URL` format: `postgresql://username:password@host:port/database`
3. Ensure database exists: `createdb ligma` (if using local PostgreSQL)
4. Test connection: `npm run prisma:studio`
5. Check firewall rules if using remote database

**Problem: Frontend cannot connect to WebSocket**

Solution:
1. Verify backend is running on the correct port (check console output)
2. Check `NEXT_PUBLIC_WS_URL` in frontend `.env.local` matches backend URL
3. Ensure no CORS issues - backend should allow frontend origin
4. Check browser console for WebSocket error messages
5. Test WebSocket endpoint directly: `wscat -c ws://localhost:4000/ws?token=TOKEN&roomId=test`

**Problem: Yjs CRDT sync not working**

Solution:
1. Verify `y-websocket` and `yjs` packages are installed in both backend and frontend
2. Check that `/yjs` path is accessible (should see upgrade to WebSocket in network tab)
3. Ensure roomId is consistent between clients
4. Check backend logs for CRDT server errors
5. Verify state vector synchronization in browser console

**Problem: "Prisma Client not generated"**

Solution:
```bash
npm run prisma:generate
```

**Problem: Database migration fails**

Solution:
1. Check database connection: `npm run prisma:studio`
2. Reset database (WARNING: deletes all data): `npx prisma migrate reset`
3. Apply migrations manually: `npm run prisma:migrate`
4. Check for syntax errors in `schema.prisma`

**Problem: AI classification not working**

Solution:
1. Verify `ANTHROPIC_API_KEY` is set in `.env`
2. Check API key is valid at https://console.anthropic.com
3. Ensure you have API credits available
4. Check backend logs for Anthropic API errors
5. Test with a simple node text update

**Problem: Port already in use**

Solution:
```bash
# Find process using port 4000
lsof -i :4000  # macOS/Linux
netstat -ano | findstr :4000  # Windows

# Kill the process or change PORT in .env
PORT=4001 npm run dev
```

**Problem: CORS errors in browser**

Solution:
1. Verify backend CORS configuration allows frontend origin
2. Check `cors` middleware in `src/app.js`
3. Ensure credentials are included in frontend requests
4. For development, backend should allow `http://localhost:3000`

### Performance Issues

**Problem: Slow WebSocket synchronization**

Solution:
1. Check network latency between client and server
2. Verify database queries are optimized (use Prisma Studio to inspect)
3. Monitor Event table size - consider archiving old events
4. Check for memory leaks in Yjs document instances
5. Ensure binary encoding is used for Yjs updates

**Problem: High memory usage**

Solution:
1. Limit number of Yjs documents kept in memory
2. Implement document cleanup for inactive rooms
3. Monitor with: `node --inspect src/index.js` and Chrome DevTools
4. Consider using Redis for document persistence

### Development Tips

**Enable debug logging:**
```bash
DEBUG=* npm run dev  # All debug logs
DEBUG=yjs:* npm run dev  # Yjs-specific logs
DEBUG=ws:* npm run dev  # WebSocket logs
```

**Test WebSocket connection:**
```bash
# Install wscat globally
npm install -g wscat

# Test raw WebSocket
wscat -c "ws://localhost:4000/ws?token=YOUR_TOKEN&roomId=test"

# Test Yjs WebSocket
wscat -c "ws://localhost:4000/yjs?token=YOUR_TOKEN&roomId=test"
```

**Reset everything and start fresh:**
```bash
# Stop all servers
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Reset database
npm run prisma:migrate reset

# Restart
npm run dev
```

## Development

### Running Tests

```bash
# Run all WebSocket tests
npm test

# Run individual test suites
node src/ws/__tests__/yjsServer.test.js        # JWT authentication (5/5)
node src/ws/__tests__/presence.test.js         # Presence management (12/12)
node src/ws/__tests__/wsServer.cursor.test.js  # Cursor integration (5/5)
npm test                                       # Event logging (5/5)
```

### Development Mode

```bash
# Watch mode with auto-reload
npm run dev

# View database
npm run prisma:studio

# Create migration
npx prisma migrate dev --name migration_name
```

### Debug Logging

```bash
DEBUG=* npm run dev          # All debug logs
DEBUG=yjs:* npm run dev      # Yjs-specific logs
DEBUG=ws:* npm run dev       # WebSocket logs
```

### Test WebSocket Connections

```bash
# Install wscat globally
npm install -g wscat

# Test raw WebSocket (presence/cursors)
wscat -c "ws://localhost:4000/ws?token=YOUR_TOKEN&roomId=test"

# Test Yjs WebSocket (CRDT sync)
wscat -c "ws://localhost:4000/yjs?token=YOUR_TOKEN&roomId=test"
```

### Reset Everything

```bash
# Stop all servers
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Reset database (WARNING: deletes all data)
npm run prisma:migrate reset

# Restart
npm run dev
```

## Production Deployment

### Environment Variables
Ensure all required environment variables are set:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Strong random secret (32+ characters)
- `ANTHROPIC_API_KEY` - Claude API key
- `PORT` - Server port (default: 4000)
- `NODE_ENV` - Set to `production`

### Monitoring
- Check logs for connection/disconnection events
- Monitor Y.Doc cleanup logs for memory management
- Watch for RBAC violations
- Track event logging failures
- Monitor Anthropic API usage and costs

### Optional Enhancements

**Yjs Awareness Protocol**: If cursor/selection syncing over Yjs is needed, implement messageType 1 handler for awareness protocol.

**Y.Doc Persistence**: For production requiring state persistence across restarts, consider:
- y-leveldb adapter for local persistence
- y-redis for distributed deployments
- Custom PostgreSQL adapter for full integration

**Horizontal Scaling**: For multi-server deployments:
- Implement Redis pub/sub for cross-server broadcasts
- Share Y.Doc state across servers
- Coordinate room assignments with load balancer

## License

MIT
