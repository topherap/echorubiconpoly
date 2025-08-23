// src/memory/utils/relevance.js
// Fixed version - removed circular dependency

const DEFAULTS = {
  minScore: 0.1,
  maxResults: 20,
  boostFactor: 1.2
};

/**
 * Calculate relevance score between query and capsule
 * @param {string} query - Search query
 * @param {object} capsule - Memory capsule
 * @param {object} opts - Options
 * @returns {number} - Relevance score
 */
function calculateRelevance(query, capsule, opts = {}) {
  if (!query || !capsule) return 0;
  
  const queryLower = query.toLowerCase();
  const content = (capsule.content || capsule.summary || '').toLowerCase();
  
  // Simple relevance scoring
  let score = 0;
  
  // Exact phrase match
  if (content.includes(queryLower)) {
    score += 1.0;
  }
  
  // Word matching
  const queryWords = queryLower.split(/\s+/);
  const contentWords = content.split(/\s+/);
  
  queryWords.forEach(word => {
    if (word.length > 2) { // Skip very short words
      const matches = contentWords.filter(cWord => cWord.includes(word)).length;
      score += matches * 0.3;
    }
  });
  
  // Type boost
  if (capsule.type && opts.typeBoosts && opts.typeBoosts[capsule.type]) {
    score *= opts.typeBoosts[capsule.type];
  }
  
  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * @param {string} query
 * @param {Array<object>} candidates  // capsules
 * @param {object} opts               // { minScore, limit, boosts, weights }
 * @returns {Array<object>}           // sorted, with ._score
 */
function retrieveRelevantCapsules(query, candidates = [], opts = {}) {
  // ensure opts is an object
  opts = opts || {};
  const minScore = Number.isFinite(opts.minScore) ? opts.minScore : DEFAULTS.minScore;
  const limit    = Number.isFinite(opts.limit)    ? opts.limit    : 20;
  
  const scored = (Array.isArray(candidates) ? candidates : []).map(c => {
    const s = calculateRelevance(query, c, opts);
    return { ...c, _score: Number.isFinite(s) ? s : 0 };
  });
  
  return scored
    .filter(c => (Number.isFinite(c._score) ? c._score : 0) >= minScore)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

module.exports = { calculateRelevance, DEFAULTS, retrieveRelevantCapsules };