// 📁 folderScopedRetriever.js — Ariadne Vault Access Rule: Folder First

const path = require('path');
const { MemoryVaultManager } = require('../../src/memory/MemoryVaultManager');

// Assumes vaultManager is already initialized and passed in
async function getCapsulesByFolder(folderName, vaultManager, { scoreFn = null } = {}) {
  await vaultManager.ensureIndex?.();

  const results = [];

  for (const [id, meta] of Object.entries(vaultManager.index?.capsules || {})) {
    const folderPath = path.dirname(meta.path || '').toLowerCase();
    const folderNameClean = folderName.toLowerCase();

    // Only include capsules from matching folder name
    if (!folderPath.includes(folderNameClean)) continue;

    const capsule = await vaultManager.loadCapsule(id);
    if (!capsule) continue;

    // Optionally score capsules
    if (typeof scoreFn === 'function') {
      capsule._score = scoreFn(capsule);
    }

    results.push(capsule);
  }

  return results.sort((a, b) => (b._score || 0) - (a._score || 0));
}

module.exports = {
  getCapsulesByFolder
};