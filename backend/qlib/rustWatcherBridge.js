// After the indexing block, add:
if (vaultOk && global.analyzer) {
  // Start the Rust watcher bridge
  setTimeout(() => {
    try {
      const { startRustWatcherBridge } = require('../backend/qlib/rustWatcherBridge');
      global.rustBridge = startRustWatcherBridge(userVaultPath, global.analyzer, {
        wsUrl: 'ws://localhost:8080/vault-events',
        reconnectInterval: 5000
      });
      
      // Log bridge events
      global.rustBridge.on('connected', () => {
        console.log('[STARTUP] Rust watcher bridge connected');
      });
      
      global.rustBridge.on('analyzed', ({ filePath, result }) => {
        console.log('[STARTUP] File analyzed via bridge:', path.basename(filePath));
      });
      
    } catch (err) {
      console.error('[STARTUP] Failed to start Rust watcher bridge:', err);
    }
  }, 10000); // 10 second delay to ensure Rust backend is ready
}