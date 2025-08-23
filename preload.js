// preload.js - Secure bridge between renderer and main process
const { contextBridge, ipcRenderer } = require('electron');

// Expose only IPC communication - no direct file system access
contextBridge.exposeInMainWorld('electronAPI', {
  processConversation: (u, a, m) => ipcRenderer.invoke('memory:process-conversation', u, a, m),
  buildContext:        (u, o)    => ipcRenderer.invoke('memory:build-context', u, o),
  searchMemories:      (query)  => ipcRenderer.invoke('memory:search', query),
  searchMemory:        (query)  => ipcRenderer.invoke('memory:search', query),
  getMemoryStats:      ()       => ipcRenderer.invoke('memory:get-stats'),
  runChaosOnVault:     (opts)   => ipcRenderer.invoke('chaos:run', opts),

  // === PROJECT SIDEBAR ===
  listFolders: () => 
    ipcRenderer.invoke('list-folders'),
    
  listOpenChats: () => 
    ipcRenderer.invoke('list-open-chats'),
  
  listProjectChats: (projectName) => 
    ipcRenderer.invoke('list-project-chats', projectName),
  
  listProjectConversations: (projectName) => 
    ipcRenderer.invoke('list-project-conversations', projectName),
  
  loadConversationThread: (conversationId, projectName) => 
    ipcRenderer.invoke('load-conversation-thread', conversationId, projectName),
  
  getConversationContext: (options) => 
    ipcRenderer.invoke('get-conversation-context', options),
  
  searchProjectConversations: (project, query) => 
    ipcRenderer.invoke('search-project-conversations', project, query),
    
  createProject: (projectName) => 
    ipcRenderer.invoke('create-project', projectName),
    
  loadChat: (chatId, isProjectChat, projectName) => 
    ipcRenderer.invoke('load-chat', chatId, isProjectChat, projectName),
  
  saveChat: (chatData) => 
    ipcRenderer.invoke('save-chat', chatData),
  // In preload.js, add:
searchTemporalReference: (query, projectPath) => 
  ipcRenderer.invoke('search-temporal-reference', { query, projectPath }),

  // === ONBOARDING ===
  saveOnboardingData: (config) => 
    ipcRenderer.invoke('onboarding:save-data', config),
  
  completeOnboarding: () => 
    ipcRenderer.invoke('onboarding:complete'),
  
  checkFirstRun: () => 
    ipcRenderer.invoke('onboarding:check-first-run'),
  
  getIdentity: () => 
    ipcRenderer.invoke('onboarding:get-identity'),

  // === SECURITY & AUTHENTICATION ===
  needsOnboarding: () => 
    ipcRenderer.invoke('security:needs-onboarding'),
    
  isAuthenticated: () => 
    ipcRenderer.invoke('security:is-authenticated'),
    
  checkAuthentication: () => 
    ipcRenderer.invoke('check-authentication'),
    
  createSession: () => 
    ipcRenderer.invoke('security:create-session'),
    
  checkSession: () => 
    ipcRenderer.invoke('security:check-session'),
  
  getSecurityConfig: () => 
    ipcRenderer.invoke('security:get-config'),
  
  verifySecurityResponse: (response) => 
    ipcRenderer.invoke('security:verify-phrase', response),
    
  verifySecurityPhrase: (response) => 
    ipcRenderer.invoke('security:verify-phrase', response),
  
  getSecurityStatus: () => 
    ipcRenderer.invoke('security:get-status'),
    
  getSecurityChallenge: () => 
    ipcRenderer.invoke('security:get-challenge'),
    
  handleMaxAuthFailures: () => 
    ipcRenderer.invoke('security:handle-max-failures'),

  // === VAULT OPERATIONS ===
  selectFolder: () => 
    ipcRenderer.invoke('select-folder'),
    
  selectVault: () => 
    ipcRenderer.invoke('select-vault'),
  
  writeNote: (filename, content) => 
    ipcRenderer.invoke('write-note', { filename, content }),
  
  readNote: (filename) => 
    ipcRenderer.invoke('read-note', filename),
  
  listNotes: () => 
    ipcRenderer.invoke('list-notes'),
    
  saveNote: (filename, content) => 
    ipcRenderer.invoke('save-note', filename, content),
    
  getNote: (filename) => 
    ipcRenderer.invoke('get-note', filename),
  
  searchNotes: (query) => 
    ipcRenderer.invoke('search-notes', query),
    
  openInObsidian: (filename) => 
    ipcRenderer.invoke('open-in-obsidian', filename),

  // === MODEL MANAGEMENT ===
  getModelOptions: () => 
    ipcRenderer.invoke('get-model-options'),
    
  refreshModels: () => 
    ipcRenderer.invoke('refresh-models'),
  
  checkOllama: () => 
    ipcRenderer.invoke('check-ollama'),
    
  checkOllamaModels: () => 
    ipcRenderer.invoke('check-ollama-models'),
    
  getOllamaModels: () => 
    ipcRenderer.invoke('get-ollama-models'),
  
  pullModel: (modelName) => 
    ipcRenderer.invoke('models:pull', modelName),
    
  checkModel: (modelName) => 
    ipcRenderer.invoke('models:check', modelName),
    
  deleteModel: (modelName) => 
    ipcRenderer.invoke('models:delete', modelName),

  // === CHAT ===
  sendMessage: (message, context) => 
    ipcRenderer.invoke('chat:send', message, context),
    
  chatCompletion: ({ messages, model }) => 
    ipcRenderer.invoke('chat-completion', { messages, model }),

  // === GENERIC INVOKE FOR Q-LIB ===
  invoke: (channel, ...args) => 
    ipcRenderer.invoke(channel, ...args),

  // === Q-LIB SPECIFIC ===
  initMemoryService: () => 
    ipcRenderer.invoke('init-memory-service'),
    
  qlibExtract: (prompt) => 
    ipcRenderer.invoke('qlib-extract', prompt),

  // === SYSTEM ===
  openExternal: (url) => 
    ipcRenderer.invoke('system:open-external', url),
    
  getUserDataPath: () => 
    ipcRenderer.invoke('get-user-data-path'),
    
  getSettings: () => 
    ipcRenderer.invoke('get-settings'),
    
  saveSettings: (settings) => 
    ipcRenderer.invoke('save-settings', settings),

  // === EVENTS ===
  onModelDownloadProgress: (callback) => {
    ipcRenderer.on('models:download-progress', (event, progress) => callback(progress));
    return () => ipcRenderer.removeAllListeners('models:download-progress');
  },
  
  onVaultChange: (callback) => {
    ipcRenderer.on('vault:changed', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('vault:changed');
  },
  
  onOpenSettings: (callback) => {
    ipcRenderer.on('open-settings', () => callback());
    return () => ipcRenderer.removeAllListeners('open-settings');
  },
  
  watchVaultChanges: (callback) => {
    ipcRenderer.on('vault:file-changed', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('vault:file-changed');
  },

  // === MODEL EVENTS ===
  onModelChange: (callback) => {
    const listener = (event) => {
      ipcRenderer.send('model-changed', event.detail);
    };
    window.addEventListener('modelChanged', listener);
    return () => window.removeEventListener('modelChanged', listener);
  },

  // === WINDOW CONTROLS ===
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),

  // === FILE OPERATIONS ===
  readFile: (path) => 
    ipcRenderer.invoke('read-file', path),
    
  writeFile: (path, content) => 
    ipcRenderer.invoke('write-file', path, content),
    
  saveFile: (path, content) => 
    ipcRenderer.invoke('save-file', path, content),

  // === VAULT STATS ===
  getVaultStats: (vaultId) => 
    ipcRenderer.invoke('vault:getStats', vaultId),
    
  getVaultNotes: (vaultId) => 
    ipcRenderer.invoke('vault:getNotes', vaultId)
});

// Legacy support layer (maps old API to new)
contextBridge.exposeInMainWorld('myai', {
  vault: {
    createNote: ({ title, content, tags }) => 
      ipcRenderer.invoke('vault:create-note', { title, content, tags }),
    
    updateNote: (path, { content }) => 
      ipcRenderer.invoke('write-note', { filename: path, content }),
    
    getNotes: () => 
      ipcRenderer.invoke('list-notes'),
    
    search: (query) => 
      ipcRenderer.invoke('search-notes', query),
    
    getStats: async () => {
      const stats = await ipcRenderer.invoke('memory:get-stats');
      return {
        totalNotes: stats.totalMemories || 0,
        indexed: stats.totalMemories || 0
      };
    }
  },
  
  security: {
    needsOnboarding: () => 
      ipcRenderer.invoke('security:needs-onboarding'),
    
    isAuthenticated: () => 
      ipcRenderer.invoke('security:is-authenticated'),
    
    getChallenge: () => 
      ipcRenderer.invoke('security:get-challenge'),
    
    verifyCompletion: (response) => 
      ipcRenderer.invoke('security:verify-phrase', response)
  }
});

console.log('[Preload] Echo Rubicon bridge loaded successfully');