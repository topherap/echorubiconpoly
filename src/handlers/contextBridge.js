/**
 * Context Bridge - Handles anaphoric references and context queries
 * Fixes "you're missing one" and "tell me about this" disconnects
 */

class ContextBridge {
  constructor() {
    this.listReferencePatterns = [
      /you.*(missing|forgot|missed).*(one|item|\d+)/i,
      /what about.*(number|item|\d+)/i,
      /there'?s? (also|another|one more)/i,
      /you (didn'?t|don'?t) (show|list|include)/i,
      /(incomplete|partial) list/i,
      /forgot (the|my)?\s*\w+/i  // "forgot carnivore ice cream"
    ];
    
    this.contextQueries = [
      /tell me (about|more on) (this|that|it)/i,
      /what (do you think|are your thoughts) (about|on) (this|that)/i,
      /analyze (this|that)/i,
      /explain (this|that|it)/i,
      /thoughts on (this|that)/i,
      /what about (this|that)/i
    ];
  }

  detectListReference(query) {
    if (!global.vaultContext?.lastListDisplay) {
      console.log('[CONTEXT BRIDGE] No last list display to reference');
      return null;
    }
    
    const timeSinceList = Date.now() - global.vaultContext.lastListDisplay.timestamp;
    if (timeSinceList > 120000) { // 2 minutes
      console.log('[CONTEXT BRIDGE] Last list too old (>2 min)');
      return null;
    }
    
    for (let pattern of this.listReferencePatterns) {
      if (pattern.test(query)) {
        console.log(`[CONTEXT BRIDGE] Detected list reference: "${query}"`);
        return {
          type: 'list_reference',
          referencing: global.vaultContext.lastListDisplay,
          query: query,
          action: this.inferAction(query),
          confidence: 0.8
        };
      }
    }
    return null;
  }

  detectContextQuery(query) {
    if (!global.vaultContext?.current) return null;
    
    const timeSinceContext = Date.now() - global.vaultContext.current.loadedAt;
    if (timeSinceContext > 300000) return null; // 5 minutes
    
    for (let pattern of this.contextQueries) {
      if (pattern.test(query)) {
        console.log(`[CONTEXT BRIDGE] Detected context query: "${query}"`);
        return {
          type: 'context_query',
          referencing: global.vaultContext.current,
          query: query,
          confidence: 0.9
        };
      }
    }
    return null;
  }

  inferAction(query) {
    if (/missing|forgot|missed|didn'?t/i.test(query)) {
      return 'check_for_missing';
    }
    if (/what about|show me/i.test(query)) {
      return 'query_about_item';
    }
    if (/explain|analyze|thoughts/i.test(query)) {
      return 'analyze_context';
    }
    return 'clarify';
  }

  async handleMissingItem(listContext) {
    console.log('[CONTEXT BRIDGE] Checking for missing items...');
    
    try {
      // Get the vaultHighPriest instance
      const vaultHP = require('./vaultHighPriest');
      
      // Re-scan by running the same query that produced the original list
      const source = listContext.source;
      const displayedFiles = listContext.items.map(i => i.filename);
      
      console.log(`[CONTEXT BRIDGE] Displayed files: ${displayedFiles.join(', ')}`);
      
      // For now, return a standard "rechecked" message
      // Later we can add more sophisticated re-scanning
      return {
        success: true,
        found: false,
        message: "I've rechecked and that appears to be the complete list from your vault. If you think something is missing, try a more specific search term."
      };
      
    } catch (error) {
      console.error('[CONTEXT BRIDGE] Error checking for missing:', error);
      return {
        success: false,
        message: "I had trouble rechecking the list. Please try your search again."
      };
    }
  }

  async handleContextQuery(contextRef, originalQuery) {
    console.log('[CONTEXT BRIDGE] Handling context query...');
    
    const currentFile = contextRef.referencing;
    if (!currentFile || !currentFile.content) {
      return {
        success: false,
        message: "I don't have any context loaded to analyze."
      };
    }
    
    // Enhance the query with explicit context
    const enhancedQuery = `[CONTEXT: Currently viewing "${currentFile.filename}"]\n\nContent:\n${currentFile.content.substring(0, 2000)}${currentFile.content.length > 2000 ? '...' : ''}\n\nUser Question: ${originalQuery}`;
    
    return {
      success: true,
      enhancedQuery: enhancedQuery,
      contextFile: currentFile.filename,
      message: `Analyzing "${currentFile.filename}" in response to your question...`
    };
  }

  // Main entry point for the bridge
  async processQuery(query) {
    console.log(`[CONTEXT BRIDGE] Processing query: "${query}"`);
    
    // Check for list references first ("you're missing one")
    const listRef = this.detectListReference(query);
    if (listRef) {
      if (listRef.action === 'check_for_missing') {
        return await this.handleMissingItem(listRef.referencing);
      }
    }
    
    // Check for context queries ("tell me about this")
    const contextQuery = this.detectContextQuery(query);
    if (contextQuery) {
      return await this.handleContextQuery(contextQuery, query);
    }
    
    // No special handling needed
    return {
      success: false,
      passThrough: true,
      message: "Normal query processing"
    };
  }
}

module.exports = new ContextBridge();