// Save as: tools/diagnose-hallucination-v2.js

const path = require('path');
const fs = require('fs');

async function diagnoseHallucination() {
  console.log('=== HALLUCINATION DIAGNOSTIC V2 ===\n');
  
  // 1. Find where capsules actually are
  console.log('1. FINDING CAPSULE LOCATIONS:');
  
  const possiblePaths = [
    'D:\\Obsidian Vault\\.echo\\projects\\clients\\capsules\\2025-08\\06',
    'D:\\Obsidian Vault\\.echo\\projects\\clients\\capsules\\2025-08\\07',
    'D:\\Obsidian Vault\\.echo\\projects\\clients\\capsules',
    'D:\\Obsidian Vault\\.echo\\capsules\\2025-08\\06',
    'D:\\Obsidian Vault\\.echo\\capsules\\2025-08\\07',
    'D:\\Obsidian Vault\\.echo\\capsules'
  ];
  
  let actualPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('✓ Found:', p);
      const files = fs.readdirSync(p);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      if (jsonFiles.length > 0) {
        console.log(`  Contains ${jsonFiles.length} capsules`);
        actualPath = p;
        break;
      }
    }
  }
  
  if (!actualPath) {
    console.log('❌ No capsule directory found!');
    return;
  }
  
  // 2. Find Jane Kimani capsule
  console.log('\n2. SEARCHING FOR JANE KIMANI:');
  
  function searchDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        searchDir(fullPath);
      } else if (file.endsWith('.json')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('Jane') && content.includes('Kimani')) {
            console.log('✓ Found Jane Kimani in:', fullPath);
            const data = JSON.parse(content);
            console.log('  Summary:', data.summary);
            console.log('  Type:', data.type);
            console.log('  Content preview:', data.content.substring(0, 200) + '...');
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
  
  searchDir('D:\\Obsidian Vault\\.echo');
  
  // 3. Test memory system if available
  console.log('\n3. MEMORY SYSTEM STATUS:');
  console.log('Global memorySystem:', typeof global.memorySystem);
  console.log('Run this in Echo to test search:');
  console.log('await global.memorySystem.vaultManager.searchMemories("Jane Kimani")');
}

// Run diagnostic
diagnoseHallucination();