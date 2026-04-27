// GET  /api/canvas/:roomId        → fetch full canvas state (replay all events)
// POST /api/canvas/:roomId/reset  → admin only, soft-reset (inserts RESET event)
// GET  /api/canvas/:roomId/export → AI summary export of all canvas nodes
// All mutations happen via WebSocket, NOT here

const express = require('express');
const router = express.Router();
const canvasService = require('../services/canvasService');
const eventService = require('../services/eventService');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Get full canvas state
router.get('/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const state = await canvasService.getCanvasState(roomId);
    res.json(state);
  } catch (error) {
    console.error('Get canvas state error:', error);
    res.status(500).json({ error: 'Failed to fetch canvas state' });
  }
});

// Reset canvas (Lead only)
router.post('/:roomId/reset', authenticateToken, requireRole('Lead'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const event = await eventService.insertEvent(
      'RESET',
      { timestamp: new Date() },
      req.user.id,
      roomId
    );
    res.json({ success: true, event });
  } catch (error) {
    console.error('Canvas reset error:', error);
    res.status(500).json({ error: 'Failed to reset canvas' });
  }
});

// Export AI summary of canvas
router.get('/:roomId/export', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const summary = await canvasService.exportCanvasSummary(roomId);
    
    // Return as markdown with proper content type
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="canvas-summary-${roomId}.md"`);
    res.send(summary);
  } catch (error) {
    console.error('Canvas export error:', error);
    res.status(500).json({ error: 'Failed to export canvas summary' });
  }
});

module.exports = router;
