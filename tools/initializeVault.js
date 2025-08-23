// Create: tools/initializeVault.js
const path = require('path');
const { ChaosAnalyzer } = require('../backend/qlib/chaosanalyzer');
const { retagVault } = require('../backend/qlib/retagger');
const { getVaultPath } = require('../components/utils/VaultPathManager');

async function initializeVaultAnalysis() {
  const vaultPath = getVaultPath();
  console.log('[STARTUP] Starting vault analysis...');
  
  try {
    // Step 1: ChaosAnalyzer
    console.log('[STARTUP] Running ChaosAnalyzer...');
    const analyzer = new ChaosAnalyzer({ 
  vaultRoot: vaultPath,
  indexOnly: true  // Don't create capsules during initialization
});
    const results = await analyzer.analyzeVault({ force: true });
    console.log(`[STARTUP] ChaosAnalyzer: ${results.filesAnalyzed} files, ${results.capsulesCreated} capsules`);
    
    // Step 2: Retagger
    console.log('[STARTUP] Running Retagger...');
    const capsulePath = path.join(vaultPath, '.echo', 'capsules');
    const retagResults = await retagVault(capsulePath, { verbose: false });
    console.log(`[STARTUP] Retagger: ${retagResults.processed} enhanced`);
    
    return { success: true, ...results, retag: retagResults };
  } catch (error) {
    console.error('[STARTUP] Vault analysis failed:', error);
    return { success: false, error: error.message };
  }
}

// Export for use in app
module.exports = { initializeVaultAnalysis };

// If run directly
if (require.main === module) {
  initializeVaultAnalysis().then(console.log);
}