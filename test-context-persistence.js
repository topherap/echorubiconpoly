// test-context-persistence.js
const { createCanalSystem } = require('./src/v2/core/canal');
const VaultService = require('./src/v2/services/vaultService');

async function testContextPersistence() {
  const { canal, sessionManager } = createCanalSystem();
  const vaultService = new VaultService();
  const sessionId = 'test-persistence';
  
  console.log('=== TESTING CONTEXT PERSISTENCE ===\n');
  
  // Step 1: Get recipes through proper session flow
  console.log('1. Getting recipes through session...');
  const recipes = await vaultService.getRecipes();
  console.log('Found recipes:', recipes.length);
  
  // Create a mock response to trigger context update
  const mockResponse = {
    content: {
      message: `Found ${recipes.length} recipes`,
      records: recipes
    },
    metadata: { handled: true }
  };
  
  // Get session and update context properly
  const session = sessionManager.getSession(sessionId);
  sessionManager.updateSessionContext(session, { type: 'query', input: 'recipes' }, mockResponse);
  
  console.log('Context after recipe query:');
  const context1 = sessionManager.getContext(sessionId);
  console.log('- Has lastResults:', !!context1.lastResults);
  console.log('- Results count:', context1.lastResults?.length || 0);
  console.log('- Awaiting selection:', context1.awaitingSelection);
  
  // Step 2: Simulate selection through proper flow
  console.log('\n2. Simulating selection...');
  const selectedIndex = 2;
  if (context1.lastResults && context1.lastResults[selectedIndex - 1]) {
    const selected = context1.lastResults[selectedIndex - 1];
    
    const selectionResponse = {
      content: {
        message: `Selected: ${selected.name}`,
        selectedRecord: selected
      },
      metadata: { handled: true }
    };
    
    sessionManager.updateSessionContext(session, { type: 'selection', input: '2' }, selectionResponse);
    
    console.log('Context after selection:');
    const context2 = sessionManager.getContext(sessionId);
    console.log('- Has selectedRecord:', !!context2.selectedRecord);
    console.log('- Selected name:', context2.selectedRecord?.name);
    console.log('- Has lastSelection:', !!context2.lastSelection);
    console.log('- Awaiting selection:', context2.awaitingSelection);
    
    // Step 3: Test "this" reference context
    console.log('\n3. Testing context for "this" reference...');
    const context3 = sessionManager.getContext(sessionId);
    
    if (context3.selectedRecord) {
      console.log('✅ Context persisted successfully');
      console.log('- Can reference "this":', context3.selectedRecord.name);
      console.log('- Full context available for route handlers');
    } else {
      console.log('❌ Context persistence failed');
    }
  } else {
    console.log('❌ No recipes available for selection test');
  }
  
  // Step 4: Verify session state
  console.log('\n4. Session state verification:');
  console.log('- Session exists:', sessionManager.sessions.has(sessionId));
  console.log('- History length:', session.history.length);
  console.log('- Context keys:', Object.keys(session.context));
}

testContextPersistence();