// Save as: tools/diagnose-hallucination.js

const path = require('path');
const fs = require('fs');

async function diagnoseHallucination() {
  console.log('=== HALLUCINATION DIAGNOSTIC ===\n');
  
  // 1. Check what's in the actual capsule
  const clientCapsulePath = 'D:\\Obsidian Vault\\.echo\\projects\\clients\\capsules\\2025-08\\06\\';
  console.log('1. CHECKING JANE KIMANI CAPSULE:');
  
  const capsules = fs.readdirSync(clientCapsulePath);
  const janeCapsule = capsules.find(f => {
    const content = fs.readFileSync(path.join(clientCapsulePath, f), 'utf8');
    return content.includes('Jane M. Kimani');
  });
  
  if (janeCapsule) {
    const content = JSON.parse(fs.readFileSync(path.join(clientCapsulePath, janeCapsule), 'utf8'));
    console.log('Found capsule:', janeCapsule);
    console.log('Summary:', content.summary);
    console.log('Content preview:', content.content.substring(0, 200));
  }
  
  // 2. Test memory search directly
  console.log('\n2. TESTING MEMORY SEARCH:');
  if (global.memorySystem?.vaultManager) {
    const results = await global.memorySystem.vaultManager.searchMemories('Jane Kimani', {
      limit: 5,
      project: 'clients'
    });
    console.log('Search returned:', results.length, 'results');
    results.forEach((r, i) => {
      console.log(`Result ${i}: ${r.summary || r.content.substring(0, 100)}`);
    });
  }
  
  // 3. Check what's being sent to the model
  console.log('\n3. CAPTURE NEXT MESSAGE TO MODEL:');
  console.log('Add this to chatSendHandler.js before fetch:');
  console.log('fs.writeFileSync("last-model-input.json", JSON.stringify({ model, messages: messagesToSend }, null, 2));');
  
  // 4. Check temperature and model settings
  console.log('\n4. CHECK MODEL SETTINGS:');
  console.log('Look for temperature, num_predict, and other options in the Ollama call');
}

// Run diagnostic
diagnoseHallucination();
