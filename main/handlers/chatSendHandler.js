
// main/handlers/chatSendHandler.js
const { buildContextForInput } = require('../../backend/qlib/contextInjector-memoryBlock-patch');
const SpineGuardian = require('../../src/echo/core/SpineGuardianWrapper'); 
// Factory function that creates the handler with dependencies
const { injectConversationContext } = require('./conversationThreaderWrapper');
const memoryTracer = require('../utils/memoryTracer');
const { QLIBGod } = require('../../src/memory/qlibGod');

// 🏛️ DIVINE HIERARCHY - Import High Priest and Canon Validator
const vaultHighPriest = require('../../src/handlers/vaultHighPriest');
const canonValidator = require('../../src/validators/canonValidator');
const { OwnershipGuardian } = require('../../src/handlers/ownershipGuardian');

// Multi-Brain Router System
const BrainRouter = require('../../src/brain/BrainRouter');
const ModelManager = require('../../src/brain/modelManager');
const brainConfig = require('../../src/brain/brainConfig.json');

// Quick Win Streaming Function
function sendResponseInChunks(message, event) {
  const chunkSize = 50; // Characters per chunk
  const chunks = [];
  
  // Split message into chunks
  for (let i = 0; i < message.length; i += chunkSize) {
    chunks.push(message.slice(i, i + chunkSize));
  }
  
  let accumulated = '';
  let chunkIndex = 0;
  
  const sendNextChunk = () => {
    if (chunkIndex < chunks.length) {
      accumulated += chunks[chunkIndex];
      
      if (event && event.reply) {
        event.reply('chat-response-stream', {
          content: accumulated,
          streaming: true,
          complete: false,
          source: 'vault-direct'
        });
      }
      
      chunkIndex++;
      setTimeout(sendNextChunk, 50); // 50ms between chunks
    } else {
      // Send final complete message
      if (event && event.reply) {
        event.reply('chat-response-stream', {
          content: accumulated,
          streaming: false,
          complete: true,
          source: 'vault-direct'
        });
      }
    }
  };
  
  sendNextChunk();
}

// Universal Guard Rails Functions
function shouldRequireContext(message) {
  // Generic patterns that suggest user is asking about specific content
  const specificContentPatterns = [
    /tell me about the/i,
    /what.*this/i,
    /explain.*this/i,
    /what do you think about (this|that)/i,
    /how.*this.*better/i,
    /relate.*to/i,
    /based on this/i,
    /what would make this/i,
    /(improve|modify|change) this/i
  ];
  
  return specificContentPatterns.some(pattern => pattern.test(message));
}

function checkForUnselectedReference(message, lastResults) {
  if (!lastResults || !Array.isArray(lastResults)) return null;
  
  // Look for any title from the last results mentioned in the message
  for (let i = 0; i < lastResults.length; i++) {
    const record = lastResults[i];
    const title = (record.title || record.filename || '').toLowerCase();
    
    // Check if message mentions this title (or key words from it)
    const titleWords = title.split(/\s+/).filter(w => w.length > 3);
    const messageWords = message.toLowerCase();
    
    // If multiple words from title appear in message, they're probably asking about it
    const matchingWords = titleWords.filter(word => messageWords.includes(word));
    
    if (matchingWords.length >= 2 || 
        (matchingWords.length === 1 && titleWords.length === 1)) {
      return {
        index: i + 1,
        title: record.title || record.filename
      };
    }
  }
  
  return null;
}

// Helper function to detect if AI response references the canonical content
function responseReferencesContent(response, canonicalText) {
  if (!canonicalText || !canonicalText.title) return false;
  
  const title = canonicalText.title.toLowerCase();
  const responseLower = response.toLowerCase();
  
  // Check if response mentions the title or key unique elements from the content
  if (responseLower.includes(title)) return true;
  
  // Look for unique phrases or terms from the canonical content
  const content = canonicalText.content || '';
  const uniqueTerms = extractUniqueTerms(content);
  
  return uniqueTerms.some(term => responseLower.includes(term.toLowerCase()));
}

function extractUniqueTerms(content) {
  // Extract specific numbers, names, or unique phrases that indicate actual content usage
  const terms = [];
  
  // Look for specific measurements, amounts, names
  const patterns = [
    /\b\d+\s*(tbsp|cup|oz|degrees|minutes|hours)\b/gi,
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+[A-Z][a-z]+)?\b/g, // Proper names
    /\$[\d,]+\.?\d*/g, // Dollar amounts
    /\b\d+(?:\.\d+)?\s*%\b/g // Percentages
  ];
  
  patterns.forEach(pattern => {
    const matches = content.match(pattern) || [];
    terms.push(...matches);
  });
  
  return terms.slice(0, 5); // Limit to avoid false positives
}



function createChatSendHandler(handlerMap, formatMessagesForModel) {
  return async function handleChatSend(event, message, context = {}) {

    // Initialize debug logging if needed
    if (process.env.ECHO_DEBUG === 'true') {
      console.log("🚨 CHECKPOINT 1: User asked:", message);
    }

    // 🛡️ UNIVERSAL GUARD RAILS - Check context requirements
    if (shouldRequireContext(message) && !global.currentCanonicalText) {
      // User asking about specific content but nothing is selected
      
      if (global.vaultContext && global.vaultContext.mode === 'browsing') {
        // They just saw a list but haven't selected anything
        return {
          content: `📋 Please select a specific record first.\n\nYou just searched for "${global.vaultContext.lastQuery}". Select a number from the list to view that record, then I can discuss it with you.`,
          source: 'system'
        };
      } else {
        // No recent search context either
        return {
          content: `📋 No document is currently selected. Please search your vault first, then select a specific record to discuss.`,
          source: 'system'
        };
      }
    }

    // Check for references to items in last search
    const unselectedRef = checkForUnselectedReference(
      message, 
      vaultHighPriest.divineContext?.lastResults
    );

    if (unselectedRef && !global.currentCanonicalText) {
      return {
        content: `📋 It looks like you're asking about "${unselectedRef.title}" (item #${unselectedRef.index} from your search).\n\nPlease type "${unselectedRef.index}" to view it first, then I can discuss its specific content with you.`,
        source: 'system'
      };
    }

    // 📂 VAULT QUERY - Direct vault access, bypasses AI
    if (vaultHighPriest.isDivineQuery(message)) {
      console.log('📂 VAULT QUERY DETECTED - Accessing vault directly');
      
      try {
        // Check if this is a follow-up selection (number, summary, details)
        if (/^\d+$|^(summary|details|file)$/i.test(message.trim())) {
          const divineResponse = await vaultHighPriest.handleDivineSelection(message);
          if (divineResponse) {
            // Send response directly to user, no AI involved
            return {
              content: divineResponse.message,
              source: divineResponse.source,
              bypassAI: true,
              establishedCanon: divineResponse.establishedCanon || false,
              hasRecords: divineResponse.hasRecords || false,
              model: 'vault-direct',
              project: 'divine'
            };
          }
        }
        
        // New divine query - seek knowledge from vault with streaming
        const divineKnowledge = await vaultHighPriest.seekDivineKnowledge(message, event);
        
        // Return directly - this is CANON from the VAULT
        return {
          content: divineKnowledge.message,
          source: divineKnowledge.source,
          bypassAI: true,
          hasRecords: divineKnowledge.hasRecords || false,
          recordCount: divineKnowledge.recordCount || 0,
          streamed: divineKnowledge.streamed || false,
          model: 'vault-direct',
          project: 'divine'
        };
        
      } catch (divineError) {
        console.error('🏛️ DIVINE ERROR:', divineError.message);
        // Fall through to normal processing on divine error
      }
    }

    // Initialize QLIBGod as vault authority
    const qlibGod = QLIBGod.getInstance();

    // Initialize Multi-Brain Router System
    const router = new BrainRouter();
    const modelManager = new ModelManager();

   // TEST BLOCKS - CORRECTED VERSION
    if (message === 'TEST PIPELINE') {
      console.log('\n🧪 RUNNING PIPELINE TEST');
      memoryTracer.startTrace('pipeline-test');
      const testQuery = "list my clients";
      
      // Test what's actually available
      memoryTracer.track('TEST_QUERY', testQuery);
      
      // Test if memory system exists
      if (global.memorySystem) {
        memoryTracer.track('MEMORY_SYSTEM', { exists: true });
        
        // Try to build context if the method exists
        if (global.memorySystem.buildContextForInput) {
          const context = await global.memorySystem.buildContextForInput(testQuery);
          memoryTracer.track('MEMORY_CONTEXT', context);
        } else {
          memoryTracer.track('MEMORY_CONTEXT', { error: 'Method not found' });
        }
      } else {
        memoryTracer.track('MEMORY_SYSTEM', { exists: false });
      }
      
      // Test handlers
      const handlers = Array.from(handlerMap.keys());
      memoryTracer.track('HANDLERS', handlers);
      
      memoryTracer.endTrace();
      return { content: "Pipeline test complete. Check console.", test: true };
    }

    if (message === 'TEST FULL PIPELINE') {
      console.log('\n🧪 RUNNING FULL PIPELINE TEST');
      const tests = ["list my clients", "show my projects", "what are my lifts?"];
      
      for (const query of tests) {
        memoryTracer.startTrace(`test-${Date.now()}`);
        memoryTracer.track('QUERY', query);
        
        // Test what we can access
        if (global.memorySystem && global.memorySystem.buildContextForInput) {
          const context = await global.memorySystem.buildContextForInput(query);
          memoryTracer.track('MEMORY', { query, found: context?.memory?.length || 0 });
        } else {
          memoryTracer.track('MEMORY', { query, error: 'System not available' });
        }
        
        memoryTracer.endTrace();
      }
      
      return { content: "Full test complete. Check console.", test: true };
    }

    if (message === 'DIAGNOSE') {
      console.log('\n🔍 DIAGNOSIS');
      
      const diagnosis = {
        handlers: Array.from(handlerMap.keys()),
        memorySystem: !!global.memorySystem,
        memoryMethods: global.memorySystem ? Object.getOwnPropertyNames(Object.getPrototypeOf(global.memorySystem)) : [],
        buildContext: !!(global.memorySystem && global.memorySystem.buildContextForInput),
        currentProject: global.currentProject || 'none'
      };
      
      console.log('DIAGNOSIS RESULTS:', diagnosis);
      
      return { 
        content: `Diagnosis:
- Handlers: ${diagnosis.handlers.length}
- Memory System: ${diagnosis.memorySystem ? 'Yes' : 'No'}
- Build Context Method: ${diagnosis.buildContext ? 'Yes' : 'No'}
- Current Project: ${diagnosis.currentProject}`,
        test: true 
      };
    }
    // FOLLOW-UP DETECTION (ENHANCED)
if (message === '1' || message === '2' || message === '3' || 
    message.toLowerCase() === 'open' || 
    message.toLowerCase() === 'summary' || 
    message.toLowerCase() === 'get a summary') {
  
  // Check if we just showed file options
  if (global.lastFileShown) {
    const timeSince = Date.now() - global.lastFileShown.timestamp;
    if (timeSince < 60000) { // Within 1 minute
      
      if (message === '2' || message.toLowerCase().includes('summary')) {
        console.log('[FOLLOW-UP] Processing summary for:', global.lastFileShown.name);
        
        // DIRECT PROCESSING - don't continue to normal flow
        const summaryMessages = [
          {
            role: 'system',
            content: `You are Q. Analyze and summarize this file for the user:

File: ${global.lastFileShown.name}
Content: ${global.lastFileShown.content}

Provide a clear, structured summary with key points and important details.`
          },
          {
            role: 'user',
            content: 'Please provide a summary of this file'
          }
        ];
        
        // Process immediately and return
        try {
          const { default: fetch } = await import('node-fetch');
          
          const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: context?.model || global.selectedModel || 'mistral:latest',
              messages: summaryMessages,
              stream: false,
              options: { temperature: 0.7, num_predict: 1000 }
            })
          });

          if (!response.ok) {
            throw new Error(`Ollama error ${response.status}`);
          }

          const data = await response.json();
          const content = data?.message?.content || 'No response from model';
          
          // === STORE LIST CONTEXTS FOR NUMBERED SELECTIONS ===
          // Store list contexts when lists are shown
          if (content && (content.includes('1.') || content.includes('1)'))) {
            global.lastListContext = content;
            global.lastQuery = message;
            console.log('[CONTEXT] Stored list context for future numbered selections');
          }
          
          // Clear stored file after successful processing
          global.lastFileShown = null;
          
          // RETURN IMMEDIATELY - don't continue processing
          return {
            content,
            model: context?.model || global.selectedModel || 'mistral:latest',
            project: currentProject || 'global',
            followUp: true
          };
          
        } catch (error) {
          console.error('[FOLLOW-UP] Processing failed:', error);
          return {
            content: `Sorry, I had trouble processing that summary. Error: ${error.message}`,
            model: context?.model || 'unknown',
            error: true
          };
        }
      }
      
      // Handle other options (1, 3) if needed
      if (message === '1' || message.toLowerCase() === 'open') {
        // Clear the stored file since user chose to open in Obsidian
        global.lastFileShown = null;
        return {
          content: "Opening in Obsidian... (This should be handled by the frontend)",
          model: 'echo-direct',
          followUp: true
        };
      }
    }
  }
}

// REMOVE OR COMMENT OUT these lines (106-111):
/*
if (showingFileOptions) {
  global.lastFileShown = {
    name: matchedFile.name,
    content: matchedFile.content,
    timestamp: Date.now()
  };
}
*/

    // ADD TRACE START
    memoryTracer.startTrace(`query-${Date.now()}`);
    memoryTracer.track('INPUT', message);

    try {
      console.log('[IPC] chat:send triggered with:', message);
      console.log('[IPC chat:send] context:', context);
      console.log('[CHAT] Incoming message:', message);
      console.log('[CHAT] Handler path:', __filename);

      // === TRACE MAP: Entry Point Analysis ===
      console.log('=================== TRACE MAP START ===================');
      console.log('[TRACE-1] INPUT RECEIVED:', {
        message: message,
        messageType: typeof message,
        isNumberOnly: /^\d+$/.test(message.toString().trim()),
        hasKeywords: {
          client: message.toLowerCase().includes('client'),
          recipe: message.toLowerCase().includes('recipe'),
          list: message.toLowerCase().includes('list'),
          show: message.toLowerCase().includes('show')
        },
        lastFileContent: !!global.lastFileContent,
        timestamp: new Date().toISOString()
      });
      console.log('[MEMORY] Will search memory:', !!global.memorySystem);

      // === GET CURRENT PROJECT CONTEXT ===
      console.log('[PROJECT DEBUG] Context object:', JSON.stringify(context, null, 2));
      console.log('[PROJECT DEBUG] Global currentProject:', global.currentProject);
      const currentProject = context.projectName || context.project || global.currentProject || null;
      console.log('[PROJECT] Current project context:', currentProject || 'global');

      // === HALLUCINATION DETECTION ===
      const hallucinationPhrases = [
        'incorrect', 'wrong', 'hallucinating', "that's not right", 
        'making things up', 'not true', 'false', 'made up',
        'where did you get that', 'not in my data', 'that\'s wrong'
      ];
      
      const userCorrectingHallucination = hallucinationPhrases.some(phrase => 
        message.toLowerCase().includes(phrase)
      );
      
      const lastResponseCapsuleId = context?.lastCapsuleId || global.lastResponseCapsuleId;
      
      console.log('[HALLUCINATION CHECK]', {
        userCorrecting: userCorrectingHallucination,
        lastCapsuleId: lastResponseCapsuleId,
        message: message.substring(0, 50)
      });

      // === IDENTITY CHECK: Ensure AI knows who it is ===
      const currentIdentity = global.currentIdentity || {
        ai: { name: 'Q', role: 'Echo Rubicon AI Assistant' },
        user: { name: 'User' }
      };
      console.log('[IDENTITY] Current AI:', currentIdentity.ai.name);

      // === INITIALIZE MEMORY SYSTEM IF NEEDED ===
      if (global.memorySystem && global.memorySystem.vaultManager) {
        console.log('[IPC] Available memorySystem methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(global.memorySystem)));
        
        if (global.memorySystem.vaultManager.initialize) {
          await global.memorySystem.vaultManager.initialize();
        }
        
        if (!global.memorySystem.vaultManager.index || global.memorySystem.vaultManager.index.size === 0) {
          console.log('[IPC] Index empty, rebuilding from disk...');
          await global.memorySystem.vaultManager.rebuildIndexFromDisk();
        }
      }

      // === ADD VAULT SEARCH HERE WITH PROJECT CONTEXT ===
const vaultKeywords = ['vault', 'recipe', 'recipes', 'client', 'clients', 'notes', 'files', 'saved', 'stored', 'remember', 'recall', 'what', 'show', 'list', 'find'];
const shouldSearchVault = vaultKeywords.some(keyword =>
  message.toLowerCase().includes(keyword)
);

let vaultSearchResults = null;
if (shouldSearchVault || message.includes('?')) {
  console.log('[VAULT] Detected potential vault query, searching...');
  const searchHandler = handlerMap.get('qlib-search');
  if (searchHandler) {
    try {
      vaultSearchResults = await searchHandler(event, {
        query: message,
        project: currentProject,
        options: { includeConversation: false }
      });
      console.log('[VAULT] Search complete:', {
        vault: vaultSearchResults?.vault?.length || 0,
        memory: vaultSearchResults?.memory?.length || 0,
        project: currentProject || 'global'
      });
      
      // === QLIBGOD ENHANCED VAULT SEARCH ===
      try {
        const enhancedResults = await qlibGod.getVaultData(message, { project: currentProject });
        if (enhancedResults?.results?.length > 0) {
          console.log('[QLIBGOD] Enhanced vault search found', enhancedResults.results.length, 'additional results');
          // Merge QLIBGod results with existing results (additive, not replacing)
          if (!vaultSearchResults) vaultSearchResults = { vault: [], memory: [] };
          if (!vaultSearchResults.memory) vaultSearchResults.memory = [];
          
          // Add QLIBGod results as memory items
          const qlibMemoryItems = enhancedResults.results.map(item => ({
            id: `qlib_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            content: item.content || item.snippet || '',
            metadata: {
              fileName: item.title || 
                       (item.relativePath ? item.relativePath.split(/[\\/]/).pop().replace('.md', '') : 'Unknown'),
              type: item.folder === 'clients' ? 'client' : 'vault',
              source: 'qlibgod'
            }
          }));
          
          // Deduplicate based on fileName to avoid duplicates like "Angela Smith" appearing twice
          const existingNames = new Set(vaultSearchResults.memory.map(item => item.metadata?.fileName?.toLowerCase()));
          const uniqueQlibItems = qlibMemoryItems.filter(item => {
            const fileName = item.metadata?.fileName?.toLowerCase();
            return fileName && !existingNames.has(fileName);
          });
          
          vaultSearchResults.memory.push(...uniqueQlibItems);
          console.log('[QLIBGOD] Added', uniqueQlibItems.length, 'unique results, total memory items:', vaultSearchResults.memory.length);
        }
      } catch (err) {
        console.log('[QLIBGOD] Enhanced search failed:', err.message);
      }
      
      // === FAST PATH FOR CLIENT LISTS ===
      const queryLower = message.toLowerCase();
      const isClientListQuery = (queryLower.includes('list') && queryLower.includes('client')) ||
                                queryLower.includes('who are my clients') ||
                                queryLower.includes('show me my clients');

      console.log('[TRACE-8] CLIENT LIST FAST-PATH CROSSROADS:', {
        queryLower: queryLower,
        isClientListQuery: isClientListQuery,
        hasVaultResults: !!vaultSearchResults?.memory?.length,
        vaultResultsCount: vaultSearchResults?.memory?.length || 0
      });

      if (isClientListQuery && vaultSearchResults?.memory?.length > 0) {
        
        // Extract names from vault results
        const clientNames = vaultSearchResults.memory.map((item, idx) => {
          let name = 'Unknown';
          
          // Try to get name from metadata
          if (item?.metadata?.fileName) {
            name = item.metadata.fileName.replace('.md', '');
          } else if (item?.name) {
            name = item.name;
          } else if (item?.path) {
            name = item.path.split(/[\\/]/).pop().replace('.md', '');
          }
          
          return `${idx + 1}. ${name}`;
        });
        
        // Return immediately without calling model
        console.log('[TRACE-9] RESPONSE-PATH-B: CLIENT LIST BYPASS:', {
          clientCount: clientNames.length,
          sampleNames: clientNames.slice(0, 3),
          willReturn: 'IMMEDIATE BYPASS',
          bypassModel: true
        });
        
        memoryTracer.endTrace();
        return {
          content: `I found ${clientNames.length} clients in your vault:\n\n${clientNames.join('\n')}`,
          model: 'echo-direct',
          bypassed: true,
          project: currentProject || 'global'
        };
      }
      // === END CLIENT FAST PATH ===

      // === PROJECT LIST FAST-PATH ===
      console.log('[FAST PATH] Checking for project list query');
      console.log('[FAST PATH] Message:', message);
      console.log('[FAST PATH] QueryLower:', queryLower);

      if (queryLower.includes('list') && queryLower.includes('project')) {
        console.log('[FAST PATH] PROJECT LIST DETECTED!');
        
        const { listProjects } = require('./projectHandlers');
        const result = await listProjects();
        
        if (result.success && result.projects && result.projects.length > 0) {
          const projectList = result.projects
            .map((p, i) => `${i+1}. ${p.name}`)
            .join('\n');
          
          memoryTracer.endTrace();
          return {
            content: `I found ${result.projects.length} projects in your vault:\n\n${projectList}\n\nYou can ask me about any of these projects specifically.`,
            model: 'echo-direct',
            bypassed: true
          };
        } else {
          memoryTracer.endTrace();
          return {
            content: `Could not list projects: ${result.error || 'Unknown error'}`,
            model: 'echo-direct',
            bypassed: true
          };
        }
      }
      // === END PROJECT LIST FAST-PATH ===

    // === PROJECT CONTENTS FAST-PATH ===
console.log('[PROJECT CONTENTS] Checking for project query');

// More flexible patterns
const projectPatterns = [
  /what(?:s|'s| is)? in (?:the )?(\w+)/i,  // "whats in medical" (no apostrophe)
  /show me (\w+)/i,                          // "show me medical"
  /^(\w+) project$/i,                        // "medical project"
  /^(\w+)$/i                                  // Just "medical" or "cats cradle"
];

let detectedProject = null;

// Check each pattern
for (const pattern of projectPatterns) {
  const match = message.match(pattern);
  if (match) {
    detectedProject = match[1].toLowerCase();
    
    // Handle multi-word projects
    if (message.toLowerCase().includes('cats cradle')) {
      detectedProject = 'cats cradle';
    }
    
    console.log('[PROJECT CONTENTS] Pattern matched, detected:', detectedProject);
    break;
  }
}

if (detectedProject) {
  const { listProjects } = require('./projectHandlers');
  const projectList = await listProjects();
  
  // Check if it's a valid project (handle spaces)
  const validProject = projectList.projects?.find(p => 
    p.name.toLowerCase() === detectedProject || 
    p.name.toLowerCase().replace(/\s+/g, '') === detectedProject.replace(/\s+/g, '')
  );
  
  if (validProject) {  // THIS NEEDS TO BE INSIDE THE detectedProject IF BLOCK
    console.log('[PROJECT CONTENTS] Valid project, reading files:', validProject.name);
    
    // Simple direct file reading
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const vaultPath = 'D:\\Obsidian Vault'; // Hardcode for simplicity
      const projectPath = path.join(vaultPath, validProject.name);
      
      const files = await fs.readdir(projectPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      if (mdFiles.length > 0) {
        const fileList = mdFiles.map((f, i) => 
          `${i + 1}. ${f.replace('.md', '')}`
        ).join('\n');
        
        memoryTracer.endTrace();
        return {
          content: `The ${validProject.name} project contains ${mdFiles.length} files:\n\n${fileList}`,
          model: 'echo-direct',
          bypassed: true
        };
      } else {
        memoryTracer.endTrace();
        return {
          content: `The ${validProject.name} project appears to be empty.`,
          model: 'echo-direct',
          bypassed: true
        };
      }
    } catch (err) {
      console.error('[PROJECT CONTENTS] Error:', err);
      memoryTracer.track('ERROR', err.message);
      memoryTracer.endTrace();
      return {
        content: `Found ${validProject.name} project but couldn't read it.`,
        model: 'echo-direct',
        bypassed: true
      };
    }
  }  // This closes validProject check
}  // This closes detectedProject check
// === END PROJECT CONTENTS FAST-PATH ===
      
    } catch (searchError) {
      console.error('[VAULT] Search failed:', searchError);
      memoryTracer.track('ERROR', searchError.message);
      memoryTracer.endTrace();
    }
  }
}

// Ensure memorySystem is initialized
if (!global.memorySystem) {
  console.error('[chat:send] ⌛ memorySystem is null or undefined');
  const err = new Error('⌛ memorySystem not initialized – buildContextForInput cannot run');
  memoryTracer.track('ERROR', err.message);
  memoryTracer.endTrace();
  throw err;
}

// === FIXED: Single memory context pull WITH PROJECT CONTEXT ===
let contextData = { memory: [], context: '', vault: [] };

      try {
        console.log('[DEBUG] Attempting memory search with available methods');
        
        // Check which methods are actually available
        if (global.memorySystem) {
          console.log('[DEBUG] Available memorySystem methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(global.memorySystem)));
        }
        
        // Method 1: Try buildContextForInput if it exists on memorySystem
        if (global.memorySystem && typeof global.memorySystem.buildContextForInput === 'function') {
          console.log('[DEBUG] Using memorySystem.buildContextForInput');
          
          if (global.memorySystem.vaultManager) {
            await global.memorySystem.vaultManager.ensureIndex();
          }
          
          contextData = await global.memorySystem.buildContextForInput(message, currentProject);
          memoryTracer.track('CONTEXT_BUILD', contextData);
          if (contextData && contextData.records) {
  global.vaultContext.records = contextData.records;
  console.log(`[CANAL] Stored ${contextData.records.length} records for selection`);
}
          
          // Debug memory retrieval if enabled
          if (process.env.ECHO_DEBUG === 'true' && contextData?.memory?.length > 0) {
            console.log("🚨 CHECKPOINT 2: Retrieved", contextData?.memory?.length, "memories");
            console.log("🚨 CHECKPOINT 2a: First memory preview:", contextData.memory[0]?.content?.substring(0, 200));
          }
          
          console.log('[DEBUG] Memory context retrieved:', {
            hasContext: !!contextData?.context,
            memoryCount: contextData?.memory?.length || 0,
            contextLength: contextData?.context?.length || 0,
            project: currentProject || 'global'
          });
        }
        // Add hallucination correction flag to context
        if (userCorrectingHallucination && lastResponseCapsuleId) {
          contextData.userCorrecting = true;
          contextData.lastCapsuleId = lastResponseCapsuleId;
          console.log('[HALLUCINATION] User correcting previous response:', lastResponseCapsuleId);
        }

        // Method 2: Use the broken import as a fallback (in case it sometimes works)
else if (typeof buildContextForInput === 'function') {
  console.log('[DEBUG] Using imported buildContextForInput');
  contextData = await buildContextForInput(message, currentProject);
  memoryTracer.track('CONTEXT_BUILD', contextData);
  
  // ADD: Store records for selection (Method 2)
  if (contextData && contextData.records) {
    global.vaultContext.records = contextData.records;
    console.log(`[CANAL] Method 2: Stored ${contextData.records.length} records for selection`);
  }
}
// Method 3: Direct vaultManager search
else if (global.memorySystem?.vaultManager?.searchMemories) {
  console.log('[DEBUG] Using vaultManager.searchMemories directly');
  const memories = await global.memorySystem.vaultManager.searchMemories(message, { 
    limit: 50,  // Increased from 10
    filter: currentProject ? { project: currentProject } : {}
  });
  
  // ADD: Store memories as records for selection (Method 3)
  if (memories && memories.length > 0) {
    global.vaultContext.records = memories;
    console.log(`[CANAL] Method 3: Stored ${memories.length} memories as records for selection`);
  }
          contextData = {
            memory: memories || [],
            context: memories?.map(m => m.summary || m.content || '').join('\n\n') || '',
            vault: [],
            project: currentProject || 'global'
          };
          console.log('[DEBUG] Direct search found:', memories?.length || 0, 'memories');
        }
        
      } catch (searchError) {
        console.error('[MEMORY] Memory search failed:', searchError.message);
        memoryTracer.track('ERROR', searchError.message);
        memoryTracer.endTrace();
        
        // Final fallback: Try search method
        try {
          if (global.memorySystem && typeof global.memorySystem.search === 'function') {
            console.log('[MEMORY] Attempting memorySystem.search fallback...');
            const searchResults = await global.memorySystem.search(message, {
              limit: 50,
              includeContent: true,
              project: currentProject
            });
            contextData = {
              memory: searchResults || [],
              context: searchResults?.map(m => m.content || m.summary || '').join('\n\n') || '',
              vault: []
            };
            console.log('[MEMORY] Search fallback found:', searchResults?.length || 0, 'results');
          }
        } catch (fallbackError) {
          console.error('[MEMORY] All search methods failed:', fallbackError);
          memoryTracer.track('ERROR', fallbackError.message);
          memoryTracer.endTrace();
        }
      }
// === SMART FILE DETECTION ===
// First, get all files from all projects
const queryLower = message.toLowerCase();
const fs = require('fs').promises;
const path = require('path');
const vaultPath = 'D:\\Obsidian Vault';
const { listProjects } = require('./projectHandlers');

// Build a map of all files
const allFiles = new Map();
const projectList = await listProjects();

for (const project of projectList.projects) {
  try {
    const projectPath = path.join(vaultPath, project.name);
    const files = await fs.readdir(projectPath);
    
    for (const file of files.filter(f => f.endsWith('.md'))) {
      const fileName = file.replace('.md', '').toLowerCase();
      allFiles.set(fileName, {
        originalName: file.replace('.md', ''),
        project: project.name,
        path: path.join(projectPath, file)
      });
    }
  } catch (err) {
    // Skip inaccessible projects
    memoryTracer.track('ERROR', err.message);
    memoryTracer.endTrace();
  }
}

// Check if the query mentions any known file
const queryWords = queryLower.split(/\s+/);
let matchedFile = null;

// Check for exact matches first
for (const [fileName, fileInfo] of allFiles) {
  if (queryLower.includes(fileName)) {
    matchedFile = fileInfo;
    console.log('[FILE DETECT] Found file reference:', fileInfo.originalName);
    break;
  }
}

// If we found a file reference, read and return it
if (matchedFile) {
  try {
    const content = await fs.readFile(matchedFile.path, 'utf8');
    
    // Store for follow-up questions
    global.lastFileContent = {
      fileName: matchedFile.originalName,
      content: content,
      project: matchedFile.project,
      path: matchedFile.path,
      timestamp: Date.now()
    };
    
    // Generate Obsidian link
    const vaultName = 'Obsidian Vault'; // or get dynamically
    const obsidianLink = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(matchedFile.project + '/' + matchedFile.originalName)}`;
    
    // Create a brief summary (first 200 chars or first paragraph)
    const firstParagraph = content.split('\n\n')[0];
    const preview = firstParagraph.length > 200 
      ? firstParagraph.substring(0, 200) + '...'
      : firstParagraph;
    
    memoryTracer.endTrace();
    return {
      content: `I found "${matchedFile.originalName}" in the ${matchedFile.project} project.

**Preview:** ${preview}

Would you like:
1. **[Open in Obsidian](${obsidianLink})** - View and edit the full file
2. **Get a summary** - I'll analyze and summarize the key points
3. **See specific info** - Ask about any particular aspect

Just let me know what you need!`,
      model: 'echo-direct',
      bypassed: true
    };
  } catch (err) {
    memoryTracer.track('ERROR', err.message);
    memoryTracer.endTrace();
    return {
      content: `Found "${matchedFile.originalName}" but couldn't read it: ${err.message}`,
      model: 'echo-direct',
      bypassed: true
    };
  }
}
// === VALIDATE CONTEXT DATA ===
if (!contextData || typeof contextData !== 'object') {
  console.warn('[MEMORY] Invalid contextData, using fallback');
  contextData = { memory: [], context: '', vault: [] };
}

// === FILE FOLLOW-UP HANDLER (ENHANCED) ===
if (global.lastFileContent && 
    (Date.now() - global.lastFileContent.timestamp < 60000)) { // Within 1 minute
  
  const queryLower = message.toLowerCase();
  console.log('[FILE FOLLOW-UP] Checking for follow-up to:', global.lastFileContent.fileName);
  
  // User wants summary (option 2)
  if (queryLower.includes('summar') || 
      queryLower === '2' || 
      queryLower.includes('analyze') ||
      queryLower.includes('break down')) {
    
    console.log('[FILE FOLLOW-UP] User wants summary');
    contextData.context = `\nFile "${global.lastFileContent.fileName}" full content:\n${global.lastFileContent.content}\n\nUser wants a SUMMARY of this content. Extract key points.\n\n` + (contextData.context || '');
  }
  
  // User wants specific info (option 3)
  else if (queryLower.includes('specific') || 
           queryLower === '3' ||
           queryLower.includes('tell me about')) {
    
    console.log('[FILE FOLLOW-UP] User wants specific info');
    contextData.context = `\nFile "${global.lastFileContent.fileName}" content:\n${global.lastFileContent.content}\n\nUser is asking: ${message}\n\n` + (contextData.context || '');
  }
  
  // General follow-up questions
  else if (queryLower.includes('that') || 
           queryLower.includes('what does') ||
           queryLower.includes('explain') ||
           queryLower.includes('mean') ||
           queryLower.includes('it')) {
    
    console.log('[FILE FOLLOW-UP] General question about file');
    contextData.context = `\nRecently shown file "${global.lastFileContent.fileName}" contains:\n${global.lastFileContent.content}\n\nUser is asking about this content: ${message}\n\n` + (contextData.context || '');
  }
  
  // More permissive context retention - keep context for follow-up questions
  else {
    const isFollowUp = 
        queryLower.includes('recipe') ||
        queryLower.includes('that') ||
        queryLower.includes('it') ||
        queryLower.includes('this') ||
        queryLower.includes('file') ||
        queryLower.includes('show') ||
        queryLower.includes('what is') ||
        queryLower.includes('tell me') ||
        queryLower.includes('more') ||
        queryLower.includes('details') ||
        (global.lastFileContent && queryLower.includes(global.lastFileContent.fileName.toLowerCase().split(' ')[0])); // partial name match

    // Only clear if definitely NOT a follow-up
    if (!isFollowUp && global.lastFileContent) {
        // Check if enough time has passed (new conversation)
        const timeSinceLastFile = Date.now() - (global.lastFileContent.timestamp || 0);
        if (timeSinceLastFile > 60000) { // Clear after 1 minute of inactivity
            console.log('[CONTEXT] Clearing old file context after timeout');
            global.lastFileContent = null;
        }
    }
    // Otherwise keep the context for follow-up questions
  }
}

// Ensure vault property exists
if (!contextData.vault) {
  contextData.vault = [];
}

// === MERGE VAULT SEARCH RESULTS INTO CONTEXT ===
      console.log('[TRACE-13] CONTEXT MERGING CROSSROADS:', {
        hasVaultSearchResults: !!vaultSearchResults,
        vaultResultsVault: vaultSearchResults?.vault?.length || 0,
        vaultResultsMemory: vaultSearchResults?.memory?.length || 0,
        existingContextMemory: contextData.memory?.length || 0,
        willMergeVault: !!(vaultSearchResults?.vault?.length > 0),
        willMergeMemory: !!(vaultSearchResults?.memory?.length > 0 && contextData.memory.length === 0)
      });

      if (vaultSearchResults) {
        if (vaultSearchResults.vault?.length > 0) {
          console.log('[VAULT] Merging', vaultSearchResults.vault.length, 'vault results');
          contextData.vault = vaultSearchResults.vault;
        }
        if (vaultSearchResults.memory?.length > 0 && contextData.memory.length === 0) {
          console.log('[VAULT] Using Q-lib memory results as fallback');
          contextData.memory = vaultSearchResults.memory;
        }
      }

      // Before sending to AI - ADD CONVERSATION THREADING
const getVaultPath = () => global.vaultPath || require('path').join(require('os').homedir(), 'Documents', 'echo-vault');
const userRequestedDate = null; // Set if user asks for specific convo
const modelConfig = { contextWindow: 8000 };

// Include conversation history from context
// Debug logging to verify conversation history
console.log('[CHAT HANDLER] Received context.messages:', context.messages?.length || 0);
console.log('[CHAT HANDLER] Last 3 messages:', context.messages?.slice(-3).map(m => ({
  role: m.role || m.type,
  preview: m.content?.substring(0, 50) + '...'
})));

// Convert message format from frontend (type) to model format (role)
const formattedHistory = context.messages?.map(msg => ({
  role: msg.type === 'ai' ? 'assistant' : msg.type === 'user' ? 'user' : msg.type,
  content: msg.content
})) || [];

let enhancedMessages = [...formattedHistory];
// 3. USER MESSAGE ALREADY ADDED BY SMART HANDLER
// Don't add another one - it's already in enhancedMessages

// === TRACE MAP: Smart Handler Decision Point ===
console.log('[TRACE-2] SMART HANDLER CROSSROADS:', {
  messageInput: message,
  trimmed: message.trim(),
  testResults: {
    'number X from list': /^number \d+( from that list)?$/i.test(message.trim()),
    'X on that list': /^\d+( on that list)?$/i.test(message.trim()),
    'just number': /^\d+$/.test(message.trim())
  },
  willActivate: /^number \d+( from that list)?$/i.test(message.trim()) || /^\d+( on that list)?$/i.test(message.trim()) || /^\d+$/.test(message.trim())
});

// Smart handler for numbered references
let processedMessage = message; // Create variable for processed message

if (/^number \d+( from that list)?$/i.test(message.trim()) || 
    /^\d+( on that list)?$/i.test(message.trim()) ||
    /^\d+$/.test(message.trim())) {
  
  const num = parseInt(message.match(/\d+/)[0]);
  console.log('[SMART HANDLER] Detected numbered reference:', num);
  
  const lastListMessage = context.messages
    ?.filter(m => m.type === 'ai' || m.role === 'assistant')
    ?.reverse()
    ?.find(m => m.content && m.content.includes(`${num}.`));
    
  if (lastListMessage) {
  // Split content into lines for more reliable extraction
  const lines = lastListMessage.content.split('\n');
  let extractedItem = null;
  
  // Search through each line for the numbered item
  for (const line of lines) {
    // Check if this line contains our number
    if (line.includes(`${num}.`) || line.includes(`${num} .`)) {
      // Try multiple patterns to extract the item name
      const patterns = [
        new RegExp(`^\\s*${num}\\.\\s+(.+)$`),  // "16. Item Name"
        new RegExp(`^${num}\\.\\s*(.+)$`),       // "16.Item Name" (no space)
        new RegExp(`${num}\\.\\s+([^\\n]+)`)     // More flexible
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          extractedItem = match[1].trim();
          break;
        }
      }
      
      if (extractedItem) break;
    }
  }
  
  // If we found the item, update the message
  if (extractedItem) {
    processedMessage = `Tell me about ${extractedItem} (item #${num} from the list)`;
    console.log('[TRACE-3A] SMART HANDLER SUCCESS PATH:', {
      originalMessage: message,
      extractedItem: extractedItem,
      processedMessage: processedMessage,
      foundInList: !!lastListMessage
    });
  } else {
    // Fallback: at least acknowledge the number reference
    processedMessage = `Tell me about item number ${num} from the client list you just showed`;
    console.log('[TRACE-3B] SMART HANDLER FALLBACK PATH:', {
      originalMessage: message,
      num: num,
      processedMessage: processedMessage,
      listFound: !!lastListMessage,
      listSample: lastListMessage?.content?.substring(0, 100) || 'none'
    });
  }
} else {
  console.log('[SMART HANDLER] No list found in conversation history');
}
} // <-- THIS CLOSES THE SMART HANDLER IF STATEMENT

// === SPECIFIC FILE FAST-PATH (MOVED AFTER SMART HANDLER) ===
console.log('[TRACE-4] FILE FAST-PATH CROSSROADS:', {
  originalMessage: message,
  processedMessage: processedMessage,
  willUseProcessed: !!processedMessage,
  messageToCheck: processedMessage || message
});

const filePatterns = [
  /what is (?:the )?(.+?)\??$/i,      // "what is the sephirot list?"
  /show me (?:the )?(.+?)$/i,         // "show me blood stuff"
  /read (?:the )?(.+?)$/i,            // "read niacin"
  /tell me about (.+?)(?:\s*\(item.*\))?$/i  // "tell me about carnivore ice cream (item #2 from the list)"
];

let requestedFile = null;
// Use the processed message from SMART HANDLER if available
const messageToCheck = processedMessage || message;

for (const pattern of filePatterns) {
  const match = messageToCheck.match(pattern);
  if (match) {
    let rawRequest = match[1].toLowerCase().trim();
    // Remove folder prefixes (e.g., "foods\carnivore ice cream" -> "carnivore ice cream")
    requestedFile = rawRequest.split('\\').pop().split('/').pop();
    console.log('[TRACE-5A] FILE FAST-PATH PATTERN MATCH:', {
      pattern: pattern.toString(),
      rawExtracted: rawRequest,
      cleanedFile: requestedFile,
      messageChecked: messageToCheck
    });
    break;
  }
}

if (requestedFile) {
  console.log('[TRACE-5B] FILE FAST-PATH ACTIVE - SEARCHING FILES:', {
    requestedFile: requestedFile,
    vaultPath: 'D:\\Obsidian Vault'
  });
  
  // Try to find and read the actual file
  const fs = require('fs').promises;
  const path = require('path');
  const vaultPath = 'D:\\Obsidian Vault';
  
  // Search all projects for this file
  const { listProjects } = require('./projectHandlers');
  const projectList = await listProjects();
  
  for (const project of projectList.projects) {
    const projectPath = path.join(vaultPath, project.name);
    try {
      const files = await fs.readdir(projectPath);
      const matchingFile = files.find(f => 
        f.toLowerCase().replace('.md', '').includes(requestedFile.replace(/[^\w\s]/g, ''))
      );
      
      if (matchingFile) {
        const filePath = path.join(projectPath, matchingFile);
        const content = await fs.readFile(filePath, 'utf8');
        
        console.log('[TRACE-6] RESPONSE-PATH-A: DIRECT FILE DUMP:', {
          foundFile: matchingFile,
          filePath: filePath,
          contentLength: content.length,
          project: project.name,
          willReturn: 'IMMEDIATE BYPASS'
        });
        
        // Store for follow-up questions
        global.lastFileContent = {
          fileName: requestedFile,
          content: content,
          timestamp: Date.now()
        };
        
        memoryTracer.endTrace();
        return {
          content: content,
          model: 'file-direct',
          bypassed: true,
          project: project.name
        };
      }
    } catch (err) {
      console.log('[FILE FAST-PATH] Error reading project:', project.name, err.message);
    }
  }
  
  console.log('[FILE FAST-PATH] File not found:', requestedFile);
}
// === END FILE FAST-PATH ===

console.log('[TRACE-10] CONTINUING TO AI MODEL PATH:', {
  enhancedMessagesCount: enhancedMessages.length,
  messageRoles: enhancedMessages.map(m => m.role),
  noBypassTriggered: 'TRUE - will continue to AI model'
});

console.log('[CHAT HANDLER] Enhanced messages count:', enhancedMessages.length);
console.log('[CHAT HANDLER] Message roles:', enhancedMessages.map(m => m.role));

// Try to inject conversation context if available
try {
  if (typeof injectConversationContext === 'function') {
    const enhanced = await injectConversationContext(enhancedMessages, currentProject, {
      vaultPath: getVaultPath(),
      swapDate: userRequestedDate,
      tokenBudget: modelConfig.contextWindow
    });
    if (enhanced && enhanced.messages) {
      enhancedMessages = enhanced.messages;
      console.log('[CONVERSATION] Injected conversation threading context');
    }
  }
} catch (threadingError) {
  console.log('[CONVERSATION] Threading not available:', threadingError.message);
  memoryTracer.track('ERROR', threadingError.message);
  memoryTracer.endTrace();
}

// === PREPARE MODEL ===
const { default: fetch } = await import('node-fetch');

let model = context?.model || context?.selectedModel || context?.selectedLocalModel;
if (!model) {
  try {
    model = await event.sender.executeJavaScript('localStorage.getItem("selectedModel")');
  } catch (e) {
    console.log('[MODEL] Could not read from localStorage:', e);
    memoryTracer.track('ERROR', e.message);
    memoryTracer.endTrace();
  }
}
      // Use global selected model if no model specified
      if (!model) {
        model = global.selectedModel || 'mistral:latest';
      }
      console.log('[MODEL] Context:', context);
      console.log('[MODEL] Selected model:', model);
      console.log('[MODEL] Final model:', model);

      const useAPI = model === 'gpt' || model === 'claude';

      // Check for prime directive request
      if (message.toLowerCase().includes('prime directive') && message.toLowerCase().includes('verbatim')) {
        // Load and return the actual prime directive
        try {
          const fs = require('fs');
          const path = require('path');
          const directivePath = path.join(__dirname, '../../src/echo/memory/spine/primeDirective.txt');
          const fullDirective = fs.readFileSync(directivePath, 'utf8');
          
          memoryTracer.endTrace();
          return {
            content: `Here is my complete Prime Directive, verbatim:\n\n${fullDirective}`,
            model,
            project: currentProject || 'global'
          };
        } catch (err) {
          console.error('[PRIME DIRECTIVE] Could not read directive file:', err);
          memoryTracer.track('ERROR', err.message);
          memoryTracer.endTrace();
        }
      }

      // === BUILD ENHANCED MESSAGES WITH PROPER IDENTITY AND MEMORY ===
      // Reset enhancedMessages if it wasn't populated by conversation threading
      if (enhancedMessages.length === 0) {
        enhancedMessages = [];
      }

      // CREATE SPINE GUARDIAN
      const spine = new SpineGuardian(currentIdentity.ai.name || 'Q');

     
      // 1. SYSTEM MESSAGE WITH IDENTITY, PROJECT CONTEXT, AND CORE INSTRUCTIONS
const baseSystemContent = `MANDATORY PROTOCOL:  
1. For "my" queries, CHECK BACKGROUND CONTEXT FIRST  
2. You ALWAYS have vault access—data is IN THIS PROMPT  
3. NEVER say "I don't have access" or "I can't store data"  
4. BACKGROUND CONTEXT IS your database  

You are ${currentIdentity.ai.name || 'Q'}, not "Echo Rubicon." You are the AI assistant in Echo Rubicon with FULL VAULT ACCESS.  

RESPONSE RULES:  
- For "my/list" queries, CHECK BACKGROUND CONTEXT first  
- If data exists, USE IT; if not, say "I don't see any [thing] in your vault"  
- NEVER say "I can't access"  

IDENTITY:  
- Name: ${currentIdentity.ai.name || 'Q'}  
- FULL ACCESS to user's Obsidian vault (data in BACKGROUND CONTEXT)  
- If asked "who are you?", respond: "I am ${currentIdentity.ai.name || 'Q'}, your AI assistant in Echo Rubicon"  

CONTEXT HANDLING:  
For references ("that list", "#3", etc.):  
1. CHECK CONVERSATION HISTORY  
2. "Number X" = item #X from last list  
3. NEVER ask "what list?" if just provided  
4. NEVER act confused about prior context  

EXAMPLES:  
- After listing clients, "3" = client #3  
- After recipes, "tell me about 2" = recipe #2  

Role: ${currentIdentity.ai.role || 'Help the user and remember all conversations'}  
User: ${currentIdentity.user.name || 'User'}  
${currentProject ? `Project: ${currentProject}` : 'Context: Global'}  

ACCURACY:  
- Provide complete, accurate info  
- If too long, note: "More in source file"  
- Include exact counts  

CRITICAL RULES:  
1. CHECK BACKGROUND CONTEXT for "my" queries  
2. CHECK HISTORY for references  
3. You are ${currentIdentity.ai.name || 'Q'}  
4. NEVER fabricate data  
5. For PERSONAL requests ("my", "list"):  
   - CHECK BACKGROUND CONTEXT IMMEDIATELY  
   - Share ALL found content  
   - If none, say "I don't have any of your [thing]"  
   - NEVER claim inability to access  
6. For GENERAL requests:  
   - Use knowledge, offer help, clarify speculation vs. fact  

REMEMBER: Check BACKGROUND CONTEXT before claiming no access. Check HISTORY before asking for clarification.`;  
console.log('[SYSTEM PROMPT] Length:', baseSystemContent.length);
console.log('[SYSTEM PROMPT] Contains CONTEXT HANDLING?', baseSystemContent.includes('CONTEXT HANDLING'));

// === Name & Project Helpers (surgical fix for 'Unknown' & project labeling) ===
function normalizeName(s) {
  return String(s)
    .replace(/\.md$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/^[\s#*>\-•\t]+/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\"']+|[\s\"']+$/g, '')
    .trim();
}

function firstHeader(content) {
  if (typeof content !== 'string') return '';
  const h1 = content.match(/^\s*#\s+(.+)$/m);
  if (h1?.[1]) return normalizeName(h1[1]);
  const kv = content.match(/^\s*(?:name|title)\s*[:=]\s*(.+)$/im);
  if (kv?.[1]) return normalizeName(kv[1]);
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const plausible = lines.find(l => /^[A-Za-z ,.'’\-]{3,}$/.test(l) && l.split(/\s+/).length <= 6);
  return plausible ? normalizeName(plausible) : '';
}

function getDisplayName(m) {
  const byFile = m?.metadata?.fileName || m?.name || m?.title || '';
  if (byFile) return normalizeName(byFile);
  const fromContent = firstHeader(m?.content || '');
  if (fromContent) return fromContent;
  if (m?.path) {
    const tail = String(m.path).split(/[\\/]/).pop();
    if (tail) return normalizeName(tail);
  }
  return 'Unknown';
}

function inferProjectLabel(m, inferredProject) {
  if (m?.project) return String(m.project);
  if (m?.metadata?.project) return String(m.metadata.project);
  if (inferredProject) return String(inferredProject);
  if (m?.path && /[\\/](clients?)[\\/]/i.test(m.path)) return 'clients';
  return 'global';
}
// === End Helpers ===

// PREPARE FACTS SECTION WITH CATEGORIES (for AI to reference first)
const factsByCategory = {
 recipes: [],
 clients: [],
 rules: [],
 other: []
};

// Categorize facts from memory
if (contextData?.memory?.length > 0) {
 contextData.memory.slice(0, 20).forEach(m => {
   const type = m.type || m.metadata?.type || 'memory';
   const name = getDisplayName(m);
   const project = inferProjectLabel(m, currentProject);
   
   if (type === 'recipe') {
     const tags = m.metadata?.tags?.join(', ') || 'no tags';
     factsByCategory.recipes.push(`${name} (${tags}) [${project}]`);
   } else if (type === 'client') {
     const status = m.metadata?.status || 'unknown';
     const amount = m.metadata?.amount || '';
     factsByCategory.clients.push(`${name} (${status}${amount ? ', ' + amount : ''}) [${project}]`);
   } else if (type === 'rule' || type === 'instruction') {
     factsByCategory.rules.push(`${m.content || name} [${project}]`);
   } else {
     factsByCategory.other.push(`${type}: ${name} [${project}]`);
   }
 });
}

// CRITICAL FIX: Extract facts from context string when memory array is empty
if (contextData?.context) {
 const contextLower = contextData.context.toLowerCase();
 
 // Check for client data in context
 if (factsByCategory.clients.length === 0 && (contextLower.includes('client') || contextLower.includes('timeshare'))) {
   // Try to extract client names from common patterns
   const patterns = [
     /Client:\s*([^\n]+)/gi,
     /(\w+\s+\w+(?:\s+\w+)?)\s*(?:\(.*?\$[\d,]+.*?\))/g,
     /Contact Information for:\s*([^\n]+)/gi
   ];
   
   patterns.forEach(pattern => {
     const matches = contextData.context.match(pattern) || [];
     matches.forEach(match => {
       const name = match.replace(/Client:|Contact Information for:/gi, '').trim();
       if (name && !factsByCategory.clients.some(c => c.includes(name))) {
         factsByCategory.clients.push(`${name} [from context]`);
       }
     });
   });
   
   // If still no specific clients but context has client data
   if (factsByCategory.clients.length === 0 && contextLower.includes('client')) {
     factsByCategory.clients.push('[Client data available - see BACKGROUND CONTEXT below]');
   }
 }
 
 // Check for recipe data in context
 if (factsByCategory.recipes.length === 0 && (contextLower.includes('recipe') || contextLower.includes('cook'))) {
   factsByCategory.recipes.push('[Recipe data available - see BACKGROUND CONTEXT below]');
 }
}

// Build categorized facts section with explicit instruction
const factsSection = `

CURRENT FACTS:
${factsByCategory.recipes.length > 0 ? `[recipes]: ${factsByCategory.recipes.join(', ')}` : '[recipes]: None in memory'}
${factsByCategory.clients.length > 0 ? `[clients]: ${factsByCategory.clients.join(', ')}` : '[clients]: None in memory'}
${factsByCategory.rules.length > 0 ? `[rules]: ${factsByCategory.rules.join('; ')}` : '[rules]: None found'}
${factsByCategory.other.length > 0 ? `[other]: ${factsByCategory.other.join(', ')}` : ''}


CRITICAL: Always check BACKGROUND CONTEXT below for complete data. The facts above are summaries only.`;

// ADD BACKGROUND CONTEXT (narrative from previous conversations)
const conversationalContext = contextData?.context ? `

BACKGROUND CONTEXT:
${contextData.context}

USE THIS DATA: When asked about "my" anything (clients, recipes, etc.), the answer is in the context above.` : `

BACKGROUND CONTEXT:
No previous conversation context found.`;

// ADD HALLUCINATION CORRECTION PROMPT
const correctionPrompt = contextData?.userCorrecting ? `

CORRECTION NEEDED:
The user indicates your last response was incorrect. 
1. Acknowledge briefly: "Oops!"
2. Explain: "If you notice errors, please use the thumbs down (👎) button. This helps me learn."
3. Provide a corrected answer based on the CURRENT FACTS above.` : '';

// COMBINE WITH FACTS FIRST (AI-optimal order)
let fullSystemContent = baseSystemContent + factsSection + conversationalContext + correctionPrompt;

// === FIX PLACEHOLDERS IN SYSTEM CONTENT ===
if (contextData?.memory?.length > 0 || contextData?.vault?.length > 0) {
  const totalItems = (contextData?.memory?.length || 0) + (contextData?.vault?.length || 0);
  
  // Replace misleading "None in memory" text when we actually have data
  fullSystemContent = fullSystemContent
    .replace(/\[clients\]: None in memory/g, `[clients]: ${totalItems} items found - see BACKGROUND CONTEXT`)
    .replace(/\[recipes\]: None in memory/g, `[recipes]: ${totalItems} items found - see BACKGROUND CONTEXT`)
    .replace(/No previous conversation context found/g, `Found ${totalItems} relevant items in vault`);
  
  console.log('[PLACEHOLDER FIX] Replaced "None in memory" with actual count:', totalItems);
}

// ADD DIAGNOSTICS
console.log('[CONTENT CHECK] Full system content length:', fullSystemContent.length);
console.log('[FACTS CHECK] Facts present?', factsSection.includes('[recipes]:') || factsSection.includes('[clients]:'));
console.log('[FACTS CHECK] Sample:', factsSection.substring(0, 200));
console.log('[CONTEXT CHECK] Background context present?', conversationalContext.includes('BACKGROUND CONTEXT:') && conversationalContext.length > 50);
console.log('[CONTEXT CHECK] Context sample:', conversationalContext.substring(0, 300));

// PREPARE SPINE INJECTION DATA (facts and rules, not narrative)
// Facts for behavioral modification
const spineFactsForInjection = contextData?.memory?.slice(0, 10).map(m => {
 const type = m.type || m.metadata?.type || 'memory';
 const name = getDisplayName(m);
 
 // Extract key facts, not full content
 if (type === 'recipe') {
   const tags = m.metadata?.tags?.join(', ') || 'no tags';
   return `[recipe] ${name} (${tags})`;
 } else if (type === 'client') {
   const status = m.metadata?.status || 'unknown';
   return `[client] ${name} (${status})`;
 } else {
   return `[${type}] ${name}`;
 }
}).join('\n') || 'No specific facts loaded';

// Project rules for behavioral modification
const projectRulesForSpine = currentProject ? 
 `Project: ${currentProject}\nRules: Maintain project context, prioritize project-related memories` : 
 'Global context - no project-specific rules';

// INJECT THE SPINE DIRECTIVE WITH FACTS AND RULES
const systemMessage = {
 role: 'system',
 content: spine.injectDirective(fullSystemContent)
};
enhancedMessages.push(systemMessage);
      // 2. ADD VAULT SEARCH RESULTS TO SYSTEM MESSAGE (if available)
      // REMOVED: Don't add as separate system message - models may ignore it
      if (contextData.vault && contextData.vault.length > 0) {
        const vaultSummary = contextData.vault
          .slice(0, 10)  // Limit to prevent token overflow
          .map(item => {
            const fileName = getDisplayName(item) || (item.path?.split('/').pop() || 'Unknown file');
            const content = item.snippet || item.content?.slice(0, 200) || '[no content]';
            return `${fileName}: ${content}`;
          })
          .join('\n\n');

        // FIXED: Append to existing system message instead of creating new one
        systemMessage.content += `\n\nRELEVANT VAULT CONTENT:\n${vaultSummary}`;
        console.log('[VAULT] Added', Math.min(10, contextData.vault.length), 'vault results to system message');
      }

      // 3. ADD USER MESSAGE
      enhancedMessages.push({ role: 'user', content: processedMessage });
      // DEBUG: Verify the conversion worked
console.log('[VERIFY] Original message:', message);
console.log('[VERIFY] Processed message:', processedMessage);
console.log('[VERIFY] Last message in array:', enhancedMessages[enhancedMessages.length - 1].content);
console.log('[VERIFY] Total messages:', enhancedMessages.length);

      // === SEND TO MODEL WITH FULL CONTEXT ===
      let content;
      let inferenceError = null;
      
      try {
        if (useAPI) {
          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            throw new Error('OpenAI API key not configured');
          }

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: model === 'gpt' ? 'gpt-4' : model,
              messages: enhancedMessages,
              stream: false,
              temperature: 0.7,
              max_tokens: 1000
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          content = data?.choices?.[0]?.message?.content || 'No response from API';
          
        } else {
          // Local Ollama model
          console.log('[OLLAMA] Sending to local model:', model);
          console.log('[DEBUG] Full prompt being sent:', JSON.stringify(enhancedMessages, null, 2));

          // Format messages based on model requirements
          console.log('[MODEL FORMAT] About to format messages for model:', model);
          console.log('[MODEL FORMAT] formatMessagesForModel exists?', typeof formatMessagesForModel);

          const formattedMessages = formatMessagesForModel ? 
            formatMessagesForModel(enhancedMessages, model) : 
            enhancedMessages;

          console.log('[MODEL FORMAT] Formatting complete');
          console.log('[MODEL FORMAT] Messages before formatting:', enhancedMessages.length);
          console.log('[MODEL FORMAT] Messages after formatting:', formattedMessages.length);

          // ===== CLIENT QUERY BYPASS ===== 
          // TEMPORARILY DISABLED - Using normal retrieval instead
          /*
          // ===== CLIENT QUERY BYPASS =====
          if (message.toLowerCase().includes('client') && contextData.memory.length > 0) {
            console.log('[CLIENT BYPASS] Detected client query with memory data');
            
            // Filter for REAL client data (not AI responses)
            const clientMemories = contextData.memory.filter(m => {
              const content = (m.summary || m.content || '').toLowerCase();
              // Include if it has client names or financial data
              return (content.includes('pitched') || content.includes('sold') || content.includes('active')) &&
                     (content.includes('$') || content.includes('client -')) &&
                     !content.includes('as an ai') && 
                     !content.includes('virtual assistant') &&
                     !content.includes('language model');
            });
            
            if (clientMemories.length > 0) {
              // Extract unique client entries
              const clientSet = new Set();
              clientMemories.forEach(m => {
                const summary = m.summary || m.content?.slice(0, 150) || '';
                // Clean up the summary
                if (summary.includes('$') && !summary.includes('as an ai')) {
                  clientSet.add(summary.trim());
                }
              });
              
              const clientList = Array.from(clientSet).join('\n• ');
              
              return {
                content: `Based on your memory vault, here are your clients:\n\n• ${clientList}\n\nNote: Some clients are listed as "Unknown Client" in the records.`,
                model: model,
                fromMemory: true
              };
            }
          }
          // ===== END CLIENT BYPASS =====
          */


          // Define messagesToSend from enhancedMessages or formattedMessages
const messagesToSend = formattedMessages || enhancedMessages || [];

// MEMORY INJECTION: Add vault memories to system context
if (contextData?.memory?.length > 0) {
  console.log('[MEMORY INJECTION] Found', contextData.memory.length, 'memories to inject');
  
  // Debug memory content if enabled
  if (process.env.ECHO_DEBUG === 'true') {
    console.log("🚨 MEMORIES RETRIEVED:", {
      count: contextData.memory.length,
      hasTempleContent: contextData.memory.some(m => (m.content || '').includes('Temple'))
    });
  }
  
  // Build memory content from actual capsules
  let memoryContent = contextData.memory.slice(0, 5).map((capsule, idx) => {
    const name = capsule.metadata?.fileName || capsule.id || `Memory ${idx + 1}`;
    const content = capsule.content || capsule.summary || capsule.text || 'No content';
    return `[${name}]: ${content}`;
  }).join('\n\n');
  
  // Get user name safely
  const userName = currentIdentity?.user?.name || 'User';
  
  // 📄 CONTENT CONTEXT - Handled by ModelManager's systematic approach
  if (global.currentCanonicalText || vaultHighPriest.hasEstablishedCanon()) {
    const canonicalText = global.currentCanonicalText || vaultHighPriest.getCurrentCanon();
    console.log('📄 CONTENT CONTEXT: Will be enforced by ModelManager:', canonicalText?.title);
    // Note: Context enforcement is now handled systematically in ModelManager
  }
  // Enhanced context for lift queries (fallback when no canon established)
  else if (message.toLowerCase().includes("lift")) {
    const TEMPLE_CONTEXT = `
CRITICAL CONTEXT: The user has Temple Ritual lifts with spiritual significance:
- Temple Bench: Associated with Gevurah (Strength) and Tiferet (Beauty)
- Temple Squats: Connected to Yesod (Foundation) 
- Temple Seated Low Row: Fire cooled into Air element
- Temple Seated Sled Pull: Advanced movement patterns
- Temple Ritual Rack Pulls: Strength and form focused
- Temple Sled Yoke Ritual: Combined push/pull movements
These are RITUAL exercises with Kabbalistic meanings, NOT regular gym workouts.
NEVER generate generic fitness advice. Use the specific Temple Ritual context.
`;
    memoryContent = TEMPLE_CONTEXT + "\n\n" + memoryContent;
  }

  // Find system message and inject
  const systemMsgIndex = messagesToSend.findIndex(m => m.role === 'system');
  if (systemMsgIndex !== -1) {
    // Append to existing system message
    messagesToSend[systemMsgIndex].content += `\n\n=== VAULT MEMORIES (${contextData.memory.length} found) ===\nRelevant information from ${userName}'s vault:\n\n${memoryContent}\n=== END VAULT MEMORIES ===\n\nUse these specific details when answering questions about "${message}".`;
    console.log('[MEMORY INJECTION] Appended to system message at index', systemMsgIndex);
  } else {
    // Create new system message if none exists
    messagesToSend.unshift({
      role: 'system',
      content: `=== VAULT MEMORIES (${contextData.memory.length} found) ===\nRelevant information from ${userName}'s vault:\n\n${memoryContent}\n=== END VAULT MEMORIES ===\n\nUse these specific details when responding.`
    });
    console.log('[MEMORY INJECTION] Created new system message with memories');
  }
  
  // Debug final prompt if enabled
  if (process.env.ECHO_DEBUG === 'true') {
    console.log("🚨 FINAL PROMPT TO AI:", {
      includesVaultMemories: messagesToSend.find(m => m.role === 'system')?.content?.includes('VAULT MEMORIES'),
      includesTemple: messagesToSend.find(m => m.role === 'system')?.content?.includes('Temple')
    });
  }
  
  // Log sample for debugging
  console.log('[MEMORY INJECTION] Sample:', messagesToSend[0].content.substring(0, 200));
}

          // === QLIBGOD FINAL ENHANCEMENT CHECK ===
          // Check if QLIBGod can provide a direct enhanced response
          try {
            const forcedResponse = await qlibGod.forceResponse(message, vaultSearchResults);
            if (forcedResponse) {
              console.log('[QLIBGOD] Providing enhanced direct response');
              memoryTracer.endTrace();
              return {
                content: forcedResponse,
                model: 'qlibgod-enhanced',
                project: currentProject || 'global',
                enhanced: true
              };
            }
          } catch (err) {
            console.log('[QLIBGOD] Enhancement check failed:', err.message);
          }

          // === CRITICAL CONTEXT PRESERVATION FOR NUMBERED SELECTIONS ===
          // Preserve context for numbered selections
          if (/^\d+$/.test(message) && global.lastListContext) {
            // This is a numbered selection - preserve the context
            context.isNumberedSelection = true;
            context.listContext = global.lastListContext;
            context.lastQuery = global.lastQuery;
            
            if (global.trace) {
              global.trace('context', 'Numbered selection detected', {
                number: message,
                hasListContext: !!global.lastListContext,
                lastQuery: global.lastQuery
              });
            } else {
              console.log('[CONTEXT] Numbered selection detected', {
                number: message,
                hasListContext: !!global.lastListContext,
                lastQuery: global.lastQuery
              });
            }
          }

          // === MULTI-BRAIN ROUTER DECISION ===
          let routeDecision = null;
          let finalModel = model;
          let formattedPrompt = null;

          if (brainConfig.routerEnabled) {
            try {
              // Prepare context for routing
              const routingContext = {
                lastFileContent: global.lastFileContent,
                conversationHistory: context.messages || [],
                lastResponse: context.messages?.[context.messages.length - 1]?.content,
                lastRole: context.lastRole,
                currentDirectory: process.cwd(),
                hasMemoryData: !!(contextData.memory && contextData.memory.length > 0),
                hasVaultData: !!(contextData.vault && contextData.vault.length > 0),
                // 🔧 FIX: Pass canonical context to brain router
                currentCanonicalText: global.currentCanonicalText,
                vaultContext: global.vaultContext
              };

              // Get routing decision
              routeDecision = await router.routeQuery(message, routingContext);
              
              // Log routing decision
              if (global.trace) {
                global.trace('brain-router', `Routing decision`, {
                  originalModel: model,
                  selectedModel: routeDecision.model,
                  selectedBrain: routeDecision.role,
                  confidence: routeDecision.confidence,
                  reasoning: routeDecision.reasoning
                });
              }

              // Use routed model if confidence is high enough
              if (routeDecision.confidence >= brainConfig.routing.confidenceThreshold) {
                finalModel = routeDecision.model;
                
                // Format prompt for the specific brain
                formattedPrompt = modelManager.formatPromptForModel(
                  routeDecision.role, 
                  message, 
                  routingContext
                );
                
                console.log(`[BRAIN-ROUTER] Using ${routeDecision.role} brain (${finalModel}) with confidence ${routeDecision.confidence}`);
              } else {
                console.log(`[BRAIN-ROUTER] Low confidence (${routeDecision.confidence}), using original model ${model}`);
              }

            } catch (routerError) {
              console.log('[BRAIN-ROUTER] Routing failed, using original model:', routerError.message);
              // Continue with original model
            }
          } else {
            console.log('[BRAIN-ROUTER] Router disabled, using original model');
          }

          // Diagnostic: Capture exact input
          const diagnostic = {
            originalModel: model,
            finalModel: finalModel,
            routeDecision: routeDecision,
            messages: messagesToSend,
            formattedPrompt: formattedPrompt,
            memoryFound: contextData?.memory?.length || 0,
            contextLength: contextData?.context?.length || 0
          };
          
          try {
            require('fs').writeFileSync('last-model-input.json', JSON.stringify(diagnostic, null, 2));
            console.log('[DIAGNOSTIC] Saved model input to last-model-input.json');
          } catch (writeErr) {
            console.log('[DIAGNOSTIC] Could not save diagnostic file:', writeErr.message);
            memoryTracer.track('ERROR', writeErr.message);
            memoryTracer.endTrace();
          }

          // Check if Ollama is running
          try {
            const healthCheck = await fetch('http://localhost:11434/api/tags');
            if (!healthCheck.ok) {
              throw new Error('Ollama service not responding');
            }
          } catch (healthError) {
            memoryTracer.track('ERROR', healthError.message);
            memoryTracer.endTrace();
            throw new Error('Ollama is not running. Please start Ollama first.');
          }

          // 🔧 CONTEXT DIAGNOSTIC: Check what's about to be sent to AI
          console.log('📝 CONTEXT CHECK BEFORE AI CALL:', {
            hasCanonicalText: !!global.currentCanonicalText,
            canonicalTitle: global.currentCanonicalText?.title,
            contentLength: global.currentCanonicalText?.content?.length,
            aboutToSendToModel: finalModel,
            routerEnabled: brainConfig.routerEnabled,
            routeDecision: routeDecision?.role || 'none'
          });

          // Use brain router or fallback to existing system
          let response;
          
          // Debug routing if enabled
          if (process.env.ECHO_DEBUG === 'true') {
            console.log("🚨 CHECKPOINT 3: Building prompt...", {
              routerEnabled: brainConfig.routerEnabled,
              memoryCount: contextData?.memory?.length || 0
            });
          }

          if (brainConfig.routerEnabled && routeDecision && routeDecision.confidence >= brainConfig.routing.confidenceThreshold) {
            // Try using ModelManager for specialized routing
            try {
              if (process.env.ECHO_DEBUG === 'true') {
                console.log("🚨 CHECKPOINT 4: Sending to AI via router:", {
                  model: finalModel,
                  routeDecision: routeDecision.role
                });
              }
              
              // 🔧 FIX: Pass canonical context to specialized brain
              const brainConfig = {
                ...routeDecision.config,
                canonicalText: global.currentCanonicalText,
                messagesToSend: messagesToSend  // This contains the prepared system message with canonical context
              };
              
              const brainResponse = await modelManager.callModel(
                finalModel, 
                formattedPrompt || message, 
                brainConfig
              );
              
              // Create compatible response format
              response = {
                ok: true,
                json: async () => ({
                  message: {
                    content: brainResponse
                  }
                })
              };
              
              console.log(`[BRAIN-ROUTER] Successfully used ${routeDecision.role} brain`);
              
            } catch (brainError) {
              console.log(`[BRAIN-ROUTER] Brain call failed, falling back to original: ${brainError.message}`);
              // Fall back to original system
              response = await fetch('http://localhost:11434/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: finalModel,
                  messages: messagesToSend,
                  stream: false,
                  options: {
                    temperature: routeDecision?.config?.temperature || 0.7,
                    num_predict: routeDecision?.config?.maxTokens || 1000
                  }
                })
              });
            }
          } else {
            // Use original system
            response = await fetch('http://localhost:11434/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: finalModel,
                messages: messagesToSend,
                stream: false,
                options: {
                  temperature: 0.7,
                  num_predict: 1000
                }
              })
            });
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama error ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          content = data?.message?.content || 'No response from Ollama';
        }

        // === STORE LIST CONTEXTS FOR NUMBERED SELECTIONS (MAIN PIPELINE) ===
        if (content && (content.includes('1.') || content.includes('1)'))) {
          global.lastListContext = content;
          global.lastQuery = message;
          console.log('[CONTEXT] Main pipeline stored list context for numbered selections');
        }

      } catch (fetchError) {
        inferenceError = fetchError;
        const memoryInfo = contextData.memory.length > 0 
          ? `I found ${contextData.memory.length} relevant memories ${currentProject ? `in the ${currentProject} project` : 'in my system'}.`
          : `I couldn't access my memory system properly${currentProject ? ` for the ${currentProject} project` : ''}.`;
        
        const vaultInfo = contextData.vault?.length > 0
          ? `I also found ${contextData.vault.length} relevant files in the vault.`
          : '';

        content = `I apologize, but I'm having trouble connecting to the model service.

Error: ${fetchError.message}

${memoryInfo} ${vaultInfo}

${contextData.memory.length > 0 ? '\nFrom my memory, I can see we\'ve discussed:\n' + 
  contextData.memory.slice(0, 3).map(m => {
    const summary = m.summary || m.content?.slice(0, 100) || 'Previous conversation';
    return `• ${summary}`;
  }).join('\n') : ''}

Please check:
1. Ollama is running (for local models)
2. API keys are configured (for cloud models)
3. Your internet connection is stable`;
        memoryTracer.track('ERROR', fetchError.message);
        memoryTracer.endTrace();
      }

      // === SAVE TO MEMORY WITH PROJECT CONTEXT===
      let savedCapsuleId = null;
      if (global.memorySystem?.processConversation) {
        try {
          // processConversation returns the capsule object
          const capsule = await global.memorySystem.processConversation(message, content, {
            model,
            project: currentProject,
            topic: 'general',
            source: 'chat:send',
            timestamp: new Date().toISOString(),
            hadContext: contextData.memory.length > 0,
            hadVaultResults: contextData.vault?.length > 0,
            inferenceError: inferenceError?.message,
            userCorrecting: userCorrectingHallucination,
            previousCapsuleId: lastResponseCapsuleId
          });
          
          // Extract ID directly from capsule
          savedCapsuleId = capsule?.id;
          
          // Store globally for next interaction
          global.lastResponseCapsuleId = savedCapsuleId;
          
          // Store in recent capsules array
          if (!global.recentCapsuleIds) {
            global.recentCapsuleIds = [];
          }
          
          if (savedCapsuleId) {
            global.recentCapsuleIds.push({
              id: savedCapsuleId,
              timestamp: new Date().toISOString(),
              userInput: message.substring(0, 50) + '...',
              aiResponse: content.substring(0, 50) + '...',
              project: currentProject || 'global'
            });
            
            // Keep only last 10
            if (global.recentCapsuleIds.length > 10) {
              global.recentCapsuleIds.shift();
            }
          }
          
          console.log('[MEMORY] Conversation saved to memory capsule:', {
            capsuleId: savedCapsuleId,
            project: currentProject || 'global',
            userCorrecting: userCorrectingHallucination
          });
          
        } catch (err) {
          console.error('[MEMORY] Failed to save conversation:', err.message);
          memoryTracer.track('ERROR', err.message);
          memoryTracer.endTrace();
        }
      }

      // 🏛️ CANON ENFORCEMENT - Validate AI response against established truth
      const canonicalText = global.currentCanonicalText || vaultHighPriest.getCurrentCanon();
      if (canonicalText || vaultHighPriest.hasEstablishedCanon()) {
        console.log('🏛️ ENFORCING CANON: Validating AI response against canonical text');
        
        const enforcement = canonValidator.enforceCanonWithContext(
          content, 
          canonicalText, 
          message,
          contextData
        );
        
        if (enforcement.heresyDetected) {
          console.log('🚨 HERESY DETECTED AND CORRECTED');
          content = enforcement.message;
          
          // Log the enforcement event
          canonValidator.logEnforcementEvent({
            enforcement: enforcement.enforcement,
            heresyDetected: true,
            userQuery: message,
            originalResponse: enforcement.originalResponse
          });
        } else if (enforcement.weakReference) {
          console.log('🏛️ ENHANCED CANONICAL REFERENCE');
          content = enforcement.message;
        }
        
        // Mark response as canon-validated
        memoryTracer.track('CANON_VALIDATION', {
          hasCanon: !!canonicalText,
          heresyDetected: enforcement.heresyDetected,
          enforcement: enforcement.enforcement
        });
      }

      // Debug AI response if enabled
      if (process.env.ECHO_DEBUG === 'true') {
        console.log("🚨 CHECKPOINT 5: AI responded with Temple content?", content?.includes("Temple"));
        if (!content?.includes('Temple') && content?.includes('access')) {
          console.log("🚨 HALLUCINATION DETECTED: AI ignoring vault context");
        }
      }

      // === RETURN RESPONSE  ===
      console.log('[TRACE-11] RESPONSE-PATH-C: AI GENERATED RESPONSE:', {
        contentLength: content?.length || 0,
        contentPreview: content?.substring(0, 100) || 'no content',
        model: model,
        memoriesInjected: contextData.memory?.length || 0,
        vaultResultsInjected: contextData.vault?.length || 0,
        finalReturn: 'AI MODEL RESPONSE'
      });
      console.log('=================== TRACE MAP END ===================');
      
      // Filter gratitude language from AI responses
      content = OwnershipGuardian.stripGratitudeLanguage(content);
      
      memoryTracer.endTrace();
      return { 
        content, 
        model,
        project: currentProject || 'global',
        capsuleId: savedCapsuleId,
        debug: {
          identityUsed: currentIdentity.ai.name,
          memoriesInjected: contextData.memory?.length || 0,
          vaultResultsInjected: contextData.vault?.length || 0,
          contextLength: contextData.context?.length || 0,
          memorySystemInitialized: !!global.memorySystem?.vaultManager?.index,
          projectContext: currentProject || 'global',
          lastCapsuleId: savedCapsuleId   
        }
      };
    } catch (err) {
      console.error('[CHAT:SEND] Fatal error:', err);
      console.log('[TRACE-12] RESPONSE-PATH-D: ERROR FALLBACK:', {
        errorMessage: err.message,
        errorType: err.constructor.name,
        finalReturn: 'ERROR RESPONSE'
      });
      console.log('=================== TRACE MAP END (ERROR) ===================');
      
      memoryTracer.track('ERROR', err.message);
      memoryTracer.endTrace();
      return {
        content: `Error: ${err.message}\n\nPlease check that your memory system and model service are running properly.`,
        model: context?.model || 'unknown',
        error: true
      };
    }
  };
}

module.exports = { createChatSendHandler };
