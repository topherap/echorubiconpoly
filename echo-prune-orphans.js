// echo-prune-orphans.js
// 📦 Moves all orphaned files to ./z__archive with a log

const fs = require('fs');
const path = require('path');

const ARCHIVE_DIR = path.join(__dirname, 'z__archive');
const JSON_PATH = path.join(__dirname, 'echo-usage-audit-1752105265332.json');
const MD_LOG = path.join(__dirname, `orphan-prune-log-${Date.now()}.md`);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function moveFile(relPath) {
  const src = path.join(__dirname, relPath);
  const dest = path.join(ARCHIVE_DIR, relPath);
  ensureDir(path.dirname(dest));
  fs.renameSync(src, dest);
  return `- 📦 \`${relPath}\` → \`z__archive/${relPath}\``;
}

function main() {
  console.log('\n🧹 Pruning orphaned files...');
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const orphans = data.classified.orphan || [];

  ensureDir(ARCHIVE_DIR);
  const log = [`# 🧾 Orphan File Prune Log`, `**Timestamp:** ${new Date().toISOString()}`, `**Files Moved:** ${orphans.length}\n`];

  for (const relPath of orphans) {
    const fullPath = path.join(__dirname, relPath);
    if (fs.existsSync(fullPath)) {
      try {
        log.push(moveFile(relPath));
      } catch (e) {
        log.push(`- ⚠️ Failed to move: \`${relPath}\` — ${e.message}`);
      }
    } else {
      log.push(`- ⚠️ File not found: \`${relPath}\``);
    }
  }

  fs.writeFileSync(MD_LOG, log.join('\n'), 'utf8');
  console.log(`\n✅ Archived ${orphans.length} files → z__archive/`);
  console.log(`📝 Log saved to: ${MD_LOG}`);
}

main();
