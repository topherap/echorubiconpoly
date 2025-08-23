// echo-check-archive.js
// 🔁 Scans z__archive/ for false positives (files misclassified as unused)

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const ARCHIVE_DIR = path.join(ROOT, 'z__archive');
const ALL_FILES = new Set();

function walkAll(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    if (entry.isDirectory()) walkAll(full);
    else if (entry.name.endsWith('.js')) ALL_FILES.add(rel);
  }
}

function scanArchive(filePath) {
  const usedBy = [];
  const code = fs.readFileSync(filePath, 'utf8');
  const name = path.basename(filePath).replace('.js', '');

  for (const other of ALL_FILES) {
    if (other.startsWith('z__archive')) continue;
    const otherPath = path.join(ROOT, other);
    if (!fs.existsSync(otherPath)) continue;
    const content = fs.readFileSync(otherPath, 'utf8');
    if (content.includes(name)) usedBy.push(other);
  }

  return usedBy;
}

function main() {
  console.log('\n🔎 Scanning z__archive for false positives...');
  walkAll(ROOT);

  const suspects = [];
  const files = fs.readdirSync(ARCHIVE_DIR, { withFileTypes: true });

  function recursiveScan(base) {
    const items = fs.readdirSync(base, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(base, item.name);
      if (item.isDirectory()) recursiveScan(full);
      else if (item.name.endsWith('.js')) {
        const rel = path.relative(ROOT, full);
        const found = scanArchive(full);
        if (found.length > 0) {
          suspects.push({ file: rel, usedBy: found });
          console.log(`⚠️  Possibly active: ${rel} ← used by: ${found.join(', ')}`);
        }
      }
    }
  }

  recursiveScan(ARCHIVE_DIR);

  if (suspects.length === 0) console.log('\n✅ No archive files appear actively referenced.');
  else console.log(`\n⚠️ ${suspects.length} files may be false positives.`);
}

main();
