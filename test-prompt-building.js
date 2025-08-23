// test-prompt-building.js
const { MemoryVaultManager } = require('./src/memory/MemoryVaultManager');
const path = require('path');

async function testPromptBuilding() {
  const vaultManager = new MemoryVaultManager('D:\\Obsidian Vault');
  vaultManager.currentProject = 'clients';
  
  // Search for client memories
  const memories = await vaultManager.searchMemories('clients', { limit: 5 });
  
  console.log('Found memories:', memories.length);
  
  memories.forEach((mem, i) => {
    console.log(`\nMemory ${i + 1}:`);
    console.log('ID:', mem.id);
    console.log('Content exists:', !!mem.content);
    console.log('Content preview:', mem.content ? mem.content.substring(0, 200) : 'NO CONTENT');
    console.log('Type:', mem.metadata?.type);
    console.log('Folder:', mem.metadata?.folder);
  });
}

testPromptBuilding().catch(console.error);
