const canal = require('./core/canal');
const VaultService = require('./services/vaultService');

async function test() {
  // Register handlers (same as before)
  const vault = new VaultService();
  
  // Recipe handler
  canal.route(/recipes|recipe/, async (input) => {
    const recipes = await vault.getRecipes();
    return {
      content: {
        message: `📂 Found ${recipes.length} recipes:\n` +
          recipes.map(r => `${r.index}. ${r.name}`).join('\n'),
        records: recipes
      },
      metadata: { handled: true }
    };
  });
  
  // Number selection handler
  canal.route(/^[0-9]+$/, async (input) => {
    const selectedIndex = parseInt(input);
    const recipes = await vault.getRecipes();
    
    if (selectedIndex === 2) {  // Carnivore ice cream
      const selected = recipes[selectedIndex - 1];
      const content = await vault.getRecipeContent(selected.path);
      return {
        content: {
          message: `📄 ${selected.name}:\n\n${content.substring(0, 200)}...`,
          fullContent: content
        },
        metadata: { handled: true }
      };
    }
  });
  
  // Test flow
  console.log('1. Getting recipes...');
  await canal.process({ input: "what are my recipes?", mode: 'text' });
  
  console.log('\n2. Selecting carnivore ice cream (#2)...');
  const result = await canal.process({ input: "2", mode: 'text' });
  
  console.log('\nSelected:', result.content.content.message);
}

test();