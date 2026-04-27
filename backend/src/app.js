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
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

module.exports = app;
