/**
 * Query Intent Classification
 * Determines what type of data should be fed to the AI
 */

function classifyIntent(query) {
  const lowerQuery = query.toLowerCase().trim();
  
  // Context queries - user wants info about currently loaded file
  const contextPatterns = [
    /\b(this|that|it)\b/,
    /what (does|is) (this|that|it)/,
    /tell me about (this|that)/,
    /analyze (this|that)/,
    /summarize (this|that)/,
    /explain (this|that)/
  ];
  
  if (contextPatterns.some(pattern => pattern.test(lowerQuery))) {
    console.log('[QUERY_CLASSIFIER] CONTEXT intent detected');
    return 'context';
  }
  
  // Memory queries - user wants conversation history/capsules
  const memoryPatterns = [
    /chat history/,
    /conversation/,
    /what did (i|we) (say|talk|discuss)/,
    /previous (conversation|chat)/,
    /our (discussion|conversation)/,
    /memory/,
    /remember when/
  ];
  
  if (memoryPatterns.some(pattern => pattern.test(lowerQuery))) {
    console.log('[QUERY_CLASSIFIER] MEMORY intent detected');
    return 'memory';
  }
  
  // Vault queries - user wants actual stored documents
  const vaultPatterns = [
    /\b(my|our) (recipes?|clients?|notes?|files?|documents?)/,
    /(list|show|find) (my|our)/,
    /what (recipes?|clients?|notes?) do i have/,
    /vault/
  ];
  
  if (vaultPatterns.some(pattern => pattern.test(lowerQuery))) {
    console.log('[QUERY_CLASSIFIER] VAULT intent detected');
    return 'vault';
  }
  
  // Default: hybrid (show relevant mix but filter intelligently)
  console.log('[QUERY_CLASSIFIER] HYBRID intent (default)');
  return 'hybrid';
}

/**
 * Filter data based on intent for AI consumption
 * This determines what tokens the AI actually sees
 */
function filterForAI(intent, results, contextContent = null) {
  if (!results || !Array.isArray(results)) {
    return [];
  }
  
  console.log(`[AI_FILTER] Filtering ${results.length} results for ${intent} intent`);
  
  switch (intent) {
    case 'context':
      // For context queries, AI should only see the loaded file
      if (contextContent) {
        console.log('[AI_FILTER] Using context content only');
        return [{
          type: 'context',
          content: contextContent.content,
          filename: contextContent.filename,
          source: 'sidebar_context'
        }];
      }
      console.log('[AI_FILTER] No context available, returning empty');
      return [];
      
    case 'vault':
      // For vault queries, AI should only see actual vault documents
      const vaultOnly = results.filter(item => {
        const path = item.path || item.relativePath || item.file || '';
        const folder = item.folder || '';
        
        // Block all .echo folders and capsules
        if (folder.startsWith('.echo') || path.includes('.echo') || 
            path.includes('capsule_') || (item.filename || '').includes('capsule_')) {
          return false;
        }
        
        return true;
      });
      
      console.log(`[AI_FILTER] Vault only: ${vaultOnly.length}/${results.length} items`);
      return vaultOnly;
      
    case 'memory':
      // For memory queries, AI should only see conversation/capsule data
      const memoryOnly = results.filter(item => {
        const path = item.path || item.relativePath || item.file || '';
        const folder = item.folder || '';
        
        // Only include .echo folders and capsules
        return folder.startsWith('.echo') || path.includes('.echo') || 
               path.includes('capsule_') || (item.filename || '').includes('capsule_');
      });
      
      console.log(`[AI_FILTER] Memory only: ${memoryOnly.length}/${results.length} items`);
      return memoryOnly;
      
    case 'hybrid':
    default:
      // For hybrid, intelligently limit but don't completely exclude
      const filtered = results.filter(item => {
        const path = item.path || item.relativePath || item.file || '';
        const filename = item.filename || item.name || '';
        
        // Still block obvious capsule files to reduce noise
        if (filename.includes('capsule_') && path.includes('.echo')) {
          return false;
        }
        
        return true;
      });
      
      // Limit total for token efficiency
      const limited = filtered.slice(0, 10);
      console.log(`[AI_FILTER] Hybrid: ${limited.length}/${results.length} items (limited for tokens)`);
      return limited;
  }
}

module.exports = { classifyIntent, filterForAI };