// voiceCommandHandler.js

const { searchVaultForContext } = require('./vaultSearch');
const { injectQLibFacts } = require('./contextBuilder');
const { buildThreadedMemory } = require('./memory/CapsuleRetriever'); 
const PromptBuilder = require('./PromptBuilder');
const { logToObsidianMaster } = require('./utils/logToObsidianMaster');
const { BaseEngine } = require('./echo/core/BaseEngine'); // Adjust path if needed
const { getRecentMessages } = require('./utils/getRecentMessages');
const loadCapsules = require('../../backend/qlib/loadCapsules');
const { filterCapsulesByQuery } = require('../../backend/qlib/filterCapsulesByQuery');
const loadCapsules = require('../../backend/qlib/loadCapsules');
const { filterCapsulesByQuery } = require('../../backend/qlib/filterCapsulesByQuery');
const { rerankCapsulesByQuery } = require('../../backend/qlib/rerankCapsulesByQuery');



async function sendVoiceCommand(config) {
  const {
    apiCall, apiKey, voicePrompt,
    useAPI, selectedAPIModel, selectedLocalModel,
    authState, voiceEnabled, messages,
    userName, assistantName, saveConversationSimple,
    setMessages, setAiResponses, setIsVoiceLoading,
    speakOutLoud, formatLabel, setVoicePrompt, setStatus
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

  // STEP 1: Vault Context
  let vaultContext = '';
  try {
    vaultContext = await new Promise(resolve =>
      searchVaultForContext(voicePrompt, resolve)
    );
  } catch (err) {
    console.warn('[PIPE-FAIL] Vault search failed:', err?.message || err);
    vaultContext = '[Vault context not found. Proceeding without it.]';

  // STEP 2: QLib Facts
  const qlibFacts = await injectQLibFacts({
    voicePrompt,
    qlibKeyword: voicePrompt, // TODO: replace with keyword mapping
    messages,
    vaultContext,
    selectedModel,
    modelIdentities: null,
    setStatus
  });

  // STEP 3: Threaded Memory (legacy structure)
  const threadedMemory = await buildThreadedMemory('D:/Obsidian Vault'); // TODO: make dynamic

  // STEP 4: Capsule filtering and reranking (Q-lib memory pipeline)
  const loadCapsules = require('../../backend/qlib/loadCapsules');
  const { filterCapsulesByQuery } = require('../../backend/qlib/filterCapsulesByQuery');
  const { rerankCapsulesByQuery } = require('../../backend/qlib/rerankCapsulesByQuery');
  const { findExactCapsuleMatch } = require('../../backend/qlib/findExactCapsuleMatch');

  const allCapsules = await loadCapsules();
  const relevantCapsules = filterCapsulesByQuery(allCapsules, voicePrompt);
  const reranked = rerankCapsulesByQuery(relevantCapsules, voicePrompt);
  const exact = findExactCapsuleMatch(voicePrompt, allCapsules);

  const topCapsules = exact
    ? [exact, ...reranked.filter(c => c.id !== exact.id)]
    : reranked;

  // STEP 5: Prompt Construction
  const useContextInjector = false; // set true to fallback to trimmed legacy prompt
  let finalPrompt;

  if (useContextInjector) {
    const { ContextInjector } = require('./memory/ContextInjector');
    const ctx = new ContextInjector();
    const injected = ctx.buildPrompt(threadedMemory, voicePrompt, messages);

    finalPrompt = injected.systemPrompt + '\n\nUser: ' + injected.userMessage;
    console.log('[Prompt] ContextInjector used.');
  } else {
    const PromptBuilder = require('./PromptBuilder');
    const promptBuilder = new PromptBuilder();
    await promptBuilder.initialize();

    finalPrompt = await promptBuilder.buildSystemPrompt({
      identity: { name: assistantName || 'Echo' },
      profile: 'technical',
      memories: topCapsules,
      vaultContext,
      recentMessages: getRecentMessages(messages),
      qLibFacts
    });

    console.log('[Prompt] PromptBuilder used.');
  console.log('[Prompt] PromptBuilder used.');
  // TODO: Continue with API call + streaming/render logic...
}


    console.log('[Prompt] PromptBuilder used.');
  }


  console.log('[TOKEN ESTIMATE]', finalPrompt.length);


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

    // Save and display
    saveConversationSimple(voicePrompt, reply, selectedModel);
    setMessages(prev => [...prev, { role: 'user', content: voicePrompt }]);

    const responseId = Date.now() + Math.random();
    setAiResponses(prev =>
      prev.concat([{ prompt: voicePrompt, response: '', id: responseId, fullText: reply }])
    );

    let currentIndex = 0;
    window.currentTypewriterInterval = setInterval(() => {
      if (currentIndex < reply.length) {
        setAiResponses(prev =>
          prev.map(item =>
            item.id === responseId
              ? { ...item, response: reply.substring(0, currentIndex + 1) }
              : item
          )
        );
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
      setAiResponses(prev =>
        prev.concat([
          {
            prompt: voicePrompt,
            response: 'Error: ' + err.message,
            id: Date.now() + Math.random()
          }
        ])
      );
      setIsVoiceLoading(false);
    }
  } finally {
    window.currentRequestController = null;
  }
}

module.exports = {
  sendVoiceCommand
};
