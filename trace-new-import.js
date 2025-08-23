// trace-new-import.js
// Find exactly where this NEW relevantCapsules import came from

const fs = require('fs');
const path = require('path');

const CONFIG = {
  ROOT: path.resolve(__dirname)
};

async function findNewImport() {
  console.log('🔍 TRACING NEW ./relevantCapsules IMPORT\n');
  
  const memoryIndexPath = path.join(CONFIG.ROOT, 'src/memory/index.js');
  
  if (!fs.existsSync(memoryIndexPath)) {
    console.log('❌ src/memory/index.js not found');
    return;
  }
  
  const content = fs.readFileSync(memoryIndexPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('📋 SEARCHING FOR ALL relevantCapsules REFERENCES:\n');
  
  let foundReferences = 0;
  
  lines.forEach((line, index) => {
    if (line.includes('relevantCapsules')) {
      foundReferences++;
      console.log(`📍 Line ${index + 1}: ${line.trim()}`);
      
      // Show 3 lines of context
      console.log('   Context:');
      for (let i = Math.max(0, index - 2); i <= Math.min(lines.length - 1, index + 2); i++) {
        const marker = i === index ? ' >>> ' : '     ';
        console.log(`${marker}${i + 1}: ${lines[i]}`);
      }
      console.log('   ' + '-'.repeat(50));
    }
  });
  
  if (foundReferences === 0) {
    console.log('🤔 NO relevantCapsules references found in memory/index.js');
    console.log('The import might be in a different file or added dynamically');
    
    // Search ALL files for any relevantCapsules references
    console.log('\n🔍 SEARCHING ALL FILES...\n');
    searchAllFiles();
  }
  
  // Check if this is a recent addition by looking for patterns
  console.log('\n🕵️ LOOKING FOR SUSPICIOUS PATTERNS:\n');
  
  // Look for recent changes - check for TODO comments, recent additions
  const suspiciousPatterns = [
    /\/\/ TODO.*relevantCapsules/i,
    /\/\/ FIXME.*relevantCapsules/i,
    /\/\/ Added.*relevantCapsules/i,
    /\/\/ New.*relevantCapsules/i,
    /console\.log.*relevantCapsules/i
  ];
  
  lines.forEach((line, index) => {
    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(line)) {
        console.log(`⚠️  Suspicious pattern at line ${index + 1}: ${line.trim()}`);
      }
    });
  });
}

function searchAllFiles() {
  const searchResults = [];
  
  function searchDirectory(dir, relativePath = '') {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        if (item.name.startsWith('.') || 
            item.name === 'node_modules' || 
            item.name === 'logs') continue;
        
        const fullPath = path.join(dir, item.name);
        const relativeFilePath = path.join(relativePath, item.name);
        
        if (item.isDirectory()) {
          searchDirectory(fullPath, relativeFilePath);
        } else if (item.name.endsWith('.js') || item.name.endsWith('.jsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('relevantCapsules')) {
            const lines = content.split('\n');
            lines.forEach((line, index) => {
              if (line.includes('relevantCapsules')) {
                searchResults.push({
                  file: relativeFilePath,
                  line: index + 1,
                  code: line.trim()
                });
              }
            });
          }
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }
  
  searchDirectory(CONFIG.ROOT);
  
  if (searchResults.length > 0) {
    console.log('🎯 FOUND relevantCapsules REFERENCES:\n');
    searchResults.forEach(result => {
      console.log(`📁 ${result.file}:${result.line}`);
      console.log(`   ${result.code}`);
      console.log('');
    });
  } else {
    console.log('🤷 NO relevantCapsules references found anywhere');
    console.log('This suggests the import is added dynamically or conditionally');
  }
  
  return searchResults;
}

async function checkForDynamicImport() {
  console.log('\n🔍 CHECKING FOR DYNAMIC IMPORTS:\n');
  
  const memoryIndexPath = path.join(CONFIG.ROOT, 'src/memory/index.js');
  const content = fs.readFileSync(memoryIndexPath, 'utf8');
  
  // Look for dynamic require patterns
  const dynamicPatterns = [
    /require\(['"`][^'"`]*\$\{[^}]*\}[^'"`]*['"`]\)/g,
    /require\(['"`][^'"`]*\+[^'"`]*['"`]\)/g,
    /require\([^)]*\?\.[^)]*\)/g,
    /import\([^)]*['"`][^'"`]*\$\{[^}]*\}[^'"`]*['"`]\)/g
  ];
  
  let foundDynamic = false;
  
  dynamicPatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      foundDynamic = true;
      console.log(`⚡ Dynamic pattern ${index + 1} found:`);
      matches.forEach(match => {
        console.log(`   ${match}`);
      });
    }
  });
  
  if (!foundDynamic) {
    console.log('No dynamic import patterns found');
  }
  
  // Check for the specific error from the logs
  console.log('\n🚨 CHECKING FOR ERROR LINE 369:\n');
  const lines = content.split('\n');
  if (lines.length >= 369) {
    console.log(`Line 369: ${lines[368]}`); // 0-indexed
    console.log('\nContext around line 369:');
    for (let i = 365; i <= 372; i++) {
      if (i >= 0 && i < lines.length) {
        console.log(`${i + 1}: ${lines[i]}`);
      }
    }
  }
}

async function findRecentChanges() {
  console.log('\n📅 CHECKING FOR RECENT CHANGES:\n');
  
  // Look for files modified recently
  const memoryDir = path.join(CONFIG.ROOT, 'src/memory');
  
  if (fs.existsSync(memoryDir)) {
    const files = fs.readdirSync(memoryDir);
    
    console.log('Memory directory files:');
    files.forEach(file => {
      const filePath = path.join(memoryDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  ${file} - Modified: ${stats.mtime.toISOString()}`);
    });
  }
  
  // Check the main memory index file for any obvious additions
  const memoryIndexPath = path.join(CONFIG.ROOT, 'src/memory/index.js');
  const content = fs.readFileSync(memoryIndexPath, 'utf8');
  
  // Look for function signatures that might have been added
  const functionPattern = /function\s+\w+|const\s+\w+\s*=|class\s+\w+/g;
  const functions = content.match(functionPattern) || [];
  
  console.log('\n🔧 Functions/Classes in memory/index.js:');
  functions.forEach(func => {
    console.log(`  ${func}`);
  });
}

async function createQuickFix() {
  console.log('\n🛠️  CREATING QUICK FIX:\n');
  
  const memoryIndexPath = path.join(CONFIG.ROOT, 'src/memory/index.js');
  let content = fs.readFileSync(memoryIndexPath, 'utf8');
  
  // Comment out any relevantCapsules imports
  const lines = content.split('\n');
  let modified = false;
  
  const newLines = lines.map((line, index) => {
    if (line.includes('relevantCapsules') && line.includes('require')) {
      modified = true;
      console.log(`✏️  Commenting out line ${index + 1}: ${line.trim()}`);
      return `// TEMP FIX: ${line}`;
    }
    return line;
  });
  
  if (modified) {
    const backupPath = memoryIndexPath + '.backup';
    console.log(`💾 Creating backup: ${backupPath}`);
    fs.writeFileSync(backupPath, content);
    
    console.log(`✅ Applying fix to: ${memoryIndexPath}`);
    fs.writeFileSync(memoryIndexPath, newLines.join('\n'));
    
    console.log('\n🎯 QUICK FIX APPLIED!');
    console.log('Try running your chat now - the error should be gone');
    console.log('To undo: rename .backup file back to original');
  } else {
    console.log('❓ No obvious relevantCapsules imports found to comment out');
  }
}

async function main() {
  console.log('🔬 INVESTIGATING NEW relevantCapsules IMPORT\n');
  console.log('This import never existed before, so something recently added it.\n');
  
  await findNewImport();
  await checkForDynamicImport();
  await findRecentChanges();
  
  console.log('\n🤔 ANALYSIS:');
  console.log('If no direct imports are found, this could be:');
  console.log('1. A dynamic import created by string concatenation');
  console.log('2. An import added by a recent code change');
  console.log('3. A conditional import that only runs in specific cases');
  console.log('4. Generated code or a webpack/build artifact');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('\nApply quick fix by commenting out relevantCapsules imports? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      createQuickFix();
    } else {
      console.log('Quick fix skipped - investigate manually');
    }
    readline.close();
  });
}

main().catch(console.error);