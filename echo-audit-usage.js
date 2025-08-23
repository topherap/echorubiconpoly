// echo-audit-usage.js
// 🔍 Echo Rubicon Usage Audit: Trace each file’s usage, classify state

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const OUTPUT_JSON = path.join(ROOT, `echo-usage-audit-${Date.now()}.json`);
const OUTPUT_MD = path.join(ROOT, `echo-usage-audit-${Date.now()}.md`);

const IGNORE_DIRS = ['node_modules', '.git', '.obsidian', '.trash', '__pycache__', 'dist', 'build', 'z__archive'];
const DEAD_HINTS = ['dead', 'deprecated', 'backup', 'copy', 'test-', '-old'];

const fileMap = {};
const usedSet = new Set();

function isCodeFile(file) {
  return file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx');
}

function isDead(name) {
  return DEAD_HINTS.some(hint => name.toLowerCase().includes(hint));
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    if (IGNORE_DIRS.some(skip => rel.includes(skip))) continue;

    if (entry.isDirectory()) walk(full);
    else if (isCodeFile(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      const requires = [...content.matchAll(/require\(['"](\.\/[^'"]+)['"]\)/g)].map(m => m[1]);
      const imports = [...content.matchAll(/from ['"](\.\/[^'"]+)['"]/g)].map(m => m[1]);

      const key = rel.replace(/\\/g, '/');
      fileMap[key] = {
        file: key,
        dead: isDead(entry.name),
        calls: [...requires, ...imports],
        calledBy: []
      };
    }
  }
}

function buildLinks() {
  const allFiles = Object.keys(fileMap);

  for (const [file, data] of Object.entries(fileMap)) {
    const dir = path.dirname(file);
    data.calls.forEach(target => {
      const targetPath = path.join(dir, target + '.js').replace(/\\/g, '/');
      if (fileMap[targetPath]) {
        fileMap[targetPath].calledBy.push(file);
        usedSet.add(targetPath);
        usedSet.add(file);
      }
    });
  }
}

function generateOutput() {
  const sorted = Object.values(fileMap).sort((a, b) => a.file.localeCompare(b.file));

  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: sorted.length,
    usedFiles: [...usedSet],
    unusedFiles: sorted.filter(f => !usedSet.has(f.file)).map(f => f.file),
    classified: {
      active: [],
      orphan: [],
      runtime: [],
      dead: []
    }
  };

  const lines = [
    '# 📄 Echo Rubicon Usage Audit\n',
    `**Generated:** ${report.timestamp}\n`,
    `**Total Files:** ${sorted.length}\n`,
    `**Unused:** ${report.unusedFiles.length}\n`
  ];

  for (const f of sorted) {
    const base = `- \`${f.file}\``;
    if (f.dead) {
      lines.push(`${base} 🟥 **Dead**`);
      report.classified.dead.push(f.file);
    } else if (f.calledBy.length === 0 && f.calls.length === 0) {
      lines.push(`${base} ❌ **Orphan**`);
      report.classified.orphan.push(f.file);
    } else if (f.calledBy.length === 0 && f.calls.length > 0) {
      lines.push(`${base} 🧪 **Runtime-only**`);
      report.classified.runtime.push(f.file);
    } else {
      lines.push(`${base} ✅ **Active**`);
      report.classified.active.push(f.file);
    }
  }

  fs.writeFileSync(OUTPUT_MD, lines.join('\n'), 'utf8');
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n✅ Usage audit complete.`);
  console.log(`📄 Markdown → ${OUTPUT_MD}`);
  console.log(`📦 JSON     → ${OUTPUT_JSON}`);
}

walk(ROOT);
buildLinks();
generateOutput();
