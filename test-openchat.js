// test-openchat.js
const MODEL_FORMATS = {
  'openchat': {
    requiresSingleSystemMessage: true,
    combineSystemMessages: (messages) => {
      const systemMessages = messages.filter(m => m.role === 'system');
      const otherMessages = messages.filter(m => m.role !== 'system');
      
      if (systemMessages.length <= 1) {
        return messages;
      }
      
      const combinedContent = systemMessages
        .map(m => m.content)
        .join('\n\n');
      
      return [
        { role: 'system', content: combinedContent },
        ...otherMessages
      ];
    }
  }
};

function getModelFormat(modelName) {
  console.log('Testing model:', modelName);
  for (const [key, format] of Object.entries(MODEL_FORMATS)) {
    if (modelName.toLowerCase().includes(key)) {
      console.log('Match found!');
      return format;
    }
  }
  console.log('No match found');
  return null;
}

function formatMessagesForModel(messages, modelName) {
  const modelFormat = getModelFormat(modelName);
  if (!modelFormat) return messages;
  
  if (modelFormat.requiresSingleSystemMessage && modelFormat.combineSystemMessages) {
    return modelFormat.combineSystemMessages(messages);
  }
  return messages;
}

// Run tests
console.log('=== Testing OpenChat Model Detection ===\n');

// Test different model names
const testModels = ['openchat', 'openchat:latest', 'openchat:1.5', 'OpenChat:Ultra', 'mistral'];
testModels.forEach(model => {
  const result = getModelFormat(model);
  console.log(`\nModel: "${model}" -> ${result ? 'MATCHED' : 'NOT MATCHED'}`);
});

// Test message formatting
console.log('\n\n=== Testing Message Formatting ===\n');
const testMessages = [
  { role: 'system', content: 'You are Q' },
  { role: 'system', content: 'Memory context here' },
  { role: 'user', content: 'Hello' }
];

console.log('Original messages:', testMessages.length);
testMessages.forEach((msg, i) => console.log(`  ${i+1}. ${msg.role}: ${msg.content.substring(0, 20)}...`));

const formatted = formatMessagesForModel(testMessages, 'openchat:latest');
console.log('\nFormatted messages:', formatted.length);
formatted.forEach((msg, i) => console.log(`  ${i+1}. ${msg.role}: ${msg.content.substring(0, 50)}...`));

console.log('\n✓ Test complete!');
