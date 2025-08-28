// ChaosAnalyzer.js - Intelligent Pattern Recognition & Chaos Handling
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { assignEpochAndWeight } = require('./epochClassifier');
// Simple concurrency limiter
class PLimit {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.current = 0;
    this.queue = [];
  }
  
  async run(fn) {
    while (this.current >= this.concurrency) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    
    this.current++;
    try {
      return await fn();
    } finally {
      this.current--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

class ChaosAnalyzer {
  constructor(options = {}) {
    this.SCHEMA_VERSION = 'v2.0';
    this.vaultRoot = options.vaultRoot || process.cwd();
    this.concurrency = options.concurrency || 4;
    this.limit = new PLimit(this.concurrency);
    this.project = options.project || null;
    
    // ADDED: Control capsule creation
    this.createCapsules = options.createCapsules !== false; // Default true for backward compatibility
    this.indexOnly = options.indexOnly || false; // Explicit index-only mode
    
    // Pattern library - from generic to specific
    this.patterns = {
      // Corruption patterns to clean
      corruption: {
        metadata: /```metadata[\s\S]*?```/g,
        yamlDuplicates: /^---[\s\S]*?---/gm,
        repeatedSections: /(?:^#{1,2}\s*Who\s*\n){2,}/gm
      },
      
      // Structure detection patterns
      structure: {
        markdown: {
          headers: /^#{1,6}\s+(.+)$/gm,
          sections: /^#{1,2}\s+(.+?)$([\s\S]*?)(?=^#{1,2}\s+|$)/gm,
          lists: /^[\*\-\+]\s+(.+)$/gm,
          keyValue: /^\*\*([^:]+):\*\*\s*(.+)$/gm,
          tags: /#(\w+)/g
        },
        
        // Domain-specific patterns
        client: {
          status: /#(pitched|sold|dead-deal|appointment|pending|notsold|clients|lost|asshole)/g,
          money: /\$[\d,]+\.?\d*/g,
          percentage: /\d+(?:\.\d+)?%/g,
          phone: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
          email: /[\w\.-]+@[\w\.-]+\.\w+/g,
          address: /\d+\s+[\w\s]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Lane|Ln|Way|Court|Ct)(?:,\s*[\w\s]+,\s*[A-Z]{2}\s*\d{5})?/gi
        },
        
        recipe: {
          ingredients: /(?:ingredients?\s*:)([\s\S]*?)(?=instructions?|directions?|method|$)/i,
          instructions: /(?:instructions?|directions?|method)\s*:([\s\S]*?)$/i,
          measurements: /\b\d+(?:\.\d+)?\s*(?:cup|tbsp|tsp|oz|lb|g|kg|ml|l|pounds?|ounces?)\b/gi,
          cookingTerms: /\b(?:bake|boil|simmer|fry|saute|grill|roast|steam|mix|blend|whisk|chop|dice|slice)\b/gi
        },
        
        meeting: {
          agenda: /(?:agenda|topics?|discuss)/i,
          attendees: /(?:attendees?|participants?|present)/i,
          actionItems: /(?:action items?|todo|follow[- ]?up|next steps?)/i,
          decisions: /(?:decided?|agreed?|concluded?)/i
        }
      },
      
      // Entity extraction
      entities: {
        people: /\b[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+\b/g,
        dates: /\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi,
        times: /\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/g,
        urls: /https?:\/\/[^\s]+/g,
        mentions: /@[\w]+/g
      }
    };
    
    // Semantic tag mappings for common patterns
    this.semanticMappings = {
      // Fitness/Exercise domain
      'temple ritual': ['workout', 'exercise', 'training', 'fitness', 'gym'],
      'bench press': ['weightlifting', 'chest', 'upper_body', 'strength', 'barbell', 'lifts'],
      'squat': ['legs', 'lower_body', 'strength', 'weightlifting', 'barbell', 'lifts'],
      'deadlift': ['back', 'full_body', 'strength', 'weightlifting', 'barbell', 'lifts'],
      'dumbbell': ['weights', 'strength', 'gym', 'lifts'],
      'cardio': ['running', 'cycling', 'endurance', 'aerobic', 'fitness'],
      'workout': ['exercise', 'training', 'fitness', 'gym'],
      'reps': ['exercise', 'sets', 'training', 'workout'],
      'sets': ['exercise', 'reps', 'training', 'workout'],
      
      // Cooking/Recipe domain
      'recipe': ['cooking', 'meal', 'food', 'ingredients', 'kitchen'],
      'ingredient': ['recipe', 'cooking', 'food', 'meal'],
      'bake': ['cooking', 'oven', 'recipe', 'dessert'],
      'grill': ['cooking', 'bbq', 'recipe', 'meat'],
      
      // Technical domain
      'debug': ['troubleshoot', 'fix', 'error', 'problem', 'coding'],
      'code': ['programming', 'development', 'software', 'coding'],
      'error': ['bug', 'issue', 'problem', 'debug'],
      
      // Business domain
      'client': ['customer', 'business', 'sales', 'deal'],
      'meeting': ['conference', 'discussion', 'agenda', 'attendees'],
      'project': ['task', 'milestone', 'deadline', 'work']
    };
    
    // Content analyzers for different chaos levels
    this.analyzers = {
      structured: new StructuredAnalyzer(this),
      chaotic: new ChaoticAnalyzer(this),
      sparse: new SparseAnalyzer(this)
    };
    
    this.cache = new Map();
  }

  // Extract semantic tags from content
  extractSemanticTags(content) {
    const contentLower = content.toLowerCase();
    const tags = new Set();
    
    // Check each mapping
    for (const [term, relatedTags] of Object.entries(this.semanticMappings)) {
      if (contentLower.includes(term)) {
        relatedTags.forEach(tag => tags.add(tag));
        // Also add the term itself as a tag
        tags.add(term.replace(/\s+/g, '_'));
      }
    }
    
    // Extract exercise-specific patterns
    const exercisePatterns = [
      /(\d+)\s*x\s*(\d+)/g,  // Sets x Reps (e.g., "4x8")
      /(\d+)\s*(?:lbs?|pounds?|kg|kilograms?)/gi,  // Weight amounts
      /(?:upper|lower|full)\s*body/gi,  // Body parts
      /(?:chest|back|legs|arms|shoulders|core)/gi  // Muscle groups
    ];
    
    exercisePatterns.forEach(pattern => {
      if (pattern.test(contentLower)) {
        tags.add('workout');
        tags.add('exercise');
        tags.add('fitness');
      }
    });
    
    return Array.from(tags);
  }

  // Main entry point - analyzes vault and creates capsules
  async analyzeVault(options = {}) {
    console.log('[ChaosAnalyzer v2] Starting intelligent vault analysis...');
    const startTime = Date.now();
    
    const results = {
      filesAnalyzed: 0,
      capsulesCreated: 0,
      errors: [],
      patterns: new Map(), // Track pattern distribution
      chaosLevels: { structured: 0, chaotic: 0, sparse: 0 }
    };
    
    try {
      const folders = await this.getSearchableFolders(this.vaultRoot);
      
      // First pass: analyze pattern distribution
      console.log('[ChaosAnalyzer v2] Phase 1: Pattern detection...');
      const filePatterns = await this.detectVaultPatterns(folders);
      
      // Second pass: process files with appropriate analyzers
      console.log('[ChaosAnalyzer v2] Phase 2: Processing files...');
      
      for (const folder of folders) {
        const folderPath = path.join(this.vaultRoot, folder);
        const files = await fs.readdir(folderPath);
        const mdFiles = files.filter(f => f.endsWith('.md'));
        
        for (const file of mdFiles) {
          const filePath = path.join(folderPath, file);
          results.filesAnalyzed++;
          
          try {
            // Analyze file with intelligent detection
            const analysis = await this.analyzeFileIntelligently(filePath, {
              patterns: filePatterns,
              force: options.force
            });
            
            if (analysis && !analysis.error && analysis.content) {
              // Track chaos level
              results.chaosLevels[analysis.chaosLevel]++;
              
              // MODIFIED: Only create capsule if not in index-only mode
              if (!this.indexOnly && this.createCapsules) {
                const capsule = await this.createEnhancedCapsule(filePath, analysis);
                if (capsule) {
                  results.capsulesCreated++;
                  console.log(`[ChaosAnalyzer v2] Created ${analysis.chaosLevel} capsule: ${file}`);
                }
              } else {
                console.log(`[ChaosAnalyzer v2] Indexed (no capsule): ${file}`);
              }
            }
            
          } catch (error) {
            console.error(`[ChaosAnalyzer v2] Error with ${file}:`, error.message);
            results.errors.push({ file: filePath, error: error.message });
          }
        }
      }
      
      // Ensure capsules directory exists (only if creating capsules)
      if (!this.indexOnly && this.createCapsules) {
        const capsulesPath = path.join(this.vaultRoot, '.echo', 'capsules');
        await fs.mkdir(capsulesPath, { recursive: true });
      }
      
    } catch (error) {
      console.error('[ChaosAnalyzer v2] Fatal error:', error);
      results.errors.push({ fatal: true, error: error.message });
    }
    
    const duration = Date.now() - startTime;
    console.log(`\n[ChaosAnalyzer v2] Analysis complete in ${duration}ms`);
    console.log(`Files analyzed: ${results.filesAnalyzed}`);
    console.log(`Capsules created: ${results.capsulesCreated}`);
    console.log(`Chaos distribution:`, results.chaosLevels);
    
    return results;
  }

  // Detect patterns across vault for intelligent processing
  async detectVaultPatterns(folders) {
    const patterns = new Map();
    const sampleSize = 10; // Sample files per folder
    
    for (const folder of folders) {
      const folderPath = path.join(this.vaultRoot, folder);
      const files = await fs.readdir(folderPath);
      const mdFiles = files.filter(f => f.endsWith('.md')).slice(0, sampleSize);
      
      for (const file of mdFiles) {
        const filePath = path.join(folderPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const detected = this.detectContentPattern(content);
        
        const key = `${folder}:${detected.pattern}`;
        patterns.set(key, (patterns.get(key) || 0) + 1);
      }
    }
    
    return patterns;
  }

  // Intelligent file analysis with chaos detection
  async analyzeFileIntelligently(filePath, options = {}) {
    try {
      const fullContent = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);
      
      // Extract existing metadata block
      const existingMetadata = this.extractMetadataBlock(fullContent);
      
      // Get content without metadata for hashing
      const contentWithoutMeta = fullContent.replace(/```metadata[\s\S]*?```\s*/g, '').trim();
      const contentHash = this.getContentHash(contentWithoutMeta);
      
      // Check if content actually changed
      if (existingMetadata.contenthash === contentHash && !options.force) {
        return {
          path: filePath,
          skipped: true,
          reason: 'unchanged',
          hash: contentHash
        };
      }
      
      // Step 1: Clean corruption (but preserve the content without metadata)
      const cleaned = this.cleanCorruption(contentWithoutMeta);
      
      // Step 2: Detect chaos level and pattern
      const detection = this.detectContentPattern(cleaned);
      
      // Step 3: Choose appropriate analyzer
      const analyzer = this.analyzers[detection.chaosLevel];
      
      // Step 4: Perform analysis
      const analysis = await analyzer.analyze(cleaned, {
        filePath,
        folder: path.basename(path.dirname(filePath)),
        pattern: detection.pattern,
        stats
      });
      
      return {
        ...analysis,
        chaosLevel: detection.chaosLevel,
        pattern: detection.pattern,
        content: cleaned,
        originalContent: fullContent,
        contentHash: contentHash,
        contentHashChanged: existingMetadata.contenthash !== contentHash,
        existingMetadata: existingMetadata
      };
      
    } catch (error) {
      return { 
        path: filePath, 
        error: error.message,
        type: 'error' 
      };
    }
  }

  // Clean known corruption patterns
  cleanCorruption(content) {
    let cleaned = content;
    
    // Remove metadata blocks
    cleaned = cleaned.replace(this.patterns.corruption.metadata, '');
    
    // Remove duplicate YAML
    const yamlMatches = cleaned.match(this.patterns.corruption.yamlDuplicates) || [];
    if (yamlMatches.length > 1) {
      // Keep only the first YAML block
      for (let i = 1; i < yamlMatches.length; i++) {
        cleaned = cleaned.replace(yamlMatches[i], '');
      }
    }
    
    // Remove repeated sections
    cleaned = cleaned.replace(this.patterns.corruption.repeatedSections, '## Who\n');
    
    // Deduplicate lines while preserving structure
    const lines = cleaned.split('\n');
    const deduped = [];
    const seen = new Set();
    
    for (const line of lines) {
      const trimmed = line.trim();
      const normalized = trimmed.toLowerCase();
      
      // Always keep headers and empty lines for structure
      if (!trimmed || trimmed.startsWith('#') || !seen.has(normalized)) {
        deduped.push(line);
        if (trimmed) seen.add(normalized);
      }
    }
    
    return deduped.join('\n').trim();
  }

  // Extract existing metadata block
  extractMetadataBlock(content) {
    const match = content.match(/```metadata\n([\s\S]*?)```/);
    if (!match) return {};
    
    const metadata = {};
    const sections = match[1].split(/^## /m).filter(s => s.trim());
    
    for (const section of sections) {
      const lines = section.split('\n');
      const key = lines[0].trim().toLowerCase();
      const value = lines.slice(1).join('\n').trim();
      metadata[key] = value;
    }
    
    return metadata;
  }

  // Generate content hash (excluding metadata)
  getContentHash(content) {
    // Strip metadata block before hashing
    const contentOnly = content.replace(/```metadata[\s\S]*?```\s*/g, '').trim();
    return crypto.createHash('sha256')
      .update(contentOnly)
      .digest('hex')
      .substring(0, 16);
  }

  // Detect content pattern and chaos level
  detectContentPattern(content) {
    const indicators = {
      structured: 0,
      chaotic: 0,
      sparse: 0
    };
    
    // Check for structured patterns
    const headers = content.match(this.patterns.structure.markdown.headers) || [];
    const keyValues = content.match(this.patterns.structure.markdown.keyValue) || [];
    const tags = content.match(this.patterns.structure.markdown.tags) || [];
    const lists = content.match(this.patterns.structure.markdown.lists) || [];
    
    // Structured indicators
    if (headers.length > 3) indicators.structured += 2;
    if (keyValues.length > 2) indicators.structured += 2;
    if (tags.length > 0) indicators.structured += 1;
    if (lists.length > 3) indicators.structured += 1;
    
    // Check content density
    const lines = content.split('\n').filter(l => l.trim());
    const avgLineLength = lines.reduce((sum, l) => sum + l.length, 0) / lines.length;
    
    // Sparse indicators
    if (lines.length < 10) indicators.sparse += 2;
    if (avgLineLength < 30) indicators.sparse += 1;
    
    // Chaotic indicators
    const sentenceEndings = (content.match(/[.!?]+/g) || []).length;
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
    
    if (sentenceEndings / lines.length > 2) indicators.chaotic += 1; // Multiple sentences per line
    if (paragraphs.length === 1 && lines.length > 20) indicators.chaotic += 2; // Wall of text
    
    // Detect specific patterns
    let pattern = 'generic';
    if (this.patterns.structure.client.status.test(content)) pattern = 'client';
    else if (this.patterns.structure.recipe.ingredients.test(content)) pattern = 'recipe';
    else if (this.patterns.structure.meeting.agenda.test(content)) pattern = 'meeting';
    
    // Determine chaos level
    const max = Math.max(indicators.structured, indicators.chaotic, indicators.sparse);
    let chaosLevel = 'chaotic'; // default
    
    if (indicators.structured === max) chaosLevel = 'structured';
    else if (indicators.sparse === max) chaosLevel = 'sparse';
    
    return { chaosLevel, pattern, indicators };
  }

 // Create enhanced capsule with intelligent metadata
  async createEnhancedCapsule(filePath, analysis) {
    const fileName = path.basename(filePath, '.md');
    const folder = path.basename(path.dirname(filePath));
    
    const capsuleId = `capsule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Build intelligent summary for metadata block only
    const summary = this.createIntelligentSummary(analysis);
    
    // Extract semantic tags
    const semanticTags = this.extractSemanticTags(analysis.content);
    
    const capsule = {
      id: capsuleId,
      type: analysis.type || analysis.pattern || 'note',
      content: analysis.content,
      summary: summary || 'Document',  // CRITICAL FIX: Must be non-empty for validation
      chaosScore: analysis.confidence || 0.5,
      relevanceScore: 0,
      semantic_tags: semanticTags,  // Add semantic tags field
      metadata: {
        type: analysis.type,
        pattern: analysis.pattern,
        chaosLevel: analysis.chaosLevel,
        confidence: analysis.confidence || 0.5,
        tags: [...new Set([...analysis.tags || [], ...semanticTags])],  // Merge semantic tags
        filePath: filePath,
        fileName: fileName,
        folder: folder,
        entities: analysis.entities || {},
        keyPoints: analysis.keyPoints || [],
        created: new Date().toISOString(),
        lastModified: analysis.stats?.mtime || new Date().toISOString(),
        wordCount: analysis.content.split(/\s+/).length,
        quality: {
          completeness: analysis.completeness || 0,
          clarity: analysis.clarity || 0,
          structure: analysis.structure || 0
        }
      },
      timestamp: new Date().toISOString()
    };
    
    // Save capsule with date-based organization
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const day = String(now.getDate()).padStart(2, '0');
    
    // Determine project from instance or file path
    let projectContext = this.project;
    if (!projectContext && filePath) {
      const relativePath = path.relative(this.vaultRoot, filePath);
      const pathParts = relativePath.split(path.sep);
      if (pathParts.length > 1 && !pathParts[0].startsWith('.')) {
        projectContext = pathParts[0];
      }
    }
    
    const { assignEpochAndWeight } = require('./epochClassifier');
  }

  // Create intelligent summary based on content analysis
  createIntelligentSummary(analysis) {
    if (analysis.pattern === 'client') {
      const status = analysis.entities.tags?.find(t => ['sold', 'pitched', 'dead-deal'].includes(t)) || 'active';
      const name = analysis.entities.people?.[0] || 'Unknown Client';
      const amount = analysis.entities.money?.[0] || '';
      return `${name} - ${status}${amount ? ' for ' + amount : ''}`;
    }
    
    if (analysis.pattern === 'recipe') {
      const title = analysis.entities.title || analysis.keyPoints?.[0] || 'Recipe';
      const mainIngredient = analysis.entities.ingredients?.[0] || '';
      return `${title}${mainIngredient ? ' with ' + mainIngredient : ''}`;
    }
    
    if (analysis.pattern === 'meeting') {
      const date = analysis.entities.dates?.[0] || 'Recent';
      const attendees = analysis.entities.people?.slice(0, 2).join(' & ') || 'Team';
      return `${date} meeting with ${attendees}`;
    }
    
    // Default: Extract first meaningful sentence or line
    const lines = analysis.content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    const firstMeaningful = lines[0] || analysis.preview || 'Document';
    return firstMeaningful.substring(0, 100) + (firstMeaningful.length > 100 ? '...' : '');
  }

  // Update file with clean metadata
  async updateFileMetadata(filePath, analysis, capsule, humanSummary) {
    // Only update if content hash changed
    if (!analysis.contentHashChanged && !analysis.force) {
      return;
    }
    
    const metaBlock = this.formatMarkdownMeta({
      who: analysis.entities?.people?.join(', ') || '',
      where: analysis.entities?.location || analysis.entities?.emails?.[0] || '',
      when: analysis.entities?.dates?.[0] || new Date().toISOString().split('T')[0],
      what: humanSummary || 'Document',  // Use the human-readable summary
      why: analysis.pattern,
      folder: capsule.metadata.folder,
      tags: capsule.metadata.tags,
      contenthash: analysis.contentHash,
      updated: new Date().toLocaleString()
    });
    
    const contentWithMeta = `\`\`\`metadata\n${metaBlock}\n\`\`\`\n\n${analysis.content}`;
    await fs.writeFile(filePath, contentWithMeta, 'utf8');
  }

  // Format metadata block
  formatMarkdownMeta(obj) {
    const sections = [];
    
    if (obj.who) sections.push(`## Who\n${obj.who}`);
    if (obj.where) sections.push(`## Where\n${obj.where}`);
    if (obj.when) sections.push(`## When\n${obj.when}`);
    if (obj.what) sections.push(`## What\n${obj.what}`);
    if (obj.why) sections.push(`## Why\n${obj.why}`);
    if (obj.folder) sections.push(`## Folder\n${obj.folder}`);
    if (obj.tags?.length) {
      sections.push(`## Tags\n${obj.tags.map(t => `- ${t}`).join('\n')}`);
    }
    if (obj.contenthash) sections.push(`## ContentHash\n${obj.contenthash}`);
    sections.push(`## Updated\n${obj.updated}`);
    
    return sections.join('\n\n');
  }

  // Get searchable folders
  async getSearchableFolders(vaultPath) {
    const allFolders = await fs.readdir(vaultPath, { withFileTypes: true });
    return allFolders
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .filter(dirent => !['chats', 'Chats'].includes(dirent.name)) // Exclude chat folders
      .map(dirent => dirent.name);
  }
  
  // Stub formatVault for compatibility with diagnostic tools
  async formatVault(vaultPath, options = {}) {
    console.log('[ChaosAnalyzer] formatVault called - redirecting to analyzeVault');
    return this.analyzeVault(options);
  }
  
  // Backward compatibility wrapper for analyzeFile
  async analyzeFile(filePath, options = {}) {
    return this.analyzeFileIntelligently(filePath, options);
  }
}

// Analyzer for well-structured content
class StructuredAnalyzer {
  constructor(parent) {
    this.parent = parent;
  }
    
  async analyze(content, context) {
    const sections = this.extractSections(content);
    const entities = this.extractStructuredEntities(content, sections);
    const keyPoints = this.extractKeyPoints(sections);
    
    return {
      type: this.determineType(sections, entities, context),
      entities,
      sections,
      keyPoints,
      tags: this.extractTags(sections, entities, context),
      confidence: 0.9,
      completeness: this.assessCompleteness(sections),
      clarity: 0.8,
      structure: 0.9,
      preview: keyPoints[0] || content.substring(0, 200)
    };
  }
  
  extractSections(content) {
    const sections = {};
    const matches = [...content.matchAll(this.parent.patterns.structure.markdown.sections)];
    
    for (const match of matches) {
      const header = match[1].toLowerCase().trim();
      const body = match[2].trim();
      sections[header] = body;
    }
    
    return sections;
  }
  
  extractStructuredEntities(content, sections) {
    const entities = {
      people: [],
      emails: [],
      phones: [],
      dates: [],
      money: [],
      tags: []
    };
    
    // Extract from known sections
    if (sections['contact information'] || sections['who']) {
      const contactSection = sections['contact information'] || sections['who'] || '';
      entities.emails = [...new Set(contactSection.match(this.parent.patterns.entities.people) || [])];
      entities.phones = [...new Set(contactSection.match(this.parent.patterns.structure.client.phone) || [])];
    }
    
    // Extract from full content
    entities.people = [...new Set(content.match(this.parent.patterns.entities.people) || [])];
    entities.dates = [...new Set(content.match(this.parent.patterns.entities.dates) || [])];
    entities.money = [...new Set(content.match(this.parent.patterns.structure.client.money) || [])];
    entities.tags = [...new Set(content.match(this.parent.patterns.structure.markdown.tags) || [])]
      .map(t => t.substring(1));
    
    return entities;
  }
  
  extractKeyPoints(sections) {
    const keyPoints = [];
    
    // Priority sections for key points
    const prioritySections = ['summary', 'outcome', 'status', 'what', 'key points'];
    
    for (const section of prioritySections) {
      if (sections[section]) {
        const sentences = sections[section].match(/[^.!?]+[.!?]+/g) || [];
        keyPoints.push(...sentences.slice(0, 2).map(s => s.trim()));
      }
    }
    
    return keyPoints;
  }
  
  determineType(sections, entities, context) {
    if (context.pattern !== 'generic') return context.pattern;
    
    const sectionNames = Object.keys(sections).join(' ');
    
    if (/contact|client|phone|email/.test(sectionNames)) return 'client';
    if (/ingredient|recipe|cook/.test(sectionNames)) return 'recipe';
    if (/agenda|meeting|attendee/.test(sectionNames)) return 'meeting';
    if (/project|task|milestone/.test(sectionNames)) return 'project';
    
    return 'note';
  }
  
  extractTags(sections, entities, context) {
    const tags = [...entities.tags];
    
    // Add folder-based tags
    if (context.folder) {
      const folderTags = {
        'foods': ['food', 'recipe'],
        'clients': ['client', 'business'],
        'meetings': ['meeting', 'notes'],
        'projects': ['project', 'work']
      };
      
      const folder = context.folder.toLowerCase();
      if (folderTags[folder]) {
        tags.push(...folderTags[folder]);
      }
    }
    
    // Add pattern-based tags
    if (context.pattern && context.pattern !== 'generic') {
      tags.push(context.pattern);
    }
    
    // Include semantic tags
    const semanticTags = this.parent.extractSemanticTags(
      Object.values(sections).join(' ')
    );
    tags.push(...semanticTags);
    
    return [...new Set(tags)];
  }
  
  assessCompleteness(sections) {
    const expectedSections = ['who', 'what', 'when', 'where', 'why'];
    const present = expectedSections.filter(s => sections[s]).length;
    return present / expectedSections.length;
  }
}

// Analyzer for chaotic/unstructured content
class ChaoticAnalyzer {
  constructor(parent) {
    this.parent = parent;
  }
  
  async analyze(content, context) {
    // For chaotic content, use NLP-like techniques
    const sentences = this.extractSentences(content);
    const entities = this.extractChaoticEntities(content);
    const topics = this.extractTopics(sentences);
    const keyPoints = this.identifyKeyPoints(sentences, topics);
    
    return {
      type: this.inferType(topics, entities, context),
      entities,
      topics,
      keyPoints,
      tags: this.generateTags(topics, entities, content),
      confidence: 0.6,
      completeness: 0.5,
      clarity: 0.4,
      structure: 0.2,
      preview: keyPoints[0] || sentences[0] || content.substring(0, 200)
    };
  }
  
  extractSentences(content) {
    // Handle various sentence endings and clean up
    const sentences = content
      .replace(/\n+/g, ' ')
      .match(/[^.!?]+[.!?]+/g) || [];
    
    return sentences
      .map(s => s.trim())
      .filter(s => s.split(/\s+/).length > 3); // Min 3 words
  }
  
  extractChaoticEntities(content) {
    const entities = {
      people: [],
      emails: [],
      phones: [],
      dates: [],
      money: [],
      urls: []
    };
    
    // Use all patterns to extract entities
    for (const [key, pattern] of Object.entries(this.parent.patterns.entities)) {
      if (key in entities) {
        entities[key] = [...new Set(content.match(pattern) || [])];
      }
    }
    
    // Extract money amounts
    entities.money = [...new Set(content.match(this.parent.patterns.structure.client.money) || [])];
    
    return entities;
  }
  
  extractTopics(sentences) {
    const topics = {};
    const importantWords = new Set();
    
    // Extract important words (simple TF approach)
    for (const sentence of sentences) {
      const words = sentence
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 4); // Skip short words
      
      for (const word of words) {
        topics[word] = (topics[word] || 0) + 1;
        if (topics[word] > 1) importantWords.add(word);
      }
    }
    
    // Sort by frequency
    return Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
  
  identifyKeyPoints(sentences, topics) {
    // Score sentences by topic relevance
    const scored = sentences.map(sentence => {
      const lower = sentence.toLowerCase();
      let score = 0;
      
      // Check for topic words
      for (const topic of topics.slice(0, 5)) {
        if (lower.includes(topic)) score += 2;
      }
      
      // Check for action words
      if (/\b(decided?|agreed?|need|must|will|should)\b/i.test(sentence)) score += 1;
      
      // Check for numbers/data
      if (/\d+/.test(sentence)) score += 1;
      
      return { sentence, score };
    });
    
    // Return top scoring sentences
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.sentence);
  }
  
  inferType(topics, entities, context) {
    // Use context clues and entities to infer type
    const topicString = topics.join(' ');
    
    if (entities.money.length > 0 && /client|customer|sale/.test(topicString)) return 'client';
    if (/recipe|ingredient|cook|food/.test(topicString)) return 'recipe';
    if (/meeting|discuss|agenda/.test(topicString)) return 'meeting';
    if (/project|task|deadline/.test(topicString)) return 'project';
    
    return context.pattern || 'note';
  }
  
  generateTags(topics, entities, content) {
    const tags = [];
    
    // Add entity-based tags
    if (entities.people.length > 0) tags.push('people');
    if (entities.money.length > 0) tags.push('financial');
    if (entities.dates.length > 0) tags.push('scheduled');
    
    // Add topic-based tags (top 3 topics that aren't common words)
    const commonWords = new Set(['have', 'that', 'this', 'with', 'from', 'been', 'were', 'will']);
    const topicTags = topics
      .filter(t => !commonWords.has(t) && t.length > 4)
      .slice(0, 3);
    
    tags.push(...topicTags);
    
    // Include semantic tags (pass content instead of topics)
    const semanticTags = this.parent.extractSemanticTags(content);
    tags.push(...semanticTags);
    
    return [...new Set(tags)];
  }
}

// Analyzer for sparse content
class SparseAnalyzer {
  constructor(parent) {
    this.parent = parent;
  }
  
  async analyze(content, context) {
    // For sparse content, extract maximum value from minimal data
    const lines = content.split('\n').filter(l => l.trim());
    const entities = this.extractSparseEntities(content);
    const keyInfo = this.extractKeyInformation(lines, entities);
    
    return {
      type: this.inferTypeFromMinimal(content, entities, context),
      entities,
      keyInfo,
      keyPoints: keyInfo,
      tags: this.generateMinimalTags(entities, context, content),
      confidence: 0.4,
      completeness: 0.3,
      clarity: 0.6,
      structure: 0.5,
      preview: lines.join(' ').substring(0, 200)
    };
  }
  
  extractSparseEntities(content) {
    // Same as chaotic but with lower thresholds
    const entities = {};
    
    for (const [key, pattern] of Object.entries(this.parent.patterns.entities)) {
      entities[key] = [...new Set(content.match(pattern) || [])];
    }
    
    // Check for any structured data
    entities.lists = content.match(this.parent.patterns.structure.markdown.lists) || [];
    entities.keyValues = content.match(this.parent.patterns.structure.markdown.keyValue) || [];
    
    return entities;
  }
  
  extractKeyInformation(lines, entities) {
    const keyInfo = [];
    
    // Prioritize lines with entities
    for (const line of lines) {
      let priority = 0;
      
      if (entities.people.some(p => line.includes(p))) priority += 3;
      if (entities.dates.some(d => line.includes(d))) priority += 2;
      if (entities.money?.some(m => line.includes(m))) priority += 2;
      if (/^#/.test(line)) priority += 1;
      
      if (priority > 0) {
        keyInfo.push({ line, priority });
      }
    }
    
    // Return highest priority lines
    return keyInfo
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3)
      .map(i => i.line);
  }
  
  inferTypeFromMinimal(content, entities, context) {
    // Use any available clue
    if (context.pattern !== 'generic') return context.pattern;
    
    const contentLower = content.toLowerCase();
    
    if (entities.money?.length > 0) return 'financial';
    if (entities.people?.length > 2) return 'contacts';
    if (/\.(com|org|net|io)/.test(content)) return 'reference';
    if (/^\d+\.\s/m.test(content)) return 'list';
    
    return 'note';
  }
  
  generateMinimalTags(entities, context, content) {
    const tags = [];
    
    if (context.folder) tags.push(context.folder);
    if (entities.people?.length > 0) tags.push('people');
    if (entities.dates?.length > 0) tags.push('dated');
    
    // Add sparse indicator
    tags.push('sparse');
    
    // Include semantic tags using full content
    const semanticTags = this.parent.extractSemanticTags(content);
    tags.push(...semanticTags);
    
    return [...new Set(tags)];
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const vaultPath = args[0] || process.cwd();
  
  if (args.includes('--help')) {
    console.log('Usage: node ChaosAnalyzer.js [vault-path] [options]');
    console.log('Options:');
    console.log('  --force       Force re-analysis of all files');
    console.log('  --index-only  Index files without creating capsules');  // ADDED
    console.log('  --help        Show this help');
    process.exit(0);
  }
  
  const options = {
    force: args.includes('--force'),
    indexOnly: args.includes('--index-only')  // ADDED
  };

  // Create analyzer WITHOUT forcing a specific project
  // This allows ChaosAnalyzer to detect project from file paths
  const analyzer = new ChaosAnalyzer({ 
    vaultRoot: vaultPath,
    indexOnly: options.indexOnly  // ADDED: Pass index-only flag
    // NO project: 'xxx' here - let it auto-detect from folder structure
  });

  analyzer.analyzeVault(options)
    .then(results => {
      console.log(`\n[COMPLETE] Indexed ${results.filesAnalyzed} files, created ${results.capsulesCreated} capsules`);
      console.log(`Projects detected: ${results.projectsIndexed || 'auto-detected from paths'}`);
      process.exit(results.errors.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

// Export the class, not an instance
module.exports = ChaosAnalyzer;
module.exports.ChaosAnalyzer = ChaosAnalyzer; // For destructuring compatibility