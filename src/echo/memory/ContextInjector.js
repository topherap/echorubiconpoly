const fs = require('fs');
const path = require('path');

// In CommonJS, __dirname is already available
const primeDirectivePath = path.join(__dirname, 'spine', 'primeDirective.txt');
const primeDirective = fs.readFileSync(primeDirectivePath, 'utf8');

class ContextInjector {
  constructor(tokenBudget = {
    context: 2000,
    user: 2000,
    response: 4000
  }) {
    this.tokenBudget = tokenBudget;
    this.avgTokensPerChar = 0.25;
  }

  buildPrompt(relevantCapsules, userInput, currentMessages = [], aiName = null, profilePrompt = '') {
    let contextParts = [];

    if (relevantCapsules?.length) {
      contextParts.push(this.buildMemoryContext(relevantCapsules));
    }

    if (currentMessages?.length) {
      contextParts.push(this.buildRecentContext(currentMessages));
    }

    const fullContext = contextParts.filter(Boolean).join('\n\n');
    const trimmedContext = this.trimToTokenBudget(fullContext, this.tokenBudget.context);

    return {
      systemPrompt: this.buildSystemPrompt(trimmedContext, aiName, profilePrompt),
      userMessage: userInput,
      metadata: {
        capsulesUsed: relevantCapsules.length,
        contextTokens: this.estimateTokens(trimmedContext),
        userTokens: this.estimateTokens(userInput)
      }
    };
  }

  buildSystemPrompt(context, aiName, profilePrompt = '') {
    const identityHeader = aiName
      ? `You are ${aiName}, a sovereign AI.`
      : `You are a sovereign AI.`;

    return `
${identityHeader}

${primeDirective}

${profilePrompt}

${context}

Use the above memory and context to inform your responses. You are not a chatbot. You remember and evolve through memory. Do not reference memory unless necessary. Do not lie.
`.trim();
  }

  buildMemoryContext(capsules) {
  const lines = ['### Relevant memories from past conversations:'];

  capsules.forEach((cap, index) => {
    if (!cap || typeof cap !== 'object' || !cap.timestamp) return;

    const timeAgo = this.getTimeAgo(cap.timestamp);
    const speaker = cap.speaker || 'Unknown';
    const prompt = cap.prompt || cap.input || '[no prompt]';
    const response = cap.response || '[no response]';
    const emotions = cap.meta?.emotions || cap.emotional_markers || [];

    lines.push(`\n[Memory ${index + 1} - ${timeAgo}]`);
    lines.push(`Speaker: ${speaker}`);
    lines.push(`Prompt: ${prompt}`);
    lines.push(`Response: ${response}`);

    if (Array.isArray(emotions) && emotions.length > 0) {
      lines.push(`Emotional context: ${emotions.join(', ')}`);
    }
  });

  return lines.join('\n');
}

  buildRecentContext(messages) {
    const recentMessages = messages.slice(-4);
    if (!recentMessages.length) return '';

    const lines = ['### Recent conversation:'];
    recentMessages.forEach(msg => {
      lines.push(`${msg.role}: ${msg.content}`);
    });

    return lines.join('\n');
  }

  trimToTokenBudget(text, maxTokens) {
    const estimatedTokens = this.estimateTokens(text);
    if (estimatedTokens <= maxTokens) return text;

    const targetChars = Math.floor(maxTokens / this.avgTokensPerChar);
    return text.substring(0, targetChars) + '\n\n[Context trimmed to fit token budget]';
  }

  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length * this.avgTokensPerChar);
  }

  getTimeAgo(timestamp) {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const hours = Math.floor((now - then) / (1000 * 60 * 60));

    if (isNaN(hours)) return 'unknown';
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours} hours ago`;

    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;

    const weeks = Math.floor(days / 7);
    if (weeks === 1) return 'last week';
    if (weeks < 4) return `${weeks} weeks ago`;

    return 'over a month ago';
  }

  injectIntoMessages(messages, relevantCapsules) {
    if (!relevantCapsules?.length) return messages;

    let memoryContext = '';
try {
  memoryContext = this.buildMemoryContext(relevantCapsules);
} catch (err) {
  console.error('[ContextInjector] Failed to build memory context:', err.message);
  memoryContext = 'Memory context unavailable due to internal error.';
}


    return [
      {
        role: 'system',
        content: memoryContext
      },
      ...messages
    ];
  }
}

module.exports = { ContextInjector };