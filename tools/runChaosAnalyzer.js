const path = require('path');
const ChaosAnalyzer = require('../backend/qlib/chaosanalyzer'); // ✅ no destructuring


(async () => {
  const vaultPath = path.resolve('D:/Obsidian Vault');
  const analyzer = new ChaosAnalyzer({ 
  vaultRoot: vaultPath,
  createCapsules: true  // Enable capsule creation for vault search fix
});

  console.log('🧠 Starting ChaosAnalyzer...');
  const results = await analyzer.analyzeVault({ force: true });

  console.log('\n📊 ChaosAnalyzer complete:');
  console.log(`Files analyzed: ${results.filesAnalyzed}`);
  console.log(`Capsules created: ${results.capsulesCreated}`);
  console.log(`Errors: ${results.errors.length}`);
})();
