const { loadVerbatimRules } = require('./loadVerbatimRules');

function filterCapsulesByQuery(capsules, query) {
  const rules = loadVerbatimRules();
  const lowerQuery = query.toLowerCase();
  const filtered = [];

  for (const cap of capsules) {
    const tags = cap.tags || [];
    const type = (cap.type || '').toLowerCase();
    const source = (cap.metadata?.sourceFile || '').toLowerCase();
    const text = JSON.stringify(cap).toLowerCase();

    // Strict tag/type match if query contains known rule terms
    const matchesRuleType = rules.verbatim_types.some(t => lowerQuery.includes(t)) ||
                             rules.verbatim_file_patterns.some(pat => lowerQuery.endsWith(pat.replace('*', '')));

    const matchesTags = tags.some(t => lowerQuery.includes(t));
    const matchesText = text.includes(lowerQuery);

    // Accept if: direct tag/type match OR text match OR rule match
    if (matchesRuleType || matchesTags || matchesText || type.includes(lowerQuery)) {
      filtered.push(cap);
    }
  }

  return filtered;
}

module.exports = { filterCapsulesByQuery };
