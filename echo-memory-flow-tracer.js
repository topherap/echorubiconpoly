// echo-memory-flow-tracer.js
// Real-time trace of actual memory flow from query to response

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

const CONFIG = {
  ROOT: path.resolve(__dirname),
  VAULT_PATH: 'D:\\Obsidian Vault',
  LOGS_DIR: path.join(__dirname, 'logs'),
  TEST_QUERY: 'What are my clients?'  // Known to have capsules
};

const TRACE = {
  timestamp: new Date().toISOString(),
  test_query: CONFIG.TEST_QUERY,
  flow_points: [],
  code_snippets: {},
  actual_breaks: [],
  memory_found_but_lost: [],
  recommendations: []
};

// Trace specific code sections
async function traceMemoryFlow() {
  console.log('🔍 TRACING MEMORY FLOW FOR:', CONFIG.TEST_QUERY);
  console.log('=' .repeat(50));
  
  const ipcPath = path.join(CONFIG.ROOT, 'main/ipc-handlers.js');
  const content = await fs.readFile(ipcPath, 'utf8');
  
  // 1. Find chat-completion handler specifically
  console.log('\n📍 [1] Finding chat-completion handler...');
  const chatCompletionStart = content.indexOf("safeHandle('chat-completion'");
  if (chatCompletionStart === -1) {
    TRACE.actual_breaks.push('chat-completion handler not found');
    return;
  }
  
  // Extract the full handler
  let braceCount = 0;
  let inHandler = false;
  let handlerEnd = chatCompletionStart;
  
  for (let i = chatCompletionStart; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      inHandler = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (inHandler && braceCount === 0) {
        handlerEnd = i + 1;
        break;
      }
    }
  }
  
  const handlerCode = content.substring(chatCompletionStart, handlerEnd);
  TRACE.code_snippets.chat_completion_handler = handlerCode.substring(0, 500) + '...';
  
  // 2. Check Q-lib observation
  console.log('\n📍 [2] Checking Q-lib observation...');
  const qlibObserveMatch = handlerCode.match(/\/\/ Q-LIB OBSERVES ALL CONVERSATIONS[\s\S]*?console\.log\([^)]+\);/);
  if (qlibObserveMatch) {
    TRACE.flow_points.push({
      stage: 'Q-lib Observation',
      code: qlibObserveMatch[0].substring(0, 200),
      status: 'FOUND'
    });
    
    // Check if qlibContext is used later
    const qlibContextUsed = handlerCode.includes('if (qlibContext && Array.isArray(qlibContext?.facts)');
    if (!qlibContextUsed) {
      TRACE.memory_found_but_lost.push('Q-lib extracts facts but they are not used');
    }
  }
  
  // 3. Check vault search trigger
  console.log('\n📍 [3] Checking vault search trigger...');
  const vaultKeywordsMatch = handlerCode.match(/const vaultKeywords = \[[\s\S]*?\];/);
  if (vaultKeywordsMatch) {
    TRACE.flow_points.push({
      stage: 'Vault Keywords Check',
      code: vaultKeywordsMatch[0],
      status: 'FOUND'
    });
    
    // Check if it actually searches
    const searchMatch = handlerCode.match(/if \(shouldSearchVault\) \{[\s\S]*?console\.log\('\[Q\] Vault search complete'/);
    if (searchMatch) {
      TRACE.flow_points.push({
        stage: 'Vault Search Execution',
        code: searchMatch[0].substring(0, 300),
        status: 'FOUND'
      });
    } else {
      TRACE.actual_breaks.push('Vault search condition exists but search not executed');
    }
  }
  
  // 4. CRITICAL: Check how context is injected
  console.log('\n📍 [4] Checking context injection methods...');
  
  // Method 1: Vault search results injection
  const vaultInjectionMatch = handlerCode.match(/if \(vaultSearchResults[\s\S]*?messages\[systemMessageIndex\]\.content \+= vaultContext;/);
  if (vaultInjectionMatch) {
    TRACE.flow_points.push({
      stage: 'Vault Context Injection',
      code: vaultInjectionMatch[0].substring(0, 400),
      status: 'FOUND'
    });
  } else {
    TRACE.actual_breaks.push('Vault results found but not injected into system message');
  }
  
  // Method 2: Q-lib context injection  
  const qlibInjectionPatterns = [
    /const enhancedMessages = \[[\s\S]*?\.\.\.(messages|filteredMessages)/,
    /messages\[0\]\.content.*?qlibContext/,
    /systemMessageIndex[\s\S]*?qlibContext/
  ];
  
  let qlibInjectionFound = false;
  for (const pattern of qlibInjectionPatterns) {
    const match = handlerCode.match(pattern);
    if (match) {
      TRACE.flow_points.push({
        stage: 'Q-lib Context Injection',
        code: match[0].substring(0, 400),
        status: 'FOUND'
      });
      qlibInjectionFound = true;
      break;
    }
  }
  
  if (!qlibInjectionFound) {
    TRACE.actual_breaks.push('Q-lib context extracted but never added to messages');
  }
  
  // 5. Check model call
  console.log('\n📍 [5] Checking model call...');
  const modelCallMatch = handlerCode.match(/await callOllamaModel\([\s\S]*?\);/);
  if (modelCallMatch) {
    const callParams = modelCallMatch[0];
    
    // Check what's being passed
    if (callParams.includes('enhancedMessages')) {
      TRACE.flow_points.push({
        stage: 'Model Call with Enhanced Messages',
        code: callParams,
        status: 'FOUND'
      });
    } else if (callParams.includes('messages')) {
      TRACE.flow_points.push({
        stage: 'Model Call with Base Messages',
        code: callParams,
        status: 'WARNING'
      });
      TRACE.memory_found_but_lost.push('Model called with base messages, not enhanced');
    }
  }
  
  // 6. Check for format stripping
  console.log('\n📍 [6] Checking for format stripping...');
  const formatMatch = handlerCode.match(/formatMessagesForModel/);
  if (formatMatch) {
    // Look at formatMessagesForModel function
    const formatFuncMatch = content.match(/function formatMessagesForModel[\s\S]*?return messages;/);
    if (formatFuncMatch) {
      const formatFunc = formatFuncMatch[0];
      if (formatFunc.includes('combineSystemMessages')) {
        TRACE.flow_points.push({
          stage: 'Message Formatting',
          code: 'Combines system messages for OpenChat',
          status: 'FOUND'
        });
        
        // Check if memory survives combining
        if (!formatFunc.includes('MEMORY CONTEXT')) {
          TRACE.memory_found_but_lost.push('Memory may be lost during message combining');
        }
      }
    }
  }
  
  // 7. Find the ACTUAL model response path
  console.log('\n📍 [7] Tracing actual response generation...');
  const responsePatterns = [
    /response = \{[\s\S]*?content:[\s\S]*?model:/,
    /return \{[\s\S]*?content:[\s\S]*?model:/
  ];
  
  for (const pattern of responsePatterns) {
    const match = handlerCode.match(pattern);
    if (match) {
      TRACE.flow_points.push({
        stage: 'Response Construction',
        code: match[0].substring(0, 200),
        status: 'FOUND'
      });
      
      // Check if it's using model response or fallback
      if (match[0].includes('modelResponse')) {
        TRACE.flow_points.push({
          stage: 'Using Model Response',
          status: 'GOOD'
        });
      } else if (match[0].includes('I found') || match[0].includes('items in your vault')) {
        TRACE.flow_points.push({
          stage: 'Using Fallback Response',
          status: 'WARNING'
        });
        TRACE.memory_found_but_lost.push('Fallback response used instead of model');
      }
    }
  }
}

// Check for variable shadowing
async function checkVariableShadowing() {
  console.log('\n📍 [8] Checking for variable shadowing...');
  
  const ipcPath = path.join(CONFIG.ROOT, 'main/ipc-handlers.js');
  const content = await fs.readFile(ipcPath, 'utf8');
  
  // Count occurrences of key variables
  const variables = ['messages', 'enhancedMessages', 'qlibContext', 'vaultSearchResults'];
  
  for (const varName of variables) {
    const declarationPattern = new RegExp(`(const|let|var)\\s+${varName}\\s*=`, 'g');
    const matches = content.match(declarationPattern) || [];
    
    if (matches.length > 5) {  // Arbitrary threshold
      TRACE.actual_breaks.push(`Variable '${varName}' declared ${matches.length} times - possible shadowing`);
    }
  }
}

// Test actual memory retrieval
async function testActualRetrieval() {
  console.log('\n📍 [9] Testing actual memory retrieval...');
  
  try {
    const { MemoryVaultManager } = require('./src/memory/MemoryVaultManager');
    const manager = new MemoryVaultManager(CONFIG.VAULT_PATH);
    
    await manager.ensureIndex();
    const results = await manager.searchMemories('clients', { limit: 5 });
    
    TRACE.flow_points.push({
      stage: 'Direct Memory Test',
      status: 'SUCCESS',
      details: `Found ${results.length} capsules for 'clients'`
    });
    
    if (results.length > 0) {
      TRACE.flow_points.push({
        stage: 'Sample Capsule',
        status: 'DATA',
        details: {
          id: results[0].id,
          hasContent: !!results[0].content,
          contentLength: results[0].content?.length || 0
        }
      });
    }
  } catch (err) {
    TRACE.actual_breaks.push(`Memory retrieval test failed: ${err.message}`);
  }
}

// Generate recommendations
function generateRecommendations() {
  if (TRACE.memory_found_but_lost.length > 0) {
    TRACE.recommendations.push('Memory is being found but lost in the pipeline');
    TRACE.recommendations.push('Check each "memory_found_but_lost" point');
  }
  
  if (TRACE.actual_breaks.length > 0) {
    TRACE.recommendations.push('Fix breaks in order listed in actual_breaks');
  }
  
  // Specific recommendations based on patterns
  const hasQlibExtraction = TRACE.flow_points.some(p => p.stage.includes('Q-lib'));
  const hasInjection = TRACE.flow_points.some(p => p.stage.includes('Injection'));
  const hasModelCall = TRACE.flow_points.some(p => p.stage.includes('Model Call'));
  
  if (hasQlibExtraction && !hasInjection) {
    TRACE.recommendations.push('Q-lib extracts but never injects - add injection code');
  }
  
  if (hasInjection && hasModelCall) {
    const modelCallPoint = TRACE.flow_points.find(p => p.stage.includes('Model Call'));
    if (modelCallPoint?.status === 'WARNING') {
      TRACE.recommendations.push('Memory injected but base messages sent to model');
      TRACE.recommendations.push('Ensure enhancedMessages are passed to callOllamaModel');
    }
  }
}

// Main execution
async function runTrace() {
  await fs.mkdir(CONFIG.LOGS_DIR, { recursive: true }).catch(() => {});
  
  await traceMemoryFlow();
  await checkVariableShadowing();
  await testActualRetrieval();
  generateRecommendations();
  
  // Console output
  console.log('\n' + '='.repeat(50));
  console.log('📊 MEMORY FLOW TRACE RESULTS\n');
  
  console.log('✅ FOUND FLOW POINTS:');
  TRACE.flow_points.filter(p => p.status === 'FOUND' || p.status === 'GOOD').forEach(point => {
    console.log(`  • ${point.stage}`);
  });
  
  if (TRACE.flow_points.filter(p => p.status === 'WARNING').length > 0) {
    console.log('\n⚠️ WARNING POINTS:');
    TRACE.flow_points.filter(p => p.status === 'WARNING').forEach(point => {
      console.log(`  • ${point.stage}`);
    });
  }
  
  if (TRACE.memory_found_but_lost.length > 0) {
    console.log('\n🔴 MEMORY FOUND BUT LOST:');
    TRACE.memory_found_but_lost.forEach(loss => {
      console.log(`  • ${loss}`);
    });
  }
  
  if (TRACE.actual_breaks.length > 0) {
    console.log('\n❌ ACTUAL BREAKS:');
    TRACE.actual_breaks.forEach(breakPoint => {
      console.log(`  • ${breakPoint}`);
    });
  }
  
  if (TRACE.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    TRACE.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }
  
  // Save full trace
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(CONFIG.LOGS_DIR, `memory-flow-trace-${timestamp}.json`);
  await fs.writeFile(reportFile, JSON.stringify(TRACE, null, 2));
  
  console.log(`\n📄 Full trace saved to: ${reportFile}`);
}

// Execute
if (require.main === module) {
  runTrace().catch(console.error);
}

module.exports = { runTrace, TRACE };