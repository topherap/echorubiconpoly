// src/memory/ProjectInference.js
/**
 * Lightweight utility to infer project name from user queries
 * Maps semantic understanding to actual project folders
 */

// Direct keyword to project mappings
const KEYWORD_TO_PROJECT = {
  // Client-related
  'clients': 'clients',
  'client': 'clients',
  'customers': 'clients',
  'customer': 'clients',
  'accounts': 'clients',
  'account': 'clients',
  'contacts': 'clients',
  'contact': 'clients',
  
  // Food-related
  'recipes': 'foods',
  'recipe': 'foods',
  'food': 'foods',
  'foods': 'foods',
  'meals': 'foods',
  'meal': 'foods',
  'cooking': 'foods',
  'dish': 'foods',
  'dishes': 'foods',
  'cuisine': 'foods',
  'ingredients': 'foods',
  'ingredient': 'foods',
  
  // Exercise-related
  'lifts': 'lifts',
  'lift': 'lifts',
  'workout': 'lifts',
  'workouts': 'lifts',
  'exercise': 'lifts',
  'exercises': 'lifts',
  'training': 'lifts',
  'gym': 'lifts',
  'fitness': 'lifts',
  'strength': 'lifts',
  
  // Add more mappings as projects grow
};

// Phrase patterns that strongly indicate a project
const PHRASE_PATTERNS = [
  { pattern: /my (current |recent |latest )?clients/i, project: 'clients' },
  { pattern: /client (list|roster|base)/i, project: 'clients' },
  { pattern: /who (are|were) (my|our) (clients|customers)/i, project: 'clients' },
  { pattern: /list of (clients|customers)/i, project: 'clients' },
  
  { pattern: /my (favorite |best |recent )?recipes/i, project: 'foods' },
  { pattern: /what.*cook|what.*eat/i, project: 'foods' },
  { pattern: /dinner (ideas|recipes|options)/i, project: 'foods' },
  { pattern: /meal (plan|prep|ideas)/i, project: 'foods' },
  
  { pattern: /my (recent |last |this week'?s? )?lifts/i, project: 'lifts' },
  { pattern: /workout (log|history|progress)/i, project: 'lifts' },
  { pattern: /gym (session|progress|stats)/i, project: 'lifts' },
  { pattern: /exercise (routine|plan|history)/i, project: 'lifts' },
];

/**
 * Infer project name from a user query
 * @param {string} query - The user's input query
 * @returns {string|null} The inferred project name or null if uncertain
 */
function inferProjectFromQuery(query) {
  if (!query || typeof query !== 'string') {
    console.log('[ProjectInference] Invalid query provided');
    return null;
  }
  
  const queryLower = query.toLowerCase().trim();
  
  // First check phrase patterns (higher confidence)
  for (const { pattern, project } of PHRASE_PATTERNS) {
    if (pattern.test(query)) {
      console.log(`[ProjectInference] Phrase pattern match: "${pattern}" → ${project}`);
      return project;
    }
  }
  
  // Then check individual keywords
  const words = queryLower.split(/\s+/);
  for (const word of words) {
    if (KEYWORD_TO_PROJECT[word]) {
      console.log(`[ProjectInference] Keyword match: "${word}" → ${KEYWORD_TO_PROJECT[word]}`);
      return KEYWORD_TO_PROJECT[word];
    }
  }
  
  // Check for plural/singular variations
  for (const word of words) {
    // Try removing 's' for plurals
    const singular = word.replace(/s$/, '');
    if (KEYWORD_TO_PROJECT[singular]) {
      console.log(`[ProjectInference] Plural variation match: "${word}" → ${KEYWORD_TO_PROJECT[singular]}`);
      return KEYWORD_TO_PROJECT[singular];
    }
    
    // Try adding 's' for potential plurals
    const plural = word + 's';
    if (KEYWORD_TO_PROJECT[plural]) {
      console.log(`[ProjectInference] Singular variation match: "${word}" → ${KEYWORD_TO_PROJECT[plural]}`);
      return KEYWORD_TO_PROJECT[plural];
    }
  }
  
  console.log(`[ProjectInference] No project inferred for: "${query}"`);
  return null;
}

module.exports = {
  inferProjectFromQuery
};