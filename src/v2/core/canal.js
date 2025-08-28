/*
* 🌊 THE CANAL - Sequential Control System
* 
* Pure sequential processing with session management
* Each request flows through defined channels
* Clean separation between stateless processing and stateful sessions
* 
* Architecture:
* Session → Request → Route → Process → Response → Session Update
* Canal stays pure, sessions handle state
*/

class Canal {
 constructor(dependencies = {}) {
   this.routes = new Map();
   this.middleware = [];
   this.routePriority = new Map(); // Explicit route precedence
   
   // Service dependencies
   this.personaService = dependencies.personaService || null;
   this.vaultService = dependencies.vaultService || null;
   this.modelManager = dependencies.modelManager || null;
   
   // Lock processing order (critical for context flow)
   this.lockOrder = ['identity', 'persona', 'context', 'routing'];
 }

 // Register route with optional priority (higher = checked first)
 route(pattern, handler, priority = 0) {
   this.routes.set(pattern, handler);
   this.routePriority.set(pattern, priority);
   return this;
 }

 // Add middleware for cross-cutting concerns
 use(middleware) {
   this.middleware.push(middleware);
   return this;
 }

 // Build context-aware prompts from locks and context
 buildContextualPrompt(locks, input, baseContext) {
   const layers = [];
   
   // Layer 1: Ownership context (CRITICAL)
   if (baseContext.source === 'vault' || baseContext.isVaultContent) {
     layers.push(`You are reviewing MY personal vault entries with me.
This is MY data, not submissions from others.
Never say "thank you for sharing" - this is MY content.
We're exploring MY knowledge base together.`);
   }
   
   // Layer 2: Persona influence (from locks)
   if (locks.persona?.detected && this.personaService) {
     const style = this.personaService.responseStyles[locks.persona.detected];
     if (style) {
       layers.push(`Response style: ${style.tone}`);
       layers.push(`Format: ${style.responseFormat}`);
       if (style.behaviors?.length) {
         layers.push(`Key behaviors: ${style.behaviors.join(', ')}`);
       }
       if (style.vocabulary?.length) {
         layers.push(`Use vocabulary like: ${style.vocabulary.slice(0, 5).join(', ')}`);
       }
     }
   }
   
   // Layer 3: Context continuity
   if (locks.context?.hasReference) {
     layers.push(`User is referencing ${locks.context.referenceType} context.
Maintain conversational flow without re-explaining.
Skip acknowledgments and dive straight into the content.`);
   }
   
   // Layer 4: Momentum preservation
   if (locks.persona?.momentum?.continuity > 3) {
     layers.push(`Deep conversation flow detected (continuity: ${locks.persona.momentum.continuity}).
Skip pleasantries and maintain intellectual momentum.
User reality level: ${locks.persona.momentum.realityLevel || 'pragmatic'}`);
   }
   
   // Layer 5: Selection context
   if (baseContext.lastSelection) {
     layers.push(`Currently examining: ${JSON.stringify(baseContext.lastSelection).slice(0, 100)}...
This is the specific item user selected from MY vault.`);
   }
   
   return layers.join('\n\n');
 }

 // Process with lock system for proper sequencing
 async processWithLocks(input, externalContext = {}) {
   const locks = {};
   
   // Process each lock in order
   for (const lock of this.lockOrder) {
     locks[lock] = await this.processLock(lock, input, externalContext, locks);
   }
   
   // Build enriched request with lock results
   const request = {
     input: input,
     type: this.determineType(input, locks),
     locks: locks,
     timestamp: Date.now()
   };
   
   // Flow through standard processing with enriched context
   return this.flow(request, externalContext);
 }

 // Process individual locks
 async processLock(lock, input, context, previousLocks) {
   switch(lock) {
     case 'identity':
       return {
         user: context.userId || 'default',
         sessionId: context.sessionId || this.generateSessionId(),
         lastPersona: context.savedMomentum?.lastPersona
       };
       
     case 'persona':
       if (!this.personaService) return null;
       
       // Detect persona with proper context including momentum
       const personaContext = {
         ...context,
         previousPersona: previousLocks.identity?.lastPersona,
         threadId: previousLocks.identity?.sessionId,
         momentum: context.savedMomentum
       };
       
       const personaResult = await this.personaService.detectPersona(
         input,
         personaContext
       );
       
       return {
         ...personaResult,
         momentum: this.personaService.conversationMomentum
       };
       
     case 'context':
       // Check for contextual references
       const contextualPattern = /\b(this|that|it|them|these|those)\b/i;
       const hasReference = contextualPattern.test(input);
       
       return {
         hasReference,
         referenceType: hasReference ? this.detectReferenceType(input) : null,
         requiresContext: hasReference,
         isVaultContent: context.isVaultContent || false,
         source: context.source
       };
       
     case 'routing':
       // Determine route based on all previous locks
       return this.determineRoute(input, previousLocks);
       
     default:
       return null;
   }
 }

 // Determine request type from input and locks
 determineType(input, locks) {
   const trimmed = input.trim();
   
   // Selection pattern (pure number)
   if (/^\d+$/.test(trimmed)) {
     return 'selection';
   }
   
   // Query patterns
   if (/\b(what|where|when|who|why|how|show|list|find|search)\b/i.test(input)) {
     return 'query';
   }
   
   // Action patterns
   if (/\b(create|add|delete|remove|update|edit|modify)\b/i.test(input)) {
     return 'action';
   }
   
   // Contextual continuation
   if (locks.context?.hasReference) {
     return 'continuation';
   }
   
   // Analysis patterns
   if (/\b(analyze|explain|describe|summarize|compare)\b/i.test(input)) {
     return 'analysis';
   }
   
   return 'general';
 }

 // Detect type of reference
 detectReferenceType(input) {
   if (/\bthis\b/i.test(input)) return 'current';
   if (/\bthat\b/i.test(input)) return 'previous';
   if (/\bthese\b/i.test(input)) return 'multiple_current';
   if (/\bthose\b/i.test(input)) return 'multiple_previous';
   if (/\bit\b/i.test(input)) return 'last_mentioned';
   if (/\bthem\b/i.test(input)) return 'multiple_mentioned';
   return 'unknown';
 }

 // Determine routing based on locks
 determineRoute(input, locks) {
   const routes = [];
   
   // Priority 1: Selection (if awaiting)
   if (/^\d+$/.test(input.trim())) {
     routes.push({ pattern: 'selection', priority: 100 });
   }
   
   // Priority 2: Contextual reference
   if (locks.context?.hasReference) {
     routes.push({ pattern: 'contextual', priority: 90 });
   }
   
   // Priority 3: Persona-specific routing
   if (locks.persona?.detected) {
     const personaRoute = `persona_${locks.persona.detected}`;
     routes.push({ pattern: personaRoute, priority: 80 });
   }
   
   // Priority 4: Type-based routing
   const type = this.determineType(input, locks);
   if (type !== 'general') {
     routes.push({ pattern: type, priority: 70 });
   }
   
   // Priority 5: Standard patterns
   routes.push({ pattern: 'default', priority: 0 });
   
   return routes.sort((a, b) => b.priority - a.priority);
 }

 // Pure stateless processing - context passed in, enriched context returned
 async flow(request, externalContext = {}) {
   // Create isolated context for this request
   const context = {
     ...externalContext,
     requestId: this.generateRequestId(),
     timestamp: Date.now(),
     trace: []
   };

   try {
     // Apply middleware pipeline
     let processedRequest = request;
     for (const middleware of this.middleware) {
       processedRequest = await middleware(processedRequest, context);
       this.trace(context, `middleware:${middleware.name || 'anonymous'}`);
     }

     // BUILD SYSTEM PROMPT from locks and context
     if (request.locks) {
       context.systemPrompt = this.buildContextualPrompt(
         request.locks, 
         request.input,
         externalContext
       );
       this.trace(context, 'prompt:built', { promptLength: context.systemPrompt.length });
     }

     // Find matching route with priority ordering
     const handler = this.findHandler(processedRequest);
     if (!handler) {
       return this.createResponse(
         'No handler found', 
         { handled: false },
         context
       );
     }

     // Execute handler with enriched context including system prompt
     const result = await handler(processedRequest, context);
     this.trace(context, 'handler:complete', { resultType: typeof result });
     
     // Ensure vault content marking flows through
     if (context.isVaultContent || context.source === 'vault') {
       result.metadata = {
         ...result.metadata,
         isVaultContent: true,
         source: 'vault'
       };
     }
     
     return this.createResponse(result, { handled: true }, context);

   } catch (error) {
     this.trace(context, 'error', { message: error.message });
     return this.createResponse(
       error.message, 
       { handled: false, error: true },
       context
     );
   }
 }

 findHandler(request) {
   // Check for explicit routing from locks
   if (request.locks?.routing) {
     for (const route of request.locks.routing) {
       if (this.routes.has(route.pattern)) {
         return this.routes.get(route.pattern);
       }
     }
   }
   
   // Sort routes by priority (descending)
   const sortedRoutes = Array.from(this.routes.entries()).sort((a, b) => {
     const priorityA = this.routePriority.get(a[0]) || 0;
     const priorityB = this.routePriority.get(b[0]) || 0;
     return priorityB - priorityA;
   });

   for (const [pattern, handler] of sortedRoutes) {
     if (this.matchPattern(pattern, request)) {
       return handler;
     }
   }
   return null;
 }

 matchPattern(pattern, request) {
   if (typeof pattern === 'string') {
     return request.type === pattern || 
            request.action === pattern ||
            request.locks?.routing?.some(r => r.pattern === pattern);
   }
   if (pattern instanceof RegExp) {
     const testString = request.input || request.message || request.query || '';
     return pattern.test(testString);
   }
   if (typeof pattern === 'function') {
     return pattern(request);
   }
   return false;
 }

 createResponse(content, metadata = {}, context = {}) {
   return {
     content,
     metadata: {
       ...metadata,
       requestId: context.requestId,
       timestamp: Date.now(),
       processedBy: 'canal',
       source: context.source,
       isVaultContent: context.isVaultContent
     },
     context: {
       trace: context.trace || [],
       state: context.state || {},
       locks: context.locks || {},
       systemPrompt: context.systemPrompt
     }
   };
 }

 generateRequestId() {
   return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
 }
 
 generateSessionId() {
   return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
 }

 trace(context, step, data = {}) {
   if (context && context.trace) {
     context.trace.push({
       step,
       data,
       timestamp: Date.now()
     });
   }
 }
}

/*
* SESSION MANAGER - Handles stateful conversations
* Maintains conversation history and context across requests
* Properly handles selection state and vault content marking
*/
class SessionManager {
 constructor(canal, dependencies = {}) {
   this.canal = canal;
   this.sessions = new Map();
   this.sessionTimeout = 30 * 60 * 1000; // 30 minutes default
   
   // Service connections
   this.personaService = dependencies.personaService || canal.personaService;
   this.vaultService = dependencies.vaultService || canal.vaultService;
 }

 // Get or create session
 getSession(sessionId) {
   if (!this.sessions.has(sessionId)) {
     this.sessions.set(sessionId, {
       id: sessionId,
       created: Date.now(),
       lastActive: Date.now(),
       history: [],
       context: {
         lastQuery: null,
         lastResults: null,
         lastSelection: null,
         awaitingSelection: false,
         conversationFlow: [],
         userData: {},
         personaMomentum: null,
         lastSource: null,
         isVaultContent: false
       }
     });
   }
   
   const session = this.sessions.get(sessionId);
   session.lastActive = Date.now();
   return session;
 }

 // Process request with session context
 async process(sessionId, request) {
   const session = this.getSession(sessionId);
   
   // Normalize input
   const inputText = typeof request === 'string' ? request : request.input;
   
   // CHECK FOR SELECTION FIRST (before adding to history)
   if (session.context.awaitingSelection && /^\d+$/.test(inputText?.trim())) {
     const selectionResult = await this.processSelection(session, { input: inputText });
     
     // Mark as vault content if selecting from vault results
     if (session.context.lastResults?.[0]?.source === 'vault' || session.context.lastSource === 'vault') {
       selectionResult.context = {
         ...selectionResult.context,
         isVaultContent: true,
         source: 'vault'
       };
     }
     
     return selectionResult;
   }
   
   // Add request to history
   session.history.push({
     request: typeof request === 'string' ? { input: request } : request,
     timestamp: Date.now()
   });

   // Prepare context with session data including vault marking
   const contextIn = {
     ...session.context,
     sessionId,
     historyLength: session.history.length,
     previousRequest: session.history[session.history.length - 2]?.request,
     savedMomentum: session.context.personaMomentum,
     // Preserve vault context through the chain
     isVaultContent: session.context.isVaultContent || session.context.lastSource === 'vault',
     source: session.context.lastSource,
     lastSelection: session.context.lastSelection
   };

   // Process through canal with locks
   const response = await this.canal.processWithLocks(inputText || request, contextIn);

   // Update session context based on response
   this.updateSessionContext(session, request, response);

   // Add response to history
   session.history[session.history.length - 1].response = response;

   // Clean expired sessions periodically
   if (Math.random() < 0.1) this.cleanExpiredSessions();

   return response;
 }

 // Process selection specifically
 async processSelection(session, request) {
   const index = parseInt(request.input.trim()) - 1; // Convert to 0-based
   
   // Validate index
   if (!session.context.lastResults || index < 0 || index >= session.context.lastResults.length) {
     return this.canal.createResponse(
       'Invalid selection. Please choose a number from the list.',
       { handled: false, error: true },
       { sessionId: session.id }
     );
   }
   
   // Get selected item
   const selected = session.context.lastResults[index];
   
   // Update context
   session.context.lastSelection = selected;
   session.context.awaitingSelection = false;
   session.context.isVaultContent = selected.source === 'vault' || session.context.lastSource === 'vault';
   
   // Store in history
   session.history.push({
     request: { type: 'selection', input: request.input, index: index },
     response: { 
       content: selected, 
       metadata: { 
         handled: true,
         isVaultContent: session.context.isVaultContent,
         source: selected.source || session.context.lastSource
       }
     },
     timestamp: Date.now()
   });
   
   // If vault service available, update it too
   if (this.vaultService && typeof this.vaultService.selectItem === 'function') {
     const vaultSelection = await this.vaultService.selectItem(index);
     if (vaultSelection.content) {
       selected.fullContent = vaultSelection.content;
     }
   }
   
   return this.canal.createResponse(
     selected,
     { 
       handled: true, 
       type: 'selection',
       isVaultContent: session.context.isVaultContent,
       source: selected.source || 'vault'
     },
     { 
       sessionId: session.id, 
       selection: selected,
       isVaultContent: session.context.isVaultContent
     }
   );
 }

 updateSessionContext(session, request, response) {
   const ctx = session.context;
   
   // Track content source
   if (response.metadata?.source) {
     ctx.lastSource = response.metadata.source;
     ctx.isVaultContent = response.metadata.source === 'vault';
   }
   
   if (response.content?.source) {
     ctx.lastSource = response.content.source;
     ctx.isVaultContent = response.content.source === 'vault';
   }
   
   // Update based on request type
   const requestType = typeof request === 'string' ? 'general' : (request.type || 'general');
   
   if (requestType === 'query' || requestType === 'search') {
     ctx.lastQuery = typeof request === 'string' ? request : (request.input || request.query);
     
     // Check all possible locations for records
     const records = response.content?.records || 
                    response.content?.content?.records ||
                    response.content?.results ||
                    (Array.isArray(response.content) ? response.content : null);
     
     if (records && Array.isArray(records)) {
       // Preserve source metadata with each record
       ctx.lastResults = records.map(r => ({
         ...r,
         source: r.source || response.metadata?.source || ctx.lastSource || 'unknown'
       }));
       ctx.awaitingSelection = true;
       ctx.isVaultContent = records[0]?.source === 'vault' || response.metadata?.source === 'vault';
     }
   }

   // Handle selection completion
   if (requestType === 'selection' && request.selection) {
     ctx.lastSelection = request.selection;
     ctx.awaitingSelection = false;
   }
   
   // Handle selectedRecord from route handler responses
   if (response.content?.selectedRecord) {
     ctx.selectedRecord = response.content.selectedRecord;
     ctx.lastSelection = response.content.selectedRecord;
     ctx.awaitingSelection = false;
     ctx.isVaultContent = response.content.selectedRecord.source === 'vault' || ctx.lastSource === 'vault';
   }
   
   // Store persona momentum if available
   if (response.context?.locks?.persona?.momentum) {
     ctx.personaMomentum = response.context.locks.persona.momentum;
   }

   // Track conversation flow
   ctx.conversationFlow.push({
     type: requestType,
     timestamp: Date.now(),
     handled: response.metadata?.handled,
     persona: response.context?.locks?.persona?.detected,
     isVaultContent: ctx.isVaultContent
   });

   // Keep flow history reasonable
   if (ctx.conversationFlow.length > 50) {
     ctx.conversationFlow = ctx.conversationFlow.slice(-30);
   }

   // Allow handlers to update context through response
   if (response.context?.state) {
     Object.assign(ctx, response.context.state);
   }
 }

 // Get session context for reference
 getContext(sessionId) {
   const session = this.sessions.get(sessionId);
   return session ? { ...session.context } : null;
 }

 // Get last context (for "this/that" references)
 getLastContext(sessionId) {
   const session = this.sessions.get(sessionId);
   if (!session) return null;
   
   return {
     current: session.context.lastSelection || session.context.lastResults,
     previous: session.history[session.history.length - 2]?.response?.content,
     type: session.context.lastSelection ? 'selection' : 'results',
     isVaultContent: session.context.isVaultContent,
     source: session.context.lastSource
   };
 }

 // Get conversation history
 getHistory(sessionId, limit = 10) {
   const session = this.sessions.get(sessionId);
   if (!session) return [];
   
   const start = Math.max(0, session.history.length - limit);
   return session.history.slice(start);
 }

 // Clean expired sessions
 cleanExpiredSessions() {
   const now = Date.now();
   for (const [id, session] of this.sessions) {
     if (now - session.lastActive > this.sessionTimeout) {
       // Save persona momentum before deletion if available
       if (this.personaService && session.context.personaMomentum) {
         console.log(`Session ${id} ending with momentum:`, session.context.personaMomentum);
       }
       this.sessions.delete(id);
     }
   }
 }

 // Explicitly end a session
 endSession(sessionId) {
   const session = this.sessions.get(sessionId);
   if (session && this.personaService) {
     // Preserve momentum for next session
     const summary = {
       momentum: session.context.personaMomentum,
       lastPersona: session.context.conversationFlow.slice(-1)[0]?.persona,
       duration: Date.now() - session.created
     };
     console.log(`Session ended with summary:`, summary);
   }
   return this.sessions.delete(sessionId);
 }

 // Get active session count
 getSessionCount() {
   return this.sessions.size;
 }
}

// Factory function for creating a managed canal system
function createCanalSystem(dependencies = {}) {
 const canal = new Canal(dependencies);
 const sessionManager = new SessionManager(canal, dependencies);
 
 // Wire up default routes with proper context handling
 
 // Selection route - highest priority
 canal.route('selection', async (request, context) => {
   if (dependencies.vaultService) {
     const index = parseInt(request.input) - 1;
     const selected = await dependencies.vaultService.selectItem(index);
     
     // Mark as vault content and include system prompt if available
     const result = {
       ...selected,
       source: 'vault',
       metadata: { isVaultContent: true }
     };
     
     // If AI analysis requested with selection
     if (dependencies.modelManager && context.systemPrompt) {
       result.analysis = await dependencies.modelManager.query(
         `Analyze this selection: ${JSON.stringify(selected).slice(0, 500)}`,
         context.systemPrompt
       );
     }
     
     return result;
   }
   return { error: 'No vault service available' };
 }, 100);
 
 // Contextual references route
 canal.route('contextual', async (request, context) => {
   const lastContext = sessionManager.getLastContext(context.sessionId);
   
   if (!lastContext) {
     return { error: 'No context available. Please make a selection or query first.' };
   }
   
   // Include AI analysis if available
   if (dependencies.modelManager && context.systemPrompt) {
     const analysis = await dependencies.modelManager.query(
       `User referenced "${request.locks?.context?.referenceType}" - analyze: ${JSON.stringify(lastContext.current).slice(0, 500)}`,
       context.systemPrompt
     );
     
     return {
       ...lastContext,
       analysis
     };
   }
   
   return lastContext;
 }, 90);
 
 // Query route
 canal.route('query', async (request, context) => {
   if (dependencies.vaultService) {
     const results = await dependencies.vaultService.search(request.input);
     
     const response = {
       records: results.map(r => ({ ...r, source: 'vault' })),
       source: 'vault',
       metadata: { isVaultContent: true }
     };
     
     // Add AI summary if available
     if (dependencies.modelManager && context.systemPrompt && results.length > 0) {
       response.summary = await dependencies.modelManager.query(
         `Summarize these search results from MY vault: ${JSON.stringify(results).slice(0, 1000)}`,
         context.systemPrompt
       );
     }
     
     return response;
   }
   return { error: 'No vault service available' };
 }, 50);
 
 // Analysis route
 canal.route('analysis', async (request, context) => {
   if (!dependencies.modelManager) {
     return { error: 'Analysis requires model manager' };
   }
   
   // Get content to analyze
   let content = request.input;
   if (context.lastSelection) {
     content = `Analyze MY vault entry: ${JSON.stringify(context.lastSelection)}`;
   }
   
   const analysis = await dependencies.modelManager.query(
     content,
     context.systemPrompt || 'Provide thoughtful analysis.'
   );
   
   return {
     analysis,
     source: context.source || 'vault',
     metadata: { isVaultContent: context.isVaultContent }
   };
 }, 40);
 
 // Default fallback route
 canal.route('default', async (request, context) => {
   // If we have AI, use it with proper context
   if (dependencies.modelManager && context.systemPrompt) {
     return await dependencies.modelManager.query(
       request.input,
       context.systemPrompt
     );
   }
   
   return {
     message: 'Processed by default handler',
     input: request.input,
     type: request.type
   };
 }, 0);
 
 return {
   canal,
   sessionManager,
   
   // Convenience method for stateless processing
   process: (request, context) => canal.flow(request, context),
   
   // Convenience method for stateful processing (recommended)
   processWithSession: (sessionId, request) => sessionManager.process(sessionId, request),
   
   // Process with locks (for direct canal usage)
   processWithLocks: (input, context) => canal.processWithLocks(input, context)
 };
}

// Export everything
module.exports = {
 Canal,
 SessionManager,
 createCanalSystem
};

// Default export for simple use cases
module.exports.default = createCanalSystem();