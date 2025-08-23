// 📁 tools/echo-acceptance-tests.js
// Echo Covenant Enforcement – Periodic Test Runner

const fs = require('fs');
const path = require('path');
const { memorySystem } = require('../src/memory');
const VaultPathManager = require('../components/utils/VaultPathManager');

(async () => {
  const results = [];
  const vaultPath = VaultPathManager.getVaultPath();

  // ✅ Test: Can list folders in vault
  try {
    const folders = fs.readdirSync(vaultPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    results.push({ test: 'canListFolders', passed: folders.includes('clients') && folders.includes('Foods') });
  } catch (err) {
    results.push({ test: 'canListFolders', passed: false, error: err.message });
  }

  // ✅ Test: Can preview a known file
  try {
    const file = path.join(vaultPath, 'Foods', 'carnivore ice cream.md');
    const content = fs.readFileSync(file, 'utf8');
    results.push({ test: 'canPreviewFile', passed: content.includes('heavy cream') });
  } catch (err) {
    results.push({ test: 'canPreviewFile', passed: false, error: err.message });
  }

  // ✅ Test: Echo can recall content about Cat's Cradle
  try {
    const context = await memorySystem.buildContextForInput("what do you know about cat's cradle?");
    results.push({
      test: 'canSayCatsCradle',
      passed: context.context.toLowerCase().includes("cat") || context.context.toLowerCase().includes("cradle")
    });
  } catch (err) {
    results.push({ test: 'canSayCatsCradle', passed: false, error: err.message });
  }

  // ✅ Test: Echo can recall context for Echo Rubicon
  try {
    const context = await memorySystem.buildContextForInput("what is echo rubicon?");
    results.push({
      test: 'contextIncludesEchoRubicon',
      passed: context.context.toLowerCase().includes("rubicon")
    });
  } catch (err) {
    results.push({ test: 'contextIncludesEchoRubicon', passed: false, error: err.message });
  }

  // ✅ Test: Echo remembers niacin protocol
  try {
    const context = await memorySystem.buildContextForInput("what's the niacin protocol?");
    results.push({
      test: 'memoryCanRecallNiacin',
      passed: context.context.toLowerCase().includes("niacin")
    });
  } catch (err) {
    results.push({ test: 'memoryCanRecallNiacin', passed: false, error: err.message });
  }

  // 🔍 Print summary
  console.table(results);
  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.error(`❌ ${failed.length} tests failed. See above.`);
    process.exit(1);
  } else {
    console.log('✅ All Echo Covenant tests passed.');
    process.exit(0);
  }
})();
