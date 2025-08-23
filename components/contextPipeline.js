// contextPipeline.js

const { searchVaultForContext } = require('./vaultSearch');
const { injectQLibFacts } = require('./contextBuilder');
let buildThreadedMemory;
try {
  buildThreadedMemory = require('../../tools/memory/threaderEngine').buildThreadedMemory;
} catch (e) {
  console.warn('threaderEngine not loaded:', e?.message || e);
}

const PromptBuilder = require('../src/memory/PromptBuilder');

function extractKeywords(query) {
  const keywordMap = require('./keywordMap'); // MOVE keywordMap to its own file for cleaner syntax
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
    speakOutLoud, formatLabel, logToObsidianMaster, setVoicePrompt, setStatus
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
  
 // FIXED: Get model from dropdown first, fallback to props
  const dropdownElement = document.querySelector('.model-selector select');
  const allSelects = document.querySelectorAll('select');
  console.log('[MODEL DEBUG] Found selects on page:', allSelects.length);
  console.log('[MODEL DEBUG] Dropdown element exists:', !!dropdownElement);

  if (dropdownElement) {
    console.log('[MODEL DEBUG] Dropdown options:', dropdownElement.options.length);
    console.log('[MODEL DEBUG] Current value:', dropdownElement.value);
    console.log('[MODEL DEBUG] Selected index:', dropdownElement.selectedIndex);
    if (dropdownElement.options.length > 0) {
      console.log('[MODEL DEBUG] Available options:', Array.from(dropdownElement.options).map(o => o.value));
    }
  }

  const dropdownModel = dropdownElement?.value;
  const selectedModel = useAPI ? selectedAPIModel : (dropdownModel || selectedLocalModel);
  console.log('[MODEL SELECTION] Dropdown:', dropdownModel, 'Props:', selectedLocalModel, 'Using:', selectedModel);

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
  
  // FIXED: Made buildThreadedMemory optional since it might not load
  let threadedMemory = null;
  if (buildThreadedMemory) {
    try {
      threadedMemory = await buildThreadedMemory('D:/Obsidian Vault');
    } catch (e) {
      console.warn('[THREADED MEMORY] Failed to build:', e?.message || e);
    }
  }

  const finalPrompt = await promptBuilder.buildSystemPrompt({
    identity: { name: assistantName || 'Echo' },
    profile: 'technical',
    memories: [],
    vaultContext: [],
    recentMessages: messages.slice(-4),
    qLibFacts: []
  });

  console.log('[TOKEN ESTIMATE]', finalPrompt.length);
  console.log('[SENDING TO MODEL]', selectedModel);

  try {
    const response = await apiCall(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt: finalPrompt, 
        model: selectedModel 
      }),
      signal: controller.signal
    });

    if (!response.ok) throw new Error('HTTP error ' + response.status);
    const data = await response.json();
    const reply = data.reply || data.response || data.message || 'No response received';

    saveConversationSimple(voicePrompt, reply, selectedModel);
    setMessages(prev => [...prev, { role: 'user', content: voicePrompt }]);

    const responseId = Date.now() + Math.random();
    setAiResponses(prev => prev.concat([{ 
      prompt: voicePrompt, 
      response: '', 
      id: responseId, 
      fullText: reply,
      model: selectedModel 
    }]));

    let currentIndex = 0;
    window.currentTypewriterInterval = setInterval(() => {
      if (currentIndex < reply.length) {
        setAiResponses(prev => prev.map(item => 
          item.id === responseId 
            ? { ...item, response: reply.substring(0, currentIndex + 1) } 
            : item
        ));
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
      setAiResponses(prev => prev.concat([{ 
        prompt: voicePrompt, 
        response: 'Error: ' + err.message, 
        id: Date.now() + Math.random(),
        model: selectedModel,
        error: true
      }]));
      setIsVoiceLoading(false);
    }
  } finally {
    window.currentRequestController = null;
  }
}

module.exports = {
  sendVoiceCommand
};