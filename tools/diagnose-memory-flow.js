// Save as: tools/diagnose-memory-flow.js
const path = require('path');

async function diagnoseMemoryFlow() {
  console.log('=== MEMORY FLOW DIAGNOSTIC ===\n');
  
  // 1. Check vault path
  const { getVaultPath } = require('../components/utils/VaultPathManager');
  const vaultPath = getVaultPath();
  console.log('✓ Vault Path:', vaultPath);
  
  // 2. Check memory system
  try {
    const { MemorySystem } = require('../src/memory/index');
    const memorySystem = new MemorySystem(vaultPath);
    console.log('✓ MemorySystem created');
    
    // 3. Test memory search
    const testQuery = 'recipes';
    console.log(`\nTesting search for: "${testQuery}"`);
    
    try {
      const context = await memorySystem.buildContextForInput(testQuery);
      console.log('✓ Context built:', {
        hasContext: !!context,
        memoryCount: context?.memory?.length || 0
      });
    } catch (e) {
      console.error('✗ buildContextForInput failed:', e.message);
    }
    
    // 4. Check capsule retriever
    try {
      const { searchCapsules } = require('../src/echo/memory/capsuleRetriever');
      const capsules = await searchCapsules({
        vaultPath: vaultPath,
        agent: 'default'
      });
      console.log('✓ Direct capsule search:', capsules.length, 'found');
    } catch (e) {
      console.error('✗ Capsule search failed:', e.message);
    }
    
    // 5. Check if capsules exist
    const fs = require('fs');
    const capsulePath = path.join(vaultPath, '.echo', 'capsules');
    if (fs.existsSync(capsulePath)) {
      const files = fs.readdirSync(capsulePath);
      console.log('✓ Capsule files on disk:', files.length);
    }
    
  } catch (error) {
    console.error('✗ Fatal Error:', error.message);
    console.error('  Stack:', error.stack);
  }
}

diagnoseMemoryFlow();