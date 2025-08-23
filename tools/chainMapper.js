#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const util = require('util');

// Configuration
const LOG_TO_FILE = true;
const LOG_FILE = 'C:\\Users\\tophe\\Documents\\Echo Rubicon(july)\\logs\\chain-trace.jsonl';
const MAX_JSON_LENGTH = 200;
const MAX_ARRAY_PREVIEW = 3;

// Target modules based on your file structure
const TARGET_MODULES = {
  // Memory core modules
  memoryVault: '../src/memory/MemoryVaultManager.js',
  memoryIndex: '../src/memory/index.js',
  contextBuilder: '../src/memory/context.js',
  promptBuilder: '../src/memory/PromptBuilder.js',
  capsuleRetriever: '../src/echo/memory/capsuleRetriever.js',
  
  // Backend qlib modules
  chaosAnalyzer: '../backend/qlib/chaosanalyzer.js',
  contextInjector: '../backend/qlib/contextInjector-memoryBlock-patch.js',
  filterCapsules: '../backend/qlib/filterCapsulesByQuery.js',
  loadCapsules: '../backend/qlib/loadCapsules.js',
  
  // Component modules
  contextPipeline: '../components/contextPipeline.js',
  vaultSearch: '../components/vaultSearch.js',
  conversationSaver: '../components/conversationSaver.js',
  
  // Utils
  vaultPathManager: '../components/utils/VaultPathManager.js',
  identityManager: '../components/utils/identityManager.js'
};

// Ensure log directory exists
if (LOG_TO_FILE) {
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// Logging functions
function logToConsole(entry) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${entry.type} ${entry.module}.${entry.function} ${entry.phase}`);
  if (entry.data) {
    console.log(`  ${entry.phase === 'INPUT' ? '→' : '←'} ${entry.data}`);
  }
  if (entry.error) {
    console.error(`  ✗ ERROR: ${entry.error}`);
  }
}

function logToFile(entry) {
  if (!LOG_TO_FILE) return;
  
  try {
    const line = JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
      pid: process.pid
    }) + '\n';
    
    fs.appendFileSync(LOG_FILE, line);
  } catch (err) {
    console.error('Failed to write to log file:', err.message);
  }
}

function log(entry) {
  logToConsole(entry);
  logToFile(entry);
}

// Value summarization
function summarizeValue(value, depth = 0) {
  if (depth > 3) return '...';
  
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  const type = typeof value;
  
  if (type === 'function') {
    return `[Function: ${value.name || 'anonymous'}]`;
  }
  
  if (type === 'string') {
    if (value.length > 100) {
      return `"${value.slice(0, 97)}..." (${value.length} chars)`;
    }
    return `"${value}"`;
  }
  
  if (type === 'number' || type === 'boolean') {
    return String(value);
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length > MAX_ARRAY_PREVIEW) {
      const preview = value.slice(0, MAX_ARRAY_PREVIEW).map(v => summarizeValue(v, depth + 1));
      return `[${preview.join(', ')}, ... (${value.length} items)]`;
    }
    return `[${value.map(v => summarizeValue(v, depth + 1)).join(', ')}]`;
  }
  
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  if (value instanceof Error) {
    return `[Error: ${value.message}]`;
  }
  
  if (type === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    
    // Special handling for common patterns
    if (value.id && value.type && value.content) {
      return `{capsule: "${value.id}", type: "${value.type}"}`;
    }
    
    if (keys.length > 5) {
      return `{${keys.slice(0, 5).join(', ')}, ... (${keys.length} keys)}`;
    }
    
    const str = JSON.stringify(value, null, 2);
    if (str.length > MAX_JSON_LENGTH) {
      return str.slice(0, MAX_JSON_LENGTH) + '...}';
    }
    
    return `{${keys.join(', ')}}`;
  }
  
  return String(value);
}

// Function wrapper
function wrapFunction(fn, moduleName, functionName) {
  const isAsync = fn.constructor.name === 'AsyncFunction';
  
  if (isAsync) {
    return async function(...args) {
      const startTime = Date.now();
      
      // Log input
      log({
        type: '[CHAIN]',
        module: moduleName,
        function: functionName,
        phase: 'called',
        data: `[INPUT] ${args.map(arg => summarizeValue(arg)).join(', ')}`
      });
      
      try {
        const result = await fn.apply(this, args);
        const elapsed = Date.now() - startTime;
        
        // Log output
        log({
          type: '[CHAIN]',
          module: moduleName,
          function: functionName,
          phase: 'completed',
          data: `[OUTPUT] ${summarizeValue(result)} (${elapsed}ms)`
        });
        
        return result;
      } catch (error) {
        const elapsed = Date.now() - startTime;
        
        // Log error
        log({
          type: '[CHAIN]',
          module: moduleName,
          function: functionName,
          phase: 'failed',
          error: error.message,
          data: `[ERROR] ${error.stack} (${elapsed}ms)`
        });
        
        throw error;
      }
    };
  } else {
    return function(...args) {
      const startTime = Date.now();
      
      // Log input
      log({
        type: '[CHAIN]',
        module: moduleName,
        function: functionName,
        phase: 'called',
        data: `[INPUT] ${args.map(arg => summarizeValue(arg)).join(', ')}`
      });
      
      try {
        const result = fn.apply(this, args);
        const elapsed = Date.now() - startTime;
        
        // Handle potential promise returns from sync functions
        if (result && typeof result.then === 'function') {
          return result
            .then(res => {
              log({
                type: '[CHAIN]',
                module: moduleName,
                function: functionName,
                phase: 'completed',
                data: `[OUTPUT] ${summarizeValue(res)} (${elapsed}ms)`
              });
              return res;
            })
            .catch(err => {
              log({
                type: '[CHAIN]',
                module: moduleName,
                function: functionName,
                phase: 'failed',
                error: err.message,
                data: `[ERROR] ${err.stack} (${elapsed}ms)`
              });
              throw err;
            });
        }
        
        // Log output for sync results
        log({
          type: '[CHAIN]',
          module: moduleName,
          function: functionName,
          phase: 'completed',
          data: `[OUTPUT] ${summarizeValue(result)} (${elapsed}ms)`
        });
        
        return result;
      } catch (error) {
        const elapsed = Date.now() - startTime;
        
        // Log error
        log({
          type: '[CHAIN]',
          module: moduleName,
          function: functionName,
          phase: 'failed',
          error: error.message,
          data: `[ERROR] ${error.stack} (${elapsed}ms)`
        });
        
        throw error;
      }
    };
  }
}

// Module wrapper
function wrapModule(moduleExports, moduleName) {
  // If it's a function, wrap it directly
  if (typeof moduleExports === 'function') {
    return wrapFunction(moduleExports, moduleName, 'default');
  }
  
  // If it's an object, wrap all function properties
  if (typeof moduleExports === 'object' && moduleExports !== null) {
    const wrapped = {};
    
    for (const [key, value] of Object.entries(moduleExports)) {
      if (typeof value === 'function') {
        wrapped[key] = wrapFunction(value, moduleName, key);
      } else {
        wrapped[key] = value;
      }
    }
    
    // Preserve prototype chain if it's a class instance
    if (moduleExports.constructor && moduleExports.constructor.name !== 'Object') {
      Object.setPrototypeOf(wrapped, Object.getPrototypeOf(moduleExports));
    }
    
    return wrapped;
  }
  
  // Return as-is if not wrappable
  return moduleExports;
}

// Main execution
function main() {
  console.log('🔍 Echo Rubicon Chain Mapper Starting...');
  console.log(`📁 Log file: ${LOG_TO_FILE ? LOG_FILE : 'Console only'}`);
  console.log('📦 Loading and wrapping modules...\n');
  
  const wrappedModules = {};
  let successCount = 0;
  let failCount = 0;
  
  for (const [name, modulePath] of Object.entries(TARGET_MODULES)) {
    try {
      const resolvedPath = path.resolve(__dirname, modulePath);
      
      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        console.log(`⚠️  ${name}: File not found at ${resolvedPath}`);
        failCount++;
        continue;
      }
      
      // Load and wrap module
      const originalModule = require(resolvedPath);
      const wrappedModule = wrapModule(originalModule, name);
      
      wrappedModules[name] = wrappedModule;
      
      // Count functions wrapped
      const functionCount = typeof originalModule === 'function' ? 1 :
        Object.values(originalModule).filter(v => typeof v === 'function').length;
      
      console.log(`✅ ${name}: Wrapped ${functionCount} functions`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ ${name}: Failed to load - ${error.message}`);
      failCount++;
    }
  }
  
  console.log(`\n📊 Summary: ${successCount} modules loaded, ${failCount} failed`);
  
  // Export wrapped modules for use by other scripts
  module.exports = wrappedModules;
  
  // If running standalone, demonstrate usage
  if (require.main === module) {
    console.log('\n🧪 Running test traces...\n');
    
    // Example: Test VaultPathManager if loaded
    if (wrappedModules.vaultPathManager && wrappedModules.vaultPathManager.getVaultPath) {
      try {
        const vaultPath = wrappedModules.vaultPathManager.getVaultPath();
        console.log(`\n✨ Vault path retrieved: ${vaultPath}`);
      } catch (err) {
        console.error('Test failed:', err.message);
      }
    }
    
    // Example: Test identity manager if loaded
    if (wrappedModules.identityManager && wrappedModules.identityManager.loadIdentity) {
      try {
        const identity = wrappedModules.identityManager.loadIdentity();
        console.log(`\n✨ Identity loaded: ${identity ? 'Found' : 'Not found'}`);
      } catch (err) {
        console.error('Test failed:', err.message);
      }
    }
    
    console.log('\n🎯 Chain mapper ready! Import this module to use wrapped functions.');
    console.log('📝 Logs are being written to:', LOG_TO_FILE ? LOG_FILE : 'Console only');
  }
}

// Run if executed directly
if (require.main === module) {
  main();
} else {
  // If imported, just export the wrapper functions
  module.exports = { wrapModule, wrapFunction, log };
}