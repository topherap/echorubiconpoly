/*
 * 🧪 SELECTION PROCESSING WITH OWNERSHIP CONTEXT TEST
 * 
 * Tests the critical selection processing functionality to ensure:
 * 1. Selections are properly detected and processed
 * 2. Vault content ownership context is maintained during selection
 * 3. Selection state transitions work correctly
 * 4. Invalid selections are handled gracefully
 * 5. Multiple selection scenarios work as expected
 */

const { createCanalSystem } = require('./core/canal');
const PersonaService = require('./services/personaService');
const { DetailedMockVaultService, TrackingMockModelManager } = require('./test-vault-flow');

// Selection-specific test scenarios
async function testSelectionProcessing() {
  console.log('🧪 Testing Selection Processing with Ownership Context\n');
  
  const vaultService = new DetailedMockVaultService();
  const modelManager = new TrackingMockModelManager();
  
  const system = createCanalSystem({
    personaService: new PersonaService(),
    vaultService,
    modelManager
  });
  
  let testResults = [];
  
  // TEST 1: Basic Selection Processing
  console.log('TEST 1: Basic Selection Processing');
  console.log('==================================');
  
  const sessionId1 = 'selection_test_1';
  
  // First, perform a search to set up selection context
  const searchResult = await system.processWithSession(sessionId1, 'show me my recipes');
  console.log('Search completed, records found:', searchResult.content?.records?.length || 0);
  console.log('Awaiting selection:', searchResult.context.awaitingSelection);
  
  // Now make a selection
  const selection1 = await system.processWithSession(sessionId1, '2');
  
  console.log('\nSelection Input:', '2');
  console.log('Selection detected:', selection1.metadata.type === 'selection');
  console.log('Selected content preview:', selection1.content.content?.slice(0, 60) + '...');
  console.log('Vault source maintained:', selection1.metadata.source === 'vault');
  console.log('Ownership context:', selection1.context.systemPrompt?.includes('MY personal vault'));
  console.log('Selection context:', selection1.context.systemPrompt?.includes('Currently examining'));
  console.log('No longer awaiting selection:', !selection1.context.awaitingSelection);
  
  testResults.push({
    name: 'basic_selection',
    passed: selection1.metadata.type === 'selection' && 
           selection1.metadata.source === 'vault' &&
           selection1.context.systemPrompt?.includes('MY personal vault') &&
           selection1.context.systemPrompt?.includes('Currently examining')
  });
  
  console.log(`✅ Basic selection: ${testResults[0].passed ? 'PASSED' : 'FAILED'}`);
  
  // TEST 2: Invalid Selection Handling
  console.log('\n\nTEST 2: Invalid Selection Handling');
  console.log('==================================');
  
  const sessionId2 = 'selection_test_2';
  
  // Set up search context
  await system.processWithSession(sessionId2, 'my health notes');
  
  // Try invalid selections
  const invalidSelections = ['0', '99', '-1', 'abc'];
  let invalidResults = [];
  
  for (const invalid of invalidSelections) {
    const result = await system.processWithSession(sessionId2, invalid);
    invalidResults.push({
      input: invalid,
      isError: result.metadata.error === true,
      message: result.content
    });
    console.log(`Invalid selection "${invalid}":`, result.metadata.error ? 'Rejected ✅' : 'Accepted ❌');
  }
  
  const allInvalidRejected = invalidResults.every(r => r.isError);
  
  testResults.push({
    name: 'invalid_selection_handling',
    passed: allInvalidRejected
  });
  
  console.log(`✅ Invalid selection handling: ${allInvalidRejected ? 'PASSED' : 'FAILED'}`);
  
  // TEST 3: Selection with Persona Context
  console.log('\n\nTEST 3: Selection with Persona Context');
  console.log('======================================');
  
  const sessionId3 = 'selection_test_3';
  
  // Search with persona-triggering language
  const personaSearch = await system.processWithSession(sessionId3, 'yo bro, show me my fucking recipes');
  console.log('Persona detected in search:', personaSearch.context.locks?.persona?.detected);
  
  // Make selection with persona context
  const personaSelection = await system.processWithSession(sessionId3, '1');
  
  console.log('\nPersona selection completed');
  console.log('Persona maintained:', personaSelection.context.locks?.persona?.detected);
  console.log('Has ownership context:', personaSelection.context.systemPrompt?.includes('MY personal vault'));
  console.log('Has persona styling:', personaSelection.context.systemPrompt?.includes('Response style:'));
  console.log('Has selection context:', personaSelection.context.systemPrompt?.includes('Currently examining'));
  
  testResults.push({
    name: 'persona_selection',
    passed: personaSelection.context.locks?.persona?.detected &&
           personaSelection.context.systemPrompt?.includes('MY personal vault') &&
           personaSelection.context.systemPrompt?.includes('Response style:')
  });
  
  console.log(`✅ Persona selection: ${testResults[2].passed ? 'PASSED' : 'FAILED'}`);
  
  // TEST 4: Multiple Selections in Same Session
  console.log('\n\nTEST 4: Multiple Selections in Same Session');
  console.log('===========================================');
  
  const sessionId4 = 'selection_test_4';
  let selectionHistory = [];
  
  // First search and selection
  await system.processWithSession(sessionId4, 'show my recipes');
  const firstSelection = await system.processWithSession(sessionId4, '1');
  selectionHistory.push({
    selection: 1,
    content: firstSelection.content.id,
    hasOwnership: firstSelection.context.systemPrompt?.includes('MY personal vault')
  });
  
  // Second search and selection in same session
  await system.processWithSession(sessionId4, 'find my health notes');
  const secondSelection = await system.processWithSession(sessionId4, '2');
  selectionHistory.push({
    selection: 2,
    content: secondSelection.content.id,
    hasOwnership: secondSelection.context.systemPrompt?.includes('MY personal vault')
  });
  
  console.log('Multiple selections completed:', selectionHistory.length);
  console.log('First selection ID:', selectionHistory[0].content);
  console.log('Second selection ID:', selectionHistory[1].content);
  console.log('Both maintained ownership:', selectionHistory.every(s => s.hasOwnership));
  
  testResults.push({
    name: 'multiple_selections',
    passed: selectionHistory.length === 2 && 
           selectionHistory.every(s => s.hasOwnership) &&
           selectionHistory[0].content !== selectionHistory[1].content
  });
  
  console.log(`✅ Multiple selections: ${testResults[3].passed ? 'PASSED' : 'FAILED'}`);
  
  // TEST 5: Selection State Management
  console.log('\n\nTEST 5: Selection State Management');
  console.log('==================================');
  
  const sessionId5 = 'selection_test_5';
  
  // Check initial state (no selection pending)
  const initialState = system.sessionManager.getContext(sessionId5);
  console.log('Initial awaiting selection:', initialState?.awaitingSelection || false);
  
  // Perform search (should set awaiting selection)
  await system.processWithSession(sessionId5, 'my content');
  const afterSearch = system.sessionManager.getContext(sessionId5);
  console.log('After search awaiting selection:', afterSearch?.awaitingSelection || false);
  
  // Make selection (should clear awaiting selection)
  await system.processWithSession(sessionId5, '1');
  const afterSelection = system.sessionManager.getContext(sessionId5);
  console.log('After selection awaiting selection:', afterSelection?.awaitingSelection || false);
  console.log('Has last selection:', !!afterSelection?.lastSelection);
  
  // Non-selection input should maintain state
  await system.processWithSession(sessionId5, 'tell me more about this');
  const afterContext = system.sessionManager.getContext(sessionId5);
  console.log('After contextual still has selection:', !!afterContext?.lastSelection);
  console.log('Still not awaiting selection:', !afterContext?.awaitingSelection);
  
  testResults.push({
    name: 'selection_state_management',
    passed: !initialState?.awaitingSelection &&
           afterSearch?.awaitingSelection &&
           !afterSelection?.awaitingSelection &&
           !!afterSelection?.lastSelection &&
           !!afterContext?.lastSelection &&
           !afterContext?.awaitingSelection
  });
  
  console.log(`✅ Selection state management: ${testResults[4].passed ? 'PASSED' : 'FAILED'}`);
  
  // TEST 6: Selection with Contextual References
  console.log('\n\nTEST 6: Selection with Contextual References');
  console.log('============================================');
  
  const sessionId6 = 'selection_test_6';
  
  // Set up selection context
  await system.processWithSession(sessionId6, 'show me my recipes');
  const selectionResult = await system.processWithSession(sessionId6, '3');
  
  // Make contextual reference that should use the selection
  const contextualRef = await system.processWithSession(sessionId6, 'what are the benefits of this?');
  
  console.log('Contextual reference processed');
  console.log('Has context reference:', contextualRef.context.locks?.context?.hasReference);
  console.log('Reference type:', contextualRef.context.locks?.context?.referenceType);
  console.log('Maintains ownership:', contextualRef.context.systemPrompt?.includes('MY personal vault'));
  console.log('References selection:', contextualRef.context.systemPrompt?.includes('Currently examining'));
  
  testResults.push({
    name: 'selection_contextual_references',
    passed: contextualRef.context.locks?.context?.hasReference &&
           contextualRef.context.systemPrompt?.includes('MY personal vault') &&
           contextualRef.context.systemPrompt?.includes('Currently examining')
  });
  
  console.log(`✅ Selection contextual references: ${testResults[5].passed ? 'PASSED' : 'FAILED'}`);
  
  // ANALYSIS: Check AI Model Interactions
  console.log('\n\nAI MODEL INTERACTION ANALYSIS');
  console.log('=============================');
  
  const allPrompts = modelManager.getPromptHistory();
  const selectionPrompts = allPrompts.filter(p => p.input.includes('selection') || p.systemPrompt?.includes('Currently examining'));
  const ownershipPrompts = allPrompts.filter(p => p.hasOwnership);
  
  console.log(`Total AI interactions: ${allPrompts.length}`);
  console.log(`Selection-related interactions: ${selectionPrompts.length}`);
  console.log(`Interactions with ownership context: ${ownershipPrompts.length}`);
  console.log(`Ownership coverage: ${Math.round((ownershipPrompts.length / allPrompts.length) * 100)}%`);
  
  // ANALYSIS: Check Vault Service Interactions  
  console.log('\n\nVAULT SERVICE INTERACTION ANALYSIS');
  console.log('==================================');
  
  const vaultHistory = vaultService.getHistory();
  console.log(`Total vault searches: ${vaultHistory.searches.length}`);
  console.log(`Total vault selections: ${vaultHistory.selections.length}`);
  console.log(`Selection success rate: ${Math.round((vaultHistory.selections.length / (vaultHistory.selections.length + invalidResults.filter(r => r.isError).length)) * 100)}%`);
  
  // FINAL ASSESSMENT
  console.log('\n\n🎯 SELECTION PROCESSING FINAL ASSESSMENT');
  console.log('========================================');
  
  const passedTests = testResults.filter(t => t.passed).length;
  const totalTests = testResults.length;
  
  console.log(`Selection Tests Passed: ${passedTests}/${totalTests}`);
  
  testResults.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}: ${test.passed ? '✅ PASSED' : '❌ FAILED'}`);
  });
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL SELECTION TESTS PASSED!');
    console.log('✅ Selection processing works correctly');
    console.log('✅ Ownership context maintained during selections'); 
    console.log('✅ Invalid selections handled gracefully');
    console.log('✅ Multiple selections work in same session');
    console.log('✅ Selection state management is solid');
    console.log('✅ Contextual references work with selections');
    console.log('✅ Ready for integration testing');
  } else {
    console.log('\n❌ SOME SELECTION TESTS FAILED');
    console.log('❌ Selection processing needs fixes before integration');
  }
  
  return {
    passed: passedTests === totalTests,
    testResults,
    metrics: {
      totalTests,
      passedTests,
      aiInteractions: allPrompts.length,
      ownershipCoverage: ownershipPrompts.length / allPrompts.length,
      vaultSelections: vaultHistory.selections.length,
      invalidSelections: invalidResults.filter(r => r.isError).length
    }
  };
}

// Edge case testing
async function testSelectionEdgeCases() {
  console.log('\n\n🔥 TESTING SELECTION EDGE CASES');
  console.log('===============================');
  
  const vaultService = new DetailedMockVaultService();
  const modelManager = new TrackingMockModelManager();
  
  const system = createCanalSystem({
    personaService: new PersonaService(),
    vaultService,
    modelManager
  });
  
  let edgeCaseResults = [];
  
  // Edge Case 1: Selection without prior search
  console.log('\nEdge Case 1: Selection without prior search');
  const orphanSelection = await system.processWithSession('orphan_session', '1');
  console.log('Orphan selection handled:', orphanSelection.metadata.error === true);
  
  edgeCaseResults.push({
    case: 'orphan_selection',
    passed: orphanSelection.metadata.error === true
  });
  
  // Edge Case 2: Selection immediately after another selection
  console.log('\nEdge Case 2: Back-to-back selections');
  const sessionId = 'back_to_back';
  await system.processWithSession(sessionId, 'search query');
  await system.processWithSession(sessionId, '1'); // First selection
  const doubleSelection = await system.processWithSession(sessionId, '2'); // Immediate second selection
  console.log('Double selection handled correctly:', doubleSelection.metadata.error === true);
  
  edgeCaseResults.push({
    case: 'double_selection', 
    passed: doubleSelection.metadata.error === true
  });
  
  // Edge Case 3: Very large selection number
  console.log('\nEdge Case 3: Extremely large selection number');
  await system.processWithSession('large_selection', 'find stuff');
  const largeSelection = await system.processWithSession('large_selection', '999999');
  console.log('Large selection rejected:', largeSelection.metadata.error === true);
  
  edgeCaseResults.push({
    case: 'large_selection',
    passed: largeSelection.metadata.error === true
  });
  
  const edgeCasePassed = edgeCaseResults.filter(e => e.passed).length;
  console.log(`\nEdge Cases Passed: ${edgeCasePassed}/${edgeCaseResults.length}`);
  
  return {
    passed: edgeCasePassed === edgeCaseResults.length,
    edgeCaseResults
  };
}

// Run if called directly
if (require.main === module) {
  Promise.all([
    testSelectionProcessing(),
    testSelectionEdgeCases()
  ])
  .then(([mainResults, edgeResults]) => {
    console.log('\n📊 COMPLETE SELECTION TEST RESULTS');
    console.log('==================================');
    console.log('Main Tests Passed:', mainResults.passed);
    console.log('Edge Cases Passed:', edgeResults.passed);
    console.log('Overall Passed:', mainResults.passed && edgeResults.passed);
    console.log('\nMetrics:', mainResults.metrics);
    
    process.exit((mainResults.passed && edgeResults.passed) ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Selection tests failed with error:', error);
    process.exit(1);
  });
}

module.exports = { testSelectionProcessing, testSelectionEdgeCases };