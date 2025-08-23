// echo-fix-unified.js
// 🛠 Auto-heals Echo Rubicon based on diagnostic JSON
// ➤ Creates missing module stubs
// ➤ Moves dead files to /archive
// ➤ Adds minimal export to files that import but export nothing

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const DIAGNOSTIC_PATH = path.join(ROOT, 'echo-diagnostic-1752104540143.json');
const ARCHIVE_DIR = path.join(ROOT, 'z__archive');
const THIS_FILE = path.basename(__filename);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadDiagnostic() {
  if (!fs.existsSync(DIAGNOSTIC_PATH)) {
    console.error('❌ Diagnostic file not found:', DIAGNOSTIC_PATH);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(DIAGNOSTIC_PATH, 'utf8'));
}

function createStub(filePath) {
  const content = `// Auto-generated stub\nmodule.exports = {};\n`;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`🆕 Created stub: ${filePath}`);
}

function patchMissingExports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('module.exports')) {
    content += '\n\n// Auto-patched\nmodule.exports = {};\n';
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`🔧 Patched exports in: ${filePath}`);
  }
}

function moveToArchive(relPath) {
  if (relPath.includes(THIS_FILE)) return; // Don't archive this script
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return;

  const dest = path.join(ARCHIVE_DIR, relPath);
  ensureDir(path.dirname(dest));
  fs.renameSync(fullPath, dest);
  console.log(`📦 Archived: ${relPath}`);
}

function runFix() {
  console.log('\n🛠 Starting Echo Rubicon Auto-Heal...\n');
  ensureDir(ARCHIVE_DIR);

  const diag = loadDiagnostic();

  // Fix missing links
  for (const entry of diag.missing) {
    const [from, to] = entry.split(' → ');
    const fromDir = path.dirname(from);
    const targetPath = path.join(ROOT, fromDir, to + '.js');
    if (!fs.existsSync(targetPath)) createStub(targetPath);
  }

  // Patch exportless modules
  diag.files.forEach(f => {
    if (f.imports.length > 0 && f.exports === 0) {
      const fullPath = path.join(ROOT, f.file);
      if (fs.existsSync(fullPath)) patchMissingExports(fullPath);
    }
  });

  // Archive dead files
  diag.dead.forEach(moveToArchive);

  console.log('\n✅ Auto-heal complete. You may now re-run the diagnostic.');
}

runFix();
