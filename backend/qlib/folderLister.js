// 📂 folderLister.js — Hardened Folder Scan (No Hallucination Mode)

const fs = require('fs');
const path = require('path');

function vaultSafeList(folderPath) {
  if (!fs.existsSync(folderPath)) {
    console.warn('[folderLister] Folder not found:', folderPath);
    return [];
  }

  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
  const summaries = [];

  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      summaries.push({ file, content });
    } catch (err) {
      console.warn('[folderLister] Failed to read:', fullPath, err.message);
    }
  }

  return summaries;
}

module.exports = { vaultSafeList };