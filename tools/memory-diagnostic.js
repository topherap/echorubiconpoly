// memory-diagnostic.js – Unified Echo Rubicon Diagnostic Suite
const path = require('path');
const fs = require('fs');
const os = require('os');

// Check if VaultPathManager exists and how it works
let vaultPath;
try {
  const VaultPathManager = require('../components/utils/VaultPathManager');
  // VaultPathManager might be a class that needs instantiation
  if (typeof VaultPathManager === 'function') {
    const manager = new VaultPathManager();
    vaultPath = manager.resolve ? manager.resolve() : manager.getPath();
  } else if (VaultPathManager.getVaultPath) {
    vaultPath = VaultPathManager.getVaultPath();
  } else if (VaultPathManager.default) {
    // Might be an ES module exported as default
    vaultPath = VaultPathManager.default.resolve ? VaultPathManager.default.resolve() : VaultPathManager.default();
  } else {
    throw new Error('VaultPathManager does not have expected methods');
  }
} catch (e) {
  console.warn('[WARN] VaultPathManager not available:', e.message);
  // Fallback: determine vault path from environment or defaults
  vaultPath = process.env.ECHO_VAULT_PATH || 
              path.join(os.homedir(), 'Documents', 'EchoVault') ||
              path.join(process.cwd(), 'vault');
}

// Ensure vault path exists
if (!fs.existsSync(vaultPath)) {
  console.error('[ERROR] Vault path does not exist:', vaultPath);
  console.log('Please set ECHO_VAULT_PATH environment variable or ensure vault exists at:', vaultPath);
  process.exit(1);
}

console.log('=== Echo Rubicon :: Memory Diagnostic ===');
console.log('Vault path:', vaultPath);

const report = {
  started: new Date().toISOString(),
  vaultPath,
  modules: {},
  errors: [],
  complete: false
};

// Helper function to safely load modules
function safeRequire(modulePath, moduleName) {
  try {
    return require(modulePath);
  } catch (e) {
    console.warn(`[WARN] Failed to load ${moduleName}:`, e.message);
    report.errors.push({ module: moduleName, error: e.message });
    return null;
  }
}

(async () => {
  try {
    // 1. ChaosAnalyzer Dry Run
    console.log('\n[1] Running ChaosAnalyzer...');
    const chaosanalyzer = safeRequire('../backend/qlib/chaosanalyzer', 'chaosanalyzer');
    if (chaosanalyzer && chaosanalyzer.formatVault) {
      try {
        await chaosanalyzer.formatVault(vaultPath, { dryRun: true });
        report.modules.chaosAnalyzer = '✓ Dry run complete';
      } catch (e) {
        console.error('[ERROR] ChaosAnalyzer failed:', e.message);
        report.modules.chaosAnalyzer = '✗ Failed: ' + e.message;
      }
    } else {
      report.modules.chaosAnalyzer = '✗ Module not available';
    }

    // 2. Retagger
    console.log('\n[2] Running Retagger...');
    const retagger = safeRequire('../backend/qlib/retagger', 'retagger');
    if (retagger && retagger.retagVault) {
      try {
        await retagger.retagVault(vaultPath);
        report.modules.retagger = '✓ Retagging complete';
      } catch (e) {
        console.error('[ERROR] Retagger failed:', e.message);
        report.modules.retagger = '✗ Failed: ' + e.message;
      }
    } else {
      report.modules.retagger = '✗ Module not available';
    }

    // 3. Epoch Classification
    console.log('\n[3] Testing Epoch Classification...');
    const epochModule = safeRequire('../backend/qlib/epochClassifier', 'epochClassifier');
    if (epochModule && epochModule.assignEpochAndWeight) {
      try {
        const testCapsule = { lastReferenced: new Date().toISOString() };
        const result = epochModule.assignEpochAndWeight(testCapsule);
        report.modules.epochClassifier = `✓ Test classification: ${JSON.stringify(result)}`;
      } catch (e) {
        console.warn('[WARN] Epoch classification failed:', e.message);
        report.modules.epochClassifier = '✗ Failed: ' + e.message;
      }
    } else {
      report.modules.epochClassifier = '✗ Module not available';
    }

    // 4. Capsule Loading
    console.log('\n[4] Loading Capsules...');
    const capsuleLoader = safeRequire('../backend/qlib/loadCapsules', 'loadCapsules');
    if (capsuleLoader && capsuleLoader.loadCapsules) {
      try {
        const all = await capsuleLoader.loadCapsules(vaultPath);
        report.modules.capsuleCount = all.length;
        report.modules.capsuleLoader = `✓ Loaded ${all.length} capsules`;
      } catch (e) {
        console.error('[ERROR] Capsule loading failed:', e.message);
        report.modules.capsuleLoader = '✗ Failed: ' + e.message;
      }
    } else if (typeof capsuleLoader === 'function') {
      // loadCapsules might be exported directly as a function
      try {
        const all = await capsuleLoader(vaultPath);
        report.modules.capsuleCount = all.length;
        report.modules.capsuleLoader = `✓ Loaded ${all.length} capsules`;
      } catch (e) {
        console.error('[ERROR] Capsule loading failed:', e.message);
        report.modules.capsuleLoader = '✗ Failed: ' + e.message;
      }
    } else {
      report.modules.capsuleLoader = '✗ Module not available';
    }

    // 5. Verbatim Rules
    console.log('\n[5] Loading Verbatim Rules...');
    const verbatimModule = safeRequire('../backend/qlib/loadVerbatimRules', 'loadVerbatimRules');
    if (verbatimModule && verbatimModule.loadVerbatimRules) {
      try {
        const rules = verbatimModule.loadVerbatimRules();
        report.modules.verbatimRules = `✓ Loaded ${Array.isArray(rules) ? rules.length : 'unknown'} rules`;
      } catch (e) {
        console.error('[ERROR] Verbatim rule load failed:', e.message);
        report.modules.verbatimRules = '✗ Failed: ' + e.message;
      }
    } else if (typeof verbatimModule === 'function') {
      // loadVerbatimRules might be exported directly as a function
      try {
        const rules = verbatimModule();
        report.modules.verbatimRules = `✓ Loaded ${Array.isArray(rules) ? rules.length : 'unknown'} rules`;
      } catch (e) {
        console.error('[ERROR] Verbatim rule load failed:', e.message);
        report.modules.verbatimRules = '✗ Failed: ' + e.message;
      }
    } else {
      report.modules.verbatimRules = '✗ Module not available';
    }

    // 6. Check vault structure
    console.log('\n[6] Checking Vault Structure...');
    const vaultStructure = {
      exists: fs.existsSync(vaultPath),
      subdirs: {}
    };
    
    if (vaultStructure.exists) {
      const expectedDirs = ['.echo', 'capsules', 'sessions', 'verbatim'];
      for (const dir of expectedDirs) {
        const dirPath = path.join(vaultPath, dir);
        vaultStructure.subdirs[dir] = fs.existsSync(dirPath);
      }
    }
    report.modules.vaultStructure = vaultStructure;

    report.complete = true;
    report.finished = new Date().toISOString();

    // Ensure .echo directory exists
    const echoDir = path.join(vaultPath, '.echo');
    if (!fs.existsSync(echoDir)) {
      fs.mkdirSync(echoDir, { recursive: true });
    }

    // Write report to file
    const outPath = path.join(echoDir, 'memory-diagnostic-report.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    
    console.log('\n=== DIAGNOSTIC COMPLETE ===');
    console.log('✓ Report saved to:', outPath);
    console.log('\nSummary:');
    console.log('- Modules tested:', Object.keys(report.modules).length);
    console.log('- Errors encountered:', report.errors.length);
    console.log('- Diagnostic complete:', report.complete);
    
    if (report.errors.length > 0) {
      console.log('\nErrors:');
      report.errors.forEach(err => {
        console.log(`  - ${err.module}: ${err.error}`);
      });
    }

  } catch (err) {
    console.error('[FATAL]', err.message);
    report.fatalError = err.message;
    
    // Try to save partial report
    try {
      const echoDir = path.join(vaultPath, '.echo');
      if (!fs.existsSync(echoDir)) {
        fs.mkdirSync(echoDir, { recursive: true });
      }
      const outPath = path.join(echoDir, 'memory-diagnostic-report-partial.json');
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
      console.log('Partial report saved to:', outPath);
    } catch (saveErr) {
      console.error('Failed to save report:', saveErr.message);
    }
    
    process.exit(1);
  }
})();




/**
 * cap-path-primary.js
 * Unified memory diagnostic, retagger, and chaos-aware analyzer for Echo Rubicon
 *
 * ✅ Loads and verifies vault path
 * ✅ Recursively reads all capsules from .echo/capsules
 * ✅ Verifies chaos tags, type classification, and metadata
 * ✅ Summarizes top capsule types, tag usage, and timestamp ranges
 * ✅ Detects duplicates and self-polluting hallucinated capsules
 * ✅ Filters out polluted memory (e.g. "I don't have any of your...")
 * ✅ Triggers ChaosAnalyzer scoring pipeline if available
 * ✅ Offers CLI flags: --fix, --rebuild, --summarize
 * ✅ Outputs both structured console output and optional .log file
 */