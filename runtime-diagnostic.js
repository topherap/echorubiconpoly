// runtime-diagnostic.js
// Runtime diagnostic for Echo Rubicon while system is running

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const net = require('net');

const CONFIG = {
  ROOT: path.resolve(__dirname),
  VAULT_PATH: 'D:\\Obsidian Vault',
  LOGS_DIR: path.join(__dirname, 'logs'),
  RUNTIME_TEST_QUERIES: [
    'what are my clients?',
    'list my recipes', 
    'what are my lifts?'
  ]
};

const RUNTIME_DIAGNOSTIC = {
  meta: {
    timestamp: new Date().toISOString(),
    version: '2.0.0-runtime',
    system_running: false
  },
  
  runtime_tests: {
    memory_system_actual: { status: 'UNKNOWN', errors: [], runtime_failures: [] },
    ipc_live_test: { status: 'UNKNOWN', handlers_responding: {}, errors: [] },
    chat_pipeline_live: { status: 'UNKNOWN', stages: {}, breaks: [], timing: {} },
    context_injection_live: { status: 'UNKNOWN', injections: [], failures: [] }
  },
  
  runtime_errors: [],
  live_memory_flow: [],
  actual_breaks: [],
  
  recommendations: {
    runtime_fixes: [],
    immediate: []
  }
};

async function testSystemRunning() {
  console.log('🔍 [1/5] Checking if Echo Rubicon is running...');
  
  const services = [
    { name: 'Express Backend', port: 49200, critical: true },
    { name: 'Ollama', port: 11434, critical: true }
  ];
  
  let runningServices = 0;
  
  for (const service of services) {
    const isUp = await checkPort('127.0.0.1', service.port);
    if (isUp) runningServices++;
    console.log(`  ${service.name}: ${isUp ? '✅ UP' : '❌ DOWN'}`);
  }
  
  RUNTIME_DIAGNOSTIC.meta.system_running = runningServices >= 2;
  
  if (!RUNTIME_DIAGNOSTIC.meta.system_running) {
    console.log('❌ Echo Rubicon not running - start with npm start first');
    return false;
  }
  
  console.log('✅ Echo Rubicon is running');
  return true;
}

async function testMemorySystemRuntime() {
  console.log('\n🧠 [2/5] Testing Memory System at Runtime...');
  
  try {
    // Import and test the actual memory system
    const memoryPath = path.join(CONFIG.ROOT, 'src/memory/index.js');
    const MemorySystem = require(memoryPath).MemorySystem;
    
    const memorySystem = new MemorySystem(CONFIG.VAULT_PATH);
    
    console.log('  📝 Testing buildContextForInput...');
    
    for (const query of CONFIG.RUNTIME_TEST_QUERIES) {
      try {
        console.log(`    Testing: "${query}"`);
        
        // This is where the ./relevantCapsules error should occur
        const result = await memorySystem.buildContextForInput(query);
        
        RUNTIME_DIAGNOSTIC.runtime_tests.memory_system_actual.status = 'PASS';
        console.log(`    ✅ Success: ${JSON.stringify(result).substring(0, 100)}...`);
        
      } catch (err) {
        console.log(`    ❌ Runtime Error: ${err.message}`);
        
        RUNTIME_DIAGNOSTIC.runtime_tests.memory_system_actual.runtime_failures.push({
          query,
          error: err.message,
          stack: err.stack?.split('\n').slice(0, 3)
        });
        
        if (err.message.includes('relevantCapsules')) {
          RUNTIME_DIAGNOSTIC.actual_breaks.push({
            type: 'MISSING_MODULE',
            module: './relevantCapsules',
            location: 'src/memory/index.js',
            line: err.stack?.match(/:(\d+):/)?.[1] || 'unknown'
          });
        }
        
        RUNTIME_DIAGNOSTIC.runtime_tests.memory_system_actual.status = 'BROKEN';
      }
    }
    
  } catch (err) {
    console.log(`  ❌ Import Error: ${err.message}`);
    RUNTIME_DIAGNOSTIC.runtime_tests.memory_system_actual.errors.push(err.message);
    RUNTIME_DIAGNOSTIC.runtime_tests.memory_system_actual.status = 'BROKEN';
  }
}

async function testChatPipelineLive() {
  console.log('\n💬 [3/5] Testing Live Chat Pipeline...');
  
  // We can't directly invoke IPC from outside Electron, but we can:
  // 1. Check if the handlers are properly loaded
  // 2. Test the memory system components they use
  // 3. Simulate the chat flow
  
  const ipcPath = path.join(CONFIG.ROOT, 'main/ipc-handlers.js');
  const content = await fs.readFile(ipcPath, 'utf8');
  
  // Find the chat-completion handler
  console.log('  🔍 Analyzing chat-completion handler...');
  
  const chatHandlerMatch = content.match(/safeHandle\('chat-completion'[\s\S]*?}\);/);
  if (!chatHandlerMatch) {
    console.log('  ❌ chat-completion handler not found');
    RUNTIME_DIAGNOSTIC.runtime_tests.chat_pipeline_live.status = 'BROKEN';
    return;
  }
  
  const handlerCode = chatHandlerMatch[0];
  
  // Check for problematic patterns that would cause runtime failures
  console.log('  🔍 Checking for runtime failure patterns...');
  
  const problematicPatterns = [
    {
      pattern: /require\(['"]\.\/relevantCapsules['"]\)/,
      issue: 'Dynamic require of missing relevantCapsules module'
    },
    {
      pattern: /buildContextForInput\(/,
      issue: 'Calls buildContextForInput which imports missing module'
    },
    {
      pattern: /global\.memorySystem\.buildContextForInput/,
      issue: 'Uses global memory system with broken buildContextForInput'
    }
  ];
  
  for (const { pattern, issue } of problematicPatterns) {
    if (handlerCode.match(pattern)) {
      console.log(`  ⚠️  Found: ${issue}`);
      RUNTIME_DIAGNOSTIC.runtime_tests.chat_pipeline_live.breaks.push(issue);
    }
  }
  
  // Check if there are fallback mechanisms
  const hasFallbacks = handlerCode.includes('catch') || handlerCode.includes('try');
  console.log(`  🛡️  Error handling: ${hasFallbacks ? 'Present' : 'Missing'}`);
  
  if (RUNTIME_DIAGNOSTIC.runtime_tests.chat_pipeline_live.breaks.length > 0) {
    RUNTIME_DIAGNOSTIC.runtime_tests.chat_pipeline_live.status = 'BROKEN';
    RUNTIME_DIAGNOSTIC.recommendations.runtime_fixes.push('Fix runtime imports in chat-completion handler');
  } else {
    RUNTIME_DIAGNOSTIC.runtime_tests.chat_pipeline_live.status = 'HEALTHY';
  }
}

async function testContextInjectionLive() {
  console.log('\n💉 [4/5] Testing Context Injection at Runtime...');
  
  // Test if the memory system can actually build context
  try {
    const { MemoryVaultManager } = require('./src/memory/MemoryVaultManager');
    const manager = new MemoryVaultManager(CONFIG.VAULT_PATH);
    
    console.log('  📋 Testing memory search and context building...');
    
    for (const query of CONFIG.RUNTIME_TEST_QUERIES) {
      try {
        const results = await manager.searchMemories(query, { limit: 3 });
        
        if (results.length > 0) {
          console.log(`  ✅ "${query}": Found ${results.length} capsules`);
          
          // Check if we can build actual context from these results
          const contextData = {
            query,
            results_count: results.length,
            sample_content: results[0].content?.substring(0, 100) || 'No content',
            can_inject: results.length > 0 && results[0].content
          };
          
          RUNTIME_DIAGNOSTIC.runtime_tests.context_injection_live.injections.push(contextData);
          
        } else {
          console.log(`  ⚠️  "${query}": No results found`);
        }
        
      } catch (err) {
        console.log(`  ❌ "${query}": Error - ${err.message}`);
        RUNTIME_DIAGNOSTIC.runtime_tests.context_injection_live.failures.push({
          query,
          error: err.message
        });
      }
    }
    
    const successfulInjections = RUNTIME_DIAGNOSTIC.runtime_tests.context_injection_live.injections.length;
    RUNTIME_DIAGNOSTIC.runtime_tests.context_injection_live.status = 
      successfulInjections > 0 ? 'HEALTHY' : 'BROKEN';
    
  } catch (err) {
    console.log(`  ❌ MemoryVaultManager Error: ${err.message}`);
    RUNTIME_DIAGNOSTIC.runtime_tests.context_injection_live.status = 'BROKEN';
  }
}

async function diagnoseActualBreaks() {
  console.log('\n🔧 [5/5] Diagnosing Actual Runtime Breaks...');
  
  // Look for the specific missing file
  const relevantCapsulesPath = path.join(CONFIG.ROOT, 'src/memory/relevantCapsules.js');
  const exists = fsSync.existsSync(relevantCapsulesPath);
  
  console.log(`  📁 relevantCapsules.js exists: ${exists ? '✅ Yes' : '❌ No'}`);
  
  if (!exists) {
    RUNTIME_DIAGNOSTIC.actual_breaks.push({
      type: 'MISSING_FILE',
      file: 'src/memory/relevantCapsules.js',
      impact: 'Memory system buildContextForInput fails',
      fix: 'Create the missing file or fix the import'
    });
    
    RUNTIME_DIAGNOSTIC.recommendations.immediate.push('Create src/memory/relevantCapsules.js');
  }
  
  // Check what imports relevantCapsules
  const memoryIndexPath = path.join(CONFIG.ROOT, 'src/memory/index.js');
  const memoryContent = await fs.readFile(memoryIndexPath, 'utf8');
  
  const relevantCapsulesImports = memoryContent.match(/require\(['"]\.\/relevantCapsules['"]\)/g);
  if (relevantCapsulesImports) {
    console.log(`  📦 Found ${relevantCapsulesImports.length} imports of relevantCapsules`);
    
    // Find the line number where it's imported
    const lines = memoryContent.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('./relevantCapsules')) {
        console.log(`    Line ${index + 1}: ${line.trim()}`);
        RUNTIME_DIAGNOSTIC.actual_breaks.push({
          type: 'RUNTIME_IMPORT',
          location: `src/memory/index.js:${index + 1}`,
          code: line.trim(),
          fix: 'Remove import or create missing module'
        });
      }
    });
  }
  
  // Check for any other runtime-only issues
  const suspiciousRuntimePatterns = [
    { pattern: /threaderEngine not loaded/, file: 'any' },
    { pattern: /QLibInterface is not a constructor/, file: 'any' }
  ];
  
  for (const { pattern, file } of suspiciousRuntimePatterns) {
    if (memoryContent.match(pattern)) {
      RUNTIME_DIAGNOSTIC.runtime_errors.push({
        pattern: pattern.toString(),
        file: 'src/memory/index.js',
        type: 'RUNTIME_ERROR'
      });
    }
  }
}

async function generateRuntimeRecommendations() {
  console.log('\n💡 Generating Runtime-Specific Recommendations...');
  
  // Based on actual runtime failures
  if (RUNTIME_DIAGNOSTIC.actual_breaks.some(b => b.type === 'MISSING_FILE')) {
    RUNTIME_DIAGNOSTIC.recommendations.immediate.push(
      'IMMEDIATE: Create missing src/memory/relevantCapsules.js file'
    );
  }
  
  if (RUNTIME_DIAGNOSTIC.runtime_tests.memory_system_actual.status === 'BROKEN') {
    RUNTIME_DIAGNOSTIC.recommendations.runtime_fixes.push(
      'Fix memory system runtime failures before debugging chat pipeline'
    );
  }
  
  if (RUNTIME_DIAGNOSTIC.runtime_tests.context_injection_live.status === 'BROKEN') {
    RUNTIME_DIAGNOSTIC.recommendations.runtime_fixes.push(
      'Memory search works but context injection fails - check injection code'
    );
  }
  
  // Specific fixes for the relevantCapsules issue
  if (RUNTIME_DIAGNOSTIC.actual_breaks.some(b => b.file?.includes('relevantCapsules'))) {
    RUNTIME_DIAGNOSTIC.recommendations.immediate.push(
      'QUICK FIX: Comment out ./relevantCapsules import in src/memory/index.js temporarily'
    );
  }
}

async function checkPort(host, port, timeout = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => resolve(false));
    socket.connect(port, host);
  });
}

async function saveRuntimeReport() {
  try {
    await fs.mkdir(CONFIG.LOGS_DIR, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(CONFIG.LOGS_DIR, `runtime-diagnostic-${timestamp}.json`);
  
  await fs.writeFile(reportFile, JSON.stringify(RUNTIME_DIAGNOSTIC, null, 2));
  return reportFile;
}

async function runRuntimeDiagnostic() {
  console.log('🔬 ECHO RUBICON RUNTIME DIAGNOSTIC');
  console.log('='.repeat(50));
  console.log(`Started: ${RUNTIME_DIAGNOSTIC.meta.timestamp}\n`);
  
  const isRunning = await testSystemRunning();
  if (!isRunning) {
    console.log('\n❌ Cannot run runtime tests - system not running');
    console.log('Start Echo Rubicon first with: npm start');
    return RUNTIME_DIAGNOSTIC;
  }
  
  await testMemorySystemRuntime();
  await testChatPipelineLive();
  await testContextInjectionLive();
  await diagnoseActualBreaks();
  await generateRuntimeRecommendations();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 RUNTIME DIAGNOSTIC SUMMARY');
  console.log('='.repeat(25));
  
  console.log('\n🔄 RUNTIME TEST RESULTS:');
  Object.entries(RUNTIME_DIAGNOSTIC.runtime_tests).forEach(([test, result]) => {
    const icon = result.status === 'HEALTHY' ? '✅' : 
                 result.status === 'BROKEN' ? '❌' : '⚠️';
    console.log(`${icon} ${test}: ${result.status}`);
  });
  
  if (RUNTIME_DIAGNOSTIC.actual_breaks.length > 0) {
    console.log('\n🔴 ACTUAL RUNTIME BREAKS:');
    RUNTIME_DIAGNOSTIC.actual_breaks.forEach(breakPoint => {
      console.log(`❌ ${breakPoint.type}: ${breakPoint.file || breakPoint.location}`);
      if (breakPoint.fix) console.log(`   Fix: ${breakPoint.fix}`);
    });
  }
  
  if (RUNTIME_DIAGNOSTIC.recommendations.immediate.length > 0) {
    console.log('\n🚨 IMMEDIATE FIXES:');
    RUNTIME_DIAGNOSTIC.recommendations.immediate.forEach(fix => {
      console.log(`🔥 ${fix}`);
    });
  }
  
  if (RUNTIME_DIAGNOSTIC.recommendations.runtime_fixes.length > 0) {
    console.log('\n🔧 RUNTIME FIXES:');
    RUNTIME_DIAGNOSTIC.recommendations.runtime_fixes.forEach(fix => {
      console.log(`🛠️  ${fix}`);
    });
  }
  
  // Save report
  const reportFile = await saveRuntimeReport();
  console.log(`\n📄 Runtime diagnostic saved to: ${reportFile}`);
  
  const hasBreaks = RUNTIME_DIAGNOSTIC.actual_breaks.length > 0;
  const icon = hasBreaks ? '🚨' : '✅';
  console.log(`\n${icon} Runtime diagnostic complete`);
  
  return RUNTIME_DIAGNOSTIC;
}

if (require.main === module) {
  runRuntimeDiagnostic().catch(console.error);
}

module.exports = { runRuntimeDiagnostic, RUNTIME_DIAGNOSTIC };