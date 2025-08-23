// src/memory/context.js
// Brain Region: Dorsolateral Prefrontal Cortex (dlPFC)
// Function: Working memory, selective attention, executive filtering

class ContextBuilder {
  constructor(options = {}) {
    this.maxTokens = options.maxTokens || 8000;
    this.priorities = { recent: 0.4, relevant: 0.4, summary: 0.2 };
  }

  /**
   * Backwards-compatible signature:
   * - buildContext(userInput, options)  // auto-fetch memories
   * - buildContext(userInput, memories, options)
   */
  async buildContext(userInput, maybeMemoriesOrOptions, maybeOptions) {
    let memories;
    let options;

    if (Array.isArray(maybeMemoriesOrOptions)) {
      // Called as (userInput, memories, options)
      memories = maybeMemoriesOrOptions;
      options = maybeOptions || {};
    } else {
      // Called as (userInput, options)
      options = maybeMemoriesOrOptions || {};
      memories = await this._fetchMemories(userInput, options);
    }

    memories = Array.isArray(memories) ? memories : [];
    console.log(`[ContextBuilder] Building context from ${memories.length} memories`);

    // Bypass mode
    if (options.skipSort || options.skipFiltering) {
      console.log('[ContextBuilder] Bypass mode - using pre-filtered memories');
      const formatted = memories.map(m => this.formatMemory(m)).filter(Boolean).join('\n\n---\n\n');
      console.log(`[ContextBuilder] Returning ${formatted.length} chars (bypass mode)`);
      return { memory: memories, vault: [], qlib: null, context: formatted || 'No relevant memories found.' };
    }

    const sorted = options.skipSort ? memories : this.sortMemories(memories, userInput);

    const budget = {
      recent: Math.floor(this.maxTokens * this.priorities.recent),
      relevant: Math.floor(this.maxTokens * this.priorities.relevant),
      summary: Math.floor(this.maxTokens * this.priorities.summary)
    };
    console.log('[ContextBuilder] Token budgets:', budget);

    const recentContext = this.selectMemories(
      sorted.filter(m => this.isRecent(m, options.recentDays || 7)),
      budget.recent
    );

    const relevantContext = this.selectMemories(
      sorted.filter(m => this.isRelevant(m, userInput, options.relevanceThreshold || 0.1)),
      budget.relevant
    );

    const summaryContext = this.selectMemories(
      sorted.filter(m => m.type === 'summary' || m.metadata?.type === 'summary'),
      budget.summary
    );

    console.log('[ContextBuilder] Selected memories:', {
      recent: recentContext.length, relevant: relevantContext.length, summaries: summaryContext.length
    });

    let contextText;
    if (recentContext.length === 0 && relevantContext.length === 0 && summaryContext.length === 0) {
      console.log('[ContextBuilder] No memories passed filters, including top 5 by score');
      const topMemories = sorted.slice(0, 5);
      contextText = topMemories.map(m => this.formatMemory(m)).filter(Boolean).join('\n\n---\n\n') || 'No memories available.';
      return { memory: topMemories, vault: [], qlib: null, context: contextText };
    }

    contextText = this.formatContext({
      recent: recentContext,
      relevant: relevantContext,
      summaries: summaryContext,
      userInput
    });

    // Keep the object shape upstream expects
    const merged = [...summaryContext, ...relevantContext, ...recentContext];
    return { memory: merged, vault: [], qlib: null, context: contextText };
  }

  // Back-compat method used elsewhere
  async buildContextForInput(userInput, options = {}) {
    return this.buildContext(userInput, options);
  }

  // ------- helpers you wrote (unchanged logic) -------
  sortMemories(memories, query) {
    return memories.sort((a, b) => {
      const scoreA = typeof a.score === 'number' ? a.score : this.calculateScore(a, query);
      const scoreB = typeof b.score === 'number' ? b.score : this.calculateScore(b, query);
      return scoreB - scoreA;
    });
  }

  calculateScore(memory, query) {
    let score = 0;
    const age = Date.now() - new Date(memory.timestamp || memory.created_at || 0).getTime();
    const daysSinceMemory = age / (1000 * 60 * 60 * 24);
    score += Math.exp(-daysSinceMemory / 30);

    const queryWords = (query || '').toLowerCase().split(/\s+/).filter(Boolean);
    const memoryText = JSON.stringify(memory || {}).toLowerCase();

    const contentMatches = queryWords.filter(word => memoryText.includes(word)).length;
    score += queryWords.length ? (contentMatches / queryWords.length) * 2 : 0;

    if (memory.semantic_tags && Array.isArray(memory.semantic_tags)) {
      const tagText = memory.semantic_tags.join(' ').toLowerCase();
      const tagMatches = queryWords.filter(word => tagText.includes(word)).length;
      score += queryWords.length ? (tagMatches / queryWords.length) * 3 : 0;
    }

    score += memory.importance || memory.metadata?.importance || 0.5;
    if (memory.type === 'summary' || memory.metadata?.type === 'summary') score += 0.5;
    if (memory.metadata?.chaos_score) score += memory.metadata.chaos_score * 0.5;

    return score;
  }

  isRecent(memory, days = 7) {
    const timestamp = memory.timestamp || memory.created_at || memory.metadata?.timestamp;
    if (!timestamp) return false;
    const age = Date.now() - new Date(timestamp).getTime();
    return age < days * 24 * 60 * 60 * 1000;
  }

  isRelevant(memory, query, threshold = 0.1) {
    const score = this.calculateScore(memory, query);
    return score > threshold;
  }

  selectMemories(memories, tokenBudget) {
    const selected = [];
    let tokensUsed = 0;

    for (const memory of memories) {
      const tokens = memory.tokenCount || memory.metadata?.token_count || this.estimateTokens(memory);
      if (tokensUsed + tokens <= tokenBudget) {
        selected.push(memory);
        tokensUsed += tokens;
      } else if (selected.length === 0 && memories.length > 0) {
        selected.push(memories[0]);
        break;
      } else {
        break;
      }
    }
    return selected;
  }

  formatContext(sections) {
    let context = '';
    let hasContent = false;

    if (sections.summaries && sections.summaries.length > 0) {
      context += '## Previous Summaries\n\n';
      sections.summaries.forEach(s => {
        const formatted = this.formatMemory(s);
        if (formatted) { context += formatted + '\n\n'; hasContent = true; }
      });
    }
    if (sections.relevant && sections.relevant.length > 0) {
      context += '## Relevant Memories\n\n';
      sections.relevant.forEach(m => {
        const formatted = this.formatMemory(m);
        if (formatted) { context += formatted + '\n---\n'; hasContent = true; }
      });
    }
    if (sections.recent && sections.recent.length > 0) {
      context += '## Recent Conversation\n\n';
      sections.recent.forEach(m => {
        const formatted = this.formatMemory(m);
        if (formatted) { context += formatted + '\n---\n'; hasContent = true; }
      });
    }
    if (!hasContent) return 'No relevant context found for this query.';
    return context.trim();
  }

  formatMemory(memory) {
    if (!memory) return null;

    if (memory.metadata?.chaos_score) {
      const type = memory.metadata?.type || 'Memory';
      const score = typeof memory.score === 'number' ? ` [${memory.score.toFixed(2)}]` : '';
      const tags = memory.tags?.length > 0 ? ` (${memory.tags.join(', ')})` : '';
      let content = `### ${type}${score}${tags}\n\n`;

      if (memory.content) content += memory.content;
      else if (memory.summary) content += memory.summary;
      else if (memory.text) content += memory.text;
      else if (memory.messages) content += memory.messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
      else if (memory.data) content += (typeof memory.data === 'string' ? memory.data : JSON.stringify(memory.data, null, 2));

      return content;
    }

    if (memory.type === 'conversation' && memory.messages) {
      return memory.messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
    }
    if (memory.content) return memory.content;
    if (memory.summary) return memory.summary;
    if (memory.text) return memory.text;
    if (memory.data) return (typeof memory.data === 'string' ? memory.data : JSON.stringify(memory.data, null, 2));
    return JSON.stringify(memory, null, 2);
  }

  estimateTokens(memory) {
    const text = typeof memory === 'string' ? memory : JSON.stringify(memory || {});
    return Math.ceil(text.length / 3.5);
  }

  // Auto-fetch memories if caller didn’t pass them
  async _fetchMemories(userInput, options) {
    try {
      if (global?.memorySystem?.vaultManager?.searchMemories) {
        return await global.memorySystem.vaultManager.searchMemories(userInput, {
          limit: options.limit || 20,
          project: options.project || global.currentProject || null
        });
      }
    } catch (e) {
      console.warn('[ContextBuilder] memory fetch failed:', e.message);
    }
    return [];
  }
}

module.exports = { ContextBuilder };
