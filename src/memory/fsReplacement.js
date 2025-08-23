// src/memory/fsReplacement.js
// Redirects vault reads through QLib while preserving write operations

const vaultControl = require('./vaultAccessControl');
const realFs = require('fs').promises;
const path = require('path');

// Create a proxy that intercepts vault reads but passes through everything else
const fsProxy = {
  // READ operations - intercept for vault files
  readFile: async (filepath, encoding) => {
    if (filepath && (filepath.includes('Obsidian Vault') || filepath.endsWith('.md'))) {
      console.warn('[FS REDIRECT] Vault read intercepted:', filepath);
      return vaultControl.readVaultFile(filepath);
    }
    return realFs.readFile(filepath, encoding);
  },
  
  readdir: async (dirpath, options) => {
    // For withFileTypes requests, always use real fs (needed for sidebar)
    if (options && options.withFileTypes) {
      return realFs.readdir(dirpath, options);
    }
    
    // For vault directories, intercept
    if (dirpath && dirpath.includes('Obsidian Vault')) {
      console.warn('[FS REDIRECT] Vault listing intercepted:', dirpath);
      const files = await vaultControl.readVaultFiles(dirpath);
      
      // Handle different return types from vaultControl
      if (Array.isArray(files)) {
        // If files are objects with file property, extract the names
        if (files.length > 0 && typeof files[0] === 'object' && files[0].file) {
          return files.map(f => f.file);
        }
        // If files are already strings, return as is
        if (files.length > 0 && typeof files[0] === 'string') {
          return files;
        }
      }
      return files;
    }
    
    return realFs.readdir(dirpath, options);
  },
  
  // WRITE operations - pass through directly
  writeFile: realFs.writeFile,
  mkdir: realFs.mkdir,
  rmdir: realFs.rmdir,
  unlink: realFs.unlink,
  rename: realFs.rename,
  copyFile: realFs.copyFile,
  
  // STAT operations - pass through
  stat: realFs.stat,
  lstat: realFs.lstat,
  access: realFs.access,
  
  // Other operations - pass through
  appendFile: realFs.appendFile,
  chmod: realFs.chmod,
  chown: realFs.chown,
  link: realFs.link,
  symlink: realFs.symlink,
  readlink: realFs.readlink,
  realpath: realFs.realpath,
  truncate: realFs.truncate,
  utimes: realFs.utimes
};

module.exports = fsProxy;
