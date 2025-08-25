/**
 * Context Handler for Sidebar File Integration
 * Connects sidebar file selections with "this/that" queries
 */

// Global context store 
if (!global.vaultContext) {
  global.vaultContext = {
    current: null,
    history: [],
    
    setFromSidebar(filepath, content, filename) {
      this.current = {
        type: 'sidebar_selection',
        filepath: filepath,
        content: content,
        filename: filename,
        loadedAt: Date.now()
      };
      
      // Keep history but limit to last 10 items
      this.history.push({ ...this.current });
      if (this.history.length > 10) {
        this.history.shift();
      }
      
      console.log('[CONTEXT] Sidebar loaded:', filename, `(${content.length} chars)`);
      return this.current;
    },
    
    getCurrent() {
      return this.current;
    },
    
    clear() {
      this.current = null;
      console.log('[CONTEXT] Cleared');
    },
    
    getContextInfo() {
      if (!this.current) return null;
      
      const age = Date.now() - this.current.loadedAt;
      const ageMinutes = Math.round(age / (1000 * 60));
      
      return {
        ...this.current,
        age: ageMinutes,
        isStale: age > (30 * 60 * 1000) // 30 minutes
      };
    }
  };
}

/**
 * Check if a query references context ("this", "that", etc.)
 */
function checkContextQuery(query) {
  const contextWords = [
    'this', 'that', 'it', 'these', 'the note', 'the file', 
    'this file', 'this note', 'this document', 'what does this',
    'tell me about this', 'analyze this', 'explain this',
    'summarize this', 'what is this', 'describe this'
  ];
  
  const queryLower = query.toLowerCase().trim();
  
  const hasContextWord = contextWords.some(word => {
    if (word.includes(' ')) {
      return queryLower.includes(word);
    } else {
      // For single words, ensure word boundaries
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(queryLower);
    }
  });
  
  if (hasContextWord && global.vaultContext?.current) {
    const contextInfo = global.vaultContext.getContextInfo();
    console.log('[CONTEXT] Using sidebar context for query:', query);
    console.log('[CONTEXT] File:', contextInfo.filename, `(loaded ${contextInfo.age} min ago)`);
    
    return {
      useContext: true,
      context: contextInfo,
      originalQuery: query,
      enhancedQuery: `${query}\n\n**Context File: ${contextInfo.filename}**\n${contextInfo.content.substring(0, 3000)}${contextInfo.content.length > 3000 ? '...' : ''}`
    };
  }
  
  if (hasContextWord && !global.vaultContext?.current) {
    console.log('[CONTEXT] Context query detected but no file loaded:', query);
    return {
      useContext: false,
      needsContext: true,
      originalQuery: query,
      errorMessage: "I don't have any file loaded as context. Please select a file from the sidebar first, then ask about 'this' or 'that'."
    };
  }
  
  return { useContext: false };
}

/**
 * Update context from EchoInterface state
 */
function syncFromEchoInterface(state) {
  if (state.loadedFileContent && state.loadedFileName) {
    global.vaultContext.setFromSidebar(
      state.loadedFileName, // filepath
      state.loadedFileContent, // content  
      state.loadedFileName.split(/[/\\]/).pop() // filename
    );
  }
}

module.exports = { 
  checkContextQuery, 
  syncFromEchoInterface,
  getGlobalContext: () => global.vaultContext
};