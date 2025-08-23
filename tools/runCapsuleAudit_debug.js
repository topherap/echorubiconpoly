const path = require('path');
const fs = require('fs');
const { auditCapsulePipeline } = require('../backend/qlib/auditCapsulePipeline');

const CAPSULE_DIR = path.resolve('D:/Obsidian Vault/.echo/capsules');

console.log('\n🔍 Resolving capsule directory path...');
console.log('Resolved Path:', CAPSULE_DIR);
console.log('Exists:', fs.existsSync(CAPSULE_DIR));
console.log('Readable:', fs.statSync(CAPSULE_DIR).isDirectory());

(async () => {
  console.log('\n📦 Running full memory pipeline audit...');
  const { results, issues } = await auditCapsulePipeline(CAPSULE_DIR);

  console.log(`\n🔍 Scanned ${results.length} capsules`);
  console.log(`⚠️ Found ${issues.length} issues:`);

  const grouped = issues.reduce((acc, issue) => {
    acc[issue.type] = acc[issue.type] || [];
    acc[issue.type].push(issue);
    return acc;
  }, {});

  for (const [type, entries] of Object.entries(grouped)) {
    console.log(`\n— ${type} (${entries.length})`);
    entries.slice(0, 20).forEach(e => {
      const extra = e.target ? `→ ${e.target}` : '';
      console.log(`- ${e.id || ''} @ ${path.basename(e.file)} ${extra}`);
    });
    if (entries.length > 20) {
      console.log(`...and ${entries.length - 20} more`);
    }
  }

  console.log('\n✅ Audit complete.\n');
})();
