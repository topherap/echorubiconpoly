// test-migration.js - USE YOUR REAL ARCHITECTURE
const { createCanalSystem } = require('./core/canal');
const VaultService = require('./services/vaultService');

async function test() {
  // Create canal system with session management
  const { canal, sessionManager } = createCanalSystem();
  const vault = new VaultService();
  
  // Register recipe listing route
  canal.route(/recipes|recipe/, async (request, context) => {
    const recipes = await vault.getRecipes();
    
    return {
      content: {
        message: `📂 Found ${recipes.length} recipes:\n` +
          recipes.map(r => `${r.index}. ${r.name}`).join('\n'),
        source: 'vault',
        hasRecords: true,
        recordCount: recipes.length,
        records: recipes  // SessionManager will store this
      }
    };
  });
  
  // Register number selection route  
  canal.route(/^[0-9]+$/, async (request, context) => {
    const selectedIndex = parseInt(request.input);
    
    // Context has lastResults from SessionManager!
    if (!context.lastResults) {
      return {
        content: {
          message: "No recent list to select from. Try searching first.",
          source: 'error'
        }
      };
    }
    
    const records = context.lastResults;
    if (selectedIndex < 1 || selectedIndex > records.length) {
      return {
        content: {
          message: `Invalid selection. Choose 1-${records.length}`,
          source: 'error'  
        }
      };
    }
    
    const selected = records[selectedIndex - 1];
    const content = await vault.getRecipeContent(selected.path);
    
    return {
      content: {
        message: `📄 ${selected.name}:\n\n${content.substring(0, 500)}...`,
        source: 'vault',
        selectedRecord: selected,
        fullContent: content
      }
    };
  }, 10); // Higher priority for number selection
  
  // TEST WITH SESSION
  const sessionId = 'test-session-001';
  
  console.log('1. Getting recipes with session...');
  const listResult = await sessionManager.process(sessionId, {
    type: 'query',
    input: 'what are my recipes?'
  });
  console.log('Full response structure:', JSON.stringify(listResult, null, 2).substring(0, 500));
  console.log('Found:', listResult.content.content.recordCount, 'recipes');
  
  console.log('\n2. Selecting #2 (carnivore ice cream)...');
  const selectResult = await sessionManager.process(sessionId, {
    type: 'select',
    input: '2'
  });
  
  if (selectResult.content.content) {
    const msg = selectResult.content.content.message;
    console.log('Selected:', msg.split('\n')[0]); // First line (title)
  }
  
  console.log('\n3. Checking session context...');
  const context = sessionManager.getContext(sessionId);
  console.log('Context maintains:', {
    lastQuery: context.lastQuery,
    hasResults: !!context.lastResults,
    resultCount: context.lastResults?.length
  });
}

test();