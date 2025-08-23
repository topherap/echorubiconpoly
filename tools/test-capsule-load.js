const { MemoryVaultManager } = require('../src/memory/MemoryVaultManager');

const manager = new MemoryVaultManager(); // uses default vault path

(async () => {
  const capsule = await manager.loadCapsule('capsule_1753569006360');

  if (capsule) {
    console.log('[TEST] Capsule loaded:', capsule.id, capsule.type, capsule.metadata?.folder);
    console.log('[TEST] Content preview:', (capsule.content || '').slice(0, 80));
  } else {
    console.log('[TEST] Capsule NOT found or failed to load.');
  }
})();
