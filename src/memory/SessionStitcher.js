// src/memory/SessionStitcher.js
const crypto = require('crypto');

class SessionStitcher {
  constructor() {
    this.sessions = new Map();
    this.currentSessionId = null;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
  }

  startSession(userId) {
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      userId: userId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      messages: [],
      context: {},
      continuityMarkers: []
    };
    
    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;
    
    return sessionId;
  }

  getCurrentSession() {
    if (!this.currentSessionId) return null;
    
    const session = this.sessions.get(this.currentSessionId);
    if (!session) return null;
    
    // Check if session expired
    if (Date.now() - session.lastActivity > this.sessionTimeout) {
      this.endSession(this.currentSessionId);
      return null;
    }
    
    return session;
  }

  addMessage(message) {
    const session = this.getCurrentSession();
    if (!session) {
      throw new Error('No active session');
    }
    
    session.messages.push({
      ...message,
      timestamp: Date.now()
    });
    
    session.lastActivity = Date.now();
    
    // Extract continuity markers
    this.updateContinuityMarkers(session, message);
  }

  updateContinuityMarkers(session, message) {
    // Extract topics, entities, and emotional tone for continuity
    const markers = {
      topics: this.extractTopics(message.content),
      sentiment: this.analyzeSentiment(message.content),
      entities: this.extractEntities(message.content)
    };
    
    session.continuityMarkers.push({
      timestamp: Date.now(),
      markers: markers
    });
  }

  bridgeSessions(previousSessionId, currentSessionId) {
    const previous = this.sessions.get(previousSessionId);
    const current = this.sessions.get(currentSessionId);
    
    if (!previous || !current) return;
    
    // Transfer relevant context
    current.context.previousSession = {
      id: previousSessionId,
      endTime: previous.lastActivity,
      summary: this.summarizeSession(previous),
      continuityMarkers: previous.continuityMarkers.slice(-5) // Last 5 markers
    };
  }

  summarizeSession(session) {
    // Simple summary - in production, use AI
    return {
      messageCount: session.messages.length,
      duration: session.lastActivity - session.startTime,
      topics: this.extractUniqueTopics(session.messages)
    };
  }

  extractTopics(text) {
    // Simple keyword extraction - enhance with NLP
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(w => w.length > 5);
  }

  analyzeSentiment(text) {
    // Placeholder - integrate sentiment analysis
    return 'neutral';
  }

  extractEntities(text) {
    // Placeholder - integrate entity extraction
    return [];
  }

  extractUniqueTopics(messages) {
    const allTopics = messages.flatMap(m => this.extractTopics(m.content));
    return [...new Set(allTopics)];
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      
      // Archive session after ending
      // TODO: Save to disk
      
      this.sessions.delete(sessionId);
    }
    
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }
}

module.exports = SessionStitcher;