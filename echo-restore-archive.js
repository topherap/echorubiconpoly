// echo-restore-archive.js
// 🔁 Restores all files moved by the orphan prune script based on the CORRECT log

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const ARCHIVE_DIR = path.join(ROOT, 'z__archive');
const LOG_PATH = path.join(ROOT, 'orphan-prune-log-1752105896932.md');
const RESTORE_LOG = path.join(ROOT, `restore-log-${Date.now()}.md`);

function restoreFile(archivedPath, originalPath) {
  const src = path.join(ROOT, archivedPath);
  const dest = path.join(ROOT, originalPath);
  if (!fs.existsSync(src)) return `- ⚠️ Missing: ${archivedPath}`;

  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  fs.renameSync(src, dest);
  return `- ✅ Restored: ${archivedPath} → ${originalPath}`;
}

function main() {
  console.log('\n🔁 Restoring files from z__archive using prune log...');
  if (!fs.existsSync(LOG_PATH)) {
    console.error('❌ Missing prune log:', LOG_PATH);
    return;
  }

  const lines = fs.readFileSync(LOG_PATH, 'utf8').split('\n');
  const restored = [];

  for (const line of lines) {
    const match = line.match(/- 📦 `(.+?)` → `(.+?)`/);
    if (match) {
      const [, original, archived] = match;
      restored.push(restoreFile(archived, original));
    }
  }

  fs.writeFileSync(RESTORE_LOG, [`# 🧾 Restore Log`, `**Timestamp:** ${new Date().toISOString()}`, '', ...restored].join('\n'), 'utf8');
  console.log(`\n✅ Restore complete. Log saved to: ${RESTORE_LOG}`);
}

main();
