// tools/inspect-recipe-capsules.js
const fs = require('fs');
const path = require('path');

const capsulesPath = 'D:\\Obsidian Vault\\.echo\\capsules';
const capsuleFiles = fs.readdirSync(capsulesPath).filter(f => f.endsWith('.json'));

console.log('=== INSPECTING "RECIPE" CAPSULES ===\n');

let actualRecipes = [];
let recipeConversations = [];

// Check each capsule that might be recipe-related
for (const file of capsuleFiles) {
  try {
    const content = JSON.parse(fs.readFileSync(path.join(capsulesPath, file), 'utf8'));
    const text = JSON.stringify(content).toLowerCase();
    
    if (text.includes('recipe')) {
      // Check if it's an actual recipe (has ingredients, instructions)
      const hasIngredients = text.includes('ingredient') || text.includes('cup') || 
                           text.includes('tablespoon') || text.includes('teaspoon');
      const hasInstructions = text.includes('mix') || text.includes('bake') || 
                            text.includes('cook') || text.includes('stir');
      
      if (hasIngredients || hasInstructions) {
        actualRecipes.push({
          file,
          type: content.type,
          summary: content.summary || content.content?.slice(0, 200) || 'No summary',
          fullContent: content
        });
      } else {
        // It's a conversation about recipes
        recipeConversations.push({
          file,
          preview: (content.input || content.content || content.summary || '').slice(0, 150)
        });
      }
    }
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
  }
}

console.log(`Found ${actualRecipes.length} ACTUAL recipes`);
console.log(`Found ${recipeConversations.length} CONVERSATIONS about recipes\n`);

if (actualRecipes.length > 0) {
  console.log('=== ACTUAL RECIPES ===');
  actualRecipes.forEach((recipe, i) => {
    console.log(`\n--- Recipe ${i + 1} ---`);
    console.log('Summary:', recipe.summary);
    
    // Try to extract the recipe name and key details
    const content = recipe.fullContent;
    if (content.messages) {
      // It's a conversation format
      const recipeMessage = content.messages.find(m => 
        m.content && (m.content.includes('ingredient') || m.content.includes('Ingredient'))
      );
      if (recipeMessage) {
        console.log('Recipe content:', recipeMessage.content.slice(0, 300) + '...');
      }
    } else if (content.content) {
      // Direct content
      console.log('Content:', content.content.slice(0, 300) + '...');
    }
  });
} else {
  console.log('NO ACTUAL RECIPES FOUND - all are conversations about recipes');
}

console.log('\n=== SAMPLE RECIPE CONVERSATIONS ===');
recipeConversations.slice(0, 3).forEach(conv => {
  console.log(`- "${conv.preview}..."`);
});