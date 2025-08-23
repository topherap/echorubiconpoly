// MyAIInterface.js - Fixed with proper containment and layout
// Brain Region: Visual Cortex (V1/V2) - Renders user interface
// Subsystem: Fusiform Face Area - Recognizes message patterns
// Integration: Wernicke's Area - Processes language display

console.log('[STARTUP] MyAIInterface.js file loaded');

// ========== REACT DETECTION AND INITIALIZATION ==========
(function() {
 'use strict';
 
 console.log('[STARTUP] Checking React availability...');
 
 // Check if React is available
 if (typeof React === 'undefined') {
   console.error('[ERROR] React is not defined! Waiting for React...');
   
   // Set up a listener for when React becomes available
   let checkCount = 0;
   const maxChecks = 50; // 5 seconds max wait
   
   const checkReact = setInterval(() => {
     checkCount++;
     if (typeof React !== 'undefined') {
       console.log('[STARTUP] React detected after', checkCount * 100, 'ms');
       clearInterval(checkReact);
       initializeComponent();
     } else if (checkCount >= maxChecks) {
       console.error('[ERROR] React not found after 5 seconds - cannot initialize MyAIInterface');
       clearInterval(checkReact);
     }
   }, 100);
   
   return; // Exit early, will initialize when React is ready
 }
 
 // React is available, initialize immediately
 console.log('[STARTUP] React is available, initializing component');
 initializeComponent();
})();

// ========== MAIN COMPONENT INITIALIZATION ==========
function initializeComponent() {
 console.log('[INIT] Starting MyAIInterface component initialization');
 
 // Verify React is really available
 if (typeof React === 'undefined') {
   console.error('[INIT] React still undefined in initializeComponent!');
   return;
 }
 
 const h = React.createElement;
 console.log('[INIT] React.createElement acquired');
 
 // ========== MYAIINTERFACE COMPONENT ==========
 function MyAIInterface(props) {
   console.log('[COMPONENT] MyAIInterface render called');
   
   try {
     // ========== REACT HOOKS - ALL AT TOP LEVEL ==========
     console.log('[COMPONENT] Initializing hooks');
     
     // Screen size detection
     const [screenSize, setScreenSize] = React.useState(() => {
       if (typeof window !== 'undefined') {
         return {
           width: window.innerWidth,
           height: window.innerHeight,
           isMobile: window.innerWidth < 768,
           isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
           isDesktop: window.innerWidth >= 1024,
           isLarge: window.innerWidth >= 1440
         };
       }
       return { width: 1024, height: 768, isMobile: false, isTablet: false, isDesktop: true, isLarge: false };
     });
     
     // Local state - MUST be before any conditionals
     const [localState, setLocalState] = React.useState(() => {
       console.log('[STATE] Initializing localState');
       // Safe localStorage access in initializer
       let savedModel = 'mistral:latest';
       let savedUseAPI = false;
       try {
         if (typeof window !== 'undefined' && window.localStorage) {
           const stored = window.localStorage.getItem('selectedModel');
           if (stored) savedModel = stored;
           savedUseAPI = window.localStorage.getItem('useAPI') === 'true';
         }
       } catch (e) {
         console.warn('[STATE] Could not access localStorage:', e);
       }
       
       return {
         useAPI: savedUseAPI,
         selectedModel: savedModel,
         modelOptions: ['mistral:latest', 'dolphin-mistral:latest', 'openchat:latest', 'granite3.3:2b'],
         apiModelOptions: ['gpt-3.5-turbo', 'gpt-4', 'claude-2', 'claude-instant']
       };
     });
     
     const [modelsLoaded, setModelsLoaded] = React.useState(false);
     const [localVoicePrompt, setLocalVoicePrompt] = React.useState('');
     const [localIsSettingsOpen, setLocalIsSettingsOpen] = React.useState(false);
     const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
       // Auto-collapse sidebar on smaller screens
       return typeof window !== 'undefined' && window.innerWidth < 1024;
     });
     
     console.log('[COMPONENT] Hooks initialized');
     
     // Create refs - at top level
     const localChatContainerRef = React.useRef(null);
     
     // ========== PROPS WITH SAFE DEFAULTS ==========
     const messages = props?.messages || [];
     const theme = props?.theme || 'white-rabbit';
     const status = props?.status || 'Connected';
     const isListening = props?.isListening || false;
     const isProcessing = props?.isProcessing || false;
     const isVoiceLoading = props?.isVoiceLoading || false;
     const voiceEnabled = props?.voiceEnabled || false;
     const hotwordActive = props?.hotwordActive || false;
     const isHotwordLoading = props?.isHotwordLoading || false;
     
     // Function props with safe checks
     const setMessages = (typeof props?.setMessages === 'function') ? props.setMessages : null;
     const setVoicePrompt = (typeof props?.setVoicePrompt === 'function') ? props.setVoicePrompt : null;
     const sendVoiceCommand = (typeof props?.sendVoiceCommand === 'function') ? props.sendVoiceCommand : null;
     const handleMicClick = (typeof props?.handleMicClick === 'function') ? props.handleMicClick : null;
     const toggleVoice = (typeof props?.toggleVoice === 'function') ? props.toggleVoice : null;
     const toggleHotword = (typeof props?.toggleHotword === 'function') ? props.toggleHotword : null;
     
     // ========== EFFECTS - ALL AT TOP LEVEL ==========
     
     // Single consolidated style injection
     React.useEffect(() => {
       // Add viewport meta for mobile
       let metaViewport = document.querySelector('meta[name="viewport"]');
       if (!metaViewport) {
         metaViewport = document.createElement('meta');
         metaViewport.name = 'viewport';
         metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
         document.head.appendChild(metaViewport);
       }
       
       // Remove any old conflicting styles first
       ['myai-global-reset', 'myai-override-styles', 'myai-consolidated-styles'].forEach(id => {
         const oldStyle = document.getElementById(id);
         if (oldStyle) oldStyle.remove();
       });
       
       // Add single consolidated style sheet
       const styles = document.createElement('style');
       styles.id = 'myai-consolidated-styles';
       styles.textContent = `
         /* Global reset */
         * {
           box-sizing: border-box;
         }
         
         html, body {
           margin: 0;
           padding: 0;
           width: 100%;
           height: 100%;
           overflow: hidden;
         }
         
         /* Main container structure */
         .login-overlay-wrapper {
           width: 100vw;
           height: 100vh;
           margin: 0;
           padding: 0;
           position: fixed;
           top: 0;
           left: 0;
         }
         
         .myai-container {
           width: 100%;
           height: 100%;
           display: flex;
           margin: 0;
           padding: 0;
         }
         
         /* Sidebar styles */
         .sidebar {
           background: #1a1a1a;
           border-right: 1px solid #333;
           display: flex;
           flex-direction: column;
           position: relative;
           height: 100vh;
           transition: width 0.3s ease;
         }
         
         .sidebar.collapsed .sidebar-content {
           display: none;
         }
         
         /* Main content area */
         .main-content {
           flex: 1;
           display: flex;
           flex-direction: column;
           height: 100vh;
           min-width: 0;
           position: relative;
           overflow: hidden;
         }
         
         /* Status bar */
         .status-bar {
           flex-shrink: 0;
           padding: 4px 8px;
           border-bottom: 1px solid #333;
           background: #2a2a2a;
           color: #999;
           font-size: 12px;
         }
         
         /* Chat container */
         .chat-container {
           flex: 1;
           overflow-y: auto;
           overflow-x: hidden;
           padding: 16px;
           padding-bottom: 140px; /* Space for input section */
         }
         
         /* Input section - properly contained */
         .voice-section {
           position: absolute;
           bottom: 0;
           left: 0;
           right: 0;
           padding: 12px;
           background: #1a1a1a;
           border-top: 1px solid #333;
           z-index: 10;
         }
         
         /* Input container */
         .voice-input-container {
           display: flex;
           gap: 8px;
           align-items: flex-end;
           margin-bottom: 8px;
         }
         
         .voice-input-container textarea {
           flex: 1;
           min-height: 36px;
           max-height: 100px;
           padding: 8px;
           background: #2a2a2a;
           border: 1px solid #444;
           border-radius: 4px;
           color: #fff;
           resize: none;
           font-family: inherit;
           font-size: 14px;
         }
         
         /* Buttons */
         .mic-button, .icon-button {
           padding: 8px 12px;
           background: #333;
           border: 1px solid #555;
           border-radius: 4px;
           color: #fff;
           cursor: pointer;
           white-space: nowrap;
           flex-shrink: 0;
           font-size: 14px;
         }
         
         .mic-button:hover, .icon-button:hover {
           background: #444;
         }
         
         .mic-button.listening {
           background: #8b0000;
           animation: pulse 1.5s infinite;
         }
         
         @keyframes pulse {
           0% { opacity: 1; }
           50% { opacity: 0.7; }
           100% { opacity: 1; }
         }
         
         /* Model selector */
         .model-selector {
           display: flex;
           gap: 10px;
           align-items: center;
           flex-wrap: wrap;
           margin-bottom: 8px;
         }
         
         .model-selector label {
           display: flex;
           align-items: center;
           color: #ccc;
           font-size: 13px;
         }
         
         .model-selector input[type="checkbox"] {
           margin-right: 5px;
         }
         
         .model-selector select {
           padding: 4px 8px;
           background: #2a2a2a;
           border: 1px solid #444;
           border-radius: 4px;
           color: #fff;
           font-size: 13px;
           min-width: 150px;
         }
         
         /* Controls bar */
         .controls-bar {
           display: flex;
           gap: 8px;
           flex-wrap: wrap;
         }
         
         .controls-bar button {
           padding: 6px 10px;
           font-size: 12px;
           background: #2a2a2a;
           border: 1px solid #444;
           border-radius: 3px;
           color: #fff;
           cursor: pointer;
         }
         
         .controls-bar button:hover {
           background: #333;
         }
         
         /* Message styles */
         .chat-message {
           display: flex;
           gap: 12px;
           margin-bottom: 16px;
         }
         
         .message-avatar {
           flex-shrink: 0;
           width: 32px;
           height: 32px;
           display: flex;
           align-items: center;
           justify-content: center;
           background: #2a2a2a;
           border-radius: 50%;
           font-size: 18px;
         }
         
         .message-content-wrapper {
           flex: 1;
           min-width: 0;
         }
         
         .message-speaker {
           font-size: 12px;
           color: #999;
           margin-bottom: 4px;
         }
         
         .message-bubble {
           background: #2a2a2a;
           padding: 12px;
           border-radius: 8px;
           word-wrap: break-word;
           color: #fff;
         }
         
         .user-message .message-bubble {
           background: #1e3a5f;
         }
         
         .message-timestamp {
           font-size: 11px;
           color: #666;
           margin-top: 4px;
         }
         
         .message-feedback {
           margin-top: 8px;
           display: flex;
           gap: 8px;
         }
         
         .feedback-btn {
           background: transparent;
           border: 1px solid #444;
           border-radius: 4px;
           padding: 4px 8px;
           cursor: pointer;
           font-size: 14px;
         }
         
         .feedback-btn:hover {
           background: #333;
         }
         
         .empty-chat {
           text-align: center;
           color: #666;
           padding: 40px;
           font-style: italic;
         }
         
         /* Code blocks */
         .code-block {
           background: #1a1a1a;
           border-radius: 4px;
           margin: 8px 0;
           overflow: hidden;
         }
         
         .code-header {
           display: flex;
           justify-content: space-between;
           align-items: center;
           padding: 8px 12px;
           background: #0d0d0d;
           border-bottom: 1px solid #333;
         }
         
         .code-language {
           color: #999;
           font-size: 12px;
         }
         
         .copy-button {
           padding: 4px 8px;
           background: #333;
           border: 1px solid #555;
           border-radius: 3px;
           color: #fff;
           cursor: pointer;
           font-size: 12px;
         }
         
         .copy-button:hover {
           background: #444;
         }
         
         .code-block pre {
           margin: 0;
           padding: 12px;
           overflow-x: auto;
         }
         
         .code-block code {
           font-family: 'Consolas', 'Monaco', monospace;
           font-size: 13px;
           line-height: 1.5;
         }
         
         .inline-code {
           background: #2a2a2a;
           padding: 2px 6px;
           border-radius: 3px;
           font-family: monospace;
           font-size: 0.9em;
         }
         
         /* Syntax highlighting */
         .token.keyword { color: #ff79c6; }
         .token.string { color: #f1fa8c; }
         .token.number { color: #bd93f9; }
         .token.comment { color: #6272a4; }
         .token.function { color: #50fa7b; }
         .token.operator { color: #ff79c6; }
         
         /* Responsive adjustments */
         @media (max-width: 768px) {
           .chat-container {
             padding: 8px;
             padding-bottom: 160px;
           }
           
           .voice-section {
             padding: 8px;
           }
           
           .controls-bar {
             justify-content: space-around;
           }
           
           .model-selector {
             width: 100%;
           }
           
           .model-selector select {
             width: 100%;
           }
           
           .sidebar {
             position: fixed;
             z-index: 100;
           }
           
           .sidebar.collapsed {
             width: 0 !important;
           }
         }
       `;
       document.head.appendChild(styles);
     }, []);
     
     // Screen resize handler
     React.useEffect(() => {
       const handleResize = () => {
         const newSize = {
           width: window.innerWidth,
           height: window.innerHeight,
           isMobile: window.innerWidth < 768,
           isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
           isDesktop: window.innerWidth >= 1024,
           isLarge: window.innerWidth >= 1440
         };
         setScreenSize(newSize);
         
         // Auto-collapse sidebar on mobile
         if (newSize.isMobile && !sidebarCollapsed) {
           setSidebarCollapsed(true);
         }
       };
       
       window.addEventListener('resize', handleResize);
       return () => window.removeEventListener('resize', handleResize);
     }, [sidebarCollapsed]);
     
     // Fetch models effect
     React.useEffect(() => {
       console.log('[EFFECT] Fetching Ollama models');
       const timer = setTimeout(() => {
         fetch('http://localhost:11434/api/tags')
           .then(res => res.json())
           .then(data => {
             if (data.models && data.models.length > 0) {
               const modelNames = data.models.map(m => m.name);
               console.log('[EFFECT] Found Ollama models:', modelNames);
               
               setLocalState(prev => ({
                 ...prev,
                 modelOptions: modelNames
               }));
               setModelsLoaded(true);
             }
           })
           .catch(err => {
             console.error('[EFFECT] Using fallback model list:', err);
             setModelsLoaded(true);
           });
       }, 100);

       return () => clearTimeout(timer);
     }, []);
     
     // Auto-scroll effect
     const actualChatContainerRef = props?.chatContainerRef || localChatContainerRef;
     React.useEffect(() => {
       if (actualChatContainerRef?.current) {
         const container = actualChatContainerRef.current;
         requestAnimationFrame(() => {
           container.scrollTo({
             top: container.scrollHeight,
             behavior: 'smooth'
           });
         });
       }
     }, [messages.length]);
     
     // ========== COMPUTED VALUES ==========
     const actualUseAPI = props?.useAPI !== undefined ? props.useAPI : localState.useAPI;
     const actualLocalModelOptions = (props?.localModelOptions?.length > 0) ? props.localModelOptions : localState.modelOptions;
     const actualAPIModelOptions = (props?.apiModelOptions?.length > 0) ? props.apiModelOptions : localState.apiModelOptions;
     const actualSelectedLocalModel = props?.selectedLocalModel || localState.selectedModel;
     const actualSelectedAPIModel = props?.selectedAPIModel || 'gpt-3.5-turbo';
     const actualVoicePrompt = setVoicePrompt ? (props?.voicePrompt || '') : localVoicePrompt;
     const actualSetVoicePrompt = setVoicePrompt || setLocalVoicePrompt;
     
     // ========== HANDLER FUNCTIONS ==========
     
     // Toggle API handler
     const actualToggleUseAPI = (checked) => {
       console.log('[HANDLER] Toggle API:', checked);
       if (props?.toggleUseAPI && typeof props.toggleUseAPI === 'function') {
         props.toggleUseAPI(checked);
       } else {
         setLocalState(prev => ({ ...prev, useAPI: checked }));
         try {
           if (typeof window !== 'undefined' && window.localStorage) {
             window.localStorage.setItem('useAPI', checked.toString());
           }
         } catch (e) {
           console.warn('[HANDLER] Could not save to localStorage:', e);
         }
       }
     };

     // Model change handlers
     const actualHandleLocalModelChange = (model) => {
       console.log('[HANDLER] Local model change:', model);
       if (props?.handleLocalModelChange && typeof props.handleLocalModelChange === 'function') {
         props.handleLocalModelChange(model);
       } else {
         try {
           if (typeof window !== 'undefined' && window.localStorage) {
             window.localStorage.setItem('selectedModel', model);
           }
         } catch (e) {
           console.warn('[HANDLER] Could not save to localStorage:', e);
         }
         setLocalState(prev => ({ ...prev, selectedModel: model }));
         window.dispatchEvent(new CustomEvent('modelChanged', { detail: { model, type: 'local' } }));
       }
     };

     const actualHandleAPIModelChange = (model) => {
       console.log('[HANDLER] API model change:', model);
       if (props?.handleAPIModelChange && typeof props.handleAPIModelChange === 'function') {
         props.handleAPIModelChange(model);
       } else {
         try {
           if (typeof window !== 'undefined' && window.localStorage) {
             window.localStorage.setItem('selectedAPIModel', model);
           }
         } catch (e) {
           console.warn('[HANDLER] Could not save to localStorage:', e);
         }
         window.dispatchEvent(new CustomEvent('modelChanged', { detail: { model, type: 'api' } }));
       }
     };
     
     // Send command handler
     const actualSendVoiceCommand = () => {
       if (!actualVoicePrompt?.trim()) return;
       
       console.log('[HANDLER] Send command:', actualVoicePrompt.substring(0, 50));
       
       if (sendVoiceCommand) {
         sendVoiceCommand();
       } else {
         const event = new CustomEvent('sendMessage', { 
           detail: { 
             content: actualVoicePrompt,
             model: actualUseAPI ? actualSelectedAPIModel : actualSelectedLocalModel,
             useAPI: actualUseAPI
           } 
         });
         window.dispatchEvent(event);
       }
       
       actualSetVoicePrompt('');
     };

     // Mic handler with Web Speech API
     const actualHandleMicClick = () => {
       console.log('[HANDLER] Mic click');
       
       // Try Web Speech API first
       if ('webkitSpeechRecognition' in window) {
         const recognition = new webkitSpeechRecognition();
         recognition.continuous = false;
         recognition.interimResults = false;
         recognition.lang = 'en-US';
         
         recognition.onstart = () => {
           console.log('[SPEECH] Recognition started');
         };
         
         recognition.onresult = (event) => {
           const transcript = event.results[0][0].transcript;
           console.log('[SPEECH] Recognized:', transcript);
           actualSetVoicePrompt(transcript);
         };
         
         recognition.onerror = (event) => {
           console.error('[SPEECH] Recognition error:', event.error);
           if (handleMicClick) {
             handleMicClick();
           } else {
             const customEvent = new CustomEvent('microphoneToggle', { detail: { isListening } });
             window.dispatchEvent(customEvent);
           }
         };
         
         recognition.onend = () => {
           console.log('[SPEECH] Recognition ended');
         };
         
         try {
           recognition.start();
         } catch (e) {
           console.error('[SPEECH] Failed to start recognition:', e);
           if (handleMicClick) {
             handleMicClick();
           }
         }
       } else if (handleMicClick) {
         handleMicClick();
       } else {
         const event = new CustomEvent('microphoneToggle', { detail: { isListening } });
         window.dispatchEvent(event);
       }
     };
     
     // Upload handler
     const uploadClick = () => {
       console.log('[HANDLER] Upload clicked');
       
       const fileInput = document.createElement('input');
       fileInput.type = 'file';
       fileInput.accept = '.txt,.md,.json,.csv,.pdf,.doc,.docx';
       fileInput.multiple = true;
       
       fileInput.onchange = (e) => {
         const files = Array.from(e.target.files);
         console.log('[HANDLER] Files selected:', files.map(f => f.name));
         
         files.forEach(file => {
           const reader = new FileReader();
           reader.onload = (e) => {
             const content = e.target.result;
             console.log('[HANDLER] File loaded:', file.name);
             
             if (setMessages) {
               const fileMessage = {
                 id: Date.now() + Math.random(),
                 type: 'system',
                 content: `📄 **File uploaded: ${file.name}**\n\n${content}`,
                 timestamp: new Date().toISOString()
               };
               setMessages(prev => [...prev, fileMessage]);
             }
           };
           reader.readAsText(file);
         });
       };
       
       fileInput.click();
     };

     // Mark response function for feedback buttons
     const markResponse = async (messageId, isAccurate) => {
       if (!isAccurate && window.electronAPI) {
         try {
           const lastCapsuleId = await window.electronAPI.invoke('capsule:getLastId');
           if (lastCapsuleId) {
             const result = await window.electronAPI.invoke('capsule:markInaccurate', lastCapsuleId);
             console.log('[HANDLER] Marked capsule as inaccurate:', lastCapsuleId, result);
           }
         } catch (e) {
           console.error('[HANDLER] Error marking response:', e);
         }
       }
     };
     
     // ========== RENDER ==========
     console.log('[RENDER] Building component tree');
     
     return h('div', { 
       className: 'login-overlay-wrapper ' + theme
     }, [
       h('div', { 
         className: 'myai-container ' + theme
       }, [
         props?.showDevPanel && props?.DevPanel && h(props.DevPanel),
       
         // Sidebar section
         h('div', { 
           key: 'sidebar', 
           className: 'sidebar' + (sidebarCollapsed ? ' collapsed' : ''),
           style: {
             width: sidebarCollapsed ? '60px' : (screenSize.isMobile ? '200px' : '250px')
           }
         }, [
           // Sidebar toggle button
           h('button', {
             onClick: () => {
               console.log('[SIDEBAR] Toggle clicked');
               setSidebarCollapsed(!sidebarCollapsed);
             },
             style: {
               position: 'absolute',
               right: '10px',
               top: '10px',
               zIndex: 100,
               background: '#333',
               border: '1px solid #555',
               borderRadius: '4px',
               padding: '5px 10px',
               cursor: 'pointer',
               color: '#fff',
               fontSize: '18px'
             },
             title: sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
           }, sidebarCollapsed ? '→' : '←'),
           
           // Sidebar content
           h('div', { 
             className: 'sidebar-content',
             style: {
               paddingTop: '50px'
             }
           }, [
             (window.ProjectSidebar && h(window.ProjectSidebar, {
               currentProject: props?.currentProject,
               onProjectSelect: props?.setCurrentProject,
               onNewChat: () => {
                 if (setMessages) setMessages([]);
                 actualSetVoicePrompt('');
                 console.log('[SIDEBAR] New chat started');
               }
             })) || h('div', { className: 'sidebar-placeholder' }, 'Projects')
           ])
         ]),

         // Main content area
         h('div', { 
           key: 'main', 
           className: 'main-content'
         }, [
           // Status bar
           h('div', { 
             className: 'status-bar'
           }, [
             h('span', { className: 'status-text' }, status)
           ]),

           // Chat messages display
           h('div', {
             className: 'chat-container',
             ref: actualChatContainerRef
           },
             messages.length > 0 ?
               messages.map((msg, index) => 
                 h('div', {
                   key: `msg-${msg.id || index}`,
                   className: `chat-message ${msg.type}-message`
                 }, [
                   // Avatar
                   h('div', { className: 'message-avatar' }, 
                     msg.type === 'user' ? '👤' : '🤖'
                   ),
                   
                   // Message content
                   h('div', { className: 'message-content-wrapper' }, [
                     h('div', { className: 'message-speaker' }, 
                       msg.type === 'user' ? 'You' : 'Echo'
                     ),
                     
                     h('div', { 
                       className: 'message-bubble',
                       dangerouslySetInnerHTML: { 
                         __html: processMessageContent(msg.content) 
                       }
                     }),
                     
                     msg.timestamp && h('div', { className: 'message-timestamp' }, 
                       new Date(msg.timestamp).toLocaleTimeString([], { 
                         hour: '2-digit', 
                         minute: '2-digit' 
                       })
                     ),
                     
                     msg.type === 'ai' && h('div', { className: 'message-feedback' }, [
                       h('button', {
                         className: 'feedback-btn',
                         onClick: () => markResponse(msg.id, true),
                         title: 'Good response'
                       }, '👍'),
                       h('button', {
                         className: 'feedback-btn', 
                         onClick: () => markResponse(msg.id, false),
                         title: 'Incorrect response'
                       }, '👎')
                     ])
                   ])
                 ])
               ) :
               h('div', { className: 'empty-chat' }, 
                 'Start a conversation by typing a message or clicking the microphone.'
               )
           ),
           
           // Voice input section
           h('div', { 
             className: 'voice-section'
           }, [
             h('div', { 
               className: 'voice-input-container'
             }, [
               // Mic button
               h('button', {
                 className: 'mic-button' + (isListening ? ' listening' : ''),
                 onClick: actualHandleMicClick,
                 disabled: isVoiceLoading
               }, '🎤'),

               // Text input
               h('textarea', {
                 value: actualVoicePrompt,
                 onChange: (e) => {
                   actualSetVoicePrompt(e.target.value);
                   e.target.style.height = 'auto';
                   e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                 },
                 onKeyDown: props?.handleKeyPress || ((e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     actualSendVoiceCommand();
                   }
                 }),
                 placeholder: 'Ask me anything...',
                 rows: 1
               }),

               // Send button
               h('button', {
                 className: 'icon-button',
                 onClick: actualSendVoiceCommand,
                 disabled: !actualVoicePrompt?.trim()
               }, isProcessing ? 'Stop' : 'Send')
             ]),

             // Model selector
             h('div', { 
               className: 'model-selector'
             }, [
               h('label', null, [
                 h('input', {
                   type: 'checkbox',
                   checked: actualUseAPI,
                   onChange: (e) => actualToggleUseAPI(e.target.checked)
                 }),
                 ' Use API'
               ]),
               h('select', {
                 value: actualUseAPI ? actualSelectedAPIModel : actualSelectedLocalModel,
                 onChange: (e) => {
                   if (actualUseAPI) {
                     actualHandleAPIModelChange(e.target.value);
                   } else {
                     actualHandleLocalModelChange(e.target.value);
                   }
                 }
               }, 
                 (actualUseAPI ? actualAPIModelOptions : actualLocalModelOptions).map((option, index) => {
                   const value = typeof option === 'string' ? option : option.value;
                   return h('option', { key: `model-${index}`, value }, value);
                 })
               )
             ]),

             // Controls bar
             h('div', { className: 'controls-bar' }, [
               h('button', {
                 onClick: () => {
                   if (setMessages) setMessages([]);
                   actualSetVoicePrompt('');
                 },
                 title: 'New chat'
               }, 'New'),
               
               h('button', {
                 onClick: () => {
                   if (toggleVoice) toggleVoice();
                   else window.dispatchEvent(new CustomEvent('toggleVoice'));
                 },
                 title: 'Voice output'
               }, 'Voice'),
               
               h('button', {
                 onClick: uploadClick,
                 title: 'Upload file'
               }, 'Upload'),
               
               h('button', {
                 onClick: () => {
                   if (toggleHotword) toggleHotword();
                   else window.dispatchEvent(new CustomEvent('toggleHotword'));
                 },
                 title: 'Wake word'
               }, 'Wake'),
               
               h('button', {
                 onClick: () => {
                   if (window.SettingsPanel?.init) {
                     window.SettingsPanel.init();
                   } else if (props?.setIsSettingsOpen) {
                     props.setIsSettingsOpen(true);
                   }
                 },
                 title: 'Settings'
               }, 'Settings')
             ])
           ])
         ])
       ])
     ]);
     
   } catch (error) {
     console.error('[ERROR] Component render failed:', error);
     return h('div', { 
       style: { 
         padding: '20px', 
         color: 'red', 
         background: '#fee', 
         border: '1px solid red',
         borderRadius: '4px',
         margin: '20px'
       } 
     }, [
       h('h3', null, 'MyAIInterface Error'),
       h('p', null, error.message),
       h('pre', { style: { fontSize: '12px' } }, error.stack)
     ]);
   }
 }

 // ========== MESSAGE PROCESSING FUNCTIONS ==========
 
 function processMessageContent(content) {
   if (!content) return '';
   
   try {
     if (window.marked && typeof window.marked.parse === 'function') {
       return processMessageWithMarked(content);
     } else {
       return processMessageBasic(content);
     }
   } catch (error) {
     console.error('[PROCESS] Message processing error:', error);
     return processMessageBasic(content);
   }
 }
 
 function processMessageWithMarked(content) {
   const marked = window.marked;
   
   marked.setOptions({
     breaks: true,
     gfm: true,
     headerIds: false,
     mangle: false,
     sanitize: false
   });
   
   let processed = marked.parse(content);
   
   // Convert [[Obsidian links]]
   processed = processed.replace(/\[\[([^\]]+)\]\]/g, (match, noteName) => {
     const vaultName = window.currentVaultName || 'Obsidian Vault';
     const obsidianUrl = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(noteName)}`;
     return `<a href="#" class="obsidian-link" onclick="if(window.electronAPI) window.electronAPI.openExternal('${obsidianUrl}'); return false;" title="Open in Obsidian: ${noteName}">📝 ${noteName}</a>`;
   });
   
   // Handle code blocks
   processed = processed.replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g, 
     (match, lang, code) => {
       const textarea = document.createElement('textarea');
       textarea.innerHTML = code;
       const decodedCode = textarea.value;
       
       return `
         <div class="code-block">
           <div class="code-header">
             <span class="code-language">${lang}</span>
             <button class="copy-button" onclick="window.copyCodeToClipboard(this)">Copy</button>
           </div>
           <pre><code>${highlightCode(decodedCode, lang)}</code></pre>
         </div>
       `;
     });
   
   // Enhance other elements
   processed = processed.replace(/<code>([^<]+)<\/code>/g, '<span class="inline-code">$1</span>');
   
   return processed;
 }
 
 function processMessageBasic(content) {
   let processed = content
     .replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;');
   
   // Code blocks
   processed = processed.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
     const language = lang || 'plaintext';
     return `
       <div class="code-block">
         <div class="code-header">
           <span class="code-language">${language}</span>
           <button class="copy-button" onclick="window.copyCodeToClipboard(this)">Copy</button>
         </div>
         <pre><code>${highlightCode(code.trim(), language)}</code></pre>
       </div>
     `;
   });
   
   // Inline code
   processed = processed.replace(/`([^`]+)`/g, '<span class="inline-code">$1</span>');
   
   // Basic markdown
   processed = processed
     .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
     .replace(/\*([^*]+)\*/g, '<em>$1</em>')
     .replace(/\n/g, '<br>');
   
   return processed;
 }
 
 function highlightCode(code, language) {
   // Basic syntax highlighting
   let highlighted = code;
   
   const keywords = /\b(function|const|let|var|if|else|for|while|return|class|import|export|from|async|await)\b/g;
   const strings = /(["'`])(?:(?=(\\?))\2.)*?\1/g;
   const numbers = /\b\d+\.?\d*\b/g;
   
   if (['javascript', 'typescript', 'js', 'ts'].includes(language)) {
     highlighted = highlighted
       .replace(strings, '<span class="token string">$&</span>')
       .replace(keywords, '<span class="token keyword">$&</span>')
       .replace(numbers, '<span class="token number">$&</span>');
   }
   
   return highlighted;
 }

 // ========== GLOBAL UTILITY FUNCTIONS ==========
 
 window.copyCodeToClipboard = function(button) {
   try {
     const codeBlock = button.closest('.code-block');
     const code = codeBlock.querySelector('code').textContent;
     
     if (navigator.clipboard && navigator.clipboard.writeText) {
       navigator.clipboard.writeText(code).then(() => {
         const originalText = button.textContent;
         button.textContent = 'Copied!';
         setTimeout(() => {
           button.textContent = originalText;
         }, 2000);
       });
     } else {
       // Fallback for older browsers
       const textarea = document.createElement('textarea');
       textarea.value = code;
       textarea.style.position = 'fixed';
       textarea.style.opacity = '0';
       document.body.appendChild(textarea);
       textarea.select();
       document.execCommand('copy');
       document.body.removeChild(textarea);
       
       button.textContent = 'Copied!';
       setTimeout(() => {
         button.textContent = 'Copy';
       }, 2000);
     }
   } catch (e) {
     console.error('[COPY] Failed to copy:', e);
   }
 };

 // ========== COMPONENT REGISTRATION ==========
 console.log('[REGISTER] Starting component registration');
 
 try {
   // Initialize registry if needed
   window.MyAIRegistry = window.MyAIRegistry || {
     components: {},
     register(name, component) {
       console.log(`[REGISTER] Registering component: ${name}`);
       this.components[name] = component;
       component._isRegistered = true;
       
       // Dispatch ready event
       const event = new CustomEvent('MyAI-ready', { 
         detail: { name, component } 
       });
       window.dispatchEvent(event);
       return true;
     }
   };
   
   // Register the component
   window.MyAIRegistry.register('MyAIInterface', MyAIInterface);
   window.MyAIInterface = MyAIInterface;
   
   console.log('[SUCCESS] MyAIInterface is ready and working!');
   
   // Dispatch a custom event to signal that the component is ready
   window.dispatchEvent(new CustomEvent('MyAIInterface-loaded', {
     detail: { component: MyAIInterface }
   }));
   
 } catch (error) {
   console.error('[REGISTER] Registration failed:', error);
 }
}

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
 module.exports = { initializeComponent };
}