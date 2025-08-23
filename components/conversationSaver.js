// SECTION START: CONVERSATION SAVE FUNCTION
var saveConversationSimple = function(userMessage, aiResponse, model) {
  console.log('[DEBUG-SAVE-CONVERSATION] Saving conversation...');
  if (!model) model = 'unknown';
  try {
    var now = new Date();
    var dateStr = now.toISOString().split('T')[0];
    
    // Convert to standard 12-hour format: "1-1-2025 12-00 AM"
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    var timeStr = (now.getMonth() + 1) + '-' + now.getDate() + '-' + now.getFullYear() + 
                  ' ' + hours + '-' + String(minutes).padStart(2, '0') + ' ' + ampm;
    
    // Detect intent FIRST
    var lowerMessage = userMessage.toLowerCase();
    var isQuery = false;
    var isCreation = false;
    
    // Query patterns - don't create files for these
    var queryPatterns = [
      /^(who|what|where|when|why|how|tell me about|show me|find|search|list)/i,
      /\?$/, // Ends with question mark
      /(is|are|was|were|has|have|had)\s+\w+\?/i
    ];
    
    // Creation patterns - only these create new files
    var createPatterns = [
      /^(create|add|make|new) (client|person|folder|project)[:s]?\s+/i,
      /^save .+ as (client|person)/i
    ];
    
    // Check if this is a query
    for (var i = 0; i < queryPatterns.length; i++) {
      if (queryPatterns[i].test(userMessage)) {
        isQuery = true;
        break;
      }
    }
    
    // Check if this is a creation command
    for (var i = 0; i < createPatterns.length; i++) {
      if (createPatterns[i].test(userMessage)) {
        isCreation = true;
        break;
      }
    }
    
    // ALWAYS save to conversations folder regardless of intent
    // Generate meaningful title from first 50 chars of user message
var titleSlug = userMessage.toLowerCase()
  .substring(0, 50)
  .replace(/[^a-z0-9\s]/g, '')
  .trim()
  .replace(/\s+/g, '-');
var conversationFilename = 'conversations/' + dateStr + '_' + timeStr.replace(/[:\s]/g, '-') + '_' + titleSlug + '.md';
    // Generate tags
    var tags = ['conversation', 'echo-rubicon', model];
    if (lowerMessage.includes('client')) tags.push('client-mention');
    if (lowerMessage.includes('address')) tags.push('address');
    if (lowerMessage.includes('phone')) tags.push('phone');
    if (lowerMessage.includes('email')) tags.push('email');
    
    var content = '---\n' +
  'timestamp: ' + timeStr + '\n' +
  'model: ' + model.replace(/:/g, '-') + '\n' +
  'intent: ' + (isCreation ? 'create' : isQuery ? 'query' : 'general') + '\n' +
  'tags: [' + tags.join(', ') + ']\n' +
  '---\n\n' +
  '# Chat: ' + userMessage.substring(0, 50) + '...\n\n' +
  '## User\n' + userMessage + '\n\n' +
  '## ' + formatLabel(model) + ' Response\n' + aiResponse + '\n\n' +
  '---\n*Logged by Echo Rubicon*\n';
      
    console.log('🔴🔴🔴 ABOUT TO SAVE VIA ELECTRONAPI', {
        hasElectronAPI: !!window.electronAPI,
        hasWriteNote: !!window.electronAPI?.writeNote,
        filename: conversationFilename,
        intent: isCreation ? 'create' : isQuery ? 'query' : 'general'
    });
    
    if (window.electronAPI && window.electronAPI.writeNote) {
      window.electronAPI.writeNote(conversationFilename, content).then(function(result) {
        if (result && result.success) {
          console.log('[DEBUG-SAVE-CONVERSATION] Conversation saved:', conversationFilename);
          
          // Only create topic files for CREATION commands
          if (isCreation) {
            handleCreationCommand(userMessage, aiResponse, model, now);
          }
          
          // Create memory capsule after saving conversation
if (window.electronAPI && window.electronAPI.processConversation) {
    
    
    // Extract topic from the message content
    const topic = userMessage.toLowerCase().includes('client') ? 'clients' : 
                  userMessage.toLowerCase().includes('project') ? 'projects' :
                  userMessage.toLowerCase().includes('echo') ? 'echo-dev' : 
                  'general';
    
    // Determine category based on message type
    const category = userMessage.toLowerCase().includes('create') || 
                     userMessage.toLowerCase().includes('build') ? 'creation' : 
                     userMessage.toLowerCase().includes('what') || 
                     userMessage.toLowerCase().includes('who') ? 'query' : 
                     'conversation';
    
    window.electronAPI.processConversation(userMessage, aiResponse, {
        model: model,
        topic: topic,
        category: category,
        timestamp: now.toISOString(),
        conversationPath: conversationFilename  // Fixed: was 'filename', now 'conversationFilename'
    }).then(function(result) {
        
    }).catch(function(error) {
        console.error('[DEBUG-MEMORY] Failed to create capsule:', error);
    });
}
} else {
  console.error('[DEBUG-SAVE-CONVERSATION] Save failed:', result);
}
}).catch(function(error) {
console.error('[DEBUG-SAVE-CONVERSATION] Save error:', error);
});
} else {
console.error('[DEBUG-SAVE-CONVERSATION] writeNote API not available');
}
} catch (error) {
console.error('[DEBUG-SAVE-CONVERSATION] Save function error:', error);
}
};
globalThis.saveConversationSimple = saveConversationSimple;
//console.log('[DEBUG] saveConversationSimple attached to globalThis:', typeof globalThis.saveConversationSimple);
//globalThis.saveConversationSimple = saveConversationSimple;
//console.log('[DEBUG] saveConversationSimple attached to globalThis:', typeof globalThis.saveConversationSimple);
//alert('SaveConversation attached: ' + (typeof globalThis.saveConversationSimple));
//DELETE THIS LINE AFTER TESTING^^^^
// ADD THESE LINES:
window.saveConversationSimple = saveConversationSimple;
console.log('[DEBUG] Also attached to window:', typeof window.saveConversationSimple);

// Verify they're the same global
console.log('[DEBUG] globalThis === window?', globalThis === window);

// Set a flag to verify this code ran
globalThis.ECHO_DEBUG_RAN = true;

module.exports = {
  saveConversationSimple
}
