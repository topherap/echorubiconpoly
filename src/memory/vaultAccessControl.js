// src/memory/vaultAccessControl.js
const path = require('path');
const fs = require('fs').promises;

// Correct import - QLibInterface is a named export
const { QLibInterface } = require('./QLibInterface');

let qlibInstance = null;

function getQLib() {
  if (!qlibInstance) {
    try {
      qlibInstance = new QLibInterface();
      console.log('[VAULT ACCESS] QLib initialized as sole vault authority');
    } catch (error) {
      console.error('[VAULT ACCESS] Failed to initialize QLibInterface:', error.message);
      return null;
    }
  }
  return qlibInstance;
}

async function readVaultFile(filepath) {
  console.log('[VAULT ACCESS] Reading file:', filepath);
  const qlib = getQLib();
  
  if (qlib && qlib.readVaultFile) {
    console.log('[VAULT ACCESS] Using QLib.readVaultFile');
    return qlib.readVaultFile(filepath);
  }
  
  // Fallback to direct read
  console.log('[VAULT ACCESS] Fallback to direct fs read');
  return fs.readFile(filepath, 'utf8');
}

async function readVaultFiles(dirpath) {
  console.log('[VAULT ACCESS] Reading directory:', dirpath);
  const qlib = getQLib();
  
  // Check if this is asking for clients
  if (dirpath && dirpath.includes('clients')) {
    console.log('[VAULT ACCESS] CLIENT DIRECTORY DETECTED!');
    
    // Read the actual files
    try {
      const files = await fs.readdir(dirpath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      console.log(`[VAULT ACCESS] Found ${mdFiles.length} client files:`, mdFiles.slice(0, 5));
      
      // Return file info for the search to process
      const results = [];
      for (const file of mdFiles) {
        const filepath = path.join(dirpath, file);
        const content = await fs.readFile(filepath, 'utf8');
        results.push({
          file: file,
          path: filepath,
          content: content,
          name: file.replace('.md', '')
        });
      }
      
      console.log(`[VAULT ACCESS] Returning ${results.length} client records`);
      return results;
    } catch (err) {
      console.error('[VAULT ACCESS] Error reading clients:', err);
      return [];
    }
  }
  
  // Check if this is asking for Foods/recipes
  if (dirpath && (dirpath.includes('Foods') || dirpath.includes('foods'))) {
    console.log('[VAULT ACCESS] FOODS DIRECTORY DETECTED!');
    
    // Read the actual recipe files
    try {
      const files = await fs.readdir(dirpath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      console.log(`[VAULT ACCESS] Found ${mdFiles.length} recipe files:`, mdFiles.slice(0, 5));
      
      // Return file info for the search to process
      const results = [];
      for (const file of mdFiles) {
        const filepath = path.join(dirpath, file);
        const content = await fs.readFile(filepath, 'utf8');
        results.push({
          file: file,
          path: filepath,
          content: content,
          name: file.replace('.md', '')
        });
      }
      
      console.log(`[VAULT ACCESS] Returning ${results.length} recipe records`);
      return results;
    } catch (err) {
      console.error('[VAULT ACCESS] Error reading recipes:', err);
      return [];
    }
  }
  
  // For non-client directories, use QLib if available
  if (qlib && qlib.readVaultFiles) {
    console.log('[VAULT ACCESS] Using QLib.readVaultFiles');
    const result = await qlib.readVaultFiles(dirpath);
    console.log(`[VAULT ACCESS] QLib returned ${result.length} files`);
    return result;
  }
  
  // Fallback
  console.log('[VAULT ACCESS] Fallback to direct fs.readdir');
  const files = await fs.readdir(dirpath);
  return files;
}

module.exports = { readVaultFile, readVaultFiles, getQLib };
