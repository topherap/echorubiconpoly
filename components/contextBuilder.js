// ==========================
// MEMORY CONTEXT BUILDER
// ==========================

const { saveCapsule } = require('./capsuleWriter');

/**
 * Inject QLib facts into the running context without mutating inputs.
 * Returns the enhanced context string.
 */
async function injectQLibFacts({
  voicePrompt = '',
  qlibKeyword = '',
  messages = [],
  vaultContext = '',
  selectedModel,
  modelIdentities,
  setStatus
}) {
  let enhancedContext = vaultContext || '';
  let qlibMemoryData = null;

  // --------------------------
  // Step 1: Get conversation context (last 4 messages)
  // --------------------------
  const recentMessages = Array.isArray(messages) ? messages.slice(-4) : [];
  const conversationContext = recentMessages
    .map(m => `${m?.role || 'user'}: ${String(m?.content ?? '').trim()}`)
    .join('\n');

  // --------------------------
  // Step 2: Try QLib extraction (guard if API missing)
  // --------------------------
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.invoke) {
      qlibMemoryData = await window.electronAPI.invoke('qlib-extract', {
        query: qlibKeyword || voicePrompt || '',
        conversation: conversationContext,
        maxTokens: 3500
      });
    } else {
      console.warn('[QLib] window.electronAPI.invoke not available; skipping qlib-extract');
    }
  } catch (err) {
    console.error('[QLib] Extract error:', err);
    return enhancedContext; // keep original context on failure
  }

  // Helper: normalize file/note title from path or string
  const toTitle = (val) => {
    if (!val) return 'Unknown';
    const s = String(val);
    const leaf = s.split('\\').pop().split('/').pop();
    return leaf.endsWith('.md') ? leaf.slice(0, -3) : leaf;
  };

  // --------------------------
  // Step 3: Format facts
  // --------------------------
  if (qlibMemoryData?.facts?.length > 0) {
    const isContentQuery = /(?:\brecipe for\b|\bhow to make\b|\binstructions for\b|\bdetails about\b|\btell me about\b|\bwhat is the recipe\b)/i
      .test(voicePrompt || '');

    const seen = new Set();
    const factsToInject = qlibMemoryData.facts
      .map(fact => {
        // Full content mode (if content query)
        if (isContentQuery && fact?.content) {
          const title = fact.name || toTitle(fact.path) || 'Unknown';
          // Don’t dedupe full content blocks – keep them intact
          return `\n=== ${title} ===\n${String(fact.content).trim()}\n`;
        }

        // Otherwise reduce each fact to a clean title/line
        if (fact?.name) return toTitle(fact.name);
        if (typeof fact === 'string') return toTitle(fact);
        if (fact?.path) return toTitle(fact.path);
        if (fact?.text) return toTitle(fact.text);
        if (fact?.content && !isContentQuery) {
          const firstLine = String(fact.content).split('\n')[0];
          return (firstLine || '').slice(0, 80) + (firstLine?.length > 80 ? '…' : '');
        }
        return null;
      })
      .filter(Boolean)
      .map(s => String(s).trim())
      .filter(s => s && !s.includes('score') && !s.startsWith('#') && s !== 'Unknown')
      // Deduplicate thin lines (not full content blocks starting with "=== ")
      .filter(s => {
        if (s.startsWith('=== ')) return true; // keep full content blocks
        if (seen.has(s.toLowerCase())) return false;
        seen.add(s.toLowerCase());
        return true;
      });

    if (factsToInject.length > 0) {
      const header = isContentQuery
        ? '[Q-Lib Content Results]'
        : '[Q-Lib Extracted Facts]';

      enhancedContext += '\n\n' + header + '\n' + factsToInject.join('\n');

      const folder = qlibMemoryData.facts[0]?.folder;
      if (folder) {
        const itemType = isContentQuery ? 'full content items' : 'items';
        enhancedContext += `\n(Found ${factsToInject.length} ${itemType} in ${folder} folder)`;
      }
    }
  }

  // --------------------------
  // Step 4: Capsule Save (best-effort)
  // --------------------------
  try {
    await saveCapsule({ voicePrompt, enhancedContext, selectedModel, setStatus });
  } catch (err) {
    console.warn('[Capsule] saveCapsule failed (non-fatal):', err?.message || err);
  }

  return enhancedContext;
}

module.exports = { injectQLibFacts };
