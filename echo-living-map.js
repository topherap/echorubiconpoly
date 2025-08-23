// echo-living-map.js
// Node.js script to map all functional files in Echo Rubicon
// Excludes node_modules, dependencies, and junk files
// Outputs to /echolivingmap.json

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const OUTPUT_FILE = path.join(ROOT, 'echolivingmap.json');

const IGNORE_DIRS = [
  'node_modules', '.git', '.obsidian', '.trash', '.vscode', '__pycache__', 'dist', 'build'
];
const DEAD_HINTS = ['dead', 'deprecated', 'backup', 'copy', 'test-', '-old'];

function isCodeFile(file) {
  return file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.json');
}

function isDeadFile(name) {
  return DEAD_HINTS.some(hint => name.toLowerCase().includes(hint));
}

function scanDir(dir, relPath = '') {
  const full = path.join(dir, relPath);
  const contents = fs.readdirSync(full, { withFileTypes: true });
  const files = [];

  for (const entry of contents) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      files.push(...scanDir(dir, path.join(relPath, entry.name)));
    } else if (isCodeFile(entry.name)) {
      files.push({
        file: path.join(relPath, entry.name),
        status: isDeadFile(entry.name) ? '🟥 dead' : '✅ live',
        type: path.extname(entry.name).substring(1)
      });
    }
  }

  return files;
}

function buildMap() {
  const files = scanDir(ROOT);

  const map = {
    root: ROOT,
    generated: new Date().toISOString(),
    summary: {
      total: files.length,
      live: files.filter(f => f.status === '✅ live').length,
      dead: files.filter(f => f.status === '🟥 dead').length,
    },
    files
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(map, null, 2), 'utf8');
  console.log(`✅ Echo living map generated → ${OUTPUT_FILE}`);
}

buildMap();
