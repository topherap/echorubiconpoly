const fs = require('fs');
const path = require('path');

console.log('=== ECHO RUBICON MEMORY PIPELINE DIAGNOSTIC ===\n');

// 1. Check Frontend Pipeline
console.log('1. FRONTEND PIPELINE CHECK:');
console.log('---------------------------');

// Check if window.electronAPI.invoke exists in preload
const preloadPath = './preload.js';
if (fs.existsSync(preloadPath)) {
  const preloadContent = fs.readFileSync(preloadPath, 'utf8');
  console.log('✓ preload.js exists');
  console.log(`  - qlibExtract exposed: ${preloadContent.includes('qlibExtract') ? '✓' : '✗'}`);
  console.log(`  - invoke method exposed: ${preloadContent.includes('invoke:') ? '✓' : '✗'}`);
} else {
  console.log('✗ preload.js NOT FOUND');
}

// Check MyAI-global.js for Q-Lib calls
const myAIPath = './components/MyAI-global.js';
if (fs.existsSync(myAIPath)) {
  const myAIContent = fs.readFileSync(myAIPath, 'utf8');
  console.log('\n✓ MyAI-global.js exists');
  console.log(`  - Calls qlib-extract: ${myAIContent.includes("'qlib-extract'") ? '✓' : '✗'}`);
  console.log(`  - Has buildVaultContext: ${myAIContent.includes('buildVaultContext') ? '✓' : '✗'}`);
  console.log(`  - Variable 'userInput': ${myAIContent.includes('userInput') ? '✗ EXISTS (should be voicePrompt)' : '✓ Not found (good)'}`);
} else {
  console.log('✗ MyAI-global.js NOT FOUND');
}

// 2. Check IPC Handlers
console.log('\n2. IPC HANDLERS CHECK:');
console.log('----------------------');

const ipcPath = './main/ipc-handlers.js';
if (fs.existsSync(ipcPath)) {
  const ipcContent = fs.readFileSync(ipcPath, 'utf8');
  console.log('✓ ipc-handlers.js exists');
  console.log(`  - Has qlib-extract handler: ${ipcContent.includes("'qlib-extract'") ? '✓' : '✗'}`);
  console.log(`  - MemoryService imported: ${ipcContent.includes('MemoryService') ? '✓' : '✗'}`);
  console.log(`  - memoryService initialized: ${ipcContent.includes('let memoryService') ? '✓' : '✗'}`);
  
  // Check for QLib references
  const qlibMatches = ipcContent.match(/QLib\./g);
  if (qlibMatches) {
    console.log(`  - ✗ QLib references found (${qlibMatches.length}x) but QLib not imported!`);
  }
} else {
  console.log('✗ ipc-handlers.js NOT FOUND');
}

// 3. Check Memory Service
console.log('\n3. MEMORY SERVICE CHECK:');
console.log('------------------------');

const memServicePath = './src/echo/memory/MemoryService.js';
if (fs.existsSync(memServicePath)) {
  const memServiceContent = fs.readFileSync(memServicePath, 'utf8');
  console.log('✓ MemoryService.js exists');
  console.log(`  - Has extractRelevantMemory: ${memServiceContent.includes('extractRelevantMemory') ? '✓' : '✗'}`);
  console.log(`  - Has callQLib method: ${memServiceContent.includes('callQLib') ? '✓' : '✗'}`);
  console.log(`  - Uses QLIB_MODEL: ${memServiceContent.includes('QLIB_MODEL') ? '✓' : '✗'}`);
} else {
  console.log('✗ MemoryService.js NOT FOUND');
}

// 4. Check for Missing QLib Module
console.log('\n4. QLIB MODULE CHECK:');
console.log('---------------------');

const possibleQLIbPaths = [
  './src/memory/QLib.js',
  './src/echo/memory/QLib.js',
  './src/QLib.js',
  './main/QLib.js'
];

let qlibFound = false;
possibleQLIbPaths.forEach(qlibPath => {
  if (fs.existsSync(qlibPath)) {
    console.log(`✓ Found QLib at: ${qlibPath}`);
    qlibFound = true;
  }
});

if (!qlibFound) {
  console.log('✗ QLib.js NOT FOUND in any expected location');
  console.log('  This explains "QLib is not defined" errors!');
}

// 5. Check API Wrapper
console.log('\n5. API WRAPPER CHECK:');
console.log('--------------------');

const apiWrapperPath = './src/echo/memory/api-wrapper.js';
if (fs.existsSync(apiWrapperPath)) {
  console.log('✓ api-wrapper.js exists');
  const apiContent = fs.readFileSync(apiWrapperPath, 'utf8');
  console.log(`  - Has apiCall function: ${apiContent.includes('apiCall') ? '✓' : '✗'}`);
} else {
  console.log('✗ api-wrapper.js NOT FOUND');
}

// 6. Check Vault Search
console.log('\n6. VAULT SEARCH CHECK:');
console.log('---------------------');

// Check for search handlers
if (fs.existsSync(ipcPath)) {
  const ipcContent = fs.readFileSync(ipcPath, 'utf8');
  console.log(`  - search-vault handler: ${ipcContent.includes("'search-vault'") ? '✓' : '✗'}`);
  console.log(`  - search-notes handler: ${ipcContent.includes("'search-notes'") ? '✓' : '✗'}`);
  console.log(`  - vault:count handler: ${ipcContent.includes("'vault:count'") ? '✓' : '✗'}`);
}

// 7. Pipeline Flow Summary
console.log('\n7. PIPELINE FLOW SUMMARY:');
console.log('-------------------------');
console.log('Frontend → IPC → MemoryService → Ollama (Q-Lib model)');
console.log('\nBREAKS DETECTED:');

const breaks = [];
if (!qlibFound) breaks.push('- QLib.js module missing (referenced but not found)');
if (fs.existsSync(myAIPath) && fs.readFileSync(myAIPath, 'utf8').includes('userInput')) {
  breaks.push('- userInput variable error in MyAI-global.js');
}
if (fs.existsSync(ipcPath) && fs.readFileSync(ipcPath, 'utf8').includes('QLib.') && !qlibFound) {
  breaks.push('- QLib references in ipc-handlers.js but no QLib import');
}

if (breaks.length > 0) {
  breaks.forEach(b => console.log(b));
} else {
  console.log('- No obvious breaks detected');
}

console.log('\n=== END DIAGNOSTIC ===');