// safe-clean.js - A gentler cleaning approach
const fs = require('fs');

const file = 'components/MyAI-global.js';
const backup = 'components/MyAI-global.backup.js';
const output = 'components/MyAI-global-clean.js';

// Make backup
fs.copyFileSync(file, backup);

// Read content
let content = fs.readFileSync(file, 'utf8');

// Only remove the most spammy debug logs
content = content.replace(/console\.log\('\[DEBUG-[^']+\]'[^)]*\);/g, '// [DEBUG REMOVED]');

// Remove red dots
content = content.replace(/console\.log\('🔴🔴🔴[^)]+\);/g, '// [RED DOT REMOVED]');

// Write cleaned version
fs.writeFileSync(output, content);

console.log('Safe cleaning done! Minimal changes made.');

// Count changes
const originalLines = fs.readFileSync(inputFile, 'utf8').split('\n').length;
const newLines = content.split('\n').length;
const removed = originalLines - newLines;

// Write cleaned file
fs.writeFileSync(outputFile, content, 'utf8');

console.log('✅ Cleaning complete!');
console.log(`📊 Removed ${removed} lines`);
console.log(`📁 Original: ${originalLines} lines`);
console.log(`📁 Cleaned: ${newLines} lines`);
console.log(`💾 Saved to: ${outputFile}`);
console.log('\nTo use the cleaned file:');
console.log('1. Review the changes');
console.log('2. If satisfied, replace the original');
console.log(`3. Backup saved at: ${backupFile}`);

// Show sample of what was removed
const debugCount = (fs.readFileSync(inputFile, 'utf8').match(/\[DEBUG/g) || []).length;
console.log(`\n📊 Found ${debugCount} DEBUG statements in original`);