// Express app setup
// 1. cors(), express.json() middleware
// 2. Mount routes: /api/canvas, /api/tasks, /api/nodes, /api/auth
// 3. Mount auth middleware globally (verify JWT on protected routes)
// 4. Error handler at bottom

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const canvasRoutes = require('./routes/canvas');
const nodesRoutes = require('./routes/nodes');
const tasksRoutes = require('./routes/tasks');
const { AppError } = require('./utils/errors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/canvas', canvasRoutes);
app.use('/api/nodes', nodesRoutes);
app.use('/api/tasks', tasksRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  // Handle structured AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      timestamp: err.timestamp,
      ...(err.errors && { errors: err.errors }), // Include validation errors if present
      ...(err.context && { context: err.context }), // Include RBAC context if present
    });
  }

  // Handle unexpected errors
  console.error('Unexpected error:', err);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;
