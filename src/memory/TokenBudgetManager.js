// src/memory/TokenBudgetManager.js
class TokenBudgetManager {
  constructor(maxTokens = 8000) {
    this.maxTokens = maxTokens;
    this.allocations = {
      identity: 500,      // AI identity/spine
      memories: 2500,     // Historical capsules
      vault: 2000,        // Vault context
      recent: 2000,       // Recent messages
      facts: 1000         // Q-Lib facts
    };
  }

  estimateTokens(text) {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  async allocateContext(components) {
    const allocated = {};
    let totalUsed = 0;

    // Process in priority order
    const priorities = ['identity', 'recent', 'memories', 'vault', 'facts'];
    
    for (const component of priorities) {
      if (components[component]) {
        const tokens = this.estimateTokens(JSON.stringify(components[component]));
        const budget = this.allocations[component];
        
        if (tokens <= budget) {
          allocated[component] = components[component];
          totalUsed += tokens;
        } else {
          // Trim to fit budget
          allocated[component] = await this.trimToFit(components[component], budget);
          totalUsed += budget;
        }
      }
    }

    return {
      context: allocated,
      tokensUsed: totalUsed,
      tokensRemaining: this.maxTokens - totalUsed
    };
  }

  async trimToFit(content, maxTokens) {
    // Simple trimming - in production, use smarter compression
    const text = JSON.stringify(content);
    const targetLength = maxTokens * 4; // Approximate
    
    if (text.length <= targetLength) {
      return content;
    }
    
    // Trim from the middle to preserve start and end
    const start = text.substring(0, targetLength / 2);
    const end = text.substring(text.length - targetLength / 2);
    
    return JSON.parse(start + '...[trimmed]...' + end);
  }

  adjustAllocations(usage) {
    // Dynamically adjust allocations based on usage patterns
    // TODO: Implement learning algorithm
  }
}

module.exports = TokenBudgetManager;