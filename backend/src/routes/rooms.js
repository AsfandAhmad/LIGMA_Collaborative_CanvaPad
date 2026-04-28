// Rooms API
// GET  /api/rooms         → list rooms for authenticated user
// POST /api/rooms         → create a new room
// GET  /api/rooms/:roomId → get a single room

const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');
const { authenticateToken } = require('../middleware/auth');

// List rooms (rooms the user created)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { createdBy: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Create a room
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name (string) required' });
    }

    const room = await prisma.room.create({
      data: { name, createdBy: req.user.id },
    });

    res.status(201).json({ room });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get a single room
router.get('/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await prisma.room.findUnique({ where: { id: roomId } });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

module.exports = router;
