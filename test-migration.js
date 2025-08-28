const VaultService = require('./src/v2/services/vaultService');

async function test() {
  console.log('Testing direct vault access...');
  const vault = new VaultService();
  const recipes = await vault.getRecipes();
  console.log('Found in vault:', recipes);
}

test();