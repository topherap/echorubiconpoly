// testSession.js - ESM version
import { SessionMesh } from './src/echo/core/SessionMesh.js';

// Test configuration
const config = {
  vaultPath: 'D:\\Obsidian Vault',
  apiKey: process.env.OPENAI_API_KEY || 'test-key',
  useAPI: false,
  selectedModel: 'llama3.1'
};

async function runTest() {
  console.log('🚀 Starting Echo Rubicon Memory Test...\n');
  
  try {
    // Initialize the session mesh
    const mesh = new SessionMesh(config);
    console.log('✅ SessionMesh initialized\n');
    
    // Test dialogue inputs
    const testInputs = [
      "Hello, I'm testing the memory system.",
      "My name is Max and I love building AI systems.",
      "What's my name?",
      "What did I tell you I love?"
    ];
    
    // Run the dialogue
    console.log('Running test dialogue...\n');
    for (const input of testInputs) {
      console.log(`User: ${input}`);
      const result = await mesh.handleInput('general', input);
      console.log(`Echo: ${result.response}\n`);
      console.log(`[Memory capsule created at ${result.timestamp}]\n`);
      console.log('---\n');
    }
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
runTest();