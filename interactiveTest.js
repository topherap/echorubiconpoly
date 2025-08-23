import { SessionMesh } from './src/echo/core/SessionMesh.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Starting Echo Rubicon Interactive Test...\n');

const config = {
  vaultPath: 'D:\\Obsidian Vault',
  engines: {
    general: { name: 'Echo', role: 'general' }
  }
};

const mesh = new SessionMesh(config);
console.log('✅ Memory system ready!\n');
console.log('Type your messages (or "exit" to quit):\n');

async function chat() {
  rl.question('You: ', async (input) => {
    if (input.toLowerCase() === 'exit') {
      console.log('\nGoodbye!');
      rl.close();
      process.exit(0);
    }
    
    try {
      const result = await mesh.handleInput('general', input);
      console.log(`\nEcho: ${result.response}\n`);
    } catch (error) {
      console.error('Error:', error.message);
    }
    
    chat(); // Continue conversation
  });
}

chat();
