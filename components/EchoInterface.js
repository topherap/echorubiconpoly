// EchoInterface.js - Enhanced with Obsidian vault integration
// Single source of truth with expandable project folders

(function() {
  'use strict';
  
  if (typeof React === 'undefined') {
    const checkReact = setInterval(() => {
      if (typeof React !== 'undefined') {
        clearInterval(checkReact);
        initializeEchoInterface();
      }
    }, 100);
    return;
  }
  
  initializeEchoInterface();
})();

function initializeEchoInterface() {
  const h = React.createElement;
  const { useState, useEffect, useRef, useCallback } = React;
  
  // ========== MAIN COMPONENT ==========
  function EchoInterface() {
    // ========== STATE MANAGEMENT ==========
    const [state, setState] = useState({
      // UI State
      theme: localStorage.getItem('theme') || 'white-rabbit',
      sidebarCollapsed: false,
      
      // Screen State - Responsive handling
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < 768,
        isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
        isDesktop: window.innerWidth >= 1024
      },
      
      // Chat State
      messages: [],
      currentProject: null,
      conversations: [],
      
      // Project State - NEW
      projects: [],
      expandedProjects: new Set(),
      projectFiles: {},
      selectedFile: null,
      loadingProjects: false,
      
      // Input State
      inputText: '',
      voicePrompt: '',
      isListening: false,
      isProcessing: false,
      isVoiceLoading: false,
      hotwordActive: false,
      
      // Model State
      useAPI: false,
      selectedModel: localStorage.getItem('selectedModel') || 'granite3.3:2b',
      localModels: [],
      apiModels: ['gpt-4', 'claude-3-5-sonnet-20241022'],
      
      // System State
      status: 'Connecting...',
      ollamaAvailable: false,
      memoryStats: { capsules: 0, indexed: 0 }
    });
    
    // Refs
    const chatContainerRef = useRef(null);
    const textareaRef = useRef(null);
    
    // ========== HELPER FUNCTIONS ==========
    const updateState = useCallback((updates) => {
      setState(prev => ({ ...prev, ...updates }));
    }, []);
    
    const addMessage = useCallback((content, type = 'user') => {
      const message = {
        id: Date.now() + Math.random(),
        type,
        content,
        timestamp: new Date().toISOString(),
        project: state.currentProject
      };
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, message]
      }));
      
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
      
      return message;
    }, [state.currentProject]);
    
    // ========== OBSIDIAN VAULT FUNCTIONS ==========
    const loadProjects = useCallback(async () => {
      console.log('[Obsidian] Loading vault projects...');
      updateState({ loadingProjects: true });
      
      try {
        if (window.electronAPI?.listFolders) {
          const folders = await window.electronAPI.listFolders();
          
          // Filter out system folders and conversations
          const projectFolders = folders.filter(f => 
            !f.startsWith('.') && 
            !['node_modules', 'conversations', 'chats', '.echo', '.obsidian'].includes(f)
          );
          
          console.log('[Obsidian] Found projects:', projectFolders);
          updateState({ 
            projects: projectFolders,
            loadingProjects: false 
          });
        } else {
          // Fallback test data
          updateState({ 
            projects: ['clients', 'recipes', 'medical', 'projects', 'daily-notes'],
            loadingProjects: false 
          });
        }
      } catch (error) {
        console.error('[Obsidian] Error loading projects:', error);
        updateState({ loadingProjects: false });
      }
    }, []);
    
    const loadProjectFiles = useCallback(async (projectName) => {
      console.log('[Obsidian] Loading files for project:', projectName);
      console.log('[Obsidian] Available electronAPI methods:', window.electronAPI ? Object.keys(window.electronAPI) : 'No electronAPI');
      
      try {
        // Try different possible API methods
        let files = null;
        
        // Method 1: listFiles
        if (window.electronAPI?.listFiles) {
          console.log('[Obsidian] Using listFiles method');
          files = await window.electronAPI.listFiles(projectName);
        }
        // Method 2: invoke with list-files
        else if (window.electronAPI?.invoke) {
          console.log('[Obsidian] Using invoke method with list-files');
          files = await window.electronAPI.invoke('list-files', projectName);
        }
        // Method 3: listNotes (from your obsidianInterface.js)
        else if (window.electronAPI?.listNotes) {
          console.log('[Obsidian] Using listNotes method');
          const result = await window.electronAPI.listNotes(projectName);
          files = result?.files || result;
        }
        // Method 4: readFolder
        else if (window.electronAPI?.readFolder) {
          console.log('[Obsidian] Using readFolder method');
          files = await window.electronAPI.readFolder(projectName);
        }
        
        console.log('[Obsidian] Files result:', files);
        
        if (files) {
          // Handle different response formats
          let fileList = [];
          
          if (Array.isArray(files)) {
            fileList = files;
          } else if (files.files && Array.isArray(files.files)) {
            fileList = files.files;
          } else if (files.data && Array.isArray(files.data)) {
            fileList = files.data;
          }
          
          // Filter for markdown files
          const mdFiles = fileList.filter(f => f && typeof f === 'string' && f.endsWith('.md'));
          console.log('[Obsidian] Filtered markdown files:', mdFiles);
          
          setState(prev => ({
            ...prev,
            projectFiles: {
              ...prev.projectFiles,
              [projectName]: mdFiles.length > 0 ? mdFiles : ['(No .md files found)']
            }
          }));
        } else {
          // No API method worked
          console.warn('[Obsidian] No working API method found');
          
          // Try to see what methods are available
          if (window.electronAPI) {
            console.log('[Obsidian] Available methods:', Object.keys(window.electronAPI));
          }
          
          setState(prev => ({
            ...prev,
            projectFiles: {
              ...prev.projectFiles,
              [projectName]: ['(API not available - check console)']
            }
          }));
        }
      } catch (error) {
        console.error('[Obsidian] Error loading project files:', error);
        setState(prev => ({
          ...prev,
          projectFiles: {
            ...prev.projectFiles,
            [projectName]: [`(Error: ${error.message})`]
          }
        }));
      }
    }, []);
    
    const toggleProject = useCallback(async (projectName) => {
      setState(prev => {
        const newExpanded = new Set(prev.expandedProjects);
        
        if (newExpanded.has(projectName)) {
          // Collapse
          newExpanded.delete(projectName);
        } else {
          // Expand
          newExpanded.add(projectName);
        }
        
        return {
          ...prev,
          expandedProjects: newExpanded,
          currentProject: projectName
        };
      });
      
      // Load files if expanding and not already loaded
      if (!state.expandedProjects.has(projectName) && !state.projectFiles[projectName]) {
        loadProjectFiles(projectName);
      }
    }, [state.expandedProjects, state.projectFiles, loadProjectFiles]);
    
    const openFile = useCallback(async (projectName, fileName) => {
      console.log('[Obsidian] Opening file:', projectName, fileName);
      
      const filePath = `${projectName}/${fileName}`;
      updateState({ selectedFile: filePath });
      
      try {
        if (window.electronAPI?.readNote) {
          const content = await window.electronAPI.readNote(filePath);
          
          // Store the content in state for context without displaying it
          setState(prev => ({
            ...prev,
            loadedFileContent: content,
            loadedFileName: fileName,
            currentProject: projectName
          }));
          
          // Just show a brief confirmation message
          addMessage(
            `📄 **Loaded:** ${fileName.replace('.md', '')} from ${projectName}\n\n*File loaded into context (${content.length} characters). You can now ask questions about this document.*`,
            'system'
          );
          
          // Update status to show what's loaded
          updateState({ 
            status: `Context: ${fileName.replace('.md', '')}`,
            currentProject: projectName 
          });
          
          // Update the placeholder to reflect context
          const textarea = document.querySelector('.mobile-textarea');
          if (textarea) {
            textarea.placeholder = `Ask about ${fileName.replace('.md', '')} or continue working...`;
          }
          
          // Store in conversation context for when message is sent
          window.currentFileContext = {
            project: projectName,
            file: fileName,
            content: content
          };
        }
      } catch (error) {
        console.error('[Obsidian] Error reading file:', error);
        
        if (error.message.includes('ENOENT')) {
          addMessage(`📋 **File not found:** ${fileName} in ${projectName}`, 'system');
        } else {
          addMessage(`📋 **Error loading ${fileName}:** ${error.message}`, 'system');
        }
      }
    }, [addMessage, updateState]);
    
    const loadRecentConversations = useCallback(async () => {
      console.log('[Conversations] Loading recent chats...');
      
      try {
        if (window.electronAPI?.listOpenChats) {
          const chats = await window.electronAPI.listOpenChats();
          
          if (Array.isArray(chats)) {
            // Process and format conversations
            const processed = chats.slice(0, 10).map((chat, idx) => {
              // Parse timestamps and format preview
              let preview = chat.preview || chat.title || 'Untitled';
              if (preview === '---' || !preview) {
                preview = `Chat from ${new Date(chat.timestamp).toLocaleDateString()}`;
              }
              
              return {
                id: chat.id || `chat-${idx}`,
                title: preview,
                timestamp: chat.timestamp || chat.updated || Date.now(),
                tokenCount: chat.tokenCount || 0,
                messageCount: chat.messageCount || 0
              };
            });
            
            updateState({ conversations: processed });
          }
        } else {
          // Test data
          updateState({ 
            conversations: [
              { id: 'test-1', title: 'Discussion about Echo handlers', timestamp: Date.now() - 3600000 },
              { id: 'test-2', title: 'Token management setup', timestamp: Date.now() - 7200000 }
            ]
          });
        }
      } catch (error) {
        console.error('[Conversations] Error loading:', error);
      }
    }, []);
    
    const loadConversation = useCallback(async (convId) => {
      console.log('[Conversations] Loading conversation:', convId);
      
      try {
        if (window.electronAPI?.loadChat) {
          const chatData = await window.electronAPI.loadChat(convId);
          
          if (chatData?.messages) {
            // Clear current messages and load the conversation
            setState(prev => ({
              ...prev,
              messages: chatData.messages.map(msg => ({
                id: msg.id || Date.now() + Math.random(),
                type: msg.role === 'user' ? 'user' : 'ai',
                content: msg.content,
                timestamp: msg.timestamp || new Date().toISOString()
              }))
            }));
          }
        }
      } catch (error) {
        console.error('[Conversations] Error loading chat:', error);
        addMessage(`Error loading conversation: ${error.message}`, 'system');
      }
    }, []);
    
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return mins <= 1 ? 'Just now' : `${mins}m ago`;
      }
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };
    
    // ========== INITIALIZATION ==========
    useEffect(() => {
      // Load projects on mount
      loadProjects();
      
      // Load recent conversations
      loadRecentConversations();
      
      // Check Ollama
      fetch('http://localhost:11434/api/tags')
        .then(res => res.json())
        .then(data => {
          if (data.models) {
            updateState({
              localModels: data.models.map(m => m.name),
              ollamaAvailable: true,
              status: 'Connected'
            });
          }
        })
        .catch(() => {
          updateState({
            ollamaAvailable: false,
            status: 'Ollama not running'
          });
        });
      
      // Listen for conversation updates
      const handleNewMessage = () => loadRecentConversations();
      window.addEventListener('sendMessage', handleNewMessage);
      window.addEventListener('conversationSaved', handleNewMessage);
      
      return () => {
        window.removeEventListener('sendMessage', handleNewMessage);
        window.removeEventListener('conversationSaved', handleNewMessage);
      };
    }, []);
    
    // ========== RESPONSIVE RESIZE HANDLING ==========
    useEffect(() => {
      const handleResize = () => {
        const newScreenSize = {
          width: window.innerWidth,
          height: window.innerHeight,
          isMobile: window.innerWidth < 768,
          isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
          isDesktop: window.innerWidth >= 1024
        };
        
        updateState({ 
          screenSize: newScreenSize,
          // Auto-collapse sidebar on mobile
          sidebarCollapsed: newScreenSize.isMobile ? true : state.sidebarCollapsed
        });
        
        console.log('[RESPONSIVE] Screen resized:', newScreenSize);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Initial check
      handleResize();
      
      return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    // ========== VOICE & INPUT HANDLERS ==========
    const sendMessage = useCallback(async () => {
  const messageToSend = state.voicePrompt.trim() || state.inputText.trim();
  if (!messageToSend || state.isProcessing) return;
  
  const userMessage = addMessage(messageToSend, 'user');
  updateState({ inputText: '', voicePrompt: '', isProcessing: true });
  
  try {
    if (window.electronAPI) {
      // Send in the format the handler expects
      const response = await window.electronAPI.invoke('chat:send', 
        messageToSend,  // Send the string directly as first argument
        {
          messages: state.messages,  // Full history as second argument
          model: state.useAPI ? state.apiModels[0] : state.selectedModel,
          useAPI: state.useAPI,
          project: state.currentProject,
          fileContext: window.currentFileContext  // Include loaded file context
        }
      );
      
      addMessage(response.content || 'No response', 'ai');
    }
  } catch (error) {
    console.error('Send message error:', error);
    addMessage(`Error: ${error.message}`, 'system');
  } finally {
    updateState({ isProcessing: false });
  }
}, [state.inputText, state.voicePrompt, state.isProcessing, state.useAPI, state.selectedModel, state.currentProject, state.messages]);
    
    const handleKeyPress = useCallback((e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    }, [sendMessage]);
    
    // Voice handlers (keeping your existing ones)
    const voiceClick = () => {
      if (window.echoVoiceHandlers?.handleVoiceToggle) {
        window.echoVoiceHandlers.handleVoiceToggle();
      }
    };

    const micClick = () => {
      if (window.echoVoiceHandlers?.handleMicrophoneClick) {
        window.echoVoiceHandlers.handleMicrophoneClick();
      } else {
        // Fallback browser speech recognition
        if (!state.isListening && 'webkitSpeechRecognition' in window) {
          const recognition = new webkitSpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          
          recognition.onstart = () => updateState({ isListening: true });
          recognition.onend = () => updateState({ isListening: false });
          recognition.onerror = () => updateState({ isListening: false });
          
          recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            updateState({ voicePrompt: transcript });
          };
          
          try {
            recognition.start();
          } catch (e) {
            console.error('Speech recognition failed:', e);
          }
        }
      }
    };

    const settingsClick = () => {
      if (window.SettingsPanel?.init) {
        window.SettingsPanel.init();
      }
    };

    const uploadClick = () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.txt,.md,.json,.csv,.pdf,.doc,.docx';
      fileInput.multiple = true;
      
      fileInput.onchange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target.result;
            addMessage(`📄 **File uploaded: ${file.name}**\n\n${content}`, 'system');
          };
          reader.readAsText(file);
        });
        fileInput.remove();
      };
      
      fileInput.click();
    };
    
    // ========== RENDER ==========
    return h('div', { 
      className: `myai-container ${state.theme} ${state.screenSize.isMobile ? 'mobile' : ''} ${state.screenSize.isTablet ? 'tablet' : ''} ${state.screenSize.isDesktop ? 'desktop' : ''}` 
    }, [
      
      // ===== ENHANCED SIDEBAR WITH OBSIDIAN INTEGRATION =====
      h('aside', { className: `sidebar ${state.sidebarCollapsed ? 'collapsed' : ''}` }, [
        h('div', { className: 'sidebar-content' }, [
          
          // Status indicator
          h('div', { className: 'status-indicator' }, [
            h('span', { className: `status-dot ${state.ollamaAvailable ? 'connected' : ''}` }),
            h('span', null, state.status)
          ]),
          
          // New Chat button
          h('button', {
            className: 'new-chat-button',
            onClick: () => updateState({ messages: [] }),
            style: {
              width: 'calc(100% - 20px)',
              margin: '10px',
              padding: '12px',
              background: 'var(--accent-color, #4CAF50)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }
          }, '➕ New Chat'),
          
          // PROJECTS SECTION - Expandable with files
          h('div', { className: 'projects-section' }, [
            h('div', { 
              className: 'section-header',
              style: { 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px'
              }
            }, [
              h('h3', { style: { margin: 0 } }, '📁 Vault Projects'),
              h('button', {
                onClick: loadProjects,
                style: {
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                },
                title: 'Refresh projects'
              }, '🔄')
            ]),
            
            h('div', { className: 'project-list' },
              state.loadingProjects ?
                h('div', { className: 'loading', style: { padding: '10px' } }, 'Loading projects...') :
                state.projects.map(project =>
                  h('div', { key: project, className: 'project-folder' }, [
                    // Project header - clickable to expand
                    h('div', {
                      className: `project-item ${state.currentProject === project ? 'active' : ''}`,
                      onClick: () => toggleProject(project),
                      style: {
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                      }
                    }, [
                      h('span', { 
                        className: 'expand-icon',
                        style: { 
                          transition: 'transform 0.2s',
                          transform: state.expandedProjects.has(project) ? 'rotate(90deg)' : 'rotate(0deg)'
                        }
                      }, '▶'),
                      h('span', { className: 'folder-icon' }, '📂'),
                      h('span', null, project)
                    ]),
                    
                    // Files list - shown when expanded
                    state.expandedProjects.has(project) && 
                    h('div', { 
                      className: 'project-files',
                      style: {
                        marginLeft: '36px',
                        borderLeft: '1px solid var(--border-color, #333)',
                        paddingLeft: '10px',
                        marginTop: '4px'
                      }
                    },
                      state.projectFiles[project] ?
                        state.projectFiles[project].length > 0 ?
                          state.projectFiles[project].map(file =>
                            // Check if it's an actual file or a status message
                            file.startsWith('(') ?
                              h('div', {
                                key: file,
                                style: {
                                  padding: '6px 8px',
                                  fontSize: '12px',
                                  opacity: 0.5,
                                  fontStyle: 'italic'
                                }
                              }, file) :
                              h('a', {
                                key: file,
                                className: `file-item ${state.selectedFile === `${project}/${file}` ? 'active' : ''}`,
                                href: '#',
                                onClick: (e) => {
                                  e.preventDefault();
                                  openFile(project, file);
                                },
                                style: {
                                  padding: '6px 8px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  borderRadius: '3px',
                                  transition: 'background 0.2s',
                                  textDecoration: 'none',
                                  color: 'var(--text-primary)',
                                }
                              }, [
                                h('span', { style: { opacity: 0.6 } }, '📄'),
                                h('span', null, file.replace('.md', ''))
                              ])
                          ) :
                          h('div', {
                            style: {
                              padding: '6px 8px',
                              fontSize: '12px',
                              opacity: 0.5,
                              fontStyle: 'italic'
                            }
                          }, 'No markdown files found') :
                        h('div', { 
                          className: 'loading-files',
                          style: { padding: '6px', fontSize: '12px', opacity: 0.6 }
                        }, 'Loading files...')
                    )
                  ])
                )
            )
          ]),
          
          // CONVERSATIONS SECTION - Recent chats
          h('div', { className: 'conversations-section' }, [
            h('div', { 
              className: 'section-header',
              style: { 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px'
              }
            }, [
              h('h4', { style: { margin: 0 } }, '💬 Recent Chats'),
              h('button', {
                onClick: loadRecentConversations,
                style: {
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                },
                title: 'Refresh conversations'
              }, '🔄')
            ]),
            
            h('div', { className: 'conversations-list' },
              state.conversations.length > 0 ?
                state.conversations.map((conv) =>
                  h('div', {
                    key: conv.id,
                    className: 'conversation-item',
                    onClick: () => loadConversation(conv.id),
                    style: {
                      padding: '10px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color, #333)',
                      transition: 'background 0.2s'
                    }
                  }, [
                    h('div', { 
                      className: 'conv-header',
                      style: { 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px'
                      }
                    }, [
                      h('span', { 
                        className: 'conv-time',
                        style: { fontSize: '11px', opacity: 0.6 }
                      }, formatTime(conv.timestamp)),
                      conv.tokenCount > 6000 && h('span', {
                        className: `token-badge ${conv.tokenCount > 8000 ? 'high' : ''}`,
                        style: {
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          background: conv.tokenCount > 8000 ? 'rgba(255,0,0,0.2)' : 'rgba(255,165,0,0.2)'
                        }
                      }, `${(conv.tokenCount / 1000).toFixed(1)}k`)
                    ]),
                    h('div', { 
                      className: 'conv-title',
                      style: { fontSize: '13px', lineHeight: '1.3' }
                    }, conv.title)
                  ])
                ) :
                h('div', { 
                  className: 'no-conversations',
                  style: { padding: '10px', opacity: 0.6, fontSize: '13px' }
                }, 'No recent conversations')
            )
          ])
        ])
      ]),
      
      // ===== MAIN CONTENT =====
      h('main', { className: 'main-content' }, [
        
        // Chat container
        h('div', { className: 'chat-container', ref: chatContainerRef },
          state.messages.length > 0 ?
            state.messages.map(msg =>
              h('div', {
                key: msg.id,
                className: `chat-message ${msg.type}-message`
              }, [
                h('div', { className: 'message-avatar' },
                  msg.type === 'user' ? '👤' : 
                  msg.type === 'ai' ? '🤖' : 
                  '📋'
                ),
                h('div', { className: 'message-content-wrapper' }, [
                  h('div', { className: 'message-speaker' },
                    msg.type === 'user' ? 'You' : 
                    msg.type === 'ai' ? 'Echo' : 
                    'System'
                  ),
                  h('div', { 
                    className: 'message-bubble',
                    dangerouslySetInnerHTML: { __html: formatMessage(msg.content) }
                  }),
                  msg.timestamp && h('div', { className: 'message-timestamp' },
                    new Date(msg.timestamp).toLocaleTimeString()
                  )
                ])
              ])
            ) :
            h('div', { className: 'empty-chat' }, 
              `Ready. ${state.memoryStats.capsules} memories indexed.`
            )
        ),
        
        // Mobile-style voice input section
        h('div', { className: 'mobile-input-section' }, [
          h('div', { className: 'mobile-input-container' }, [
            h('div', { className: 'input-wrapper' }, [
              
              // Left buttons
              h('div', { className: 'input-buttons-left' }, [
                h('button', {
                  onClick: uploadClick,
                  className: 'input-btn upload-btn',
                  title: 'Upload files',
                  disabled: state.isProcessing
                }, '📎'),
                
                h('button', {
                  onClick: voiceClick,
                  className: 'input-btn voice-btn',
                  title: 'Toggle voice output'
                }, '🔊')
              ]),
              
              // Textarea
              h('textarea', {
                value: state.voicePrompt,
                onChange: (e) => {
                  updateState({ voicePrompt: e.target.value });
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                },
                onKeyDown: handleKeyPress,
                placeholder: state.currentProject ? 
                  `Ask about ${state.currentProject}...` : 
                  'Ask me anything...',
                className: 'mobile-textarea',
                rows: 1
              }),
              
              // Center mic button
              h('div', { className: 'input-buttons-center' }, [
                h('button', {
                  onClick: micClick,
                  className: `input-btn mic-btn ${state.isListening ? 'listening' : ''}`,
                  title: 'Voice input',
                  disabled: state.isVoiceLoading
                }, '🎤')
              ]),
              
              // Right buttons
              h('div', { className: 'input-buttons-right' }, [
                h('button', {
                  onClick: settingsClick,
                  className: 'input-btn settings-btn',
                  title: 'Settings'
                }, '⚙️'),
                
                state.isProcessing || state.isVoiceLoading ? 
                  h('button', {
                    onClick: () => updateState({ isProcessing: false, isVoiceLoading: false }),
                    className: 'input-btn stop-btn',
                    title: 'Stop'
                  }, '⏹️') :
                  h('button', {
                    onClick: sendMessage,
                    disabled: !state.voicePrompt?.trim(),
                    className: `input-btn send-btn ${!state.voicePrompt?.trim() ? 'disabled' : ''}`,
                    title: 'Send message'
                  }, '➤')
              ])
            ])
          ])
        ])
      ])
    ]);
  }
  
  // ========== UTILITY FUNCTIONS ==========
  function formatMessage(content) {
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  }
  
  // ========== INJECT STYLES ==========
  if (!document.getElementById('echo-enhanced-styles')) {
    const style = document.createElement('style');
    style.id = 'echo-enhanced-styles';
    style.textContent = `
      /* Enhanced sidebar styles */
      .sidebar-content {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow-y: auto;
      }
      
      .new-chat-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
      }
      
      .project-item:hover,
      .file-item:hover,
      .conversation-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .project-item.active,
      .file-item.active {
        background: rgba(76, 175, 80, 0.15);
        color: var(--accent-color);
      }
      
      .expand-icon {
        display: inline-block;
        width: 12px;
      }
      
      .project-files {
        animation: slideDown 0.2s ease;
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          max-height: 0;
        }
        to {
          opacity: 1;
          max-height: 500px;
        }
      }
      
      .token-badge.high {
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 1; }
      }
      
      /* Mobile input styles remain the same */
      .mobile-input-section {
        padding: 20px;
        background: var(--bg-secondary, #2a2a2a);
        border-top: 1px solid var(--border-color, #444);
        border-radius: 30px;
        margin: 10px;
      }

      .mobile-input-container {
        position: relative;
        background: var(--bg-primary, #3a3a3a);
        border-radius: 30px;
        border: 2px solid var(--border-color, #555);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        padding: 8px 12px;
        gap: 8px;
      }

      .mobile-input-container:focus-within {
        border-color: var(--accent-color, #00ff00);
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
      }

      .input-wrapper {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 8px;
      }

      .mobile-textarea {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--text-primary, #e0e0e0);
        font-family: var(--font-mono, 'SF Mono', monospace);
        font-size: 15px;
        line-height: 1.5;
        padding: 8px 12px;
        min-height: 36px;
        max-height: 120px;
        resize: none;
        overflow-y: auto;
      }

      .mobile-textarea::placeholder {
        color: var(--text-muted, #666);
        font-style: italic;
      }

      .input-buttons {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }

      .input-buttons-left,
      .input-buttons-right,
      .input-buttons-center {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .input-btn {
        width: 40px;
        height: 40px;
        border-radius: 20px;
        border: none;
        background: transparent;
        color: var(--text-primary, #999);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        transition: all 0.2s ease;
      }

      .input-btn:hover:not(.disabled) {
        background: rgba(255, 255, 255, 0.1);
        transform: scale(1.1);
      }

      .mic-btn {
        background: rgba(0, 255, 0, 0.2);
        width: 50px;
        height: 50px;
        border: 2px solid var(--accent-color, #00ff00);
      }

      .mic-btn.listening {
        background: rgba(255, 68, 68, 0.3);
        border-color: #ff4444;
        animation: pulse-recording 1s infinite;
      }

      @keyframes pulse-recording {
        0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.4); }
        50% { box-shadow: 0 0 0 10px rgba(255, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // ========== REGISTER COMPONENT ==========
  window.EchoInterface = EchoInterface;
  
  // Auto-mount if root exists
  const root = document.getElementById('myai-root') || document.getElementById('root');
  if (root && window.React && window.ReactDOM) {
    ReactDOM.render(React.createElement(EchoInterface), root);
  }
  
  // Dispatch ready event
  window.dispatchEvent(new CustomEvent('EchoInterface-ready', {
    detail: { component: EchoInterface }
  }));
  
  console.log('[EchoInterface] Enhanced component ready with Obsidian integration');
}