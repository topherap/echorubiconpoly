// findPromptConstruction.js - Find where Q's prompts are actually built
const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = 'C:\\Users\\tophe\\Documents\\Echo Rubicon';
const REPORT_PATH = 'C:\\Users\\tophe\\Documents\\Echo Rubicon\\prompt-construction-map.txt';

let reportOutput = '';
const originalLog = console.log;
console.log = (...args) => {
  const message = args.join(' ');
  originalLog(...args);
  reportOutput += message + '\n';
};

// Cast a wider net - find ANY prompt/message construction
const SEARCH_PATTERNS = {
  // Any message construction
  messages: /messages\s*[=:]\s*\[/gi,
  messagesPush: /messages\.push/gi,
  role: /role\s*:\s*['"`]system/gi,
  content: /content\s*:\s*['"`]/gi,
  
  // Ollama/model calls
  ollama: /ollama\.|Ollama/g,
  generate: /\.generate\s*\(/g,
  chat: /\.chat\s*\(/g,
  
  // Prompt building
  prompt: /prompt\s*[=:]/gi,
  systemPrompt: /systemPrompt|system_prompt/gi,
  buildPrompt: /build.*prompt|create.*prompt|construct.*prompt/gi,
  
  // Identity strings anywhere
  youAre: /you\s+are\s+/gi,
  iAm: /I\s+am\s+/gi,
  myName: /my\s+name\s+is/gi,
  
  // Handler functions
  handler: /handler|Handler/g,
  sendMessage: /sendMessage|send-message/g,
  chatSend: /chat:send|chat-send/g
};

async function findPromptConstruction() {
  console.log('🔍 PROMPT CONSTRUCTION FINDER\n');
  console.log(`📁 Scanning: ${PROJECT_ROOT}`);
  console.log(`🕐 Started: ${new Date().toLocaleString()}\n`);
  console.log('═'.repeat(80) + '\n');
  
  const findings = {
    messageArrays: [],
    ollamaCalls: [],
    promptVars: [],
    identityStrings: [],
    handlers: [],
    suspectedFiles: new Set()
  };

  async function scanFile(filePath) {
    // Skip obvious non-runtime files
    if (filePath.includes('node_modules') || 
        filePath.includes('.git') || 
        filePath.includes('vendor') ||
        filePath.includes('test-') ||
        filePath.endsWith('.json')) {
      return;
    }
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      const relativePath = filePath.replace(PROJECT_ROOT, '.');
      
      let fileHasPromptLogic = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Skip comments
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
        
        // Check for message array construction
        if (SEARCH_PATTERNS.messages.test(line) || SEARCH_PATTERNS.messagesPush.test(line)) {
          findings.messageArrays.push({
            file: relativePath,
            line: i + 1,
            code: trimmed,
            context: getContext(lines, i, 5)
          });
          fileHasPromptLogic = true;
        }
        
        // Check for Ollama calls
        if (SEARCH_PATTERNS.ollama.test(line) && (SEARCH_PATTERNS.generate.test(line) || SEARCH_PATTERNS.chat.test(line))) {
          findings.ollamaCalls.push({
            file: relativePath,
            line: i + 1,
            code: trimmed,
            fullCall: extractFullCall(lines, i)
          });
          fileHasPromptLogic = true;
        }
        
        // Check for prompt variables
        if (SEARCH_PATTERNS.prompt.test(line) || SEARCH_PATTERNS.systemPrompt.test(line)) {
          findings.promptVars.push({
            file: relativePath,
            line: i + 1,
            code: trimmed,
            context: getContext(lines, i, 3)
          });
          fileHasPromptLogic = true;
        }
        
        // Check for identity strings
        if (SEARCH_PATTERNS.youAre.test(line) || SEARCH_PATTERNS.iAm.test(line) || SEARCH_PATTERNS.myName.test(line)) {
          const identityMatch = line.match(/you\s+are\s+(\w+)|I\s+am\s+(\w+)|name\s+is\s+(\w+)/i);
          if (identityMatch) {
            findings.identityStrings.push({
              file: relativePath,
              line: i + 1,
              identity: identityMatch[1] || identityMatch[2] || identityMatch[3],
              code: trimmed,
              fullString: extractString(lines, i)
            });
            fileHasPromptLogic = true;
          }
        }
        
        // Check for handler functions
        if (SEARCH_PATTERNS.handler.test(line) && SEARCH_PATTERNS.chatSend.test(line)) {
          findings.handlers.push({
            file: relativePath,
            line: i + 1,
            code: trimmed,
            functionName: extractFunctionName(lines, i)
          });
          fileHasPromptLogic = true;
        }
      }
      
      if (fileHasPromptLogic) {
        findings.suspectedFiles.add(relativePath);
      }
      
    } catch (err) {
      // Skip read errors
    }
  }

  function getContext(lines, lineNum, range) {
    const start = Math.max(0, lineNum - range);
    const end = Math.min(lines.length, lineNum + range + 1);
    return lines.slice(start, end)
      .map((line, idx) => {
        const actualLine = start + idx;
        const marker = actualLine === lineNum ? '→' : ' ';
        return `${marker} ${actualLine + 1}: ${line}`;
      })
      .join('\n');
  }

  function extractFullCall(lines, startLine) {
    let call = lines[startLine];
    let openParens = (call.match(/\(/g) || []).length;
    let closeParens = (call.match(/\)/g) || []).length;
    
    let i = startLine + 1;
    while (openParens > closeParens && i < lines.length && i < startLine + 50) {
      call += '\n' + lines[i];
      openParens += (lines[i].match(/\(/g) || []).length;
      closeParens += (lines[i].match(/\)/g) || []).length;
      i++;
    }
    
    return call;
  }

  function extractString(lines, lineNum) {
    const line = lines[lineNum];
    // Try to extract the full string
    const match = line.match(/(['"`])([^'"`]*(?:you\s+are|I\s+am|name\s+is)[^'"`]*)(['"`])/i);
    if (match) return match[2];
    
    // Multi-line string
    let str = line;
    for (let i = lineNum + 1; i < Math.min(lineNum + 10, lines.length); i++) {
      str += ' ' + lines[i].trim();
      if (lines[i].includes('"') || lines[i].includes("'") || lines[i].includes('`')) {
        break;
      }
    }
    return str;
  }

  function extractFunctionName(lines, lineNum) {
    // Look backwards for function definition
    for (let i = lineNum; i >= Math.max(0, lineNum - 10); i--) {
      const match = lines[i].match(/function\s+(\w+)|const\s+(\w+)\s*=|(?:async\s+)?(\w+)\s*\(/);
      if (match) {
        return match[1] || match[2] || match[3];
      }
    }
    return 'unknown';
  }

  async function scanDirectory(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'vendor'].includes(entry.name)) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
          await scanFile(fullPath);
        }
      }
    } catch (err) {
      // Skip errors
    }
  }

  // Start scan
  await scanDirectory(PROJECT_ROOT);
  
  // Generate report
  console.log('📊 PROMPT CONSTRUCTION ANALYSIS:\n');
  
  // Suspected files
  console.log('1️⃣ FILES WITH PROMPT/MESSAGE LOGIC:');
  if (findings.suspectedFiles.size === 0) {
    console.log('   ❌ No files found with prompt construction!');
  } else {
    console.log(`   Found ${findings.suspectedFiles.size} files with prompt-related code:\n`);
    Array.from(findings.suspectedFiles).forEach(file => {
      console.log(`   📁 ${file}`);
    });
  }
  
  // Message arrays
  console.log('\n\n2️⃣ MESSAGE ARRAY CONSTRUCTION:');
  if (findings.messageArrays.length === 0) {
    console.log('   ❌ No message array construction found');
  } else {
    console.log(`   Found ${findings.messageArrays.length} locations:\n`);
    findings.messageArrays.slice(0, 5).forEach(msg => {
      console.log(`   📍 ${msg.file}:${msg.line}`);
      console.log(`      Code: ${msg.code}`);
      console.log('      Context:');
      console.log(msg.context.split('\n').map(l => '      ' + l).join('\n'));
      console.log();
    });
  }
  
  // Ollama calls
  console.log('\n3️⃣ OLLAMA/MODEL CALLS:');
  if (findings.ollamaCalls.length === 0) {
    console.log('   ❌ No Ollama calls found');
  } else {
    console.log(`   Found ${findings.ollamaCalls.length} model calls:\n`);
    findings.ollamaCalls.slice(0, 3).forEach(call => {
      console.log(`   📍 ${call.file}:${call.line}`);
      console.log('      Full call:');
      console.log(call.fullCall.split('\n').map(l => '      ' + l).join('\n'));
      console.log();
    });
  }
  
  // Identity strings
  console.log('\n4️⃣ IDENTITY STRINGS FOUND:');
  if (findings.identityStrings.length === 0) {
    console.log('   ❌ No identity strings found');
  } else {
    console.log(`   Found ${findings.identityStrings.length} identity references:\n`);
    
    // Group by identity
    const identityGroups = {};
    findings.identityStrings.forEach(id => {
      if (!identityGroups[id.identity]) identityGroups[id.identity] = [];
      identityGroups[id.identity].push(id);
    });
    
    Object.entries(identityGroups).forEach(([identity, refs]) => {
      console.log(`   "${identity}": ${refs.length} references`);
      refs.slice(0, 2).forEach(ref => {
        console.log(`      ${ref.file}:${ref.line}`);
        console.log(`      String: "${ref.fullString.substring(0, 100)}..."`);
      });
      console.log();
    });
  }
  
  // Handlers
  console.log('\n5️⃣ CHAT HANDLERS:');
  if (findings.handlers.length === 0) {
    console.log('   ❌ No chat handlers found');
  } else {
    console.log(`   Found ${findings.handlers.length} handlers:\n`);
    findings.handlers.forEach(handler => {
      console.log(`   📍 ${handler.file}:${handler.line}`);
      console.log(`      Function: ${handler.functionName}`);
      console.log(`      Code: ${handler.code}`);
    });
  }
  
  // Summary
  console.log('\n\n' + '═'.repeat(80));
  console.log('🎯 KEY FINDINGS:\n');
  
  // Find the most likely prompt construction location
  const likelyFiles = Array.from(findings.suspectedFiles).filter(file => 
    file.includes('handler') || 
    file.includes('chat') || 
    file.includes('message') ||
    file.includes('ipc')
  );
  
  if (likelyFiles.length > 0) {
    console.log('Most likely files for prompt construction:');
    likelyFiles.forEach(file => {
      console.log(`   ➡️  ${file}`);
    });
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log(`\n✅ Scan complete at ${new Date().toLocaleString()}`);
  
  return findings;
}

// Run and save
findPromptConstruction().then(async () => {
  try {
    await fs.writeFile(REPORT_PATH, reportOutput, 'utf8');
    console.log(`\n📄 Report saved to: ${REPORT_PATH}`);
  } catch (err) {
    console.error(`\n❌ Failed to save: ${err.message}`);
  }
}).catch(err => {
  console.error('❌ Scanner error:', err);
});