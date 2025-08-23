const fs = require('fs');
const path = require('path');

let cachedRules = null;

function loadVerbatimRules() {
  if (cachedRules) return cachedRules;

  const configPath = path.join(__dirname, '../../config/verbatimRules.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    cachedRules = JSON.parse(raw);
    return cachedRules;
  } catch (err) {
    console.error('Failed to load verbatimRules.json:', err.message);
    return {
      verbatim_types: [],
      force_summary_if_tagged: [],
      always_ignore_tags: [],
      verbatim_file_patterns: []
    };
  }
}

module.exports = { loadVerbatimRules };
