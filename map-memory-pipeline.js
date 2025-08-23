const fs = require('fs');
const path = require('path');

console.log('=== ECHO RUBICON MEMORY PIPELINE MAPPING ===\n');
console.log('Tracing the complete memory flow from user input to Q response...\n');

// Helper to check if file contains specific patterns
function analyzeFile(filePath, patterns) {
  if (!fs.existsSync(filePath)) return { exists: false };
  
  const content = fs.readFileSync(filePath, 'utf8');
  const results = { exists: true, matches: {} };
  
  patterns.forEach(pattern => {
    const regex = new RegExp(pattern.regex, 'gm');
    const matches = content.match(regex) || [];
    if (matches.length > 0) {
      results.matches[pattern.name] = {
        count: matches.length,
        samples: matches.slice(0, 3)
      };
    }
  });
  
  return results;
}

// 1. FRONTEND LAYER
console.log('1. FRONTEND LAYER (User Input → Memory Request)');
console.log('================================================');

const frontendFile = './components/MyAI-global.js';
const frontendPatterns = [
  { name: 'Voice Input Handler', regex: 'sendVoiceCommand|voicePrompt' },
  { name: 'Memory Context Building', regex: 'memoryContext|buildMemoryContext' },
  { name: 'Vault Search Calls', regex: 'searchNotes|search-notes|searchVault' },
  { name: 'Q-Lib Extraction Calls', regex: 'qlib-extract|qlibExtract' },
  { name: 'Context Enhancement', regex: 'enhancedContext|enhancedPrompt' },
  { name: 'Identity Detection', regex: 'isIdentityQuestion' },
  { name: 'API Calls', regex: 'apiCall\\(' }
];

const frontendAnalysis = analyzeFile(frontendFile, frontendPatterns);
if (frontendAnalysis.exists) {
  console.log(`✓ ${frontendFile}`);
  Object.entries(frontendAnalysis.matches).forEach(([feature, data]) => {
    console.log(`  └─ ${feature}: ${data.count} implementations`);
    data.samples.forEach(sample => console.log(`     • ${sample.trim()}`));
  });
} else {
  console.log(`✗ ${frontendFile} NOT FOUND`);
}

// 2. IPC BRIDGE LAYER
console.log('\n2. IPC BRIDGE LAYER (Frontend → Backend Communication)');
console.log('=====================================================');

const preloadFile = './preload.js';
const preloadPatterns = [
  { name: 'IPC Invoke Exposed', regex: 'invoke:.*=>.*ipcRenderer\\.invoke' },
  { name: 'Search Methods', regex: 'searchNotes|search-vault' },
  { name: 'Q-Lib Methods', regex: 'qlibExtract|qlib-' },
  { name: 'Memory Methods', regex: 'memory:|processConversation' }
];

const preloadAnalysis = analyzeFile(preloadFile, preloadPatterns);
if (preloadAnalysis.exists) {
  console.log(`✓ ${preloadFile}`);
  Object.entries(preloadAnalysis.matches).forEach(([feature, data]) => {
    console.log(`  └─ ${feature}: ${data.count} methods`);
  });
}

// 3. BACKEND HANDLERS
console.log('\n3. BACKEND HANDLERS (IPC → Services)');
console.log('====================================');

const handlersFile = './main/ipc-handlers.js';
const handlerPatterns = [
  { name: 'Search Handlers', regex: 'safeHandle\\([\'"](?:search-notes|search-vault|vault:search)[\'"]' },
  { name: 'Q-Lib Handlers', regex: 'safeHandle\\([\'"]qlib-(?:extract|summarize|categorize)[\'"]' },
  { name: 'Memory Handlers', regex: 'safeHandle\\([\'"]memory:(?:build-context|get-stats|process)[\'"]' },
  { name: 'Vault Operations', regex: 'vault:(?:getNotes|count)' },
  { name: 'MemoryService Usage', regex: 'memoryService\\.' }
];

const handlersAnalysis = analyzeFile(handlersFile, handlerPatterns);
if (handlersAnalysis.exists) {
  console.log(`✓ ${handlersFile}`);
  Object.entries(handlersAnalysis.matches).forEach(([feature, data]) => {
    console.log(`  └─ ${feature}: ${data.count} handlers`);
    data.samples.forEach(sample => console.log(`     • ${sample.trim()}`));
  });
}

// 4. MEMORY SERVICE LAYER
console.log('\n4. MEMORY SERVICE LAYER (Core Memory Operations)');
console.log('===============================================');

const memServiceFile = './src/echo/memory/MemoryService.js';
const memServicePatterns = [
  { name: 'Q-Lib Model Calls', regex: 'callQLib|this\\.qlibModel' },
  { name: 'Memory Extraction', regex: 'extractRelevantMemory|extractMemory' },
  { name: 'Capsule Operations', regex: 'capsule|saveCapsule|getCapsule' },
  { name: 'API Wrapper Usage', regex: 'apiCall|api-wrapper' }
];

const memServiceAnalysis = analyzeFile(memServiceFile, memServicePatterns);
if (memServiceAnalysis.exists) {
  console.log(`✓ ${memServiceFile}`);
  Object.entries(memServiceAnalysis.matches).forEach(([feature, data]) => {
    console.log(`  └─ ${feature}: ${data.count} references`);
  });
}

// 5. API/MODEL LAYER
console.log('\n5. API/MODEL LAYER (Q-Lib → Ollama)');
console.log('====================================');

const apiWrapperFile = './src/echo/memory/api-wrapper.js';
const apiPatterns = [
  { name: 'Fetch Implementation', regex: 'fetch|require.*node-fetch' },
  { name: 'Ollama Calls', regex: 'localhost:11434|ollama' },
  { name: 'Model Configuration', regex: 'model:|llama3\\.2:1b' }
];

const apiAnalysis = analyzeFile(apiWrapperFile, apiPatterns);
if (apiAnalysis.exists) {
  console.log(`✓ ${apiWrapperFile}`);
  Object.entries(apiAnalysis.matches).forEach(([feature, data]) => {
    console.log(`  └─ ${feature}: ${data.count} instances`);
  });
  
  // Check for ES Module error
  const content = fs.readFileSync(apiWrapperFile, 'utf8');
  if (content.includes('require') && content.includes('node-fetch')) {
    console.log('  ⚠️  ES MODULE ERROR DETECTED - needs dynamic import fix');
  }
}

// 6. VAULT INTEGRATION
console.log('\n6. VAULT INTEGRATION (File System Access)');
console.log('=========================================');

const vaultFiles = [
  './src/echo/memory/capsuleRetriever.js',
  './src/echo/memory/MemoryVaultManager.js'
];

vaultFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✓ ${file}`);
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('searchCapsules')) console.log('  └─ Has capsule search');
    if (content.includes('.echo')) console.log('  └─ Accesses .echo folder');
    if (content.includes('fs.')) console.log('  └─ Direct file system access');
  }
});

// 7. SERVER ENDPOINTS
console.log('\n7. SERVER ENDPOINTS (Express → Q)');
console.log('=================================');

const serverFile = './main/server.js';
const serverPatterns = [
  { name: 'Local Endpoint', regex: '/local[\'"]?\\s*,' },
  { name: 'Identity Loading', regex: 'onboarding-config\\.json|loadIdentity' },
  { name: 'Ollama Integration', regex: 'localhost:11434|ollama' },
  { name: 'System Prompt Building', regex: 'finalSystemPrompt|identityCore' }
];

const serverAnalysis = analyzeFile(serverFile, serverPatterns);
if (serverAnalysis.exists) {
  console.log(`✓ ${serverFile}`);
  Object.entries(serverAnalysis.matches).forEach(([feature, data]) => {
    console.log(`  └─ ${feature}: ${data.count} implementations`);
  });
}

// 8. FLOW SUMMARY
console.log('\n8. COMPLETE MEMORY PIPELINE FLOW');
console.log('=================================');

console.log('\nUser Input → Frontend → IPC → Backend → Services → Model → Response');
console.log('\nDetailed Flow:');
console.log('1. User speaks/types in MyAI-global.js');
console.log('2. sendVoiceCommand() processes input');
console.log('3. Searches vault via searchNotes IPC call');
console.log('4. Calls qlib-extract for memory extraction');
console.log('5. IPC handlers route to MemoryService');
console.log('6. MemoryService calls Q-Lib model via api-wrapper');
console.log('7. Results enhance context');
console.log('8. Enhanced prompt sent to /local endpoint');
console.log('9. Server injects identity and sends to Ollama');
console.log('10. Response streams back to user');

// 9. IDENTIFIED BREAKS
console.log('\n9. IDENTIFIED PIPELINE BREAKS');
console.log('=============================');

const breaks = [];

// Check for specific issues
if (apiAnalysis.exists) {
  const apiContent = fs.readFileSync(apiWrapperFile, 'utf8');
  if (apiContent.includes('require') && apiContent.includes('node-fetch')) {
    breaks.push('❌ ES Module error in api-wrapper.js - blocks Q-Lib extraction');
  }
}

if (!fs.existsSync('./src/memory/QLib.js') && !fs.existsSync('./src/echo/memory/QLib.js')) {
  breaks.push('⚠️  No QLib.js module found (but MemoryService handles Q-Lib functions)');
}

// Check for userInput error
if (frontendAnalysis.exists) {
  const frontContent = fs.readFileSync(frontendFile, 'utf8');
  if (frontContent.includes('${userInput}')) {
    breaks.push('❌ userInput variable reference found (should be voicePrompt)');
  }
}

if (breaks.length > 0) {
  breaks.forEach(b => console.log(b));
} else {
  console.log('✓ No obvious breaks detected');
}

// 10. KEY FUNCTIONS MAP
console.log('\n10. KEY FUNCTION LOCATIONS');
console.log('==========================');

const functionMap = {
  'User Input Processing': 'MyAI-global.js → sendVoiceCommand()',
  'Vault Search': 'ipc-handlers.js → search-notes handler',
  'Q-Lib Extraction': 'ipc-handlers.js → qlib-extract → MemoryService.extractRelevantMemory()',
  'Memory Context Building': 'MyAI-global.js → builds enhancedPrompt',
  'Identity Injection': 'server.js → /local endpoint → loads from onboarding-config.json',
  'Ollama Communication': 'api-wrapper.js → apiCall() → localhost:11434',
  'Capsule Storage': 'MemoryVaultManager.js → saveCapsule()',
  'Context Retrieval': 'capsuleRetriever.js → searchCapsules()'
};

Object.entries(functionMap).forEach(([func, location]) => {
  console.log(`${func}:`);
  console.log(`  └─ ${location}`);
});

console.log('\n=== END MEMORY PIPELINE MAP ===');