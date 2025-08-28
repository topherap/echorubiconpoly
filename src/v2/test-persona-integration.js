// test-persona-integration.js
const PersonaService = require('./services/personaService');
const persona = new PersonaService();

// Test various inputs
const tests = [
  { input: "fuck, where's my recipe?", expected: 'homie' },
  { input: "What's the ROI on this strategy?", expected: 'consigliere' },
  { input: "I'm scared about this", expected: 'therapist' },
  { input: "What is the meaning of existence?", expected: 'oracle' },
  { input: "Quick, need this now", expected: 'secretary' }
];

async function runTests() {
  for (const test of tests) {
    const result = await persona.detectPersona(test.input, {});
    console.log(`Input: "${test.input}"`);
    console.log(`Expected: ${test.expected}, Got: ${result.detected}`);
    console.log(`Confidence: ${result.confidence}`);
    console.log('---');
  }
}

runTests();