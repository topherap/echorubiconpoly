// Quick integration test
const { createCanalSystem } = require('./src/v2/core/canal');
const VaultService = require('./src/v2/services/vaultService');

async function testFlow() {
  console.log('=== INTEGRATION TEST ===\n');
  
  // Create system with real vault
  const vaultService = new VaultService({ vaultPath: 'D:\\Obsidian Vault' });
  
  // Check vault status
  const vaultInfo = vaultService.getVaultInfo();
  console.log(`Vault path: ${vaultInfo.path}`);
  console.log(`Vault exists: ${vaultInfo.exists}\n`);
  
  if (!vaultInfo.exists) {
    console.log('❌ Vault not found - using test data instead');
    const testVaultPath = require('path').join(__dirname, 'test-data', 'vault');
    vaultService.vaultPath = testVaultPath;
    console.log(`Using test vault: ${testVaultPath}\n`);
  }
  
  const system = createCanalSystem();
  const sessionId = 'integration-test';
  
  // Test 1: Direct VaultService search
  console.log('1. Direct VaultService search:');
  const directResults = await vaultService.search('show me recipes');
  console.log(`   Found: ${directResults.length} recipes`);
  if (directResults.length > 0) {
    console.log(`   First: ${directResults[0].name}`);
  }
  
  // Test 2: Through Canal system (if available)  
  console.log('\n2. Through Canal system:');
  try {
    // Register vault route
    system.canal.route(/recipe|food/, async (request, context) => {
      const results = await vaultService.search(request.input);
      return {
        message: `📂 Found ${results.length} files`,
        records: results
      };
    });
    
    const search = await system.sessionManager.process(sessionId, { 
      type: 'query',
      input: 'show me recipes' 
    });
    console.log(`   Canal response: ${search.content?.message || 'no message'}`);
    console.log(`   Records: ${search.content?.records?.length || 0}`);
    
    if (search.content?.records?.length > 1) {
      // Select #2 
      const select = await system.sessionManager.process(sessionId, { 
        type: 'select',
        input: '2' 
      });
      console.log(`   Selected: ${select.content?.name || 'none'}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

testFlow().catch(console.error);