// test-real-vault.js
const VaultService = require('./services/vaultService');

async function test() {
  const vault = new VaultService();
  
  // Get recipes
  const recipes = await vault.getRecipes();
  console.log('Found recipes:');
  recipes.forEach(r => {
    console.log(`${r.index}. ${r.name}`);
  });
  
  // Test reading carnivore ice cream
  const carnivore = recipes.find(r => r.name.includes('carnivore'));
  if (carnivore) {
    console.log('\nReading carnivore ice cream...');
    const content = await vault.getRecipeContent(carnivore.path);
    console.log('First 200 chars:', content.substring(0, 200));
  }
}

test();