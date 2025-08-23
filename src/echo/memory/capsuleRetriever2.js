// src/echo/memory/capsuleRetriever.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { getVaultPath } = require('../../../components/utils/VaultPathManager');

// Control file configuration for immutable testing
const CONTROL_FILE = {
  path: 'Foods/recipes.md',
  expectedHash: null,
  capsuleId: 'control-recipes',
  chaosScore: 0.9
};

// Category normalization map for common variations
const categoryMap = {
  workouts: 'lifts',
  training: 'lifts', 
  exercises: 'lifts',
  meals: 'recipes',
  food: 'recipes',
  foods: 'recipes',
  cooking: 'recipes',
  invoices: 'clients',
  customers: 'clients',
  contacts: 'clients'
};

// Detect if query is asking for a list vs specific item
function detectQueryIntent(query) {
  // Patterns that indicate categorical listing
  const listPatterns = [
    /^(list|show|what are|give me|display) (all )?(my |the )?(\w+)/i,
    /^all (my |the )?(\w+)/i,
    /^my (\w+)$/i,
    /^get (all |my )?(\w+)/i
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
      
      // Normalize category using map
      category = categoryMap[category] || category;
      
      return { 
        type: 'categorical', 
        category: category,
        isListQuery: true 
      };
    }
  }
  
  return { type: 'specific', isListQuery: false };
}

/**
 * Expand query terms for better semantic matching
 */
function expandQuery(query, options = {}) {
  const expansions = {
    'lifts': ['lifts', 'workout', 'exercise', 'training', 'fitness', 'ritual', 'temple', 'gym', 'strength'],
    'lift': ['lifts', 'workout', 'exercise', 'training', 'fitness', 'ritual', 'temple', 'gym', 'strength'],
    'workout': ['workout', 'exercise', 'training', 'lifts', 'fitness', 'gym', 'routine'],
    'workouts': ['workout', 'exercise', 'training', 'lifts', 'fitness', 'gym', 'routine'],
    'exercise': ['exercise', 'workout', 'training', 'lifts', 'fitness', 'movement', 'activity'],
    'recipe': ['recipe', 'food', 'meal', 'cooking', 'ingredient', 'dish', 'foods'],
    'recipes': ['recipe', 'food', 'meal', 'cooking', 'ingredient', 'dish', 'foods'],
    'client': ['client', 'customer', 'business', 'work', 'project'],
    'clients': ['client', 'customer', 'business', 'work', 'project']
  };
  
  const words = query.toLowerCase().split(/\s+/);
  const expandedTerms = new Set(words);
  
  words.forEach(word => {
    if (expansions[word]) {
      expansions[word].forEach(term => expandedTerms.add(term));
    }
  });
  
  // Limit expansion if requested
  const termsArray = Array.from(expandedTerms);
  if (options.maxTerms && termsArray.length > options.maxTerms) {
    return termsArray.slice(0, options.maxTerms);
  }
  
  return termsArray;
}

/**
 * Get the immutable control capsule for testing
 */
async function getControlCapsule(vaultPath) {
  try {
    const filePath = path.join(vaultPath, CONTROL_FILE.path);
    const content = await fs.readFile(filePath, 'utf8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    
    if (!CONTROL_FILE.expectedHash) {
      CONTROL_FILE.expectedHash = hash;
      console.log(`[CONTROL] Recipes hash locked: ${hash.substring(0, 8)}...`);
    } else if (hash !== CONTROL_FILE.expectedHash) {
      console.error(`[CONTROL] Recipe file hash mismatch!`);
      // Don't throw in production, just log
    }
    
    return {
      id: CONTROL_FILE.capsuleId,
      type: 'recipe',
      content: content,
      chaosScore: CONTROL_FILE.chaosScore,
      relevanceScore: 1.0, // Always maximum for control
      metadata: {
        immutable: true,
        source: 'control-file',
        fileName: 'recipes.md',
        folder: 'Foods'
      }
    };
  } catch (error) {
    console.error('[CONTROL] Failed to load control file:', error.message);
    return null;
  }
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
 * Detect if a capsule is recipe-related
 */
function isRecipeCapsule(capsule) {
  if (!capsule) return false;
  
  // Check explicit type
  if (capsule.type === 'recipe' || capsule.metadata?.type === 'recipe') {
    return true;
  }
  
  // Check folder
  if (capsule.metadata?.folder === 'Foods') {
    return true;
  }
  
  // Check content markers
  const content = (capsule.content || '').toLowerCase();
  const recipeMarkers = ['ingredients:', 'instructions:', 'servings:', 'prep time:'];
  return recipeMarkers.some(marker => content.includes(marker));
}

/**
 * Calculate relevance score between capsule and query
 * @param {Object} capsule - The capsule to score
 * @param {string} query - The search query
 * @returns {number} Relevance score between 0 and 1
 */
function calculateRelevance(capsule, query) {
  if (!query || !capsule) return 0;
  
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'my', 'your', 'our', 'their', 'what',
    'when', 'where', 'who', 'why', 'how', 'do', 'does', 'did', 'have',
    'has', 'had', 'should', 'would', 'could', 'can', 'may', 'might'
  ]);
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  
  // Special handling for fitness/lift queries
  if (queryLower.includes('lift') || queryLower.includes('exercise') || queryLower.includes('workout')) {
    // Check if it's a fitness capsule
    if (capsule.type === 'fitness' || capsule.metadata?.type === 'fitness') {
      return 0.8; // High relevance for fitness capsules
    }
    // Check for Temple rituals (your workout naming convention)
    const content = (capsule.content || capsule.summary || '').toLowerCase();
    if (content.includes('temple') && (content.includes('ritual') || content.includes('bench') || content.includes('squat'))) {
      return 0.9; // Very high relevance
    }
  }
  
  const expandedTerms = expandQuery(query, { maxTerms: 10 });
  let score = 0;
  const weights = {
    fullQuery: 0.4,
    wordMatch: 0.2,
    fileName: 0.15,
    recipeName: 0.15,
    typeMatch: 0.1,
    expandedMatch: 0.2
  };
  
  // Check content
  const content = (capsule.content || capsule.summary || '').toLowerCase();
  
  // Full query match
  if (queryWords.length > 0 && queryWords.every(word => content.includes(word))) {
    score += weights.fullQuery;
  }

  // Expanded terms match
  const expandedMatches = expandedTerms.filter(term => 
    content.includes(term.toLowerCase())
  ).length;
  if (expandedMatches > 0) {
    score += weights.expandedMatch * (expandedMatches / expandedTerms.length);
  }
  
  // Individual word matches
  if (queryWords.length > 0) {
    const wordMatches = queryWords.filter(word => content.includes(word)).length;
    score += (wordMatches / queryWords.length) * weights.wordMatch;
  }
  
  // File name match
  const fileNameLower = (capsule.metadata?.fileName || '').toLowerCase();
  if (queryWords.some(word => fileNameLower.includes(word))) {
    score += weights.fileName;
  }
  
  // Tag matches
  if (capsule.metadata?.tags) {
    const tags = capsule.metadata.tags || [];
    const tagMatches = tags.filter(tag => 
      queryLower.includes(tag.toLowerCase()) || 
      tag.toLowerCase().includes(queryLower)
    ).length;
    if (tagMatches > 0) {
      score += weights.typeMatch * 0.5;
    }
  }
  
  // Ensure score stays within bounds
  return Math.max(0, Math.min(score, 1.0));
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
 * Retrieve relevant capsules from disk in real-time
 * NO CACHING - reads fresh every time
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Array} Relevant capsules sorted by chaos-weighted score
 */
async function retrieveRelevantCapsules(query, options = {}) {
  const vaultPath = options.vaultPath || getVaultPath();
  
  // Add forceSpecific option handling
  const {
    limit = 10,
    project = options.project || global.currentProject,
    forceSpecific = false,
    minRelevance = 0.1
  } = options;
  
  // Detect intent unless forced to specific mode
  const intent = forceSpecific ? { type: 'specific' } : detectQueryIntent(query);
  
  console.log('[CapsuleRetriever] Query intent:', intent);
  
  // If categorical query and we have a project context
  if (intent.type === 'categorical' && project) {
    console.log('[CapsuleRetriever] Using categorical retrieval for project:', project);
    return await retrieveProjectCategory(project, intent.category, vaultPath, limit);
  }
  
  // Otherwise continue with existing relevance-based search
  console.log('[CapsuleRetriever] Using relevance-based search');
  
  // Determine search paths based on context
  let searchPaths;
  if (options.searchPaths) {
    // Use provided search paths (already relative to vault)
    searchPaths = options.searchPaths.map(p => path.join(vaultPath, p));
  } else if (project) {
    // Project context: search project first, then fallback to general
    searchPaths = [
      path.join(vaultPath, '.echo', 'projects', project, 'capsules'),
      path.join(vaultPath, '.echo', 'capsules')  // Fallback to general
    ];
    console.log('[CapsuleRetriever] Using project:', project, 'with fallback');
  } else {
    // No project context: just general capsules
    searchPaths = [path.join(vaultPath, '.echo', 'capsules')];
  }
  
  console.log('[CapsuleRetriever] Search paths:', searchPaths);
  console.log('[CapsuleRetriever] Query:', query);
  
  const allCapsules = [];
  const seenIds = new Set(); // Prevent duplicates across paths
  let totalFilesChecked = 0;
  let recipeCount = 0;
  
  // Get control capsule if query matches recipes (only once)
  if (query.toLowerCase().includes('recipe')) {
    const controlCapsule = await getControlCapsule(vaultPath);
    if (controlCapsule) {
      allCapsules.push(controlCapsule);
      seenIds.add(controlCapsule.id);
      recipeCount++;
    }
  }
  
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
          
          // Count recipes for debugging
          if (isRecipeCapsule(capsule)) {
            recipeCount++;
          }
          
          // Calculate relevance in real-time
          const relevance = calculateRelevance(capsule, query);
          
          if (relevance > minRelevance) {
            seenIds.add(capsule.id);
            allCapsules.push({
              ...capsule,
              relevanceScore: relevance,
              chaosScore: capsule.metadata?.chaosScore || capsule.chaosScore || 0.5,
              _sourcePath: searchPath, // Track where it came from
              _fileName: path.basename(file) // For debugging
            });
          }
        } catch (e) {
          console.error('[CapsuleRetriever] Error reading capsule:', file, e.message);
        }
      }
    } catch (error) {
      console.error(`[CapsuleRetriever] Error accessing path ${searchPath}:`, error.message);
    }
  }
  
  console.log(`[CapsuleRetriever] Total files checked: ${totalFilesChecked}`);
  console.log(`[CapsuleRetriever] Recipe capsules found: ${recipeCount}`);
  console.log(`[CapsuleRetriever] Total relevant capsules: ${allCapsules.length}`);
  
  // Sort by chaos-weighted relevance
  const sorted = allCapsules
    .sort((a, b) => {
      // Immutable control always wins
      if (a.metadata?.immutable) return -1;
      if (b.metadata?.immutable) return 1;
      
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
    })
    .slice(0, limit);
  
  // Debug top results
  if (sorted.length > 0) {
    console.log('[CapsuleRetriever] Top 3 results:');
    sorted.slice(0, 3).forEach((cap, i) => {
      const name = cap.metadata?.fileName || cap.id;
      const source = cap._sourcePath?.includes('projects') ? ' [PROJECT]' : ' [GENERAL]';
      const immutable = cap.metadata?.immutable ? ' [CONTROL]' : '';
      console.log(`  ${i+1}. ${name}${source}${immutable} (relevance: ${cap.relevanceScore.toFixed(2)}, chaos: ${cap.chaosScore.toFixed(2)})`);
    });
  }
  
  return sorted;
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
  
  // ... rest of function
  
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
  
  // ... rest of function
  
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
  retrieveProjectCategory,  // Add this new export
  getCapsulesByDate,
  searchCapsules,
  getCapsulesByType,
  calculateRelevance,
  getControlCapsule,
  forceReindexFolder,
  detectQueryIntent
};