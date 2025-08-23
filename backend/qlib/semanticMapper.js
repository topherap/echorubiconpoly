// semanticMapper.js - Universal concept linking for Echo Rubicon
// This creates semantic bridges between different expressions of the same concepts

const SEMANTIC_CONCEPTS = {
  FITNESS: {
    physical: ['exercise', 'workout', 'training', 'gym', 'cardio', 'strength', 'lift', 'press', 'pull', 'squat'],
    spiritual: ['discipline', 'practice', 'ritual', 'temple', 'sacred movement', 'path of', 'journey'],
    competitive: ['sport', 'competition', 'match', 'game', 'tournament', 'race', 'contest'],
    rehabilitation: ['therapy', 'recovery', 'physio', 'mobility', 'rehab', 'healing'],
    occupational: ['labor', 'manual work', 'construction', 'farming', 'physical job'],
    scientific: ['hypertrophy', 'biomechanics', 'kinesiology', 'VO2 max', 'lactate threshold'],
    emotional: ['endurance', 'resilience', 'grit', 'perseverance', 'mental toughness'],
    social: ['team', 'class', 'community', 'club', 'squad', 'gym buddy'],
    creative: ['dance', 'movement arts', 'performance', 'acro', 'flow arts'],
    digital: ['fitness app', 'wearables', 'VR workout', 'e-sports', 'strava'],
    metaphorical: ['life workout', 'mental muscles', 'emotional cardio', 'spiritual gains'],
    slang: ['gains', 'pump', 'swole', 'beast mode', 'shredded', 'jacked'],
    minimal: ['move', 'act', 'do', 'push', 'pull', 'work']
  },
  
  FOOD: {
    culinary: ['cooking', 'recipe', 'meal', 'dish', 'cuisine', 'gastronomy', 'chef'],
    nutritional: ['macros', 'micronutrients', 'calories', 'diet', 'fuel', 'nutrition'],
    agricultural: ['farm', 'harvest', 'organic', 'permaculture', 'grow', 'cultivate'],
    industrial: ['processed', 'manufactured', 'packaged', 'fast food', 'convenience'],
    economic: ['commodity', 'supply chain', 'food security', 'pricing', 'market'],
    cultural: ['tradition', 'heritage', 'festival', 'celebration', 'feast'],
    social: ['dining', 'feast', 'banquet', 'potluck', 'community kitchen', 'dinner party'],
    emotional: ['comfort food', 'nostalgia', 'memory', 'soul food', 'favorite'],
    spiritual: ['offering', 'sacrament', 'fasting', 'mindful eating', 'blessed'],
    artistic: ['food art', 'molecular gastronomy', 'presentation', 'plating'],
    metaphorical: ['food for thought', 'intellectual nourishment', 'brain food'],
    slang: ['grub', 'chow', 'eats', 'nom', 'munchies', 'scran', 'vittles']
  },
  
  MONEY: {
    financial: ['currency', 'investment', 'savings', 'wealth', 'capital', 'assets'],
    commercial: ['transaction', 'sale', 'purchase', 'commerce', 'trade', 'business'],
    technical: ['ledger', 'accounting', 'balance sheet', 'audit', 'bookkeeping'],
    digital: ['crypto', 'blockchain', 'NFT', 'digital wallet', 'DeFi', 'bitcoin'],
    economic: ['inflation', 'GDP', 'market', 'liquidity', 'valuation', 'economy'],
    social: ['donation', 'charity', 'tip', 'inheritance', 'loan', 'gift'],
    psychological: ['security', 'freedom', 'status', 'power', 'stress', 'worry'],
    metaphorical: ['time is money', 'social currency', 'cultural capital', 'pay attention'],
    spiritual: ['abundance', 'prosperity', 'karma', 'energy exchange', 'flow'],
    slang: ['dough', 'bucks', 'cheddar', 'bread', 'coin', 'stack', 'benjamins']
  },
  
  KNOWLEDGE: {
    academic: ['research', 'thesis', 'study', 'paper', 'peer review', 'dissertation'],
    educational: ['lesson', 'course', 'tutorial', 'workshop', 'seminar', 'class'],
    technical: ['documentation', 'manual', 'specification', 'blueprint', 'guide'],
    institutional: ['library', 'archive', 'database', 'repository', 'collection'],
    digital: ['wiki', 'blog', 'tutorial', 'e-learning', 'knowledge base', 'FAQ'],
    practical: ['know-how', 'skills', 'expertise', 'experience', 'competence'],
    traditional: ['wisdom', 'lore', 'folklore', 'oral tradition', 'teaching'],
    spiritual: ['gnosis', 'enlightenment', 'revelation', 'insight', 'awakening'],
    creative: ['idea', 'inspiration', 'brainstorm', 'innovation', 'eureka'],
    social: ['mentorship', 'advice', 'counsel', 'consultation', 'guidance'],
    metaphorical: ['light', 'clarity', 'vision', 'map', 'compass', 'illuminate'],
    slang: ['brain food', 'mental juice', 'know the ropes', 'hack', 'pro tip']
  },
  
  TIME: {
    chronological: ['clock', 'calendar', 'schedule', 'timeline', 'date', 'hour'],
    biological: ['circadian', 'aging', 'lifespan', 'biological clock', 'rhythm'],
    perceptual: ['flow', 'waiting', 'boredom', 'time flies', 'drag', 'rush'],
    historical: ['era', 'epoch', 'period', 'century', 'decade', 'generation'],
    philosophical: ['eternity', 'infinity', 'moment', 'now', 'present', 'temporal'],
    physical: ['relativity', 'space-time', 'quantum time', 'temporal', 'duration'],
    metaphorical: ['time is money', 'window of opportunity', 'borrowed time', 'deadline'],
    spiritual: ['karma', 'destiny', 'divine timing', 'reincarnation', 'cycles']
  },
  
  SPACE: {
    physical: ['distance', 'area', 'volume', 'coordinates', 'location', 'place'],
    astronomical: ['universe', 'galaxy', 'solar system', 'cosmos', 'celestial'],
    mathematical: ['dimension', 'vector', 'topology', 'manifold', 'geometry'],
    architectural: ['room', 'building', 'city', 'landscape', 'structure'],
    social: ['territory', 'personal space', 'crowding', 'privacy', 'boundary'],
    digital: ['virtual space', 'cyberspace', 'metaverse', 'UI space', 'cloud'],
    metaphorical: ['headspace', 'emotional space', 'breathing room', 'mental space'],
    spiritual: ['sacred space', 'temple', 'altar', 'energy field', 'sanctuary']
  },
  
  // Additional concepts for comprehensive coverage
  CREATION: {
    artistic: ['art', 'paint', 'draw', 'sculpt', 'compose', 'design'],
    literary: ['write', 'author', 'poet', 'story', 'narrative', 'prose'],
    musical: ['music', 'song', 'melody', 'rhythm', 'harmony', 'composition'],
    digital: ['code', 'program', 'develop', 'build', 'engineer', 'architect'],
    physical: ['craft', 'make', 'build', 'construct', 'forge', 'assemble'],
    biological: ['birth', 'grow', 'reproduce', 'generate', 'evolve'],
    spiritual: ['manifest', 'channel', 'divine inspiration', 'co-create'],
    metaphorical: ['birth of idea', 'creative spark', 'muse', 'genesis']
  },
  
  RELATIONSHIP: {
    familial: ['family', 'parent', 'child', 'sibling', 'relative', 'kin'],
    romantic: ['love', 'partner', 'spouse', 'dating', 'romance', 'intimacy'],
    social: ['friend', 'colleague', 'neighbor', 'community', 'network'],
    professional: ['client', 'customer', 'employer', 'employee', 'vendor'],
    adversarial: ['rival', 'competitor', 'enemy', 'opponent', 'adversary'],
    spiritual: ['soul mate', 'twin flame', 'karmic', 'divine union'],
    digital: ['follower', 'connection', 'friend request', 'match', 'DM'],
    metaphorical: ['bond', 'bridge', 'link', 'tie', 'connection']
  }
};

/**
 * Link text to all relevant concepts with confidence scores
 * @param {string} text - Text to analyze
 * @param {Object} options - Analysis options
 * @returns {Object} Concepts with confidence scores
 */
function linkConcepts(text, options = {}) {
  const { 
    minConfidence = 0.3,
    includeStyles = true,
    boostFolder = null 
  } = options;
  
  const textLower = text.toLowerCase();
  const concepts = {};
  
  // Analyze each concept domain
  for (const [concept, styles] of Object.entries(SEMANTIC_CONCEPTS)) {
    let conceptScore = 0;
    const matchedStyles = new Set();
    
    // Check each style/expression of the concept
    for (const [style, terms] of Object.entries(styles)) {
      let styleScore = 0;
      let matchCount = 0;
      
      // Check each term
      for (const term of terms) {
        if (textLower.includes(term.toLowerCase())) {
          matchCount++;
          // Weight by term specificity (longer = more specific = higher score)
          styleScore += (term.length / 10) * 0.1;
        }
      }
      
      if (matchCount > 0) {
        // Boost score for multiple matches in same style
        styleScore *= (1 + (matchCount - 1) * 0.2);
        conceptScore += styleScore;
        matchedStyles.add(style);
      }
    }
    
    // Folder boost if concept matches folder context
    if (boostFolder && concept.toLowerCase().includes(boostFolder.toLowerCase())) {
      conceptScore *= 1.5;
    }
    
    // Store if above threshold
    if (conceptScore >= minConfidence) {
      concepts[concept] = {
        score: Math.min(conceptScore, 1.0),
        styles: includeStyles ? Array.from(matchedStyles) : undefined
      };
    }
  }
  
  return concepts;
}

/**
 * Expand a query to include semantically related terms
 * @param {string} query - User's search query
 * @param {Object} options - Expansion options
 * @returns {Array} Expanded query terms
 */
function expandQuery(query, options = {}) {
  const { 
    maxTerms = 20,
    includeAllStyles = false,
    conceptsOnly = null // array of concepts to limit to
  } = options;
  
  const expanded = new Set([query]);
  const queryLower = query.toLowerCase();
  
  // Find matching concepts
  const concepts = linkConcepts(query, { minConfidence: 0.2 });
  
  // Expand based on matched concepts
  for (const [concept, data] of Object.entries(concepts)) {
    if (conceptsOnly && !conceptsOnly.includes(concept)) continue;
    
    const conceptData = SEMANTIC_CONCEPTS[concept];
    if (!conceptData) continue;
    
    if (includeAllStyles) {
      // Add all terms from all styles
      Object.values(conceptData).flat().forEach(term => {
        if (expanded.size < maxTerms) {
          expanded.add(term.toLowerCase());
        }
      });
    } else {
      // Add only terms from matched styles
      for (const style of (data.styles || [])) {
        const terms = conceptData[style] || [];
        terms.forEach(term => {
          if (expanded.size < maxTerms) {
            expanded.add(term.toLowerCase());
          }
        });
      }
    }
  }
  
  return Array.from(expanded);
}

/**
 * Get concept signature for a piece of content
 * @param {string} content - Content to analyze
 * @returns {Object} Concept signature with scores
 */
function getConceptSignature(content) {
  const concepts = linkConcepts(content, { 
    minConfidence: 0.1,
    includeStyles: true 
  });
  
  // Sort by score
  const sorted = Object.entries(concepts)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 5); // Top 5 concepts
  
  return {
    primary: sorted[0]?.[0] || 'GENERAL',
    secondary: sorted.slice(1).map(([concept]) => concept),
    signature: concepts,
    profile: generateConceptProfile(concepts)
  };
}

/**
 * Generate a human-readable concept profile
 * @param {Object} concepts - Concept scores
 * @returns {string} Profile description
 */
function generateConceptProfile(concepts) {
  const primary = Object.entries(concepts)
    .sort((a, b) => b[1].score - a[1].score)[0];
  
  if (!primary) return 'General content';
  
  const [concept, data] = primary;
  const styles = data.styles || [];
  
  // Build profile
  let profile = concept.toLowerCase();
  if (styles.length > 0) {
    profile += ` (${styles.slice(0, 2).join(', ')} style)`;
  }
  
  return profile;
}

/**
 * Calculate similarity between two pieces of content
 * @param {string} content1 - First content
 * @param {string} content2 - Second content
 * @returns {number} Similarity score 0-1
 */
function calculateSemanticSimilarity(content1, content2) {
  const sig1 = getConceptSignature(content1);
  const sig2 = getConceptSignature(content2);
  
  let similarity = 0;
  let totalWeight = 0;
  
  // Compare concept signatures
  for (const concept in sig1.signature) {
    if (sig2.signature[concept]) {
      const score1 = sig1.signature[concept].score;
      const score2 = sig2.signature[concept].score;
      similarity += Math.min(score1, score2);
      totalWeight += Math.max(score1, score2);
    }
  }
  
  return totalWeight > 0 ? similarity / totalWeight : 0;
}

/**
 * Integration with retagger - classify based on semantic concepts
 * @param {Object} capsule - Capsule to classify
 * @param {string} folderName - Folder context
 * @returns {Object} Classification result
 */
function classifyWithSemantics(capsule, folderName = null) {
  const content = JSON.stringify(capsule);
  const concepts = linkConcepts(content, {
    boostFolder: folderName,
    minConfidence: 0.4
  });
  
  // Map concepts to retagger types
  const conceptToType = {
    'FITNESS': 'fitness',
    'FOOD': 'recipe',
    'MONEY': 'financial',
    'KNOWLEDGE': 'documentation',
    'TIME': 'scheduling',
    'SPACE': 'location',
    'CREATION': 'creative',
    'RELATIONSHIP': 'social'
  };
  
  // Build classifications
  const classifications = [];
  for (const [concept, data] of Object.entries(concepts)) {
    const type = conceptToType[concept];
    if (type) {
      classifications.push({
        type,
        confidence: data.score,
        source: 'semantic',
        concept,
        styles: data.styles
      });
    }
  }
  
  // Sort by confidence
  classifications.sort((a, b) => b.confidence - a.confidence);
  
  return {
    primary: classifications[0] || { type: 'general', confidence: 0.1 },
    all: classifications,
    signature: concepts
  };
}

// Export for use in other modules
module.exports = {
  SEMANTIC_CONCEPTS,
  linkConcepts,
  expandQuery,
  getConceptSignature,
  calculateSemanticSimilarity,
  classifyWithSemantics,
  generateConceptProfile
};