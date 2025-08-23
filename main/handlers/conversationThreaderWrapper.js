// main/handlers/conversationThreaderWrapper.js
const { ConversationThreader, injectConversationContext: originalInject } = require('../../tools/conversationThreader');

/**
 * Wrapper for conversation threading with caching
 * Imports the core implementation from tools/conversationThreader.js
 */

// Cache threader instances per vault path
const threaderCache = new Map();

/**
 * Get or create a threader instance for a vault path
 */
async function getThreader(vaultPath) {
  if (!threaderCache.has(vaultPath)) {
    const threader = new ConversationThreader(vaultPath);
    await threader.initialize();
    threaderCache.set(vaultPath, threader);
  }
  return threaderCache.get(vaultPath);
}

/**
 * Inject conversation context into messages for better AI understanding
 * This wraps the original function and adds caching
 * @param {Array} messages - Current messages array
 * @param {string} projectName - Current project name
 * @param {Object} options - Configuration options
 * @returns {Object} Enhanced messages with conversation context
 */
async function injectConversationContext(messages, projectName, options = {}) {
  // Use the cached threader if available, otherwise use the original function
  if (options.vaultPath && projectName) {
    try {
      const threader = await getThreader(options.vaultPath);
      return await originalInject(messages, projectName, options);
    } catch (error) {
      console.error('[CONVERSATION WRAPPER] Error:', error);
      return { messages, tokenCount: 0 };
    }
  }
  
 // Fallback to original implementation with vaultPath ensured
  if (!options?.vaultPath) {
    return { messages, tokenCount: 0 };  // No vaultPath, skip threading
  }
  return originalInject(messages, projectName, options);
}

/**
 * Clear threader cache (useful after major changes)
 */
function clearThreaderCache() {
  threaderCache.clear();
  console.log('[CONVERSATION CONTEXT] Threader cache cleared');
}

module.exports = {
  injectConversationContext,
  getThreader,
  clearThreaderCache
};