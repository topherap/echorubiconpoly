const VaultService = require('./src/v2/services/vaultService');

async function checkVault() {
  const testVaultPath = require('path').join(__dirname, 'test-data', 'vault');
  const vaultService = new VaultService({ vaultPath: testVaultPath });
  
  // Check vault info first
  const vaultInfo = vaultService.getVaultInfo();
  console.log(`Vault path: ${vaultInfo.path}`);
  console.log(`Vault exists: ${vaultInfo.exists}`);
  console.log(`Config file: ${vaultInfo.configFile}`);
  console.log('');
  
  const recipes = await vaultService.getRecipes();
  
  console.log(`Found ${recipes.length} items:\n`);
  
  recipes.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.name || item.filename}`);
    console.log(`   Path: ${item.path}`);
    console.log(`   Type: ${item.type || 'unknown'}`);
  });
}

checkVault();