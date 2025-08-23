const { MemoryVaultManager } = require('./src/memory/MemoryVaultManager');
const path = require('path');
const fs = require('fs').promises;

// Test multiple components
async function test() {
  console.log('='.repeat(80));
  console.log('ECHO RUBICON MEMORY SYSTEM DIAGNOSTIC');
  console.log('='.repeat(80));
  
  const vaultPath = 'D:\\Obsidian Vault';
  const manager = new MemoryVaultManager(vaultPath);
  
  // Test 1: Basic search functionality
  console.log('\n[TEST 1] Basic Memory Search');
  console.log('-'.repeat(40));
  const queries = ['clients', 'recipes', 'lifts', 'tarot'];
  
  for (const query of queries) {
    console.log(`\nSearching for "${query}"...`);
    const results = await manager.searchMemories(query, { limit: 5 });
    console.log(`  Found: ${results.length} results`);
    if (results.length > 0) {
      console.log(`  Top result: ${results[0].metadata?.fileName || results[0].id}`);
      console.log(`  Type: ${results[0].type || 'unknown'}`);
      console.log(`  Project: ${results[0].metadata?.project || 'none'}`);
    }
  }
  
  // Test 2: Project-specific search
  console.log('\n[TEST 2] Project-Specific Search');
  console.log('-'.repeat(40));
  const projects = ['clients', 'foods'];
  
  for (const project of projects) {
    console.log(`\nProject: ${project}`);
    const projectPath = path.join(vaultPath, '.echo', 'projects', project, 'capsules');
    
    try {
      const files = await fs.readdir(projectPath);
      console.log(`  Capsule files: ${files.length}`);
      
      // Search within project
      const results = await manager.searchMemories('', { 
        limit: 3,
        project: project 
      });
      console.log(`  Search results: ${results.length}`);
      if (results.length > 0) {
        console.log(`  Sample: ${results[0].metadata?.fileName || results[0].id}`);
      }
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
  }
  
  // Test 3: Q-lib Integration
  console.log('\n[TEST 3] Q-lib Integration Check');
  console.log('-'.repeat(40));
  
  try {
    // Try to load Q-lib
    const qlibPath = './src/memory/QLibInterface';
    const qlibModule = require(qlibPath);
    
    console.log('Q-lib module type:', typeof qlibModule);
    console.log('Q-lib exports:', Object.keys(qlibModule));
    
    // Check if it's a constructor
    const { QLibInterface, getQlibInstance } = qlibModule;
    console.log('QLibInterface type:', typeof QLibInterface);
    console.log('getQlibInstance type:', typeof getQlibInstance);
    
    // Try to create instance
    if (typeof QLibInterface === 'function') {
      try {
        const qlib = new QLibInterface(vaultPath);
        console.log('✅ Q-lib instance created successfully');
        
        // Test extract if available
        if (typeof qlib.extract === 'function') {
          const extraction = await qlib.extract('test', 'sample content');
          console.log('✅ Q-lib extract works');
        }
      } catch (err) {
        console.log('❌ Q-lib instantiation failed:', err.message);
      }
    } else if (typeof getQlibInstance === 'function') {
      try {
        const qlib = getQlibInstance(vaultPath);
        console.log('✅ Q-lib singleton obtained');
      } catch (err) {
        console.log('❌ Q-lib singleton failed:', err.message);
      }
    }
  } catch (err) {
    console.log('❌ Q-lib module load failed:', err.message);
  }
  
  // Test 4: Global state check
  console.log('\n[TEST 4] Global State Check');
  console.log('-'.repeat(40));
  console.log('global.currentProject:', global.currentProject || 'not set');
  console.log('global.memorySystem:', !!global.memorySystem);
  console.log('global.vaultPath:', global.vaultPath || 'not set');
  
  // Test 5: Capsule statistics
  console.log('\n[TEST 5] Capsule Statistics');
  console.log('-'.repeat(40));
  
  const stats = {
    total: 0,
    byType: {},
    byProject: {},
    recent: []
  };
  
  // Count all capsules
  const capsulePaths = [
    path.join(vaultPath, '.echo', 'capsules'),
    path.join(vaultPath, '.echo', 'projects', 'clients', 'capsules'),
    path.join(vaultPath, '.echo', 'projects', 'foods', 'capsules')
  ];
  
  for (const capsulePath of capsulePaths) {
    try {
      const files = await fs.readdir(capsulePath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      stats.total += jsonFiles.length;
      
      const projectName = capsulePath.includes('projects') 
        ? path.basename(path.dirname(capsulePath))
        : 'general';
      stats.byProject[projectName] = jsonFiles.length;
      
      // Sample one file to check structure
      if (jsonFiles.length > 0) {
        const sampleFile = path.join(capsulePath, jsonFiles[0]);
        const content = await fs.readFile(sampleFile, 'utf8');
        const capsule = JSON.parse(content);
        const type = capsule.type || capsule.metadata?.type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }
    } catch (err) {
      console.log(`  Skipping ${capsulePath}: ${err.message}`);
    }
  }
  
  console.log('Total capsules:', stats.total);
  console.log('By project:', stats.byProject);
  console.log('By type (sampled):', stats.byType);
  
  // Test 6: Memory index status
  console.log('\n[TEST 6] Memory Index Status');
  console.log('-'.repeat(40));
  console.log('Index size:', manager.index?.size || 0);
  console.log('Capsule count:', manager.getCapsuleCount());
  
  // Rebuild index if needed
  if (manager.getCapsuleCount() === 0) {
    console.log('Rebuilding index...');
    await manager.rebuildIndexFromDisk();
    console.log('After rebuild:', manager.getCapsuleCount());
  }
  
  // Test 7: Specific client search (should find Angela Smith)
  console.log('\n[TEST 7] Specific Search Tests');
  console.log('-'.repeat(40));
  
  const specificTests = [
    { query: 'Angela Smith', expected: 'client' },
    { query: 'carnivore ice cream', expected: 'recipe' },
    { query: 'what are my clients', expected: 'list' },
    { query: 'bench press ritual', expected: 'workout' }
  ];
  
  for (const test of specificTests) {
    console.log(`\nQuery: "${test.query}"`);
    const results = await manager.searchMemories(test.query, { limit: 3 });
    console.log(`  Expected type: ${test.expected}`);
    console.log(`  Found: ${results.length} results`);
    if (results.length > 0) {
      const r = results[0];
      console.log(`  Top result type: ${r.type || 'unknown'}`);
      console.log(`  Content preview: ${(r.content || r.summary || '').substring(0, 60)}...`);
      console.log(`  Relevance: ${r.relevanceScore?.toFixed(2) || 'N/A'}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('DIAGNOSTIC COMPLETE');
  console.log('='.repeat(80));
}

test().catch(console.error);