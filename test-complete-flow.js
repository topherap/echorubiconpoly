// test-complete-flow.js
const { createCanalSystem } = require('./src/v2/core/canal');
const VaultService = require('./src/v2/services/vaultService');
const PersonaService = require('./src/v2/services/personaService');

async function testCompleteFlow() {
  // Initialize services
  const { canal, sessionManager } = createCanalSystem();
  const testVaultPath = require('path').join(__dirname, 'test-data', 'vault');
  const vaultService = new VaultService({ vaultPath: testVaultPath });
  const personaService = new PersonaService();
  
  const sessionId = 'complete-flow-test';
  
  // Register recipe route
  canal.route(/recipes|recipe/, async (request, context) => {
    const recipes = await vaultService.getRecipes();
    return {
      message: `📂 Found ${recipes.length} recipes:\n` +
        recipes.map(r => `${r.index}. ${r.name}`).join('\n'),
      source: 'vault',
      records: recipes
    };
  });
  
  // Register selection route
  canal.route(/^[0-9]+$/, async (request, context) => {
    const selectedIndex = parseInt(request.input);
    if (!context.lastResults) {
      return { message: "No recent list to select from." };
    }
    const selected = context.lastResults[selectedIndex - 1];
    if (!selected) {
      return { message: `No item at position ${selectedIndex}` };
    }
    return {
      message: `📄 Selected: ${selected.name}`,
      selectedRecord: selected
    };
  }, 10);
  
  // Register "this" reference route
  canal.route(/this|that/, async (request, context) => {
    const selected = context.selectedRecord || context.lastSelection;
    if (selected) {
      return {
        message: `Still discussing: ${selected.name}`,
        maintained: true
      };
    }
    return { message: "What are you referring to?" };
  }, 5);
  
  console.log('=== COMPLETE CONTEXT FLOW TEST ===\n');
  
  // Test 1: List recipes
  console.log('1. Testing: "what are my recipes?"');
  const result1 = await sessionManager.process(sessionId, {
    type: 'query',
    input: 'what are my recipes?'
  });
  console.log('Response:', result1.content?.message?.split('\n')[0]);
  console.log('Records found:', result1.content?.records?.length || 0);
  
  // Check context after first query
  const contextAfterQuery = sessionManager.getContext(sessionId);
  console.log('Context lastResults after query:', contextAfterQuery?.lastResults?.length || 0);
  
  // Test 2: Select item
  console.log('\n2. Testing: "2"');
  const result2 = await sessionManager.process(sessionId, {
    type: 'select',
    input: '2'
  });
  console.log('Selection:', result2.content?.name || result2.content?.message || 'No selection made');
  
  // Test 3: Reference "this"
  console.log('\n3. Testing: "what about this?"');
  const result3 = await sessionManager.process(sessionId, {
    type: 'query',
    input: 'what about this?'
  });
  console.log('Context response:', result3.content?.message || `References: ${result3.content?.current?.name || 'none'}`);
  
  // Test 4: Session verification
  const context = sessionManager.getContext(sessionId);
  console.log('\n4. Session State:');
  console.log('Has context:', !!context);
  console.log('Last results count:', context?.lastResults?.length || 0);
  console.log('Selected record:', context?.selectedRecord?.name || context?.lastSelection?.name || 'None');
}

testCompleteFlow();