// ==========================
// CAPSULE WRITER
// ==========================
async function saveCapsule({ voicePrompt, enhancedContext, selectedModel, setStatus }) {
  if (!voicePrompt || typeof voicePrompt !== 'string') {
    setStatus?.('Invalid input: voice prompt required');
    return false;
  }

  const model = selectedModel || 'default';
  const timestamp = new Date().toISOString();

  const capsule = {
    id: `capsule_${Date.now()}`,
    type: 'conversation',
    timestamp,
    summary: voicePrompt.slice(0, 100),
    content: voicePrompt.trim(),
    tags: ['voice', 'memory'],
    model,
    messages: [
      { role: 'user', content: voicePrompt.trim() },
      ...(enhancedContext ? [{ role: 'context', content: enhancedContext }] : [])
    ],
    metadata: {
      source: 'voicePrompt',
      model,
      contextChars: enhancedContext?.length || 0,
      created: timestamp
    }
  };

  try {
    if (!window.electronAPI?.appendCapsule) {
      throw new Error('ElectronAPI not available');
    }

    await window.electronAPI.appendCapsule(capsule);

    setStatus?.(`Memory saved with ${enhancedContext?.length || 0} chars context`);
    return true;

  } catch (err) {
    console.error('[MEMORY-CAPSULE] Failed to append:', err);

    try {
      sessionStorage.setItem(`pending_capsule_${Date.now()}`, JSON.stringify(capsule));
    } catch (storageErr) {
      console.error('[MEMORY-CAPSULE] Local storage fallback failed:', storageErr);
    }

    setStatus?.('Memory system unavailable');
    return false;
  }
}

module.exports = { saveCapsule };

