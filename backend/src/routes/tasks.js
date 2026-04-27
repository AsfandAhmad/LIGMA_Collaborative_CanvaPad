// GET /api/tasks/:roomId  → return all tasks for a room
// Tasks are READ-ONLY here — they are created by intentService automatically
// PATCH /api/tasks/:taskId/status → update task status (todo/done)

const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');
const { authenticateToken } = require('../middleware/auth');

// Get all tasks for a room
router.get('/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const tasks = await prisma.task.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Update task status
router.patch('/:taskId/status', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const validStatuses = ['todo', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        valid: validStatuses,
      });
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status },
    });

    res.json({ success: true, task });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

module.exports = router;
