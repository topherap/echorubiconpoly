const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { createServer, startServer } = require('./server');

const {
  modelCache,
  benchmarkCache,
  globalModelRegistry,
  modelBenchmarks,
  modelPerformanceStats
} = require('./models');

require('./ipc-handlers');

const db = require('../src/db.js');
const { getVaultPath, vaultExists } = require('../components/utils/VaultPathManager');
const IdentityManager = require('../components/utils/identityManager');
const { getQlibInstance } = require('../src/memory/QLibInterface');

// Global state
let globalVaultIndex = new Map();
let backend = null;
let indexingInProgress = false; // Mutex flag

function initializeApp() {
  app.whenReady().then(async () => {
    const userVaultPath = getVaultPath();

    // Load persisted identity FIRST
    console.log('[INIT] Loading identity from disk...');
    if (userVaultPath) {
      const identityManager = new IdentityManager(userVaultPath);
      const savedIdentity = await identityManager.loadIdentity();
      
      if (savedIdentity) {
        global.currentIdentity = savedIdentity;
        console.log('[INIT] Identity restored:', savedIdentity.ai.name, 'for user:', savedIdentity.user.name);
      } else {
        console.log('[INIT] No saved identity found - will use defaults');
      }
    }

    // Listen for model changes from renderer
    ipcMain.on('model-changed', (event, { model, type }) => {
      global.selectedModel = model;
      console.log('[APP] Model changed to:', model);
    });

    // Cache vault check result to avoid redundant calls
    const vaultOk = vaultExists(userVaultPath);
    
    // Check vault and initialize Q-lib
    if (!vaultOk) {
      console.warn('[INIT] No valid vault path found. Skipping Q-lib and indexing.');
    } else {
      try {
        const qlib = await getQlibInstance(userVaultPath); // Will auto-scan
        console.log('[INIT] Q-lib initialized with path:', userVaultPath);
      } catch (err) {
        console.error('[INIT] Q-lib startup failed:', err.message);
      }

      // Check and run vault indexing if needed
      setTimeout(async () => {
        // Prevent concurrent indexing
        if (global.indexingInProgress) {
          console.log('[INIT] Indexing already in progress, skipping...');
          return;
        }
        
        try {
          global.indexingInProgress = true;
          console.log('[INIT] Checking if vault indexing is needed...');
          
          // Direct check for index age
          const indexPath = path.join(userVaultPath, '.echo', 'chaos-index-meta.json');
          let checkResult;
          
          try {
            const stat = await fs.promises.stat(indexPath);
            const ageMs = Date.now() - new Date(stat.mtime).getTime();
            const hoursSince = ageMs / (1000 * 60 * 60);
            checkResult = {
              needed: hoursSince > 24,
              hoursSince,
              lastIndexTime: stat.mtime.getTime()
            };
          } catch {
            // No index file = needs indexing
            checkResult = { needed: true, hoursSince: Infinity, lastIndexTime: 0 };
          }
          
          if (checkResult.needed) {
            console.log('[INIT] Vault indexing needed, last run:', 
              checkResult.hoursSince === Infinity ? 'never' : `${checkResult.hoursSince.toFixed(1)} hours ago`);
            
            // Run indexing directly
            const ChaosAnalyzer = require('../backend/qlib/chaosanalyzer');
            const analyzer = new ChaosAnalyzer({
              vaultRoot: userVaultPath, 
              concurrency: 4,
              indexOnly: false,
              createCapsules: true 
            });
            
            const indexResult = await analyzer.analyzeVault();
            global.lastIndexTime = Date.now();
            
            // Safely extract results with explicit fallbacks
            const filesAnalyzed = indexResult?.filesAnalyzed ?? indexResult?.files?.length ?? 0;
            const capsulesFound = indexResult?.capsulesFound ?? indexResult?.capsules?.length ?? 0;
            
            console.log('[INIT] Vault indexed successfully:', {
              files: filesAnalyzed,
              capsules: capsulesFound,
              timestamp: new Date(global.lastIndexTime).toLocaleString()
            });
            
            // Ensure directory exists
            const echoDir = path.join(userVaultPath, '.echo');
            if (!fs.existsSync(echoDir)) {
              await fs.promises.mkdir(echoDir, { recursive: true });
            }
            
            // Write metadata for next check
            await fs.promises.writeFile(
              indexPath,
              JSON.stringify({
                lastIndexTime: global.lastIndexTime,
                filesAnalyzed,
                capsulesFound,
                errors: indexResult?.errors || []
              }, null, 2)
            );
          } else {
            console.log('[INIT] Vault indexing not needed, last run:', 
              checkResult.hoursSince.toFixed(1), 'hours ago');
          }
        } catch (err) {
          console.error('[INIT] Error during vault indexing:', err);
        } finally {
          global.indexingInProgress = false; // Always clear the flag
        }
      }, 5000); // 5 second delay to let UI load first
    }

    // Create server config
    const serverConfig = {
      userVaultPath,
      globalVaultIndex,
      modelCache,
      benchmarkCache,
      modelBenchmarks,
      modelPerformanceStats,
      globalModelRegistry,
      db
    };

    // Start backend server
    backend = createServer(serverConfig);
    startServer(backend, 49200);

    // Emit ready signal
    ipcMain.emit('app-ready');
    console.log('[INIT] Echo Rubicon backend started on port 49200');
  }); // end app.whenReady()
} // end initializeApp()

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  ipcMain.emit('activate');
});

app.on('before-quit', () => {
  console.log('[SHUTDOWN] Cleaning up Echo Rubicon...');

  try {
    if (db && typeof db.close === 'function') {
      db.close();
      console.log('[SHUTDOWN] Database connection closed');
    }
  } catch (err) {
    console.error('[SHUTDOWN] Error closing database:', err);
  }

  if (backend) {
    try {
      if (typeof backend.close === 'function') {
        backend.close();
        console.log('[SHUTDOWN] Backend server closed');
      } else {
        console.warn('[SHUTDOWN] Backend does not support .close()');
      }
    } catch (err) {
      console.error('[SHUTDOWN] Error closing backend:', err);
    }
  }

  console.log('[SHUTDOWN] Echo Rubicon shutdown complete');
}); // end app.on('before-quit')

initializeApp();

module.exports = {
  getVaultPath,
  globalVaultIndex,
  indexingInProgress
};