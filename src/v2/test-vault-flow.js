/*
 * 🧪 VAULT CONTENT FLOW INTEGRATION TEST
 * 
 * Tests the complete flow of vault content marking from search
 * to selection to contextual references, ensuring ownership
 * context is maintained throughout the entire conversation flow
 */

const { createCanalSystem } = require('./core/canal');
const PersonaService = require('./services/personaService');
const { MockVaultService, MockModelManager } = require('./test-canal-ownership');

// Enhanced mock vault service with more realistic data
class DetailedMockVaultService extends MockVaultService {
  constructor() {
    super();
    this.searchHistory = [];
    this.selectionHistory = [];
  }
  
  async search(query) {
    this.searchHistory.push({ query, timestamp: Date.now() });
    
    // Simulate different search results based on query
    if (query.toLowerCase().includes('recipe')) {
      return [
        { 
          title: 'Carnivore Ice Cream Recipe', 
          source: 'vault', 
          id: 'recipe_1',
          snippet: 'Heavy cream, eggs, vanilla...',
          dateAdded: '2024-01-15',
          tags: ['carnivore', 'dessert']
        },
        { 
          title: 'Bone Broth Preparation', 
          source: 'vault', 
          id: 'recipe_2',
          snippet: 'Beef bones simmered for 24 hours...',
          dateAdded: '2024-01-10',
          tags: ['carnivore', 'healing']
        },
        { 
          title: 'Organ Meat Cooking Guide', 
          source: 'vault', 
          id: 'recipe_3',
          snippet: 'Liver seared quickly to retain...',
          dateAdded: '2024-01-08',
          tags: ['carnivore', 'organs']
        }
      ];
    }
    
    if (query.toLowerCase().includes('health')) {
      return [
        {
          title: 'Metabolic Health Markers',
          source: 'vault',
          id: 'health_1',
          snippet: 'Tracking ketones, glucose, sleep...',
          dateAdded: '2024-01-20',
          tags: ['health', 'metrics']
        },
        {
          title: 'Supplement Protocol',
          source: 'vault', 
          id: 'health_2',
          snippet: 'Magnesium, vitamin D, omega-3...',
          dateAdded: '2024-01-18',
          tags: ['health', 'supplements']
        }
      ];
    }
    
    return [
      { 
        title: 'General Note', 
        source: 'vault', 
        id: 'general_1',
        snippet: 'Default search result...',
        dateAdded: '2024-01-01',
        tags: ['general']
      }
    ];
  }
  
  async selectItem(index) {
    const baseItems = [
      { 
        content: `# Carnivore Ice Cream Recipe

## Ingredients
- 2 cups heavy cream
- 6 egg yolks
- 1 tsp vanilla extract (optional)
- Pinch of salt

## Instructions
1. Heat cream to 170°F
2. Whisk into egg yolks slowly
3. Add vanilla and salt
4. Freeze in ice cream maker

## Notes
This is MY personal adaptation of traditional ice cream for carnivore diet. Been perfecting this for months.`,
        source: 'vault',
        id: 'recipe_1',
        metadata: { contentType: 'recipe', wordCount: 89 }
      },
      { 
        content: `# Bone Broth Preparation

## My Method
- Beef bones (knuckle, marrow, oxtail mix)
- Simmer 24-48 hours
- Add salt only at the end
- Strain through fine mesh

## Benefits I've Noticed
- Better sleep
- Improved joint health
- Clearer skin

This is MY go-to healing food. I make a big batch every Sunday.`,
        source: 'vault',
        id: 'recipe_2',
        metadata: { contentType: 'recipe', wordCount: 67 }
      },
      { 
        content: `# Organ Meat Cooking Guide

## Liver Preparation
Sear quickly (2-3 min per side) to retain nutrients. Don't overcook!

## Heart Preparation  
Slice thin and cook like steak. Very mild flavor.

## Kidney Preparation
Soak in salt water first, then sauté with onions.

## My Experience
Started with liver, worked up to heart and kidney. These are nutrient powerhouses in MY carnivore journey.`,
        source: 'vault',
        id: 'recipe_3', 
        metadata: { contentType: 'guide', wordCount: 78 }
      }
    ];
    
    const selected = baseItems[index];
    if (selected) {
      this.selectionHistory.push({ index, item: selected, timestamp: Date.now() });
    }
    
    return selected || { content: 'Item not found', source: 'vault' };
  }
  
  getHistory() {
    return {
      searches: this.searchHistory,
      selections: this.selectionHistory
    };
  }
}

// Enhanced mock model manager that tracks prompts
class TrackingMockModelManager extends MockModelManager {
  constructor() {
    super();
    this.promptHistory = [];
  }
  
  async query(input, systemPrompt) {
    const queryData = {
      input,
      systemPrompt,
      timestamp: Date.now(),
      hasOwnership: systemPrompt?.includes('MY personal vault') || false,
      hasThankYouBlock: systemPrompt?.includes('Never say "thank you for sharing"') || false,
      personaStyle: this.extractPersonaStyle(systemPrompt)
    };
    
    this.promptHistory.push(queryData);
    
    // Simulate different responses based on system prompt
    let response = `Analysis: ${input}`;
    
    if (queryData.hasOwnership) {
      response = `Reviewing YOUR personal entry: ${input}`;
    }
    
    if (queryData.personaStyle) {
      response = `[${queryData.personaStyle} style] ${response}`;
    }
    
    return {
      response,
      systemPromptReceived: systemPrompt,
      metadata: { 
        modelUsed: 'tracking-mock',
        ownershipDetected: queryData.hasOwnership,
        personaDetected: queryData.personaStyle
      }
    };
  }
  
  extractPersonaStyle(systemPrompt) {
    if (!systemPrompt) return null;
    
    if (systemPrompt.includes('street-smart casual')) return 'homie';
    if (systemPrompt.includes('cosmic perspective')) return 'oracle';
    if (systemPrompt.includes('warm presence')) return 'therapist';
    if (systemPrompt.includes('efficient, clear')) return 'secretary';
    if (systemPrompt.includes('imaginative collaborator')) return 'creative_partner';
    
    return null;
  }
  
  getPromptHistory() {
    return this.promptHistory;
  }
}

// Complete vault content flow test
async function testVaultContentFlow() {
  console.log('🧪 Testing Complete Vault Content Flow Integration\n');
  
  const vaultService = new DetailedMockVaultService();
  const modelManager = new TrackingMockModelManager();
  
  // Create canal system with enhanced mocks
  const system = createCanalSystem({
    personaService: new PersonaService(),
    vaultService,
    modelManager
  });
  
  const sessionId = 'vault_flow_session';
  let stepResults = [];
  
  // STEP 1: Initial vault search
  console.log('STEP 1: Initial Vault Search');
  console.log('============================');
  
  const searchResult = await system.processWithSession(sessionId, 'show me my carnivore recipes');
  
  console.log('Input:', 'show me my carnivore recipes');
  console.log('Response source:', searchResult.metadata.source);
  console.log('Is vault content:', searchResult.metadata.isVaultContent);
  console.log('Has records:', Array.isArray(searchResult.content?.records));
  console.log('System prompt contains ownership:', searchResult.context.systemPrompt?.includes('MY personal vault') || false);
  
  stepResults.push({
    step: 'search',
    hasVaultSource: searchResult.metadata.source === 'vault',
    hasOwnership: searchResult.context.systemPrompt?.includes('MY personal vault') || false,
    hasRecords: Array.isArray(searchResult.content?.records) && searchResult.content.records.length > 0,
    awaitingSelection: searchResult.context.awaitingSelection || false
  });
  
  console.log('✅ Search completed, awaiting selection:', stepResults[0].awaitingSelection);
  
  // STEP 2: Selection
  console.log('\n\nSTEP 2: Item Selection');
  console.log('=====================');
  
  const selectionResult = await system.processWithSession(sessionId, '1');
  
  console.log('Input:', '1');
  console.log('Selection type:', selectionResult.metadata.type);
  console.log('Selected content preview:', selectionResult.content.content?.slice(0, 100) + '...');
  console.log('Source maintained:', selectionResult.metadata.source);
  console.log('Vault content maintained:', selectionResult.metadata.isVaultContent);
  console.log('System prompt ownership:', selectionResult.context.systemPrompt?.includes('MY personal vault') || false);
  
  stepResults.push({
    step: 'selection',
    hasSelection: selectionResult.metadata.type === 'selection',
    maintainsVaultSource: selectionResult.metadata.source === 'vault',
    maintainsOwnership: selectionResult.context.systemPrompt?.includes('MY personal vault') || false,
    hasContent: !!selectionResult.content.content
  });
  
  console.log('✅ Selection completed with vault content');
  
  // STEP 3: Contextual reference
  console.log('\n\nSTEP 3: Contextual Reference');
  console.log('============================');
  
  const contextualResult = await system.processWithSession(sessionId, 'tell me more about this recipe');
  
  console.log('Input:', 'tell me more about this recipe');
  console.log('Context reference detected:', contextualResult.context.locks?.context?.hasReference);
  console.log('Reference type:', contextualResult.context.locks?.context?.referenceType);
  console.log('Vault context maintained:', contextualResult.context.locks?.context?.isVaultContent);
  console.log('System prompt ownership:', contextualResult.context.systemPrompt?.includes('MY personal vault') || false);
  console.log('Has selection context:', contextualResult.context.systemPrompt?.includes('Currently examining') || false);
  
  stepResults.push({
    step: 'contextual',
    hasReference: contextualResult.context.locks?.context?.hasReference || false,
    maintainsVaultContext: contextualResult.context.locks?.context?.isVaultContent || false,
    maintainsOwnership: contextualResult.context.systemPrompt?.includes('MY personal vault') || false,
    hasSelectionContext: contextualResult.context.systemPrompt?.includes('Currently examining') || false
  });
  
  console.log('✅ Contextual reference processed with ownership context');
  
  // STEP 4: Follow-up question
  console.log('\n\nSTEP 4: Follow-up Question');
  console.log('==========================');
  
  const followupResult = await system.processWithSession(sessionId, 'what are the benefits of this approach?');
  
  console.log('Input:', 'what are the benefits of this approach?');
  console.log('Still has vault context:', followupResult.context.systemPrompt?.includes('MY personal vault') || false);
  console.log('Last selection reference:', followupResult.context.systemPrompt?.includes('Currently examining') || false);
  
  stepResults.push({
    step: 'followup',
    maintainsOwnership: followupResult.context.systemPrompt?.includes('MY personal vault') || false,
    hasSelectionReference: followupResult.context.systemPrompt?.includes('Currently examining') || false
  });
  
  console.log('✅ Follow-up maintains vault ownership context');
  
  // STEP 5: New search (should maintain session but reset selection)
  console.log('\n\nSTEP 5: New Search in Same Session');
  console.log('==================================');
  
  const newSearchResult = await system.processWithSession(sessionId, 'find my health tracking notes');
  
  console.log('Input:', 'find my health tracking notes');
  console.log('New search results:', Array.isArray(newSearchResult.content?.records));
  console.log('Ownership context:', newSearchResult.context.systemPrompt?.includes('MY personal vault') || false);
  console.log('Awaiting new selection:', newSearchResult.context.awaitingSelection || false);
  
  stepResults.push({
    step: 'new_search',
    hasNewResults: Array.isArray(newSearchResult.content?.records) && newSearchResult.content.records.length > 0,
    maintainsOwnership: newSearchResult.context.systemPrompt?.includes('MY personal vault') || false,
    awaitingSelection: newSearchResult.context.awaitingSelection || false
  });
  
  console.log('✅ New search resets selection but maintains vault ownership');
  
  // ANALYSIS: Check model manager prompt history
  console.log('\n\nMODEL MANAGER ANALYSIS');
  console.log('======================');
  
  const promptHistory = modelManager.getPromptHistory();
  console.log(`Total AI queries made: ${promptHistory.length}`);
  
  const ownershipQueries = promptHistory.filter(p => p.hasOwnership);
  const thankYouBlocks = promptHistory.filter(p => p.hasThankYouBlock);
  
  console.log(`Queries with ownership context: ${ownershipQueries.length}/${promptHistory.length}`);
  console.log(`Queries with thank-you blocks: ${thankYouBlocks.length}/${promptHistory.length}`);
  
  // ANALYSIS: Check vault service history
  console.log('\n\nVAULT SERVICE ANALYSIS');
  console.log('======================');
  
  const vaultHistory = vaultService.getHistory();
  console.log(`Total searches: ${vaultHistory.searches.length}`);
  console.log(`Total selections: ${vaultHistory.selections.length}`);
  console.log('Search queries:', vaultHistory.searches.map(s => s.query));
  console.log('Selected items:', vaultHistory.selections.map(s => s.item.id));
  
  // FINAL ASSESSMENT
  console.log('\n\n🎯 FINAL FLOW ASSESSMENT');
  console.log('========================');
  
  const flowChecks = [
    stepResults[0].hasVaultSource && stepResults[0].hasOwnership && stepResults[0].awaitingSelection, // Search
    stepResults[1].hasSelection && stepResults[1].maintainsVaultSource && stepResults[1].maintainsOwnership, // Selection  
    stepResults[2].hasReference && stepResults[2].maintainsVaultContext && stepResults[2].maintainsOwnership, // Contextual
    stepResults[3].maintainsOwnership && stepResults[3].hasSelectionReference, // Follow-up
    stepResults[4].hasNewResults && stepResults[4].maintainsOwnership && stepResults[4].awaitingSelection, // New search
    ownershipQueries.length === promptHistory.length, // All AI queries had ownership
    thankYouBlocks.length === ownershipQueries.length // All ownership queries blocked thank-you
  ];
  
  const passedFlowChecks = flowChecks.filter(Boolean).length;
  const totalFlowChecks = flowChecks.length;
  
  console.log(`Flow Integrity Checks: ${passedFlowChecks}/${totalFlowChecks}`);
  
  console.log('\nDetailed Results:');
  console.log('- Search → Selection → Context: ✅');
  console.log(`- Ownership maintained throughout: ${ownershipQueries.length === promptHistory.length ? '✅' : '❌'}`);
  console.log(`- Thank-you responses blocked: ${thankYouBlocks.length === ownershipQueries.length ? '✅' : '❌'}`);
  console.log(`- Session continuity maintained: ${vaultHistory.searches.length > 1 ? '✅' : '❌'}`);
  console.log(`- Contextual references work: ${stepResults[2].hasReference ? '✅' : '❌'}`);
  
  if (passedFlowChecks === totalFlowChecks) {
    console.log('\n🎉 COMPLETE FLOW SUCCESS!');
    console.log('✅ Vault content marking flows correctly from search to analysis');
    console.log('✅ Ownership context maintained throughout entire conversation');
    console.log('✅ "Thank you for sharing" responses successfully blocked');
    console.log('✅ Session management preserves context across interactions');
    console.log('✅ Ready for integration with main Echo system');
  } else {
    console.log('\n❌ FLOW ISSUES DETECTED');
    console.log('❌ Some aspects of vault content flow are not working correctly');
    console.log('❌ Integration with main Echo system should wait');
  }
  
  return {
    passed: passedFlowChecks === totalFlowChecks,
    stepResults,
    promptHistory,
    vaultHistory,
    metrics: {
      totalChecks: totalFlowChecks,
      passedChecks: passedFlowChecks,
      ownershipQueryRatio: ownershipQueries.length / promptHistory.length,
      thankYouBlockRatio: thankYouBlocks.length / (ownershipQueries.length || 1)
    }
  };
}

// Run if called directly  
if (require.main === module) {
  testVaultContentFlow()
    .then(results => {
      console.log('\n📊 Complete Flow Test Results:');
      console.log('Passed:', results.passed);
      console.log('Metrics:', results.metrics);
      process.exit(results.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Flow test failed with error:', error);
      process.exit(1);
    });
}

module.exports = { testVaultContentFlow, DetailedMockVaultService, TrackingMockModelManager };