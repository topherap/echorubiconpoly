// qlib-diag.js
(async () => {
  try {
    console.log('[Diag] Script started');

    // Correct path
    const { QLibInterface } = require('./src/memory/QLibInterface');
    console.log('[Diag] QLib loaded');

    const vaultPath = 'D:\\Obsidian Vault';   // adjust if you moved the vault
    const qlib = new QLibInterface(vaultPath);

    await qlib.forceVaultScan();
    const idx = qlib.index || [];

    console.log('[Diag] Index size:', idx.length);
    idx.slice(0, 10).forEach(f => console.log('  -', f.path || f));
  } catch (err) {
    console.error('[Diag] FATAL:', err);
  }
})();
