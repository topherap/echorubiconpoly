
(function () {
  'use strict';

  console.log('[DEBUG-INIT] MyAI-global.js initializing...');

  // React global check
  if (typeof window.React === 'undefined' || typeof window.ReactDOM === 'undefined') {
    console.error('[MyAI] React not available, deferring...');
    setTimeout(function() {
      if (window.init) window.init();
    }, 100);
    return;
  }

  // Extract React hooks from global React object
  var React = window.React;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useCallback = React.useCallback;
  var useRef = React.useRef;
  var h = React.createElement;
var DevPanel = require('./legacy/DevPanel.jsx');
var ObsidianNotes = require('./legacy/ObsidianNotes.jsx');
var SettingsPanel = require('./legacy/SettingsPanel.jsx');

  // Asset paths
  var HotwordIcon = './components/assets/hotword.png';
  var SendIcon = './components/assets/send.png';
  var NotesIcon = './components/assets/notes.png';
  var SyncIcon = './components/assets/sync.png';
  var SettingsIcon = './components/assets/settings.png';
  var GlobalUploadIcon = './components/assets/UPL.png';
  var MicIcon = './components/assets/mic.png';
  var PrivateSyncIcon = './components/assets/private sync.png';
  var UploadIcon = './components/assets/UPL.png';

  // REPLACE WITH THIS DYNAMIC FUNCTION:
  var getAuthChallenge = function() {
    if (window.AuthChallenge && typeof window.AuthChallenge === 'function') {
      console.log('[DEBUG-AUTH-CHALLENGE] Using real AuthChallenge component');
      return window.AuthChallenge;
    }
    
    console.log('[DEBUG-AUTH-CHALLENGE] AuthChallenge component not available yet');
    return function FallbackAuthChallenge(props) {
      return h('div', { className: 'auth-challenge-fallback' }, [
        h('h2', null, 'Loading security module...'),
        h('p', null, 'If this persists, check console for errors.'),
        h('button', { onClick: function() { window.location.reload(); } }, 'Retry')
      ]);
    };
  };

  // Available themes
  var availableThemes = ['white-rabbit', 'minimalist-winter', 'haiku', 'hemingway'];

  var injectMemoryContext = require('./contextBuilder').injectMemoryContext;


  // Helper function to format unknown model labels nicely
  var formatLabel = function(value) {
    console.log('[DEBUG-FORMAT-LABEL] Formatting:', value);
    return value.replace(/[-_]/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  };

  // Enhanced function to merge known and discovered models with metadata preservation
var mergeModelOptions = function(knownList, discoveredList) {
  console.log('[DEBUG-MERGE-MODELS] Merging model lists:', { known: knownList.length, discovered: discoveredList?.length || 0 });
  
  if (discoveredList && discoveredList.length > 0) {
    return discoveredList.map(function(discovered) {
      if (typeof discovered === 'object') {
        return {
          value: discovered.value,
          label: discovered.label || formatLabel(discovered.value),
          provider: discovered.provider || 'Unknown',
          type: discovered.type || 'unknown',
          tier: discovered.tier || 'unknown',
          capabilities: discovered.capabilities || [],
          contextLimit: discovered.contextLimit || 4096,
          status: discovered.status || 'unknown',
          license: discovered.license || 'Unknown',
          performance: discovered.performance || { successRate: 0, latency: 0 },
          benchmarks: discovered.benchmarks || { qualityScore: 0, reasoningScore: 0 }
        };
      }
      return {
        value: discovered,
        label: formatLabel(discovered),
        provider: 'Unknown',
        type: 'unknown',
        tier: 'unknown',
        capabilities: [],
        contextLimit: 4096,
        status: 'unknown',
        license: 'Unknown',
        performance: { successRate: 0, latency: 0 },
        benchmarks: { qualityScore: 0, reasoningScore: 0 }
      };
    });
  }
  return knownList;
};
// Storage utility for auth - uses sessionStorage for auth, localStorage for preferences
const authStorage = {
  setAuth: (key, value) => sessionStorage.setItem(key, value),
  getAuth: (key) => sessionStorage.getItem(key),
  removeAuth: (key) => sessionStorage.removeItem(key),
  clearAllAuth: () => {
    // Clear all auth-related items from both storages
    ['echo_auth_session', 'echo_auth_timestamp', 'echo_rubicon_token', 'echoAuthenticated'].forEach(key => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
  }
};
// ========== UNIFIED PERSISTENCE SYSTEM ==========
// ADD THIS SECTION RIGHT HERE
var STORAGE_KEYS = {
  AUTH_STATE: 'echo-auth-state',
  SELECTED_LOCAL_MODEL: 'echo-selected-local-model',
  SELECTED_API_MODEL: 'echo-selected-api-model',
  USER_NAME: 'echo-user-name',
  AI_NAME: 'echo-ai-name',
  VOICE_ENABLED: 'echo-voice-enabled',
  ONBOARDING_COMPLETE: 'echo-onboarding-complete'
};

// Save all app state
var saveAppState = function(authState, selectedLocalModel, selectedAPIModel, userName, assistantName, voiceEnabled) {
  var state = {
    authComplete: authState ? authState.isAuthenticated : false,
    selectedLocalModel: selectedLocalModel,
    selectedAPIModel: selectedAPIModel,
    userName: userName,
    aiName: assistantName,
    voiceEnabled: voiceEnabled,
    onboardingComplete: true,
    lastSaved: Date.now()
  };
  
  localStorage.setItem('echo-app-state', JSON.stringify(state));
  console.log('[PERSISTENCE] Saved app state:', state);
};

// Load all app state
var loadAppState = function() {
  try {
    var saved = localStorage.getItem('echo-app-state');
    if (saved) {
      var state = JSON.parse(saved);
      console.log('[PERSISTENCE] Loading saved state:', state);
      return state;
    }
  } catch (e) {
    console.error('[PERSISTENCE] Failed to load state:', e);
  }
  return null;
};

// Add reset function for testing
window.resetEchoState = function() {
  localStorage.removeItem('echo-app-state');
  Object.values(STORAGE_KEYS).forEach(function(key) {
    localStorage.removeItem(key);
  });
  console.log('[RESET] All saved state cleared');
  location.reload();
};
// ========== END PERSISTENCE SYSTEM ==========

// Global stop function for all audio
window.stopAllAudio = function() {
  // Stop speech synthesis
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
  
  // Stop any typewriter effect
  if (window.currentTypewriterInterval) {
    clearInterval(window.currentTypewriterInterval);
    window.currentTypewriterInterval = null;
  }
  
  // Abort any pending requests
  if (window.currentRequestController) {
    window.currentRequestController.abort();
  }
  
  // Stop any audio elements
  var audioElements = document.querySelectorAll('audio');
  audioElements.forEach(function(audio) {
    audio.pause();
    audio.currentTime = 0;
  });
  
  console.log('[AUDIO] All audio stopped');
};
  // Mock logToObsidianMaster function
  var logToObsidianMaster = function(data) {
    console.log('[DEBUG-OBSIDIAN-LOG] Logging to Obsidian:', data);
  };

  // LoginPanel component (placeholder - should be imported in real implementation)
  function LoginPanel(props) {
    console.log('[DEBUG-LOGIN-PANEL] Rendered');
    return h('div', { className: 'login-panel' }, [
      h('h2', null, 'Login'),
      h('button', { onClick: props.onLoginSuccess }, 'Login')
    ]);
  }

  // Notification helper function
  var showNotification = function(message, type) {
    console.log('[DEBUG-NOTIFICATION] Type:', type, 'Message:', message);
  };

  // **Vault integration hooks - FIXED: Added proper error handling**
  const useVault = () => {
    console.log('[DEBUG-USE-VAULT] Hook initialized');
    
    const [notes, setNotes] = useState([]);
    const [vaultStats, setVaultStats] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [isIndexing, setIsIndexing] = useState(false);
    
    // Get vault reference once
    const vault = window.myai?.vault;
    
    // Load initial vault data with safety check
    useEffect(() => {
      console.log('[DEBUG-VAULT-EFFECT] Setting up vault');
      
      if (!vault) {
        console.error('[DEBUG-VAULT] Vault API not available');
        return;
      }
      
      loadVault();
      
      // FIXED: Proper vault watcher with error handling
      if (vault.watchChanges && typeof vault.watchChanges === 'function') {
        console.log('[DEBUG-VAULT] Setting up vault change watcher');
        try {
          const unsubscribe = vault.watchChanges((change) => {
            console.log('[DEBUG-VAULT] Vault changed:', change);
            if (change.type === 'noteCreated' || change.type === 'noteUpdated') {
              setNotes(prev => {
                const filtered = prev.filter(n => n.id !== change.note.id);
                return [...filtered, change.note].sort((a, b) => 
                  new Date(b.modified) - new Date(a.modified)
                );
              });
            } else if (change.type === 'noteDeleted') {
              setNotes(prev => prev.filter(n => n.id !== change.noteId));
            }
          });
          
          window.addEventListener('vault:noteCreated', handleNoteCreated);
          window.addEventListener('vault:noteUpdated', handleNoteUpdated);
          window.addEventListener('vault:noteDeleted', handleNoteDeleted);
          
          return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
            window.removeEventListener('vault:noteCreated', handleNoteCreated);
            window.removeEventListener('vault:noteUpdated', handleNoteUpdated);
            window.removeEventListener('vault:noteDeleted', handleNoteDeleted);
          };
        } catch (error) {
          console.error('[DEBUG-VAULT] Error setting up watcher:', error);
          // Fallback to polling
          console.log('[DEBUG-VAULT] Falling back to polling');
          const interval = setInterval(() => {
            console.log('[DEBUG-VAULT] Polling for changes');
            loadVault();
          }, 5000);
          return () => clearInterval(interval);
        }
      } else {
        console.log('[DEBUG-VAULT] watchChanges not available, using event listeners only');
      }
    }, []);
    
    const loadVault = useCallback(async () => {
  if (!vault) return; // Add safety check
  
  try {
    const [notesData, stats] = await Promise.all([
      vault.getNotes(),
      vault.getStats()
    ]);
    
    setNotes(notesData);
    setVaultStats(stats);
  } catch (error) {
    console.error('Failed to load vault:', error);
    showNotification('Failed to load vault', 'error');
  }
}, [vault]); // vault is the only dependency
    
    const indexVault = async () => {
      console.log('[DEBUG-INDEX-VAULT] Starting vault indexing');
      setIsIndexing(true);
      try {
        const stats = await vault.indexVault();
        console.log('[DEBUG-INDEX-VAULT] Indexing complete:', stats);
        setVaultStats(stats);
        showNotification(`Indexed ${stats.total_notes} notes`, 'success');
        await loadVault();
      } catch (error) {
        console.error('[DEBUG-INDEX-VAULT] Failed to index vault:', error);
        showNotification('Failed to index vault', 'error');
      } finally {
        setIsIndexing(false);
      }
    };
    
    const searchVault = async (query) => {
      console.log('[DEBUG-SEARCH-VAULT] Searching for:', query);
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      
      try {
        const results = await vault.search(query);
        console.log('[DEBUG-SEARCH-VAULT] Found results:', results.length);
        setSearchResults(results);
      } catch (error) {
        console.error('[DEBUG-SEARCH-VAULT] Search failed:', error);
      }
    };
      
    const createNote = async (title, content, tags = []) => {
      console.log('[DEBUG-CREATE-NOTE] Creating note:', { title, tags });
      try {
        const result = await window.myai.vault.createNote({ title, content, tags });
        console.log('[DEBUG-CREATE-NOTE] Note created:', result);
        showNotification('Note created', 'success');
        return result;
      } catch (error) {
        console.error('[DEBUG-CREATE-NOTE] Failed to create note:', error);
        showNotification('Failed to create note', 'error');
        throw error;
      }
    };
    
    const updateNote = async (notePath, content) => {
      console.log('[DEBUG-UPDATE-NOTE] Updating note:', notePath);
      try {
        await window.myai.vault.updateNote(notePath, { content });
        console.log('[DEBUG-UPDATE-NOTE] Note updated successfully');
        showNotification('Note updated', 'success');
      } catch (error) {
        console.error('[DEBUG-UPDATE-NOTE] Failed to update note:', error);
        showNotification('Failed to update note', 'error');
        throw error;
      }
    };
    
    const handleNoteCreated = (event) => {
      console.log('[DEBUG-VAULT-EVENT] Note created:', event.detail);
      const note = event.detail;
      setNotes(prev => [...prev, note].sort((a, b) => 
        new Date(b.modified) - new Date(a.modified)
      ));
    };
    
    const handleNoteUpdated = (event) => {
      console.log('[DEBUG-VAULT-EVENT] Note updated:', event.detail);
      const note = event.detail;
      setNotes(prev => prev.map(n => n.id === note.id ? note : n));
    };
    
    const handleNoteDeleted = (event) => {
      console.log('[DEBUG-VAULT-EVENT] Note deleted:', event.detail);
      const notePath = event.detail;
      setNotes(prev => prev.filter(n => n.path !== notePath));
    };
    
    return {
      notes,
      vaultStats,
      searchResults,
      isIndexing,
      searchVault,
      createNote,
      updateNote,
      indexVault,
      loadVault
    };
  };

  // Main MyAI component
  function MyAI() {
    console.log('[DEBUG-MYAI] Component function called');
    
    
    var auth = window.useAuth ? window.useAuth() : null;
    var statusState = useState('Disconnected');
    var status = statusState[0];
    var setStatus = statusState[1];

    window.MyAI = MyAI;

    // FIXED: Load persisted assistant name on init
    var assistantNameState = useState(localStorage.getItem('echo_ai_name') || localStorage.getItem('echo_assistant_name') || '');
    var assistantName = assistantNameState[0];
    var setAssistantName = assistantNameState[1];

    var nameLockedState = useState(false);
    var nameLocked = nameLockedState[0];
    var setNameLocked = nameLockedState[1];

    var localNotesState = useState([]);
    var localNotes = localNotesState[0];
    var setLocalNotes = localNotesState[1];

    var noteContentState = useState('');
    var noteContent = noteContentState[0];
    var setNoteContent = noteContentState[1];

    var isNotesLoadingState = useState(false);
    var isNotesLoading = isNotesLoadingState[0];
    var setIsNotesLoading = isNotesLoadingState[1];

    var isNoteContentLoadingState = useState(false);
    var isNoteContentLoading = isNoteContentLoadingState[0];
    var setIsNoteContentLoading = isNoteContentLoadingState[1];

    var voicePromptState = useState('');
    var voicePrompt = voicePromptState[0];
    var setVoicePrompt = voicePromptState[1];

    var aiResponsesState = useState([]);
    var aiResponses = aiResponsesState[0];
    var setAiResponses = aiResponsesState[1];
    var userScrolledUp = useRef(false);

// AUTO-SCROLL: Detect manual scrolling
var handleScroll = useCallback(function(e) {
  var container = e.target;
  var isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
  userScrolledUp.current = !isAtBottom;
}, []);// AUTO-SCROLL: Scroll to bottom when new messages arrive (if user hasn't scrolled up)
useEffect(function() {
  if (chatContainerRef.current && !userScrolledUp.current) {
    // Small delay to ensure DOM is updated
    setTimeout(function() {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }, 100);
  }
}, [aiResponses]);

    var isVoiceLoadingState = useState(false);
    var isVoiceLoading = isVoiceLoadingState[0];
    var setIsVoiceLoading = isVoiceLoadingState[1];

    var voiceEnabledState = useState(false);
    var voiceEnabled = voiceEnabledState[0];
    var setVoiceEnabled = voiceEnabledState[1];

    // Voice listening & transcription state

    var isListeningState = useState(false);
    var isListening = isListeningState[0];
    var setIsListening = isListeningState[1];

    var voiceTranscript = voicePrompt; // Alias for UI preview (uses existing voicePrompt state)

    var mediaRecorderRef = useRef(null);

    // FIXED: Enhanced authentication state management - Line 245
    const [authState, setAuthState] = useState({
      isChecking: true,
      isAuthenticated: false,
      showAuthChallenge: false,
      authError: null,
      attemptCount: 0,
      sessionValid: false
    });

    // FIXED: Add missing state for user's name
var userNameState = useState(localStorage.getItem('echo_user_name') || '');
var userName = userNameState[0];
var setUserName = userNameState[1];

// FIXED: Add missing state for vault path
var vaultPathState = useState(localStorage.getItem('obsidianVaultPath') || '');
var vaultPath = vaultPathState[0];
var setVaultPath = vaultPathState[1];

// FIXED: Add missing state for system prompt with dynamic AI name
var systemPromptState = useState(function() {
    var savedPrompt = localStorage.getItem('echo_system_prompt');
    var aiName = localStorage.getItem('echo_ai_name') || localStorage.getItem('echo_assistant_name') || 'Echo';
    
    // If the saved prompt contains "Echo" but we have a different AI name, update it
    if (savedPrompt && savedPrompt.includes('Echo') && aiName !== 'Echo') {
        return savedPrompt.replace(/Echo/g, aiName);
    }
    
    return savedPrompt || 'You are ' + aiName + ', a helpful AI assistant.';
});
var systemPrompt = systemPromptState[0];
var setSystemPrompt = systemPromptState[1];

// FIXED: Add onboarding complete state
var onboardingCompleteState = useState(localStorage.getItem('echo_onboarding_complete') === 'true');


var onboardingComplete = onboardingCompleteState[0];
var setOnboardingComplete = onboardingCompleteState[1];
console.log('[DEBUG-ONBOARDING-STATE] Initialized with:', onboardingComplete, 'from localStorage:', localStorage.getItem('echo_onboarding_complete')); // ADD THIS

console.log('[DEBUG-AUTH-STATE] Current auth state:', authState);
// === IDENTITY LOADING EFFECT ===
useEffect(function() {
    // Add a small delay to ensure component is mounted
    const loadIdentity = async function() {
        try {
            console.log('[IDENTITY] Starting identity load...');
            
            // Check if API is available
            if (!window.electronAPI || !window.electronAPI.getIdentity) {
                console.log('[IDENTITY] API not ready, retrying in 100ms...');
                setTimeout(loadIdentity, 100);
                return;
            }
            
            // Load the identity
            const config = await window.electronAPI.getIdentity();
            console.log('[IDENTITY] Config loaded:', config);
            
            if (config && config.ai) {
                // Update the assistant name
                setAssistantName(config.ai.name || 'Echo');
                console.log('[IDENTITY] Set assistant name to:', config.ai.name);
                
                // Update any welcome messages or status
                if (config.ai.name !== 'Echo') {
                    setStatus(`${config.ai.name} is ready to assist`);
                }
                
                // Store in component state if needed
                if (config.ai.userName) {
                    // If you have a setUserName function, use it here
                    console.log('[IDENTITY] User identified as:', config.ai.userName);
                }
            }
        } catch (error) {
            console.error('[IDENTITY] Failed to load identity:', error);
        }
    };
    
    // Start loading after a brief delay
    setTimeout(loadIdentity, 50);
}, []); 

// Empty dependency array - run once on mount // Run once on mount // Run once on mount // Run once on mount // Run once on mount // Run once on mount // Run once on mount // Run once on mount
    // ADD THIS: Initialize and check memory system
useEffect(function() {
    if (onboardingComplete && window.electronAPI && window.electronAPI.getMemoryStats) {
        console.log('[DEBUG-INIT-APP] Checking memory system...');
        window.electronAPI.getMemoryStats().then(function(stats) {
            console.log('[DEBUG-INIT-APP] Memory system ready:', stats);
            console.log('[DEBUG-INIT-APP] Total memories:', stats.totalCapsules);
            console.log('[DEBUG-INIT-APP] Memory endpoints available:', {
                buildContext: !!window.electronAPI.buildContext,
                processConversation: !!window.electronAPI.processConversation,
                searchMemory: !!window.electronAPI.searchMemory
            });
        }).catch(function(error) {
            console.error('[DEBUG-INIT-APP] Memory system check failed:', error);
        });
        if (window.electronAPI.searchMemory) {
  window.electronAPI.searchMemory("recipe").then(results => {
    console.log("[FRONTEND] Recipe audit:", results);

    // Example DOM update
    const el = document.getElementById("recipeResults");
    if (el) {
      el.innerHTML = `
        <h3>Found ${results.count} recipes</h3>
        <ul>${results.examples.map(e => `<li>${e}</li>`).join('')}</ul>
      `;
    }
  }).catch(err => {
    console.error("[FRONTEND] searchMemory failed:", err);
  });
}

    }
}, [onboardingComplete]); // Run when onboarding status changes

    var toggleVoice = function() {
  console.log('[DEBUG-TOGGLE-VOICE] Called, current state:', voiceEnabled);
  setVoiceEnabled(function(prev) { 
    // If we're disabling voice, stop any current speech
    if (prev && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    return !prev; 
  });
  setStatus(prev => (voiceEnabled ? 'Voice disabled' : 'Voice enabled'));
};

    var handlePushToTalk = function(start) {
      console.log('[DEBUG-PUSH-TO-TALK] Called with start:', start);
      if (start) {
        if (isListening) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setStatus('Microphone not available');
          return;
        }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
          var mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          var chunks = [];
          mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) chunks.push(e.data);
          };
          mediaRecorder.onstop = function() {
            setIsListening(false);
            var blob = new Blob(chunks, { type: 'audio/webm' });
            var formData = new FormData();
            formData.append('file', blob, 'recording.webm');
            var sttEndpoint = voiceMode === 'local'
              ? 'http://127.0.0.1:5001/stt'
              : 'https://backend-dawn-dawn-3084.fly.dev/stt';
            fetch(sttEndpoint, {
              method: 'POST',
              body: formData,
              headers: voiceMode === 'cloud' ? { Authorization: apiKey } : undefined
            }).then(function(res) {
              if (!res.ok) throw new Error('STT failed: ' + res.status);
              return res.json();
            }).then(function(data) {
              if (data && data.transcription) {
                setVoicePrompt(data.transcription);
                setStatus('Voice input transcribed');
              } else {
                setStatus('No transcription received');
              }
            }).catch(function(err) {
              console.error('STT error:', err);
              setStatus('Error: ' + err.message);
            });
          };
          mediaRecorder.start();
          setIsListening(true);
        }).catch(function(err) {
          console.error('Mic error:', err);
          setStatus('Error: ' + err.message);
        });
      } else {
        if (mediaRecorderRef.current && isListening) {
          mediaRecorderRef.current.stop();
        }
      }
    };

   // ADD THIS TO SEE ALL CRITICAL STATES-lines 468-520

var themeState = useState('white-rabbit');
var theme = themeState[0];
var setTheme = themeState[1];

var lastSyncedMaxStateState = useState({});
var lastSyncedMaxState = lastSyncedMaxStateState[0];
var setLastSyncedMaxState = lastSyncedMaxStateState[1];

var isHotwordLoadingState = useState(false);
var isHotwordLoading = isHotwordLoadingState[0];
var setIsHotwordLoading = isHotwordLoadingState[1];

var isSettingsOpenState = useState(false);
var isSettingsOpen = isSettingsOpenState[0];
var setIsSettingsOpen = isSettingsOpenState[1];

var apiKeyState = useState('');
var apiKey = apiKeyState[0];
var setApiKey = apiKeyState[1];

var usernameState = useState('');
var username = usernameState[0];
var setUsername = usernameState[1];

var emailState = useState('');
var email = emailState[0];
var setEmail = emailState[1];

var tierState = useState('personal');
var tier = tierState[0];
var setTier = tierState[1];

var isVoiceUpgradeState = useState(false);
var isVoiceUpgrade = isVoiceUpgradeState[0];
var setIsVoiceUpgrade = isVoiceUpgradeState[1];

var aiPromptState = useState('You are a helpful AI assistant.');
var aiPrompt = aiPromptState[0];
var setAiPrompt = aiPromptState[1];

var userInfoState = useState(null);
var userInfo = userInfoState[0];
var setUserInfo = userInfoState[1];


// MOVE THIS BEFORE THE DEBUG LOG THAT USES IT
// Load model preferences first
var modelPrefs = JSON.parse(localStorage.getItem('echo_model_preferences') || '{}');

var selectedAPIModelState = useState(modelPrefs.apiModel || 'gpt');
var selectedAPIModel = selectedAPIModelState[0];
var setSelectedAPIModel = selectedAPIModelState[1];
var runMemoryPipeline = window.runMemoryPipeline;


var selectedLocalModelState = useState(function() {
    var prefs = JSON.parse(localStorage.getItem('echo_model_preferences') || '{}');
    var directModel = localStorage.getItem('echo_selected_model');
    return prefs.localModel || directModel || '';
});
var selectedLocalModel = selectedLocalModelState[0];
var setSelectedLocalModel = selectedLocalModelState[1];

// NOW THE DEBUG LOG CAN USE selectedLocalModel
console.log('[DEBUG-MODEL-STATE] Initial selectedLocalModel:', selectedLocalModel);
console.log('[DEBUG-CRITICAL-STATES]', {
    selectedLocalModel: selectedLocalModel,
    onboardingComplete: onboardingComplete,
    isAuthenticated: authState.isAuthenticated,
    memoryPipeline: !!memoryPipeline
});

var useAPIState = useState(modelPrefs.useAPI || false);
var useAPI = useAPIState[0];
var setUseAPI = useAPIState[1];

var apiModelOptionsState = useState([]);
var apiModelOptions = apiModelOptionsState[0];
var setApiModelOptions = apiModelOptionsState[1];

var localModelOptionsState = useState([]);
var localModelOptions = localModelOptionsState[0];
var setLocalModelOptions = localModelOptionsState[1];

var recommendedModelState = useState(null);
var recommendedModel = recommendedModelState[0];
var setRecommendedModel = recommendedModelState[1];

var modelSortOrderState = useState('score');
var modelSortOrder = modelSortOrderState[0];
var setModelSortOrder = modelSortOrderState[1];

var memoryPipelineState = useState(null);
var memoryPipeline = memoryPipelineState[0];
var setMemoryPipeline = memoryPipelineState[1];  

var chatContainerRef = useRef(null);
var tier = localStorage.getItem('userTier') || 'personal';
var apiBase = "http://localhost:49200";

var voiceModeState = useState('local');
var voiceMode = voiceModeState[0];
var setVoiceMode = voiceModeState[1];


var showDevPanelState = useState(false);
var showDevPanel = showDevPanelState[0];
var setShowDevPanel = showDevPanelState[1];

var devModeVisibleState = useState(false);
var devModeVisible = devModeVisibleState[0];
var setDevModeVisible = devModeVisibleState[1];

var obsidianNotesState = useState([]);
var obsidianNotes = obsidianNotesState[0];
var setObsidianNotes = obsidianNotesState[1];

var selectedObsidianNoteState = useState('');
var selectedObsidianNote = selectedObsidianNoteState[0];
var setSelectedObsidianNote = selectedObsidianNoteState[1];

var obsidianNoteContentState = useState('');
var obsidianNoteContent = obsidianNoteContentState[0];
var setObsidianNoteContent = obsidianNoteContentState[1];

var hotwordActiveState = useState(true);
var hotwordActive = hotwordActiveState[0];
var setHotwordActive = hotwordActiveState[1];

var isEditModeState = useState(false);
var isEditMode = isEditModeState[0];
var setIsEditMode = isEditModeState[1];

var loadErrorState = useState(false);
var loadError = loadErrorState[0];
var setLoadError = loadErrorState[1];

var isSavingNoteState = useState(false);
var isSavingNote = isSavingNoteState[0];
var setIsSavingNote = isSavingNoteState[1];

var showPassphraseModalState = useState(false);
var showPassphraseModal = showPassphraseModalState[0];
var setShowPassphraseModal = showPassphraseModalState[1];

var privatePendingActionState = useState(null);
var privatePendingAction = privatePendingActionState[0];
var setPrivatePendingAction = privatePendingActionState[1];

var isPrivateAuthenticatedState = useState(false);
var isPrivateAuthenticated = isPrivateAuthenticatedState[0];
var setIsPrivateAuthenticated = isPrivateAuthenticatedState[1];

// Track recent context for follow-up questions
var conversationContextState = useState(localStorage.getItem('echo_conversation_context') || '');
var conversationContext = conversationContextState[0];
var setConversationContext = conversationContextState[1];

// Vault integration hook usage
const {
  notes: vaultNotes,
  vaultStats,
  searchResults,
  isIndexing,
  searchVault,
  createNote,
  updateNote,
  indexVault
} = useVault();

var messagesState = useState([]);
var messages = messagesState[0];
var setMessages = messagesState[1];

// ========== AUTO-SAVE STATE CHANGES ==========
// Auto-save when important values change
useEffect(function() {
  // Skip if these critical variables aren't ready yet
  if (typeof saveAppState !== 'function' || 
      typeof authState === 'undefined' || 
      typeof onboardingComplete === 'undefined') {
    return;
  }
  
  // Only save if we're authenticated and have completed onboarding
  if (authState.isAuthenticated && onboardingComplete) {
    // Debounce the save to avoid too many writes
    var saveTimer = setTimeout(function() {
      saveAppState();
      console.log('[PERSISTENCE] Auto-saved state due to changes');
    }, 1000); // Wait 1 second after changes stop
    
    return function() {
      clearTimeout(saveTimer);
    };
  }
}, []); // TEMPORARY: Empty dependency array to stop the loop
// ========== END AUTO-SAVE ==========

// FIXED: Proper authentication check function - Line 783
const checkAuthenticationStatus = async () => {
  console.log('[DEBUG-AUTH] checkAuthenticationStatus called');
  // Add these debug lines
  console.log('[DEBUG-AUTH] Starting auth check...');
  console.log('[DEBUG-AUTH] localStorage echo_onboarding_complete:', localStorage.getItem('echo_onboarding_complete'));
  console.log('[DEBUG-AUTH] All localStorage keys:', Object.keys(localStorage));
  console.log('[DEBUG-AUTH] Stack trace:', new Error().stack.split('\n')[2]);
  
  // Check if onboarding is complete
  const isOnboardingComplete = localStorage.getItem('echo_onboarding_complete') === 'true';
  

  console.log('[DEBUG-AUTH] Onboarding check:', {
    stored: localStorage.getItem('echo_onboarding_complete'),
    isComplete: isOnboardingComplete
  });

  // If onboarding NOT complete, redirect to onboarding
  if (!isOnboardingComplete) {
    console.log('[DEBUG-AUTH] Onboarding not complete, redirecting...');
    window.location.href = 'onboarding.html';
    return;
  }
  
  // ADD THIS MISSING SESSION CHECK!
  const savedAuthSession = authStorage.getAuth('echo_auth_session');
  const savedAuthTimestamp = authStorage.getAuth('echo_auth_timestamp');
  
  console.log('[DEBUG-AUTH] Saved auth session:', savedAuthSession);
  console.log('[DEBUG-AUTH] Saved auth timestamp:', savedAuthTimestamp);
  
  if (savedAuthSession === 'true') {
    console.log('[DEBUG-AUTH] Found valid saved session, skipping security check entirely');
    setAuthState({
      isChecking: false,
      isAuthenticated: true,
      showAuthChallenge: false,
      authError: null,
      attemptCount: 0,
      sessionValid: true
    });
    setStatus('Authenticated via saved session');
    await initializeApp();
    return;  // EXIT HERE - don't check security API
  }
  
  // Only proceed with security checks if no saved session exists
  console.log('[DEBUG-AUTH] No saved session found, proceeding with security check...');
  
  // ... rest of the function stays the same
  
  try {
    // Check if security API is available
    if (!window.myai || !window.myai.security) {
      console.error('[DEBUG-AUTH] Security API not available');
      setAuthState({
        isChecking: false,
        isAuthenticated: false,
        showAuthChallenge: true,
        authError: 'Security API not available',
        attemptCount: 0,
        sessionValid: false
      });
      return;
    }
    
    // Step 2: Check if authenticated
    console.log('[DEBUG-AUTH] Checking authentication status...');
    const isAuth = await window.myai.security.isAuthenticated();
    console.log('[DEBUG-AUTH] Is authenticated:', isAuth);
    
    // Step 3: Check for existing session
    console.log('[DEBUG-AUTH] Checking for existing session...');
    let sessionValid = false;
    if (window.myai.security.checkSession) {
      sessionValid = await window.myai.security.checkSession();
      console.log('[DEBUG-AUTH] Session valid:', sessionValid);
    }
    
    if (isAuth && sessionValid) {
      console.log('[DEBUG-AUTH] User authenticated with valid session, showing main interface');
      setAuthState({
        isChecking: false,
        isAuthenticated: true,
        showAuthChallenge: false,
        authError: null,
        attemptCount: 0,
        sessionValid: true
      });
      setStatus('Authenticated');
    } else {
      console.log('[DEBUG-AUTH] User NOT authenticated or session invalid, showing auth challenge');
      setAuthState({
        isChecking: false,
        isAuthenticated: false,
        showAuthChallenge: true,
        authError: null,
        attemptCount: 0,
        sessionValid: false
      });
      setStatus('Authentication required');
    }
  } catch (error) {
    console.error('[DEBUG-AUTH] Error checking auth status:', error);
    setAuthState({
      isChecking: false,
      isAuthenticated: false,
      showAuthChallenge: true,
      authError: error.message,
      attemptCount: 0,
      sessionValid: false
    });
    setStatus('Authentication check failed');
  }
};

// FIXED: Handle authentication success - Line 698
const handleAuthSuccess = async () => {
  console.log('[DEBUG-AUTH] handleAuthSuccess called');
  console.log('[DEBUG-AUTH] Stack trace:', new Error().stack.split('\n')[2]);
  
  // Check if this is first-time setup
  if (!localStorage.getItem('echo_onboarding_complete')) {
    console.log('[DEBUG-AUTH] First time setup - saving onboarding data');
    
    // Set default identity
    const defaultIdentity = {
      assistantName: 'Echo',
      userName: 'User',
      systemPrompt: 'You are Echo, a helpful AI assistant.',
      vaultPath: localStorage.getItem('obsidianVaultPath') || ''
    };
    
    // Save to localStorage
    localStorage.setItem('echo_assistant_name', defaultIdentity.assistantName);
    localStorage.setItem('echo_user_name', defaultIdentity.userName);
    localStorage.setItem('echo_system_prompt', defaultIdentity.systemPrompt);
    localStorage.setItem('echo_onboarding_complete', 'true');
    
    // Save via Electron API if available
    if (window.electronAPI && window.electronAPI.saveOnboardingData) {
      await window.electronAPI.saveOnboardingData(defaultIdentity);
      await window.electronAPI.completeOnboarding();
    }
  }
  
  try {
    // Create session
    console.log('[DEBUG-AUTH] Creating authenticated session...');
    if (window.myai.security.createSession) {
      await window.myai.security.createSession();
    }
    
    console.log('[DEBUG-AUTH] Authentication successful, transitioning to main app');
    setAuthState({
      isChecking: false,
      isAuthenticated: true,
      showAuthChallenge: false,
      authError: null,
      attemptCount: 0,
      sessionValid: true
    });
    
    setStatus('Authentication successful');
    
    // get auth session to localStorage
    const savedAuthSession = authStorage.getAuth('echo_auth_session');
    const savedAuthTimestamp = authStorage.getAuth('echo_auth_timestamp');
    console.log('[DEBUG-AUTH] Saved auth session to localStorage');
    authStorage.setAuth('echo_auth_session', 'true');
    authStorage.setAuth('echo_auth_timestamp', Date.now());
    // Initialize main app components
    console.log('[DEBUG-AUTH] Initializing main app components...');
    await initializeApp();
    
  } catch (error) {
    console.error('[DEBUG-AUTH] Error in handleAuthSuccess:', error);
    setStatus('Auth success but init failed');
  }

  
}; 

// Handle onboarding completion
const handleOnboardingComplete = (userData) => {
  // Add debug logging to see full structure
  console.log('[DEBUG-ONBOARDING] Full userData structure:');
  console.log(JSON.stringify(userData, null, 2));
  
  // TEMPORARY: Write to Desktop
  if (window.myai && window.myai.invoke) {
    const desktopPath = require('path').join(require('os').homedir(), 'Desktop', 'onboarding-debug.json');
    window.myai.invoke('write-file', {
      path: desktopPath,
      content: JSON.stringify(userData, null, 2)
    }).then(() => {
      console.log('[DEBUG] Saved to Desktop/onboarding-debug.json');
    }).catch(err => console.error('Failed to save debug:', err));
  }
  
  // TEMPORARY: Stop here to see the data
  console.log('[DEBUG] Stopping before save to prevent loop');
  return;
  
  // Original code below (temporarily unreachable)
  console.log('[DEBUG-ONBOARDING] Onboarding completed with data:', userData);
  
  // Save onboarding data
  if (userData) {
    localStorage.setItem('echo_user_name', userData.userName || '');
    localStorage.setItem('echo_ai_name', userData.aiName || 'Echo');
    localStorage.setItem('echo_vault_path', userData.vaultPath || '');
    localStorage.setItem('echo_system_prompt', userData.systemPrompt || '');
  }
  
  // Mark onboarding as complete
  localStorage.setItem('echo_onboarding_complete', 'true');
  setOnboardingComplete(true);
  
  // Now trigger auth check
  checkAuthenticationStatus();
};

// FIXED: Handle authentication failure
const handleAuthFailure = async (error) => {
  console.log('[DEBUG-AUTH] handleAuthFailure called with error:', error);
  console.log('[DEBUG-AUTH] Current attempt count:', authState.attemptCount);
  
  const newAttemptCount = authState.attemptCount + 1;
  console.log('[DEBUG-AUTH] Failed attempts:', newAttemptCount);
  
  if (newAttemptCount >= 3) {
    console.log('[DEBUG-AUTH] Max attempts reached, initiating security protocol');
    // Trigger destruction/lockdown based on user settings
    if (window.myai.security.handleMaxAuthFailures) {
      await window.myai.security.handleMaxAuthFailures();
    }
  }
  
  setAuthState({
    ...authState,
    authError: error.message || 'Authentication failed',
    attemptCount: newAttemptCount
  });
  
  setStatus(`Auth failed (${newAttemptCount}/3 attempts)`);
};

// FIXED: Complete app initialization function
const initializeApp = async () => {
  console.log('[DEBUG-INIT-APP] Initializing application...');
  
  try {
    // Load ALL persisted data
    
    // 1. Theme
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme && availableThemes.includes(savedTheme)) {
      setTheme(savedTheme);
      console.log('[DEBUG-INIT-APP] Loaded theme:', savedTheme);
    }
    
    // 2. API Key
    const storedApiKey = localStorage.getItem('echo_rubicon_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      console.log('[DEBUG-INIT-APP] Loaded API key');
      fetchUserInfo();
    }
    
    // 3. Assistant identity
let savedAssistantName = localStorage.getItem('echo_assistant_name');
if (!savedAssistantName) {
  // Fallback to IPC if not in localStorage
  try {
    const identity = await window.electronAPI.invoke('onboarding:get-identity');
    savedAssistantName = identity?.ai?.name;
    if (savedAssistantName) {
      localStorage.setItem('echo_assistant_name', savedAssistantName);
    }
  } catch (error) {
    console.error('[DEBUG-INIT-APP] Failed to load identity:', error);
  }
}
if (savedAssistantName) {
  setAssistantName(savedAssistantName);
  console.log('[DEBUG-INIT-APP] Loaded assistant name:', savedAssistantName);
}

// 4. User's name
let savedUserName = localStorage.getItem('echo_user_name');
if (!savedUserName) {
  // Fallback to IPC if not in localStorage
  try {
    const identity = await window.electronAPI.invoke('onboarding:get-identity');
    savedUserName = identity?.ai?.userName;
    if (savedUserName) {
      localStorage.setItem('echo_user_name', savedUserName);
    }
  } catch (error) {
    console.error('[DEBUG-INIT-APP] Failed to load user identity:', error);
  }
}
if (savedUserName) {
  setUserName(savedUserName);
  console.log('[DEBUG-INIT-APP] Loaded user name:', savedUserName);
}
    
    // 5. System prompt
    const savedSystemPrompt = localStorage.getItem('echo_system_prompt');
    if (savedSystemPrompt) {
      setSystemPrompt(savedSystemPrompt);
      setAiPrompt(savedSystemPrompt); // Also set aiPrompt
      console.log('[DEBUG-INIT-APP] Loaded system prompt');
    }
    
    // 6. Vault path
    const savedVaultPath = localStorage.getItem('obsidianVaultPath');
    if (savedVaultPath) {
      setVaultPath(savedVaultPath);
      console.log('[DEBUG-INIT-APP] Loaded vault path:', savedVaultPath);
    }
    
    // 7. Model preferences
    const savedModelPrefs = localStorage.getItem('echo_model_preferences');
    if (savedModelPrefs) {
      const prefs = JSON.parse(savedModelPrefs);
      if (prefs.apiModel) setSelectedAPIModel(prefs.apiModel);
      if (prefs.localModel) setSelectedLocalModel(prefs.localModel);
      if (typeof prefs.useAPI === 'boolean') setUseAPI(prefs.useAPI);
      console.log('[DEBUG-INIT-APP] Loaded model preferences:', prefs);
    }
    
    // 8. Conversation context
    const savedContext = localStorage.getItem('echo_conversation_context');
    if (savedContext) {
      setConversationContext(savedContext);
      console.log('[DEBUG-INIT-APP] Loaded conversation context');
    }
    
    // 9. Check
const checkAuthenticationStatus = async () => {
  console.log('[DEBUG-AUTH] checkAuthenticationStatus called');
  console.log('[DEBUG-AUTH] Starting auth check...');
  console.log('[DEBUG-AUTH] localStorage echo_onboarding_complete:', localStorage.getItem('echo_onboarding_complete'));
  console.log('[DEBUG-AUTH] All localStorage keys:', Object.keys(localStorage));
  
  // Check if onboarding is complete
  const isOnboardingComplete = localStorage.getItem('echo_onboarding_complete') === 'true';
  

  
  console.log('[DEBUG-AUTH] Onboarding check:', {
    stored: localStorage.getItem('echo_onboarding_complete'),
    isComplete: isOnboardingComplete
  });
  
  // If onboarding NOT complete, redirect to onboarding
  if (!isOnboardingComplete) {
    console.log('[DEBUG-AUTH] Onboarding not complete, redirecting...');
    window.location.href = 'onboarding.html';
    return;
  }
  
  // CHECK FOR SAVED SESSION IMMEDIATELY AFTER ONBOARDING CHECK
  const savedAuthSession = authStorage.getAuth('echo_auth_session');
  const savedAuthTimestamp = authStorage.getAuth('echo_auth_timestamp');
  
  console.log('[DEBUG-AUTH] Saved auth session:', savedAuthSession);
  console.log('[DEBUG-AUTH] Saved auth timestamp:', savedAuthTimestamp);
  
  if (savedAuthSession === 'true') {
    console.log('[DEBUG-AUTH] Found valid saved session, skipping security check entirely');
    setAuthState({
      isChecking: false,
      isAuthenticated: true,
      showAuthChallenge: false,
      authError: null,
      attemptCount: 0,
      sessionValid: true
    });
    setStatus('Authenticated via saved session');
    // Call initializeApp here since we're authenticated
    await initializeApp();
    return;  // EXIT HERE - don't check security API
  }
  
  // Only proceed with security checks if no saved session exists
  console.log('[DEBUG-AUTH] No saved session found, proceeding with security check...');
  
  try {
    // Check if security API is available
    if (!window.myai || !window.myai.security) {
      console.error('[DEBUG-AUTH] Security API not available');
      setAuthState({
        isChecking: false,
        isAuthenticated: false,
        showAuthChallenge: true,
        authError: 'Security API not available',
        attemptCount: 0,
        sessionValid: false
      });
      return;
    }
    
    // Check if authenticated
    console.log('[DEBUG-AUTH] Checking authentication status...');
    const isAuth = await window.myai.security.isAuthenticated();
    console.log('[DEBUG-AUTH] Is authenticated:', isAuth);
    
    // Check for existing session
    console.log('[DEBUG-AUTH] Checking for existing session...');
    let sessionValid = false;
    if (window.myai.security.checkSession) {
      sessionValid = await window.myai.security.checkSession();
      console.log('[DEBUG-AUTH] Session valid:', sessionValid);
    }
    
    if (isAuth && sessionValid) {
      console.log('[DEBUG-AUTH] User authenticated with valid session, showing main interface');
      setAuthState({
        isChecking: false,
        isAuthenticated: true,
        showAuthChallenge: false,
        authError: null,
        attemptCount: 0,
        sessionValid: true
      });
      setStatus('Authenticated');
    } else {
      console.log('[DEBUG-AUTH] User NOT authenticated or session invalid, showing auth challenge');
      setAuthState({
        isChecking: false,
        isAuthenticated: false,
        showAuthChallenge: true,
        authError: null,
        attemptCount: 0,
        sessionValid: false
      });
      setStatus('Authentication required');
    }
  } catch (error) {
    console.error('[DEBUG-AUTH] Error checking auth status:', error);
    setAuthState({
      isChecking: false,
      isAuthenticated: false,
      showAuthChallenge: true,
      authError: error.message,
      attemptCount: 0,
      sessionValid: false
    });
    setStatus('Authentication check failed');
  }
};
        
        // 10. Set status based on what was loaded
if (savedAssistantName && savedUserName) {
  setStatus(`Welcome back, ${savedUserName}. ${savedAssistantName} is ready.`);
} else {
  setStatus('Authenticated - Partial data loaded');
}

// ADD THIS: Initialize and check memory system
if (window.electronAPI && window.electronAPI.getMemoryStats) {
  console.log('[DEBUG-INIT-APP] Checking memory system...');
  window.electronAPI.getMemoryStats().then(function(stats) {
    console.log('[DEBUG-INIT-APP] Memory system ready:', stats);
    console.log('[DEBUG-INIT-APP] Total memories:', stats.totalCapsules);
    console.log('[DEBUG-INIT-APP] Memory endpoints available:', {
      buildContext: !!window.electronAPI.buildContext,
      processConversation: !!window.electronAPI.processConversation,
      searchMemory: !!window.electronAPI.searchMemory
    });
  }).catch(function(error) {
    console.error('[DEBUG-INIT-APP] Memory system check failed:', error);
  });
}

console.log('[DEBUG-INIT-APP] App initialization complete');
} catch (error) {
  console.error('[DEBUG-INIT-APP] Error during initialization:', error);
  setStatus('Initialization error');
}
};

// FIXED: Persist all preferences when they change
const saveAllPreferences = () => {
  console.log('[DEBUG-SAVE-PREFS] Saving all preferences');
  
  // Save model preferences
  const modelPrefs = {
    apiModel: selectedAPIModel,
    localModel: selectedLocalModel,
    useAPI: useAPI
  };
  localStorage.setItem('echo_model_preferences', JSON.stringify(modelPrefs));
  
  // Save identity data
  if (assistantName) localStorage.setItem('echo_assistant_name', assistantName);
  if (userName) localStorage.setItem('echo_user_name', userName);
  if (systemPrompt) localStorage.setItem('echo_system_prompt', systemPrompt);
  if (vaultPath) localStorage.setItem('obsidianVaultPath', vaultPath);
  if (conversationContext) localStorage.setItem('echo_conversation_context', conversationContext);
  
  console.log('[DEBUG-SAVE-PREFS] All preferences saved');
};

// FIXED: Save preferences when they change
useEffect(function() {
  if (authState.isAuthenticated && onboardingComplete) {
    saveAllPreferences();
  }
}, [assistantName, userName, systemPrompt, vaultPath, selectedAPIModel, selectedLocalModel, useAPI, conversationContext]);

// FIXED: Trigger authentication check on mount - Line 630
useEffect(function() {
  console.log('[DEBUG-AUTH-EFFECT] Component mounted, checking authentication...');
  checkAuthenticationStatus();
}, []);

// ADD THIS NEW EFFECT RIGHT AFTER THE ABOVE:
// Handle delayed AuthChallenge component loading (runs once per mount)
useEffect(() => {
  // Nothing to do if we're not showing the challenge or it’s already present
  if (!authState.showAuthChallenge || window.AuthChallenge) {
    return;
  }

  console.log('[DEBUG-AUTH-RETRY] AuthChallenge not yet loaded – waiting up to 5 s');

  // Failsafe: give up after 5 s
  const timeoutId = setTimeout(() => {
    console.error('[DEBUG-AUTH-RETRY] AuthChallenge failed to load after 5 s');
    setStatus('Security module failed to load');
  }, 5000);

  // Watch the DOM for the component to appear
  const observer = new MutationObserver(() => {
    if (window.AuthChallenge) {
      console.log('[DEBUG-AUTH-RETRY] AuthChallenge detected via MutationObserver');
      clearTimeout(timeoutId);
      observer.disconnect();
      setStatus('Security module loaded');
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Cleanup on unmount
  return () => {
    clearTimeout(timeoutId);
    observer.disconnect();
  };
}, [authState.showAuthChallenge]);


// Component lifecycle logging
console.log('[DEBUG-MYAI] Component render cycle');

// State monitoring
useEffect(function() {
  console.log('[DEBUG-STATE-MONITOR] State changed:', { 
    apiKey: apiKey ? 'Set' : 'Not set', 
    userInfo: userInfo ? 'Loaded' : 'Not loaded',
    authState: authState 
  });
}, [apiKey, userInfo, authState]);

// ElectronAPI bridge logging
    console.log('[DEBUG-ELECTRON] typeof window.electronAPI:', typeof (window.electronAPI || undefined));
    console.log('[DEBUG-ELECTRON] electronAPI bridge methods:', Object.keys(window.electronAPI || {}));

    // Legacy auth system check
    useEffect(function() {
      console.log('[DEBUG-LEGACY-AUTH] Checking legacy auth system');
      if (auth && !auth.loading && !auth.isAuthenticated) {
        console.log('[DEBUG-LEGACY-AUTH] User not authenticated in legacy system');
      }
    }, [auth]);
    // ADD THIS TEST EFFECT HERE
useEffect(function() {
    console.log('[DEBUG-TEST-EFFECT] Effects ARE running!');
    console.log('[DEBUG-TEST-EFFECT] State check:', {
        authState: authState?.isAuthenticated,
        selectedLocalModel: selectedLocalModel,
        onboardingComplete: onboardingComplete
    });
}, []);
    
    

   // SECTION: Initialize memory pipeline after auth success and model selection
useEffect(() => {
   {
    isAuthenticated: authState.isAuthenticated,
    onboardingComplete,
    selectedLocalModel,
    hasMemoryPipeline: !!window.memoryPipeline,
    hasElectronAPI: !!window.electronAPI
  });

  // Exit early if prerequisites aren’t satisfied
  if (
    !authState.isAuthenticated ||
    !onboardingComplete ||
    !selectedLocalModel ||
    !window.electronAPI
  ) {
       return;
  }

  // Exit if the pipeline is already set up
  if (window.memoryPipeline) {
    
    return;
  }

  // Build memory interface from electronAPI
  const memoryInterface = {
    processConversation: window.electronAPI.processConversation,
    buildContext:        window.electronAPI.buildContext,
    getMemoryStats:      window.electronAPI.getMemoryStats
  };

  // Expose globally
  window.memorySystem   = memoryInterface;
  window.memoryPipeline = memoryInterface;

  setMemoryPipeline(memoryInterface);

  
}, [
  authState.isAuthenticated,
  onboardingComplete,
  selectedLocalModel
  // note: memoryPipeline intentionally omitted to avoid re-trigger
]);

// SECTION: Dev mode keyboard shortcut
useEffect(() => {
  function handleKeyDown(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      console.log('[DEBUG-DEV-MODE] Toggle dev mode');
      setDevModeVisible(prev => !prev);
    }
  }
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);


    // SECTION: Settings panel IPC listener
    useEffect(function() {
        if (window.electronAPI && window.electronAPI.onOpenSettings) {
            console.log('[DEBUG-IPC] Attaching trigger-ui-open-settings listener...');
            var handleSettingsEvent = function() {
                console.log('[DEBUG-IPC] trigger-ui-open-settings received!');
                setIsSettingsOpen(true);
                setStatus('Settings opened via preload relay');
            };
            window.electronAPI.onOpenSettings(handleSettingsEvent);
            return function() {
                console.log('[DEBUG-IPC] Removing trigger-ui-open-settings listener');
            };
        } else {
            console.warn('[DEBUG-IPC] electronAPI not found on window');
        }
    }, []);

    useEffect(function() {
      console.log('[DEBUG-IPC] Setting up IPC listener for open-settings...');
      if (typeof window !== 'undefined' && window.electronAPI) {
        console.log('[DEBUG-IPC] electronAPI detected, checking for onOpenSettings...');
        if (typeof window.electronAPI.onOpenSettings === 'function') {
          console.log('[DEBUG-IPC] onOpenSettings function found, registering listener...');
          var handleOpenSettings = function() {
            console.log('[DEBUG-IPC] Received open-settings event from main process!');
            console.log('[DEBUG-IPC] Opening settings panel...');
            setIsSettingsOpen(true);
            setStatus('Settings opened via menu');
          };
          if (window.electronAPI.onPong) {
            window.electronAPI.onPong(function() {});
          }
          if (window.electronAPI.ping) {
            window.electronAPI.ping("test-ping");
          }
          var specificHandler = function() {
            console.log('[DEBUG-IPC] trigger-ui-open-settings received (additional listener)!');
            setIsSettingsOpen(true);
            setStatus('Settings opened via relay (additional)');
          };
          window.electronAPI.onOpenSettings(specificHandler);
          console.log('[DEBUG-IPC] IPC listener registered successfully');
          return function() {
            console.log('[DEBUG-IPC] Cleaning up IPC listener (additional)...');
          };
        } else {
          console.error('[DEBUG-IPC] onOpenSettings function not found in electronAPI');
          console.log('[DEBUG-IPC] Available electronAPI methods:', Object.keys(window.electronAPI));
        }
      } else {
        console.warn('[DEBUG-IPC] electronAPI not available - running in browser mode?');
      }
    }, []);

    useEffect(function() {
      if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.ping) {
        console.log('[DEBUG-IPC] Sending renderer-ready ping to main process');
        window.electronAPI.ping('renderer-ready');
      }
    }, []);

    var api = useCallback(function(endpoint) {
      console.log('[DEBUG-API] Building URL for endpoint:', endpoint);
      return apiBase + endpoint;
    }, []);

    var apiCall = useCallback(function(endpoint, options) {
      console.log('[DEBUG-API-CALL] Called with endpoint:', endpoint);
      options = options || {};
      var headers = options.headers || {};
      
      var token = localStorage.getItem('echo_rubicon_token');
      console.log('[DEBUG-API-CALL] Token:', token ? 'Found' : 'Missing');
      
      if (token) {
        headers.Authorization = 'Bearer ' + token;
      } else if (apiKey) {
        headers.Authorization = apiKey;
      }
      
      console.log('[DEBUG-API-CALL] Final headers:', JSON.stringify(headers, null, 2));
      console.log('[DEBUG-API-CALL] Calling endpoint:', endpoint);
      
      return fetch(api(endpoint), Object.assign({}, options, {
        headers: headers
      }));
    }, [api, apiKey]);

    var getModelLabel = function(value, list) {
      console.log('[DEBUG-MODEL-LABEL] Getting label for:', value);
      var found = list.find(function(opt) { return opt.value === value; });
      return found ? found.label : formatLabel(value);
    };

    var toggleUseAPI = useCallback(function(value) {
      console.log('[DEBUG-TOGGLE-API] Toggling to:', value);
      setUseAPI(value);
      var currentModel = value ? selectedAPIModel : selectedLocalModel;
      var options = value ? apiModelOptions : localModelOptions;
      var label = getModelLabel(currentModel, options);
      setStatus('Using ' + (value ? 'API' : 'local') + ' model: ' + label);
      if (window.electronAPI && window.electronAPI.getModelRecommendations) {
        window.electronAPI.getModelRecommendations({
          capability: 'chat',
          tier: tier,
          preferLocal: !value
        }).then(setRecommendedModel);
      }
    }, [selectedAPIModel, selectedLocalModel, apiModelOptions, localModelOptions, tier]);

    var handleAPIModelChange = useCallback(function(model) {
      console.log('[DEBUG-MODEL-CHANGE] API model changed to:', model);
      setSelectedAPIModel(model);
      if (useAPI) {
        var label = getModelLabel(model, apiModelOptions);
        setStatus('API model set to: ' + label);
      }
    }, [useAPI, apiModelOptions]);

    var handleLocalModelChange = useCallback(function(model) {
      console.log('[DEBUG-MODEL-CHANGE] Local model changed to:', model);
      setSelectedLocalModel(model);
      if (!useAPI) {
        var label = getModelLabel(model, localModelOptions);
        setStatus('Local model set to: ' + label);
      }
    }, [useAPI, localModelOptions]);

    useEffect(function() {
  console.log('[DEBUG-OBSIDIAN] Initializing notes system...');
  var attempts = 0;
  var maxAttempts = 5;
  var delay = 100;
  
  var tryLoadNotes = async function() {
    console.log('[DEBUG-OBSIDIAN-LOAD] Starting attempt', attempts + 1);
    
    // Try electronAPI first (this is what actually exists)
    if (window.electronAPI && window.electronAPI.listNotes) {
      console.log('[DEBUG-OBSIDIAN-LOAD] Using electronAPI.listNotes');
      try {
        var result = await window.electronAPI.listNotes();
        console.log('[DEBUG-OBSIDIAN-LOAD] electronAPI returned:', result);
        
        if (result && result.files) {
          console.log('[DEBUG-OBSIDIAN-LOAD] Got files:', result.files.length);
          setObsidianNotes(result.files);
          setStatus('Obsidian synchronized');
          return; // Success
        }
      } catch (error) {
        console.error('[DEBUG-OBSIDIAN-LOAD] electronAPI error:', error);
      }
    }
    
    // Legacy checks (keep for backward compatibility)
    if (window.notesAPI && typeof window.notesAPI.list === 'function') {
      console.log('[DEBUG-OBSIDIAN-LOAD] Found notesAPI');
      try {
        var notesData = await window.notesAPI.list({
          includeContent: false,
          includeMetadata: true
        });
        console.log('[DEBUG-OBSIDIAN-LOAD] notesAPI returned:', notesData);
        setObsidianNotes(notesData);
        setStatus('Obsidian synchronized');
        return;
      } catch (error) {
        console.error('[DEBUG-OBSIDIAN-LOAD] notesAPI error:', error);
      }
    }
    
    var bridge = window.myai;
    if (bridge && typeof bridge.listObsidianNotesAsync === 'function') {
      console.log('[DEBUG-OBSIDIAN-LOAD] Using legacy myai bridge');
      try {
        var files = await bridge.listObsidianNotesAsync();
        console.log('[DEBUG-OBSIDIAN-LOAD] Legacy API returned:', files);
        console.log('[DEBUG-OBSIDIAN-LOAD] Setting obsidian notes...');
        setObsidianNotes(files);
        setStatus('Obsidian loaded');
        return;
      } catch (error) {
        console.error('[DEBUG-OBSIDIAN-LOAD] Legacy API error:', error);
      }
    }
    
    // Retry logic
    if (attempts < maxAttempts) {
      attempts += 1;
      console.log('[DEBUG-OBSIDIAN-LOAD] APIs not ready, retry ' + attempts + '/' + maxAttempts);
      setTimeout(tryLoadNotes, delay * attempts);
    } else {
      console.error('[DEBUG-OBSIDIAN-LOAD] Failed to load notes after retries');
      setStatus('Using electronAPI fallback');
      // Don't retry forever - this was causing the infinite loop
    }
  };
  
  tryLoadNotes();
  
  return function() {
    if (window._obsidianUnwatch) {
      console.log('[DEBUG-OBSIDIAN] Cleaning up watch listener...');
      window._obsidianUnwatch();
      delete window._obsidianUnwatch;
    }
  };
}, []);

    useEffect(function () {
      console.log('[DEBUG-THEME] Applying theme:', theme);
      try {
        const rootElement = document.getElementById('myai-root');
        if (rootElement) {
          const previousTheme = rootElement.dataset.currentTheme;
          if (previousTheme) rootElement.classList.remove(previousTheme);

          if (theme && availableThemes.includes(theme)) {
            rootElement.classList.add(theme);
            rootElement.dataset.currentTheme = theme;
            window.getComputedStyle(rootElement).getPropertyValue('--bg-primary');
          } else {
            console.warn('[DEBUG-THEME] Invalid or empty theme:', theme);
            delete rootElement.dataset.currentTheme;
          }
        } else {
          console.warn('[DEBUG-THEME] No root element found for theme application');
        }
      } catch (e) {
        console.error('[DEBUG-THEME] Theme effect error:', e);
      }
    }, [theme]);
// model loading lines 1290
useEffect(function() {
 console.log('[DEBUG-MODELS] Loading model options...');
 var loadModels = function() {
   try {
     var defaultApiModels = [
       { label: 'GPT-4', value: 'gpt', provider: 'OpenAI', type: 'api', tier: 'pro', capabilities: ['chat', 'code'], contextLimit: 8192, status: 'stable', license: 'Proprietary', performance: { successRate: 0.98, latency: 2.3 }, benchmarks: { qualityScore: 0.91, reasoningScore: 0.88 } },
       { label: 'Claude 3', value: 'claude', provider: 'Anthropic', type: 'api', tier: 'pro', capabilities: ['chat', 'code'], contextLimit: 100000, status: 'stable', license: 'Proprietary', performance: { successRate: 0.97, latency: 1.9 }, benchmarks: { qualityScore: 0.93, reasoningScore: 0.92 } },
       { label: 'Grok 1.5', value: 'grok', provider: 'xAI', type: 'api', tier: 'pro', capabilities: ['chat'], contextLimit: 8000, status: 'beta', license: 'Proprietary', performance: { successRate: 0.95, latency: 2.1 }, benchmarks: { qualityScore: 0.89, reasoningScore: 0.87 } }
     ];
     var defaultLocalModels = [
       { label: 'Hermes', value: 'hermes', provider: 'Local', type: 'local', tier: 'personal', capabilities: ['chat'], contextLimit: 4096, status: 'stable', license: 'Open Source', performance: { successRate: 0.92, latency: 0.6 }, benchmarks: { qualityScore: 0.84, reasoningScore: 0.83 } },
       { label: 'Dolphin', value: 'dolphin', provider: 'Local', type: 'local', tier: 'personal', capabilities: ['chat'], contextLimit: 4096, status: 'stable', license: 'Open Source', performance: { successRate: 0.90, latency: 0.7 }, benchmarks: { qualityScore: 0.82, reasoningScore: 0.81 } },
       { label: 'Mistral', value: 'mistral', provider: 'Local', type: 'local', tier: 'personal', capabilities: ['chat'], contextLimit: 8192, status: 'stable', license: 'Open Source', performance: { successRate: 0.93, latency: 0.8 }, benchmarks: { qualityScore: 0.85, reasoningScore: 0.84 } }
     ];
     setApiModelOptions(defaultApiModels);
     setLocalModelOptions(defaultLocalModels);
     
     // Dynamic model identity system - line 1307
     // Load saved model identities from localStorage
     var savedIdentities = localStorage.getItem('echo_model_identities');
     modelIdentities = savedIdentities ? JSON.parse(savedIdentities) : {};
     
     // Function to save model identity
     window.saveModelIdentity = function(modelName, identity) {
       modelIdentities[modelName] = identity;
       localStorage.setItem('echo_model_identities', JSON.stringify(modelIdentities));
     };
     
     if (window.electronAPI && window.electronAPI.getModelOptions) {
       window.electronAPI.getModelOptions().then(function(models) {
         console.log('[DEBUG-MODELS] Dynamic models loaded:', models);
         // Use the grouped data structure from backend
         if (models.grouped) {
           setApiModelOptions(models.grouped.cloud || defaultApiModels);
           setLocalModelOptions(models.grouped.installed || defaultLocalModels);
         } else {
           // Fallback if structure is different
           setApiModelOptions(models.cloud || defaultApiModels);
           setLocalModelOptions(models.local || defaultLocalModels);
         }
         console.log('[DEBUG-MODELS] Dynamic model options loaded with enhanced metadata');
         
         // FIXED: Only auto-select if no saved preference exists
         var installedModels = models.grouped && models.grouped.installed || models.local || [];
         if (installedModels.length > 0 && !selectedLocalModel && !localStorage.getItem('echo_model_preferences')) {
           var firstLocalModel = installedModels[0].value || installedModels[0].name;
           setSelectedLocalModel(firstLocalModel);
           console.log('[DEBUG-MODELS] Auto-selected local model:', firstLocalModel);
         }

         if (window.electronAPI.getModelRecommendations) {
           window.electronAPI.getModelRecommendations({
             capability: 'chat',
             tier: tier,
             preferLocal: !useAPI
           }).then(function(recommendations) {
             setRecommendedModel(recommendations);
             console.log('[DEBUG-MODELS] Model recommendations loaded:', recommendations);
           });
         }
       });
     }
   } catch (err) {
     console.error('[DEBUG-MODELS] Error loading model options:', err);
   }
 };
 loadModels();
}, [tier, useAPI]);
//end model nameing 1359
    var handleThemeChange = function(e) {
      console.log('[DEBUG-THEME-CHANGE] Theme changed to:', e.target.value);
      var selected = e.target.value;
      setTheme(selected);
      localStorage.setItem('selectedTheme', selected);
    };

    var fetchUserInfo = useCallback(function() {
      console.log('[DEBUG-USER-INFO] Fetching user info...');
      if (!apiKey && (!auth || !auth.token)) return;
      
      apiCall('/user-info', {
        headers: { Authorization: apiKey }
      }).then(function(response) {
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        return response.json();
      }).then(function(data) {
        console.log('[DEBUG-USER-INFO] User info loaded:', data);
        setUserInfo(data);
        setUsername(data.username);
        setEmail(data.email);
        setTier(data.tier);
        setIsVoiceUpgrade(data.voice_enabled);
        setStatus('User info loaded');
        if (window.electronAPI && window.electronAPI.getModelRecommendations) {
          window.electronAPI.getModelRecommendations({
            capability: 'chat',
            tier: data.tier,
            preferLocal: !useAPI
          }).then(setRecommendedModel);
        }
      }).catch(function(err) {
        console.error('[DEBUG-USER-INFO] Error fetching user info:', err);
        setStatus('Failed to fetch user info: ' + err.message);
      });
    }, [apiCall, apiKey, useAPI, auth]);

    var registerUser = useCallback(function() {
      console.log('[DEBUG-REGISTER] Registering user...');
      if (!username || !email) {
        setStatus('Username and email are required');
        return;
      }
      apiCall('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, email: email, tier: tier })
      }).then(function(response) {
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        return response.json();
      }).then(function(data) {
        console.log('[DEBUG-REGISTER] Registration successful');
        setApiKey(data.api_key);
        setStatus('Registration successful! API key set.');
        fetchUserInfo();
      }).catch(function(err) {
        console.error('[DEBUG-REGISTER] Error registering user:', err);
        setStatus('Failed to register: ' + err.message);
      });
    }, [username, email, tier, apiCall, fetchUserInfo]);

    var upgradeVoice = useCallback(function() {
      console.log('[DEBUG-UPGRADE-VOICE] Upgrading voice...');
      if (!apiKey && (!auth || !auth.token)) {
        setStatus('Please register first');
        return;
      }
      apiCall('/upgrade-voice', {
        method: 'POST',
        headers: { Authorization: apiKey }
      }).then(function(response) {
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        return response.json();
      }).then(function(data) {
        console.log('[DEBUG-UPGRADE-VOICE] Voice upgraded');
        setIsVoiceUpgrade(true);
        setStatus(data.status);
      }).catch(function(err) {
        console.error('[DEBUG-UPGRADE-VOICE] Error upgrading voice:', err);
        setStatus('Failed to upgrade voice: ' + err.message);
      });
    }, [apiCall, apiKey, auth]);

    var updateAIPrompt = useCallback(function() {
      console.log('[DEBUG-UPDATE-PROMPT] Updating AI prompt...');
      if (!apiKey && (!auth || !auth.token)) {
        setStatus('Please register first');
        return;
      }
      apiCall('/update-ai-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey
        },
        body: JSON.stringify({ prompt: aiPrompt })
      }).then(function(response) {
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        return response.json();
      }).then(function(data) {
        console.log('[DEBUG-UPDATE-PROMPT] Prompt updated');
        setStatus(data.status);
      }).catch(function(err) {
        console.error('[DEBUG-UPDATE-PROMPT] Error updating AI prompt:', err);
        setStatus('Failed to update AI prompt: ' + err.message);
      });
    }, [apiCall, apiKey, aiPrompt, auth]);

    var fetchNotes = useCallback(function(signal) {
      console.log('[DEBUG-FETCH-NOTES] Fetching notes...');
      var token = localStorage.getItem('echo_rubicon_token');
      if (!token) {
        setStatus('Please login to access notes');
        return;
      }
      
      setIsNotesLoading(true);
      if (window.electronAPI && window.electronAPI.listNotes) {
        window.electronAPI.listNotes().then(function(result) {
          console.log('[DEBUG-FETCH-NOTES] Notes loaded via electronAPI:', result);
          if (result && result.files) {
            setLocalNotes(result.files);
          }
        }).catch(function(err) {
          console.error('[DEBUG-FETCH-NOTES] Error fetching notes:', err);
          setStatus('Failed to load notes: ' + err.message);
        }).finally(function() {
          setIsNotesLoading(false);
        });
      } else {
        apiCall('/notes', {
          signal: signal,
          headers: { }
        }).then(function(response) {
          if (!response.ok) throw new Error('HTTP error ' + response.status);
          return response.json();
        }).then(function(data) {
          console.log('[DEBUG-FETCH-NOTES] Notes loaded via API:', data);
          setLocalNotes(data);
        }).catch(function(err) {
          if (err.name !== 'AbortError') {
            console.error('[DEBUG-FETCH-NOTES] Error fetching notes:', err);
            setStatus('Failed to load notes: ' + err.message);
          }
        }).finally(function() {
          setIsNotesLoading(false);
        });
      }
    }, [apiCall]);

    useEffect(function() {
      console.log('[DEBUG-NOTES-EFFECT] Setting up notes fetch...');
      var controller = new AbortController();
      fetchNotes(controller.signal);
      return function() { controller.abort(); };
    }, []);

    var handleNoteClick = useCallback(function(noteName, isDoubleClick) {
      console.log('[DEBUG-NOTE-CLICK] Note clicked:', noteName, 'Double:', isDoubleClick);
      var token = localStorage.getItem('echo_rubicon_token');
      if (!token) {
        setStatus('Please login to access notes');
        return;
      }
      
      if (noteName.startsWith('private/') && !isPrivateAuthenticated) {
        setPrivatePendingAction(function() {
          return function() { handleNoteClick(noteName, isDoubleClick); };
        });
        setShowPassphraseModal(true);
        setStatus('Private content requires passphrase');
        return;
      }
      
      if (isDoubleClick) {
        if (window.electronAPI && window.electronAPI.openInObsidian) {
          window.electronAPI.openInObsidian(noteName);
          setStatus('Opening ' + noteName + ' externally');
        }
        return;
      }
      
      var controller = new AbortController();
      setIsNoteContentLoading(true);
      apiCall('/notes/' + noteName, {
        signal: controller.signal,
        headers: { }
      }).then(function(response) {
        if (!response.ok) throw new Error('HTTP error ' + response.status);
        return response.text();
      }).then(function(content) {
        console.log('[DEBUG-NOTE-CLICK] Note content loaded, length:', content.length);
        if (content.length <= 1000) {
          setNoteContent(content);
          setStatus('Showing full note');
        } else {
          var preview = content.substring(0, 1000) + '\n\n... [Note truncated - ' + content.length + ' total characters]';
          setNoteContent(preview);
          setStatus('Showing preview (' + Math.round(content.length / 1000) + 'k chars)');
        }
      }).catch(function(err) {
        if (err.name !== 'AbortError') {
          console.error('[DEBUG-NOTE-CLICK] Error loading note:', err);
          setStatus('Failed to load note: ' + err.message);
        }
      }).finally(function() {
        setIsNoteContentLoading(false);
      });
    }, [apiCall, isPrivateAuthenticated, setShowPassphraseModal, setPrivatePendingAction]);
  
  var currentModel = activeCollabModels[turnIndex];
  console.log('[DEBUG-COLLAB] Turn', turnIndex, 'for model:', currentModel);
  
  // Send API request
  apiCall(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt,
      model: modelName,
      systemPrompt: 'You are ' + modelName + ' participating in a collaborative AI discussion. Be concise but insightful.'
    })
  }).then(function(response) {
    if (!response.ok) throw new Error('HTTP error ' + response.status);
    return response.json();
  }).then(function(data) {
    console.log('[DEBUG-COLLAB-MESSAGE] Response from', modelName, ':', data.reply.substring(0, 100) + '...');
    
    // Restore original model selection
    setUseAPI(originalAPI);
    if (originalAPI) {
      setSelectedAPIModel(originalAPIModel);
    } else {
      setSelectedLocalModel(originalLocalModel);
    }
    
    callback(data.reply);
  }).catch(function(error) {
    console.error('[DEBUG-COLLAB-MESSAGE] Error with model', modelName, ':', error);
    
    // Restore original model selection on error
    setUseAPI(originalAPI);
    if (originalAPI) {
      setSelectedAPIModel(originalAPIModel);
    } else {
      setSelectedLocalModel(originalLocalModel);
    }
    
    callback('Error: Could not get response from ' + modelName + ' - ' + error.message);
  });

const { saveConversationSimple } = require('./conversationSaver');

const { searchVaultForContext } = require('./vaultSearch');

const { speakOutLoud } = require('./speechEngine');


const { buildEnhancedContext } = require('./contextPipeline');

      // ==========================
// MEMORY CONTEXT INJECTION
// ==========================
var injectQLibFacts = require('./contextBuilder').injectQLibFacts;
const enhancedContext = await injectQLibFacts({
  voicePrompt,
  qlibKeyword,
  messages,
  vaultContext,
  selectedModel,
  modelIdentities,
  setStatus
});

const { readNote, writeNote, saveChatNote, injectNoteAsSystemContext } = require('./obsidianInterface');
const { searchVaultForContext } = require('./vaultSearch');
const { injectQLibFacts } = require('./contextBuilder');
const { buildThreadedMemory } = require('../backend/qlib/threader/threaderEngine');
const PromptBuilder = require('../src/memory/PromptBuilder');
const MyAIInterface = require('./components/MyAIInterface');
const { h } = require('react'); // Ensure React.createElement is available

function extractKeywords(query) {
  const keywordMap = require('./keywordMap');
  const lowerQuery = query.toLowerCase();
  for (const [key, keywords] of Object.entries(keywordMap)) {
    for (const phrase of keywords) {
      if (lowerQuery.includes(phrase.toLowerCase())) {
        return key;
      }
    }
  }
  return query;
}

async function sendVoiceCommand(config) {
  const {
    apiCall, apiKey, voicePrompt,
    useAPI, selectedAPIModel, selectedLocalModel,
    apiModelOptions, localModelOptions,
    authState, voiceEnabled, messages,
    userName, assistantName, saveConversationSimple,
    setMessages, setAiResponses, setIsVoiceLoading,
    speakOutLoud, formatLabel, logToObsidianMaster, setVoicePrompt, setStatus,
    theme, showDevPanel, DevPanel, status, chatContainerRef,
    isListening, MicIcon, SendIcon, handlePushToTalk,
    toggleUseAPI, handleAPIModelChange, handleLocalModelChange,
    controlButtonStyle, toggleVoice, UploadIcon,
    HotwordIcon, hotwordIconStyle, toggleHotword,
    isHotwordLoading, hotwordActive, SettingsIcon,
    isSettingsOpen, setIsSettingsOpen
  } = config;

  if (!authState?.isAuthenticated) {
    setStatus('Please authenticate to use voice commands');
    return;
  }

  if (!voicePrompt?.trim()) return;

  const controller = new AbortController();
  window.currentRequestController = controller;
  setIsVoiceLoading(true);
  const endpoint = useAPI ? '/voice' : '/local';
  const selectedModel = useAPI ? selectedAPIModel : selectedLocalModel;

  let vaultContext = '';
  try {
    vaultContext = await new Promise(resolve => searchVaultForContext(voicePrompt, resolve));
  } catch (err) {
    console.warn('[PIPE-FAIL] Vault search failed:', err?.message || err);
    vaultContext = '[Vault context not found. Proceeding without it.]';
  }

  const qlibKeyword = extractKeywords(voicePrompt);

  const enhancedContext = await injectQLibFacts({
    voicePrompt,
    qlibKeyword,
    messages,
    vaultContext,
    selectedModel,
    modelIdentities: null,
    setStatus
  });

  const promptBuilder = new PromptBuilder();
  await promptBuilder.initialize();
  const threadedMemory = await buildThreadedMemory('D:/Obsidian Vault');

  const finalPrompt = await promptBuilder.buildSystemPrompt({
    identity: { name: assistantName || 'Echo' },
    profile: 'technical',
    memories: [],
    vaultContext: [],
    recentMessages: messages.slice(-4),
    qLibFacts: []
  });

  console.log('[TOKEN ESTIMATE]', finalPrompt.length);

  try {
    const response = await apiCall(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: finalPrompt, model: selectedModel }),
      signal: controller.signal
    });

    if (!response.ok) throw new Error('HTTP error ' + response.status);
    const data = await response.json();
    const reply = data.reply;

    saveConversationSimple(voicePrompt, reply, selectedModel);
    setMessages(prev => [...prev, { role: 'user', content: voicePrompt }]);

    const responseId = Date.now() + Math.random();
    setAiResponses(prev => prev.concat([{ prompt: voicePrompt, response: '', id: responseId, fullText: reply }]));

    let currentIndex = 0;
    window.currentTypewriterInterval = setInterval(() => {
      if (currentIndex < reply.length) {
        setAiResponses(prev => prev.map(item => item.id === responseId ? { ...item, response: reply.substring(0, currentIndex + 1) } : item));
        currentIndex++;
      } else {
        clearInterval(window.currentTypewriterInterval);
        window.currentTypewriterInterval = null;
        setIsVoiceLoading(false);
        if (voiceEnabled && reply) speakOutLoud(reply);
      }
    }, 35);

    logToObsidianMaster({
      model: selectedModel,
      label: formatLabel(selectedModel),
      provider: 'Unknown',
      type: useAPI ? 'api' : 'local',
      tier: 'unknown',
      prompt: voicePrompt,
      response: reply,
      timestamp: new Date().toISOString(),
      successRate: 0,
      qualityScore: 0
    });

    setVoicePrompt('');
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('[DEBUG-SEND-VOICE] Error:', err);
      setAiResponses(prev => prev.concat([{ prompt: voicePrompt, response: 'Error: ' + err.message, id: Date.now() + Math.random() }]));
      setIsVoiceLoading(false);
    }
  } finally {
    window.currentRequestController = null;
  }

  const app = h(MyAIInterface, {
    theme,
    showDevPanel,
    DevPanel,
    status,
    chatContainerRef,
    aiResponses,
    voicePrompt,
    setVoicePrompt,
    sendVoiceCommand,
    isVoiceLoading,
    isListening,
    MicIcon,
    SendIcon,
    voiceEnabled,
    handlePushToTalk,
    useAPI,
    selectedAPIModel,
    selectedLocalModel,
    apiModelOptions,
    localModelOptions,
    toggleUseAPI,
    handleAPIModelChange,
    handleLocalModelChange,
    controlButtonStyle,
    toggleVoice,
    UploadIcon,
    HotwordIcon,
    hotwordIconStyle,
    toggleHotword,
    isHotwordLoading,
    hotwordActive,
    SettingsIcon,
    isSettingsOpen,
    setIsSettingsOpen
  });

  console.log('[DEBUG-BOOTSTRAP] Exporting MyAI to window.');
  window.MyAI = MyAI;
  return app;
}

module.exports = {
  sendVoiceCommand
};