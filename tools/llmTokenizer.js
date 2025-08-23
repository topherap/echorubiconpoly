// tools/llmTokenizer.js
const tiktoken = require('tiktoken');

class LLMTokenizer {
  constructor() {
    // Cache encoders to avoid re-initialization
    this.encoders = new Map();
  }

  getEncoder(model = 'gpt-4') {
    if (!this.encoders.has(model)) {
      // Claude uses similar tokenization to GPT-4
      const encoder = tiktoken.encoding_for_model(model);
      this.encoders.set(model, encoder);
    }
    return this.encoders.get(model);
  }

  count(text, model = 'gpt-4') {
    if (!text) return 0;
    
    try {
      const encoder = this.getEncoder(model);
      const tokens = encoder.encode(text);
      return tokens.length;
    } catch (error) {
      console.error('[Tokenizer] Error counting tokens:', error);
      // Fallback to estimation
      return this.estimate(text);
    }
  }

  // Fallback estimation when tiktoken fails
  estimate(text) {
    if (!text) return 0;
    
    // Better estimation based on OpenAI's rules
    const words = text.split(/\s+/).length;
    const chars = text.length;
    const punctuation = (text.match(/[.,!?;:'"]/g) || []).length;
    
    // Average: 1 token per 4 chars or 0.75 tokens per word
    const charEstimate = chars / 4;
    const wordEstimate = words * 0.75;
    
    // Use the higher estimate + punctuation penalty
    return Math.ceil(Math.max(charEstimate, wordEstimate) + (punctuation * 0.1));
  }

  // Count tokens for an entire conversation
  countConversation(messages) {
    // Each message has overhead: role tokens + message boundaries
    const messageOverhead = 4; // tokens for role and formatting
    
    return messages.reduce((total, msg) => {
      const content = msg.content || '';
      const contentTokens = this.count(content);
      return total + contentTokens + messageOverhead;
    }, 0);
  }

  // Check if content fits within budget
  fitsInBudget(text, budget = 8000) {
    return this.count(text) <= budget;
  }

  // Truncate text to fit token budget
  truncateToFit(text, maxTokens = 8000) {
    const tokens = this.count(text);
    if (tokens <= maxTokens) return text;
    
    // Binary search for the right truncation point
    let low = 0;
    let high = text.length;
    let bestFit = '';
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const truncated = text.slice(0, mid);
      const tokenCount = this.count(truncated);
      
      if (tokenCount <= maxTokens) {
        bestFit = truncated;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    return bestFit + '...';
  }

  // Clean up resources
  cleanup() {
    for (const encoder of this.encoders.values()) {
      encoder.free();
    }
    this.encoders.clear();
  }
}

// Export singleton instance
module.exports = new LLMTokenizer();