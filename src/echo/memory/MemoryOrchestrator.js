// src/echo/memory/MemoryOrchestrator.js

function runMemoryPipeline(voicePrompt, vaultContext) {
  console.log('[PIPE-ENTRY] runMemoryPipeline triggered');

  window.electronAPI.invoke('qlib-extract', voicePrompt).then((qlibFacts) => {
    console.log('[PIPE-TEST] Q-lib returned:', qlibFacts?.length || 0);

    return window.processConversation({
      voicePrompt,
      vaultContext,
      qlibFacts
    });
  }).then((memoryCapsule) => {
    console.log('[PIPE-TEST] processConversation completed');
    return window.saveCapsule(memoryCapsule);
  }).then(() => {
    console.log('[PIPE-TEST] Capsule saved');
    return window.annotateCapsule(); // Optional — include if your UI expects footer
  }).catch((err) => {
    console.error('[PIPE-FAIL] runMemoryPipeline error:', err);
  });
}

// Make available to global frontend
window.runMemoryPipeline = runMemoryPipeline;
