// echo-diagnose-unified.js – v2
// 🧠 One diagnostic to rule them all

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const ROOT = path.resolve(__dirname);
const ARCHIVE = path.join(ROOT, 'z__archive');
const LOG_DIR = path.join(ROOT, 'logs');
const OUTPUT_FILE = path.join(LOG_DIR, 'echo-structure.json');

const IGNORE_DIRS = [
  'node_modules', '.git', '.obsidian', '.vscode', '__pycache__', 'dist', 'build', 'venv'
];
const DEAD_HINTS = ['dead', 'deprecated', 'backup', 'copy', 'test-', '-old'];
const EXPECTED_PATTERNS = [
  'processUserInput', 'buildSystemPrompt', 'saveCapsule', 'extractFacts',
  'context +=', 'ipcMain.handle', 'contextBridge.exposeInMainWorld'
];

const STATE = {
  files: [],
  links: [],
  missing: [],
  orphaned: [],
  dead: [],
  archived: [],
  breaks: [],
  timestamp: new Date().toISOString()
};

const fileMap = {}; // full relPath → fileInfo
const backlinkMap = {}; // reverse lookup: file ← importers[]

function isCodeFile(file) {
  return file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts');
}

function isDeadFile(name) {
  return DEAD_HINTS.some(hint => name.toLowerCase().includes(hint));
}

function crawl(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const rel = path.relative(ROOT, fullPath);
    if (IGNORE_DIRS.some(skip => rel.includes(skip))) continue;
    if (entry.isDirectory()) crawl(fullPath);
    else if (isCodeFile(entry.name)) {
      const code = fs.readFileSync(fullPath, 'utf8');
      const inArchive = rel.includes('z__archive');
      const dead = isDeadFile(entry.name);
      const fileInfo = {
        file: rel,
        status: inArchive
          ? '🟥 archived'
          : dead
          ? '🟥 dead'
          : '🟨 orphaned-live', // provisional, upgrade later if backlinks found
        type: path.extname(entry.name).substring(1),
        patterns: {},
        imports: [],
        exports: []
      };

      for (const pattern of EXPECTED_PATTERNS) {
        fileInfo.patterns[pattern] = code.includes(pattern);
      }

      const requires = [...code.matchAll(/require\(['"](\.\/[^'"]+)['"]\)/g)].map(m => m[1]);
      fileInfo.imports = requires;
      fileInfo.exports = (code.match(/module\.exports|export /g) || []).length;

      STATE.files.push(fileInfo);
      fileMap[rel] = fileInfo;

      if (inArchive) STATE.archived.push(rel);
      if (dead && !inArchive) STATE.dead.push(rel);
      if (fileInfo.exports === 0 && requires.length > 0)
        STATE.breaks.push(`⚠️ ${rel} requires others but exports nothing`);

      requires.forEach(target => {
        const sourceDir = path.dirname(rel);
        const resolvedPath = path.normalize(path.join(sourceDir, target)) + '.js';
        backlinkMap[resolvedPath] = backlinkMap[resolvedPath] || [];
        backlinkMap[resolvedPath].push(rel);

        if (!fs.existsSync(path.resolve(ROOT, resolvedPath))) {
          STATE.missing.push(`${rel} → ${target}`);
        } else {
          STATE.links.push({ from: rel, to: resolvedPath });
        }
      });
    }
  }
}

// 🔍 Upgrade orphaned status to "live" if backlinks exist
function finalizeOrphanStatus() {
  Object.entries(backlinkMap).forEach(([target, importers]) => {
    if (fileMap[target] && fileMap[target].status === '🟨 orphaned-live') {
      fileMap[target].status = '✅ live';
    }
  });

  STATE.files.forEach(f => {
    if (f.status === '🟨 orphaned-live') {
      STATE.orphaned.push(f.file);
    }
  });
}

function summarize() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

  finalizeOrphanStatus();

  const counts = {
    live: STATE.files.filter(f => f.status === '✅ live').length,
    orphaned: STATE.orphaned.length,
    archived: STATE.archived.length,
    dead: STATE.dead.length,
    missing: STATE.missing.length,
    broken: STATE.breaks.length
  };

  console.log(chalk.bold('\n📊 Echo Rubicon – Diagnostic Summary'));
  console.table(counts);

  if (STATE.breaks.length) {
    console.log(chalk.red(`\n⚠️ BROKEN MODULES:`));
    STATE.breaks.forEach(b => console.log('-', b));
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(STATE, null, 2), 'utf8');
  console.log(chalk.green(`\n📄 Report saved to: ${OUTPUT_FILE}`));
}

// 🧠 START
console.log(chalk.bold('\n🧠 Echo Rubicon – Full Diagnostic Scan (v2)'));
crawl(ROOT);
summarize();
