// cappaths.js
const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const targetDirs = [
  path.join(projectRoot, 'src'),
  path.join(projectRoot, 'main'),
  path.join(projectRoot, 'components'),
  path.join(projectRoot, 'backend'),
  path.join(projectRoot, 'utils')
];

const results = [];

const scanFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, i) => {
    if (
      /contextData\.capsules/.test(line) ||
      /\bcapsules\?.map/.test(line) ||
      /\bcapsules\?.length/.test(line) ||
      /\bcapsules\[/.test(line) ||
      /\.capsules\.map/.test(line)
    ) {
      results.push({
        file: filePath,
        line: i + 1,
        text: line.trim()
      });
    }
  });
};

const walkDir = (dir) => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (f.endsWith('.js')) {
      scanFile(fullPath);
    }
  });
};

console.log('🔍 Scanning for capsule crash paths...\n');
targetDirs.forEach(walkDir);

if (results.length === 0) {
  console.log('✅ No illegal capsule references found.\nSystem is capsule-safe.');
} else {
  results.forEach(({ file, line, text }) => {
    console.log(`❌ ${file}:${line} → ${text}`);
  });
  console.log(`\n🛑 Found ${results.length} capsule crash path(s). Fix before relaunch.`);
  process.exitCode = 1;
}

