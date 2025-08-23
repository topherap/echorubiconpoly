// 📦 injectionScorer.js — Blended Capsule Injection Scoring (Ariadne v1.1)

const epochMultipliers = {
  recent: 1.0,
  fading: 0.7,
  midterm: 0.4,
  longterm: 0.2
};

function generateSearchText(capsule) {
  return `${capsule.title || ''} ${capsule.content || ''} ${(capsule.tags || []).join(' ')}`.toLowerCase();
}

function blendedInjectionScore(capsule, queryTerms = [], options = {}) {
  const debug = options.debug || process.env.DEBUG_INJECTION_SCORE;
  const normalizedTerms = queryTerms.map(term => term.toLowerCase().trim()).filter(Boolean);

  const searchText = capsule._searchText || generateSearchText(capsule);
  const hasMatch = normalizedTerms.some(term => searchText.includes(term));

  let score = 0;

  if (hasMatch) {
    score += 10;
    if (capsule.promoted || capsule.pinned) score += 5;
  }

  if (capsule.type === 'chat' && !hasMatch) {
    score -= 10;
  }

  if (score > 0 && capsule.epoch === 'recent') {
    score += 3;
  }

  const epochMultiplier = epochMultipliers[capsule.epoch] || 0.1;

  if (debug) {
    const scoreBreakdown = {
      base: hasMatch ? 10 : 0,
      promoted: (hasMatch && (capsule.promoted || capsule.pinned)) ? 5 : 0,
      recency: (score > 0 && capsule.epoch === 'recent') ? 3 : 0,
      chatPenalty: (capsule.type === 'chat' && !hasMatch) ? -10 : 0,
      epochMultiplier,
      final: score * epochMultiplier
    };
    console.log(`[Injection] ${capsule.id || '(no id)'}`, scoreBreakdown);
  }

  return score * epochMultiplier;
}

module.exports = {
  blendedInjectionScore,
  epochMultipliers,
  generateSearchText
};