// handlers/projectSidebarHandlers.js - Complete with all handlers
const { fs, path } = require('../lib/deps');
const { ConversationThreader } = require('../../tools/conversationThreader');
const tokenizer = require('../../tools/llmTokenizer');

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
// Updated list-folders handler (replace lines ~20-45 in projectSidebarHandlers.js)
'list-folders': async (event, getVaultPath) => {
  console.log('[DEBUG] list-folders called');
  try {
    const vaultPath = getVaultPath();
    if (!vaultPath) {
      console.log('[DEBUG] No vault path configured');
      return [];
    }
    
    const entries = await fs.readdir(vaultPath, { withFileTypes: true });
    
    // Get only directories, exclude system and hidden folders
    const folders = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(name => 
        !name.startsWith('.') && 
        !['node_modules', 'conversations', 'chats', '.echo', '.obsidian', '.git'].includes(name)
      )
      .sort();
    
    console.log('[IPC] Listed folders:', folders);
    return folders;
  } catch (error) {
    console.error('[IPC] Error listing folders:', error);
    return [];
  }
},

// ADD this new handler right after list-folders (around line 45)
'list-files': async (event, folderName, getVaultPath) => {
  console.log('[DEBUG] list-files called for folder:', folderName);
  try {
    const vaultPath = getVaultPath ? getVaultPath() : null;
    
    if (!vaultPath) {
      console.log('[DEBUG] No vault path configured');
      return [];
    }
    
    const folderPath = path.join(vaultPath, folderName);
    console.log('[DEBUG] Checking folder path:', folderPath);
    
    // Check if folder exists
    if (!await fs.access(folderPath).then(() => true).catch(() => false)) {
      console.log('[DEBUG] Folder does not exist:', folderPath);
      return [];
    }
    
    // Read directory with file types
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    
    // Get only .md files, not directories
    const mdFiles = entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
      .map(entry => entry.name)
      .sort();
    
    console.log(`[DEBUG] Found ${mdFiles.length} markdown files in ${folderName}:`, mdFiles);
    return mdFiles;
  } catch (error) {
    console.error('[IPC] Error listing files:', error);
    return [];
  }
},

 // Enhanced list-open-chats to check multiple locations
// Replace the 'list-open-chats' handler in projectSidebarHandlers.js (around line 47-127)
'list-open-chats': async (event, getVaultPath) => {
  console.log('[DEBUG] list-open-chats called');
  const vaultPath = getVaultPath ? getVaultPath() : null;
  
  if (!vaultPath) {
    console.log('[DEBUG] No vault path configured');
    return [];
  }
  
  console.log('[DEBUG] Vault path:', vaultPath);
  
  try {
    const openChats = [];
    const processedIds = new Set();
    
    // Check multiple possible locations for open chats
    const possiblePaths = [
      path.join(vaultPath, '.echo', 'chats', 'open'),
      path.join(vaultPath, '.echo', 'chats'),
      path.join(vaultPath, 'chats'),
      path.join(vaultPath, 'Chats')
    ];
    
    for (const chatPath of possiblePaths) {
      console.log('[DEBUG] Checking path:', chatPath);
      
      if (await fs.access(chatPath).then(() => true).catch(() => false)) {
        const files = await fs.readdir(chatPath);
        console.log(`[DEBUG] Found ${files.length} files in ${chatPath}`);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const fileId = file.replace('.json', '');
            
            // Skip if already processed
            if (processedIds.has(fileId)) continue;
            processedIds.add(fileId);
            
            try {
              const filePath = path.join(chatPath, file);
              const stats = await fs.stat(filePath);
              
              // Read and parse the JSON file
              let preview = 'Untitled chat';
              let tokenCount = 0;
              let messageCount = 0;
              let title = '';
              
              try {
                const content = await fs.readFile(filePath, 'utf-8');
                const data = JSON.parse(content);
                
                // Extract messages array
                if (data.messages && Array.isArray(data.messages)) {
                  messageCount = data.messages.length;
                  
                  // Find first user message for preview
                  const firstUserMsg = data.messages.find(m => 
                    m.role === 'user' || m.type === 'user'
                  );
                  
                  if (firstUserMsg) {
                    preview = firstUserMsg.content || firstUserMsg.text || preview;
                  } else if (data.messages[0]) {
                    // Fallback to first message
                    preview = data.messages[0].content || data.messages[0].text || preview;
                  }
                  
                  // Calculate token count (rough estimate)
                  data.messages.forEach(msg => {
                    const content = msg.content || msg.text || '';
                    tokenCount += Math.ceil(content.length / 4);
                  });
                }
                
                // Extract title from metadata or generate from preview
                title = data.metadata?.title || 
                       data.title || 
                       preview.substring(0, 50);
                
                // Use existing token count if available
                if (data.tokenCount) tokenCount = data.tokenCount;
                if (data.metadata?.tokenCount) tokenCount = data.metadata.tokenCount;
                
              } catch (parseError) {
                console.log('[DEBUG] Could not parse JSON:', file, parseError.message);
                // Keep default values
              }
              
              openChats.push({
                id: fileId,
                title: title,
                preview: preview.substring(0, 150),
                timestamp: stats.mtime,
                tokenCount: tokenCount,
                messageCount: messageCount,
                path: chatPath,
                format: 'json'
              });
              
            } catch (err) {
              console.error('[DEBUG] Error processing file:', file, err);
            }
          }
        }
      }
    }
    
    console.log(`[DEBUG] Found ${openChats.length} open chats total`);
    return openChats.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('[IPC] Error listing open chats:', error);
    return [];
  }
},

 // Handler for listing project-specific chats
 'list-project-chats': async (event, projectName, getVaultPath) => {
   console.log('[DEBUG] list-project-chats called for project:', projectName);
   const vaultPath = getVaultPath ? getVaultPath() : null;
   
   if (!vaultPath) {
     console.log('[DEBUG] No vault path configured');
     return [];
   }
   
   console.log('[DEBUG] Vault path:', vaultPath);
   
   try {
     const projectChatsPath = path.join(vaultPath, '.echo', 'projects', projectName, 'chats');
     
     // Check if directory exists
     if (!await fs.access(projectChatsPath).then(() => true).catch(() => false)) {
       console.log('[DEBUG] Project chats directory does not exist:', projectChatsPath);
       return [];
     }
     
     const files = await fs.readdir(projectChatsPath);
     const chats = [];
     
     for (const file of files) {
       if (file.endsWith('.json')) {
         try {
           const filePath = path.join(projectChatsPath, file);
           const content = await fs.readFile(filePath, 'utf-8');
           const chatData = JSON.parse(content);
           
           chats.push({
             id: file.replace('.json', ''),
             preview: chatData.messages?.[0]?.content || chatData.title || 'Untitled chat',
             timestamp: chatData.updated || chatData.created || Date.now(),
             tokenCount: chatData.tokenCount || chatData.metadata?.tokenCount || 0,
             project: projectName
           });
         } catch (err) {
           console.error('[DEBUG] Error reading chat file:', file, err);
         }
       }
     }
     
     console.log(`[DEBUG] Found ${chats.length} project chats`);
     return chats.sort((a, b) => b.timestamp - a.timestamp);
   } catch (error) {
     console.error('[IPC] Error listing project chats:', error);
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

     // Format messages for UI consumption with token counts
     const formattedMessages = conversation.messages.map((msg, idx) => ({
       id: `${conversationId}-msg-${idx}`,
       type: msg.role === 'user' ? 'user' : 'ai',
       content: msg.content,
       timestamp: msg.timestamp,
       isHistorical: true,
       capsuleId: msg.capsuleId,
       tokenCount: msg.metadata?.tokens || tokenizer.count(msg.content)
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
         tokenCount: conversation.tokenCount || tokenizer.countConversation(formattedMessages)
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

 // UPDATED: Get conversation context with proper token counting and enforcement
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

     // Validate and enforce token budget with accurate counting
     const actualTokens = tokenizer.count(context.context);
     
     if (actualTokens > tokenBudget) {
       console.warn(`[IPC] Context exceeds budget: ${actualTokens} > ${tokenBudget}`);
       // Truncate to fit budget
       context.context = tokenizer.truncateToFit(context.context, tokenBudget);
       context.tokenCount = tokenBudget;
       context.wasTruncated = true;
     } else {
       context.tokenCount = actualTokens;
       context.wasTruncated = false;
     }

     // Add token breakdown for debugging
     context.tokenBreakdown = {
       total: context.tokenCount,
       budget: tokenBudget,
       utilization: `${Math.round((context.tokenCount / tokenBudget) * 100)}%`
     };

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

 // NEW: Search with temporal references
 'search-temporal-reference': async (event, options, getVaultPath) => {
   const { query, project } = options;
   console.log('[DEBUG] search-temporal-reference called:', { query, project });
   
   try {
     const vaultPath = getVaultPath();
     if (!vaultPath) {
       return { success: false, error: 'No vault path configured' };
     }
     
     const threader = await getThreader(vaultPath);
     
     // Parse temporal indicators
     const now = new Date();
     const temporalPatterns = {
       yesterday: () => {
         const date = new Date(now);
         date.setDate(date.getDate() - 1);
         date.setHours(0, 0, 0, 0);
         const end = new Date(date);
         end.setHours(23, 59, 59, 999);
         return { start: date.getTime(), end: end.getTime() };
       },
       today: () => {
         const date = new Date(now);
         date.setHours(0, 0, 0, 0);
         return { start: date.getTime(), end: now.getTime() };
       },
       'last week': () => {
         const date = new Date(now);
         date.setDate(date.getDate() - 7);
         return { start: date.getTime(), end: now.getTime() };
       },
       'this week': () => {
         const date = new Date(now);
         const day = date.getDay();
         const diff = date.getDate() - day;
         date.setDate(diff);
         date.setHours(0, 0, 0, 0);
         return { start: date.getTime(), end: now.getTime() };
       },
       'last month': () => {
         const date = new Date(now);
         date.setMonth(date.getMonth() - 1);
         return { start: date.getTime(), end: now.getTime() };
       }
     };
     
     // Detect temporal pattern in query
     let timeRange = null;
     let searchTerms = query;
     
     for (const [pattern, getRangeFunc] of Object.entries(temporalPatterns)) {
       if (query.toLowerCase().includes(pattern)) {
         timeRange = getRangeFunc();
         searchTerms = query.toLowerCase().replace(pattern, '').trim();
         break;
       }
     }
     
     // If no temporal pattern found, fall back to regular search
     if (!timeRange) {
       const allConversations = await threader.getConversationList(project, 50);
       const queryLower = query.toLowerCase();
       const filtered = allConversations.filter(conv => 
         conv.title.toLowerCase().includes(queryLower) ||
         conv.summary?.toLowerCase().includes(queryLower)
       );
       
       return {
         success: true,
         results: filtered.slice(0, 10),
         totalFound: filtered.length,
         temporal: false
       };
     }
     
     // Search within time range
     const capsules = await threader.vaultManager.searchMemories('', {
       filter: { 
         project,
         startTime: timeRange.start,
         endTime: timeRange.end
       },
       limit: 1000
     });
     
     // Group into conversations
     const conversations = await threader.groupIntoConversations(capsules, project);
     
     // Filter by search terms if provided
     let filtered = conversations;
     if (searchTerms) {
       const termsLower = searchTerms.toLowerCase();
       filtered = conversations.filter(conv => {
         const searchContent = [
           conv.title,
           conv.summary,
           ...conv.messages.map(m => m.content)
         ].join(' ').toLowerCase();
         
         return searchContent.includes(termsLower);
       });
     }
     
     // Sort by relevance and recency
     filtered.sort((a, b) => {
       // Prioritize more recent conversations
       return b.endTime - a.endTime;
     });
     
     // Build context from top results
     const topResults = filtered.slice(0, 5);
     let contextParts = [];
     let currentTokens = 0;
     const maxTokens = 4000;
     
     for (const conv of topResults) {
       const convSummary = `## ${conv.title}\n${conv.summary}\n\nKey points:\n${
         conv.messages.slice(0, 3).map(m => 
           `${m.role}: ${m.content.substring(0, 200)}...`
         ).join('\n')
       }`;
       
       const summaryTokens = tokenizer.count(convSummary);
       if (currentTokens + summaryTokens <= maxTokens) {
         contextParts.push(convSummary);
         currentTokens += summaryTokens;
       } else {
         break;
       }
     }
     
     return {
       success: true,
       results: filtered.map(conv => ({
         id: conv.id,
         title: conv.title,
         summary: conv.summary,
         startTime: conv.startTime,
         endTime: conv.endTime,
         messageCount: conv.messages.length,
         tokenCount: conv.tokenCount
       })),
       context: contextParts.join('\n\n---\n\n'),
       tokenCount: currentTokens,
       totalFound: filtered.length,
       temporal: true,
       timeRange,
       searchTerms
     };
     
   } catch (error) {
     console.error('[IPC] Error in temporal search:', error);
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

 // Enhanced load-chat handler that handles test conversations
 'load-chat': async (event, chatIdOrParams, isProjectChat, projectName, getVaultPath) => {
   // Handle multiple parameter formats
   let chatId, project;
   
   if (typeof chatIdOrParams === 'string') {
     chatId = chatIdOrParams;
     project = projectName;
   } else if (typeof chatIdOrParams === 'object') {
     chatId = chatIdOrParams.chatId || chatIdOrParams.id;
     project = chatIdOrParams.project || chatIdOrParams.projectName;
   } else {
     chatId = chatIdOrParams;
     project = isProjectChat ? projectName : null;
   }
   
   console.log('[DEBUG] load-chat called:', { chatId, project });
   
   // Handle test conversations specially
   if (chatId && chatId.startsWith('test-')) {
     console.log('[DEBUG] Loading test conversation:', chatId);
     
     // Return mock data for test conversations
     const mockData = {
       'test-1': {
         messages: [
           {
             id: 'msg-1',
             type: 'user',
             content: 'Hi Q, what banks are used in cats cradle?',
             timestamp: Date.now() - 120000
           },
           {
             id: 'msg-2', 
             type: 'ai',
             content: 'Hi T, I\'m Q, your AI assistant in Echo Rubicon. Here is the information related to banking details within the Cats Cradle project...',
             timestamp: Date.now() - 110000
           }
         ],
         metadata: { id: chatId, isTest: true }
       },
       'test-2': {
         messages: [
           {
             id: 'msg-3',
             type: 'user',
             content: 'Help me fix the sidebar scrolling issue',
             timestamp: Date.now() - 3600000
           },
           {
             id: 'msg-4',
             type: 'ai',
             content: 'Looking at your layout.css, I see several issues with the sidebar overflow handling...',
             timestamp: Date.now() - 3590000
           }
         ],
         metadata: { id: chatId, isTest: true }
       },
       'test-3': {
         messages: [
           {
             id: 'msg-5',
             type: 'user',
             content: 'How do I implement voice recognition?',
             timestamp: Date.now() - 86400000
           },
           {
             id: 'msg-6',
             type: 'ai',
             content: 'To implement voice recognition using the Web Speech API, you\'ll need to...',
             timestamp: Date.now() - 86390000
           }
         ],
         metadata: { id: chatId, isTest: true }
       }
     };
     
     const testData = mockData[chatId] || { 
       messages: [], 
       metadata: { id: chatId, isTest: true, notFound: true } 
     };
     
     return { success: true, chat: testData };
   }
   
   // Handle real conversations
   const vaultPath = getVaultPath ? getVaultPath() : null;
   
   if (!vaultPath) {
     return { success: false, error: 'No vault path configured' };
   }
   
   console.log('[DEBUG] Vault path:', vaultPath);
   
   try {
     let chatPath;
     
     if (project) {
       chatPath = path.join(vaultPath, '.echo', 'projects', project, 'chats', `${chatId}.json`);
     } else {
       // Try multiple possible locations for open chats
       const possiblePaths = [
         path.join(vaultPath, '.echo', 'chats', 'open', `${chatId}.json`),
         path.join(vaultPath, '.echo', 'chats', `${chatId}.json`),
         path.join(vaultPath, 'Chats', `${chatId}.json`),
         path.join(vaultPath, 'Chats', `${chatId}.md`)
       ];
       
       for (const possiblePath of possiblePaths) {
         if (await fs.access(possiblePath).then(() => true).catch(() => false)) {
           chatPath = possiblePath;
           break;
         }
       }
       
       if (!chatPath) {
         console.log('[DEBUG] Chat not found in any location');
         return { success: false, error: 'Chat not found', chatId, project };
       }
     }
     
     console.log('[DEBUG] Loading chat from:', chatPath);
     
     // Read the chat file
     const content = await fs.readFile(chatPath, 'utf-8');
     
     // Handle both JSON and Markdown formats
     if (chatPath.endsWith('.json')) {
       const chatData = JSON.parse(content);
       return {
         success: true,
         chat: {
           messages: chatData.messages || [],
           metadata: {
             id: chatId,
             project: project,
             created: chatData.created,
             updated: chatData.updated,
             tokenCount: chatData.tokenCount || chatData.metadata?.tokenCount || 0
           }
         }
       };
     } else if (chatPath.endsWith('.md')) {
       // Parse markdown format
       const lines = content.split('\n');
       const messages = [];
       let currentMessage = null;
       
       for (const line of lines) {
         if (line.startsWith('## User:')) {
           if (currentMessage) messages.push(currentMessage);
           currentMessage = { type: 'user', content: '' };
         } else if (line.startsWith('## Assistant:') || line.startsWith('## Q:')) {
           if (currentMessage) messages.push(currentMessage);
           currentMessage = { type: 'ai', content: '' };
         } else if (currentMessage) {
           currentMessage.content += (currentMessage.content ? '\n' : '') + line;
         }
       }
       if (currentMessage) messages.push(currentMessage);
       
       return {
         success: true,
         chat: {
           messages,
           metadata: {
             id: chatId,
             project: project,
             format: 'markdown'
           }
         }
       };
     }
   } catch (error) {
     console.error('[IPC] Error loading chat:', error);
     return { success: false, error: error.message };
   }
 },

 // UPDATED: Save chat with accurate token counting
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

     // Use proper token counting
     const tokenCount = tokenizer.countConversation(messages);
     
     // Warn if conversation exceeds budget
     if (tokenCount > 8000) {
       console.warn(`[IPC] Conversation exceeds token budget: ${tokenCount} tokens`);
     }

     // Build detailed token metadata
     const tokenCounts = messages.map(msg => ({
       role: msg.type || msg.role,
       tokens: tokenizer.count(msg.content || ''),
       length: (msg.content || '').length
     }));

     // Save chat file with detailed metadata
     const chatFile = {
       id: chatId,
       timestamp,
       project: project || 'open',
       messages,
       metadata: {
         ...metadata,
         tokenCount,
         tokenCounts,
         averageTokensPerMessage: Math.round(tokenCount / messages.length),
         exceedsBudget: tokenCount > 8000
       }
     };

     const filePath = path.join(savePath, `${chatId}.json`);
     await fs.writeFile(filePath, JSON.stringify(chatFile, null, 2), 'utf8');

     // Create capsules for threading (with error handling)
     if (project) {
       const capsulePath = path.join(vaultPath, '.echo', 'projects', project, 'capsules');
       await fs.mkdir(capsulePath, { recursive: true });

       const capsulePromises = messages.map(async (msg, index) => {
         // Add small delay to avoid timestamp collisions
         await new Promise(resolve => setTimeout(resolve, index * 2));
         
         const msgTokens = tokenizer.count(msg.content || '');
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
             created: msg.timestamp || timestamp,
             tokens: msgTokens,
             messageIndex: index,
             conversationTokenCount: tokenCount
           }
         };

         const capsuleFile = path.join(capsulePath, `${capsule.id}.json`);
         
         try {
           await fs.writeFile(capsuleFile, JSON.stringify(capsule, null, 2), 'utf8');
           return { success: true, capsuleId: capsule.id };
         } catch (error) {
           console.error(`[IPC] Failed to create capsule: ${error.message}`);
           return { success: false, error: error.message };
         }
       });

       const capsuleResults = await Promise.all(capsulePromises);
       const failedCapsules = capsuleResults.filter(r => !r.success);
       
       if (failedCapsules.length > 0) {
         console.warn(`[IPC] ${failedCapsules.length} capsules failed to save`);
       }
     }

     // Only clear this project's threader cache, not all
     if (project) {
       const threader = threaderCache.get(vaultPath);
       if (threader && threader.clearProjectCache) {
         threader.clearProjectCache(project);
       }
     }

     console.log(`[IPC] Chat saved: ${chatId} (${tokenCount} tokens)`);
     return { 
       success: true, 
       chatId,
       path: filePath,
       tokenCount,
       stats: {
         messageCount: messages.length,
         averageTokens: Math.round(tokenCount / messages.length),
         exceedsBudget: tokenCount > 8000
       }
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