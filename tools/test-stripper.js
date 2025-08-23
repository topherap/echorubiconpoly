// test-stripper.js - Save this and run it on ONE file
const fs = require('fs').promises;

async function diagnoseFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  
  console.log("ORIGINAL LENGTH:", content.length);
  console.log("FIRST 200 CHARS:", content.substring(0, 200));
  
  // Try to find where real content starts
  const realContentMarkers = [
    '> 🧠',
    '## Set 1',
    '## 1️⃣',
    'FOCUS',
    '**Sefirotic',
    '**Element',
    '**Intention'
  ];
  
  let realContentStart = content.length;
  for (const marker of realContentMarkers) {
    const index = content.indexOf(marker);
    if (index !== -1 && index < realContentStart) {
      realContentStart = index;
      console.log(`FOUND REAL CONTENT AT: ${index} (marker: ${marker})`);
    }
  }
  
  const cleaned = content.substring(realContentStart);
  console.log("CLEANED LENGTH:", cleaned.length);
  console.log("CLEANED PREVIEW:", cleaned.substring(0, 200));
}

// Run on one file
diagnoseFile("D:\\Obsidian Vault\\lifts\\Temple bench.md").catch(console.error);