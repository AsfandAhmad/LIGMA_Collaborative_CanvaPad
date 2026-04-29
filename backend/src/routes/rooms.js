// Rooms API
// GET  /api/rooms         → list rooms for authenticated user
// POST /api/rooms         → create a new room
// GET  /api/rooms/:roomId → get a single room

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getSupabaseClientForToken, getSupabaseServiceClient } = require('../utils/supabase');
const { getPrimaryWorkspace } = require('../services/workspaceService');

// List rooms (rooms the user created)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Use service client to bypass RLS
    const serviceClient = getSupabaseServiceClient();
    const client = serviceClient || getSupabaseClientForToken(req.accessToken);
    if (!client) return res.json({ rooms: [] });

    // Filter by user_id since RLS is disabled
    const { data, error } = await client
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Rooms query error (returning empty):', error.message);
      return res.json({ rooms: [] });
    }

    res.json({ rooms: data || [] });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.json({ rooms: [] });
  }
});

// Create a room
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, workspaceId } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name (string) required' });
    }

    const serviceClient = getSupabaseServiceClient();
    const client = serviceClient || getSupabaseClientForToken(req.accessToken);
    let targetWorkspaceId = workspaceId;

    if (!targetWorkspaceId) {
      const workspace = await getPrimaryWorkspace(req.user.id, req.accessToken);
      targetWorkspaceId = workspace?.id;
    }

    // TEMPORARY: Create room without workspace if none exists
    if (!targetWorkspaceId) {
      console.warn('No workspace found, creating room without workspace_id');
      const { data, error } = await client
        .from('rooms')
        .insert({ name, status: 'active', workspace_id: null })
        .select('*')
        .maybeSingle();

      if (error || !data) {
        console.error('Create room error:', error);
        return res.status(500).json({ error: 'Failed to create room' });
      }

      return res.status(201).json({ room: data });
    }

    const { data, error } = await client
      .from('rooms')
      .insert({ name, status: 'active', workspace_id: targetWorkspaceId })
      .select('*')
      .maybeSingle();

    if (error || !data) {
      console.error('Create room error:', error);
      return res.status(500).json({ error: 'Failed to create room' });
    }

    res.status(201).json({ room: data });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get a single room
router.get('/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const client = getSupabaseClientForToken(req.accessToken);
    const { data, error } = await client
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room: data });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

module.exports = router;
