/*
* 🛡️ VAULT SERVICE - ENHANCED
* Pure stateless service for file operations with smart search
* No session awareness, no state management
* Intelligent searching with typo tolerance, synonyms, and content scanning
*/

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class VaultService {
  constructor(dependencies = {}) {
    // Vault path resolution - no session dependencies
    this.vaultPath = this.resolveVaultPath(dependencies.vaultPath);
    
    // Simple cache with size limit
    this.cache = new Map();
    this.contentCache = new Map(); // Separate cache for content scans
    this.maxCacheSize = 100;
    this.cacheTimeout = 5000; // 5 seconds
    this.contentCacheTimeout = 60000; // 60 seconds for expensive content scans
    
    // Initialize synonyms for intelligent expansion
    this.synonyms = this.initializeSynonyms();
    
    // Unified pattern system - Top 20 categories
    this.patterns = {
      // Food & Health
      food: {
        keywords: ['recipe', 'food', 'cooking', 'meal', 'dish', 'ingredient', 'cuisine'],
        folders: ['recipes', 'foods', 'cooking', 'meals'],
        priority: 10
      },
      health: {
        keywords: ['health', 'medical', 'symptom', 'treatment', 'diagnosis', 'wellness', 'medicine'],
        folders: ['health', 'medical', 'wellness'],
        priority: 10
      },
      fitness: {
        keywords: ['workout', 'exercise', 'gym', 'training', 'lift', 'cardio', 'strength'],
        folders: ['workouts', 'fitness', 'exercise', 'training'],
        priority: 10
      },
      nutrition: {
        keywords: ['nutrition', 'diet', 'supplement', 'vitamin', 'macro', 'calorie'],
        folders: ['nutrition', 'diet', 'supplements'],
        priority: 8
      },
      
      // Academic & Professional
      school: {
        keywords: ['school', 'class', 'homework', 'assignment', 'exam', 'study', 'course'],
        folders: ['school', 'classes', 'academics', 'courses'],
        priority: 9
      },
      stem: {
        keywords: ['math', 'science', 'engineering', 'technology', 'physics', 'chemistry', 'biology', 'code', 'programming'],
        folders: ['stem', 'science', 'math', 'engineering', 'code'],
        priority: 9
      },
      business: {
        keywords: ['business', 'client', 'customer', 'revenue', 'profit', 'strategy', 'marketing', 'sales'],
        folders: ['business', 'clients', 'work', 'company'],
        priority: 10
      },
      legal: {
        keywords: ['legal', 'law', 'contract', 'agreement', 'court', 'attorney', 'litigation', 'compliance'],
        folders: ['legal', 'law', 'contracts'],
        priority: 8
      },
      finance: {
        keywords: ['finance', 'money', 'budget', 'investment', 'stock', 'crypto', 'tax', 'accounting'],
        folders: ['finance', 'money', 'investments', 'budgets'],
        priority: 9
      },
      
      // Creative & Personal
      creative: {
        keywords: ['art', 'design', 'music', 'writing', 'story', 'poem', 'creative', 'craft'],
        folders: ['creative', 'art', 'writing', 'music', 'design'],
        priority: 7
      },
      personal: {
        keywords: ['personal', 'diary', 'journal', 'reflection', 'thoughts', 'memory', 'experience'],
        folders: ['personal', 'journal', 'diary', 'reflections'],
        priority: 8
      },
      
      // Knowledge & Research
      theology: {
        keywords: ['theology', 'religion', 'faith', 'spiritual', 'church', 'bible', 'prayer', 'divine'],
        folders: ['theology', 'religion', 'spiritual', 'faith'],
        priority: 7
      },
      philosophy: {
        keywords: ['philosophy', 'ethics', 'metaphysics', 'epistemology', 'logic', 'existential'],
        folders: ['philosophy', 'ethics', 'thoughts'],
        priority: 7
      },
      research: {
        keywords: ['research', 'study', 'paper', 'thesis', 'analysis', 'data', 'findings'],
        folders: ['research', 'studies', 'papers'],
        priority: 8
      },
      
      // Life Management
      project: {
        keywords: ['project', 'task', 'todo', 'plan', 'goal', 'milestone', 'deadline'],
        folders: ['projects', 'tasks', 'planning'],
        priority: 8
      },
      travel: {
        keywords: ['travel', 'trip', 'vacation', 'destination', 'itinerary', 'flight', 'hotel'],
        folders: ['travel', 'trips', 'vacations'],
        priority: 6
      },
      home: {
        keywords: ['home', 'house', 'maintenance', 'repair', 'renovation', 'garden', 'household'],
        folders: ['home', 'house', 'maintenance'],
        priority: 6
      },
      
      // Reference & Archive
      reference: {
        keywords: ['reference', 'guide', 'manual', 'documentation', 'howto', 'tutorial', 'resource'],
        folders: ['reference', 'guides', 'resources', 'documentation'],
        priority: 5
      },
      archive: {
        keywords: ['archive', 'old', 'historical', 'past', 'legacy', 'backup'],
        folders: ['archive', 'old', 'backup', 'legacy'],
        priority: 3
      },
      
      // Catch-all
      misc: {
        keywords: ['misc', 'random', 'other', 'general', 'various', 'mixed'],
        folders: ['misc', 'other', 'general'],
        priority: 2
      }
    };
  }

  // SYNONYM EXPANSION SYSTEM
  initializeSynonyms() {
    return {
      // Fitness related
      workout: ['exercise', 'training', 'fitness', 'gym', 'lift', 'cardio'],
      exercise: ['workout', 'training', 'fitness', 'activity'],
      
      // Food related
      recipe: ['meal', 'dish', 'food', 'cooking', 'cuisine'],
      meal: ['food', 'dish', 'recipe', 'eating'],
      
      // Note taking
      note: ['memo', 'record', 'entry', 'log', 'document'],
      log: ['record', 'entry', 'note', 'journal'],
      
      // Work related
      project: ['task', 'work', 'assignment', 'initiative'],
      client: ['customer', 'account', 'user', 'contact'],
      meeting: ['conference', 'discussion', 'session', 'call'],
      
      // Academic
      homework: ['assignment', 'coursework', 'study'],
      exam: ['test', 'quiz', 'assessment', 'evaluation'],
      
      // Personal
      diary: ['journal', 'log', 'reflection'],
      reflection: ['thoughts', 'contemplation', 'review']
    };
  }

  // TYPO TOLERANCE WITH LEVENSHTEIN DISTANCE
  calculateLevenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Calculate distances
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  // Determine if two strings are similar enough (accounting for typos)
  isSimilarEnough(str1, str2) {
    const distance = this.calculateLevenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    
    // Allow more typos for longer words
    if (maxLen <= 4) return distance <= 1;
    if (maxLen <= 8) return distance <= 2;
    return distance <= 3;
  }

  // NORMALIZATION FOR CASE/FORMAT VARIANTS
  normalizeForMatching(text) {
    return text
      .toLowerCase()
      .replace(/[-_\s]+/g, '')  // Remove hyphens, underscores, spaces
      .replace(/[^\w]/g, '');   // Keep only alphanumeric
  }

  // CONTENT SCANNING
  async searchFileContent(filePath, searchTerms, limit = 1000) {
    const cacheKey = `${filePath}:${searchTerms.join(',')}`;
    
    // Check content cache
    const cached = this.contentCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.contentCacheTimeout) {
      return cached.score;
    }

    try {
      const content = await this.getContent(filePath);
      const contentToScan = content.slice(0, limit).toLowerCase();
      let score = 0;

      for (const term of searchTerms) {
        const termLower = term.toLowerCase();
        const normalizedTerm = this.normalizeForMatching(term);
        
        // Exact matches in content
        const exactMatches = (contentToScan.match(new RegExp(`\\b${termLower}\\b`, 'g')) || []).length;
        score += exactMatches * 5;

        // Normalized matches (catches variants)
        const normalizedContent = this.normalizeForMatching(contentToScan);
        const normalizedMatches = (normalizedContent.match(new RegExp(normalizedTerm, 'g')) || []).length;
        score += normalizedMatches * 2;
      }

      // Cache the result
      this.contentCache.set(cacheKey, {
        score,
        timestamp: Date.now()
      });

      // Manage cache size
      if (this.contentCache.size > this.maxCacheSize) {
        const firstKey = this.contentCache.keys().next().value;
        this.contentCache.delete(firstKey);
      }

      return score;
    } catch (error) {
      return 0;
    }
  }

  // FILE TYPE DETECTION
  async detectFileType(filePath) {
    try {
      const content = await this.getContent(filePath);
      const patterns = {
        template: /^#{0,3}\s*template:\s*true/mi,
        recipe: /^#{1,3}\s*(Ingredients|Directions|Instructions)/mi,
        meeting: /^#{1,3}\s*(Attendees|Meeting Notes|Action Items)/mi,
        project: /^#{1,3}\s*(Milestones|Tasks|Timeline|Deliverables)/mi,
        daily: /^#{1,3}\s*(Daily Note|Today's Tasks|Journal Entry)/mi,
        research: /^#{1,3}\s*(Abstract|Hypothesis|Methodology|Findings)/mi,
        workout: /^#{1,3}\s*(Exercises|Sets|Reps|Workout Plan)/mi
      };

      for (const [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(content)) {
          return type;
        }
      }

      return 'general';
    } catch {
      return 'unknown';
    }
  }

  // VAULT PATH RESOLUTION
  resolveVaultPath(providedPath) {
    // Priority order for vault path resolution
    const candidates = [
      providedPath,
      process.env.OBSIDIAN_VAULT_PATH,
      this.loadConfigPath(),
      ...this.discoverVaultPaths()
    ].filter(Boolean);
    
    for (const candidate of candidates) {
      if (this.isValidVaultPath(candidate)) {
        return candidate;
      }
    }
    
    // Fallback with warning
    console.warn('⚠️ No vault found. Using default path. Set OBSIDIAN_VAULT_PATH.');
    return path.join(os.homedir(), 'Obsidian Vault');
  }

  async isValidVaultPath(vaultPath) {
    if (!vaultPath) return false;
    
    try {
      await fs.access(vaultPath);
      
      // Check for Obsidian marker or just accept any readable directory
      try {
        await fs.access(path.join(vaultPath, '.obsidian'));
        return true;
      } catch {
        // Not an Obsidian vault, but still a valid directory
        const stats = await fs.stat(vaultPath);
        return stats.isDirectory();
      }
    } catch {
      return false;
    }
  }

  loadConfigPath() {
    try {
      const configFile = path.join(os.homedir(), '.oracle-bridge', 'vault-config.json');
      const configData = require('fs').readFileSync(configFile, 'utf8');
      const config = JSON.parse(configData);
      return config.vaultPath;
    } catch {
      return null;
    }
  }

  discoverVaultPaths() {
    return [
      // Windows common locations
      path.join(os.homedir(), 'Documents', 'Obsidian Vault'),
      path.join(os.homedir(), 'Documents', 'Obsidian'),
      path.join(os.homedir(), 'Obsidian Vault'),
      path.join(os.homedir(), 'Obsidian'),
      // Mac/Linux common locations
      path.join(os.homedir(), 'Documents', 'obsidian'),
      path.join(os.homedir(), 'obsidian'),
      path.join(os.homedir(), 'vaults'),
      // OneDrive/Cloud locations
      path.join(os.homedir(), 'OneDrive', 'Documents', 'Obsidian'),
      path.join(os.homedir(), 'OneDrive', 'Obsidian'),
      // iCloud (Mac)
      path.join(os.homedir(), 'Library', 'Mobile Documents', 'iCloud~md~obsidian', 'Documents'),
    ];
  }

  async saveVaultPath(vaultPath) {
    try {
      const configDir = path.join(os.homedir(), '.oracle-bridge');
      const configFile = path.join(configDir, 'vault-config.json');
      
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(configFile, JSON.stringify({
        vaultPath,
        savedAt: new Date().toISOString()
      }, null, 2));
      
      console.log(`💾 Saved vault path to: ${configFile}`);
      return true;
    } catch (error) {
      console.error('Failed to save vault config:', error);
      return false;
    }
  }

  // ENHANCED SEARCH FUNCTIONS
  
  // Main search function - pure, stateless with smart features
  async search(query, options = {}) {
    const searchInfo = this.parseSearchQuery(query);
    
    // Merge options
    searchInfo.scanContent = options.scanContent || false;
    searchInfo.detectTypes = options.detectTypes || false;
    
    const files = await this.scanVault(searchInfo);
    return this.rankResults(files, searchInfo);
  }

  // Enhanced query parsing with synonym expansion
  parseSearchQuery(query) {
    const lower = query.toLowerCase();
    const searchInfo = {
      terms: [],
      expandedTerms: [], // New: expanded terms from synonyms
      normalizedTerms: [], // New: normalized versions for matching
      folders: [],
      type: 'general',
      priority: 0,
      exact: false,
      scanContent: false
    };
    
    // Check for exact folder/project names first (fringe labels)
    const quotedPattern = /"([^"]+)"|'([^']+)'/g;
    const quoted = [...lower.matchAll(quotedPattern)];
    if (quoted.length > 0) {
      searchInfo.exact = true;
      searchInfo.terms = quoted.map(m => m[1] || m[2]);
      searchInfo.type = 'exact';
      searchInfo.priority = 15;
    }
    
    // Check for capitalized multi-word phrases (likely project names)
    const capsPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
    const capsMatches = [...query.matchAll(capsPattern)];
    if (capsMatches.length > 0) {
      searchInfo.exact = true;
      searchInfo.terms.push(...capsMatches.map(m => m[1].toLowerCase()));
      searchInfo.type = 'project_name';
      searchInfo.priority = 12;
    }
    
    // Check against pattern definitions
    if (!searchInfo.exact) {
      for (const [patternType, pattern] of Object.entries(this.patterns)) {
        for (const keyword of pattern.keywords) {
          if (lower.includes(keyword)) {
            searchInfo.type = patternType;
            searchInfo.terms.push(keyword);
            searchInfo.folders.push(...pattern.folders);
            searchInfo.priority = pattern.priority;
            break;
          }
        }
      }
    }
    
    // If no pattern matched, extract ALL meaningful words
    if (searchInfo.terms.length === 0) {
      const words = lower.match(/\b\w{2,}\b/g) || [];
      const stopWords = ['what', 'are', 'the', 'show', 'list', 'find', 'search', 'my', 'for'];
      searchInfo.terms = words.filter(w => !stopWords.includes(w));
    }
    
    // EXPAND TERMS WITH SYNONYMS
    searchInfo.expandedTerms = [...searchInfo.terms];
    for (const term of searchInfo.terms) {
      if (this.synonyms[term]) {
        searchInfo.expandedTerms.push(...this.synonyms[term]);
      }
    }
    searchInfo.expandedTerms = [...new Set(searchInfo.expandedTerms)];
    
    // CREATE NORMALIZED VERSIONS
    searchInfo.normalizedTerms = searchInfo.expandedTerms.map(term => 
      this.normalizeForMatching(term)
    );
    
    // Deduplicate folders
    searchInfo.folders = [...new Set(searchInfo.folders)];
    
    return searchInfo;
  }

  // Enhanced directory scanning with content search option
  async scanDirectory(dirPath, results, searchInfo, depth = 0) {
    const maxDepth = 3;
    if (depth > maxDepth) return;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isFile() && entry.name.endsWith('.md')) {
          let score = await this.scoreFileEnhanced(entry.name, fullPath, searchInfo);
          
          if (score > 0) {
            const fileResult = {
              name: entry.name.replace('.md', ''),
              path: fullPath,
              relativePath: path.relative(this.vaultPath, fullPath),
              directory: path.dirname(path.relative(this.vaultPath, fullPath)),
              score: score
            };
            
            // Optionally detect file type
            if (searchInfo.detectTypes) {
              fileResult.type = await this.detectFileType(fullPath);
            }
            
            results.push(fileResult);
          }
        } else if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_')) {
          await this.scanDirectory(fullPath, results, searchInfo, depth + 1);
        }
      }
    } catch (error) {
      // Skip unreadable directories
    }
  }

  // ENHANCED SCORING WITH ALL SMART FEATURES
  async scoreFileEnhanced(filename, filepath, searchInfo) {
    const nameLower = filename.toLowerCase();
    const nameNormalized = this.normalizeForMatching(filename);
    let score = 0;
    
    // EXACT MATCH scoring for fringe labels
    if (searchInfo.exact) {
      for (const term of searchInfo.terms) {
        if (nameLower.includes(term.toLowerCase())) {
          score += 100;
        }
        
        // Check individual words from the phrase
        const words = term.split(/\s+/);
        for (const word of words) {
          if (nameLower.includes(word.toLowerCase())) {
            score += 20;
          }
        }
      }
      
      if (score === 0) return 0; // Exact search with no match
    } else {
      // STANDARD + ENHANCED MATCHING
      
      // Check exact matches first (highest score)
      for (const term of searchInfo.terms) {
        if (nameLower.includes(term)) {
          score += 15;
        }
      }
      
      // Check expanded terms (synonyms)
      for (const term of searchInfo.expandedTerms) {
        if (nameLower.includes(term) && !searchInfo.terms.includes(term)) {
          score += 10; // Slightly lower score for synonym matches
        }
      }
      
      // Check normalized matches (case/format variants)
      for (const term of searchInfo.normalizedTerms) {
        if (nameNormalized.includes(term)) {
          score += 8;
        }
      }
      
      // Check for typos using Levenshtein distance
      const nameWords = nameLower.split(/[-_\s]+/);
      for (const term of searchInfo.terms) {
        for (const nameWord of nameWords) {
          if (this.isSimilarEnough(term, nameWord)) {
            score += 5; // Lower score for typo matches
          }
        }
      }
    }
    
    // CONTENT SCANNING (if enabled and score is low or content scan requested)
    if (searchInfo.scanContent && (score < 10 || searchInfo.scanContent === 'always')) {
      const contentScore = await this.searchFileContent(filepath, searchInfo.expandedTerms);
      score += contentScore;
    }
    
    // Add base score if in priority folder
    if (searchInfo.priority > 0 && !searchInfo.exact) {
      score += searchInfo.priority;
    }
    
    // Return 1 if no specific terms (list all)
    if (searchInfo.terms.length === 0) {
      return 1;
    }
    
    return score;
  }

  // Keep original scoreFile for backwards compatibility
  scoreFile(filename, searchInfo) {
    const nameLower = filename.toLowerCase();
    let score = 0;
    
    if (searchInfo.exact) {
      for (const term of searchInfo.terms) {
        if (nameLower.includes(term.toLowerCase())) {
          score += 100;
        }
        const words = term.split(/\s+/);
        for (const word of words) {
          if (nameLower.includes(word.toLowerCase())) {
            score += 20;
          }
        }
      }
      if (score === 0) return 0;
    } else {
      for (const term of searchInfo.terms) {
        if (nameLower.includes(term)) {
          score += 10;
        }
      }
    }
    
    if (searchInfo.priority > 0 && !searchInfo.exact) {
      score += searchInfo.priority;
    }
    
    if (searchInfo.terms.length === 0) {
      return 1;
    }
    
    return score;
  }

  // Scan vault with enhanced options
  async scanVault(searchInfo) {
    const results = [];
    const searchPaths = await this.getSearchPaths(searchInfo);
    
    for (const searchPath of searchPaths) {
      await this.scanDirectory(searchPath, results, searchInfo, 0);
    }
    
    return results;
  }

  // Get paths to search based on search info
  async getSearchPaths(searchInfo) {
    const paths = [];
    
    // Add specific folders if identified
    for (const folder of searchInfo.folders) {
      const folderPath = path.join(this.vaultPath, folder);
      try {
        await fs.access(folderPath);
        paths.push(folderPath);
      } catch {
        // Folder doesn't exist, skip
      }
    }
    
    // Always include root as fallback
    if (paths.length === 0) {
      paths.push(this.vaultPath);
    }
    
    return paths;
  }

  // Rank and deduplicate results
  rankResults(files, searchInfo) {
    // Deduplicate by path
    const unique = new Map();
    for (const file of files) {
      const existing = unique.get(file.path);
      if (!existing || file.score > existing.score) {
        unique.set(file.path, file);
      }
    }
    
    // Sort by score and limit
    return Array.from(unique.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  // PURE CONTENT RETRIEVAL
  
  // Get file content - with caching
  async getContent(filePath) {
    // Check cache
    const cached = this.cache.get(filePath);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.content;
    }
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Update cache with size management
      this.cache.set(filePath, {
        content,
        timestamp: Date.now()
      });
      
      // Evict oldest if cache too large
      if (this.cache.size > this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
      return content;
    } catch (error) {
      throw new Error(`Cannot read file: ${error.message}`);
    }
  }

  // Get file metadata
  async getMetadata(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime
      };
    } catch (error) {
      return null;
    }
  }

  // UTILITY FUNCTIONS
  
  // Clear cache
  clearCache() {
    this.cache.clear();
    this.contentCache.clear();
  }

  // Get vault info
  getVaultInfo() {
    return {
      path: this.vaultPath,
      exists: require('fs').existsSync(this.vaultPath)
    };
  }

  // Check if message might be vault-related
  isVaultQuery(message) {
    const lower = message.toLowerCase();
    
    // Check for search keywords
    const searchWords = ['show', 'list', 'find', 'search', 'what', 'where'];
    const hasSearchWord = searchWords.some(word => lower.includes(word));
    
    // Check for content keywords
    const hasContentWord = Object.values(this.patterns)
      .flatMap(p => p.keywords)
      .some(keyword => lower.includes(keyword));
    
    return hasSearchWord || hasContentWord;
  }

  // Enhanced format with file type indicators
  formatResults(results) {
    if (results.length === 0) {
      return 'No matching files found.';
    }
    
    const lines = [`Found ${results.length} file${results.length === 1 ? '' : 's'}:\n`];
    
    // Type emoji map
    const typeEmojis = {
      template: '📋',
      recipe: '🍳',
      meeting: '👥',
      project: '🎯',
      daily: '📅',
      research: '🔬',
      workout: '💪',
      general: '📄',
      unknown: '❓'
    };
    
    results.forEach((result, index) => {
      const emoji = result.type ? typeEmojis[result.type] || '📄' : '📄';
      lines.push(`${index + 1}. ${emoji} **${result.name}**`);
      if (result.directory && result.directory !== '.') {
        lines.push(`   📁 ${result.directory}`);
      }
      if (result.type && result.type !== 'general') {
        lines.push(`   🏷️ Type: ${result.type}`);
      }
    });
    
    return lines.join('\n');
  }

  // Advanced search with options
  async advancedSearch(query, options = {}) {
    const defaultOptions = {
      scanContent: false,
      detectTypes: false,
      includeArchived: false,
      maxResults: 20
    };
    
    const searchOptions = { ...defaultOptions, ...options };
    
    const searchInfo = this.parseSearchQuery(query);
    searchInfo.scanContent = searchOptions.scanContent;
    searchInfo.detectTypes = searchOptions.detectTypes;
    
    // Filter out archive if not included
    if (!searchOptions.includeArchived) {
      searchInfo.folders = searchInfo.folders.filter(f => !f.includes('archive'));
    }
    
    const files = await this.scanVault(searchInfo);
    const ranked = this.rankResults(files, searchInfo);
    
    return ranked.slice(0, searchOptions.maxResults);
  }
}

module.exports = VaultService;