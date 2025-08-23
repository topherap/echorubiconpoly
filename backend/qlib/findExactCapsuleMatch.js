function findExactCapsuleMatch(query, capsules) {
  const q = query.toLowerCase().trim();
  const simplified = q.replace(/[^a-z0-9]/gi, ' ').replace(/\s+/g, ' ').trim();

  return capsules.find(c => {
    const file = (c.metadata?.sourceFile || '').toLowerCase();
    const tags = (c.tags || []).map(t => t.toLowerCase());
    const input = (c.input || '').toLowerCase();
    const summary = (c.summary || '').toLowerCase();
    const title = (c.title || '').toLowerCase();
    const type = (c.type || '').toLowerCase();

    return (
      file.includes(simplified) ||
      tags.includes(simplified) ||
      input.includes(simplified) ||
      summary.includes(simplified) ||
      title.includes(simplified) ||
      type.includes(simplified)
    );
  }) || null;
}

module.exports = { findExactCapsuleMatch };
