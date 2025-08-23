/**
 * Test Router - Validates multi-brain routing functionality
 * Run with: node src/brain/testRouter.js
 */

const BrainRouter = require('./BrainRouter');
const ModelManager = require('./modelManager');

// Mock global.trace for testing
global.trace = (category, message, data) => {
  console.log(`[${category.toUpperCase()}] ${message}`, data || '');
};

// Test cases to verify routing
const testCases = [
  // Clerk Brain Tests
  { 
    query: "list my clients", 
    expected: "clerk",
    description: "Direct list request should route to clerk"
  },
  { 
    query: "show me all files", 
    expected: "clerk",
    description: "Show command should route to clerk" 
  },
  { 
    query: "who are my clients?", 
    expected: "clerk",
    description: "Who are query should route to clerk"
  },
  { 
    query: "16", 
    expected: "clerk",
    description: "Number selection should route to clerk"
  },
  
  // Reader Brain Tests
  { 
    query: "summarize this document", 
    expected: "reader",
    description: "Summarize request should route to reader"
  },
  { 
    query: "explain what this means", 
    expected: "reader",
    description: "Explain request should route to reader"
  },
  { 
    query: "tell me about Joy Ferris", 
    expected: "reader",
    description: "Tell me about should route to reader"
  },
  { 
    query: "what is this file?", 
    expected: "reader",
    description: "What is query should route to reader"
  },
  
  // Analyst Brain Tests
  { 
    query: "debug this error", 
    expected: "analyst",
    description: "Debug request should route to analyst"
  },
  { 
    query: "what's wrong with this code", 
    expected: "analyst",
    description: "Code analysis should route to analyst"
  },
  { 
    query: "analyze this function", 
    expected: "analyst",
    description: "Function analysis should route to analyst"
  },
  { 
    query: "fix this JSON error", 
    expected: "analyst",
    description: "JSON/technical issues should route to analyst"
  },
  
  // Conversationalist Brain Tests
  { 
    query: "hello, how are you?", 
    expected: "conversationalist",
    description: "Greeting should route to conversationalist"
  },
  { 
    query: "what do you think about this?", 
    expected: "conversationalist",
    description: "Opinion request should route to conversationalist"
  },
  { 
    query: "tell me a story", 
    expected: "conversationalist",
    description: "Creative request should route to conversationalist"
  },
  
  // Edge Cases
  { 
    query: "", 
    expected: "conversationalist",
    description: "Empty query should fallback to conversationalist"
  },
  { 
    query: "asdfghjkl", 
    expected: "conversationalist",
    description: "Random text should fallback to conversationalist"
  }
];

// Context test scenarios
const contextScenarios = [
  {
    description: "Number after list context",
    query: "2",
    context: {
      lastResponse: "I found 5 clients:\n1. Angela Smith\n2. Bob Jones\n3. Carol White",
      conversationHistory: []
    },
    expected: "clerk",
    expectedBoost: true
  },
  {
    description: "Summarize with file content",
    query: "summarize",
    context: {
      lastFileContent: {
        fileName: "test.md",
        content: "This is test content for summarization..."
      }
    },
    expected: "reader",
    expectedBoost: true
  },
  {
    description: "Follow-up technical question",
    query: "why does this happen?",
    context: {
      lastRole: "analyst",
      conversationHistory: [
        { role: "user", content: "debug this error" },
        { role: "assistant", content: "The error is caused by..." }
      ]
    },
    expected: "analyst",
    expectedBoost: true
  }
];

async function runBasicTests() {
  console.log('🧪 Running Basic Routing Tests...\n');
  
  const router = new BrainRouter();
  let passed = 0;
  let total = testCases.length;
  
  for (const test of testCases) {
    try {
      const result = await router.routeQuery(test.query, {});
      const success = result.role === test.expected;
      
      console.log(`${success ? '✅' : '❌'} Query: "${test.query}"`);
      console.log(`   Expected: ${test.expected}, Got: ${result.role}`);
      console.log(`   Confidence: ${result.confidence.toFixed(2)}`);
      console.log(`   Reasoning: ${result.reasoning}`);
      console.log(`   Description: ${test.description}\n`);
      
      if (success) passed++;
      
    } catch (error) {
      console.log(`❌ Query: "${test.query}" - ERROR: ${error.message}\n`);
    }
  }
  
  console.log(`📊 Basic Tests: ${passed}/${total} passed (${Math.round(passed/total*100)}%)\n`);
  return { passed, total };
}

async function runContextTests() {
  console.log('🧪 Running Context-Aware Tests...\n');
  
  const router = new BrainRouter();
  let passed = 0;
  let total = contextScenarios.length;
  
  for (const scenario of contextScenarios) {
    try {
      const result = await router.routeQuery(scenario.query, scenario.context);
      const success = result.role === scenario.expected;
      
      console.log(`${success ? '✅' : '❌'} Scenario: ${scenario.description}`);
      console.log(`   Query: "${scenario.query}"`);
      console.log(`   Expected: ${scenario.expected}, Got: ${result.role}`);
      console.log(`   Confidence: ${result.confidence.toFixed(2)}`);
      console.log(`   Context boost expected: ${scenario.expectedBoost || false}`);
      console.log(`   Reasoning: ${result.reasoning}\n`);
      
      if (success) passed++;
      
    } catch (error) {
      console.log(`❌ Scenario: ${scenario.description} - ERROR: ${error.message}\n`);
    }
  }
  
  console.log(`📊 Context Tests: ${passed}/${total} passed (${Math.round(passed/total*100)}%)\n`);
  return { passed, total };
}

async function testModelManager() {
  console.log('🧪 Testing ModelManager...\n');
  
  const manager = new ModelManager();
  
  // Test prompt formatting for each brain
  const testPrompt = "test query";
  const testContext = {
    lastFileContent: {
      fileName: "test.js",
      content: "function test() { return true; }"
    }
  };
  
  const brains = ['clerk', 'reader', 'analyst', 'conversationalist'];
  
  for (const brain of brains) {
    try {
      const formatted = manager.formatPromptForModel(brain, testPrompt, testContext);
      console.log(`✅ ${brain} brain prompt formatting: OK`);
      console.log(`   Prompt length: ${formatted.length} characters`);
      console.log(`   Contains specialties: ${formatted.includes('specialties')}`);
      console.log(`   Sample: ${formatted.substring(0, 100)}...\n`);
    } catch (error) {
      console.log(`❌ ${brain} brain prompt formatting failed: ${error.message}\n`);
    }
  }
  
  // Test model availability checking
  try {
    const config = manager.getModelConfig('phi3:mini');
    console.log(`✅ Model config retrieval: ${config ? 'OK' : 'FAILED'}`);
    if (config) {
      console.log(`   Brain: ${config.brain}`);
      console.log(`   Max tokens: ${config.maxTokens}`);
      console.log(`   Temperature: ${config.temperature}\n`);
    }
  } catch (error) {
    console.log(`❌ Model config retrieval failed: ${error.message}\n`);
  }
}

async function testConfiguration() {
  console.log('🧪 Testing Configuration...\n');
  
  try {
    const config = require('./brainConfig.json');
    
    console.log(`✅ Configuration loaded successfully`);
    console.log(`   Router enabled: ${config.routerEnabled}`);
    console.log(`   Models available: ${Object.keys(config.models).length}`);
    console.log(`   Fallback model: ${config.fallbackModel}`);
    console.log(`   Confidence threshold: ${config.routing.confidenceThreshold}\n`);
    
    // Validate each model configuration
    for (const [brain, modelConfig] of Object.entries(config.models)) {
      const valid = modelConfig.name && 
                   modelConfig.specialties && 
                   typeof modelConfig.maxTokens === 'number' &&
                   typeof modelConfig.temperature === 'number';
      
      console.log(`${valid ? '✅' : '❌'} ${brain} configuration: ${valid ? 'Valid' : 'Invalid'}`);
    }
    
  } catch (error) {
    console.log(`❌ Configuration test failed: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Multi-Brain Router Tests\n');
  console.log('=' .repeat(50) + '\n');
  
  // Test configuration
  await testConfiguration();
  
  // Test basic routing
  const basicResults = await runBasicTests();
  
  // Test context-aware routing
  const contextResults = await runContextTests();
  
  // Test model manager
  await testModelManager();
  
  // Summary
  console.log('📈 Test Summary');
  console.log('=' .repeat(50));
  console.log(`Basic Routing: ${basicResults.passed}/${basicResults.total} passed`);
  console.log(`Context-Aware: ${contextResults.passed}/${contextResults.total} passed`);
  
  const totalPassed = basicResults.passed + contextResults.passed;
  const totalTests = basicResults.total + contextResults.total;
  const overallPercentage = Math.round(totalPassed / totalTests * 100);
  
  console.log(`Overall: ${totalPassed}/${totalTests} passed (${overallPercentage}%)`);
  
  if (overallPercentage >= 80) {
    console.log('🎉 Multi-Brain Router is functioning well!');
  } else if (overallPercentage >= 60) {
    console.log('⚠️  Multi-Brain Router needs some adjustments');
  } else {
    console.log('🔧 Multi-Brain Router requires significant fixes');
  }
  
  console.log('\n✨ Test run complete!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runBasicTests,
  runContextTests,
  testModelManager,
  testConfiguration
};