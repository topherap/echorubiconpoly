/*
 * 🧪 PERSONA LAYERING TEST
 * 
 * Tests the persona-based prompt layering system to ensure
 * personas influence system prompts correctly while maintaining
 * ownership context for vault content
 */

const { createCanalSystem } = require('./core/canal');
const PersonaService = require('./services/personaService');
const { MockVaultService, MockModelManager } = require('./test-canal-ownership');

// Test persona detection and prompt layering
async function testPersonaLayering() {
  console.log('🧪 Testing Persona-Based Prompt Layering\n');
  
  // Create canal system with mock services
  const system = createCanalSystem({
    personaService: new PersonaService(),
    vaultService: new MockVaultService(),
    modelManager: new MockModelManager()
  });
  
  // Test 1: Homie persona with vault content
  console.log('Test 1: Homie Persona + Vault Content');
  console.log('====================================');
  
  const homieResult = await system.processWithLocks('yo, show me my fucking recipes', {
    source: 'vault',
    userId: 'test_user',
    sessionId: 'homie_session'
  });
  
  console.log('Input:', 'yo, show me my fucking recipes');
  console.log('Detected persona:', homieResult.context.locks.persona?.detected);
  console.log('Confidence:', homieResult.context.locks.persona?.confidence);
  console.log('\nGenerated System Prompt:');
  console.log(homieResult.context.systemPrompt);
  
  const homiePrompt = homieResult.context.systemPrompt;
  const hasOwnership = homiePrompt.includes('MY personal vault');
  const hasHomieStyle = homiePrompt.includes('street-smart casual') || homiePrompt.includes('no bullshit');
  const hasPersonaBehaviors = homiePrompt.includes('behaviors:');
  
  console.log('\n🔍 Homie Verification:');
  console.log(`- Detected homie persona: ${homieResult.context.locks.persona?.detected === 'homie' ? '✅' : '❌'}`);
  console.log(`- Maintains ownership context: ${hasOwnership ? '✅' : '❌'}`);
  console.log(`- Has persona styling: ${hasHomieStyle ? '✅' : '❌'}`);
  
  // Test 2: Oracle persona with vault content
  console.log('\n\nTest 2: Oracle Persona + Vault Content');
  console.log('======================================');
  
  const oracleResult = await system.processWithLocks('what is the cosmic meaning of my consciousness and divine recipes', {
    source: 'vault',
    userId: 'test_user',
    sessionId: 'oracle_session'
  });
  
  console.log('Input:', 'what is the cosmic meaning of my consciousness and divine recipes');
  console.log('Detected persona:', oracleResult.context.locks.persona?.detected);
  console.log('Confidence:', oracleResult.context.locks.persona?.confidence);
  console.log('\nGenerated System Prompt:');
  console.log(oracleResult.context.systemPrompt);
  
  const oraclePrompt = oracleResult.context.systemPrompt;
  const hasOracleOwnership = oraclePrompt.includes('MY personal vault');
  const hasOracleStyle = oraclePrompt.includes('cosmic perspective') || oraclePrompt.includes('archetypal');
  const hasOracleVocab = oraclePrompt.includes('essence') || oraclePrompt.includes('consciousness');
  
  console.log('\n🔍 Oracle Verification:');
  console.log(`- Detected oracle persona: ${oracleResult.context.locks.persona?.detected === 'oracle' ? '✅' : '❌'}`);
  console.log(`- Maintains ownership context: ${hasOracleOwnership ? '✅' : '❌'}`);
  console.log(`- Has persona styling: ${hasOracleStyle ? '✅' : '❌'}`);
  console.log(`- Has oracle vocabulary: ${hasOracleVocab ? '✅' : '❌'}`);
  
  // Test 3: Therapist persona with vault content
  console.log('\n\nTest 3: Therapist Persona + Vault Content');
  console.log('=========================================');
  
  const therapistResult = await system.processWithLocks('I feel scared about my healing journey and need help with my trauma recovery recipes', {
    source: 'vault',
    userId: 'test_user',
    sessionId: 'therapist_session'
  });
  
  console.log('Input:', 'I feel scared about my healing journey and need help with my trauma recovery recipes');
  console.log('Detected persona:', therapistResult.context.locks.persona?.detected);
  console.log('Confidence:', therapistResult.context.locks.persona?.confidence);
  console.log('\nGenerated System Prompt:');
  console.log(therapistResult.context.systemPrompt);
  
  const therapistPrompt = therapistResult.context.systemPrompt;
  const hasTherapistOwnership = therapistPrompt.includes('MY personal vault');
  const hasTherapistStyle = therapistPrompt.includes('warm presence') || therapistPrompt.includes('non-judgmental');
  const hasTherapistVocab = therapistPrompt.includes('notice') || therapistPrompt.includes('feeling');
  
  console.log('\n🔍 Therapist Verification:');
  console.log(`- Detected therapist persona: ${therapistResult.context.locks.persona?.detected === 'therapist' ? '✅' : '❌'}`);
  console.log(`- Maintains ownership context: ${hasTherapistOwnership ? '✅' : '❌'}`);
  console.log(`- Has persona styling: ${hasTherapistStyle ? '✅' : '❌'}`);
  
  // Test 4: Secretary persona with vault content
  console.log('\n\nTest 4: Secretary Persona + Vault Content');
  console.log('=========================================');
  
  const secretaryResult = await system.processWithLocks('quick summary of my recipes asap, need bullets now', {
    source: 'vault',
    userId: 'test_user',
    sessionId: 'secretary_session'
  });
  
  console.log('Input:', 'quick summary of my recipes asap, need bullets now');
  console.log('Detected persona:', secretaryResult.context.locks.persona?.detected);
  console.log('Confidence:', secretaryResult.context.locks.persona?.confidence);
  console.log('\nGenerated System Prompt:');
  console.log(secretaryResult.context.systemPrompt);
  
  const secretaryPrompt = secretaryResult.context.systemPrompt;
  const hasSecretaryOwnership = secretaryPrompt.includes('MY personal vault');
  const hasSecretaryStyle = secretaryPrompt.includes('efficient') || secretaryPrompt.includes('zero fluff');
  const hasSecretaryFormat = secretaryPrompt.includes('bullet points') || secretaryPrompt.includes('concise');
  
  console.log('\n🔍 Secretary Verification:');
  console.log(`- Detected secretary persona: ${secretaryResult.context.locks.persona?.detected === 'secretary' ? '✅' : '❌'}`);
  console.log(`- Maintains ownership context: ${hasSecretaryOwnership ? '✅' : '❌'}`);
  console.log(`- Has persona styling: ${hasSecretaryStyle ? '✅' : '❌'}`);
  
  // Test 5: No persona detected (general input) with vault content
  console.log('\n\nTest 5: No Persona + Vault Content');
  console.log('==================================');
  
  const noPersonaResult = await system.processWithLocks('show me the entries', {
    source: 'vault',
    userId: 'test_user',
    sessionId: 'no_persona_session'
  });
  
  console.log('Input:', 'show me the entries');
  console.log('Detected persona:', noPersonaResult.context.locks.persona?.detected || 'none');
  console.log('Confidence:', noPersonaResult.context.locks.persona?.confidence || 0);
  console.log('\nGenerated System Prompt:');
  console.log(noPersonaResult.context.systemPrompt);
  
  const noPersonaPrompt = noPersonaResult.context.systemPrompt;
  const hasNoPersonaOwnership = noPersonaPrompt.includes('MY personal vault');
  const noPersonaStyle = !noPersonaPrompt.includes('Response style:');
  
  console.log('\n🔍 No Persona Verification:');
  console.log(`- No persona detected: ${!noPersonaResult.context.locks.persona?.detected ? '✅' : '❌'}`);
  console.log(`- Still maintains ownership: ${hasNoPersonaOwnership ? '✅' : '❌'}`);
  console.log(`- No persona styling applied: ${noPersonaStyle ? '✅' : '❌'}`);
  
  // Test 6: Momentum and continuity tracking
  console.log('\n\nTest 6: Momentum and Continuity');
  console.log('===============================');
  
  const sessionId = 'momentum_session';
  
  // First interaction
  const momentum1 = await system.processWithSession(sessionId, 'yo bro, what\'s good?');
  console.log('First interaction momentum:', momentum1.context.locks.persona?.momentum?.continuity);
  
  // Second interaction (should increment continuity)
  const momentum2 = await system.processWithSession(sessionId, 'for real though, show me stuff');
  console.log('Second interaction momentum:', momentum2.context.locks.persona?.momentum?.continuity);
  
  // Third interaction
  const momentum3 = await system.processWithSession(sessionId, 'yeah that\'s what I\'m talking about');
  console.log('Third interaction momentum:', momentum3.context.locks.persona?.momentum?.continuity);
  
  const momentumIncreasing = momentum3.context.locks.persona?.momentum?.continuity > momentum1.context.locks.persona?.momentum?.continuity;
  
  console.log('\n🔍 Momentum Verification:');
  console.log(`- Continuity increases: ${momentumIncreasing ? '✅' : '❌'}`);
  console.log(`- Deep conversation detected: ${momentum3.context.locks.persona?.momentum?.continuity >= 3 ? '✅' : '❌'}`);
  
  // Final Assessment
  console.log('\n\n🎯 FINAL ASSESSMENT');
  console.log('===================');
  
  const personaTests = [
    homieResult.context.locks.persona?.detected === 'homie' && hasOwnership && hasHomieStyle,
    oracleResult.context.locks.persona?.detected === 'oracle' && hasOracleOwnership && hasOracleStyle,
    therapistResult.context.locks.persona?.detected === 'therapist' && hasTherapistOwnership && hasTherapistStyle,
    secretaryResult.context.locks.persona?.detected === 'secretary' && hasSecretaryOwnership && hasSecretaryStyle,
    !noPersonaResult.context.locks.persona?.detected && hasNoPersonaOwnership && noPersonaStyle,
    momentumIncreasing
  ];
  
  const passedTests = personaTests.filter(Boolean).length;
  const totalTests = personaTests.length;
  
  console.log(`Persona Tests Passed: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('✅ ALL PERSONA TESTS PASSED!');
    console.log('✅ Persona detection working correctly');
    console.log('✅ Persona styling layered onto ownership context');
    console.log('✅ Momentum tracking functional');
    console.log('✅ Multiple personas can be detected and styled appropriately');
  } else {
    console.log('❌ SOME PERSONA TESTS FAILED');
    console.log('❌ Persona layering may not be working correctly');
  }
  
  return {
    passed: passedTests === totalTests,
    results: {
      homie: homieResult.context.locks.persona?.detected === 'homie' && hasOwnership,
      oracle: oracleResult.context.locks.persona?.detected === 'oracle' && hasOracleOwnership,
      therapist: therapistResult.context.locks.persona?.detected === 'therapist' && hasTherapistOwnership,
      secretary: secretaryResult.context.locks.persona?.detected === 'secretary' && hasSecretaryOwnership,
      noPersona: !noPersonaResult.context.locks.persona?.detected && hasNoPersonaOwnership,
      momentum: momentumIncreasing
    }
  };
}

// Run if called directly
if (require.main === module) {
  testPersonaLayering()
    .then(results => {
      console.log('\n📊 Persona Test Results:', results);
      process.exit(results.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Persona test failed with error:', error);
      process.exit(1);
    });
}

module.exports = { testPersonaLayering };