#!/usr/bin/env node
// echo-diagnostic.js - Comprehensive Memory System Audit
// Run with: node echodiag2.js

const fs = require('fs');
const path = require('path');

console.log('🔍 ECHO RUBICON MEMORY SYSTEM DIAGNOSTIC');
console.log('=' .repeat(60));

const VAULT_PATH = 'D:\\Obsidian Vault';
const PROJECT_ROOT = process.cwd();

// Track all issues found
const issues = [];
const successes = [];

function logSuccess(message) {
  console.log('✅', message);
  successes.push(message);
}

function logError(message, error = null) {
  console.log('❌', message);
  if (error) console.log('   Error:', error.message);
  issues.push(message + (error ? `: ${error.message}` : ''));
}

function logInfo(message) {
  console.log('ℹ️ ', message);
}

// 1. ENVIRONMENT CHECK
console.log('\n1. ENVIRONMENT CHECK');
console.log('-'.repeat(20));
logInfo(`Node.js version: ${process.version}`);
logInfo(`Working directory: ${PROJECT_ROOT}`);
logInfo(`Platform: ${process.platform}`);

// 2. VAULT PATH CHECK
console.log('\n2. VAULT PATH CHECK');
console.log('-'.repeat(20));
if (fs.existsSync(VAULT_PATH)) {
  logSuccess(`Vault exists: ${VAULT_PATH}`);
  
  // Check vault structure
  const echoPath = path.join(VAULT_PATH, '.echo');
  if (fs.existsSync(echoPath)) {
    logSuccess('.echo directory exists');
    
    const capsulesPath = path.join(echoPath, 'capsules');
    if (fs.existsSync(capsulesPath)) {
      logSuccess('Capsules directory exists');
      
      // Count existing capsules
      try {
        const capsuleFiles = fs.readdirSync(capsulesPath, { recursive: true })
          .filter(f => f.endsWith('.json'));
        logSuccess(`Found ${capsuleFiles.length} existing capsule files`);
      } catch (err) {
        logError('Failed to read capsules directory', err);
      }
    } else {
      logError('Capsules directory missing');
    }
  } else {
    logError('.echo directory missing');
  }
} else {
  logError(`Vault not found: ${VAULT_PATH}`);
}

// 3. MEMORY SYSTEM IMPORTS
console.log('\n3. MEMORY SYSTEM IMPORTS');
console.log('-'.repeat(30));

const imports = [
  { name: 'MemorySystem', path: './src/memory/index.js' },
  { name: 'MemoryVaultManager', path: './src/memory/MemoryVaultManager.js' },
  { name: 'MemoryService', path: './src/echo/memory/MemoryService.js' },
  { name: 'CapsuleRetriever', path: './src/echo/memory/capsuleRetriever.js' },
  { name: 'ContextInjector', path: './src/echo/memory/ContextInjector.js' },
  { name: 'QLibInterface', path: './src/memory/QLibInterface.js' }
];

let memorySystem = null;
let memoryVaultManager = null;

for (const imp of imports) {
  try {
    const fullPath = path.join(PROJECT_ROOT, imp.path);
    
    if (!fs.existsSync(fullPath)) {
      logError(`File not found: ${imp.path}`);
      continue;
    }
    
    const module = require(fullPath);
    
    if (imp.name === 'MemorySystem') {
      if (module.MemorySystem) {
        logSuccess(`${imp.name} imported successfully`);
        
        // Try to instantiate
        try {
          memorySystem = new module.MemorySystem(VAULT_PATH);
          logSuccess('MemorySystem instantiated successfully');
          
          // Test methods
          const methods = ['buildContextForInput', 'processConversation', 'search', 'getStats'];
          for (const method of methods) {
            if (typeof memorySystem[method] === 'function') {
              logSuccess(`Method ${method} exists`);
            } else {
              logError(`Method ${method} missing`);
            }
          }
        } catch (err) {
          logError('MemorySystem instantiation failed', err);
        }
      } else {
        logError(`${imp.name} not exported from module`);
      }
    } else if (imp.name === 'MemoryVaultManager') {
      if (module.MemoryVaultManager) {
        logSuccess(`${imp.name} imported successfully`);
        
        try {
          memoryVaultManager = new module.MemoryVaultManager(VAULT_PATH);
          logSuccess('MemoryVaultManager instantiated successfully');
        } catch (err) {
          logError('MemoryVaultManager instantiation failed', err);
        }
      } else {
        logError(`${imp.name} not exported from module`);
      }
    } else {
      // Other imports
      const exported = Object.keys(module);
      if (exported.length > 0) {
        logSuccess(`${imp.name} module loaded (exports: ${exported.join(', ')})`);
      } else {
        logError(`${imp.name} module has no exports`);
      }
    }
  } catch (err) {
    logError(`Failed to import ${imp.name} from ${imp.path}`, err);
  }
}

// 4. IPC HANDLERS CHECK
console.log('\n4. IPC HANDLERS CHECK');
console.log('-'.repeat(20));

const ipcHandlersPath = path.join(PROJECT_ROOT, 'main/ipc-handlers.js');
if (fs.existsSync(ipcHandlersPath)) {
  logSuccess('ipc-handlers.js found');
  
  try {
    const content = fs.readFileSync(ipcHandlersPath, 'utf8');
    
    // Check for key handlers
    const handlers = [
      'appendCapsule',
      'chat:send',
      'memory:build-context',
      'memory:process-conversation',
      'qlib-extract'
    ];
    
    for (const handler of handlers) {
      if (content.includes(`'${handler}'`) || content.includes(`"${handler}"`)) {
        logSuccess(`Handler '${handler}' found`);
      } else {
        logError(`Handler '${handler}' missing`);
      }
    }
    
    // Check for initializeMemorySystems
    if (content.includes('initializeMemorySystems')) {
      logSuccess('initializeMemorySystems function found');
      
      // Check if it's called
      if (content.includes('initializeMemorySystems()')) {
        logSuccess('initializeMemorySystems is called');
      } else {
        logError('initializeMemorySystems defined but never called');
      }
    } else {
      logError('initializeMemorySystems function missing');
    }
    
  } catch (err) {
    logError('Failed to read ipc-handlers.js', err);
  }
} else {
  logError('ipc-handlers.js not found');
}

// 5. MAIN PROCESS CHECK
console.log('\n5. MAIN PROCESS CHECK');
console.log('-'.repeat(20));

const mainFiles = ['main.js', 'app.js', 'main/app.js'];
let mainFound = false;

for (const mainFile of mainFiles) {
  const mainPath = path.join(PROJECT_ROOT, mainFile);
  if (fs.existsSync(mainPath)) {
    logSuccess(`Main process file found: ${mainFile}`);
    mainFound = true;
    
    try {
      const content = fs.readFileSync(mainPath, 'utf8');
      
      if (content.includes('ipc-handlers')) {
        logSuccess('ipc-handlers is imported in main process');
      } else {
        logError('ipc-handlers NOT imported in main process');
      }
    } catch (err) {
      logError(`Failed to read ${mainFile}`, err);
    }
    break;
  }
}

if (!mainFound) {
  logError('No main process file found');
}

// 6. MEMORY SYSTEM INTEGRATION TEST
console.log('\n6. MEMORY SYSTEM INTEGRATION TEST');
console.log('-'.repeat(35));

if (memorySystem) {
  try {
    logInfo('Testing memory system integration...');
    
    // Test context building
    const testInput = "test memory query";
    const context = await global.memorySystem.buildContextForInput(testInput);
    
    if (context && typeof context === 'object') {
      logSuccess('buildContextForInput works');
      logInfo(`Context keys: ${Object.keys(context).join(', ')}`);
    } else {
      logError('buildContextForInput returned invalid result');
    }
    
  } catch (err) {
    logError('Memory system integration test failed', err);
  }
} else {
  logError('Cannot test - MemorySystem not available');
}

// 7. CONFIGURATION CHECK
console.log('\n7. CONFIGURATION CHECK');
console.log('-'.repeat(22));

const configPaths = [
  'package.json',
  'main/store.js',
  'onboarding-config.json'
];

for (const configPath of configPaths) {
  const fullPath = path.join(PROJECT_ROOT, configPath);
  if (fs.existsSync(fullPath)) {
    logSuccess(`Config file exists: ${configPath}`);
    
    if (configPath === 'package.json') {
      try {
        const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        logInfo(`Main entry: ${pkg.main || 'not specified'}`);
        logInfo(`Scripts: ${Object.keys(pkg.scripts || {}).join(', ')}`);
      } catch (err) {
        logError('Failed to parse package.json', err);
      }
    }
  } else {
    logError(`Config file missing: ${configPath}`);
  }
}

// 8. SUMMARY
console.log('\n8. DIAGNOSTIC SUMMARY');
console.log('='.repeat(60));

console.log(`\n✅ SUCCESSES (${successes.length}):`);
successes.forEach(s => console.log(`   • ${s}`));

console.log(`\n❌ ISSUES FOUND (${issues.length}):`);
issues.forEach(i => console.log(`   • ${i}`));

// 9. RECOMMENDATIONS
console.log('\n9. RECOMMENDATIONS');
console.log('-'.repeat(18));

if (issues.length === 0) {
  console.log('🎉 No issues found! Memory system should be working.');
} else {
  console.log('\n🔧 RECOMMENDED FIXES:');
  
  if (issues.some(i => i.includes('ipc-handlers NOT imported'))) {
    console.log('   1. Add require("./main/ipc-handlers") to your main process file');
  }
  
  if (issues.some(i => i.includes('initializeMemorySystems defined but never called'))) {
    console.log('   2. Call initializeMemorySystems() at the end of ipc-handlers.js');
  }
  
  if (issues.some(i => i.includes('Handler') && i.includes('missing'))) {
    console.log('   3. Add missing IPC handlers to ipc-handlers.js');
  }
  
  if (issues.some(i => i.includes('MemorySystem instantiation failed'))) {
    console.log('   4. Fix MemorySystem constructor - check dependency imports');
  }
  
  if (issues.some(i => i.includes('Vault not found'))) {
    console.log('   5. Create or verify vault path: ' + VAULT_PATH);
  }
}

console.log('\n🏁 Diagnostic complete!');
console.log('Run this script again after making fixes to verify.');