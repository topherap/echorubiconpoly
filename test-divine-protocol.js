/**
 * 🏛️ DIVINE PROTOCOL TEST SUITE
 * Tests the Vault Direct Delivery Architecture
 * Verifies that vault queries bypass AI and establish canon properly
 */

const vaultHighPriest = require('./src/handlers/vaultHighPriest');
const canonValidator = require('./src/validators/canonValidator');

// Test console colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

async function runDivineProtocolTests() {
  log('\n🏛️ DIVINE PROTOCOL TEST SUITE', colors.bold + colors.blue);
  log('═'.repeat(60), colors.blue);
  
  const testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: Divine Query Detection
  log('\n📋 Test 1: Divine Query Detection', colors.yellow);
  const divineQueries = [
    'what are my lifts?',
    'show my recipes',
    'list my clients',
    'who are my clients?',
    'what lifts do I have?',
    'my lifts'
  ];
  
  const nonDivineQueries = [
    'hello',
    'how are you?',
    'what is the weather?',
    'explain quantum physics'
  ];
  
  for (const query of divineQueries) {
    testResults.total++;
    if (vaultHighPriest.isDivineQuery(query)) {
      log(`  ✅ '${query}' correctly identified as divine`, colors.green);
      testResults.passed++;
    } else {
      log(`  ❌ '${query}' NOT identified as divine`, colors.red);
      testResults.failed++;
    }
  }
  
  for (const query of nonDivineQueries) {
    testResults.total++;
    if (!vaultHighPriest.isDivineQuery(query)) {
      log(`  ✅ '${query}' correctly identified as non-divine`, colors.green);
      testResults.passed++;
    } else {
      log(`  ❌ '${query}' incorrectly identified as divine`, colors.red);
      testResults.failed++;
    }
  }

  // Test 2: Vault Consultation (if memory system available)
  log('\n📋 Test 2: Vault Consultation', colors.yellow);
  testResults.total++;
  
  try {
    if (global.memorySystem) {
      log('  ✅ Memory system available for vault consultation', colors.green);
      testResults.passed++;
      
      // Test actual vault query
      log('  🏛️ Testing actual vault query: "what are my lifts?"');
      const divineResponse = await vaultHighPriest.seekDivineKnowledge('what are my lifts?');
      
      if (divineResponse && divineResponse.source === 'vault-direct') {
        log('  ✅ Divine response received with correct source', colors.green);
        log(`  📜 Records found: ${divineResponse.recordCount || 0}`);
        
        if (divineResponse.hasRecords) {
          log('  ✅ Vault records successfully retrieved', colors.green);
        } else {
          log('  ⚠️  No records found (vault may be empty)', colors.yellow);
        }
      } else {
        log('  ❌ Invalid divine response format', colors.red);
        testResults.failed++;
      }
      
    } else {
      log('  ⚠️  Memory system not available - skipping vault test', colors.yellow);
      log('  💡 Run this test after starting the main application');
    }
  } catch (error) {
    log(`  ❌ Vault consultation failed: ${error.message}`, colors.red);
    testResults.failed++;
  }

  // Test 3: Canon Enforcement
  log('\n📋 Test 3: Canon Enforcement', colors.yellow);
  
  const hereticalResponses = [
    "I don't have access to your personal information.",
    "I cannot access your lifts.",
    "I don't see any lifts in your vault.",
    "I'm unable to access your personal data."
  ];
  
  const orthodoxResponses = [
    "Based on your vault, you have Temple Ritual lifts.",
    "Your records show the following lifts:",
    "According to the canonical text, your Temple Bench lift..."
  ];
  
  // Mock canonical text for testing
  const mockCanon = {
    title: 'Temple Bench Test',
    content: 'This is a test canonical text about Temple Bench lifting rituals with Gevurah significance.'
  };
  
  for (const response of hereticalResponses) {
    testResults.total++;
    const enforcement = canonValidator.enforceCanon(response, mockCanon, 'test query');
    
    if (enforcement.heresyDetected) {
      log(`  ✅ Heresy correctly detected in: "${response.substring(0, 30)}..."`, colors.green);
      testResults.passed++;
    } else {
      log(`  ❌ Heresy NOT detected in: "${response.substring(0, 30)}..."`, colors.red);
      testResults.failed++;
    }
  }
  
  for (const response of orthodoxResponses) {
    testResults.total++;
    const enforcement = canonValidator.enforceCanon(response, mockCanon, 'test query');
    
    if (!enforcement.heresyDetected) {
      log(`  ✅ Orthodox response correctly validated: "${response.substring(0, 30)}..."`, colors.green);
      testResults.passed++;
    } else {
      log(`  ❌ Orthodox response incorrectly flagged: "${response.substring(0, 30)}..."`, colors.red);
      testResults.failed++;
    }
  }

  // Test 4: Numbered Selection Handling
  log('\n📋 Test 4: Numbered Selection Handling', colors.yellow);
  
  // Mock a divine revelation for testing
  vaultHighPriest.lastDivineRevelation = {
    query: 'test query',
    records: [
      { title: 'Test Record 1', content: 'Test content 1' },
      { title: 'Test Record 2', content: 'Test content 2' }
    ],
    timestamp: Date.now()
  };
  
  testResults.total += 3;
  
  // Test valid selection
  const selection1 = await vaultHighPriest.handleDivineSelection('1');
  if (selection1 && selection1.establishedCanon) {
    log('  ✅ Valid selection (1) correctly handled and canon established', colors.green);
    testResults.passed++;
  } else {
    log('  ❌ Valid selection (1) failed', colors.red);
    testResults.failed++;
  }
  
  // Test invalid selection
  const selection99 = await vaultHighPriest.handleDivineSelection('99');
  if (selection99 && selection99.message.includes('exceeds')) {
    log('  ✅ Invalid selection (99) correctly rejected', colors.green);
    testResults.passed++;
  } else {
    log('  ❌ Invalid selection (99) not properly handled', colors.red);
    testResults.failed++;
  }
  
  // Test summary command
  const summary = await vaultHighPriest.handleDivineSelection('summary');
  if (summary && summary.hasRecords) {
    log('  ✅ Summary command correctly handled', colors.green);
    testResults.passed++;
  } else {
    log('  ❌ Summary command failed', colors.red);
    testResults.failed++;
  }

  // Final Results
  log('\n🏛️ DIVINE PROTOCOL TEST RESULTS', colors.bold + colors.blue);
  log('═'.repeat(60), colors.blue);
  log(`Total Tests: ${testResults.total}`);
  
  if (testResults.failed === 0) {
    log(`✅ ALL ${testResults.passed} TESTS PASSED!`, colors.bold + colors.green);
    log('🏛️ The Divine Protocol is functioning correctly', colors.green);
  } else {
    log(`❌ ${testResults.failed} tests failed, ${testResults.passed} passed`, colors.red);
    log('⚠️  Divine Protocol needs attention', colors.yellow);
  }
  
  // Recommendations
  log('\n📋 TESTING RECOMMENDATIONS:', colors.yellow);
  log('1. Start Echo application and test with real vault queries:');
  log('   • "what are my lifts?"');
  log('   • Select "1" after getting list');
  log('   • Ask questions about the canonical text');
  log('');
  log('2. Verify console logs show:');
  log('   • 🏛️ DIVINE QUERY DETECTED');
  log('   • 📜 Canon established messages');
  log('   • 🚨 Heresy detection if AI misbehaves');
  log('');
  log('3. Success criteria:');
  log('   • Vault queries return direct results (no AI)');
  log('   • Numbered selection shows full content');
  log('   • Follow-up questions get canonical commentary');
  log('   • No "I don\'t have access" responses');
  
  return testResults.failed === 0;
}

// Run tests if called directly
if (require.main === module) {
  runDivineProtocolTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runDivineProtocolTests };