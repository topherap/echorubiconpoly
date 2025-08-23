// reconnect-orphans.js
// 🔌 Dev tool: Test which orphaned files are still functional
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const ORPHANS_FILE = path.join(__dirname, 'logs', 'echo-structure.json');
const LOG_FILE = path.join(__dirname, 'logs', 'orphan-reconnect-results.json');
const PROJECT_ROOT = path.resolve(__dirname);

function loadOrphanList() {
  if (!fs.existsSync(ORPHANS_FILE)) {
    console.error('❌ echo-structure.json not found. Run echo-diagnose-unified.js first.');
    process.exit(1);
  }
  const raw = fs.readFileSync(ORPHANS_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed.orphaned || [];
}

function tryImport(filePath) {
  try {
    const full = path.resolve(PROJECT_ROOT, filePath);
    const mod = require(full);
    if (!mod) return { status: '⚠️ No Export' };
    const type = typeof mod;
    return { status: '✅ OK', exportType: type };
  } catch (err) {
    return { status: '❌ Fail', error: (err.message || '').split('\n')[0] };
  }
}

function testOrphans() {
  const orphans = loadOrphanList();
  const results = [];

  orphans.forEach(relPath => {
    const result = tryImport(relPath);
    results.push({ file: relPath, ...result });
  });

  fs.writeFileSync(LOG_FILE, JSON.stringify(results, null, 2), 'utf8');

  const table = results.map(r => ({
    File: r.file,
    Status: r.status,
    Export: r.exportType || '',
    Error: r.error || ''
  }));

  console.log(chalk.bold('\n🔌 Echo Orphan Reconnect Report'));
  console.table(table);
  console.log(chalk.green(`\n📄 Log saved to: ${LOG_FILE}`));
}

testOrphans();
