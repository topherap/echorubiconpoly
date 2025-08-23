// handlers/projectSidebarHandlers.js - Enhanced with conversation threading
const { fs, path } = require('../../main/lib/deps');
const { ConversationThreader } = require(path.resolve(__dirname, '../../tools/conversationThreader'));

// Shared threader instances per vault (avoid re-initialization)
const threaderCache = new Map();

async function getThreader(vaultPath) {
  if (!threaderCache.has(vaultPath)) {
    const threader = new ConversationThreader(vaultPath);
    await threader.initialize();
    threaderCache.set(vaultPath, threader);
  }
  return threaderCache.get(vaultPath);
}

// Handler implementations
const handlers = {
  // List all folders in vault (for projects)
  'list-folders': async (event, getVaultPath) => {
    console.log('[DEBUG] list-folders called');
    try {
      const vaultPath = getVaultPath();
      if (!vaultPath) {
        console.log('[DEBUG] No vault path configured');
        return [];
      }
      
      const entries = await fs.readdir(vaultPath, { withFileTypes: true });
      
      // Get only directories, exclude system folders
      const folders = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .filter(name => 
          !name.startsWith('.') && 
          !['node_modules', 'conversations', 'chats', '.echo'].includes(name)
        )
        .sort();
      
      console.log('[IPC] Listed folders:', folders);
      return folders;
    } catch (error) {
      console.error('[IPC] Error listing folders:', error);
      return [];
    }
  },

  // List open chats (non-project conversations)
  'list-open-chats': async (event, getVaultPath) => {
    console.log('[DEBUG] list-open-chats called');
    try {
      const vaultPath = getVaultPath();
      if (!vaultPath) {
        console.log('[DEBUG] No vault path configured');
        return [];
      }
      
      const openChatsPath = path.join(vaultPath, '.echo', 'chats', 'open');
      
      // Ensure directory exists
      await fs.mkdir(openChatsPath, { recursive: true });
      
      const files = await fs.readdir(openChatsPath);
      const chats = [];
      
      // Read each chat file to get preview
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(openChatsPath, file);
            const content = await fs.readFile(filePath, 'utf8');
            const chat = JSON.parse(content);
            chats.push({
              id: file.replace('.json', ''),
              timestamp: chat.timestamp || new Date(chat.created || Date.now()),
              preview: chat.messages?.[0]?.content?.substring(0, 50) || 'Untitled chat'
            });
          } catch (err) {
            console.error(`[IPC] Error reading chat ${file}:`, err);
          }
        }
      }
      
      // Sort by timestamp, newest first
      chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      console.log(`[DEBUG] Found ${chats.length} open chats`);
      return chats;
    } catch (error) {
      console.error('[IPC] Error listing open chats:', error);
      return [];
    }
  },

  // ENHANCED: List project conversations with threading
  'list-project-conversations': async (event, projectName, getVaultPath) => {
    console.log('[DEBUG] list-project-conversations called for:', projectName);
    try {
      const vaultPath = getVaultPath();
      if (!vaultPath) {
        return { success: false, error: 'No vault path configured' };
      }

      const threader = await getThreader(vaultPath);
      const conversations = await threader.getConversationList(projectName, 5);
      
      console.log(`[DEBUG] Found ${conversations.length} conversations for project:`, projectName);
      
      return {
        success: true,
        conversations,
        project: projectName
      };
    } catch (error) {
      console.error('[IPC] Error listing project conversations:', error);
      return { 
        success: false, 
        error: error.message,
        conversations: [] 
      };
    }
  },

  // NEW: Load full conversation thread
  'load-conversation-thread': async (event, conversationId, projectName, getVaultPath) => {
    console.log('[DEBUG] load-conversation-thread:', { conversationId, projectName });
    try {
      const vaultPath = getVaultPath();
      if (!vaultPath) {
        return { success: false, error: 'No vault path configured' };
      }

      const threader = await getThreader(vaultPath);
      
      // Get all capsules for the time range of this conversation
      const conversations = await threader.groupIntoConversations(
        await threader.vaultManager.searchMemories('', {
          filter: { project: projectName },
          limit: 1000
        }),
        projectName
      );
      
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (!conversation) {
        return { 
          success: false, 
          error: 'Conversation not found' 
        };
      }

      // Format messages for UI consumption
      const formattedMessages = conversation.messages.map((msg, idx) => ({
        id: `${conversationId}-msg-${idx}`,
        type: msg.role === 'user' ? 'user' : 'ai',
        content: msg.content,
        timestamp: msg.timestamp,
        isHistorical: true,
        capsuleId: msg.capsuleId
      }));

      return {
        success: true,
        conversation: {
          id: conversation.id,
          messages: formattedMessages,
          summary: conversation.summary,
          metadata: conversation.metadata,
          topics: Array.from(conversation.topics || []),
          startTime: conversation.startTime,
          endTime: conversation.endTime,
          tokenCount: conversation.tokenCount
        }
      };
    } catch (error) {
      console.error('[IPC] Error loading conversation thread:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  // NEW: Get conversation context for AI
  'get-conversation-context': async (event, options, getVaultPath) => {
    const { project, swapDate, tokenBudget = 8000, currentQuery } = options;
    console.log('[DEBUG] get-conversation-context:', { project, swapDate, tokenBudget });
    
    try {
      const vaultPath = getVaultPath();
      if (!vaultPath) {
        return { success: false, error: 'No vault path configured' };
      }

      const threader = await getThreader(vaultPath);
      const context = await threader.getProjectContext(project, {
        swapDate,
        tokenBudget,
        currentQuery,
        includeFullConversation: true
      });

      return {
        success: true,
        ...context
      };
    } catch (error) {
      console.error('[IPC] Error getting conversation context:', error);
      return { 
        success: false, 
        error: error.message,
        context: '',
        tokenCount: 0
      };
    }
  },

  // NEW: Search conversations in project
  'search-project-conversations': async (event, project, query, getVaultPath) => {
    console.log('[DEBUG] search-project-conversations:', { project, query });
    try {
      const vaultPath = getVaultPath();
      if (!vaultPath) {
        return { success: false, error: 'No vault path configured' };
      }

      const threader = await getThreader(vaultPath);
      const allConversations = await threader.getConversationList(project, 50);
      
      // Simple search through summaries and topics
      const queryLower = query.toLowerCase();
      const filtered = allConversations.filter(conv => 
        conv.title.toLowerCase().includes(queryLower) ||
        conv.summary?.toLowerCase().includes(queryLower)
      );

      return {
        success: true,
        results: filtered.slice(0, 10),
        totalFound: filtered.length
      };
    } catch (error) {
      console.error('[IPC] Error searching conversations:', error);
      return { 
        success: false, 
        error: error.message,
        results: [] 
      };
    }
  },

  // Create new project folder
  'create-project': async (event, projectName, getVaultPath) => {
    console.log('[DEBUG] create-project called for:', projectName);
    try {
      const vaultPath = getVaultPath();
      if (!vaultPath) {
        return { success: false, error: 'No vault path configured' };
      }
      
      // Sanitize project name
      const safeName = projectName.replace(/[<>:"/\\|?*]/g, '-');
      const projectPath = path.join(vaultPath, safeName);
      
      // Check if already exists
      try {
        await fs.access(projectPath);
        return { success: false, error: 'Project folder already exists' };
      } catch {
        // Good, doesn't exist
      }
      
      // Create project folder
      await fs.mkdir(projectPath, { recursive: true });
      
      // Create .echo project structure
      const echoProjectPath = path.join(vaultPath, '.echo', 'projects', safeName);
      await fs.mkdir(path.join(echoProjectPath, 'chats'), { recursive: true });
      await fs.mkdir(path.join(echoProjectPath, 'capsules'), { recursive: true });
      
      // Create a README for the project
      const readmeContent = `# ${projectName}

This is your ${projectName} project folder. All notes, chats, and content related to this topic will be organized here.

## Overview
*Add your project description here*

## Quick Links
- [[index]] - Project index
- [[notes]] - Project notes
- [[ideas]] - Ideas and brainstorming

Created: ${new Date().toISOString()}
`;
      
      await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent, 'utf8');
      
      console.log('[IPC] Created project:', safeName);
      return { success: true, path: projectPath, name: safeName };
    } catch (error) {
      console.error('[IPC] Error creating project:', error);
      return { success: false, error: error.message };
    }
  },

  // Load specific chat
  'load-chat': async (event, chatId, isProjectChat, projectName, getVaultPath) => {
    console.log('[DEBUG] load-chat called:', { chatId, isProjectChat, projectName });
    try {
      const vaultPath = getVaultPath();
      if (!vaultPath) {
        return { success: false, error: 'No vault path configured' };
      }
      
      let chatPath;
      if (isProjectChat && projectName) {
        chatPath = path.join(vaultPath, '.echo', 'projects', projectName, 'chats', `${chatId}.json`);
      } else {
        chatPath = path.join(vaultPath, '.echo', 'chats', 'open', `${chatId}.json`);
      }
      
      const content = await fs.readFile(chatPath, 'utf8');
      const chat = JSON.parse(content);
      
      return { success: true, chat };
    } catch (error) {
      console.error('[IPC] Error loading chat:', error);
      return { success: false, error: error.message };
    }
  },

  // ENHANCED: Save chat with conversation threading awareness
  'save-chat': async (event, chatData, getVaultPath) => {
    console.log('[DEBUG] save-chat called');
    try {
      const vaultPath = getVaultPath();
      if (!vaultPath) {
        return { success: false, error: 'No vault path configured' };
      }

      const { messages, project, metadata = {} } = chatData;
      const timestamp = new Date().toISOString();
      const chatId = `chat-${Date.now()}`;

      // Determine save path based on project
      let savePath;
      if (project) {
        savePath = path.join(vaultPath, '.echo', 'projects', project, 'chats');
      } else {
        savePath = path.join(vaultPath, '.echo', 'chats', 'open');
      }

      await fs.mkdir(savePath, { recursive: true });

      // Save chat file
      const chatFile = {
        id: chatId,
        timestamp,
        project: project || 'open',
        messages,
        metadata: {
          ...metadata,
          tokenCount: messages.reduce((sum, msg) => 
            sum + Math.ceil((msg.content || '').length / 4), 0
          )
        }
      };

      const filePath = path.join(savePath, `${chatId}.json`);
      await fs.writeFile(filePath, JSON.stringify(chatFile, null, 2), 'utf8');

      // Also create capsules for each message (for threading)
      if (project) {
        const capsulePath = path.join(vaultPath, '.echo', 'projects', project, 'capsules');
        await fs.mkdir(capsulePath, { recursive: true });

        for (const msg of messages) {
          const capsule = {
            id: `capsule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: msg.timestamp || timestamp,
            type: 'conversation',
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content,
            project,
            conversationId: chatId,
            metadata: {
              fileName: `${project}-conversation`,
              created: msg.timestamp || timestamp
            }
          };

          const capsuleFile = path.join(capsulePath, `${capsule.id}.json`);
          await fs.writeFile(capsuleFile, JSON.stringify(capsule, null, 2), 'utf8');
        }
      }

      // Clear threader cache to ensure fresh data
      threaderCache.delete(vaultPath);

      console.log('[IPC] Chat saved:', chatId);
      return { 
        success: true, 
        chatId,
        path: filePath 
      };
    } catch (error) {
      console.error('[IPC] Error saving chat:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
};

module.exports = handlers;