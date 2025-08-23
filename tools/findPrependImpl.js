// tools/findPrependImpl.js
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const matchers = [
  '```metadata',
  '## Who',
  'formatMarkdownMeta',
  'fs.writeFile',
  'contentWithMeta',
  'prepend',
  'analysis.content',
  'metadata block'
];

const ignoredDirs = ['node_modules', '.git', 'dist', 'venv', 'public', 'scripts', 'tools'];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return matchers
    .map(m => ({ match: m, found: content.includes(m) }))
    .filter(r => r.found)
    .map(r => r.match);
}

function walk(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.includes(entry.name)) walk(fullPath, results);
    } else if (entry.name.endsWith('.js')) {
      const matches = scanFile(fullPath);
      if (matches.length > 0) {
        results.push({ file: fullPath, matches });
      }
    }
  }

  return results;
}

const results = walk(root);
console.log('\n🧠 Prepend-related references found:\n');
for (const { file, matches } of results) {
  console.log(`📁 ${file}`);
  matches.forEach(m => console.log(`   → ${m}`));
}
console.log(`\n🔍 Searched ${results.length} file(s) with matches.\n`);
