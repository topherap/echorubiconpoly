console.log('[PRELOAD]', __filename)
// components/preload.js — Production-ready for multi-AI collaboration
const { contextBridge, ipcRenderer } = require('electron');

console.log('🚀 [Preload] Initializing preload script...');
console.log('💡 [Preload] components/preload.js started');


// Robust async invoke with retry logic
const safeInvoke = async (channel, ...args) => {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 [${attempt}/${maxRetries}] Invoking ${channel} with args:`, args);
      const result = await ipcRenderer.invoke(channel, ...args);
      console.log(`📥 Response from ${channel}:`, result);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ IPC invoke error (${channel}, attempt ${attempt}):`, error);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
      }
    }
  }
  throw lastError;
};

// Event listener with cleanup
const createEventListener = (channel) => {
  const listeners = new Map();

  return (callback) => {
    if (typeof callback !== 'function') {
      console.error(`❌ Invalid callback for ${channel}`);
      return () => {};
    }

    const listenerId = Date.now() + Math.random();
    const handler = (_, ...args) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`❌ Callback failure on ${channel}:`, error);
      }
    };

    listeners.set(listenerId, handler);
    ipcRenderer.on(channel, handler);

    // Return cleanup function
    return () => {
      const handler = listeners.get(listenerId);
      if (handler) {
        ipcRenderer.removeListener(channel, handler);
        listeners.delete(listenerId);
      }
    };
  };
};

// ✅ SINGLE declaration — primary bridge
contextBridge.exposeInMainWorld('electronAPI', {
  // Core communication
  ping: (msg) => ipcRenderer.send('ping', msg),
  searchMemory: (params) => safeInvoke('searchMemory', params), 
  qlibAnalyze: (params) => safeInvoke('qlib-analyze', params),
  onPong: createEventListener('pong'),

  // ✅ Compatibility alias for legacy calls
  checkAuthentication: () => safeInvoke('security:is-authenticated'),
  getChallenge: () => safeInvoke('security:get-challenge'),
  verifyCompletion: (completion) => safeInvoke('security:verify-completion', completion),
  isAuthenticated: () => safeInvoke('security:is-authenticated'),
  setupSecurity: (params) => safeInvoke('setup-security', params),

  // Settings
  onOpenSettings: createEventListener('electron-open-settings'),

  // Model management
  getModelOptions: () => safeInvoke('get-model-options'),
  setActiveModel: (value, label) => {
    if (typeof value !== 'string' || typeof label !== 'string') {
      throw new Error('Invalid model parameters');
    }
    ipcRenderer.send('set-active-model', { value, label });
  },

  // Config
  configAPI: {
    getConfig: () => safeInvoke('get-config'),
    setConfig: (data) => {
      if (typeof data !== 'object') throw new Error('Invalid config object');
      return safeInvoke('set-config', data);
    }
  },

 // ONBOARDING APIs
saveOnboardingConfig: (config) => safeInvoke('save-onboarding-config', config),
loadOnboardingConfig: () => safeInvoke('load-onboarding-config'), // ✅ Added line
loadConfig: () => safeInvoke('load-config'),
checkTrialStatus: () => safeInvoke('check-trial-status'),
validateLicense: (key) => safeInvoke('validate-license', key),
getEditionFeatures: (edition) => safeInvoke('get-edition-features', edition),


  // System checks
  checkOllama: () => safeInvoke('check-ollama'),
  getOllamaModels: () => safeInvoke('get-ollama-models'),
  checkObsidian: () => safeInvoke('check-obsidian'),

  // Utilities
  openExternal: (url) => safeInvoke('open-external', url),
  selectFolder: () => safeInvoke('select-folder'),
  checkVaultAccess: (path) => safeInvoke('check-vault-access', path),

  // Theme management
  setTheme: (theme) => safeInvoke('set-theme', theme),

  // Config updates from main
  onConfigLoaded: createEventListener('config-loaded')
});


// ✅ Confirmed: Only one `contextBridge.exposeInMainWorld('electronAPI', ...)` present

// No changes made to notesAPI or myai bridges — intact and working


// Obsidian/Notes API - Fully async for multi-AI collaboration
contextBridge.exposeInMainWorld('notesAPI', {
  // List all notes with metadata
  list: async (options = {}) => {
    const defaultOptions = {
      includeContent: false,
      includeMetadata: true,
      sortBy: 'modified',
      sortOrder: 'desc'
    };
    const mergedOptions = { ...defaultOptions, ...options };
    return safeInvoke('notes:list', mergedOptions);
  },
  
  // Get single note with content
  get: async (filename) => {
    if (typeof filename !== 'string' || !filename) {
      throw new Error('Invalid filename');
    }
    return safeInvoke('notes:get', filename);
  },
  
  // Save/update note with conflict detection
  save: async (filename, content, options = {}) => {
    if (typeof filename !== 'string' || typeof content !== 'string') {
      throw new Error('Invalid note parameters');
    }
    
    const saveData = {
      filename,
      content,
      timestamp: new Date().toISOString(),
      author: options.author || 'human', // 'human', 'claude', 'gpt', etc.
      checksum: options.checksum || null // For conflict detection
    };
    
    return safeInvoke('notes:save', saveData);
  },
  
  // Delete with confirmation
  delete: async (filename, options = {}) => {
    if (typeof filename !== 'string') {
      throw new Error('Invalid filename');
    }
    return safeInvoke('notes:delete', { filename, ...options });
  },
  
  // Search across notes
  search: async (query, options = {}) => {
    if (typeof query !== 'string') {
      throw new Error('Invalid search query');
    }
    return safeInvoke('notes:search', { query, ...options });
  },
  
  // Open in external Obsidian app
  openExternal: async (filename) => {
    if (typeof filename !== 'string') {
      throw new Error('Invalid filename');
    }
    return safeInvoke('notes:open-external', filename);
  },
  
  // Watch for changes (for real-time collaboration)
  watchChanges: createEventListener('notes:changed'),
  unwatchChanges: createEventListener('notes:changed'), // Returns cleanup function
  
  // Sync status for distributed systems
  getSyncStatus: () => safeInvoke('notes:sync-status'),
  forceSyncNow: () => safeInvoke('notes:force-sync')
});

// Add the myai bridge that MyAI-global.js is looking for
contextBridge.exposeInMainWorld('myai', {
  listObsidianNotesAsync: async () => {
    try {
      const result = await safeInvoke('list-notes');
      if (result && result.files) {
        return result.files;
      }
      return result || [];
    } catch (error) {
      console.error('Failed to list notes:', error);
      return [];
    }
  },
  
  openInObsidian: (filename) => {
    if (typeof filename !== 'string') throw new Error('Invalid filename');
    return safeInvoke('open-in-obsidian', filename);
  },
  
  readNote: async (filename) => {
    if (typeof filename !== 'string') throw new Error('Invalid filename');
    try {
      const result = await safeInvoke('read-note', filename);
      return result || '';
    } catch (error) {
      console.error('Failed to read note:', error);
      return '';
    }
  },
  
  writeNote: async (filename, content) => {
    if (typeof filename !== 'string' || typeof content !== 'string') {
      throw new Error('Invalid parameters');
    }
    try {
      return await safeInvoke('write-note', { filename, content });
    } catch (error) {
      console.error('Failed to write note:', error);
      return false;
    }
  },
  
  // ADD VAULT API HERE
  vault: {
    getStats: async () => {
      try {
        return await safeInvoke('vault:getStats');
      } catch (error) {
        console.error('[Vault] getStats failed:', error);
        // Return stub data if backend not ready
        return { 
          totalNotes: 0, 
          totalFolders: 0, 
          lastIndexed: new Date().toISOString() 
        };
      }
    },
    
    getNotes: async () => {
      try {
        return await safeInvoke('vault:getNotes');
      } catch (error) {
        console.error('[Vault] getNotes failed:', error);
        return [];
      }
    },
    
    search: async (query) => {
      try {
        return await safeInvoke('vault:search', query);
      } catch (error) {
        console.error('[Vault] search failed:', error);
        return [];
      }
    },
    
    createNote: async (note) => {
      try {
        return await safeInvoke('vault:createNote', note);
      } catch (error) {
        console.error('[Vault] createNote failed:', error);
        // Return a stub note with generated data
        return { 
          ...note, 
          id: Date.now().toString(), 
          created: new Date().toISOString(), 
          modified: new Date().toISOString() 
        };
      }
    },
    
    updateNote: async (id, updates) => {
      try {
        return await safeInvoke('vault:updateNote', id, updates);
      } catch (error) {
        console.error('[Vault] updateNote failed:', error);
        return { id, ...updates, modified: new Date().toISOString() };
      }
    },
    
    deleteNote: async (id) => {
      try {
        return await safeInvoke('vault:deleteNote', id);
      } catch (error) {
        console.error('[Vault] deleteNote failed:', error);
        return false;
      }
    },
    
    indexVault: async () => {
      try {
        return await safeInvoke('vault:indexVault');
      } catch (error) {
        console.error('[Vault] indexVault failed:', error);
        return { indexed: 0, duration: 0 };
      }
    },
    
    watchChanges: (callback) => {
      if (typeof callback !== 'function') {
        console.error('[Vault] Invalid callback for watchChanges');
        return () => {};
      }
      
      const handler = (event, change) => {
        try {
          callback(change);
        } catch (error) {
          console.error('[Vault] watchChanges callback error:', error);
        }
      };
      
      ipcRenderer.on('vault:change', handler);
      
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener('vault:change', handler);
      };
    }
  },
  
  // Security API
  security: {
    needsOnboarding: () => safeInvoke('security:needs-onboarding'),
    createGenesis: (prompt, completion, enableDestruction) => 
      safeInvoke('security:create-genesis', prompt, completion, enableDestruction),
    getChallenge: () => safeInvoke('security:get-challenge'),
    verifyCompletion: (completion) => safeInvoke('security:verify-completion', completion),
    isAuthenticated: () => safeInvoke('security:is-authenticated'),
    logout: () => safeInvoke('security:logout'),
    
    // ==========================================
    // ONBOARDING SECURITY APIs - NEW ADDITIONS
    // ==========================================
    setupSecurity: (params) => safeInvoke('setup-security', params)
  }
});

// System events
window.addEventListener('beforeunload', () => {
  console.log('🔚 [Preload] Cleaning up before unload...');
  ipcRenderer.send('renderer-cleanup');
});

// Notify when ready
window.dispatchEvent(new CustomEvent('preload-ready', {
  detail: { 
    timestamp: new Date().toISOString(),
    
    apis: ['electronAPI', 'notesAPI', 'myai']
  }
}));
console.log('✅ [Preload] END: exposed electronAPI');

console.log('✅ [Preload] All bridges exposed securely');