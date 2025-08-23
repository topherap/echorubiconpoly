// src/echo/memory/capsuleRetriever.js
const fs = require('../../memory/fsReplacement'); // REDIRECTED TO QLIB
const path = require('path');
const crypto = require('crypto');
const { getVaultPath } = require('../../../components/utils/VaultPathManager');

// Comprehensive semantic category system for multi-user knowledge management
const SEMANTIC_CATEGORIES = {
  // === PERSONAL & LIFESTYLE ===
  wellness: {
    root: 'wellness',
    terms: ['wellness', 'health', 'wellbeing', 'vitality', 'lifestyle'],
    subtypes: {
      physical: ['fitness', 'exercise', 'workout', 'training', 'sports', 'movement'],
      mental: ['mindfulness', 'meditation', 'therapy', 'psychology', 'emotional'],
      medical: ['symptoms', 'diagnosis', 'treatment', 'medicine', 'conditions'],
      nutrition: ['diet', 'food', 'recipes', 'meal planning', 'supplements']
    }
  },

  relationships: {
    root: 'relationships',
    terms: ['relationships', 'social', 'connections', 'people', 'community'],
    subtypes: {
      intimate: ['partner', 'dating', 'marriage', 'romance', 'love'],
      family: ['family', 'parents', 'children', 'siblings', 'relatives'],
      social: ['friends', 'networking', 'social life', 'community', 'groups'],
      professional: ['colleagues', 'mentors', 'contacts', 'networking', 'collaborators']
    }
  },

  personal: {
    root: 'personal',
    terms: ['personal', 'self', 'individual', 'private', 'inner'],
    subtypes: {
      journal: ['diary', 'journal', 'reflection', 'thoughts', 'feelings'],
      growth: ['goals', 'habits', 'improvement', 'development', 'learning'],
      identity: ['values', 'beliefs', 'personality', 'self-image', 'purpose'],
      memories: ['past', 'history', 'experiences', 'stories', 'nostalgia']
    }
  },

  // === PROFESSIONAL & PRODUCTIVE ===
  career: {
    root: 'career',
    terms: ['career', 'professional', 'work', 'job', 'occupation'],
    subtypes: {
      development: ['skills', 'training', 'advancement', 'promotion', 'growth'],
      workplace: ['office', 'team', 'culture', 'environment', 'remote'],
      leadership: ['management', 'leadership', 'delegation', 'strategy', 'vision'],
      transition: ['job search', 'interview', 'resume', 'career change', 'retirement']
    }
  },

  business: {
    root: 'business',
    terms: ['business', 'enterprise', 'company', 'startup', 'commercial'],
    subtypes: {
      operations: ['processes', 'workflow', 'efficiency', 'logistics', 'supply chain'],
      sales: ['sales', 'leads', 'conversion', 'pipeline', 'customers'],
      marketing: ['marketing', 'branding', 'advertising', 'content', 'social media'],
      strategy: ['planning', 'analysis', 'competition', 'market', 'growth']
    }
  },

  finance: {
    root: 'finance',
    terms: ['finance', 'money', 'economic', 'financial', 'wealth'],
    subtypes: {
      personal: ['budget', 'savings', 'expenses', 'debt', 'credit'],
      investment: ['stocks', 'bonds', 'crypto', 'portfolio', 'returns'],
      business: ['revenue', 'profit', 'cash flow', 'accounting', 'taxes'],
      planning: ['retirement', 'insurance', 'estate', 'goals', 'security']
    }
  },

  // === CREATIVE & EXPRESSIVE ===
  creative: {
    root: 'creative',
    terms: ['creative', 'artistic', 'art', 'creativity', 'expression'],
    subtypes: {
      visual: ['drawing', 'painting', 'design', 'photography', 'sculpture'],
      writing: ['stories', 'poetry', 'fiction', 'journalism', 'blogging'],
      performing: ['music', 'dance', 'theater', 'acting', 'performance'],
      crafts: ['handmade', 'diy', 'crafting', 'making', 'building']
    }
  },

  media: {
    root: 'media',
    terms: ['media', 'entertainment', 'content', 'digital', 'multimedia'],
    subtypes: {
      consumption: ['movies', 'shows', 'books', 'podcasts', 'videos'],
      creation: ['filming', 'editing', 'production', 'streaming', 'publishing'],
      gaming: ['games', 'gaming', 'esports', 'play', 'virtual'],
      social: ['platforms', 'posts', 'followers', 'engagement', 'viral']
    }
  },

  // === INTELLECTUAL & TECHNICAL ===
  academic: {
    root: 'academic',
    terms: ['academic', 'scholarly', 'research', 'study', 'education'],
    subtypes: {
      sciences: ['physics', 'chemistry', 'biology', 'mathematics', 'research'],
      humanities: ['history', 'philosophy', 'literature', 'languages', 'culture'],
      social: ['sociology', 'anthropology', 'politics', 'economics', 'geography'],
      applied: ['engineering', 'medicine', 'law', 'architecture', 'education']
    }
  },

  technical: {
    root: 'technical',
    terms: ['technical', 'technology', 'digital', 'computing', 'systems'],
    subtypes: {
      development: ['programming', 'coding', 'software', 'apps', 'debugging'],
      infrastructure: ['networks', 'servers', 'cloud', 'devops', 'security'],
      data: ['database', 'analytics', 'ai', 'machine learning', 'visualization'],
      hardware: ['devices', 'components', 'iot', 'robotics', 'electronics']
    }
  },

  // === LIFESTYLE & INTERESTS ===
  domestic: {
    root: 'domestic',
    terms: ['domestic', 'home', 'household', 'living', 'daily'],
    subtypes: {
      home: ['decoration', 'organization', 'cleaning', 'maintenance', 'improvement'],
      cooking: ['recipes', 'baking', 'kitchen', 'ingredients', 'techniques'],
      garden: ['plants', 'gardening', 'landscaping', 'outdoor', 'growing'],
      pets: ['animals', 'pet care', 'training', 'veterinary', 'adoption']
    }
  },

  travel: {
    root: 'travel',
    terms: ['travel', 'journey', 'trip', 'adventure', 'exploration'],
    subtypes: {
      planning: ['itinerary', 'booking', 'budget', 'research', 'preparation'],
      destinations: ['places', 'countries', 'cities', 'attractions', 'local'],
      experiences: ['culture', 'food', 'activities', 'tours', 'memories'],
      logistics: ['transport', 'accommodation', 'documents', 'packing', 'safety']
    }
  },

  // === SPECIALIZED DOMAINS ===
  spiritual: {
    root: 'spiritual',
    terms: ['spiritual', 'religious', 'faith', 'sacred', 'divine'],
    subtypes: {
      practice: ['prayer', 'worship', 'ritual', 'ceremony', 'devotion'],
      study: ['scripture', 'theology', 'doctrine', 'teachings', 'wisdom'],
      mystical: ['meditation', 'enlightenment', 'consciousness', 'transcendence', 'awakening'],
      community: ['congregation', 'fellowship', 'service', 'mission', 'charity']
    }
  },

  esoteric: {
    root: 'esoteric',
    terms: ['esoteric', 'occult', 'mystical', 'metaphysical', 'arcane'],
    subtypes: {
      divination: ['tarot', 'astrology', 'numerology', 'oracle', 'readings'],
      magick: ['ritual', 'spells', 'energy', 'manifestation', 'alchemy'],
      systems: ['kabbalah', 'hermeticism', 'gnosticism', 'thelema', 'chaos'],
      phenomena: ['psychic', 'paranormal', 'supernatural', 'ufo', 'cryptids']
    }
  },

  nature: {
    root: 'nature',
    terms: ['nature', 'environment', 'natural', 'outdoor', 'ecological'],
    subtypes: {
      exploration: ['hiking', 'camping', 'wilderness', 'adventure', 'survival'],
      conservation: ['ecology', 'sustainability', 'climate', 'protection', 'green'],
      observation: ['wildlife', 'birds', 'plants', 'weather', 'seasons'],
      activities: ['fishing', 'hunting', 'foraging', 'bushcraft', 'outdoor sports']
    }
  },

  civic: {
    root: 'civic',
    terms: ['civic', 'public', 'community', 'society', 'collective'],
    subtypes: {
      politics: ['government', 'policy', 'elections', 'activism', 'rights'],
      service: ['volunteer', 'charity', 'nonprofit', 'causes', 'impact'],
      local: ['neighborhood', 'city', 'council', 'events', 'issues'],
      global: ['international', 'humanitarian', 'development', 'peace', 'justice']
    }
  }
};

// Domain specificity for conflict resolution
const DOMAIN_SPECIFICITY = {
  esoteric: 9,
  technical: 8,
  academic: 8,
  finance: 7,
  spiritual: 7,
  creative: 6,
  business: 6,
  career: 5,
  nature: 5,
  travel: 5,
  domestic: 4,
  civic: 4,
  media: 3,
  relationships: 3,
  personal: 2,
  wellness: 2
};

// --- Adaptive threshold knobs ---
const ADAPT = {
  // default targets
  K_DEFAULT: 5,          // target result count
  MAX_RESULTS: 25,       // hard cap
  PERCENTILE: 0.65,      // 65th percentile baseline
  EPSILON: 0.01,         // absolute floor

  // step-down schedule if not enough results
  STEPS: [0.15, 0.10, 0.06, 0.03, 0.01],

  // recency/mercy window below τ if still short
  MERCY_DELTA: 0.01,

  // diversity knobs
  DEDUP_KEYS: ['folder', 'type', 'dayKey'] // computed later
};

// Legacy category map for backwards compatibility
const categoryMap = {
  workouts: 'physical',
  training: 'physical', 
  exercises: 'physical',
  lifts: 'physical',
  meals: 'cooking',
  food: 'cooking',
  foods: 'cooking',
  recipes: 'cooking',
  invoices: 'business',
  customers: 'sales',
  clients: 'sales',
  contacts: 'professional'
};

// Project mapping for semantic categories to actual project folders
const PROJECT_MAPPINGS = {
  // Direct mappings
  clients: 'clients',
  client: 'clients',
  customers: 'clients',
  customer: 'clients',
  
  recipes: 'foods',
  recipe: 'foods',
  food: 'foods',
  foods: 'foods',
  meals: 'foods',
  meal: 'foods',
  cooking: 'foods',
  
  lifts: 'lifts',
  lift: 'lifts',
  workout: 'lifts',
  workouts: 'lifts',
  exercise: 'lifts',
  exercises: 'lifts',
  training: 'lifts',
  gym: 'lifts',
  
  // Semantic category to project mappings
  sales: 'clients',
  professional: 'clients',
  nutrition: 'foods',
  physical: 'lifts'
};

// Detect if query is asking for a list vs specific item
function detectQueryIntent(query) {
  // Patterns that indicate categorical listing
  const listPatterns = [
    /^(list|show|what are|give me|display) (all )?(my |the )?(\w+)/i,
    /^all (my |the )?(\w+)/i,
    /^my (\w+)$/i,
    /^get (all |my )?(\w+)/i,
    /^(who|what)\s+(are|were)\s+(my|our)\s+(\w+)/i  // NEW: "who/what are my/our X"
  ];

  // Check for false positive phrases
  const specificPhrases = ['tell me about', 'describe', 'explain', 'what is'];
  const lowerQuery = query.toLowerCase();

  // If query contains specific phrases, treat as specific search
  if (specificPhrases.some(phrase => lowerQuery.includes(phrase))) {
    return { type: 'specific', isListQuery: false };
  }

  // Check for list patterns
  for (const pattern of listPatterns) {
    const match = query.match(pattern);
    if (match) {
      // Extract the category from last capture group
      let category = match[match.length - 1].toLowerCase();
      
      // Try semantic normalization first
      const semanticCat = detectSemanticCategory(category);
      if (semanticCat && semanticCat.confidence >= 2) {
        category = semanticCat.subtypes[0] || semanticCat.domain;
      } else {
        // Fall back to legacy map or normalization
        category = categoryMap[category] || normalizeCategory(category);
      }

      return {
        type: 'categorical',
        category,
        isListQuery: true,
        semantic: semanticCat // Include semantic info for downstream use
      };
    }
  }

  return { type: 'specific', isListQuery: false };
}
// Determine if a category should search vault content vs capsules
function shouldSearchVaultContent(category) {
  const vaultContentCategories = [
    'clients', 'sales', 'professional', // client-related
    'cooking', 'food', 'foods', 'recipes', // food-related
    'medical', 'health', // medical
    'legal', // legal
    'contacts', 'professional' // contacts
  ];
  
  return vaultContentCategories.includes(category.toLowerCase());
}
/**
 * Calculate percentile value from array
 * @param {Array<number>} arr - Array of numbers
 * @param {number} p - Percentile as decimal (0-1)
 * @returns {number} The value at the given percentile
 */
function percentile(arr, p) {
  if (!arr?.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.max(0, Math.min(a.length - 1, Math.floor(p * (a.length - 1))));
  return a[idx];
}

// Dynamic category detection with semantic understanding
function detectSemanticCategory(query) {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/);
  
  // Score each domain based on term matches
  const domainScores = {};
  
  for (const [domain, config] of Object.entries(SEMANTIC_CATEGORIES)) {
    let score = 0;
    
    // Check root terms
    for (const term of config.terms) {
      if (queryLower.includes(term)) score += 2;
    }
    
    // Check subtype terms
    for (const [subtype, terms] of Object.entries(config.subtypes)) {
      for (const term of terms) {
        if (queryLower.includes(term)) {
          score += 3; // Specific terms score higher
          // Track which subtype matched for precision
          if (!domainScores[domain]) domainScores[domain] = { score: 0, subtypes: [] };
          domainScores[domain].subtypes.push(subtype);
        }
      }
    }
    
    if (score > 0) {
      domainScores[domain] = domainScores[domain] || { score: 0, subtypes: [] };
      domainScores[domain].score += score;
    }
  }
  
  // Resolve conflicts using specificity
  const resolved = Object.entries(domainScores)
    .sort(([a, scoreA], [b, scoreB]) => {
      // First sort by score
      if (scoreB.score !== scoreA.score) return scoreB.score - scoreA.score;
      // Then by specificity
      const specA = DOMAIN_SPECIFICITY[a] || 0;
      const specB = DOMAIN_SPECIFICITY[b] || 0;
      return specB - specA;
    })
    .filter(([_, score]) => score.score > 0);
  
  const topDomain = resolved[0];
  
  return topDomain ? {
    domain: topDomain[0],
    confidence: topDomain[1].score,
    subtypes: topDomain[1].subtypes,
    specificity: DOMAIN_SPECIFICITY[topDomain[0]] || 0
  } : null;
}

// Normalize category with semantic awareness
function normalizeCategory(category) {
  const catLower = category.toLowerCase();
  
  // First try semantic detection
  const semantic = detectSemanticCategory(catLower);
  if (semantic && semantic.confidence >= 3) {
    // If we have a strong semantic match, use the most specific subtype
    return semantic.subtypes[0] || semantic.domain;
  }
  
  // Fallback: intelligent pluralization handling
  // Handle common patterns: -ies → -y, -es → -e, -s → ''
  let normalized = catLower
    .replace(/ies$/, 'y')
    .replace(/([^aeiou])es$/, '$1e')
    .replace(/s$/, '');
  
  // Check if normalized form exists in any semantic network
  for (const [domain, config] of Object.entries(SEMANTIC_CATEGORIES)) {
    for (const [subtype, terms] of Object.entries(config.subtypes)) {
      if (terms.includes(normalized)) {
        return subtype; // Return the canonical subtype name
      }
    }
  }
  
  return normalized;
}

/**
 * Expand query terms for better semantic matching with learned patterns
 */
function expandQuery(query, options = {}) {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/);
  const expandedTerms = new Set(words);
  
  // First, check semantic categories for domain-aware expansion
  const semantic = detectSemanticCategory(queryLower);
  if (semantic && semantic.confidence >= 2) {
    const domain = SEMANTIC_CATEGORIES[semantic.domain];
    
    // Add domain root terms
    domain.terms.forEach(term => expandedTerms.add(term));
    
    // Add related subtype terms (but with restraint)
    for (const subtype of semantic.subtypes) {
      if (domain.subtypes[subtype]) {
        // Add only the most relevant terms from matching subtypes
        domain.subtypes[subtype].slice(0, 3).forEach(term => expandedTerms.add(term));
      }
    }
  }
  
  // Legacy expansions for specific high-value terms
  const coreExpansions = {
    'lifts': ['workout', 'exercise', 'training', 'strength', 'gym'],
    'lift': ['workout', 'exercise', 'training', 'strength'], 
    'recipe': ['food', 'meal', 'cooking', 'dish', 'preparation'],
    'recipes': ['food', 'meal', 'cooking', 'dish'],
    'client': ['customer', 'account', 'contact', 'business'],
    'clients': ['customer', 'account', 'contact', 'business']
  };
  
  // Apply core expansions only for words that appear in query
  words.forEach(word => {
    if (coreExpansions[word]) {
      coreExpansions[word].slice(0, 4).forEach(term => expandedTerms.add(term));
    }
  });
  
  // Limit expansion to prevent over-matching
  const termsArray = Array.from(expandedTerms);
  const maxTerms = options.maxTerms || (semantic ? 12 : 8);
  
  if (termsArray.length > maxTerms) {
    // Prioritize: original words first, then semantic matches, then expansions
    const prioritized = [
      ...words,
      ...termsArray.filter(t => !words.includes(t)).slice(0, maxTerms - words.length)
    ];
    return prioritized.slice(0, maxTerms);
  }
  
  return termsArray;
}

/**
 * Validate capsule structure
 */
function isValidCapsule(capsule) {
  return capsule && 
         (capsule.content || capsule.summary) && 
         typeof capsule.id !== 'undefined';
}

/**
 * Calculate relevance score between capsule and query with enhanced semantic understanding
 * @param {Object} capsule - The capsule to score
 * @param {string} query - The search query
 * @param {Object} context - Additional context (intent, semantic info, etc.)
 * @returns {number} Relevance score between 0 and 1
 */
function calculateRelevance(capsule, query, context = {}) {
  if (!query || !capsule) return 0;
  
  const relevanceStopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with'
  ]);

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/)
    .filter(w => w.length > 2 && !relevanceStopWords.has(w));

  let score = 0;
  
  // ENHANCED: Dynamic weights based on query type
  const isLikelyNameQuery = detectNameQuery(query);
  
  const weights = {
    semanticMatch: 0.25,
    typeMatch: 0.20,
    contentMatch: isLikelyNameQuery ? 0.25 : 0.35,  // Reduced for name queries
    metadataMatch: isLikelyNameQuery ? 0.25 : 0.10, // Increased for name queries
    expandedMatch: 0.10,
    temporalBonus: 0.03,
    chaosBonus: 0.02
  };
  
  // 0. Semantic domain matching (unchanged)
  if (context.semantic || capsule.metadata?.domain) {
    const querySemantic = context.semantic || detectSemanticCategory(query);
    const capsuleDomain = capsule.metadata?.domain || 
                         (capsule.type && detectSemanticCategory(capsule.type)?.domain);
    
    if (querySemantic && capsuleDomain) {
      if (querySemantic.domain === capsuleDomain) {
        score += weights.semanticMatch * 0.8;
        // Bonus for subtype match
        if (capsule.metadata?.subtype && querySemantic.subtypes.includes(capsule.metadata.subtype)) {
          score += weights.semanticMatch * 0.2;
        }
      }
    }
  }
  
  // 1. Type-based matching (unchanged)
  if (capsule.type || capsule.metadata?.type) {
    const capsuleType = (capsule.type || capsule.metadata?.type || '').toLowerCase();
    
    // Direct match
    if (queryLower.includes(capsuleType) || 
        queryLower.includes(capsuleType + 's') ||
        queryLower.includes(capsuleType.replace(/s$/, ''))) {
      score += weights.typeMatch;
    } else {
      // Check if types are semantically related
      const typeSemantic = detectSemanticCategory(capsuleType);
      const querySemantic = detectSemanticCategory(query);
      if (typeSemantic && querySemantic && typeSemantic.domain === querySemantic.domain) {
        score += weights.typeMatch * 0.5;
      }
    }
  }
  
  // 2. Content matching (unchanged)
  const content = (capsule.content || capsule.summary || '').toLowerCase();
  if (queryWords.length > 0) {
    // Check for exact phrase match first
    if (content.includes(queryLower)) {
      score += weights.contentMatch;
    } else {
      // Word-by-word matching with position awareness
      let wordMatches = 0;
      let positionBonus = 0;
      
      queryWords.forEach(word => {
        if (content.includes(word)) {
          wordMatches++;
          // Bonus for words appearing early in content
          const position = content.indexOf(word);
          if (position < 100) positionBonus += 0.1;
          else if (position < 300) positionBonus += 0.05;
        }
      });
      
      score += weights.contentMatch * (wordMatches / queryWords.length);
      score += Math.min(positionBonus * 0.1, weights.contentMatch * 0.2);
    }
  }
  
  // 3. ENHANCED Metadata matching with special fileName handling
  if (capsule.metadata) {
    const fileName = (capsule.metadata.fileName || '').toLowerCase();
    const folder = (capsule.metadata.folder || '').toLowerCase();
    const tags = capsule.metadata.tags || [];
    const author = (capsule.metadata.author || '').toLowerCase();
    
    let metadataScore = 0;
    
    // ENHANCED: Special handling for fileName matches
    if (fileName) {
      // Check for exact phrase match in fileName
      if (fileName.includes(queryLower)) {
        metadataScore += 0.6; // High score for exact phrase match
      } else {
        // Check word-by-word matches in fileName
        let fileNameWordMatches = 0;
        queryWords.forEach(word => {
          if (fileName.includes(word)) {
            fileNameWordMatches++;
          }
        });
        
        if (fileNameWordMatches > 0) {
          // For name queries, even partial matches in fileName are valuable
          const matchRatio = fileNameWordMatches / queryWords.length;
          metadataScore += isLikelyNameQuery ? 0.5 * matchRatio : 0.3 * matchRatio;
        }
      }
      
      // ENHANCED: Handle "and" separated names (e.g., "John and Jane")
      if (isLikelyNameQuery && fileName.includes(' and ')) {
        const nameParts = fileName.split(' and ');
        for (const part of nameParts) {
          if (queryWords.some(word => part.toLowerCase().includes(word))) {
            metadataScore += 0.3; // Bonus for matching part of compound name
            break;
          }
        }
      }
    }
    
    // Original metadata checks (with adjusted weights)
    if (queryWords.some(word => folder.includes(word))) metadataScore += 0.2;
    if (queryWords.some(word => author.includes(word))) metadataScore += 0.2;
    if (tags.some(tag => queryLower.includes(tag.toLowerCase()))) metadataScore += 0.3;
    
    score += weights.metadataMatch * Math.min(metadataScore, 1.0);
  }
  
  // 4. Expanded term matching (unchanged)
  const expandedTerms = expandQuery(query, { maxTerms: 10 });
  const expandedMatches = expandedTerms.filter(term => 
    content.includes(term.toLowerCase())
  ).length;
  if (expandedMatches > 0) {
    // Decay factor for expanded terms (direct query terms score higher)
    const directTerms = queryWords.filter(w => content.includes(w)).length;
    const expansionDecay = directTerms > 0 ? 0.7 : 1.0;
    score += weights.expandedMatch * (expandedMatches / expandedTerms.length) * expansionDecay;
  }
  
  // 5. Temporal relevance bonus (unchanged)
  if (capsule.timestamp || capsule.metadata?.created) {
    const age = Date.now() - new Date(capsule.timestamp || capsule.metadata.created).getTime();
    const daysSinceCreation = age / (1000 * 60 * 60 * 24);
    
    // Recent content gets a small bonus - but smaller than before
    if (daysSinceCreation < 7) score += weights.temporalBonus * 0.6;
    else if (daysSinceCreation < 30) score += weights.temporalBonus * 0.3;
    else if (daysSinceCreation < 90) score += weights.temporalBonus * 0.1;
  }
  
  // 6. Chaos alignment bonus (unchanged)
  if (capsule.chaosScore !== undefined) {
    // High chaos content gets bonus for exploratory queries
    const exploratoryKeywords = ['interesting', 'random', 'explore', 'discover', 'unusual'];
    if (exploratoryKeywords.some(k => queryLower.includes(k))) {
      score += weights.chaosBonus * capsule.chaosScore;
    }
  }
  
  // Ensure score stays within bounds
  return Math.max(0, Math.min(score, 1.0));
}

/**
 * Detect if a query is likely searching for a person's name
 * @param {string} query - The search query
 * @returns {boolean} True if likely a name search
 */
function detectNameQuery(query) {
  // Common name patterns
  const namePatterns = [
    /^[A-Z][a-z]+ [A-Z][a-z]+$/,           // "John Smith"
    /^[A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+$/,   // "John D. Smith"
    /^[A-Z][a-z]+$/,                        // Just "John"
    /^[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+$/ // "John David Smith"
  ];
  
  // Check if query matches name patterns
  const trimmed = query.trim();
  if (namePatterns.some(pattern => pattern.test(trimmed))) {
    return true;
  }
  
  // Check if all words are capitalized (likely names)
  const words = trimmed.split(/\s+/);
  if (words.length >= 1 && words.length <= 3) {
    const allCapitalized = words.every(word => 
      word.length > 1 && /^[A-Z][a-z]*$/.test(word)
    );
    if (allCapitalized) return true;
  }
  
  // Check for common name indicators
  const lowerQuery = query.toLowerCase();
  const nameIndicators = ['find', 'search', 'looking for', 'client', 'person'];
  if (nameIndicators.some(indicator => lowerQuery.includes(indicator))) {
    return true;
  }
  
  return false;
}

/**
 * Walk capsule files recursively
 */
async function walkCapsuleFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await walkCapsuleFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Infer project name from query based on semantic understanding
 * @param {string} query - The search query
 * @returns {string|null} Inferred project name or null
 */
function inferProjectFromQuery(query) {
  if (!query) return null;
  
  const queryLower = query.toLowerCase();
  
  // First check direct keyword matches
  for (const [keyword, project] of Object.entries(PROJECT_MAPPINGS)) {
    if (queryLower.includes(keyword)) {
      console.log(`[ProjectInference] Direct match: "${keyword}" → ${project}`);
      return project;
    }
  }
  
  // Then try semantic category detection
  const semantic = detectSemanticCategory(query);
  if (semantic && semantic.confidence >= 3) {
    // Check if any subtypes map to projects
    for (const subtype of semantic.subtypes) {
      if (PROJECT_MAPPINGS[subtype]) {
        console.log(`[ProjectInference] Semantic match: subtype "${subtype}" → ${PROJECT_MAPPINGS[subtype]}`);
        return PROJECT_MAPPINGS[subtype];
      }
    }
    
    // Check if domain maps to project
    if (PROJECT_MAPPINGS[semantic.domain]) {
      console.log(`[ProjectInference] Semantic match: domain "${semantic.domain}" → ${PROJECT_MAPPINGS[semantic.domain]}`);
      return PROJECT_MAPPINGS[semantic.domain];
    }
  }
  
  console.log(`[ProjectInference] No project inferred for: "${query}"`);
  return null;
}




/**
 * Retrieve relevant capsules from disk in real-time
 * NO CACHING - reads fresh every time
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Array} Relevant capsules sorted by chaos-weighted score
 */
async function retrieveRelevantCapsules(query, options = {}) {
  const vaultPath = options.vaultPath || getVaultPath();
   // Extract hashtags and clean query
   const extractedTags = query.match(/#(\w+)/g)?.map(t => t.slice(1).toLowerCase()) || [];
   const cleanQuery = extractedTags.length > 0 ? query.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim() : query;
 
   console.log('[CapsuleRetriever] Original query:', query);
  if (extractedTags.length > 0) {
     console.log('[CapsuleRetriever] Extracted tags:', extractedTags);
    console.log('[CapsuleRetriever] Clean query:', cleanQuery);
  }
  
  // Add forceSpecific option handling
  const {
    limit = 50,
    project = options.project || global.currentProject,
    forceSpecific = false,
    minRelevance = 0
  } = options;
  
  // Check for environment override
  const envProject = process.env.ECHO_FORCE_PROJECT;
  const effectiveProject = envProject !== 'null' ? (envProject || project) : project;
  
  // Infer project if not provided and not overridden
  let inferredProject = null;
  if (!effectiveProject && !forceSpecific) {
   inferredProject = inferProjectFromQuery(cleanQuery);
    console.log(`[CapsuleRetriever] Inferred project: ${inferredProject || 'none'}`);
  }
  
  const finalProject = effectiveProject || inferredProject;
  
  // Detect intent unless forced to specific mode
  const intent = forceSpecific ? { type: 'specific' } : detectQueryIntent(cleanQuery);
  
  console.log('[CapsuleRetriever] Query intent:', intent);
  console.log('[CapsuleRetriever] Using project:', finalProject || 'none');
  
  // If categorical query
if (intent.type === 'categorical') {
  console.log('[CapsuleRetriever] Categorical query for:', intent.category);
  
  // Check if this category should search vault content directly
  const vaultContentCategories = ['clients', 'sales', 'professional', 'cooking', 'food', 'recipes'];
  
  if (vaultContentCategories.includes(intent.category)) {
    console.log('[CapsuleRetriever] Searching vault content directly, not capsules');
    
    // Map categories to actual vault folder names
    const folderMap = {
      'clients': 'clients',
      'sales': 'clients',
      'professional': 'clients',
      'cooking': 'Foods',
      'food': 'Foods',
      'recipes': 'Foods'
    };
    
    const folderName = folderMap[intent.category] || intent.category;
    const folderPath = path.join(vaultPath, folderName);
    
    console.log(`[CapsuleRetriever] Reading vault folder: ${folderPath}`);
    
    try {
      // Check if folder exists
      await fs.access(folderPath);
      
      const files = await fs.readdir(folderPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      console.log(`[CapsuleRetriever] Found ${mdFiles.length} markdown files in ${folderName}`);
      
      const results = [];
      
      for (const file of mdFiles.slice(0, limit)) {
        const filePath = path.join(folderPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const name = file.replace('.md', '');
        
        // Create capsule-like object for compatibility
        const vaultItem = {
          id: `vault_${folderName}_${name.replace(/\s+/g, '_')}`,
          type: 'vault_content',
          content: content,
          metadata: {
            fileName: name,
            folder: folderName,
            category: intent.category,
            tags: extractedTags, // Include any tags from query
            created: (await fs.stat(filePath)).mtime
          },
          relevanceScore: 1.0,
          chaosScore: 0.5,
          name: name, // THIS shows "Angela Smith" not "capsule_12345"
          _isVaultContent: true
        };
        
        // Apply tag filtering if tags were in query
        if (extractedTags.length > 0) {
          // For vault content, check if content contains the tags
          const contentLower = content.toLowerCase();
          const hasAllTags = extractedTags.every(tag => 
            contentLower.includes(tag) || name.toLowerCase().includes(tag)
          );
          
          if (hasAllTags) {
            results.push(vaultItem);
          }
        } else {
          results.push(vaultItem);
        }
      }
      
      console.log(`[CapsuleRetriever] Returning ${results.length} vault items`);
      return results.sort((a, b) => a.name.localeCompare(b.name));
      
    } catch (error) {
      console.error(`[CapsuleRetriever] Error reading vault folder ${folderPath}:`, error);
      // Fall through to project category logic if vault folder doesn't exist
    }
  }
  
  // For non-vault categories or if vault read failed, use existing project logic
  if (finalProject) {
    console.log('[CapsuleRetriever] Using categorical retrieval for project:', finalProject);
    let results = await retrieveProjectCategory(finalProject, intent.category, vaultPath, limit);
    
    // Apply tag filtering to categorical results
    if (extractedTags.length > 0) {
      const beforeTagFilter = results.length;
      results = results.filter(capsule => {
        const capsuleTags = capsule.metadata?.tags?.map(t => 
          t.replace(/^#/, '').toLowerCase()
        ) || [];
        
        // Check if all required tags are present
        return extractedTags.every(required => capsuleTags.includes(required));
      });
      
      console.log(`[CapsuleRetriever] Tag filter: ${beforeTagFilter} → ${results.length} results`);
    }
    
    return results;
  }
}
  
  // Otherwise continue with existing relevance-based search
  console.log('[CapsuleRetriever] Using relevance-based search');
  
  // Determine search paths based on context
  let searchPaths;
  if (options.searchPaths) {
    // Use provided search paths (already relative to vault)
    searchPaths = options.searchPaths.map(p => path.join(vaultPath, p));
  } else if (finalProject) {
    // Project context: search project first, then fallback to general
    searchPaths = [
      path.join(vaultPath, '.echo', 'projects', finalProject, 'capsules'),
      path.join(vaultPath, '.echo', 'capsules')  // Fallback to general
    ];
    console.log('[CapsuleRetriever] Using project:', finalProject, 'with fallback');
  } else {
    // No project context: just general capsules
    searchPaths = [path.join(vaultPath, '.echo', 'capsules')];
  }
  
  console.log('[CapsuleRetriever] Search paths:', searchPaths);
  console.log('[CapsuleRetriever] Query:', cleanQuery);
  
  const allCapsules = [];
  const seenIds = new Set(); // Prevent duplicates across paths
  let totalFilesChecked = 0;
  
  // Search each path in order (priority matters!)
  for (const searchPath of searchPaths) {
    try {
      // Check if path exists
      try {
        await fs.access(searchPath);
      } catch {
        console.log(`[CapsuleRetriever] Path not found: ${searchPath}`);
        continue; // Skip to next path
      }
      
      // Read directory contents FRESH - no cache!
      const files = await walkCapsuleFiles(searchPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      console.log(`[CapsuleRetriever] Found ${jsonFiles.length} files in ${path.basename(searchPath)}`);
      totalFilesChecked += jsonFiles.length;
      
      // Read each capsule file
      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          const capsule = JSON.parse(content);
          
          // Skip if already seen (from higher priority path)
          if (seenIds.has(capsule.id)) {
            continue;
          }
          
          // Validate structure
          if (!isValidCapsule(capsule)) {
            console.warn(`[CapsuleRetriever] Invalid capsule structure in ${file}`);
            continue;
          }
          
          // Calculate relevance in real-time with context
          const relevance = calculateRelevance(capsule, cleanQuery, { 
            intent, 
            semantic: intent.semantic 
          });
          
          // For adaptive threshold, collect all candidates first
          seenIds.add(capsule.id);
          allCapsules.push({
            ...capsule,
            relevanceScore: relevance,
            chaosScore: capsule.metadata?.chaosScore || capsule.chaosScore || 0.5,
            score: relevance, // Add score property for adaptive logic
            timestamp: capsule.timestamp || capsule.metadata?.created,
            _sourcePath: searchPath, // Track where it came from
            _fileName: path.basename(file)
          });
        } catch (e) {
          console.error('[CapsuleRetriever] Error reading capsule:', file, e.message);
        }
      }
    } catch (error) {
      console.error(`[CapsuleRetriever] Error accessing path ${searchPath}:`, error.message);
    }
  }
  
  console.log(`[CapsuleRetriever] Total files checked: ${totalFilesChecked}`);
  console.log(`[CapsuleRetriever] Total capsules loaded: ${allCapsules.length}`);
  
  // Filter out failed conversation capsules if not disabled
  let candidates = allCapsules;
  if (!process.env.ECHO_DISABLE_FAILURE_FILTER) {
    const failurePhrases = [
      "i don't have",
      "no client data",
      "would you like me to re-index",
      "i don't see any",
      "no information about"
    ];
    
    candidates = allCapsules.filter(capsule => {
      // Skip if marked as failure
      if (capsule.metadata?.failure === true) {
        console.log(`[CapsuleRetriever] Filtering marked failure: ${capsule.id}`);
        return false;
      }
      
      // Skip conversation capsules with failure phrases
      if (capsule.metadata?.type === 'conversation' || capsule.type === 'conversation') {
        const content = ((capsule.content || '') + (capsule.summary || '')).toLowerCase();
        const hasFailurePhrase = failurePhrases.some(phrase => content.includes(phrase));
        if (hasFailurePhrase) {
          console.log(`[CapsuleRetriever] Filtering failed conversation: ${capsule.id}`);
          return false;
        }
      }
      
      return true;
    });
    
    console.log(`[CapsuleRetriever] Filtered ${allCapsules.length - candidates.length} failed capsules`);
  }
  
  // ADAPTIVE THRESHOLD LOGIC STARTS HERE
  const scores = candidates.map(c => c.score);
  
  // Pick K/MAX based on intent
  const isList = intent?.isListQuery === true || intent?.type === 'categorical';
  const K = isList ? Math.max(ADAPT.K_DEFAULT, 7) : ADAPT.K_DEFAULT;
  const MAX = ADAPT.MAX_RESULTS;
  
  // Compute initial τ from percentile
  let tau = Math.max(percentile(scores, ADAPT.PERCENTILE), ADAPT.EPSILON);
  
  // NEW: Check if we have any meaningful matches at all
  const maxScore = Math.max(...scores, 0);
  const hasRealMatches = maxScore > 0.1; // Anything above just temporal/chaos bonuses
  
  // Try percentile τ, then step-down until you hit K or floor
  function filterByTau(t) { return candidates.filter(c => c.score >= t); }
  
  let hits = filterByTau(tau);
  
  // NEW: If no real matches exist, don't force bad results
  if (!hasRealMatches && hits.length === 0) {
    console.log('[CapsuleRetriever] No meaningful matches found for query');
    return []; // Return empty rather than irrelevant results
  }
  
  // Original step-down logic, but with a higher floor for non-matches
  if (hits.length < K) {
    const effectiveFloor = hasRealMatches ? ADAPT.EPSILON : 0.1;
    for (const step of ADAPT.STEPS) {
      if (step < effectiveFloor) break; // Don't go below floor
      tau = step;
      hits = filterByTau(tau);
      if (hits.length >= K) break;
    }
  }
  
  // If still short, mercy-add top recent just below τ
  if (hits.length < K) {
    const mercy = candidates
      .filter(c => c.score >= Math.max(tau - ADAPT.MERCY_DELTA, ADAPT.EPSILON) && !hits.includes(c))
      .sort((a,b) => (new Date(b.timestamp||0)) - (new Date(a.timestamp||0)));
    for (const m of mercy) {
      if (hits.length >= K) break;
      hits.push(m);
    }
  }
  
  // Diversity pass (light dedupe on folder/type/day)
  const seen = new Set();
  const diverse = [];
  for (const h of hits) {
    const day = new Date(h.timestamp||0); 
    const dayKey = isNaN(day) ? 'na' : `${day.getFullYear()}-${day.getMonth()+1}-${day.getDate()}`;
    const key = `${h.metadata?.folder||'na'}|${h.type||'na'}|${dayKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    diverse.push(h);
  }
  let finalHits = (diverse.length >= Math.min(K, hits.length)) ? diverse : hits;
  // Apply tag filtering if tags were specified
if (extractedTags.length > 0) {
  const beforeTagFilter = finalHits.length;
  finalHits = finalHits.filter(capsule => {
    const capsuleTags = capsule.metadata?.tags?.map(t => 
      t.replace(/^#/, '').toLowerCase()
    ) || [];
    
    // Check if all required tags are present
    return extractedTags.every(required => capsuleTags.includes(required));
  });
  
  console.log(`[CapsuleRetriever] Tag filter: ${beforeTagFilter} → ${finalHits.length} results`);
}
  
  // Sort by chaos-weighted relevance & cap
  finalHits.sort((a, b) => {
    // Prefer project-specific content when relevance is similar
    const aIsProject = a._sourcePath?.includes('projects');
    const bIsProject = b._sourcePath?.includes('projects');
    if (aIsProject !== bIsProject && Math.abs(a.relevanceScore - b.relevanceScore) < 0.1) {
      return aIsProject ? -1 : 1; // Slight preference for project content
    }
    
    // Otherwise sort by chaos-weighted score
    const scoreA = a.relevanceScore * (1 + a.chaosScore);
    const scoreB = b.relevanceScore * (1 + b.chaosScore);
    return scoreB - scoreA;
  });
  
  let results = finalHits.slice(0, Math.min(MAX, limit));
  
  // Honor explicit minRelevance only as an override (debugging)
  if (typeof minRelevance === 'number' && minRelevance > 0) {
    const floor = Math.max(minRelevance, ADAPT.EPSILON);
    const overridden = results.filter(r => r.score >= floor);
    if (overridden.length) {
      results = overridden;
    }
  }
  
  // Log adaptive threshold stats
  console.log('[CapsuleRetriever] Adaptive τ:', { tau, K, initialCount: scores.length, returned: results.length });
  
  // Debug top results
  if (results.length > 0) {
    console.log('[CapsuleRetriever] Top 3 results:');
    results.slice(0, 3).forEach((cap, i) => {
      const name = cap.metadata?.fileName || cap.id;
      const source = cap._sourcePath?.includes('projects') ? ' [PROJECT]' : ' [GENERAL]';
      console.log(`  ${i+1}. ${name}${source} (relevance: ${cap.relevanceScore.toFixed(2)}, chaos: ${cap.chaosScore.toFixed(2)})`);
    });
  }
  
  return results;
}

/**
 * Retrieve all capsules from a project for categorical queries
 * @param {string} project - Project name
 * @param {string} category - Category being requested
 * @param {string} vaultPath - Vault base path
 * @param {number} limit - Maximum results to return
 * @returns {Array} All project capsules with max relevance
 */
async function retrieveProjectCategory(project, category, vaultPath, limit = 100) {
  const projectPath = path.join(vaultPath, '.echo', 'projects', project, 'capsules');
  
  console.log(`[CapsuleRetriever] Categorical retrieval for ${category} in ${project}`);
  
  try {
    // Check if project path exists
    try {
      await fs.access(projectPath);
    } catch {
      console.log(`[CapsuleRetriever] Project path not found: ${projectPath}`);
      // Fall back to general capsules if project doesn't exist
      const generalPath = path.join(vaultPath, '.echo', 'capsules');
      return await loadAllCapsulesFromPath(generalPath, category, limit);
    }
    
    // Load all capsules from project
    const projectCapsules = await loadAllCapsulesFromPath(projectPath, category, limit);
    
    console.log(`[CapsuleRetriever] Found ${projectCapsules.length} ${category} in ${project}`);
    
    // Sort by date (most recent first) for categorical listing
    return projectCapsules.sort((a, b) => {
      const dateA = new Date(a.timestamp || a.metadata?.created || 0);
      const dateB = new Date(b.timestamp || b.metadata?.created || 0);
      return dateB - dateA;
    }).slice(0, limit);
    
  } catch (error) {
    console.error(`[CapsuleRetriever] Error in categorical retrieval:`, error);
    return [];
  }
}

/**
 * Helper function to load all capsules from a specific path
 * @param {string} capsulesPath - Path to search
 * @param {string} category - Category context for logging
 * @param {number} limit - Maximum results
 * @returns {Array} All valid capsules from path
 */
async function loadAllCapsulesFromPath(capsulesPath, category, limit) {
  const allCapsules = [];
  const seenIds = new Set();
  
  try {
    const files = await walkCapsuleFiles(capsulesPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`[CapsuleRetriever] Loading ${jsonFiles.length} files for ${category}`);
    
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const capsule = JSON.parse(content);
        
        // Skip invalid or duplicate capsules
        if (!isValidCapsule(capsule) || seenIds.has(capsule.id)) {
          continue;
        }
        
        seenIds.add(capsule.id);
        
        // For categorical queries, all capsules get max relevance
        allCapsules.push({
          ...capsule,
          relevanceScore: 1.0, // Max relevance for categorical
          chaosScore: capsule.metadata?.chaosScore || capsule.chaosScore || 0.5,
          _sourcePath: capsulesPath,
          _fileName: path.basename(file),
          _isFromCategoricalQuery: true // Tag for downstream handling
        });
        
        // Early exit if we hit limit
        if (allCapsules.length >= limit) {
          break;
        }
        
      } catch (e) {
        console.error('[CapsuleRetriever] Error reading capsule:', file, e.message);
      }
    }
    
    return allCapsules;
    
  } catch (error) {
    console.error(`[CapsuleRetriever] Error loading capsules from ${capsulesPath}:`, error);
    return [];
  }
}

/**
 * Search capsules by date range
 * @param {Object} options - Search options
 * @returns {Array} Capsules within date range
 */
async function getCapsulesByDate(options = {}) {
  const vaultPath = options.vaultPath || getVaultPath();
  
  // Determine capsules path based on project
  let capsulesPath;
  if (options.project || global.currentProject) {
    const projectName = options.project || global.currentProject;
    capsulesPath = path.join(vaultPath, '.echo', 'projects', projectName, 'capsules');
  } else {
    capsulesPath = path.join(vaultPath, '.echo', 'capsules');
  }
  
  try {
    const files = await walkCapsuleFiles(capsulesPath);
    console.log(`[CapsuleRetriever] Found ${files.length} capsule files`);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const capsules = [];
    
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        console.log(`[CapsuleRetriever] Reading file: ${file}`);
        const capsule = JSON.parse(content);
        
        if (!isValidCapsule(capsule)) continue;
        
        const capsuleDate = new Date(capsule.timestamp || capsule.metadata?.created);
        
        if (options.after && capsuleDate < new Date(options.after)) continue;
        if (options.before && capsuleDate > new Date(options.before)) continue;
        
        capsules.push(capsule);
      } catch (e) {
        console.error('[CapsuleRetriever] Error reading capsule:', file, e.message);
      }
    }
    
    return capsules.sort((a, b) => 
      new Date(b.timestamp || b.metadata?.created) - 
      new Date(a.timestamp || a.metadata?.created)
    );
    
  } catch (error) {
    console.error('[CapsuleRetriever] Error in getCapsulesByDate:', error);
    return [];
  }
}

/**
 * Legacy search function for compatibility
 */
async function searchCapsules(options = {}) {
  console.log('[CapsuleRetriever] Legacy searchCapsules called, redirecting to retrieveRelevantCapsules');
  return retrieveRelevantCapsules(options.query || '', options);
}

/**
 * Get all capsules of a specific type
 */
async function getCapsulesByType(type, options = {}) {
  const vaultPath = options.vaultPath || getVaultPath();
  
  // Determine capsules path based on project
  let capsulesPath;
  if (options.project || global.currentProject) {
    const projectName = options.project || global.currentProject;
    capsulesPath = path.join(vaultPath, '.echo', 'projects', projectName, 'capsules');
  } else {
    capsulesPath = path.join(vaultPath, '.echo', 'capsules');
  }
  
  try {
    const files = await walkCapsuleFiles(capsulesPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const capsules = [];
    
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const capsule = JSON.parse(content);
        
        if (!isValidCapsule(capsule)) continue;
        
        if (capsule.type === type || capsule.metadata?.type === type) {
          capsules.push(capsule);
        }
      } catch (e) {
        console.error('[CapsuleRetriever] Error reading capsule:', file, e.message);
      }
    }
    
    return capsules;
    
  } catch (error) {
    console.error('[CapsuleRetriever] Error in getCapsulesByType:', error);
    return [];
  }
}

/**
 * Force reindex specific folders (for testing)
 */
async function forceReindexFolder(folderName) {
  console.log(`[CapsuleRetriever] Force reindex requested for: ${folderName}`);
  // This would trigger ChaosAnalyzer to rescan
  // Implementation depends on your analyzer architecture
  return { status: 'reindex-triggered', folder: folderName };
}

module.exports = {
  retrieveRelevantCapsules,
  retrieveProjectCategory,
  getCapsulesByDate,
  searchCapsules,
  getCapsulesByType,
  calculateRelevance,
  forceReindexFolder,
  detectQueryIntent,
  detectNameQuery,
  inferProjectFromQuery
};


