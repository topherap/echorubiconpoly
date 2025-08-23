/**
 * Route Patterns - Fixed export structure for brain routing
 * Emergency fix to resolve "Cannot read properties of undefined" error
 */

module.exports = {
  clerk: {
    direct: [
      { regex: /^list\s+(my\s+)?(clients?|recipes?|files?|documents?|notes?)/i, weight: 0.9 },
      { regex: /^show\s+(me\s+)?(all\s+)?(clients?|recipes?|files?)/i, weight: 0.8 },
      { regex: /^who\s+are\s+my\s+clients?/i, weight: 0.9 },
      { regex: /^what\s+are\s+my\s+(recipes?|files?|documents?)/i, weight: 0.9 }
    ],
    contextual: [
      { regex: /^\d+$/, weight: 0.95 }, // Pure number for selection
      { regex: /^select\s+\d+/i, weight: 0.8 },
      { regex: /^open\s+\d+/i, weight: 0.8 },
      { regex: /^number\s+\d+/i, weight: 0.8 }
    ],
    keywords: ['list', 'show', 'display', 'menu', 'options', 'select', 'choose', 'navigate']
  },
  
  reader: {
    direct: [
      { regex: /^summarize/i, weight: 0.95 },
      { regex: /^tell\s+me\s+about/i, weight: 0.8 },
      { regex: /^explain/i, weight: 0.7 },
      { regex: /^what\s+does\s+this\s+(say|mean)/i, weight: 0.8 }
    ],
    contextual: [],
    keywords: ['summarize', 'explain', 'describe', 'read', 'content', 'details']
  },
  
  analyst: {
    direct: [
      { regex: /\.(js|json|py|md|tsx|jsx|ts|java|cpp|c|h|hpp)(\s|$)/i, weight: 0.7 },
      { regex: /^debug/i, weight: 0.9 },
      { regex: /^fix\s+(this\s+)?(error|bug|issue)/i, weight: 0.9 },
      { regex: /\bcode\b/i, weight: 0.6 },
      { regex: /\bfunction\b/i, weight: 0.6 },
      { regex: /\berror\b/i, weight: 0.7 }
    ],
    contextual: [],
    keywords: ['error', 'bug', 'debug', 'fix', 'function', 'code', 'script']
  },
  
  conversationalist: {
    direct: [
      { regex: /^(hello|hi|hey)/i, weight: 0.8 },
      { regex: /^how\s+are\s+you/i, weight: 0.9 },
      { regex: /what\s+do\s+you\s+think/i, weight: 0.7 }
    ],
    contextual: [],
    keywords: ['hello', 'hi', 'chat', 'talk', 'conversation']
  }
};