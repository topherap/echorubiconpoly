# Dependency Check - Vault Direct Delivery Architecture

## Files Using chatSendHandler

### Critical Dependencies:
1. **main/ipc-handlers.js** - Creates and uses chatSendHandler
   - Imports: `const { createChatSendHandler } = require('./handlers/chatSendHandler');`
   - Usage: Core IPC communication handler
   - **Impact**: Direct - any response format changes affect IPC

### UI Response Dependencies:

1. **components/conversationSaver.js**
   - Expects: `aiResponse` parameter  
   - Function: `saveConversationSimple(userMessage, aiResponse, model)`
   - **Impact**: UI conversation saving might break if response structure changes

2. **components/MyAIInterface.js** 
   - References: `aiResponses` array
   - **Impact**: UI display might break if response format changes

### IPC Communication Pattern:
- Uses `event.reply('chat-response', response)`
- UI likely expects consistent response format

## Compatibility Requirements:

### Must Preserve:
1. **Response Structure**: UI expects consistent response format
2. **IPC Pattern**: `event.reply('chat-response', ...)` must continue working
3. **Conversation Saving**: `aiResponse` parameter format

### Safe to Change:
1. **Internal Processing**: How response is generated
2. **Source Tracking**: Can add new fields like `source: 'vault-direct'`
3. **Flow Control**: Can bypass AI internally while maintaining UI compatibility

## Recommended Approach:

### Backward Compatible Response Format:
```javascript
// Old format (preserve):
{
  message: "response text",
  model: "model-name"
}

// New format (enhanced):
{
  message: "response text",
  model: "model-name", 
  source: "vault-direct|ai-commentary",
  bypassAI: true|false,
  hasCanon: true|false
}
```

### Implementation Strategy:
1. **Internal Branching**: Handle vault queries internally before AI
2. **Response Wrapping**: Ensure all responses use compatible format
3. **IPC Preservation**: Keep same `event.reply('chat-response', ...)` pattern
4. **UI Enhancement**: Add new fields without breaking existing UI

## Risk Assessment:

### LOW RISK:
- Adding vault direct delivery (bypasses AI internally)
- Adding new response fields (backward compatible)
- Canon enforcement system (improves responses)

### MEDIUM RISK:
- Changing response structure (could break conversation saving)
- Modifying IPC patterns (could break UI communication)

### HIGH RISK:
- Breaking existing event.reply format (would break all UI)
- Changing expected response.message format (would break display)

## Conclusion:
Implementation is SAFE with proper response wrapping. The vault direct delivery can be added without breaking existing functionality by ensuring all responses maintain backward compatible format.