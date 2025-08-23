#!/usr/bin/env node
// retagger.js – Advanced modular file classification system for Echo Rubicon
const fs = require('fs');
const path = require('path');
const { classifyWithSemantics, expandQuery } = require('./semanticMapper');

// === DOMAIN-SPECIFIC CLASSIFICATION PATTERNS ===
const CLASSIFICATION_PATTERNS = {
  // Academic & Research
  academic: {
    patterns: ['citation', 'source:', 'doi:', 'isbn:', 'peer review', 'abstract:', 'methodology', 'hypothesis', 'findings:', 'theory', 'literature review', 'bibliography'],
    confidence: 0.85,
    tags: ['research', 'academic', 'scholarly']
  },
  
  // Health & Medical
  medical: {
    patterns: ['protocol', 'dosage', 'symptom', 'diagnosis', 'treatment', 'patient', 'medication', 'mg', 'ml', 'prescription', 'condition:', 'side effects', 'niacin', 'vitamin', 'supplement'],
    confidence: 0.9,
    tags: ['health', 'medical', 'healthcare']
  },
  
  // Engineering & Technical
  engineering: {
    patterns: ['blueprint', 'spec:', 'specification', 'tolerance', 'dimension', 'material:', 'load', 'stress', 'strain', 'cad', 'schematic', 'component'],
    confidence: 0.85,
    tags: ['engineering', 'technical', 'specs']
  },
  
  // Psychology & Mental Health
  psychology: {
    patterns: ['schema', 'trauma', 'modalities', 'therapy', 'cognitive', 'behavioral', 'mindfulness', 'coping', 'dsm', 'assessment', 'intervention'],
    confidence: 0.85,
    tags: ['psychology', 'mental-health', 'therapy']
  },
  
  // Business & Sales
  business: {
    patterns: ['sold for', 'client', 'invoice', 'quote', 'contract', 'revenue', 'expense', 'profit', 'roi', 'kpi', 'forecast', 'pipeline', 'deal'],
    confidence: 0.85,
    tags: ['business', 'sales', 'commercial']
  },
  
  // Daily Living & Household
  household: {
    patterns: ['repair', 'plumbing', 'fridge', 'shopping list', 'grocery', 'maintenance', 'appliance', 'furniture', 'cleaning', 'organize', 'home'],
    confidence: 0.75,
    tags: ['household', 'daily-living', 'home']
  },
  
  // Echo Rubicon Specific
  echo: {
    patterns: [
      'echo rubicon', 
      'q-lib', 
      'memory capsule', 
      'technical handoff', 
      'vaultpath', 
      'memory architecture', 
      'echo system', 
      'memory loop', 
      'consciousnesse ai', 
      'capsule retriever',
      'chaosanalyzer',
      'memory vault manager',
      'omniscient search',
      'blended injection',
      'epoch classifier',
      'identity persistence',
      'memory injection'
    ],
    requiresContext: ['echo', 'rubicon', 'handoff', 'architecture'],
    confidence: 0.95,
    tags: ['echo', 'rubicon', 'system']
  },
  
  // Recipe Detection (Strict)
  recipe: {
    patterns: ['ingredients:', 'tbsp', 'tsp', 'cup', 'oven', 'bake', 'cook', 'serves', 'calories:', 'nutrition:'],
    requiresContext: ['food', 'recipe', 'cooking', 'kitchen', 'meal'],
    confidence: 0.9,
    tags: ['recipe', 'cooking', 'food']
  },
  
  // Legal Documents
  legal: {
    patterns: ['agreement', 'clause', 'whereas', 'herein', 'liability', 'jurisdiction', 'terms and conditions', 'nda', 'confidential'],
    confidence: 0.85,
    tags: ['legal', 'contract', 'agreement']
  },
  
  // Project Management
  project: {
    patterns: ['milestone', 'deliverable', 'timeline', 'gantt', 'sprint', 'backlog', 'task:', 'deadline', 'status:', 'blocker'],
    confidence: 0.8,
    tags: ['project', 'management', 'planning']
  },
  
  // Financial
  financial: {
    patterns: ['balance sheet', 'p&l', 'cash flow', 'asset', 'liability', 'equity', 'debit', 'credit', 'transaction', 'account'],
    confidence: 0.85,
    tags: ['financial', 'accounting', 'finance']
  },
  
  // Creative & Fiction
  creative: {
    patterns: ['character', 'plot', 'scene', 'dialogue', 'narrative', 'story', 'chapter', 'protagonist', 'setting', 'draft'],
    confidence: 0.75,
    tags: ['creative', 'writing', 'fiction']
  },
  
  // === NEW EXPANDED CATEGORIES ===
  
  // Journaling & Personal Reflection
  journal: {
    patterns: ['dear diary', 'today i', 'i feel', 'journal entry', 'reflection:', 'grateful for', 'mood:', 'daily log', 'morning pages', 'thoughts:', 'personal note'],
    confidence: 0.85,
    tags: ['journal', 'personal', 'reflection', 'diary']
  },
  
  // Meditation & Mindfulness
  meditation: {
    patterns: ['meditation', 'breathing', 'mantra', 'chakra', 'mindful', 'present moment', 'awareness', 'consciousness', 'enlightenment', 'zen', 'vipassana', 'zazen'],
    confidence: 0.85,
    tags: ['meditation', 'mindfulness', 'spiritual-practice']
  },
  
  // Religious & Spiritual Studies
  religious: {
    patterns: ['scripture', 'verse', 'prayer', 'sermon', 'theology', 'sacred', 'divine', 'worship', 'faith', 'blessing', 'psalm', 'sutra', 'torah', 'bible', 'quran'],
    confidence: 0.85,
    tags: ['religious', 'spiritual', 'faith', 'theology']
  },
  
  // Dreams & Sleep
  dreams: {
    patterns: ['dream journal', 'lucid dream', 'nightmare', 'dream symbol', 'rem', 'sleep pattern', 'dream interpretation', 'unconscious', 'dream diary'],
    confidence: 0.8,
    tags: ['dreams', 'sleep', 'unconscious', 'journal']
  },
  
  // Fitness & Exercise
  fitness: {
    patterns: ['workout', 'exercise', 'reps', 'sets', 'cardio', 'strength', 'gym', 'training', 'fitness goal', 'pr:', 'personal record', 'calories burned'],
    confidence: 0.85,
    tags: ['fitness', 'exercise', 'health', 'training']
  },
  
  // Nutrition & Diet
  nutrition: {
    patterns: ['meal plan', 'macros', 'protein', 'carbs', 'fats', 'calorie', 'diet', 'nutrition', 'supplement', 'vitamins', 'minerals', 'food log'],
    confidence: 0.8,
    tags: ['nutrition', 'diet', 'health', 'food']
  },
  
  // Travel & Adventures
  travel: {
    patterns: ['itinerary', 'flight', 'hotel', 'passport', 'visa', 'destination', 'travel plan', 'packing list', 'reservation', 'booking', 'trip report'],
    confidence: 0.85,
    tags: ['travel', 'adventure', 'planning', 'vacation']
  },
  
  // Education & Learning
  education: {
    patterns: ['course', 'lesson', 'homework', 'assignment', 'exam', 'study notes', 'lecture', 'syllabus', 'curriculum', 'grade', 'semester', 'student'],
    confidence: 0.85,
    tags: ['education', 'learning', 'study', 'academic']
  },
  
  // Hobbies & Collections
  hobby: {
    patterns: ['collection', 'hobby', 'craft', 'diy', 'tutorial', 'pattern', 'technique', 'supplies', 'tools needed', 'skill level', 'beginner', 'advanced'],
    confidence: 0.75,
    tags: ['hobby', 'craft', 'collection', 'diy']
  },
  
  // Music & Audio
  music: {
    patterns: ['song', 'lyrics', 'chord', 'tab', 'sheet music', 'playlist', 'album', 'artist', 'genre', 'bpm', 'key of', 'tempo', 'composition'],
    confidence: 0.8,
    tags: ['music', 'audio', 'creative', 'art']
  },
  
  // Video & Film
  media: {
    patterns: ['movie', 'film', 'video', 'scene', 'shot list', 'storyboard', 'screenplay', 'director', 'cinematography', 'edit', 'post-production'],
    confidence: 0.8,
    tags: ['video', 'film', 'media', 'creative']
  },
  
  // Games & Gaming
  gaming: {
    patterns: ['game', 'level', 'quest', 'achievement', 'walkthrough', 'strategy guide', 'build', 'loadout', 'stats', 'gameplay', 'speedrun', 'mod'],
    confidence: 0.8,
    tags: ['gaming', 'games', 'entertainment']
  },
  
  // Relationships & Social
  relationships: {
    patterns: ['relationship', 'friendship', 'family', 'partner', 'anniversary', 'birthday', 'gift idea', 'date night', 'conflict resolution', 'communication'],
    confidence: 0.75,
    tags: ['relationships', 'social', 'personal']
  },
  
  // Goals & Planning
  goals: {
    patterns: ['goal', 'objective', 'target', 'vision', 'mission', 'okr', 'smart goal', 'annual review', 'quarterly planning', 'bucket list', 'life plan'],
    confidence: 0.8,
    tags: ['goals', 'planning', 'personal-development']
  },
  
  // Habits & Routines
  habits: {
    patterns: ['habit', 'routine', 'daily', 'weekly', 'streak', 'consistency', 'morning routine', 'evening routine', 'habit tracker', 'ritual'],
    confidence: 0.8,
    tags: ['habits', 'routines', 'productivity']
  },
  
  // Ideas & Brainstorming
  ideas: {
    patterns: ['idea', 'brainstorm', 'concept', 'inspiration', 'what if', 'possibility', 'innovation', 'invention', 'eureka', 'lightbulb'],
    confidence: 0.75,
    tags: ['ideas', 'brainstorming', 'creative']
  },
  
  // Quotes & Wisdom
  quotes: {
    patterns: ['quote', 'saying', 'proverb', 'wisdom', 'inspiration', 'motivational', 'philosophy', 'aphorism', 'maxim', 'principle'],
    confidence: 0.75,
    tags: ['quotes', 'wisdom', 'inspiration']
  },
  
  // Personal Finance
  personalfinance: {
    patterns: ['budget', 'savings', 'investment', 'retirement', '401k', 'ira', 'stock', 'portfolio', 'net worth', 'fire', 'debt', 'mortgage'],
    confidence: 0.85,
    tags: ['personal-finance', 'money', 'investment']
  },
  
  // Real Estate & Property
  realestate: {
    patterns: ['property', 'real estate', 'mortgage', 'rental', 'tenant', 'landlord', 'lease', 'square feet', 'listing', 'mls', 'closing'],
    confidence: 0.85,
    tags: ['real-estate', 'property', 'investment']
  },
  
  // Automotive & Vehicles
  automotive: {
    patterns: ['car', 'vehicle', 'maintenance', 'oil change', 'tire', 'engine', 'mpg', 'fuel', 'insurance', 'registration', 'vin'],
    confidence: 0.8,
    tags: ['automotive', 'vehicle', 'transportation']
  },
  
  // Pets & Animals
  pets: {
    patterns: ['pet', 'dog', 'cat', 'vet', 'vaccination', 'feeding', 'grooming', 'training', 'breed', 'adoption', 'animal care'],
    confidence: 0.8,
    tags: ['pets', 'animals', 'care']
  },
  
  // Garden & Plants
  garden: {
    patterns: ['plant', 'garden', 'soil', 'seed', 'harvest', 'watering', 'pruning', 'fertilizer', 'growing zone', 'botanical', 'landscaping'],
    confidence: 0.8,
    tags: ['garden', 'plants', 'nature']
  },
  
  // Weather & Environment
  weather: {
    patterns: ['weather', 'forecast', 'temperature', 'precipitation', 'humidity', 'pressure', 'climate', 'storm', 'seasonal', 'meteorology'],
    confidence: 0.8,
    tags: ['weather', 'environment', 'climate']
  },
  
  // Security & Privacy
  security: {
    patterns: ['password', 'security', 'encryption', '2fa', 'backup', 'recovery', 'privacy', 'vpn', 'firewall', 'antivirus', 'breach'],
    confidence: 0.85,
    tags: ['security', 'privacy', 'technology']
  },
  
  // Genealogy & Family History
  genealogy: {
    patterns: ['ancestor', 'family tree', 'genealogy', 'heritage', 'lineage', 'generation', 'birth record', 'census', 'family history'],
    confidence: 0.85,
    tags: ['genealogy', 'family', 'history']
  },
  
  // Art & Design
  art: {
    patterns: ['art', 'design', 'sketch', 'drawing', 'painting', 'illustration', 'color palette', 'composition', 'medium', 'technique', 'portfolio'],
    confidence: 0.8,
    tags: ['art', 'design', 'creative', 'visual']
  },
  
  // Fashion & Style
  fashion: {
    patterns: ['outfit', 'wardrobe', 'style', 'fashion', 'clothing', 'accessory', 'trend', 'capsule wardrobe', 'lookbook', 'ootd'],
    confidence: 0.75,
    tags: ['fashion', 'style', 'clothing']
  },
  
  // Events & Occasions
  events: {
    patterns: ['event', 'party', 'wedding', 'celebration', 'rsvp', 'invitation', 'venue', 'catering', 'guest list', 'schedule of events'],
    confidence: 0.8,
    tags: ['events', 'occasions', 'planning']
  },
  
  // Self-Improvement
  selfimprovement: {
    patterns: ['self-improvement', 'personal growth', 'development', 'skill', 'learning path', 'progress', 'milestone', 'breakthrough', 'transformation'],
    confidence: 0.8,
    tags: ['self-improvement', 'growth', 'development']
  },
  
  // Philosophy & Ethics
  philosophy: {
    patterns: ['philosophy', 'ethics', 'morality', 'existential', 'meaning', 'purpose', 'virtue', 'logic', 'reasoning', 'dialectic', 'metaphysics'],
    confidence: 0.85,
    tags: ['philosophy', 'ethics', 'thinking']
  },
  
  // Tarot & Divination
  tarot: {
    patterns: ['tarot', 'major arcana', 'minor arcana', 'cups', 'wands', 'swords', 'pentacles', 'spread', 'rider waite', 'thoth', 'marseille', 'fool', 'magician', 'priestess', 'empress', 'emperor', 'hierophant', 'lovers', 'chariot', 'strength', 'hermit', 'wheel of fortune', 'justice', 'hanged man', 'death', 'temperance', 'devil', 'tower', 'star', 'moon', 'sun', 'judgement', 'world', 'divination', 'oracle', 'reading', 'querent', 'significator', 'celtic cross', 'three card'],
    confidence: 0.9,
    tags: ['tarot', 'divination', 'spiritual', 'oracle']
  },
  
  // Astrology & Zodiac
  astrology: {
    patterns: ['astrology', 'zodiac', 'horoscope', 'natal chart', 'birth chart', 'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces', 'ascendant', 'descendant', 'midheaven', 'mercury retrograde', 'venus', 'mars', 'jupiter', 'saturn', 'neptune', 'pluto', 'houses', 'aspects', 'conjunction', 'trine', 'square', 'opposition'],
    confidence: 0.9,
    tags: ['astrology', 'zodiac', 'spiritual', 'cosmic']
  },
  
  // Cryptocurrency & Blockchain
  crypto: {
    patterns: ['bitcoin', 'ethereum', 'cryptocurrency', 'blockchain', 'wallet', 'seed phrase', 'private key', 'public key', 'defi', 'nft', 'smart contract', 'gas fee', 'mining', 'staking', 'hodl', 'satoshi', 'wei', 'altcoin', 'exchange', 'ledger', 'metamask'],
    confidence: 0.9,
    tags: ['crypto', 'blockchain', 'finance', 'digital-assets']
  },
  
  // Wine & Spirits
  wine: {
    patterns: ['vintage', 'varietal', 'tannins', 'bouquet', 'terroir', 'appellation', 'cabernet', 'merlot', 'pinot', 'chardonnay', 'sommelier', 'pairing', 'tasting notes', 'finish', 'oak', 'cellar', 'decant', 'whiskey', 'bourbon', 'scotch', 'brandy'],
    confidence: 0.85,
    tags: ['wine', 'spirits', 'tasting', 'collection']
  },
  
  // Ancestry & DNA
  ancestry: {
    patterns: ['ancestor', 'family tree', 'genealogy', 'heritage', 'lineage', 'generation', 'birth record', 'census', 'family history', 'dna test', 'haplogroup', '23andme', 'ancestry.com', 'gedcom', 'pedigree'],
    confidence: 0.85,
    tags: ['genealogy', 'family', 'history', 'ancestry']
  },
  
  // Prepping & Survivalism
  prepping: {
    patterns: ['bugout bag', 'shtf', 'teotwawki', 'prepper', 'stockpile', 'off-grid', 'homestead', 'self-sufficient', 'bunker', 'mre', 'water purification', 'ham radio', 'solar power', 'generator', 'ammunition'],
    confidence: 0.85,
    tags: ['prepping', 'survival', 'self-sufficiency', 'emergency']
  },
  
  // Occult & Esoteric
  occult: {
    patterns: ['ritual', 'sigil', 'grimoire', 'spell', 'incantation', 'alchemy', 'hermetic', 'kabbalah', 'enochian', 'chaos magic', 'ceremonial', 'invocation', 'banishing', 'scrying', 'astral', 'akashic'],
    confidence: 0.85,
    tags: ['occult', 'esoteric', 'magic', 'mystical']
  },
  
  // Biohacking & Quantified Self
  biohacking: {
    patterns: ['biohack', 'nootropic', 'stack', 'microdose', 'intermittent fasting', 'ketosis', 'hrv', 'heart rate variability', 'sleep tracking', 'cgm', 'continuous glucose', 'peptide', 'nad+', 'mitochondria', 'longevity'],
    confidence: 0.85,
    tags: ['biohacking', 'quantified-self', 'optimization', 'health']
  },
  
  // TTRPG & Role-playing
  ttrpg: {
    patterns: ['d&d', 'dungeons', 'character sheet', 'dice roll', 'd20', 'dm', 'dungeon master', 'campaign', 'npc', 'initiative', 'armor class', 'hit points', 'spell slot', 'pathfinder', 'critical role'],
    confidence: 0.85,
    tags: ['ttrpg', 'rpg', 'gaming', 'tabletop']
  },
  
  // Maker & 3D Printing
  maker: {
    patterns: ['3d print', 'filament', 'slicer', 'gcode', 'arduino', 'raspberry pi', 'esp32', 'breadboard', 'soldering', 'pcb', 'cad model', 'fusion 360', 'tinkercad', 'makerspace', 'cnc'],
    confidence: 0.85,
    tags: ['maker', '3d-printing', 'electronics', 'diy']
  },
  
  // Permaculture & Sustainable Living
  permaculture: {
    patterns: ['permaculture', 'food forest', 'companion planting', 'hugelkultur', 'swales', 'guild', 'polyculture', 'regenerative', 'composting', 'vermiculture', 'aquaponics', 'rainwater harvest', 'greywater'],
    confidence: 0.85,
    tags: ['permaculture', 'sustainable', 'gardening', 'ecology']
  },
  
  // Language Learning
  language: {
    patterns: ['vocabulary', 'conjugation', 'grammar rule', 'flashcard', 'anki', 'duolingo', 'language exchange', 'pronunciation', 'dialect', 'immersion', 'polyglot', 'fluency', 'accent'],
    confidence: 0.8,
    tags: ['language', 'learning', 'linguistics', 'education']
  },
  
  // Psychedelics & Consciousness
  psychedelics: {
    patterns: ['psychedelic', 'entheogen', 'ayahuasca', 'psilocybin', 'dmt', 'lsd', 'mdma', 'set and setting', 'integration', 'ceremony', 'shaman', 'journey', 'ego death', 'trip report'],
    confidence: 0.85,
    tags: ['psychedelics', 'consciousness', 'spiritual', 'experiential']
  },
  
  // Minimalism & Decluttering
  minimalism: {
    patterns: ['minimalism', 'declutter', 'konmari', 'spark joy', 'capsule wardrobe', 'tiny house', 'simple living', 'essentialism', 'digital minimalism', 'downsizing', 'voluntary simplicity'],
    confidence: 0.8,
    tags: ['minimalism', 'lifestyle', 'organizing', 'simplicity']
  },
  
  // Van Life & Nomadic
  vanlife: {
    patterns: ['van life', 'vanlife', 'conversion', 'boondocking', 'stealth camping', 'solar setup', 'composting toilet', 'grey water', 'nomadic', 'digital nomad', 'overlanding', 'skoolie'],
    confidence: 0.85,
    tags: ['vanlife', 'nomadic', 'travel', 'lifestyle']
  },
  
  // Foraging & Wildcrafting
  foraging: {
    patterns: ['foraging', 'wildcraft', 'edible plants', 'mushroom hunting', 'chanterelle', 'morel', 'medicinal herbs', 'wildcrafted', 'field guide', 'identification key', 'spore print', 'sustainable harvest'],
    confidence: 0.85,
    tags: ['foraging', 'wildcrafting', 'nature', 'herbalism']
  },
  
  // Emergency & Preparedness
  emergency: {
    patterns: ['emergency', 'disaster', 'preparedness', 'survival', 'first aid', 'evacuation', 'supplies', 'contingency', 'crisis plan'],
    confidence: 0.85,
    tags: ['emergency', 'preparedness', 'safety']
  }
};

// === STRUCTURAL CLASSIFIERS ===
const STRUCTURAL_PATTERNS = {
  conversation: {
    check: (content) => /user:|ai:|assistant:|human:/i.test(content),
    confidence: 0.8,
    tags: ['conversation', 'dialogue']
  },
  
  documentation: {
    check: (content) => /readme|api reference|user guide|installation|configuration|usage:/i.test(content),
    confidence: 0.85,
    tags: ['documentation', 'docs', 'guide']
  },
  
  data: {
    check: (content) => {
      try {
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        return Array.isArray(parsed) || (parsed.data && Array.isArray(parsed.data));
      } catch {
        return /\[.*\]|\{.*\}/s.test(content) && content.length > 500;
      }
    },
    confidence: 0.7,
    tags: ['data', 'structured']
  }
};

/**
 * Extract metadata from file path and name
 */
function extractPathMetadata(filePath) {
  const basename = path.basename(filePath, '.json');
  const dirname = path.dirname(filePath);
  const parts = dirname.split(path.sep);
  
  return {
    fileName: basename,
    folder: parts[parts.length - 1] || 'root',
    folderPath: dirname,
    fileDate: basename.match(/\d{4}-\d{2}-\d{2}/) ? basename.match(/\d{4}-\d{2}-\d{2}/)[0] : null
  };
}

/**
 * Detect entities in content
 */
function detectEntities(content) {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  const entities = {
    emails: (text.match(/[\w.-]+@[\w.-]+\.\w+/g) || []).length > 0,
    phones: (text.match(/\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}/g) || []).length > 0,
    urls: (text.match(/https?:\/\/[^\s]+/g) || []).length > 0,
    dates: (text.match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g) || []).length > 0,
    money: (text.match(/\$[\d,]+\.?\d*/g) || []).length > 0,
    people: (text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) || []).length > 0
  };
  
  return entities;
}

/**
 * Main classification function
 */
function classifyCapsule(capsule, filePath = null) {
  // Check if locked
  if (capsule.locked === true) {
    return {
      type: capsule.type || 'general',
      confidence: 1.0,
      secondaryTypes: [],
      tags: capsule.metadata?.tags || [],
      source: 'locked',
      reason: 'Capsule is locked - classification preserved'
    };
  }
  
  const content = JSON.stringify(capsule).toLowerCase();
  const existingTags = capsule.metadata?.tags || [];
  const pathMeta = filePath ? extractPathMetadata(filePath) : {};
  const entities = detectEntities(capsule);
  
  const classifications = [];
  const sources = new Set();
  
  // === FOLDER OVERRIDE - Highest Priority ===
  const folderTypes = {
    'lifts': 'fitness',
    'foods': 'recipe',
    'clients': 'business',
    'medical': 'medical',
    'legal': 'legal',
    'sephirot': 'spiritual',
    'tarot': 'tarot',
    'scripts': 'code',
    'path': 'documentation',
    'echo': 'echo'
  };
  
  if (pathMeta.folder && folderTypes[pathMeta.folder.toLowerCase()]) {
    const folderType = folderTypes[pathMeta.folder.toLowerCase()];
    const config = CLASSIFICATION_PATTERNS[folderType] || {};
    
    return {
      type: folderType,
      confidence: 0.95,
      secondaryTypes: [],
      tags: [...new Set([...existingTags, ...(config.tags || []), pathMeta.folder.toLowerCase()])],
      source: 'folder-override',
      classifications: [{
        type: folderType,
        confidence: 0.95,
        source: 'folder-override'
      }]
    };
  }

  // Semantic classification attempt
  const semanticResult = classifyWithSemantics(capsule, pathMeta.folder);
  if (semanticResult.primary.confidence > 0.6) {
    classifications.push({
      type: semanticResult.primary.type,
      confidence: semanticResult.primary.confidence,
      source: 'semantic',
      concept: semanticResult.primary.concept
    });
  }
  
  // === Strict Folder Classification ===
  if (pathMeta.folder) {
    const folder = pathMeta.folder.toLowerCase();

    for (const [type, config] of Object.entries(CLASSIFICATION_PATTERNS)) {
      // Recipe is stricter — allow only if folder implies food
      if (type === 'recipe') {
        const validRecipeContext = ['food', 'foods', 'recipes', 'kitchen', 'meal', 'nutrition'];
        if (!validRecipeContext.includes(folder)) continue;
      }

      if (
        folder === type ||
        folder === type + 's' ||
        config.tags?.some(tag => folder.includes(tag))
      ) {
        classifications.push({
          type,
          confidence: config.confidence + 0.1,
          source: 'folder'
        });
        sources.add('folder');
        break;
      }
    }
  }
  
  // Check filename patterns
  if (pathMeta.fileName) {
    const fileName = pathMeta.fileName.toLowerCase();
    if (fileName.includes('invoice') || fileName.includes('inv-')) {
      classifications.push({ type: 'business', confidence: 0.9, source: 'fileName' });
      sources.add('fileName');
    }
    if (fileName.includes('recipe') || fileName.includes('cook')) {
      classifications.push({ type: 'recipe', confidence: 0.9, source: 'fileName' });
      sources.add('fileName');
    }
  }
  
  // Check metadata tags
  if (existingTags.length > 0) {
    for (const tag of existingTags) {
      for (const [type, config] of Object.entries(CLASSIFICATION_PATTERNS)) {
        if (config.tags.includes(tag.toLowerCase())) {
          classifications.push({
            type,
            confidence: config.confidence + 0.05,
            source: 'metadata'
          });
          sources.add('metadata');
        }
      }
    }
  }
  
  // Content-based classification with context requirements
  for (const [type, config] of Object.entries(CLASSIFICATION_PATTERNS)) {
    // PATCH: prevent over-tagging recipes unless folder matches
    if (type === 'recipe' && !['foods', 'food', 'recipes'].includes(pathMeta.folder?.toLowerCase())) {
      continue;
    }

    // Skip if requires context
    if (config.requiresContext) {
      const hasContext = config.requiresContext.some(ctx => 
        pathMeta.folder?.toLowerCase().includes(ctx) ||
        pathMeta.fileName?.toLowerCase().includes(ctx) ||
        existingTags.some(tag => tag.toLowerCase().includes(ctx))
      );

      if (!hasContext) {
        if (type === 'recipe' && config.patterns.some(p => content.includes(p.toLowerCase()))) {
          console.log(`[RECIPE BLOCKED] No context for: ${pathMeta.fileName || 'unknown'} in folder: ${pathMeta.folder || 'root'}`);
        }
        continue;
      }
    }

    const matches = config.patterns.filter(pattern =>
      content.includes(pattern.toLowerCase())
    ).length;

    if (matches > 0) {
      const confidence = Math.min(
        config.confidence + (matches * 0.05),
        0.99
      );
      classifications.push({
        type,
        confidence,
        source: 'content'
      });
      sources.add('content');
      
      if (type === 'recipe') {
        console.log(`[RECIPE CLASSIFIED] ${pathMeta.fileName || 'unknown'} → recipe (${matches} patterns matched)`);
      }
    }
  }
  
  // Structural pattern checks
  for (const [type, config] of Object.entries(STRUCTURAL_PATTERNS)) {
    if (config.check(content)) {
      classifications.push({
        type,
        confidence: config.confidence,
        source: 'structure'
      });
      sources.add('structure');
    }
  }
  
  // Entity-based boosts
  if (entities.emails && entities.phones) {
    const businessClass = classifications.find(c => c.type === 'business');
    if (businessClass) {
      businessClass.confidence = Math.min(businessClass.confidence + 0.1, 0.99);
    } else {
      classifications.push({
        type: 'client',
        confidence: 0.75,
        source: 'entity'
      });
    }
    sources.add('entity');
  }
  
  // Sort by confidence
  classifications.sort((a, b) => b.confidence - a.confidence);
  
  // Prepare result
  if (classifications.length === 0) {
    return {
      type: 'general',
      confidence: 0.1,
      secondaryTypes: [],
      tags: [...new Set([...existingTags, 'unclassified'])],
      source: 'fallback',
      reason: 'No patterns matched - using fallback classification'
    };
  }
  
  // Get primary and secondary types
  const primary = classifications[0];
  const secondary = classifications
    .slice(1, 4)
    .filter(c => c.confidence > 0.5)
    .map(c => c.type);
  
  // Merge tags
  const allTags = new Set(existingTags);
  
  // Add primary type tags
  const primaryConfig = CLASSIFICATION_PATTERNS[primary.type] || 
                       STRUCTURAL_PATTERNS[primary.type];
  if (primaryConfig?.tags) {
    primaryConfig.tags.forEach(tag => allTags.add(tag));
  }
  
  // Auto-add folder as tag
  if (pathMeta.folder && pathMeta.folder !== 'root') {
    allTags.add(pathMeta.folder.toLowerCase());
  }
  
  // Add entity tags
  if (entities.emails) allTags.add('has-email');
  if (entities.phones) allTags.add('has-phone');
  if (entities.money) allTags.add('financial-data');
  
  return {
    type: primary.type,
    confidence: primary.confidence,
    secondaryTypes: secondary,
    tags: Array.from(allTags),
    source: Array.from(sources).join('+'),
    classifications: classifications.slice(0, 5) // Top 5 for debugging
  };
}

/**
 * Process a single file
 */
function processFile(filePath, options = {}) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const capsule = JSON.parse(content);
    
    const classification = classifyCapsule(capsule, filePath);
    
    if (!options.dryRun) {
      // Update capsule
      capsule.type = classification.type;
      capsule.metadata = capsule.metadata || {};
      capsule.metadata.contentType = classification.type;
      capsule.metadata.secondaryTypes = classification.secondaryTypes;
      capsule.metadata.classificationConfidence = classification.confidence;
      capsule.metadata.classificationSource = classification.source;
      capsule.metadata.tags = classification.tags;
      capsule.metadata.classifiedAt = new Date().toISOString();
      
      // Save
      fs.writeFileSync(filePath, JSON.stringify(capsule, null, 2));
    }
    
    return { success: true, classification };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Retag entire vault
 */
function retagVault(vaultPath, options = {}) {
  const results = {
    processed: 0,
    errors: 0,
    byType: {},
    byConfidence: { high: 0, medium: 0, low: 0 }
  };
  
  function scanDir(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.json')) {
        const result = processFile(fullPath, options);
        
        if (result.success) {
          results.processed++;
          const type = result.classification.type;
          results.byType[type] = (results.byType[type] || 0) + 1;
          
          // Track confidence
          const conf = result.classification.confidence;
          if (conf >= 0.8) results.byConfidence.high++;
          else if (conf >= 0.5) results.byConfidence.medium++;
          else results.byConfidence.low++;
          
          if (options.verbose) {
            console.log(`✓ ${path.relative(vaultPath, fullPath)} → ${type} (${conf.toFixed(2)})`);
          }
        } else {
          results.errors++;
          if (options.verbose) {
            console.error(`✗ ${path.relative(vaultPath, fullPath)}: ${result.error}`);
          }
        }
      }
    }
  }
  
  scanDir(vaultPath);
  return results;
}

// === CLI INTERFACE ===
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.length === 0) {
    console.log(`
Echo Rubicon Advanced Retagger

Usage:
  node retagger.js --file <path>           Classify single file
  node retagger.js --vault <path>          Retag entire vault
  node retagger.js --test                  Run test examples
  
Options:
  --dry-run                                Don't save changes
  --verbose                                Show detailed output
  --help                                   Show this help

Examples:
  node retagger.js --file ./capsules/test.json
  node retagger.js --vault ./.echo/capsules --dry-run
    `);
    process.exit(0);
  }
  
  if (args.includes('--test')) {
    // Test capsules
    const testCapsules = [
      {
        name: 'Recipe Test',
        capsule: {
          type: 'unknown',
          content: 'Chocolate Cake Recipe\nIngredients: 2 cups flour, 1 cup sugar\nMethod: Mix and bake at 350F',
          metadata: { tags: ['recipes'] }
        }
      },
      {
        name: 'Invoice Test',
        capsule: {
          type: 'unknown',
          content: 'Invoice #1234\nClient: Acme Corp\nAmount: $5,000\nServices: Consulting',
          metadata: { tags: [] }
        }
      },
      {
        name: 'AI Doc Test',
        capsule: {
          type: 'unknown',
          content: 'Echo Rubicon Handoff Protocol\nMemory architecture uses Q-lib for capsule management',
          metadata: { tags: ['documentation'] }
        }
      }
    ];
    
    console.log('=== TEST RESULTS ===\n');
    testCapsules.forEach(test => {
      const result = classifyCapsule(test.capsule);
      console.log(`${test.name}:`);
      console.log(JSON.stringify(result, null, 2));
      console.log('---\n');
    });
    process.exit(0);
  }
  
  const fileIndex = args.indexOf('--file');
  const vaultIndex = args.indexOf('--vault');
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  
  if (fileIndex !== -1 && args[fileIndex + 1]) {
    const filePath = args[fileIndex + 1];
    const result = processFile(filePath, { dryRun, verbose });
    
    if (result.success) {
      console.log(JSON.stringify(result.classification, null, 2));
    } else {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  } else if (vaultIndex !== -1 && args[vaultIndex + 1]) {
    const vaultPath = args[vaultIndex + 1];
    console.log(`Retagging vault: ${vaultPath}`);
    
    const results = retagVault(vaultPath, { dryRun, verbose });
    
    console.log('\n=== SUMMARY ===');
    console.log(`Processed: ${results.processed}`);
    console.log(`Errors: ${results.errors}`);
    console.log('\nBy Type:');
    Object.entries(results.byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    console.log('\nBy Confidence:');
    console.log(`  High (≥0.8): ${results.byConfidence.high}`);
    console.log(`  Medium (≥0.5): ${results.byConfidence.medium}`);
    console.log(`  Low (<0.5): ${results.byConfidence.low}`);
  }
}

// Export for module use
module.exports = {
  classifyCapsule,
  processFile,
  retagVault,
  CLASSIFICATION_PATTERNS,
  STRUCTURAL_PATTERNS
};