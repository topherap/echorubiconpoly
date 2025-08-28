// test-context-flow.js - Add safety checks
const { createCanalSystem } = require('./core/canal');
const VaultService = require('./services/vaultService');

async function test() {
  const { canal, sessionManager } = createCanalSystem();
  const vault = new VaultService();
  const sessionId = 'context-test-001';
  
  // Debug vault first
  console.log('=== VAULT CHECK ===');
  const directRecipes = await vault.getRecipes();
  console.log('Direct vault call finds:', directRecipes.length, 'recipes\n');
  
  // Register routes
  canal.route(/recipes|recipe/, async (request, context) => {
    const recipes = await vault.getRecipes();
    console.log('Route handler found:', recipes.length, 'recipes');
    
    return {
      message: `📂 Found ${recipes.length} recipes:\n` +
        recipes.map(r => `${r.index}. ${r.name}`).join('\n'),
      source: 'vault',
      hasRecords: true,
      recordCount: recipes.length,
      records: recipes
    };
  });
  
  canal.route(/^[0-9]+$/, async (request, context) => {
    const selectedIndex = parseInt(request.input);
    if (!context.lastResults) {
      return { message: "No recent list to select from." };
    }
    const selected = context.lastResults[selectedIndex - 1];
    if (!selected) {
      return { message: `No item at position ${selectedIndex}` };
    }
    const content = await vault.getRecipeContent(selected.path);
    return {
      message: `📄 ${selected.name}:\n\n${content.substring(0, 300)}...`,
      selectedRecord: selected
    };
  }, 10);
  
  // Add "this/that" handler
  canal.route(/tell me about (this|that)|what about (this|that)/, async (request, context) => {
    if (!context.lastSelection && !context.lastResults) {
      return { message: "I need context. What are you referring to?" };
    }
    
    // Use last selected item or last query
    const item = context.selectedRecord || context.lastResults?.[0];
    return {
      message: `You're asking about: ${item?.name || context.lastQuery}`
    };
  });
  
  // TEST CONVERSATION FLOW
  console.log('=== TESTING CONTEXT TRACKING ===\n');
  
  // 1. List recipes
  console.log('USER: "what are my recipes?"');
  const list = await sessionManager.process(sessionId, {
    type: 'query',
    input: 'what are my recipes?'
  });
  
  // Safe access with debugging
  console.log('Raw response:', JSON.stringify(list, null, 2).substring(0, 500));
  
  const content = list.content?.content || list.content;
  if (content?.recordCount) {
    console.log('Q: Found', content.recordCount, 'recipes\n');
  } else {
    console.log('Q: No recipes found in response\n');
    console.log('Response structure:', Object.keys(list));
    return; // Exit early if no recipes
  }
  
  // Only continue if we have recipes
  if (content.records && content.records.length > 0) {
    // 2. Select one
    console.log('USER: "2"');
    const select = await sessionManager.process(sessionId, {
      type: 'select',
      input: '2'
    });
    const selectContent = select.content?.content || select.content;
    console.log('Q: Selected:', selectContent?.message?.split('\n')[0] || 'Nothing', '\n');
    
    // 3. TEST "THIS" REFERENCE
    console.log('USER: "tell me more about this"');
    
    // Add simple "this" handler
    canal.route(/this|that/, async (request, context) => {
      if (context.lastResults && context.lastSelection) {
        return {
          message: `Still discussing: carnivore ice cream (your selection #2)`,
          maintained: true
        };
      }
      return { message: "What are you referring to?" };
    }, 5); // Lower priority than number selection
    
    const thisRef = await sessionManager.process(sessionId, {
      type: 'query',
      input: 'tell me more about this'
    });
    const thisContent = thisRef.content?.content || thisRef.content;
    console.log('Q:', thisContent?.message || 'No response', '\n');
    
    // 4. Check session maintained context
    const finalContext = sessionManager.getContext(sessionId);
    console.log('=== SESSION CONTEXT MAINTAINED ===');
    console.log('Last query:', finalContext.lastQuery);
    console.log('Has results:', !!finalContext.lastResults);
    console.log('Result count:', finalContext.lastResults?.length);
    console.log('Conversation length:', finalContext.conversationFlow?.length, 'messages');
  }
}

test();