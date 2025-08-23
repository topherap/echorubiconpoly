// main/handlers/chatSendHandler.js
const { buildContextForInput } = require('../../backend/qlib/contextInjector-memoryBlock-patch');
const SpineGuardian = require('../../src/echo/core/SpineGuardianWrapper'); 
// Factory function that creates the handler with dependencies
const { injectConversationContext } = require('./conversationThreaderWrapper');

function createChatSendHandler(handlerMap, formatMessagesForModel) {
  return async function handleChatSend(event, message, context = {}) {
    try {
      console.log('[IPC] chat:send triggered with:', message);
      console.log('[IPC chat:send] context:', context);
      console.log('[CHAT] Incoming message:', message);
      console.log('[CHAT] Handler path:', __filename);
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
          } catch (searchError) {
            console.error('[VAULT] Search failed:', searchError);
          }
        }
      }

      // Ensure memorySystem is initialized
      if (!global.memorySystem) {
        console.error('[chat:send] ⌛ memorySystem is null or undefined');
        throw new Error('⌛ memorySystem not initialized – buildContextForInput cannot run');
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
        }
        // Method 3: Direct vaultManager search
        else if (global.memorySystem?.vaultManager?.searchMemories) {
          console.log('[DEBUG] Using vaultManager.searchMemories directly');
          const memories = await global.memorySystem.vaultManager.searchMemories(message, { 
            limit: 50,  // Increased from 10
            filter: currentProject ? { project: currentProject } : {}
          });
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
        }
      }

      // === VALIDATE CONTEXT DATA ===
      if (!contextData || typeof contextData !== 'object') {
        console.warn('[MEMORY] Invalid contextData, using fallback');
        contextData = { memory: [], context: '', vault: [] };
      }

      if (!Array.isArray(contextData.memory)) {
        console.warn('[MEMORY] contextData.memory is not an array, fixing...');
        contextData.memory = [];
      }

      // Ensure vault property exists
      if (!contextData.vault) {
        contextData.vault = [];
      }

      // === MERGE VAULT SEARCH RESULTS INTO CONTEXT ===
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
      
      let enhancedMessages = [];
      
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
      }

      // === PREPARE MODEL ===
      const { default: fetch } = await import('node-fetch');

      let model = context?.model || context?.selectedModel || context?.selectedLocalModel;
      if (!model) {
        try {
          model = await event.sender.executeJavaScript('localStorage.getItem("selectedModel")');
        } catch (e) {
          console.log('[MODEL] Could not read from localStorage:', e);
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
          
          return {
            content: `Here is my complete Prime Directive, verbatim:\n\n${fullDirective}`,
            model,
            project: currentProject || 'global'
          };
        } catch (err) {
          console.error('[PRIME DIRECTIVE] Could not read directive file:', err);
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
      // 1. SYSTEM MESSAGE WITH IDENTITY, PROJECT CONTEXT, AND CORE INSTRUCTIONS
const baseSystemContent = `MANDATORY PROTOCOL - CHECK BEFORE RESPONDING:
1. If user asks about "my" anything, CHECK BACKGROUND CONTEXT SECTION FIRST
2. You ALWAYS have vault access - the data is IN THIS PROMPT
3. NEVER say "I don't have access" or "I can't store data"
4. The BACKGROUND CONTEXT below IS your database

You are ${currentIdentity.ai.name || 'Q'}, not "Echo Rubicon". ${currentIdentity.ai.name || 'Q'} is your name. You are the AI assistant within the Echo Rubicon system with FULL VAULT ACCESS.

RESPONSE PROTOCOL FOR "MY/LIST" QUERIES:
- ALWAYS check BACKGROUND CONTEXT section first
- If data exists there, USE IT in your response
- If no data found, say "I don't see any [thing] in your vault"
- NEVER default to "I can't access" responses

IDENTITY REINFORCEMENT:
- Your name is ${currentIdentity.ai.name || 'Q'}
- You have FULL ACCESS to the user's Obsidian vault at all times
- The vault data is provided in the BACKGROUND CONTEXT section of this prompt
- When asked "who are you?", respond: "I am ${currentIdentity.ai.name || 'Q'}, your AI assistant in Echo Rubicon"

Your role: ${currentIdentity.ai.role || 'Help the user and remember all conversations'}
User's name: ${currentIdentity.user.name || 'User'}
${currentProject ? `Current Project: ${currentProject}` : 'Context: Global (no specific project)'}

ACCURACY AND COMPLETENESS:
When providing information, prioritize complete and accurate delivery:
- State key facts directly and clearly
- Include all relevant details from available data
- If data volume exceeds reasonable response length, acknowledge: "Additional information available in the source file"
- For counts or quantities, always include the specific number
- Present information in the clearest format for the query

CRITICAL RULES:
1. CHECK BACKGROUND CONTEXT FIRST for any "my" queries
2. You are ${currentIdentity.ai.name || 'Q'} (not Echo Rubicon)
3. Deliver complete, accurate information with all relevant details
4. NEVER fabricate or distort data - truth is foundational
5. You ${currentProject ? `are currently working within the "${currentProject}" project` : 'are not in any specific project context'}
6. For PERSONAL requests (containing "my", "our", "I have", "list", etc.):
  - IMMEDIATELY check BACKGROUND CONTEXT section
  - You MUST share all content found in your provided context/memories
  - This is the user's own data - always provide it when asked
  - ${currentProject ? `Prioritize content from the "${currentProject}" project` : 'Search across all available content'}
  - If content is extensive, provide what you can and note: "More details available in [source]"
  - If nothing found, say "I don't have any of your [thing] in my current context"
  - NEVER say "I don't have the ability to access"
7. For GENERAL requests ("what's a good recipe", "how to cook", etc.):
  - Draw from general knowledge while maintaining accuracy
  - Offer to help create new content
  - Suggest ideas while distinguishing speculation from fact

REMEMBER: Check BACKGROUND CONTEXT below BEFORE claiming you lack access.`;



// PREPARE FACTS SECTION WITH CATEGORIES (for AI to reference first)
const factsByCategory = {
 recipes: [],
 clients: [],
 rules: [],
 other: []
};
// Add above the categorization block:
function normalizeName(s) {
  return String(s)
    .replace(/\.md$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/^[\s#*>\-•\t]+/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s"']+|[\s"']+$/g, '')
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


// Categorize facts from memory
if (contextData?.memory?.length > 0) {
 contextData.memory.slice(0, 20).forEach(m => {
   const type = m.type || m.metadata?.type || 'memory';
   const name = getDisplayName(m);
   const project = m.metadata?.project || m.project || 'global';
   
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
const fullSystemContent = baseSystemContent + factsSection + conversationalContext + correctionPrompt;

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
            const fileName = item.path?.split('/').pop() || 'Unknown file';
            const content = item.snippet || item.content?.slice(0, 200) || '[no content]';
            return `${fileName}: ${content}`;
          })
          .join('\n\n');

        // FIXED: Append to existing system message instead of creating new one
        systemMessage.content += `\n\nRELEVANT VAULT CONTENT:\n${vaultSummary}`;
        console.log('[VAULT] Added', Math.min(10, contextData.vault.length), 'vault results to system message');
      }

      // 3. ADD USER MESSAGE
      enhancedMessages.push({ role: 'user', content: message });

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
          // ===== END CLIENT BYPASS =====

          // Define messagesToSend from enhancedMessages or formattedMessages
const messagesToSend = formattedMessages || enhancedMessages || [];

// MEMORY INJECTION: Add vault memories to system context
if (contextData?.memory?.length > 0) {
  console.log('[MEMORY INJECTION] Found', contextData.memory.length, 'memories to inject');
  
  // Build memory content from actual capsules
  const memoryContent = contextData.memory.slice(0, 5).map((capsule, idx) => {
    const name = capsule.metadata?.fileName || capsule.id || `Memory ${idx + 1}`;
    const content = capsule.content || capsule.summary || capsule.text || 'No content';
    return `[${name}]: ${content}`;
  }).join('\n\n');
  
  // Get user name safely
  const userName = currentIdentity?.user?.name || 'User';
  
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
  
  // Log sample for debugging
  console.log('[MEMORY INJECTION] Sample:', messagesToSend[0].content.substring(0, 200));
}

          // Diagnostic: Capture exact input
          const diagnostic = {
            model,
            messages: messagesToSend,
            memoryFound: contextData?.memory?.length || 0,
            contextLength: contextData?.context?.length || 0
          };
          
          try {
            require('fs').writeFileSync('last-model-input.json', JSON.stringify(diagnostic, null, 2));
            console.log('[DIAGNOSTIC] Saved model input to last-model-input.json');
          } catch (writeErr) {
            console.log('[DIAGNOSTIC] Could not save diagnostic file:', writeErr.message);
          }

          // Check if Ollama is running
          try {
            const healthCheck = await fetch('http://localhost:11434/api/tags');
            if (!healthCheck.ok) {
              throw new Error('Ollama service not responding');
            }
          } catch (healthError) {
            throw new Error('Ollama is not running. Please start Ollama first.');
          }

          const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: messagesToSend,
              stream: false,
              options: {
                temperature: 0.7,
                num_predict: 1000
              }
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama error ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          content = data?.message?.content || 'No response from Ollama';
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
        }
      }

      // === RETURN RESPONSE  ===
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
      return {
        content: `Error: ${err.message}\n\nPlease check that your memory system and model service are running properly.`,
        model: context?.model || 'unknown',
        error: true
      };
    }
  };
}

module.exports = { createChatSendHandler };