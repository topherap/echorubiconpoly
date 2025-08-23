// master-diag.js - Echo Rubicon Complete System Diagnostic
// Unified diagnostic combining all audit functions into one comprehensive tool

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');

// ===== CONFIGURATION =====
const CONFIG = {
  ROOT: path.resolve(__dirname),
  VAULT_PATH: 'D:\\Obsidian Vault',
  PORTS: { meilisearch: 7700, rust: 3000, electron: 49200 },
  IGNORE_DIRS: ['node_modules', '.git', '.obsidian', '.trash', '.vscode', '__pycache__', 'dist', 'build', 'z__archive'],
  DEAD_HINTS: ['dead', 'deprecated', 'backup', 'copy', 'test-', '-old'],
  EXPECTED_PATTERNS: [
    'processUserInput', 'buildSystemPrompt', 'saveCapsule', 'extractFacts',
    'context +=', 'ipcMain.handle', 'contextBridge.exposeInMainWorld'
  ],
  IMPORT_PATTERNS: [
    { pattern: /(?:^|\s)require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/gm, type: 'require' },
    { pattern: /(?:^|\s)import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/gm, type: 'import' },
    { pattern: /(?:^|\s)import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/gm, type: 'dynamic' }
  ]
};

// ===== GLOBAL STATE =====
const MASTER_RESULTS = {
  timestamp: new Date().toISOString(),
  summary: { passed: 0, failed: 0, warnings: 0 },
  sections: {},
  recommendations: [],
  errors: []
};

// ===== UTILITIES =====
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',     // cyan
    success: '\x1b[32m',  // green
    warning: '\x1b[33m',  // yellow
    error: '\x1b[31m',    // red
    header: '\x1b[35m',   // magenta
    reset: '\x1b[0m'
  };
  
  const symbol = {
    info: 'ℹ️ ',
    success: '✅',
    warning: '⚠️ ',
    error: '❌',
    header: '🔍'
  }[type] || '';
  
  console.log(`${colors[type] || ''}${symbol} ${message}${colors.reset}`);
  
  // Track results
  if (type === 'success') MASTER_RESULTS.summary.passed++;
  if (type === 'error') MASTER_RESULTS.summary.failed++;
  if (type === 'warning') MASTER_RESULTS.summary.warnings++;
}

function isCodeFile(file) {
  return /\.(js|jsx|ts|tsx|json)$/.test(file);
}

function isDeadFile(name) {
  return CONFIG.DEAD_HINTS.some(hint => name.toLowerCase().includes(hint));
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

function analyzeFile(filePath, patterns) {
  if (!fs.existsSync(filePath)) return { exists: false };
  
  const content = fs.readFileSync(filePath, 'utf8');
  const results = { exists: true, content, matches: {} };
  
  patterns.forEach(pattern => {
    const regex = new RegExp(pattern.regex || pattern, 'gm');
    const matches = content.match(regex) || [];
    if (matches.length > 0) {
      results.matches[pattern.name || pattern] = {
        count: matches.length,
        samples: matches.slice(0, 3)
      };
    }
  });
  
  return results;
}

// ===== DIAGNOSTIC SECTIONS =====

// 1. ENVIRONMENT & PATHS
async function checkEnvironment() {
  log('\n1. ENVIRONMENT & PATHS', 'header');
  log('='.repeat(30), 'header');
  
  const section = { tests: [], issues: [], recommendations: [] };
  
  // Node.js version
  log(`Node.js version: ${process.version}`);
  log(`Platform: ${process.platform}`);
  log(`Working directory: ${CONFIG.ROOT}`);
  
  // Vault path
  if (fs.existsSync(CONFIG.VAULT_PATH)) {
    log(`Vault exists: ${CONFIG.VAULT_PATH}`, 'success');
    section.tests.push({ test: 'Vault Path', status: 'pass' });
  } else {
    log(`Vault NOT found: ${CONFIG.VAULT_PATH}`, 'error');
    section.tests.push({ test: 'Vault Path', status: 'fail' });
    section.issues.push('Vault directory missing');
  }
  
  // Key directories
  const keyDirs = [
    'src/memory',
    'main',
    'components',
    '.echo/capsules'
  ];
  
  keyDirs.forEach(dir => {
    const fullPath = path.join(dir.startsWith('.echo') ? CONFIG.VAULT_PATH : CONFIG.ROOT, dir);
    if (fs.existsSync(fullPath)) {
      log(`Directory exists: ${dir}`, 'success');
    } else {
      log(`Directory missing: ${dir}`, 'error');
      section.issues.push(`Missing directory: ${dir}`);
    }
  });
  
  MASTER_RESULTS.sections.environment = section;
}

// 2. FILE SYSTEM ANALYSIS
async function analyzeFileSystem() {
  log('\n2. FILE SYSTEM ANALYSIS', 'header');
  log('='.repeat(30), 'header');
  
  const section = { files: [], links: [], orphans: [], dead: [], missing: [] };
  const fileMap = {};
  const backlinkMap = {};
  
  // Crawl all files
  function crawl(dir, baseDir = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = baseDir ? path.join(baseDir, entry.name) : entry.name;
        
        if (CONFIG.IGNORE_DIRS.some(skip => relativePath.includes(skip))) continue;
        
        if (entry.isDirectory()) {
          crawl(fullPath, relativePath);
        } else if (isCodeFile(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const dead = isDeadFile(entry.name);
          
          const fileInfo = {
            file: relativePath.replace(/\\/g, '/'),
            status: dead ? '🟥 dead' : '🟨 orphan',
            type: path.extname(entry.name).substring(1),
            size: fs.statSync(fullPath).size,
            imports: [],
            exports: (content.match(/module\.exports|export /g) || []).length
          };
          
          // Extract imports
          CONFIG.IMPORT_PATTERNS.forEach(({ pattern, type }) => {
            let match;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(content)) !== null) {
              fileInfo.imports.push({ path: match[1], type });
            }
          });
          
          section.files.push(fileInfo);
          fileMap[fileInfo.file] = fileInfo;
          
          if (dead) section.dead.push(fileInfo.file);
          
          // Build backlinks
          fileInfo.imports.forEach(imp => {
            if (imp.path.startsWith('./')) {
              const sourceDir = path.dirname(fileInfo.file);
              const targetPath = path.normalize(path.join(sourceDir, imp.path + '.js')).replace(/\\/g, '/');
              backlinkMap[targetPath] = backlinkMap[targetPath] || [];
              backlinkMap[targetPath].push(fileInfo.file);
              
              if (!fs.existsSync(path.join(CONFIG.ROOT, targetPath))) {
                section.missing.push(`${fileInfo.file} → ${imp.path}`);
              } else {
                section.links.push({ from: fileInfo.file, to: targetPath });
              }
            }
          });
        }
      }
    } catch (error) {
      log(`Error crawling ${dir}: ${error.message}`, 'warning');
    }
  }
  
  crawl(CONFIG.ROOT);
  
  // Update orphan status
  Object.entries(backlinkMap).forEach(([target, importers]) => {
    if (fileMap[target] && fileMap[target].status === '🟨 orphan') {
      fileMap[target].status = '✅ live';
    }
  });
  
  section.files.forEach(f => {
    if (f.status === '🟨 orphan') section.orphans.push(f.file);
  });
  
  log(`Total files scanned: ${section.files.length}`);
  log(`Live files: ${section.files.filter(f => f.status === '✅ live').length}`, 'success');
  log(`Orphaned files: ${section.orphans.length}`, section.orphans.length > 0 ? 'warning' : 'success');
  log(`Dead files: ${section.dead.length}`, section.dead.length > 0 ? 'warning' : 'success');
  log(`Missing imports: ${section.missing.length}`, section.missing.length > 0 ? 'error' : 'success');
  
  MASTER_RESULTS.sections.fileSystem = section;
}

// 3. MEMORY SYSTEM ANALYSIS
async function analyzeMemorySystem() {
  log('\n3. MEMORY SYSTEM ANALYSIS', 'header');
  log('='.repeat(30), 'header');
  
  const section = { imports: {}, handlers: {}, services: {}, issues: [] };
  
  // Test memory imports
  const memoryFiles = [
    { name: 'MemorySystem', path: './src/memory/index.js' },
    { name: 'MemoryVaultManager', path: './src/memory/MemoryVaultManager.js' },
    { name: 'MemoryService', path: './src/echo/memory/MemoryService.js' },
    { name: 'CapsuleRetriever', path: './src/echo/memory/capsuleRetriever.js' }
  ];
  
  for (const { name, path: filePath } of memoryFiles) {
    try {
      const fullPath = path.join(CONFIG.ROOT, filePath);
      if (fs.existsSync(fullPath)) {
        const module = require(fullPath);
        section.imports[name] = {
          status: 'success',
          exports: Object.keys(module),
          hasTargetExport: module[name] ? true : false
        };
        log(`${name} import: ✓`, 'success');
        
        // Test instantiation for key classes
        if (name === 'MemorySystem' && module.MemorySystem) {
          try {
            const instance = new module.MemorySystem(CONFIG.VAULT_PATH);
            log(`${name} instantiation: ✓`, 'success');
            
            // Test methods
            const methods = ['buildContextForInput', 'processConversation', 'search'];
            methods.forEach(method => {
              if (typeof instance[method] === 'function') {
                log(`  Method ${method}: ✓`, 'success');
              } else {
                log(`  Method ${method}: ✗`, 'error');
                section.issues.push(`${name} missing method: ${method}`);
              }
            });
          } catch (err) {
            log(`${name} instantiation failed: ${err.message}`, 'error');
            section.issues.push(`${name} instantiation: ${err.message}`);
          }
        }
      } else {
        log(`${name} file missing: ${filePath}`, 'error');
        section.imports[name] = { status: 'missing' };
        section.issues.push(`Missing file: ${filePath}`);
      }
    } catch (err) {
      log(`${name} import failed: ${err.message}`, 'error');
      section.imports[name] = { status: 'error', error: err.message };
      section.issues.push(`Import error ${name}: ${err.message}`);
    }
  }
  
  MASTER_RESULTS.sections.memorySystem = section;
}

// 4. IPC HANDLERS ANALYSIS
async function analyzeIPCHandlers() {
  log('\n4. IPC HANDLERS ANALYSIS', 'header');
  log('='.repeat(30), 'header');
  
  const section = { handlers: [], missing: [], status: 'unknown' };
  
  const ipcPath = path.join(CONFIG.ROOT, 'main/ipc-handlers.js');
  const appPath = path.join(CONFIG.ROOT, 'main/app.js');
  
  if (!fs.existsSync(ipcPath)) {
    log('ipc-handlers.js NOT FOUND', 'error');
    section.status = 'missing';
    MASTER_RESULTS.sections.ipcHandlers = section;
    return;
  }
  
  const ipcContent = fs.readFileSync(ipcPath, 'utf8');
  
  // Check for key handlers
  const requiredHandlers = [
    'appendCapsule',
    'chat:send',
    'memory:build-context',
    'memory:process-conversation',
    'qlib-extract',
    'search-notes'
  ];
  
  requiredHandlers.forEach(handler => {
    if (ipcContent.includes(`'${handler}'`) || ipcContent.includes(`"${handler}"`)) {
      log(`Handler '${handler}': ✓`, 'success');
      section.handlers.push(handler);
    } else {
      log(`Handler '${handler}': ✗`, 'error');
      section.missing.push(handler);
    }
  });
  
  // Check if handlers are loaded in main process
  if (fs.existsSync(appPath)) {
    const appContent = fs.readFileSync(appPath, 'utf8');
    if (appContent.includes('ipc-handlers')) {
      log('IPC handlers loaded in main process: ✓', 'success');
      section.status = 'loaded';
    } else {
      log('IPC handlers NOT loaded in main process: ✗', 'error');
      section.status = 'not-loaded';
      MASTER_RESULTS.recommendations.push('Add require("./ipc-handlers") to main/app.js');
    }
  }
  
  // Check initialization
  if (ipcContent.includes('initializeMemorySystems')) {
    if (ipcContent.includes('initializeMemorySystems()')) {
      log('Memory system initialization called: ✓', 'success');
    } else {
      log('Memory system initialization defined but not called: ✗', 'warning');
      MASTER_RESULTS.recommendations.push('Call initializeMemorySystems() at end of ipc-handlers.js');
    }
  }
  
  MASTER_RESULTS.sections.ipcHandlers = section;
}

// 5. Q-LIB SYSTEM ANALYSIS
async function analyzeQLibSystem() {
  log('\n5. Q-LIB SYSTEM ANALYSIS', 'header');
  log('='.repeat(30), 'header');
  
  const section = { interfaces: [], models: [], apiWrapper: {}, issues: [] };
  
  // Check Q-Lib interfaces
  const qlibPaths = [
    './src/memory/QLibInterface.js',
    './src/echo/memory/QLibInterface.js'
  ];
  
  let qlibFound = false;
  for (const qlibPath of qlibPaths) {
    const fullPath = path.join(CONFIG.ROOT, qlibPath);
    if (fs.existsSync(fullPath)) {
      log(`Q-Lib interface found: ${qlibPath}`, 'success');
      qlibFound = true;
      section.interfaces.push(qlibPath);
      
      // Check for data processing patches
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('parsed.facts = parsed.facts.map')) {
        log('  Data processing patch: ✓', 'success');
      } else {
        log('  Data processing patch: ✗', 'warning');
        section.issues.push('Missing data processing patch in Q-Lib interface');
      }
    }
  }
  
  if (!qlibFound) {
    log('Q-Lib interface NOT FOUND', 'error');
    section.issues.push('No Q-Lib interface found');
  }
  
  // Check API wrapper
  const apiWrapperPath = path.join(CONFIG.ROOT, 'src/echo/memory/api-wrapper.js');
  if (fs.existsSync(apiWrapperPath)) {
    const content = fs.readFileSync(apiWrapperPath, 'utf8');
    section.apiWrapper.exists = true;
    section.apiWrapper.hasOllama = content.includes('localhost:11434');
    section.apiWrapper.hasNodeFetch = content.includes('node-fetch');
    
    log('API wrapper exists: ✓', 'success');
    log(`  Ollama integration: ${section.apiWrapper.hasOllama ? '✓' : '✗'}`, 
        section.apiWrapper.hasOllama ? 'success' : 'error');
    
    // Check for ES module issues
    if (content.includes('require') && content.includes('node-fetch')) {
      log('  ES module issue detected: ✗', 'warning');
      section.issues.push('API wrapper may have ES module import issues');
    }
  } else {
    log('API wrapper NOT FOUND: ✗', 'error');
    section.apiWrapper.exists = false;
  }
  
  MASTER_RESULTS.sections.qlibSystem = section;
}

// 6. VAULT INTEGRATION ANALYSIS
async function analyzeVaultIntegration() {
  log('\n6. VAULT INTEGRATION ANALYSIS', 'header');
  log('='.repeat(30), 'header');
  
  const section = { structure: {}, content: {}, issues: [] };
  
  if (!fs.existsSync(CONFIG.VAULT_PATH)) {
    log('Vault path not accessible', 'error');
    section.issues.push('Vault path not accessible');
    MASTER_RESULTS.sections.vaultIntegration = section;
    return;
  }
  
  // Check vault structure
  const requiredDirs = ['.echo', '.echo/capsules', 'clients', 'Foods', 'conversations'];
  requiredDirs.forEach(dir => {
    const fullPath = path.join(CONFIG.VAULT_PATH, dir);
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath);
      section.structure[dir] = {
        exists: true,
        fileCount: files.filter(f => f.endsWith('.md') || f.endsWith('.json')).length
      };
      log(`Vault directory ${dir}: ${section.structure[dir].fileCount} files`, 'success');
    } else {
      section.structure[dir] = { exists: false };
      log(`Vault directory ${dir}: missing`, 'warning');
    }
  });
  
  // Check for content quality
  const clientsPath = path.join(CONFIG.VAULT_PATH, 'clients');
  if (fs.existsSync(clientsPath)) {
    try {
      const clientFiles = fs.readdirSync(clientsPath).filter(f => f.endsWith('.md'));
      section.content.clientCount = clientFiles.length;
      
      // Sample client file
      if (clientFiles.length > 0) {
        const samplePath = path.join(clientsPath, clientFiles[0]);
        const content = fs.readFileSync(samplePath, 'utf8');
        section.content.sampleClientLength = content.length;
        
        // Check for contact info patterns
        const hasEmail = content.includes('@');
        const hasPhone = /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(content);
        const hasAddress = content.includes('St') || content.includes('Ave') || content.includes('Rd');
        
        log(`Sample client has email: ${hasEmail ? '✓' : '✗'}`, hasEmail ? 'success' : 'info');
        log(`Sample client has phone: ${hasPhone ? '✓' : '✗'}`, hasPhone ? 'success' : 'info');
        log(`Sample client has address: ${hasAddress ? '✓' : '✗'}`, hasAddress ? 'success' : 'info');
      }
    } catch (err) {
      section.issues.push(`Client analysis error: ${err.message}`);
    }
  }
  
  MASTER_RESULTS.sections.vaultIntegration = section;
}

// 7. SERVICE PORT ANALYSIS
async function analyzeServicePorts() {
  log('\n7. SERVICE PORT ANALYSIS', 'header');
  log('='.repeat(30), 'header');
  
  const section = { ports: {} };
  
  const portChecks = [
    { name: 'Ollama', host: '127.0.0.1', port: 11434 },
    { name: 'Express Backend', host: '127.0.0.1', port: CONFIG.PORTS.electron },
    { name: 'Rust Backend', host: '127.0.0.1', port: CONFIG.PORTS.rust },
    { name: 'MeiliSearch', host: '127.0.0.1', port: CONFIG.PORTS.meilisearch }
  ];
  
  for (const { name, host, port } of portChecks) {
    const isOpen = await checkPort(host, port);
    section.ports[name] = { host, port, status: isOpen ? 'open' : 'closed' };
    log(`${name} (${host}:${port}): ${isOpen ? '✓' : '✗'}`, isOpen ? 'success' : 'warning');
  }
  
  MASTER_RESULTS.sections.servicePorts = section;
}

// 8. CONVERSATION ANALYSIS
async function analyzeConversations() {
  log('\n8. CONVERSATION ANALYSIS', 'header');
  log('='.repeat(30), 'header');
  
  const section = { pollution: 0, totalFiles: 0, issues: [] };
  
  const conversationDirs = ['conversations', 'Chats'];
  const today = new Date().toISOString().split('T')[0];
  
  for (const dir of conversationDirs) {
    const dirPath = path.join(CONFIG.VAULT_PATH, dir);
    if (fs.existsSync(dirPath)) {
      try {
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
        const todayFiles = files.filter(f => f.includes(today));
        section.totalFiles += files.length;
        
        log(`${dir} directory: ${files.length} total, ${todayFiles.length} today`);
        
        // Check for pollution (wrong answers)
        let pollutionCount = 0;
        for (const file of todayFiles.slice(0, 10)) { // Sample first 10
          try {
            const content = fs.readFileSync(path.join(dirPath, file), 'utf8');
            if (content.includes('no information about your clients') || 
                content.includes('Unknown') ||
                content.includes('I don\'t have access')) {
              pollutionCount++;
            }
          } catch (err) {
            // Skip unreadable files
          }
        }
        
        if (pollutionCount > 0) {
          section.pollution += pollutionCount;
          log(`  Pollution detected: ${pollutionCount} files with wrong answers`, 'warning');
        }
      } catch (err) {
        section.issues.push(`Error reading ${dir}: ${err.message}`);
      }
    }
  }
  
  MASTER_RESULTS.sections.conversations = section;
}

// ===== MAIN EXECUTION =====
async function runMasterDiagnostic() {
  log('🔍 ECHO RUBICON MASTER DIAGNOSTIC', 'header');
  log('='.repeat(50), 'header');
  log(`Started: ${MASTER_RESULTS.timestamp}\n`);
  
  // Run all diagnostic sections
  await checkEnvironment();
  await analyzeFileSystem();
  await analyzeMemorySystem();
  await analyzeIPCHandlers();
  await analyzeQLibSystem();
  await analyzeVaultIntegration();
  await analyzeServicePorts();
  await analyzeConversations();
  
  // Generate final report
  log('\n🎯 DIAGNOSTIC SUMMARY', 'header');
  log('='.repeat(30), 'header');
  
  const { passed, failed, warnings } = MASTER_RESULTS.summary;
  log(`Tests Passed: ${passed}`, passed > 0 ? 'success' : 'error');
  log(`Tests Failed: ${failed}`, failed === 0 ? 'success' : 'error');
  log(`Warnings: ${warnings}`, warnings === 0 ? 'success' : 'warning');
  
  // Critical issues
  const criticalIssues = [];
  if (MASTER_RESULTS.sections.ipcHandlers?.status === 'not-loaded') {
    criticalIssues.push('IPC handlers not loaded in main process');
  }
  if (MASTER_RESULTS.sections.memorySystem?.issues?.length > 0) {
    criticalIssues.push('Memory system has errors');
  }
  if (!fs.existsSync(CONFIG.VAULT_PATH)) {
    criticalIssues.push('Vault path not accessible');
  }
  
  if (criticalIssues.length > 0) {
    log('\n🚨 CRITICAL ISSUES:', 'error');
    criticalIssues.forEach(issue => log(`  • ${issue}`, 'error'));
  }
  
  // Recommendations
  if (MASTER_RESULTS.recommendations.length > 0) {
    log('\n💡 RECOMMENDATIONS:', 'info');
    MASTER_RESULTS.recommendations.forEach(rec => log(`  • ${rec}`, 'info'));
  }
  
  // Save detailed report
  const reportPath = path.join(CONFIG.ROOT, `master-diagnostic-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(MASTER_RESULTS, null, 2), 'utf8');
  log(`\n📄 Detailed report saved: ${reportPath}`, 'success');
  
  // Overall status
  const overallSuccess = failed === 0 && criticalIssues.length === 0;
  log(`\n${overallSuccess ? '🎉 SYSTEM HEALTHY' : '🚨 SYSTEM NEEDS ATTENTION'}`, 
      overallSuccess ? 'success' : 'error');
}

// Execute if run directly
if (require.main === module) {
  runMasterDiagnostic().catch(console.error);
}

module.exports = {
  runMasterDiagnostic,
  analyzeMemorySystem,
  analyzeIPCHandlers,
  analyzeVaultIntegration,
  MASTER_RESULTS
};