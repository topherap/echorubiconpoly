// tools/conversationThreader.js
const fs = require('fs/promises');
const path = require('path');
const { MemoryVaultManager } = require('../src/memory/MemoryVaultManager');

// Inherit base config and extend
const { CONFIG: BASE_CONFIG, similarity, estimateTokens } = require('./threaderEngine');

const CONVERSATION_CONFIG = {
  ...BASE_CONFIG,
  MAX_CONVERSATIONS_PER_PROJECT: 5,
  CONVERSATION_SUMMARY_TOKENS: 500,
  FULL_CONVERSATION_BUDGET: 3000,
  MIN_CONVERSATION_GAP_HOURS: 24,
  MESSAGE_OVERHEAD_TOKENS: 10,
  TOPIC_SIMILARITY_THRESHOLD: 0.6
};

class ConversationThreader {
  constructor(vaultPath) {
    this.vaultPath = vaultPath;
    this.vaultManager = new MemoryVaultManager(vaultPath);
    this.conversations = new Map();
  }

  async initialize() {
    await this.vaultManager.initialize();
  }

  /**
   * Calculate topic similarity between two sets of topics/tags
   */
  calculateTopicOverlap(topics1, topics2) {
    if (!topics1.size || !topics2.size) return 0;
    
    const intersection = new Set([...topics1].filter(x => topics2.has(x)));
    const union = new Set([...topics1, ...topics2]);
    
    return intersection.size / union.size;
  }

  /**
   * Extract key topics from content using simple keyword extraction
   */
  extractTopics(content) {
    const topics = new Set();
    
    // Extract capitalized phrases
    const capitalizedWords = content.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
    capitalizedWords.forEach(word => {
      if (word.length > 3) topics.add(word.toLowerCase());
    });
    
    // Extract words in quotes
    const quotedPhrases = content.match(/"([^"]+)"/g) || [];
    quotedPhrases.forEach(phrase => {
      topics.add(phrase.replace(/"/g, '').toLowerCase());
    });
    
    return topics;
  }

  /**
   * Group individual capsules into conversation threads
   * Primary: topic similarity, Secondary: time proximity
   */
  groupIntoConversations(capsules, project) {
    if (!capsules.length) return [];

    const sorted = [...capsules].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    const conversations = [];
    let currentConversation = null;

    for (const capsule of sorted) {
      const capsuleTime = new Date(capsule.timestamp);
      
      const capsuleTopics = new Set([
        ...(capsule.tags || []),
        ...this.extractTopics(capsule.content || capsule.summary || '')
      ]);
      
      let shouldStartNew = true;
      
      if (currentConversation) {
        const timeDiff = (capsuleTime - currentConversation.endTime) / 3600000;
        const topicSimilarity = this.calculateTopicOverlap(
          currentConversation.topics,
          capsuleTopics
        );
        
        // Primary: topic similarity, Secondary: time proximity
        shouldStartNew = topicSimilarity < CONVERSATION_CONFIG.TOPIC_SIMILARITY_THRESHOLD && 
                        timeDiff > CONVERSATION_CONFIG.MIN_CONVERSATION_GAP_HOURS;
      }
      
      if (!currentConversation || shouldStartNew) {
        currentConversation = {
          id: `conv-${project}-${capsuleTime.getTime()}`,
          project,
          startTime: capsuleTime,
          endTime: capsuleTime,
          messages: [],
          capsuleIds: [],
          summary: '',
          topics: new Set(),
          tokenCount: 0,
          keyPoints: []
        };
        conversations.push(currentConversation);
      }

      currentConversation.messages.push({
        role: capsule.role || 'user',
        content: capsule.content || capsule.summary,
        timestamp: capsule.timestamp,
        capsuleId: capsule.id
      });
      
      currentConversation.capsuleIds.push(capsule.id);
      currentConversation.endTime = capsuleTime;
      
      capsuleTopics.forEach(topic => currentConversation.topics.add(topic));
    }

    return conversations.map(conv => this.processConversation(conv));
  }

  /**
   * Identify key turning points in conversation
   */
  identifyKeyPoints(messages) {
    const keyPoints = [];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const content = msg.content.toLowerCase();
      
      if (content.includes('?') || content.startsWith('how') || 
          content.startsWith('what') || content.startsWith('why')) {
        keyPoints.push({ type: 'question', index: i, preview: content.substring(0, 50) });
      }
      
      if (content.includes('decided') || content.includes('conclusion') || 
          content.includes('solution') || content.includes('resolved')) {
        keyPoints.push({ type: 'decision', index: i, preview: content.substring(0, 50) });
      }
      
      if (i > 0 && Math.abs(msg.content.length - messages[i-1].content.length) > 200) {
        keyPoints.push({ type: 'shift', index: i, preview: content.substring(0, 50) });
      }
    }
    
    return keyPoints.slice(0, 3);
  }

  /**
   * Process a conversation: generate summary, count tokens
   */
  processConversation(conversation) {
    let fullTokens = 0;
    conversation.messages.forEach(msg => {
      fullTokens += estimateTokens({ summary: msg.content });
      fullTokens += CONVERSATION_CONFIG.MESSAGE_OVERHEAD_TOKENS;
    });
    
    conversation.tokenCount = fullTokens;
    conversation.keyPoints = this.identifyKeyPoints(conversation.messages);

    conversation.summary = this.generateRichSummary(
      conversation.messages,
      conversation.topics,
      conversation.keyPoints
    );
    conversation.summaryTokens = estimateTokens({ summary: conversation.summary });

    const duration = (conversation.endTime - conversation.startTime) / 60000;
    conversation.metadata = {
      messageCount: conversation.messages.length,
      duration: Math.round(duration),
      avgTokensPerMessage: Math.round(fullTokens / conversation.messages.length),
      topicCount: conversation.topics.size
    };

    return conversation;
  }

  /**
   * Generate intelligent summary from conversation
   */
  generateRichSummary(messages, topics, keyPoints) {
    const topicList = Array.from(topics).slice(0, 5).join(', ');
    
    let summary = '';
    
    if (topicList) {
      summary += `[${topicList}] `;
    }
    
    const firstMsg = messages[0]?.content || '';
    const opener = firstMsg.substring(0, 100).trim();
    summary += `Started: "${opener}..."`;
    
    if (messages.length > 3 && keyPoints.length > 0) {
      const keyPoint = keyPoints[0];
      const keyMsg = messages[keyPoint.index]?.content || '';
      const keyPreview = keyMsg.substring(0, 80).trim();
      
      if (keyPoint.type === 'question') {
        summary += ` → Key question: "${keyPreview}..."`;
      } else if (keyPoint.type === 'decision') {
        summary += ` → Resolved: "${keyPreview}..."`;
      } else if (keyPoint.type === 'shift') {
        summary += ` → Shifted to: "${keyPreview}..."`;
      }
    }
    
    const lastMsg = messages[messages.length - 1]?.content || '';
    const closer = lastMsg.substring(0, 100).trim();
    
    if (messages.length > 1 && closer !== opener) {
      summary += ` → Ended: "${closer}..."`;
    }
    
    return summary;
  }

  /**
   * Search conversations by temporal reference
   * @param {string} query - Natural language time reference
   * @param {string} project - Project context
   * @returns {Object} Matching conversations with context
   */
  async searchTemporalReference(query, project) {
    const targetDate = this.parseTemporalQuery(query);
    if (!targetDate) {
      return {
        found: false,
        message: `Could not parse temporal reference: "${query}"`,
        suggestion: 'Try: "yesterday", "last Thursday", "October 15", etc.'
      };
    }
    
    const capsules = await this.vaultManager.searchMemories('', {
      filter: { project },
      limit: 1000
    });
    
    const conversations = this.groupIntoConversations(capsules, project);
    
    // Find conversations within 24-hour window of target
    const matchingConvs = conversations.filter(conv => {
      const timeDiff = Math.abs(conv.startTime - targetDate);
      return timeDiff < 86400000; // 24 hours
    });
    
    if (matchingConvs.length === 0) {
      // Try broader search (within 3 days)
      const broaderMatch = conversations.filter(conv => {
        const timeDiff = Math.abs(conv.startTime - targetDate);
        return timeDiff < 259200000; // 72 hours
      });
      
      if (broaderMatch.length > 0) {
        return {
          found: true,
          partial: true,
          message: `No exact match for "${query}", showing nearby conversations`,
          context: await this.getProjectContext(project, {
            swapDate: targetDate.toISOString(),
            includeFullConversation: true
          })
        };
      }
      
      return {
        found: false,
        message: `No conversations found near "${query}" in project ${project}`,
        targetDate: targetDate.toISOString()
      };
    }
    
    // Return with temporal context
    const context = await this.getProjectContext(project, {
      swapDate: targetDate.toISOString(),
      includeFullConversation: true,
      temporalQuery: query
    });
    
    return {
      found: true,
      matchCount: matchingConvs.length,
      targetDate: targetDate.toISOString(),
      conversations: matchingConvs.map(c => ({
        id: c.id,
        time: c.startTime.toLocaleString(),
        summary: c.summary,
        exactMatch: Math.abs(c.startTime - targetDate) < 3600000 // Within 1 hour
      })),
      context
    };
  }

  /**
   * Parse natural language temporal queries
   */
  parseTemporalQuery(query) {
    const now = new Date();
    const lowerQuery = query.toLowerCase();
    
    // Relative day references
    if (lowerQuery.includes('yesterday')) {
      return new Date(now.getTime() - 86400000);
    }
    if (lowerQuery.includes('today')) {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return today;
    }
    if (lowerQuery.includes('tomorrow')) {
      return new Date(now.getTime() + 86400000);
    }
    
    // "Last X" patterns
    const lastPatterns = {
      'last week': 7,
      'last month': 30,
      'last year': 365
    };
    
    for (const [pattern, days] of Object.entries(lastPatterns)) {
      if (lowerQuery.includes(pattern)) {
        return new Date(now.getTime() - days * 86400000);
      }
    }
    
    // Weekday references
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < weekdays.length; i++) {
      if (lowerQuery.includes(weekdays[i])) {
        return this.getLastWeekday(i, lowerQuery.includes('last'));
      }
    }
    
    // "X days/weeks/months ago" patterns
    const agoMatch = query.match(/(\d+)\s+(days?|weeks?|months?)\s+ago/i);
    if (agoMatch) {
      const amount = parseInt(agoMatch[1]);
      const unit = agoMatch[2].toLowerCase();
      let ms = amount * 86400000; // Default to days
      
      if (unit.startsWith('week')) ms *= 7;
      if (unit.startsWith('month')) ms *= 30;
      
      return new Date(now.getTime() - ms);
    }
    
    // Month + day patterns (e.g., "October 15", "Oct 15")
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    const monthAbbrevs = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];
    
    for (let i = 0; i < monthNames.length; i++) {
      const monthPattern = new RegExp(`(${monthNames[i]}|${monthAbbrevs[i]})\\s+(\\d{1,2})`, 'i');
      const match = query.match(monthPattern);
      if (match) {
        const year = now.getFullYear();
        const date = new Date(year, i, parseInt(match[2]));
        
        // If date is in future, assume last year
        if (date > now) {
          date.setFullYear(year - 1);
        }
        return date;
      }
    }
    
    // ISO date format fallback
    const isoDate = new Date(query);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    
    return null;
  }

  /**
   * Get the last occurrence of a specific weekday
   */
  getLastWeekday(targetDay, forceLast = false) {
    const now = new Date();
    const currentDay = now.getDay();
    
    let daysAgo;
    if (forceLast || currentDay !== targetDay) {
      daysAgo = currentDay >= targetDay ? 
        currentDay - targetDay : 
        7 - (targetDay - currentDay);
      
      if (daysAgo === 0 && !forceLast) {
        daysAgo = 7; // If today is the target day and not forcing last, go back a week
      }
    } else {
      daysAgo = 0; // Today
    }
    
    const result = new Date(now.getTime() - daysAgo * 86400000);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get conversation context for a project with token awareness
   */
  async getProjectContext(project, options = {}) {
    const {
      limit = CONVERSATION_CONFIG.MAX_CONVERSATIONS_PER_PROJECT,
      swapDate = null,
      tokenBudget = CONVERSATION_CONFIG.MAX_TOKENS_PER_CONTEXT,
      includeFullConversation = true,
      currentQuery = '',
      temporalQuery = null
    } = options;

    const capsules = await this.vaultManager.searchMemories('', {
      filter: { project },
      limit: 1000
    });

    const conversations = this.groupIntoConversations(capsules, project);
    
    if (!conversations.length) {
      return {
        conversations: [],
        context: `No previous conversations found for project: ${project}`,
        tokenCount: 0
      };
    }

    conversations.sort((a, b) => b.endTime - a.endTime);

    let selected = conversations.slice(0, limit);
    
    // Swap logic for temporal queries
    if (swapDate) {
      const swapTime = new Date(swapDate).getTime();
      const swapConv = conversations.find(c => 
        Math.abs(c.startTime.getTime() - swapTime) < 86400000
      );
      
      if (swapConv && !selected.includes(swapConv)) {
        selected[selected.length - 1] = swapConv;
        
        // Mark as temporal result
        swapConv.isTemporalResult = true;
        swapConv.temporalQuery = temporalQuery;
      }
    }

    return this.buildContextString(selected, {
      tokenBudget,
      includeFullConversation,
      currentQuery,
      temporalQuery
    });
  }

  /**
   * Build context string with intelligent token management
   */
  async buildContextString(conversations, options) {
    const { tokenBudget, includeFullConversation, currentQuery, temporalQuery } = options;
    
    let contextParts = [];
    let totalTokens = 0;
    const reservedTokens = 2000;
    const availableTokens = tokenBudget - reservedTokens;

    // Header with temporal context if applicable
    if (temporalQuery) {
      contextParts.push(`## Temporal Search: "${temporalQuery}"\n`);
      totalTokens += 30;
    } else {
      contextParts.push("## Previous Conversations\n");
      totalTokens += 20;
    }

    // First pass: Add summaries
    for (const conv of conversations) {
      const timeStr = new Date(conv.startTime).toLocaleString();
      const marker = conv.isTemporalResult ? ' [TEMPORAL MATCH]' : '';
      const summaryStr = `### ${timeStr}${marker} (${conv.metadata.messageCount} messages, ${conv.metadata.duration}min)\n${conv.summary}\n`;
      const summaryTokens = estimateTokens({ summary: summaryStr });
      
      if (totalTokens + summaryTokens > availableTokens) break;
      
      contextParts.push(summaryStr);
      totalTokens += summaryTokens;
    }

    // Second pass: Full conversation for most recent or temporal match
    if (includeFullConversation && conversations.length > 0) {
      // Prioritize temporal match if exists
      const targetConv = conversations.find(c => c.isTemporalResult) || conversations[0];
      
      if (totalTokens + targetConv.tokenCount < availableTokens) {
        const header = targetConv.isTemporalResult ? 
          "\n## Temporal Match Full Conversation\n" : 
          "\n## Most Recent Full Conversation\n";
        
        contextParts.push(header);
        totalTokens += 30;
        
        let remainingTokens = availableTokens - totalTokens;
        let truncated = false;
        
        for (let i = 0; i < targetConv.messages.length; i++) {
          const msg = targetConv.messages[i];
          const msgStr = `**${msg.role}**: ${msg.content}\n`;
          const msgTokens = estimateTokens({ summary: msgStr });
          
          if (msgTokens > remainingTokens) {
            const remaining = targetConv.messages.length - i;
            const remainingTopics = new Set();
            
            for (let j = i; j < targetConv.messages.length; j++) {
              const topics = this.extractTopics(targetConv.messages[j].content);
              topics.forEach(t => remainingTopics.add(t));
            }
            
            const topicStr = Array.from(remainingTopics).slice(0, 3).join(', ');
            contextParts.push(`\n*[Conversation continued for ${remaining} more messages about: ${topicStr || 'various topics'}]*\n`);
            truncated = true;
            break;
          }
          
          contextParts.push(msgStr);
          totalTokens += msgTokens;
          remainingTokens -= msgTokens;
        }
      }
    }

    contextParts.push(`\n<!-- Token usage: ${totalTokens}/${tokenBudget} -->`);

    return {
      conversations: conversations.map(c => ({
        id: c.id,
        summary: c.summary,
        startTime: c.startTime,
        messageCount: c.metadata.messageCount,
        topicCount: c.metadata.topicCount,
        selected: true,
        isTemporalResult: c.isTemporalResult || false
      })),
      context: contextParts.join('\n'),
      tokenCount: totalTokens,
      stats: {
        totalConversations: conversations.length,
        includedSummaries: conversations.length,
        includedFullConversation: includeFullConversation && totalTokens < availableTokens,
        temporalSearch: !!temporalQuery
      }
    };
  }

  /**
   * Update sidebar with conversation list
   */
  async getConversationList(project, limit = 5) {
    const capsules = await this.vaultManager.searchMemories('', {
      filter: { project },
      limit: 200
    });

    const conversations = this.groupIntoConversations(capsules, project);
    
    return conversations
      .sort((a, b) => b.endTime - a.endTime)
      .slice(0, limit)
      .map(conv => ({
        id: conv.id,
        title: conv.summary.substring(0, 50) + '...',
        timestamp: conv.startTime,
        messageCount: conv.metadata.messageCount,
        duration: conv.metadata.duration,
        topics: Array.from(conv.topics).slice(0, 3)
      }));
  }
}

// Integration with chat handler
async function injectConversationContext(messages, project, options = {}) {
  const threader = new ConversationThreader(options.vaultPath);
  await threader.initialize();
  
  // Check if last message contains temporal reference
  const lastMessage = messages[messages.length - 1]?.content || '';
  const temporalKeywords = ['yesterday', 'last', 'ago', 'week', 'month', 'thursday', 'friday', 'monday', 'tuesday', 'wednesday'];
  
  let context;
  if (temporalKeywords.some(keyword => lastMessage.toLowerCase().includes(keyword))) {
    // Try temporal search first
    const temporalResult = await threader.searchTemporalReference(lastMessage, project);
    if (temporalResult.found) {
      context = temporalResult.context;
    } else {
      // Fallback to regular context
      context = await threader.getProjectContext(project, {
        ...options,
        currentQuery: lastMessage
      });
    }
  } else {
    // Regular context retrieval
    context = await threader.getProjectContext(project, {
      ...options,
      currentQuery: lastMessage
    });
  }

  // Inject context into system message
  if (messages.length > 0 && messages[0].role === 'system') {
    messages[0].content = context.context + '\n\n' + messages[0].content;
  } else {
    messages.unshift({
      role: 'system',
      content: context.context
    });
  }

  return {
    messages,
    contextStats: context.stats
  };
}

module.exports = {
  ConversationThreader,
  injectConversationContext,
  CONVERSATION_CONFIG
};