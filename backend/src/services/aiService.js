// AI Service - Groq-powered intent classification
// Classifies node text into: Action, Decision, Question, Reference

const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Classify node text intent using Groq AI (Llama 3.3 70B)
 * @param {string} text - The text to classify
 * @returns {Promise<string>} - One of: "Action", "Decision", "Question", "Reference"
 */
async function classifyNodeIntent(text) {
  if (!text || text.trim().length === 0) {
    return 'Reference';
  }

  try {
    const prompt = `Classify the following text as exactly one of these categories: Action, Decision, Question, Reference. Reply with only the single word, nothing else.

Text: ${text}`;

    // Call Groq API with Llama 3.3 70B
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile', // Fast and powerful
      temperature: 0.3, // Lower temperature for consistent classification
      max_tokens: 10, // We only need one word
    });

    // Parse response
    const responseText = chatCompletion.choices[0]?.message?.content || 'Reference';
    const intent = responseText.trim();
    
    // Validate and capitalize
    const validIntents = ['Action', 'Decision', 'Question', 'Reference'];
    const normalized = intent.charAt(0).toUpperCase() + intent.slice(1).toLowerCase();
    
    if (validIntents.includes(normalized)) {
      return normalized;
    }
    
    // Fallback
    return 'Reference';
  } catch (error) {
    console.error('[aiService] Intent classification error:', error.message);
    // Fallback to Reference on error
    return 'Reference';
  }
}

module.exports = {
  classifyNodeIntent,
};
