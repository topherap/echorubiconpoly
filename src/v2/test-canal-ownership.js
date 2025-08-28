/*
 * 🧪 CANAL OWNERSHIP CONTEXT TEST
 * 
 * Tests the critical ownership context generation that prevents
 * "thank you for sharing" responses with vault content
 */

const { createCanalSystem } = require('./core/canal');
const PersonaService = require('./services/personaService');

// Mock services for testing
class MockVaultService {
  async search(query) {
    return [
      { title: 'Carnivore Ice Cream Recipe', source: 'vault', id: '1' },
      { title: 'Bone Broth Preparation', source: 'vault', id: '2' },
      { title: 'Organ Meat Cooking Guide', source: 'vault', id: '3' }
    ];
  }
  
  async selectItem(index) {
    const items = [
      { content: 'Heavy cream, eggs, vanilla extract. Mix and freeze.', source: 'vault' },
      { content: 'Beef bones simmered for 24 hours with salt.', source: 'vault' },
      { content: 'Liver seared quickly to retain nutrients.', source: 'vault' }
    ];
    return items[index] || { content: 'Item not found', source: 'vault' };
  }
}

class MockModelManager {
  async query(input, systemPrompt) {
    // Mock AI that would normally say "thank you for sharing"
    // but should be prevented by ownership context
    return {
      response: `Analysis: ${input}`,
      systemPromptReceived: systemPrompt,
      metadata: { modelUsed: 'mock' }
    };
  }
}

// Test the canal ownership context generation
async function testOwnershipContext() {
  console.log('🧪 Testing Canal Ownership Context Generation\n');
  
  // Create canal system with mock services
  const system = createCanalSystem({
    personaService: new PersonaService(),
    vaultService: new MockVaultService(),
    modelManager: new MockModelManager()
  });
  
  // Test 1: Vault query should generate ownership context
  console.log('Test 1: Vault Query Ownership Context');
  console.log('=====================================');
  
  const vaultQueryResult = await system.processWithLocks('what are my recipes', {
    source: 'vault',
    userId: 'test_user',
    sessionId: 'test_session_1'
  });
  
  console.log('Input:', 'what are my recipes');
  console.log('Source:', 'vault');
  console.log('Generated System Prompt:');
  console.log(vaultQueryResult.context.systemPrompt);
  console.log('\n✅ Should contain ownership language like "MY personal vault entries"');
  console.log('✅ Should contain "Never say thank you for sharing"');
  console.log('✅ Should contain "this is MY content"');
  
  // Verify ownership context is present
  const systemPrompt = vaultQueryResult.context.systemPrompt;
  const hasOwnership = systemPrompt.includes('MY personal vault entries');
  const hasNoThankYou = systemPrompt.includes('Never say "thank you for sharing"');
  const hasMyContent = systemPrompt.includes('MY content');
  
  console.log('\n🔍 Verification:');
  console.log(`- Contains ownership language: ${hasOwnership ? '✅' : '❌'}`);
  console.log(`- Contains no-thank-you rule: ${hasNoThankYou ? '✅' : '❌'}`);
  console.log(`- Contains MY content: ${hasMyContent ? '✅' : '❌'}`);
  
  // Test 2: Selection with vault content should maintain ownership
  console.log('\n\nTest 2: Selection Ownership Context');
  console.log('=====================================');
  
  // First simulate a search that returns results
  const sessionId = 'test_session_2';
  const searchResult = await system.processWithSession(sessionId, {
    input: 'carnivore recipes',
    type: 'query'
  });
  
  // Then select an item (simulate user typing "1")
  const selectionResult = await system.processWithSession(sessionId, '1');
  
  console.log('Input:', '1 (selection)');
  console.log('Context source:', selectionResult.context.source);
  console.log('Is vault content:', selectionResult.context.isVaultContent);
  console.log('Generated System Prompt:');
  console.log(selectionResult.context.systemPrompt);
  
  const selectionPrompt = selectionResult.context.systemPrompt;
  const maintainsOwnership = selectionPrompt.includes('MY personal vault entries');
  const hasSelectionContext = selectionPrompt.includes('Currently examining');
  
  console.log('\n🔍 Selection Verification:');
  console.log(`- Maintains ownership language: ${maintainsOwnership ? '✅' : '❌'}`);
  console.log(`- Has selection context: ${hasSelectionContext ? '✅' : '❌'}`);
  
  // Test 3: Non-vault content should NOT have ownership context
  console.log('\n\nTest 3: Non-Vault Content (Control Test)');
  console.log('=========================================');
  
  const generalResult = await system.processWithLocks('what is the weather', {
    source: 'general',
    userId: 'test_user',
    sessionId: 'test_session_3'
  });
  
  console.log('Input:', 'what is the weather');
  console.log('Source:', 'general');
  console.log('Generated System Prompt:');
  console.log(generalResult.context.systemPrompt || '(no special system prompt)');
  
  const generalPrompt = generalResult.context.systemPrompt || '';
  const shouldNotHaveOwnership = !generalPrompt.includes('MY personal vault entries');
  
  console.log('\n🔍 General Query Verification:');
  console.log(`- Should NOT have ownership language: ${shouldNotHaveOwnership ? '✅' : '❌'}`);
  
  // Test 4: Contextual references with vault content
  console.log('\n\nTest 4: Contextual References with Vault Content');
  console.log('===============================================');
  
  // Create session with vault selection history
  const contextSessionId = 'context_session';
  await system.processWithSession(contextSessionId, 'show me recipes');
  await system.processWithSession(contextSessionId, '2'); // Select second item
  
  // Now make contextual reference
  const contextualResult = await system.processWithSession(contextSessionId, 'tell me more about this');
  
  console.log('Input:', 'tell me more about this');
  console.log('Has reference:', contextualResult.context.locks?.context?.hasReference);
  console.log('Reference type:', contextualResult.context.locks?.context?.referenceType);
  console.log('Generated System Prompt:');
  console.log(contextualResult.context.systemPrompt);
  
  const contextualPrompt = contextualResult.context.systemPrompt;
  const hasContextualOwnership = contextualPrompt.includes('MY personal vault entries');
  const hasReferenceContext = contextualPrompt.includes('User is referencing');
  
  console.log('\n🔍 Contextual Reference Verification:');
  console.log(`- Maintains ownership in contextual reference: ${hasContextualOwnership ? '✅' : '❌'}`);
  console.log(`- Has reference context: ${hasReferenceContext ? '✅' : '❌'}`);
  
  // Final Assessment
  console.log('\n\n🎯 FINAL ASSESSMENT');
  console.log('===================');
  
  const allTests = [
    hasOwnership && hasNoThankYou && hasMyContent,
    maintainsOwnership && hasSelectionContext,
    shouldNotHaveOwnership,
    hasContextualOwnership && hasReferenceContext
  ];
  
  const passedTests = allTests.filter(Boolean).length;
  const totalTests = allTests.length;
  
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('✅ ALL TESTS PASSED - Ownership context is working correctly!');
    console.log('✅ Vault content will properly generate "MY" ownership language');
    console.log('✅ This should prevent "thank you for sharing" responses');
  } else {
    console.log('❌ SOME TESTS FAILED - Ownership context needs fixing');
    console.log('❌ "Thank you for sharing" responses may still occur');
  }
  
  return {
    passed: passedTests === totalTests,
    results: {
      vaultQuery: hasOwnership && hasNoThankYou && hasMyContent,
      selection: maintainsOwnership && hasSelectionContext,
      nonVault: shouldNotHaveOwnership,
      contextual: hasContextualOwnership && hasReferenceContext
    }
  };
}

// Run if called directly
if (require.main === module) {
  testOwnershipContext()
    .then(results => {
      console.log('\n📊 Test Results:', results);
      process.exit(results.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test failed with error:', error);
      process.exit(1);
    });
}

module.exports = { testOwnershipContext, MockVaultService, MockModelManager };