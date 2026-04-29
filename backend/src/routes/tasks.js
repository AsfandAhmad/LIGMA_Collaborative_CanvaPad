// GET /api/tasks/:roomId  → return all tasks for a room
// Tasks are READ-ONLY here — they are created by intentService automatically
// PATCH /api/tasks/:taskId/status → update task status (todo/done)

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getSupabaseClientForToken } = require('../utils/supabase');

// Get all tasks for a room
// Allow unauthenticated access - return empty array if no auth
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    // Try to get auth token, but don't require it
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No auth - return empty tasks (guest users don't see tasks)
      return res.json({ tasks: [] });
    }

    const client = getSupabaseClientForToken(token);
    if (!client) {
      return res.json({ tasks: [] });
    }

    // Try with user join first, fall back to simple query if join fails
    let data, error;

    ({ data, error } = await client
      .from('tasks')
      .select(`
        id,
        room_id,
        source_node_id,
        assigned_to,
        created_by,
        title,
        status,
        priority,
        ai_intent,
        due_date,
        created_at,
        updated_at
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false }));

    if (error) {
      // Table may not exist yet — return empty gracefully
      console.warn('Tasks query error (returning empty):', error.message);
      return res.json({ tasks: [] });
    }

    const tasks = (data || []).map(task => ({
      id: task.id,
      roomId: task.room_id,
      nodeId: task.source_node_id,
      text: task.title,
      status: task.status,
      authorId: task.created_by,
      createdAt: task.created_at,
    }));

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    // Never 500 — return empty tasks so the UI still loads
    res.json({ tasks: [] });
  }
});

// Update task status
router.patch('/:taskId/status', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const validStatuses = ['todo', 'in_progress', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        valid: validStatuses,
      });
    }

    const client = getSupabaseClientForToken(req.accessToken);
    const { data, error } = await client
      .from('tasks')
      .update({ status })
      .eq('id', taskId)
      .select('*')
      .maybeSingle();

    if (error || !data) {
      return res.status(500).json({ error: 'Failed to update task status' });
    }

    res.json({ success: true, task: data });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

module.exports = router;
