// 📁 ipc-injection-folderDispatcher.js — Dynamic Folder Fallback (Ariadne v2.1)

const path = require('path');
const fs = require('fs');
const { vaultSafeList } = require('./folderLister');
const { buildMemoryContext } = require('./contextInjector-memoryBlock-patch');

const VAULT_ROOT = 'D:/Obsidian Vault';

function findMatchingFolder(query) {
  const lower = query.toLowerCase();
  const allFolders = fs.readdirSync(VAULT_ROOT, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const match = allFolders.find(folder => lower.includes(folder.toLowerCase()));
  if (!match) {
    console.log('[IPC-FOLDER] No matching folder found in vault for query:', query);
  } else {
    console.log('[IPC-FOLDER] Matched dynamic folder:', match);
  }
  return match;
}

async function handleFolderBasedQuery(query) {
  const matched = findMatchingFolder(query);
  if (!matched) return null;

  const folderPath = path.join(VAULT_ROOT, matched);
  console.log("[DEBUG] Entering vaultSafeList with:", folderPath);

  const files = vaultSafeList(folderPath);
  if (files.length === 0) return `No files found in the \`${matched}\` folder.`;

  const capsules = files.map(({ file, content }) => {
    const filePath = path.join(folderPath, file);
    console.log("[DEBUG] Checking fs.statSync on:", filePath);
    
    return {
      timestamp: fs.statSync(filePath).mtime,
      prompt: `[From ${file}]`,
      response: content.trim().slice(0, 1200),
      meta: {
        folder: matched,
        sourceFile: file,
        summary: content.split('\\n').slice(0, 3).join(' ')
      }
    };
  });

  const memoryBlock = buildMemoryContext(capsules);
  return `🗂️ Folder: **${matched}**\\n\\n${memoryBlock}`;
}

module.exports = { handleFolderBasedQuery };