const { MemoryVaultManager } = require('./src/memory/MemoryVaultManager');
const manager = new MemoryVaultManager('D:\\Obsidian Vault');

async function debug() {
  // Force a fresh index rebuild
  await manager.rebuildIndexFromDisk();
  console.log('Total capsules in index:', manager.getCapsuleCount());
  
  // Search for "clients"
  const results = await manager.searchMemories('clients', { limit: 20 });
  console.log(`\nSearch for "clients" returned ${results.length} results`);
  
  // Show what types we're getting
  const types = {};
  results.forEach(r => {
    const type = r.metadata?.type || r.type || 'unknown';
    types[type] = (types[type] || 0) + 1;
  });
  
  console.log('\nResult types:', types);
  
  // Show first few results
  console.log('\nFirst 3 results:');
  results.slice(0, 3).forEach((r, i) => {
    console.log(`${i+1}. ${r.metadata?.fileName || r.id}`);
    console.log(`   Type: ${r.metadata?.type || r.type}`);
    console.log(`   Content preview: ${(r.content || r.summary || '').substring(0, 100)}...`);
  });
}

debug().catch(console.error);
