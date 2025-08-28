// C:\Users\tophe\Documents\EchoRubicon\src\v2\test-vault-service.js
const VaultService = require('./services/vaultService');
const path = require('path');

async function test() {
  // Your vault from previous conversations
  const vault = new VaultService({ 
    vaultPath: 'D:\\Obsidian Vault' 
  });
  
  console.log('=== VAULT SERVICE TEST ===\n');
  console.log('Vault path:', vault.getVaultInfo().path);
  console.log('Vault exists:', vault.getVaultInfo().exists);
  
  // Test 1: List all files
  console.log('\n1. Testing: list all files');
  const allFiles = await vault.search('');
  console.log(`Found ${allFiles.length} total files`);
  
  // Test 2: Search for recipes (you have these based on past chats)
  console.log('\n2. Testing: recipes');
  const recipes = await vault.search('recipes');
  console.log(`Found ${recipes.length} recipes`);
  if (recipes.length > 0) {
    recipes.slice(0, 3).forEach(r => 
      console.log(`  - ${r.name} (${r.directory || 'root'})`)
    );
  }
  
  // Test 3: Search for Echo project files
  console.log('\n3. Testing: "echo"');
  const echoFiles = await vault.search('echo');
  console.log(`Found ${echoFiles.length} files with "echo"`);
  
  // Test 4: Test exact search for your project
  console.log('\n4. Testing exact: "Echo Rubicon"');
  const exactFiles = await vault.search('"Echo Rubicon"');
  console.log(`Found ${exactFiles.length} exact matches`);
  
  // Test 5: Get content from first recipe
  if (recipes.length > 0) {
    console.log('\n5. Testing content retrieval');
    try {
      const content = await vault.getContent(recipes[0].path);
      console.log(`✅ Successfully read ${recipes[0].name}`);
      console.log(`Preview: ${content.substring(0, 100)}...`);
    } catch (error) {
      console.log(`❌ Error reading file: ${error.message}`);
    }
  }
}

test().catch(console.error);