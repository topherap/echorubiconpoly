function rerankCapsulesByQuery(capsules, query, limit = 10) {
  const lowerQuery = query.toLowerCase();

  function score(capsule) {
    let score = 0;
    const fields = [
      capsule.summary,
      capsule.input,
      capsule.type,
      (capsule.metadata?.sourceFile || ''),
      ...(capsule.tags || [])
    ];

    const fullText = fields.join(' ').toLowerCase();

    // Exact phrase bonus
    if (fullText.includes(lowerQuery)) score += 3;

    // Word overlap
    const queryWords = new Set(lowerQuery.split(/\s+/));
    const fieldWords = new Set(fullText.split(/\s+/));
    const overlap = [...queryWords].filter(w => fieldWords.has(w)).length;

    score += overlap;

    // Type relevance boost
    if ((capsule.type || '').toLowerCase().includes('recipe')) score += 1;

    return score;
  }

  return capsules
    .map(c => ({ capsule: c, score: score(c) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(obj => obj.capsule);
}

module.exports = { rerankCapsulesByQuery };
