/*
 * 🧪 MASTER TEST RUNNER FOR V2 CANAL SYSTEM
 * 
 * Runs all canal system tests to verify the ownership context fix
 * and ensure the "thank you for sharing" issue is resolved
 */

const { testOwnershipContext } = require('./test-canal-ownership');
const { testPersonaLayering } = require('./test-persona-layering');
const { testVaultContentFlow } = require('./test-vault-flow');
const { testSelectionProcessing, testSelectionEdgeCases } = require('./test-selection-processing');

async function runAllTests() {
  console.log('🚀 RUNNING ALL V2 CANAL SYSTEM TESTS');
  console.log('=====================================\n');
  
  const testResults = {
    ownership: null,
    persona: null,
    vaultFlow: null,
    selectionMain: null,
    selectionEdge: null
  };
  
  const testSuite = [
    {
      name: 'Ownership Context Generation',
      key: 'ownership',
      test: testOwnershipContext,
      critical: true
    },
    {
      name: 'Persona-Based Prompt Layering',
      key: 'persona',
      test: testPersonaLayering,
      critical: false
    },
    {
      name: 'Vault Content Flow Integration',
      key: 'vaultFlow',
      test: testVaultContentFlow,
      critical: true
    },
    {
      name: 'Selection Processing',
      key: 'selectionMain',
      test: testSelectionProcessing,
      critical: true
    },
    {
      name: 'Selection Edge Cases',
      key: 'selectionEdge',
      test: testSelectionEdgeCases,
      critical: false
    }
  ];
  
  console.log(`Running ${testSuite.length} test suites...\n`);
  
  // Run each test suite
  for (const suite of testSuite) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 RUNNING: ${suite.name.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const startTime = Date.now();
      const result = await suite.test();
      const duration = Date.now() - startTime;
      
      testResults[suite.key] = {
        ...result,
        duration,
        critical: suite.critical,
        error: null
      };
      
      console.log(`\n⏱️  Duration: ${duration}ms`);
      console.log(`🎯 Result: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      
    } catch (error) {
      console.error(`\n💥 ERROR in ${suite.name}:`, error.message);
      testResults[suite.key] = {
        passed: false,
        duration: 0,
        critical: suite.critical,
        error: error.message
      };
    }
  }
  
  // Generate comprehensive report
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST REPORT');
  console.log('='.repeat(80));
  
  let totalTests = 0;
  let passedTests = 0;
  let criticalTests = 0;
  let passedCritical = 0;
  let totalDuration = 0;
  
  for (const [key, result] of Object.entries(testResults)) {
    if (result) {
      totalTests++;
      totalDuration += result.duration;
      
      if (result.critical) {
        criticalTests++;
        if (result.passed) passedCritical++;
      }
      
      if (result.passed) passedTests++;
      
      const suite = testSuite.find(s => s.key === key);
      console.log(`\n${suite.name}:`);
      console.log(`  Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`  Critical: ${result.critical ? '🔥 YES' : '📝 NO'}`);
      console.log(`  Duration: ${result.duration}ms`);
      
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      
      if (result.metrics) {
        console.log(`  Metrics: ${JSON.stringify(result.metrics, null, 2)}`);
      }
    }
  }
  
  // Final assessment
  console.log('\n' + '='.repeat(80));
  console.log('🎯 FINAL ASSESSMENT');
  console.log('='.repeat(80));
  
  console.log(`\nOverall Results:`);
  console.log(`  Total Tests: ${passedTests}/${totalTests} passed`);
  console.log(`  Critical Tests: ${passedCritical}/${criticalTests} passed`);
  console.log(`  Total Duration: ${totalDuration}ms`);
  console.log(`  Success Rate: ${Math.round((passedTests/totalTests)*100)}%`);
  console.log(`  Critical Success Rate: ${Math.round((passedCritical/criticalTests)*100)}%`);
  
  // Determine deployment readiness
  const allCriticalPassed = passedCritical === criticalTests;
  const highSuccessRate = (passedTests / totalTests) >= 0.8;
  const deploymentReady = allCriticalPassed && highSuccessRate;
  
  console.log(`\n🚀 DEPLOYMENT READINESS ASSESSMENT:`);
  console.log(`  All Critical Tests Passed: ${allCriticalPassed ? '✅' : '❌'}`);
  console.log(`  High Success Rate (≥80%): ${highSuccessRate ? '✅' : '❌'}`);
  console.log(`  Ready for Integration: ${deploymentReady ? '✅ YES' : '❌ NO'}`);
  
  if (deploymentReady) {
    console.log('\n🎉 SUCCESS! V2 Canal System is ready for integration!');
    console.log('✅ Ownership context generation working correctly');
    console.log('✅ "Thank you for sharing" issue should be resolved');
    console.log('✅ Vault content flows maintain proper ownership context');
    console.log('✅ Selection processing handles ownership correctly');
    console.log('\n🔗 Next Steps:');
    console.log('  1. Integrate v2 canal system with main Echo application');
    console.log('  2. Test end-to-end through GUI to confirm fix');
    console.log('  3. Monitor for "thank you for sharing" responses in production');
  } else {
    console.log('\n❌ NOT READY FOR DEPLOYMENT');
    console.log('❌ Critical test failures detected');
    console.log('❌ Ownership context may not be working correctly');
    console.log('❌ "Thank you for sharing" issue may persist');
    console.log('\n🔧 Required Actions:');
    console.log('  1. Fix failing critical tests');
    console.log('  2. Re-run test suite');
    console.log('  3. Only integrate after all critical tests pass');
  }
  
  // Specific recommendations based on test results
  console.log('\n📋 SPECIFIC RECOMMENDATIONS:');
  
  if (!testResults.ownership?.passed) {
    console.log('❌ CRITICAL: Fix ownership context generation');
    console.log('   - The core "MY personal vault" context is not being generated');
    console.log('   - This will NOT prevent "thank you for sharing" responses');
  }
  
  if (!testResults.vaultFlow?.passed) {
    console.log('❌ CRITICAL: Fix vault content flow integration');
    console.log('   - Vault content marking is not flowing correctly through the system');
    console.log('   - Ownership context may be lost during conversation flow');
  }
  
  if (!testResults.selectionMain?.passed) {
    console.log('❌ CRITICAL: Fix selection processing');
    console.log('   - Selection processing is not maintaining ownership context');
    console.log('   - User selections may not preserve "MY content" framing');
  }
  
  if (!testResults.persona?.passed) {
    console.log('⚠️  OPTIONAL: Consider fixing persona layering');
    console.log('   - Persona detection and styling may not work optimally');
    console.log('   - Not critical for ownership context fix');
  }
  
  if (!testResults.selectionEdge?.passed) {
    console.log('⚠️  OPTIONAL: Consider fixing selection edge cases');
    console.log('   - Edge case handling could be more robust');
    console.log('   - Not critical for basic functionality');
  }
  
  return {
    passed: deploymentReady,
    results: testResults,
    summary: {
      totalTests,
      passedTests,
      criticalTests,
      passedCritical,
      totalDuration,
      successRate: passedTests / totalTests,
      criticalSuccessRate: passedCritical / criticalTests,
      deploymentReady
    }
  };
}

// Run if called directly
if (require.main === module) {
  runAllTests()
    .then(results => {
      console.log('\n📈 Test execution completed');
      process.exit(results.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test suite failed with error:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };