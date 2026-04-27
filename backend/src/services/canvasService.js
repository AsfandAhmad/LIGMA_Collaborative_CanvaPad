// getCanvasState(roomId)
//   → replay all events for room → reconstruct current state
//   → return: { nodes: [], version: latestEventId }
// 
// This is how canvas state is rebuilt — from events, not a state table
// Called when a new user joins a room

const prisma = require('../db/prisma');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Get canvas state by replaying all events
 * @param {string} roomId - Room ID
 * @returns {Promise<{nodes: Array, version: number}>}
 */
async function getCanvasState(roomId) {
  // Fetch all events for the room in chronological order
  const events = await prisma.event.findMany({
    where: { roomId },
    orderBy: { timestamp: 'asc' },
  });

  // Reconstruct state by replaying events
  const nodes = new Map();
  let latestEventId = 0;

  for (const event of events) {
    latestEventId = event.id;
    const { type, payload } = event;

    switch (type) {
      case 'NODE_CREATED':
        nodes.set(payload.nodeId, {
          id: payload.nodeId,
          ...payload,
          deleted: false,
        });
        break;

      case 'NODE_UPDATED':
        if (nodes.has(payload.nodeId)) {
          const node = nodes.get(payload.nodeId);
          nodes.set(payload.nodeId, { ...node, ...payload });
        }
        break;

      case 'NODE_DELETED':
        if (nodes.has(payload.nodeId)) {
          const node = nodes.get(payload.nodeId);
          nodes.set(payload.nodeId, { ...node, deleted: true });
        }
        break;

      case 'NODE_MOVED':
        if (nodes.has(payload.nodeId)) {
          const node = nodes.get(payload.nodeId);
          nodes.set(payload.nodeId, {
            ...node,
            x: payload.x,
            y: payload.y,
          });
        }
        break;

      case 'LOCK_NODE':
        if (nodes.has(payload.nodeId)) {
          const node = nodes.get(payload.nodeId);
          nodes.set(payload.nodeId, {
            ...node,
            locked: payload.locked,
            lockedBy: payload.lockedBy,
          });
        }
        break;

      case 'RESET':
        nodes.clear();
        break;
    }
  }

  // Filter out deleted nodes and convert to array
  const activeNodes = Array.from(nodes.values()).filter(node => !node.deleted);

  return {
    nodes: activeNodes,
    version: latestEventId,
  };
}

/**
 * Export canvas summary using Claude API
 * Summarizes all canvas nodes into a coherent document
 * @param {string} roomId - Room ID
 * @returns {Promise<string>} Markdown summary
 */
async function exportCanvasSummary(roomId) {
  // Get current canvas state
  const { nodes } = await getCanvasState(roomId);

  if (nodes.length === 0) {
    return '# Canvas Summary\n\nNo content available.';
  }

  // Prepare node content for summarization
  const nodeContents = nodes.map((node, index) => {
    return `Node ${index + 1} (${node.type || 'unknown'}): ${node.text || node.content || 'No content'}`;
  }).join('\n\n');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are summarizing a collaborative canvas workspace. Below are all the nodes from the canvas. Create a well-structured markdown summary that:

1. Groups related content together
2. Identifies key decisions, action items, and questions
3. Provides a coherent narrative of the canvas content
4. Uses proper markdown formatting with headers and lists

Canvas Nodes:
${nodeContents}

Generate a comprehensive summary in markdown format:`,
        },
      ],
    });

    const summary = message.content[0].text;

    // Add metadata header
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { name: true, createdAt: true },
    });

    const header = `# Canvas Summary: ${room?.name || 'Untitled'}\n\n**Generated:** ${new Date().toISOString()}\n**Total Nodes:** ${nodes.length}\n\n---\n\n`;

    return header + summary;
  } catch (error) {
    console.error('Canvas summary export error:', error);
    
    // Fallback: simple list of nodes
    const fallbackSummary = `# Canvas Summary\n\n**Total Nodes:** ${nodes.length}\n\n## Content\n\n${nodeContents}`;
    return fallbackSummary;
  }
}

module.exports = {
  getCanvasState,
  exportCanvasSummary,
};
