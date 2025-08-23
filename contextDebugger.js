// contextDebugger.js
// Deep diagnostic tool for tracing memory context and flow in Echo Rubicon
// Confirms: timeline injection, tags, threader logic, frontend route, and memory layers

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const TIMELINE_PATH = path.resolve(ROOT, 'backend/qlib/threader/threaderEngine.js');
const CONTEXT_BUILDER_PATH = path.resolve(ROOT, 'src/memory/index.js');
const IPC_HANDLER_PATH = path.resolve(ROOT, 'main/ipc-handlers.js');
const PRELOAD_PATHS = [
  path.resolve(ROOT, 'components/preload.js'),
  path.resolve(ROOT, 'main/preload.js'),
  path.resolve(ROOT, 'src/components/preload.js')
];

function checkTimelineInjection() {
  if (!fs.existsSync(CONTEXT_BUILDER_PATH)) {
    console.error('❌ Cannot find context builder at:', CONTEXT_BUILDER_PATH);
    return;
  }
  const file = fs.readFileSync(CONTEXT_BUILDER_PATH, 'utf8');

  const timelineCall = file.includes('buildContextTimeline') || file.includes('threadContext');
  const injected = file.includes('context +=') && file.includes('Threaded Memory Timeline');

  console.log('🔍 Timeline Injection Check:');
  console.log(timelineCall ? '✅ buildContextTimeline() is called' : '❌ buildContextTimeline() NOT called');
  console.log(injected ? '✅ Timeline context appears injected into `context`' : '❌ Timeline not injected');

  const tagList = file.match(/const threadTags = \[.*?\]/s);
  if (tagList) {
    console.log(`✅ Found threadTags: ${tagList[0]}`);
  } else {
    console.log('❌ No static threadTags array found');
  }
}

function checkThreaderEngineTags() {
  if (!fs.existsSync(TIMELINE_PATH)) {
    console.error('❌ Cannot find threader engine at:', TIMELINE_PATH);
    return;
  }
  const code = fs.readFileSync(TIMELINE_PATH, 'utf8');
  const hasLogic = code.includes('summary') && code.includes('capsule.tags') && code.includes('lines.push');

  console.log('\n🔍 Threader Engine Check:');
  console.log(hasLogic ? '✅ Tag and summary-based capsule stitching present' : '❌ Missing tag/summary capsule logic');
}

function checkMemoryRoutes() {
  if (!fs.existsSync(IPC_HANDLER_PATH)) {
    console.error('❌ Cannot find ipc-handlers at:', IPC_HANDLER_PATH);
    return;
  }
  const ipcCode = fs.readFileSync(IPC_HANDLER_PATH, 'utf8');
  const hasAskHandler = ipcCode.includes("safeHandle('ask'") || ipcCode.includes("ipcMain.handle('ask'");
  const qlibBridge = ipcCode.includes('qlib-analyze') || ipcCode.includes('qlib-extract');

  console.log('\n🔍 IPC Memory Route Check:');
  console.log(hasAskHandler ? '✅ `ask` handler is registered' : '❌ `ask` handler missing');
  console.log(qlibBridge ? '✅ Q-lib bridge registered in IPC' : '❌ Q-lib IPC route missing');
}

function checkFrontendBridge() {
  const preloadPath = PRELOAD_PATHS.find(fs.existsSync);
  if (!preloadPath) {
    console.error('❌ Cannot find preload.js in any expected location');
    return;
  }
  const preload = fs.readFileSync(preloadPath, 'utf8');
  const qlibExposed = preload.includes('contextBridge.exposeInMainWorld') && preload.includes('qlibAnalyze');
  const memoryAPIs = preload.includes('getChallenge') && preload.includes('verifyCompletion');

  console.log('\n🔍 Frontend Bridge Check:');
  console.log(`🔹 Checked: ${preloadPath}`);
  console.log(qlibExposed ? '✅ Q-lib methods exposed in preload' : '❌ Q-lib methods not exposed in preload');
  console.log(memoryAPIs ? '✅ Auth/memory methods present in preload' : '❌ Some memory functions missing in preload');
}

function runContextDebugger() {
  console.log('\n═══════════════ CONTEXT DEBUGGER ═══════════════');
  checkTimelineInjection();
  checkThreaderEngineTags();
  checkMemoryRoutes();
  checkFrontendBridge();
  console.log('════════════════════════════════════════════════\n');
}

runContextDebugger();
