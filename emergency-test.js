/**
 * Emergency Test Script - Quick validation of critical fixes
 */

// Test pattern loading
console.log('🔧 Testing pattern loading...');
try {
  const patterns = require('./src/brain/routePatterns.js');
  console.log('✅ Patterns loaded successfully');
  console.log('   - Clerk patterns:', patterns.clerk?.direct?.length || 0);
  console.log('   - Reader patterns:', patterns.reader?.direct?.length || 0);
  console.log('   - Analyst patterns:', patterns.analyst?.direct?.length || 0);
  console.log('   - Conversationalist patterns:', patterns.conversationalist?.direct?.length || 0);
} catch (err) {
  console.error('❌ Pattern loading failed:', err.message);
}

// Test brain config
console.log('\n🔧 Testing brain config...');
try {
  const config = require('./src/brain/brainConfig.json');
  console.log('✅ Config loaded successfully');
  console.log('   - Router enabled:', config.routerEnabled);
  console.log('   - Models available:', Object.keys(config.models).length);
  console.log('   - Confidence threshold:', config.routing?.confidenceThreshold);
} catch (err) {
  console.error('❌ Config loading failed:', err.message);
}

// Test brain router initialization
console.log('\n🔧 Testing router initialization...');
(async () => {
try {
  const BrainRouter = require('./src/brain/BrainRouter.js');
  
  // Mock global.trace
  global.trace = (category, message, data) => {
    console.log(`   [${category}] ${message}`, data || '');
  };
  
  const router = new BrainRouter();
  console.log('✅ Router initialized successfully');
  
  // Test basic routing
  console.log('\n🔧 Testing basic routing...');
  
  const testCases = [
    { query: "list my clients", expected: "clerk" },
    { query: "8", expected: "clerk" },
    { query: "summarize", expected: "reader" },
    { query: "hello", expected: "conversationalist" }
  ];
  
  for (const test of testCases) {
    try {
      const result = await router.routeQuery(test.query, {});
      if (result && result.role && typeof result.confidence === 'number') {
        const success = result.role === test.expected;
        console.log(`   ${success ? '✅' : '❌'} "${test.query}" → ${result.role} (${result.confidence.toFixed(2)})`);
        if (!success && result.reasoning) {
          console.log(`     Reasoning: ${result.reasoning}`);
        }
      } else {
        console.log(`   ❌ "${test.query}" → Invalid result:`, result);
      }
    } catch (routeErr) {
      console.log(`   ❌ "${test.query}" → ERROR: ${routeErr.message}`);
    }
  }
  
} catch (err) {
  console.error('❌ Router initialization failed:', err.message);
}
})();

console.log('\n📋 Emergency Fix Status Summary:');
console.log('1. Router disabled: Check brainConfig.json');
console.log('2. Pattern structure: Fixed export format');  
console.log('3. Safety checks: Added to all pattern functions');
console.log('4. Context preservation: Added for numbered selections');
console.log('\n🚨 NEXT STEPS:');
console.log('1. Test "who are my clients?" → should show numbered list');
console.log('2. Test number selection → should get client details');
console.log('3. If basic functions work, consider re-enabling router');
console.log('4. Monitor logs for "Cannot read properties" errors');