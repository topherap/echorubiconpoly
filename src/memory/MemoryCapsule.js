// src/memory/MemoryCapsule.js
class MemoryCapsule {
  constructor(data = {}) {
    this.id = data.id || crypto.randomUUID();
    this.timestamp = data.timestamp || new Date().toISOString();
    this.messages = data.messages || [];
    this.summary = data.summary || '';
    this.content = data.content || '';  // ADD THIS LINE
    this.tags = data.tags || [];
    this.entities = data.entities || {};
    this.tokenCount = data.tokenCount || 0;
    this.confidence = data.confidence || 0.5;
    this.metadata = data.metadata || {};  // ADD THIS LINE TOO
  }
static fromConversation(userInput, aiResponse, metadata = {}) {
  // Generate content from messages
  const messages = [
    { role: 'user', content: userInput },
    { role: 'assistant', content: aiResponse }
  ];
  
  // Create content string from messages
  const content = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
  
  // Create summary from first part of conversation
  const summary = aiResponse.substring(0, 200) + (aiResponse.length > 200 ? '...' : '');
  
  return new MemoryCapsule({
    id: `capsule_${Date.now()}`,
    timestamp: new Date().toISOString(),
    messages: messages,
    content: content,  // ADD THIS - populated from messages
    summary: summary,  // CHANGED FROM '' - now has actual summary
    tags: metadata.tags || [],
    entities: {},
    tokenCount: userInput.length + aiResponse.length,  // Better than 0
    confidence: 0.5,
    ...metadata
  });
}

  validate() {
    if (!this.messages || this.messages.length === 0) {
      throw new Error('Capsule must contain messages');
    }
    return true;
  }

    toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      messages: this.messages,
      summary: this.summary,
      content: this.content,  
      tags: this.tags,
      entities: this.entities,
      tokenCount: this.tokenCount,
      confidence: this.confidence,
      metadata: this.metadata  
    };
  }
}

module.exports = {
  MemoryCapsule
};
