// traceSpineGuardian.js - Verify SpineGuardian activation
const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = 'C:\\Users\\tophe\\Documents\\Echo Rubicon';
const SPINE_GUARDIAN_PATH = path.join(PROJECT_ROOT, 'src', 'echo', 'core', 'SpineGuardian.js');
const PRIME_DIRECTIVE_PATH = path.join(PROJECT_ROOT, 'src', 'echo', 'memory', 'spine', 'primeDirective.txt');

async function traceSpineGuardian() {
  console.log('🔍 SPINEGUARDIAN ACTIVATION TRACER\n');
  console.log('═'.repeat(80) + '\n');
  
  // First, verify the files exist
  console.log('1️⃣ VERIFYING SPINE FILES:\n');
  
  try {
    await fs.access(SPINE_GUARDIAN_PATH);
    console.log('   ✅ SpineGuardian.js exists at:', SPINE_GUARDIAN_PATH);
    
    const spineContent = await fs.readFile(SPINE_GUARDIAN_PATH, 'utf8');
    console.log('   📄 File size:', spineContent.length, 'bytes');
    
    // Check if it has the key methods
    const hasInjectDirective = spineContent.includes('injectDirective');
    const hasLoadDirective = spineContent.includes('loadDirective');
    console.log('   🔧 Has injectDirective method:', hasInjectDirective ? '✅' : '❌');
    console.log('   🔧 Has loadDirective method:', hasLoadDirective ? '✅' : '❌');
  } catch (err) {
    console.log('   ❌ SpineGuardian.js NOT FOUND!');
  }
  
  try {
    await fs.access(PRIME_DIRECTIVE_PATH);
    console.log('\n   ✅ primeDirective.txt exists at:', PRIME_DIRECTIVE_PATH);
    
    const directiveContent = await fs.readFile(PRIME_DIRECTIVE_PATH, 'utf8');
    console.log('   📄 Directive size:', directiveContent.length, 'bytes');
    console.log('   📜 First line:', directiveContent.split('\n')[0]);
  } catch (err) {
    console.log('\n   ❌ primeDirective.txt NOT FOUND!');
  }
  
  // Now search for SpineGuardian usage
  console.log('\n\n2️⃣ SEARCHING FOR SPINEGUARDIAN IMPORTS & USAGE:\n');
  
  const findings = {
    imports: [],
    instantiations: [],
    injections: [],
    references: []
  };
  
  async function scanFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      const relativePath = filePath.replace(PROJECT_ROOT, '.');
      
      lines.forEach((line, idx) => {
        // Skip comments
        if (line.trim().startsWith('//')) return;
        
        // Check for imports
        if (line.includes('SpineGuardian') && (line.includes('import') || line.includes('require'))) {
          findings.imports.push({
            file: relativePath,
            line: idx + 1,
            code: line.trim(),
            type: line.includes('import') ? 'ES6' : 'CommonJS'
          });
        }
        
        // Check for instantiation
        if (line.includes('new SpineGuardian')) {
          findings.instantiations.push({
            file: relativePath,
            line: idx + 1,
            code: line.trim(),
            context: getContext(lines, idx, 3)
          });
        }
        
        // Check for injection calls
        if (line.includes('injectDirective')) {
          findings.injections.push({
            file: relativePath,
            line: idx + 1,
            code: line.trim(),
            context: getContext(lines, idx, 5)
          });
        }
        
        // Any other SpineGuardian reference
        if (line.includes('SpineGuardian') || line.includes('spineGuardian')) {
          findings.references.push({
            file: relativePath,
            line: idx + 1,
            code: line.trim()
          });
        }
      });
    } catch (err) {
      // Skip
    }
  }
  
  function getContext(lines, lineNum, range) {
    const start = Math.max(0, lineNum - range);
    const end = Math.min(lines.length, lineNum + range + 1);
    return lines.slice(start, end).join('\n');
  }
  
  async function scanDirectory(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'vendor'].includes(entry.name)) {
            await scanDirectory(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          await scanFile(fullPath);
        }
      }
    } catch (err) {
      // Skip
    }
  }
  
  await scanDirectory(PROJECT_ROOT);
  
  // Report findings
  console.log('3️⃣ SPINEGUARDIAN USAGE ANALYSIS:\n');
  
  console.log(`   📥 Imports: ${findings.imports.length}`);
  if (findings.imports.length > 0) {
    console.log('\n   Import locations:');
    findings.imports.forEach(imp => {
      console.log(`      ${imp.file}:${imp.line} (${imp.type})`);
      console.log(`      ${imp.code}\n`);
    });
  }
  
  console.log(`\n   🏗️ Instantiations: ${findings.instantiations.length}`);
  if (findings.instantiations.length > 0) {
    console.log('\n   Where SpineGuardian is created:');
    findings.instantiations.forEach(inst => {
      console.log(`      ${inst.file}:${inst.line}`);
      console.log(`      ${inst.code}`);
      console.log('      Context:');
      console.log(inst.context.split('\n').map(l => '         ' + l).join('\n'));
      console.log();
    });
  }
  
  console.log(`\n   💉 Directive Injections: ${findings.injections.length}`);
  if (findings.injections.length > 0) {
    console.log('\n   Where directive is injected:');
    findings.injections.forEach(inj => {
      console.log(`      ${inj.file}:${inj.line}`);
      console.log(`      ${inj.code}`);
      console.log('      Context:');
      console.log(inj.context.split('\n').map(l => '         ' + l).join('\n'));
      console.log();
    });
  }
  
  // Check the chat handler specifically
  console.log('\n\n4️⃣ CHECKING CHAT HANDLER FOR SPINE INTEGRATION:\n');
  
  try {
    const chatHandlerPath = path.join(PROJECT_ROOT, 'main', 'handlers', 'chatSendHandler.js');
    const chatContent = await fs.readFile(chatHandlerPath, 'utf8');
    
    const hasSpineImport = chatContent.includes('SpineGuardian');
    const hasInjectCall = chatContent.includes('injectDirective');
    const hasPrimeDirective = chatContent.includes('primeDirective');
    
    console.log('   Chat handler analysis:');
    console.log('   Has SpineGuardian import:', hasSpineImport ? '✅' : '❌');
    console.log('   Has injectDirective call:', hasInjectCall ? '✅' : '❌');
    console.log('   References primeDirective:', hasPrimeDirective ? '✅' : '❌');
    
    if (!hasSpineImport && !hasInjectCall) {
      console.log('\n   ⚠️  SPINE NOT INTEGRATED IN CHAT HANDLER!');
      console.log('   The SpineGuardian exists but is NOT being used in the main chat flow.');
    }
  } catch (err) {
    console.log('   ❌ Could not analyze chat handler');
  }
  
  // Summary
  console.log('\n\n' + '═'.repeat(80));
  console.log('🎯 SPINE ACTIVATION STATUS:\n');
  
  if (findings.injections.length === 0) {
    console.log('❌ SPINE IS NOT ACTIVE!');
    console.log('   - SpineGuardian exists but injectDirective is never called');
    console.log('   - The prime directive is NOT being injected into prompts');
    console.log('\n💡 TO ACTIVATE:');
    console.log('   1. Import SpineGuardian in chatSendHandler.js');
    console.log('   2. Create instance: const spine = new SpineGuardian(identity.ai.name)');
    console.log('   3. Inject directive: enhancedMessages[0].content = spine.injectDirective(systemMessage.content)');
  } else {
    console.log('✅ SPINE APPEARS ACTIVE');
    console.log(`   - Found ${findings.injections.length} injection points`);
    console.log('   - Verify these are in the active message flow');
  }
  
  console.log('\n' + '═'.repeat(80));
}

// Run the tracer
traceSpineGuardian().catch(err => {
  console.error('❌ Tracer error:', err);
});