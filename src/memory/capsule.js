// src/memory/capsule.js
const crypto = require('crypto');

class MemoryCapsule {
  constructor(data = {}) {
    this.id = data.id || crypto.randomUUID();
    this.timestamp = data.timestamp || new Date().toISOString();
    this.type = data.type || 'conversation'; // conversation, summary, note
    this.sessionId = data.sessionId;
    this.messages = data.messages || [];
    this.summary = data.summary || '';
    this.tags = data.tags || [];
    this.importance = data.importance || 0.5;
    this.metadata = data.metadata || {};
    this.tokenCount = data.tokenCount || 0;
  }

  // Create capsule from a conversation turn
  static fromConversation(userInput, aiResponse, metadata = {}) {
    return new MemoryCapsule({
      type: 'conversation',
      sessionId: metadata.sessionId,
      messages: [
        { role: 'user', content: userInput, timestamp: Date.now() },
        { role: 'assistant', content: aiResponse, timestamp: Date.now() }
      ],
      tags: metadata.topic ? [metadata.topic] : [],
      importance: metadata.importance || 0.5,
      metadata: {
        model: metadata.model,
        topic: metadata.topic
      },
      tokenCount: estimateTokens(userInput + aiResponse)
    });
  }

  // Create capsule from summarizing other capsules
static fromSummary(capsules, summaryText) {
  const safeCapsules = Array.isArray(capsules)
    ? capsules.filter(c => c && typeof c === 'object' && 'id' in c)
    : [];

  const sourceIds = safeCapsules.map(c => c.id);
  const totalTokens = safeCapsules.reduce((sum, c) => {
    const t = typeof c.tokenCount === 'number' ? c.tokenCount : 0;
    return sum + t;
  }, 0);

  const summaryTokens = estimateTokens(summaryText);

  return new MemoryCapsule({
    type: 'summary',
    summary: summaryText,
    metadata: {
      sourceCapsules: sourceIds,
      originalTokenCount: totalTokens,
      compressionRatio: totalTokens > 0 ? summaryTokens / totalTokens : 1.0
    },
    importance: 0.8, // Summaries are important
    tokenCount: summaryTokens
  });
}


  // Converts capsule to plain JSON object
  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      type: this.type,
      sessionId: this.sessionId,
      messages: this.messages,
      summary: this.summary,
      tags: this.tags,
      importance: this.importance,
      metadata: this.metadata,
      tokenCount: this.tokenCount
    };
  }

  // Create capsule from JSON data
  static fromJSON(data) {
    return new MemoryCapsule(data);
  }

  toMarkdown() {
    let md = `# Memory Capsule: ${this.id}\n\n`;
    md += `- **Type**: ${this.type}\n`;
    md += `- **Time**: ${this.timestamp}\n`;
    md += `- **Session**: ${this.sessionId || 'none'}\n`;
    md += `- **Importance**: ${this.importance}\n\n`;

    if (this.messages.length > 0) {
      md += `## Conversation\n\n`;
      this.messages.forEach(msg => {
        md += `**${msg.role}**: ${msg.content}\n\n`;
      });
    }

    if (this.summary) {
      md += `## Summary\n\n${this.summary}\n\n`;
    }

    if (this.tags.length > 0) {
      md += `## Tags\n\n${this.tags.map(t => `#${t}`).join(' ')}\n\n`;
    }

    return md;
  }

  getTokenCount() {
    return this.tokenCount;
  }
}

// Estimate token count (approx. 4 characters per token)
function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

module.exports = { MemoryCapsule };
