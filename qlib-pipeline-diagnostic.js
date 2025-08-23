// qlib-pipeline-diagnostic.js
// Diagnostic to trace Q-lib extraction pipeline from query to display

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  ROOT: path.resolve(__dirname),
  VAULT_PATH: 'D:\\Obsidian Vault',
  LOGS_DIR: path.join(__dirname, 'logs'),
  TEST_QUERIES: [
    'What are my lifts?',
    'Who are my clients?',
    'Show me my recipes'
  ]
};

// Results structure
const DIAGNOSTIC = {
  timestamp: new Date().toISOString(),
  pipeline_stages: {
    gui_send: { status: 'UNKNOWN', details: [] },
    ipc_receive: { status: 'UNKNOWN', details: [] },
    qlib_extract: { status: 'UNKNOWN', details: [] },
    memory_search: { status: 'UNKNOWN', details: [] },
    context_build: { status: 'UNKNOWN', details: [] },
    prompt_injection: { status: 'UNKNOWN', details: [] },
    model_call: { status: 'UNKNOWN', details: [] },
    response_display: { status: 'UNKNOWN', details: [] }
  },
  nuclear_test: {
    active: false,
    location: null,
    content: null
  },
  handler_paths: {
    chat_send: [],
    chat_completion: [],
    qlib_extract: []
  },
  memory_capsules: {
    total: 0,
    clients_project: 0,
    foods: 0,
    search_test: null
  },
  gui_state: {
    model_selection: null,
    project_context: null,
    component_fallbacks: []
  },
  data_flow_breaks: [],
  recommendations: []
};

// Utility functions
async function ensureLogsDir() {
  try {
    await fs.mkdir(CONFIG.LOGS_DIR, { recursive: true });
  } catch (err) {
    console.error('Could not create logs directory:', err.message);
  }
}

async function readFileContent(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    return null;
  }
}

// Stage 1: Check GUI Send Mechanism
async function diagnoseGUISend() {
  console.log('\n🎨 [Stage 1] Diagnosing GUI Send Mechanism...');
  
  const myAIPath = path.join(CONFIG.ROOT, 'components/MyAIInterface.js');
  const content = await readFileContent(myAIPath);
  
  if (!content) {
    DIAGNOSTIC.pipeline_stages.gui_send.status = 'BROKEN';
    DIAGNOSTIC.pipeline_stages.gui_send.details.push('MyAIInterface.js not found');
    return;
  }
  
  // Check for emergency fallbacks
  if (content.includes('Emergency state initialization')) {
    DIAGNOSTIC.gui_state.component_fallbacks.push('MyAIInterface in emergency mode');
    DIAGNOSTIC.pipeline_stages.gui_send.status = 'DEGRADED';
  }
  
  // Find actual send mechanism
  const sendPatterns = [
    /actualSendVoiceCommand.*?=.*?function/g,
    /sendVoiceCommand.*?=.*?function/g,
    /window\.electronAPI\.invoke\(['"]chat:send/g,
    /window\.dispatchEvent.*?sendMessage/g
  ];
  
  let foundSendMechanism = false;
  for (const pattern of sendPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      foundSendMechanism = true;
      DIAGNOSTIC.pipeline_stages.gui_send.details.push(`Found send mechanism: ${matches[0].substring(0, 50)}...`);
    }
  }
  
  // Check model selection
  const modelSelectionMatch = content.match(/actualUseAPI.*?actualSelectedLocalModel.*?actualSelectedAPIModel/s);
  if (modelSelectionMatch) {
    DIAGNOSTIC.gui_state.model_selection = 'Dynamic selection present';
  } else {
    DIAGNOSTIC.gui_state.model_selection = 'Model selection may be broken';
    DIAGNOSTIC.pipeline_stages.gui_send.status = 'DEGRADED';
  }
  
  DIAGNOSTIC.pipeline_stages.gui_send.status = foundSendMechanism ? 
    (DIAGNOSTIC.pipeline_stages.gui_send.status === 'DEGRADED' ? 'DEGRADED' : 'HEALTHY') : 'BROKEN';
}

// Stage 2: Check IPC Handlers
async function diagnoseIPCHandlers() {
  console.log('\n📡 [Stage 2] Diagnosing IPC Handlers...');
  
  const ipcPath = path.join(CONFIG.ROOT, 'main/ipc-handlers.js');
  const content = await readFileContent(ipcPath);
  
  if (!content) {
    DIAGNOSTIC.pipeline_stages.ipc_receive.status = 'BROKEN';
    DIAGNOSTIC.pipeline_stages.ipc_receive.details.push('ipc-handlers.js not found');
    return;
  }
  
  // Check for nuclear test
  const nuclearMatch = content.match(/\/\/\s*=====\s*NUCLEAR TEST START[\s\S]*?\/\/\s*=====\s*NUCLEAR TEST END/);
  if (nuclearMatch) {
    DIAGNOSTIC.nuclear_test.active = true;
    DIAGNOSTIC.nuclear_test.location = 'ipc-handlers.js around line 870';
    
    // Check if it's actually injecting
    if (nuclearMatch[0].includes('modifiedMessages[i].content = modifiedMessages[i].content + hardcodedMemory')) {
      DIAGNOSTIC.nuclear_test.content = 'Hardcoded memory IS being injected';
      DIAGNOSTIC.data_flow_breaks.push('Nuclear test may be masking real memory pipeline issues');
    }
  }
  
  // Find registered handlers
  const handlers = ['chat:send', 'chat-completion', 'qlib-extract'];
  for (const handler of handlers) {
    const pattern = new RegExp(`safeHandle\\(['"]${handler}['"]`, 'g');
    const matches = content.match(pattern);
    if (matches) {
      DIAGNOSTIC.handler_paths[handler.replace(':', '_').replace('-', '_')].push(`Handler registered: ${handler}`);
      DIAGNOSTIC.pipeline_stages.ipc_receive.details.push(`✓ ${handler} handler found`);
    } else {
      DIAGNOSTIC.pipeline_stages.ipc_receive.details.push(`✗ ${handler} handler missing`);
    }
  }
  
  DIAGNOSTIC.pipeline_stages.ipc_receive.status = 
    DIAGNOSTIC.handler_paths.chat_send.length > 0 ? 'HEALTHY' : 'BROKEN';
}

// Stage 3: Check Q-Lib Extraction
async function diagnoseQLIBExtraction() {
  console.log('\n🧠 [Stage 3] Diagnosing Q-Lib Extraction...');
  
  const ipcPath = path.join(CONFIG.ROOT, 'main/ipc-handlers.js');
  const content = await readFileContent(ipcPath);
  
  if (!content) {
    DIAGNOSTIC.pipeline_stages.qlib_extract.status = 'BROKEN';
    return;
  }
  
  // Find the qlib-extract handler (lines 1784-2088 according to your note)
  const qlibExtractMatch = content.match(/safeHandle\(['"]qlib-extract['"][\s\S]*?^\}\);/m);
  if (qlibExtractMatch) {
    const extractHandler = qlibExtractMatch[0];
    
    // Check key components
    const hasExecutiveFunction = extractHandler.includes('executiveFunction.classify');
    const hasFolderDetection = extractHandler.includes('folderMap');
    const hasSearchFunction = extractHandler.includes('searchSpecificFolder');
    const hasFactProcessing = extractHandler.includes('processedFacts');
    
    DIAGNOSTIC.pipeline_stages.qlib_extract.details.push(
      `Executive function: ${hasExecutiveFunction ? '✓' : '✗'}`,
      `Folder detection: ${hasFolderDetection ? '✓' : '✗'}`,
      `Search function: ${hasSearchFunction ? '✓' : '✗'}`,
      `Fact processing: ${hasFactProcessing ? '✓' : '✗'}`
    );
    
    const allPresent = hasExecutiveFunction && hasFolderDetection && hasSearchFunction && hasFactProcessing;
    DIAGNOSTIC.pipeline_stages.qlib_extract.status = allPresent ? 'HEALTHY' : 'DEGRADED';
  } else {
    DIAGNOSTIC.pipeline_stages.qlib_extract.status = 'BROKEN';
    DIAGNOSTIC.pipeline_stages.qlib_extract.details.push('qlib-extract handler not found');
  }
}

// Stage 4: Check Memory/Capsule System
async function diagnoseMemorySystem() {
  console.log('\n💾 [Stage 4] Diagnosing Memory/Capsule System...');
  
  // Count capsules
  const capsulesPath = path.join(CONFIG.VAULT_PATH, '.echo/capsules');
  const clientsPath = path.join(CONFIG.VAULT_PATH, '.echo/projects/clients/capsules');
  
  try {
    const countFiles = async (dir) => {
      try {
        const files = await fs.readdir(dir, { recursive: true });
        return files.filter(f => f.endsWith('.json')).length;
      } catch {
        return 0;
      }
    };
    
    DIAGNOSTIC.memory_capsules.total = await countFiles(capsulesPath);
    DIAGNOSTIC.memory_capsules.clients_project = await countFiles(clientsPath);
    
    DIAGNOSTIC.pipeline_stages.memory_search.details.push(
      `Total capsules: ${DIAGNOSTIC.memory_capsules.total}`,
      `Clients project capsules: ${DIAGNOSTIC.memory_capsules.clients_project}`
    );
    
    // Test retrieval
    const retrieverPath = path.join(CONFIG.ROOT, 'src/echo/memory/capsuleRetriever.js');
    if (await fs.access(retrieverPath).then(() => true).catch(() => false)) {
      const { retrieveRelevantCapsules } = require(retrieverPath);
      
      // Test a search
      const testResults = await retrieveRelevantCapsules('clients', {
        vaultPath: CONFIG.VAULT_PATH,
        limit: 5
      });
      
      DIAGNOSTIC.memory_capsules.search_test = {
        query: 'clients',
        results_count: testResults.length,
        top_result: testResults[0] ? {
          id: testResults[0].id,
          relevance: testResults[0].relevanceScore,
          chaos: testResults[0].chaosScore
        } : null
      };
      
      DIAGNOSTIC.pipeline_stages.memory_search.status = testResults.length > 0 ? 'HEALTHY' : 'DEGRADED';
    } else {
      DIAGNOSTIC.pipeline_stages.memory_search.status = 'BROKEN';
      DIAGNOSTIC.pipeline_stages.memory_search.details.push('capsuleRetriever.js not found');
    }
  } catch (err) {
    DIAGNOSTIC.pipeline_stages.memory_search.status = 'BROKEN';
    DIAGNOSTIC.pipeline_stages.memory_search.details.push(`Error: ${err.message}`);
  }
}

// Stage 5: Check Context Building
async function diagnoseContextBuilding() {
  console.log('\n🔧 [Stage 5] Diagnosing Context Building...');
  
  const ipcPath = path.join(CONFIG.ROOT, 'main/ipc-handlers.js');
  const content = await readFileContent(ipcPath);
  
  if (!content) {
    DIAGNOSTIC.pipeline_stages.context_build.status = 'BROKEN';
    return;
  }
  
  // Look for buildContextForInput function
  const contextBuildMatch = content.match(/async function buildContextForInput[\s\S]*?^}/m);
  if (contextBuildMatch) {
    const buildFunction = contextBuildMatch[0];
    
    // Check what it does
    const usesMemorySystem = buildFunction.includes('global.memorySystem');
    const fallbacksToVaultManager = buildFunction.includes('MemoryVaultManager');
    const returnsContext = buildFunction.includes('return') && buildFunction.includes('context:');
    
    DIAGNOSTIC.pipeline_stages.context_build.details.push(
      `Uses global.memorySystem: ${usesMemorySystem ? '✓' : '✗'}`,
      `Has fallback: ${fallbacksToVaultManager ? '✓' : '✗'}`,
      `Returns context: ${returnsContext ? '✓' : '✗'}`
    );
    
    DIAGNOSTIC.pipeline_stages.context_build.status = 
      (usesMemorySystem || fallbacksToVaultManager) && returnsContext ? 'HEALTHY' : 'DEGRADED';
  } else {
    DIAGNOSTIC.pipeline_stages.context_build.status = 'BROKEN';
    DIAGNOSTIC.pipeline_stages.context_build.details.push('buildContextForInput not found');
  }
}

// Stage 6: Check Prompt Injection
async function diagnosePromptInjection() {
  console.log('\n💉 [Stage 6] Diagnosing Prompt Injection...');
  
  const ipcPath = path.join(CONFIG.ROOT, 'main/ipc-handlers.js');
  const content = await readFileContent(ipcPath);
  
  if (!content) {
    DIAGNOSTIC.pipeline_stages.prompt_injection.status = 'BROKEN';
    return;
  }
  
  // Find chat-completion handler
  const chatCompletionMatch = content.match(/safeHandle\(['"]chat-completion['"][\s\S]*?^\}\);/m);
  if (chatCompletionMatch) {
    const handler = chatCompletionMatch[0];
    
    // Check injection points
    const checksVaultKeywords = handler.includes('vaultKeywords');
    const callsQLIBSearch = handler.includes('qlib-search');
    const injectsVaultContext = handler.includes('vaultContext');
    const injectsQLIBContext = handler.includes('qlibContext');
    
    DIAGNOSTIC.pipeline_stages.prompt_injection.details.push(
      `Checks vault keywords: ${checksVaultKeywords ? '✓' : '✗'}`,
      `Calls Q-lib search: ${callsQLIBSearch ? '✓' : '✗'}`,
      `Injects vault context: ${injectsVaultContext ? '✓' : '✗'}`,
      `Injects Q-lib context: ${injectsQLIBContext ? '✓' : '✗'}`
    );
    
    // Check for the GUARDRAIL that halts on empty memory
    if (handler.includes('GUARDRAIL') && handler.includes('No memory found')) {
      DIAGNOSTIC.pipeline_stages.prompt_injection.details.push('⚠️ GUARDRAIL active - may block responses without memory');
    }
    
    const hasInjection = injectsVaultContext || injectsQLIBContext;
    DIAGNOSTIC.pipeline_stages.prompt_injection.status = hasInjection ? 'HEALTHY' : 'BROKEN';
    
    if (!hasInjection) {
      DIAGNOSTIC.data_flow_breaks.push('Context found but NOT injected into prompt');
    }
  } else {
    DIAGNOSTIC.pipeline_stages.prompt_injection.status = 'BROKEN';
    DIAGNOSTIC.pipeline_stages.prompt_injection.details.push('chat-completion handler not found');
  }
}

// Stage 7: Check Model Call
async function diagnoseModelCall() {
  console.log('\n🤖 [Stage 7] Diagnosing Model Call...');
  
  const ipcPath = path.join(CONFIG.ROOT, 'main/ipc-handlers.js');
  const content = await readFileContent(ipcPath);
  
  if (!content) {
    DIAGNOSTIC.pipeline_stages.model_call.status = 'BROKEN';
    return;
  }
  
  // Find callOllamaModel function
  const modelCallMatch = content.match(/async function callOllamaModel[\s\S]*?^}/m);
  if (modelCallMatch) {
    const modelFunction = modelCallMatch[0];
    
    // Check if nuclear test is modifying messages
    const hasNuclearModification = modelFunction.includes('modifiedMessages');
    const sendsToOllama = modelFunction.includes('http://localhost:11434/api/chat');
    
    DIAGNOSTIC.pipeline_stages.model_call.details.push(
      `Nuclear test modification: ${hasNuclearModification ? '⚠️ ACTIVE' : '✓ Clean'}`,
      `Sends to Ollama: ${sendsToOllama ? '✓' : '✗'}`
    );
    
    if (hasNuclearModification) {
      DIAGNOSTIC.data_flow_breaks.push('Nuclear test modifying messages before Ollama call');
    }
    
    DIAGNOSTIC.pipeline_stages.model_call.status = sendsToOllama ? 
      (hasNuclearModification ? 'DEGRADED' : 'HEALTHY') : 'BROKEN';
  } else {
    DIAGNOSTIC.pipeline_stages.model_call.status = 'BROKEN';
    DIAGNOSTIC.pipeline_stages.model_call.details.push('callOllamaModel not found');
  }
}

// Stage 8: Check Response Display
async function diagnoseResponseDisplay() {
  console.log('\n📺 [Stage 8] Diagnosing Response Display...');
  
  const myAIPath = path.join(CONFIG.ROOT, 'components/MyAIInterface.js');
  const content = await readFileContent(myAIPath);
  
  if (!content) {
    DIAGNOSTIC.pipeline_stages.response_display.status = 'BROKEN';
    return;
  }
  
  // Check message rendering
  const hasMessageMap = content.includes('messages.map');
  const hasMessageDisplay = content.includes('message-bubble');
  const hasProcessMessageContent = content.includes('processMessageContent');
  
  DIAGNOSTIC.pipeline_stages.response_display.details.push(
    `Message mapping: ${hasMessageMap ? '✓' : '✗'}`,
    `Message display: ${hasMessageDisplay ? '✓' : '✗'}`,
    `Content processing: ${hasProcessMessageContent ? '✓' : '✗'}`
  );
  
  DIAGNOSTIC.pipeline_stages.response_display.status = 
    hasMessageMap && hasMessageDisplay ? 'HEALTHY' : 'BROKEN';
}

// Generate recommendations
function generateRecommendations() {
  // Check for nuclear test
  if (DIAGNOSTIC.nuclear_test.active) {
    DIAGNOSTIC.recommendations.push('URGENT: Disable nuclear test in ipc-handlers.js (line ~870)');
    DIAGNOSTIC.recommendations.push('Nuclear test is masking real memory pipeline');
  }
  
  // Check for broken stages
  const brokenStages = Object.entries(DIAGNOSTIC.pipeline_stages)
    .filter(([_, stage]) => stage.status === 'BROKEN')
    .map(([name, _]) => name);
  
  if (brokenStages.includes('prompt_injection')) {
    DIAGNOSTIC.recommendations.push('CRITICAL: Context is being found but NOT injected into prompts');
    DIAGNOSTIC.recommendations.push('Fix injection in chat-completion handler');
  }
  
  if (brokenStages.includes('gui_send')) {
    DIAGNOSTIC.recommendations.push('Fix MyAIInterface emergency fallbacks');
  }
  
  if (DIAGNOSTIC.data_flow_breaks.length > 0) {
    DIAGNOSTIC.recommendations.push('Address all data flow breaks identified');
  }
  
  // Check for guardrail
  const hasGuardrail = DIAGNOSTIC.pipeline_stages.prompt_injection.details
    .some(d => d.includes('GUARDRAIL'));
  if (hasGuardrail) {
    DIAGNOSTIC.recommendations.push('Consider relaxing GUARDRAIL that blocks responses without memory');
  }
}

// Main execution
async function runDiagnostic() {
  console.log('🔍 ECHO RUBICON Q-LIB PIPELINE DIAGNOSTIC');
  console.log('=' .repeat(50));
  console.log(`Started: ${DIAGNOSTIC.timestamp}\n`);
  
  await ensureLogsDir();
  
  // Run all diagnostic stages
  await diagnoseGUISend();
  await diagnoseIPCHandlers();
  await diagnoseQLIBExtraction();
  await diagnoseMemorySystem();
  await diagnoseContextBuilding();
  await diagnosePromptInjection();
  await diagnoseModelCall();
  await diagnoseResponseDisplay();
  
  // Generate recommendations
  generateRecommendations();
  
  // Console summary
  console.log('\n📊 PIPELINE SUMMARY');
  console.log('=' .repeat(50));
  
  // Show pipeline health
  console.log('\n🔄 Pipeline Stages:');
  Object.entries(DIAGNOSTIC.pipeline_stages).forEach(([stage, info]) => {
    const icon = info.status === 'HEALTHY' ? '✅' : 
                 info.status === 'DEGRADED' ? '⚠️' : '❌';
    console.log(`${icon} ${stage}: ${info.status}`);
    if (info.details.length > 0) {
      info.details.forEach(detail => console.log(`    ${detail}`));
    }
  });
  
  // Show breaks in data flow
  if (DIAGNOSTIC.data_flow_breaks.length > 0) {
    console.log('\n🚨 DATA FLOW BREAKS:');
    DIAGNOSTIC.data_flow_breaks.forEach(breakPoint => {
      console.log(`  ❌ ${breakPoint}`);
    });
  }
  
  // Show nuclear test status
  if (DIAGNOSTIC.nuclear_test.active) {
    console.log('\n☢️ NUCLEAR TEST STATUS:');
    console.log(`  ⚠️ ACTIVE at ${DIAGNOSTIC.nuclear_test.location}`);
    console.log(`  ${DIAGNOSTIC.nuclear_test.content}`);
  }
  
  // Show memory system status
  console.log('\n💾 MEMORY SYSTEM:');
  console.log(`  Capsules found: ${DIAGNOSTIC.memory_capsules.total}`);
  console.log(`  Clients project: ${DIAGNOSTIC.memory_capsules.clients_project}`);
  if (DIAGNOSTIC.memory_capsules.search_test) {
    console.log(`  Search test: ${DIAGNOSTIC.memory_capsules.search_test.results_count} results`);
  }
  
  // Show recommendations
  if (DIAGNOSTIC.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    DIAGNOSTIC.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
  }
  
  // Save JSON report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(CONFIG.LOGS_DIR, `qlib-pipeline-diagnostic-${timestamp}.json`);
  await fs.writeFile(reportFile, JSON.stringify(DIAGNOSTIC, null, 2));
  
  console.log(`\n📄 Full report saved to: ${reportFile}`);
  
  // Final verdict
  const brokenCount = Object.values(DIAGNOSTIC.pipeline_stages)
    .filter(s => s.status === 'BROKEN').length;
  
  if (brokenCount === 0) {
    console.log('\n✅ Pipeline appears functional');
  } else {
    console.log(`\n❌ Pipeline has ${brokenCount} broken stages`);
  }
}

// Execute
if (require.main === module) {
  runDiagnostic().catch(console.error);
}

module.exports = { runDiagnostic, DIAGNOSTIC };