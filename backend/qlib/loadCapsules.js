const fs = require('fs').promises;
const path = require('path');

async function collectJsonFilesRecursively(dir) {
  let files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await collectJsonFilesRecursively(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function loadCapsules(capsuleDir = 'D:/Obsidian Vault/.echo/capsules') {
  // Auto-detect all project folders and search them
  const allCapsules = [];
  
  // If default path, search all project folders
  if (capsuleDir === 'D:/Obsidian Vault/.echo/capsules') {
    try {
      const projectFolders = await fs.readdir(capsuleDir, { withFileTypes: true });
      
      for (const folder of projectFolders) {
        if (folder.isDirectory()) {
          const projectPath = path.join(capsuleDir, folder.name);
          const jsonFiles = await collectJsonFilesRecursively(projectPath);
          
          for (const filePath of jsonFiles) {
            try {
              const raw = await fs.readFile(filePath, 'utf-8');
              const capsule = JSON.parse(raw);
              allCapsules.push(capsule);
            } catch (err) {
              console.warn('[loadCapsules] Failed to load:', filePath, err.message);
            }
          }
        }
      }
    } catch (error) {
      console.warn('[loadCapsules] Base capsules dir not found:', error.message);
      return [];
    }
  } else {
    // Load from specific directory
    const jsonFiles = await collectJsonFilesRecursively(capsuleDir);
    
    for (const filePath of jsonFiles) {
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const capsule = JSON.parse(raw);
        allCapsules.push(capsule);
      } catch (err) {
        console.warn('[loadCapsules] Failed to load:', filePath, err.message);
      }
    }
  }

  return allCapsules;
}

module.exports = loadCapsules;
