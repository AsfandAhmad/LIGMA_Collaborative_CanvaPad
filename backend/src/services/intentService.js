// classifyNodeIntent(text) → calls Claude API
//   Prompt: "Classify this text as one of: action_item, decision, question, reference.
//            Return JSON: { intent, confidence }"
//   If intent === "action_item": call eventService.insertEvent("TASK_CREATED", ...)
//   Debounce: only call AI after user stops typing for 1500ms
//   Returns: { intent: "action_item" | "decision" | "question" | "reference" }

const Anthropic = require('@anthropic-ai/sdk');
const eventService = require('./eventService');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Debounce map: nodeId -> timeout
const debounceTimers = new Map();
const DEBOUNCE_DELAY = 1500;

/**
 * Classify node text intent using Claude API with debouncing
 * @param {string} text - The node text to classify
 * @param {string} nodeId - The node ID
 * @param {string} roomId - The room ID
 * @param {string} userId - The user ID who created/updated the node
 * @returns {Promise<{intent: string, confidence: number}>}
 */
async function classifyNodeIntent(text, nodeId, roomId, userId) {
  return new Promise((resolve, reject) => {
    // Clear existing timer for this node
    if (debounceTimers.has(nodeId)) {
      clearTimeout(debounceTimers.get(nodeId));
    }

    // Set new debounce timer
    const timer = setTimeout(async () => {
      try {
        const result = await performClassification(text, nodeId, roomId, userId);
        debounceTimers.delete(nodeId);
        resolve(result);
      } catch (error) {
        debounceTimers.delete(nodeId);
        reject(error);
      }
    }, DEBOUNCE_DELAY);

    debounceTimers.set(nodeId, timer);
  });
}

/**
 * Perform the actual classification using Claude API
 */
async function performClassification(text, nodeId, roomId, userId) {
  if (!text || text.trim().length === 0) {
    return { intent: 'reference', confidence: 1.0 };
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Classify the following text into one of these categories: action_item, decision, question, reference.

Rules:
- action_item: Tasks, todos, things that need to be done
- decision: Conclusions, agreements, resolved choices
- question: Queries, uncertainties, things needing answers
- reference: Information, notes, documentation, links

Return ONLY valid JSON in this exact format:
{"intent": "category", "confidence": 0.95}

Text to classify: "${text}"`,
        },
      ],
    });

    // Parse Claude's response
    const responseText = message.content[0].text.trim();
    const result = JSON.parse(responseText);

    // Validate response
    const validIntents = ['action_item', 'decision', 'question', 'reference'];
    if (!validIntents.includes(result.intent)) {
      result.intent = 'reference';
      result.confidence = 0.5;
    }

    // If classified as action_item, create a task
    if (result.intent === 'action_item' && result.confidence > 0.7) {
      await eventService.insertEvent('TASK_CREATED', {
        nodeId,
        text,
        status: 'todo',
      }, userId, roomId);
    }

    return result;
  } catch (error) {
    console.error('Intent classification error:', error);
    // Fallback to reference on error
    return { intent: 'reference', confidence: 0.0 };
  }
}

/**
 * Cancel pending classification for a node
 */
function cancelClassification(nodeId) {
  if (debounceTimers.has(nodeId)) {
    clearTimeout(debounceTimers.get(nodeId));
    debounceTimers.delete(nodeId);
  }
}

module.exports = {
  classifyNodeIntent,
  cancelClassification,
};
