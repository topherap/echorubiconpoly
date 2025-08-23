// ────────────────────────────────────────────────────────────────
//  src/memory/MemoryVaultManager.js
//  Lightweight helper for resolving vault paths and persisting
//  memory capsules/conversation notes.
// ────────────────────────────────────────────────────────────────
const fs = require('fs/promises');
const path = require('path');
const { assignEpochAndWeight } = require('../../backend/qlib/epochClassifier');
const { generateSearchText } = require('../../backend/qlib/injectionScorer');
const { getVaultPath, vaultExists } = require('../../components/utils/VaultPathManager');
const { MemoryCapsule } = require('./MemoryCapsule');
const { inferProjectFromQuery } = require('../echo/memory/ProjectInference');

const crypto = require('crypto');
const { ChaosAnalyzer } = require('../../backend/qlib/chaosanalyzer');

// Add this class after the imports
class EchoFileRouter {
  constructor(vaultPath, currentProject = null) {
    this.vaultPath = vaultPath;
    this.currentProject = currentProject;
  }

  getPath(type, metadata = {}) {
    const base = path.join(this.vaultPath, '.echo');
    
    switch(type) {
      case 'capsule':
        return this.currentProject 
          ? path.join(base, 'projects', this.currentProject, 'capsules')
          : path.join(base, 'capsules');
          
      case 'chat':
        return this.currentProject
          ? path.join(base, 'projects', this.currentProject, 'chats')
          : path.join(base, 'chats', 'open');
          
      case 'handoff':
        return path.join(base, 'system', 'handoffs');
        
      case 'diagnostic':
        return path.join(base, 'system', 'diagnostics');
        
      case 'context-map':
        return path.join(base, 'system', 'context-maps');
        
      case 'api-briefing':
        const service = metadata.service || 'custom-1';
        return path.join(this.vaultPath, '.echo-public', `api-${service}`);
        
      case 'conversation-note':
        // Keep user-visible notes in main vault
        return path.join(this.vaultPath, 'Chats');
        
      default:
        return path.join(base, 'misc');
    }
  }
}

class MemoryVaultManager {
  constructor(vaultPath = null) {
    vaultPath = vaultPath || getVaultPath();
    if (!vaultPath || !vaultExists(vaultPath)) {
      throw new Error('[MemoryVaultManager] No valid vaultPath provided or detected.');
    }
    
    this.vaultPath = vaultPath;
    this.currentProject = null; // Will be set by ProjectSidebar
    this.router = new EchoFileRouter(vaultPath, this.currentProject);
    
    // Update paths to use router
    this.echoPath = path.join(vaultPath, '.echo');
    this.capsulesPath = this.router.getPath('capsule');
    this.conversationsPath = this.router.getPath('conversation-note');
    this.indexPath = path.join(this.echoPath, 'index.json');
    this.index = null;
    
    // Auto-load index on construction
    this.loadIndex().catch(err => {
      console.error('[MemoryVaultManager] Failed to load index on construction:', err);
    });
  }
  
  // Add method to update current project
  setCurrentProject(projectName) {
    this.currentProject = projectName;
    this.router.currentProject = projectName;
    // Update dynamic paths
    this.capsulesPath = this.router.getPath('capsule');
    console.log('[MemoryVaultManager] Project context updated to:', projectName);
  }
  
  async ensureIndex() {
    if (!this.index || !this.index.capsules || Object.keys(this.index.capsules).length === 0) {
      await this.loadIndex();
    }
  }

  async initialize() {
    await Promise.all([
      fs.mkdir(this.capsulesPath, { recursive: true }),
      fs.mkdir(this.conversationsPath, { recursive: true })
    ]);
    await this.loadIndex();
    console.log('[MemoryVault] Initialized:', this.vaultPath);
    console.log('[MemoryVault] Index loaded with', Object.keys(this.index?.capsules || {}).length, 'capsules');
  }

  async loadIndex() {
    console.log('[MemoryVaultManager] loadIndex() called');
    try {
      const raw = await fs.readFile(this.indexPath, 'utf8');
      const parsedIndex = JSON.parse(raw);
      
      // Validate index structure
      if (parsedIndex && typeof parsedIndex === 'object') {
        this.index = {
          capsules: parsedIndex.capsules || {},
          tags: parsedIndex.tags || {},
          sessions: parsedIndex.sessions || {},
          lastUpdated: parsedIndex.lastUpdated || new Date().toISOString()
        };
        
        // Convert array format to object format if needed (backwards compatibility)
        if (Array.isArray(this.index.capsules)) {
          const capsulesObj = {};
          for (const capsule of this.index.capsules) {
            if (capsule && capsule.id) {
              capsulesObj[capsule.id] = capsule;
            }
          }
          this.index.capsules = capsulesObj;
        }
        
        console.log('[MemoryVaultManager] Index loaded successfully:', Object.keys(this.index.capsules).length, 'capsules');
      } else {
        throw new Error('Invalid index structure');
      }
    } catch (err) {
      console.error('[MemoryVaultManager] Failed to load index.json:', err.message);
      console.warn('[MemoryVaultManager] Rebuilding index from disk...');
      
      // Create empty index
      this.index = {
        capsules: {},
        tags: {},
        sessions: {},
        lastUpdated: new Date().toISOString()
      };
      
      // Rebuild from disk
      await this.rebuildIndexFromDisk();
    }
  }

  async rebuildIndexFromDisk() {
    try {
      console.log('[MemoryVaultManager] Scanning capsules directory...');
      
      // Scan both general and project capsules
      const paths = [
        this.capsulesPath, // Current context path
        path.join(this.vaultPath, '.echo', 'capsules'), // General capsules
      ];
      
      // Add all project capsule directories
      const projectsPath = path.join(this.vaultPath, '.echo', 'projects');
      try {
        const projects = await fs.readdir(projectsPath, { withFileTypes: true });
        for (const project of projects) {
          if (project.isDirectory()) {
            paths.push(path.join(projectsPath, project.name, 'capsules'));
          }
        }
      } catch (err) {
        // Projects directory might not exist yet
      }
      
      let totalCount = 0;
      for (const scanPath of paths) {
        try {
          const count = await this.scanCapsulesDirectory(scanPath);
          totalCount += count;
        } catch (err) {
          // Path might not exist
        }
      }
      
      console.log('[MemoryVaultManager] Rebuilt index with', totalCount, 'capsules');
      
      // Save the rebuilt index
      await this.saveIndex();
    } catch (err) {
      console.error('[MemoryVaultManager] Failed to rebuild index:', err);
    }
  }

  async scanCapsulesDirectory(dirPath, depth = 0) {
    let count = 0;
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory() && depth < 3) {
          // Recurse into subdirectories (year/month/day structure)
          count += await this.scanCapsulesDirectory(fullPath, depth + 1);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          // Load and index the capsule
          try {
            const capsuleData = await fs.readFile(fullPath, 'utf8');
            const capsule = JSON.parse(capsuleData);
            
            if (capsule && capsule.id) {
              const relPath = path.relative(this.vaultPath, fullPath);
              
              // Skip if already indexed
              if (this.index.capsules[capsule.id]) {
                console.log(`[INDEX] Skipping duplicate capsule: ${capsule.id}`);
                return;
              }
              
              // Store full capsule data in index for searching
              this.index.capsules[capsule.id] = {
                path: relPath,
                timestamp: capsule.timestamp || new Date().toISOString(),
                type: capsule.type || 'conversation',
                sessionId: capsule.sessionId || null,
                tags: Array.isArray(capsule.tags) ? capsule.tags : [],
                // Add searchable content
                content: capsule.content || '',
                metadata: capsule.metadata || {},
                contentType: capsule.metadata?.contentType || null,
                summary: capsule.summary || '',
                messages: capsule.messages || [],
                // Track which project this belongs to
                project: this.extractProjectFromPath(relPath)
              };
              
              // Update tags index
              if (Array.isArray(capsule.tags)) {
                for (const tag of capsule.tags) {
                  if (!this.index.tags[tag]) {
                    this.index.tags[tag] = [];
                  }
                  if (!this.index.tags[tag].includes(capsule.id)) {
                    this.index.tags[tag].push(capsule.id);
                  }
                }
              }
              
              // Update sessions index
              if (capsule.sessionId) {
                if (!this.index.sessions[capsule.sessionId]) {
                  this.index.sessions[capsule.sessionId] = [];
                }
                if (!this.index.sessions[capsule.sessionId].includes(capsule.id)) {
                  this.index.sessions[capsule.sessionId].push(capsule.id);
                }
              }
              
              count++;
            }
          } catch (e) {
            console.warn(`[MemoryVaultManager] Skipping invalid capsule: ${fullPath}`, e.message);
          }
        }
      }
    } catch (err) {
      console.error('[MemoryVaultManager] Error scanning directory:', dirPath, err);
    }
    
    return count;
  }

  extractProjectFromPath(relPath) {
    // Extract project name from path like ".echo/projects/clients/capsules/..."
    const match = relPath.match(/\.echo[\\\/]projects[\\\/]([^\\\/]+)[\\\/]/);
    return match ? match[1] : null;
  }

  async saveIndex() {
    try {
      await fs.writeFile(this.indexPath, JSON.stringify(this.index, null, 2), 'utf8');
      console.log('[MemoryVaultManager] Index saved with', Object.keys(this.index.capsules).length, 'capsules');
    } catch (err) {
      console.error('[MemoryVaultManager] Failed to save index:', err);
    }
  }

  bulkAssignEpochs(capsules) {
    return capsules.map(capsule => {
      const epochData = assignEpochAndWeight(capsule);
      capsule.epoch = epochData.epoch;
      capsule.weight = epochData.weight;
      return capsule;
    });
  }

  async saveCapsule(capsule) {
    // Delegate to unified vault.js system
    const { MemoryVaultManager: UnifiedVault } = require('./vault');
    const unifiedVault = new UnifiedVault(this);
    
    // Prepare capsule with metadata
    if (!(capsule instanceof MemoryCapsule)) {
      capsule = new MemoryCapsule(capsule);
    }

    capsule.id = capsule.id || `capsule_${Date.now()}`;
    capsule.timestamp = capsule.timestamp || new Date().toISOString();
    
    // Add project context if available
    if (this.currentProject) {
      capsule.project = this.currentProject;
    }

    // Inject searchable text for scoring
    capsule._searchText = generateSearchText(capsule);

    // Save through unified system
    const result = await unifiedVault.saveCapsule(capsule);
    
    // Update local index for compatibility
    await this.ensureIndex();
    if (capsule && typeof capsule === 'object' && typeof capsule.id === 'string') {
      this.index.capsules[capsule.id] = {
        path: result.path || `capsules/${capsule.project || 'misc'}/${capsule.id}.json`,
        timestamp: capsule.timestamp,
        type: capsule.type || 'conversation',
        sessionId: capsule.sessionId || null,
        tags: Array.isArray(capsule.tags) ? capsule.tags : [],
        content: capsule.content || '',
        metadata: capsule.metadata || {},
        contentType: capsule.metadata?.contentType || null,
        project: capsule.project || this.currentProject
      };
      
      // Update tags and sessions indexes
      if (Array.isArray(capsule.tags)) {
        for (const tag of capsule.tags) {
          if (!this.index.tags[tag]) this.index.tags[tag] = [];
          if (!this.index.tags[tag].includes(capsule.id)) {
            this.index.tags[tag].push(capsule.id);
          }
        }
      }
      
      if (capsule.sessionId) {
        if (!this.index.sessions[capsule.sessionId]) this.index.sessions[capsule.sessionId] = [];
        if (!this.index.sessions[capsule.sessionId].includes(capsule.id)) {
          this.index.sessions[capsule.sessionId].push(capsule.id);
        }
      }
      
      this.index.lastUpdated = new Date().toISOString();
      await this.saveIndex();
    }

    console.log('[MemoryVault] Saved capsule via unified system:', capsule.id, 'project:', capsule.project || 'misc');
    return { id: capsule.id, path: result.path };
  }

  async createConversationNote(capsule) {
    if (!(capsule instanceof MemoryCapsule)) {
      capsule = new MemoryCapsule(capsule);
    }

    const ts = new Date(capsule.timestamp);
    const fileName = `${ts.toISOString().split('T')[0]}_${ts.toTimeString().slice(0, 8).replace(/:/g, '-')}_${capsule.id.slice(0, 8)}.md`;
    
    // Use router to determine chat location based on current project
    const chatPath = this.router.getPath('chat');
    await fs.mkdir(chatPath, { recursive: true });
    
    const absPath = path.join(chatPath, fileName);

    await fs.writeFile(absPath, this.formatConversationNote(capsule), 'utf8');
    console.log('[MemoryVault] Conversation note written:', fileName);

    return { path: path.relative(this.vaultPath, absPath) };
  }

  formatConversationNote(capsule) {
    const frontmatter = [
      '---',
      `id: ${capsule.id}`,
      `date: ${capsule.timestamp}`,
      `session: ${capsule.sessionId || 'none'}`,
      `project: ${this.currentProject || 'none'}`,
      `tags: [${capsule.tags.join(', ')}]`,
      `type: ${capsule.type}`,
      '---'
    ].join('\n');

    const body = (capsule.messages || []).map(m => {
      const stamp = m.timestamp ? ` (${new Date(m.timestamp).toLocaleTimeString()})` : '';
      return `## ${m.role.charAt(0).toUpperCase() + m.role.slice(1)}${stamp}\n\n${m.content}\n`;
    }).join('\n');

    const summary = capsule.summary ? `## Summary\n\n${capsule.summary}\n` : '';

    const meta = [
      '## Metadata',
      `- **Importance**: ${capsule.importance}`,
      `- **Token Count**: ${capsule.tokenCount}`,
      capsule.metadata?.model ? `- **Model**: ${capsule.metadata.model}` : '',
      capsule.metadata?.topic ? `- **Topic**: ${capsule.metadata.topic}` : ''
    ].filter(Boolean).join('\n');

    return `${frontmatter}\n\n# Conversation Log\n\n${body}\n${summary}${meta}\n`;
  }

  async loadCapsule(capsuleId) {
    console.log('[MemoryVault] loadCapsule called with:', capsuleId);
    
    // Direct disk read - bypass the index entirely
    try {
      let capsulePath;
      
      // Handle different input formats
      if (typeof capsuleId === 'string') {
        if (capsuleId.endsWith('.json')) {
          // Full filename provided
          capsulePath = path.join(this.vaultPath, '.echo', 'capsules', capsuleId);
        } else {
          // Just the ID, add extension
          capsulePath = path.join(this.vaultPath, '.echo', 'capsules', `${capsuleId}.json`);
        }
      } else if (capsuleId && capsuleId.id) {
        // Object with id property
        capsulePath = path.join(this.vaultPath, '.echo', 'capsules', `${capsuleId.id}.json`);
      } else {
        console.error('[MemoryVault] Invalid capsule reference:', capsuleId);
        return null;
      }
      
      // Verify vault path is set
      if (!this.vaultPath) {
        console.error('[MemoryVault] No vaultPath set!');
        return null;
      }
      
      // Read directly from disk
      const raw = await fs.readFile(capsulePath, 'utf8');
      const capsuleData = JSON.parse(raw);
      
      console.log('[MemoryVault] Successfully loaded capsule from disk:', capsuleId);
      return new MemoryCapsule(capsuleData);
      
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.warn(`[MemoryVault] Capsule file not found: ${capsuleId}`);
      } else {
        console.error(`[MemoryVault] Failed to load capsule ${capsuleId}:`, err.message);
      }
      return null;
    }
  }

  // Brain Region: Hippocampus - Memory Retrieval System
  // Searches across all project capsules recursively for relevant memories
  async searchMemories(query, options = {}) {
    console.log('[Hippocampus] Searching memories for:', query);
    
    try {
      // Use the enhanced capsuleRetriever with all our fixes
      const { retrieveRelevantCapsules } = require('../echo/memory/capsuleRetriever');
      const crypto = require('crypto');
      
      // Clone options to avoid mutation
      const searchOptions = { ...options };
      
      // Infer project if not explicitly provided
      if (!searchOptions.project && !global.currentProject) {
        const inferredProject = inferProjectFromQuery(query);
        if (inferredProject) {
          console.log(`[SearchMemories] inferredProject=${inferredProject}, usingProject=${inferredProject}`);
          searchOptions.project = inferredProject;
        } else {
          console.log(`[SearchMemories] inferredProject=null, usingProject=${searchOptions.project || 'none'}`);
        }
      } else {
        console.log(`[SearchMemories] inferredProject=skipped, usingProject=${searchOptions.project || global.currentProject || 'none'}`);
      }
      
      // Build options for the enhanced retriever
      const retrieverOptions = {
        vaultPath: this.vaultPath,
        limit: (searchOptions.limit || 50) * 2,  // Get extra for post-processing
        folder: searchOptions.folder || null,
        project: searchOptions.project || this.currentProject || null,
        minRelevance: 0,  // Let adaptive threshold handle filtering
      };
      
      console.log('[Hippocampus] Using enhanced capsuleRetriever with options:', retrieverOptions);
      
      // Call the enhanced retriever with project context
      const results = await retrieveRelevantCapsules(query, retrieverOptions);
      
      console.log(`[Hippocampus] Enhanced retriever found ${results.length} capsules`);
      
      // Apply folder filter if specified and not already handled by retriever
      let filteredResults = results;
      if (searchOptions.folder) {
        filteredResults = results.filter(cap => {
          const capsuleFolder = cap.metadata?.folder || '';
          const capsulePath = cap.metadata?.filePath || cap._sourcePath || '';
          return capsuleFolder.toLowerCase() === searchOptions.folder.toLowerCase() ||
                 capsulePath.toLowerCase().includes(searchOptions.folder.toLowerCase());
        });
        console.log(`[Hippocampus] Filtered to ${filteredResults.length} capsules in folder: ${searchOptions.folder}`);
      }
      
      // Limit results to requested amount
      filteredResults = filteredResults.slice(0, searchOptions.limit || 50);
      
      // Log filtering stats
      console.log(`[SearchMemories] filtered failures: ${filteredResults.length} kept`);
      
      // Ensure proper structure for each result
      const finalResults = filteredResults.map(capsule => {
        if (!(capsule instanceof MemoryCapsule)) {
          return new MemoryCapsule({
            ...capsule,
            id: capsule.id || crypto.randomUUID(),
            content: capsule.content || capsule.summary || '[No content available]',
            messages: capsule.messages || [],
            summary: capsule.summary || '',
            metadata: {
              ...capsule.metadata,
              type: capsule.type || capsule.metadata?.type || 'memory',
              chaos_score: capsule.chaosScore || capsule.metadata?.chaos_score || 0.5,
              relevance_score: capsule.relevanceScore || capsule.score || 0,
              fileName: capsule.metadata?.fileName || capsule._fileName,
              folder: capsule.metadata?.folder,
              tags: capsule.metadata?.tags || []
            },
            timestamp: capsule.timestamp || new Date().toISOString()
          });
        }
        return capsule;
      });
      
      console.log(`[Hippocampus] Returning ${finalResults.length} results for "${query}"`);
      
      // Log sample result for verification
      if (finalResults.length > 0) {
        console.log('[Hippocampus] Top result:', {
          id: finalResults[0].id,
          score: finalResults[0].metadata?.relevance_score,
          type: finalResults[0].metadata?.type,
          contentPreview: (finalResults[0].content || '').substring(0, 100)
        });
      }
      
      return finalResults;
      
    } catch (error) {
      console.error('[Hippocampus] Search error:', error);
      console.error('[Hippocampus] Stack:', error.stack);
      return [];
    }
  }

  // Add this helper method right after searchMemories
  async loadAllCapsulesRecursively() {
    const fs = require('../../src/memory/fsReplacement'); // REDIRECTED TO QLIB
    const capsules = [];
    
    async function scanDirectory(dir) {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory() && !item.name.startsWith('.git')) {
            // Recursively scan subdirectories
            await scanDirectory(fullPath);
          } else if (item.isFile() && item.name.endsWith('.json')) {
            // Skip system files
            if (!['config', 'identity', 'settings', 'index'].some(skip => item.name.includes(skip))) {
              try {
                const content = await fs.readFile(fullPath, 'utf8');
                const capsule = JSON.parse(content);
                
                // Add file path to metadata for debugging
                if (!capsule.metadata) capsule.metadata = {};
                capsule.metadata.filePath = fullPath;
                
                capsules.push(capsule);
              } catch (err) {
                // Skip malformed JSON files
              }
            }
          }
        }
      } catch (err) {
        // Skip inaccessible directories
      }
    }
    
    // Start recursive scan from .echo root
    await scanDirectory(this.echoPath);
    return capsules;
  }

  // Simplified relevance calculation for any stragglers
  calculateSearchRelevance(query, item) {
    if (!query || !item) return 0;
    
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
    
    let score = 0;
    
    // Check content
    const content = (item.content || item.summary || '').toLowerCase();
    if (content.includes(queryLower)) {
      score += 0.5;
    }
    
    // Check individual terms
    const matchedTerms = queryTerms.filter(term => content.includes(term)).length;
    if (queryTerms.length > 0) {
      score += (matchedTerms / queryTerms.length) * 0.3;
    }
    
    // Check metadata
    if (item.metadata) {
      // Folder match
      if (item.metadata.folder?.toLowerCase().includes(queryLower)) {
        score += 0.2;
      }
      
      // Type match
      if (item.metadata.type && queryLower.includes(item.metadata.type)) {
        score += 0.1;
      }
    }
    
    return Math.min(score, 1.0);
  }

  async loadCapsules(options = {}) {
    const { getCapsulesByDate } = require('../echo/memory/capsuleRetriever');
    return await getCapsulesByDate({
      vaultPath: this.vaultPath,
      ...options
    });
  }

  // Updated search method with dynamic limit
  async searchMarkdownFilesWithChaos(query, folder = null, baseLimit = 10) {
    const vaultPath = this.vaultPath;
    const { ChaosAnalyzer } = require('../../backend/qlib/chaosanalyzer');

    try {
      const chaos = new ChaosAnalyzer({
  vaultRoot: vaultPath,
  project: this.currentProject,
  indexOnly: true  // ADD THIS - searching should not create capsules
})
      const searchLimit = baseLimit * 2;

      const results = await chaos.analyzeVault({
        query,
        folders: folder ? [folder] : null,
        force: false,
        includeContent: true,
        limit: searchLimit
      });

      return results || [];

    } catch (error) {
      console.error('[ERROR] ChaosAnalyzer analyzeVault failed:', error);
      return [];
    }
  }

  detectQueryIntent(query) {
    const lower = query.toLowerCase();
    
    if (lower.includes('recipe') || lower.includes('cook') || lower.includes('food')) {
      return 'recipe';
    }
    if (lower.includes('client') || lower.includes('customer')) {
      return 'client';
    }
    if (lower.includes('project') || lower.includes('task') || lower.includes('todo')) {
      return 'project';
    }
    if (lower.includes('documentation') || lower.includes('handoff')) {
      return 'documentation';
    }
    
    return 'general';
  }

  classifyContent(capsule) {
    if (!capsule) return 'general'; // Changed from 'unknown' to match detectQueryIntent
    
    if (capsule.metadata?.contentType) {
      return capsule.metadata.contentType;
    }
    
    const content = (capsule.content || '').toLowerCase();
    const messages = capsule.messages || [];
    const allText = content + ' ' + messages.map(m => m.content || '').join(' ').toLowerCase();
    
    // Recipe indicators
    if (allText.match(/\b(ingredients|recipe|cook|bake|tablespoon|teaspoon)\b/)) {
      return 'recipe';
    }
    
    // Client indicators
    if (allText.match(/\b(client|customer|invoice|contract)\b/)) {
      return 'client';
    }
    
    // Project indicators
    if (allText.match(/\b(project|deadline|milestone|deliverable)\b/)) {
      return 'project';
    }
    
    // Documentation indicators
    if (allText.match(/\b(documentation|readme|handoff|technical)\b/)) {
      return 'documentation';
    }
    
    return 'conversation';
  }

  getCapsuleCount() {
    return this.index ? Object.keys(this.index.capsules).length : 0;
  }

  // Get all chats organized by location
  async getOrganizedChats() {
    const organized = {
      projects: {},
      open: []
    };
    
    try {
      // Scan project chats
      const projectsPath = path.join(this.echoPath, 'projects');
      if (await fs.access(projectsPath).then(() => true).catch(() => false)) {
        const projects = await fs.readdir(projectsPath, { withFileTypes: true });
        
        for (const project of projects) {
          if (project.isDirectory()) {
            const chatPath = path.join(projectsPath, project.name, 'chats');
            if (await fs.access(chatPath).then(() => true).catch(() => false)) {
              const chats = await fs.readdir(chatPath);
              organized.projects[project.name] = chats.filter(f => f.endsWith('.md'));
            }
          }
        }
      }
      
      // Scan open chats
      const openPath = path.join(this.echoPath, 'chats', 'open');
      if (await fs.access(openPath).then(() => true).catch(() => false)) {
        const openChats = await fs.readdir(openPath);
        organized.open = openChats.filter(f => f.endsWith('.md'));
      }
      
    } catch (error) {
      console.error('[MemoryVault] Error organizing chats:', error);
    }
    
    return organized;
  }

  // Add a method to write system handoffs
  async writeSystemHandoff(handoffData) {
    const handoffPath = this.router.getPath('handoff');
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `handoff-${timestamp}.md`;
    
    const content = `# Echo System Handoff
Generated: ${new Date().toISOString()}

## Session Statistics
- Capsules processed: ${this.getCapsuleCount()}
- Current project: ${this.currentProject || 'None'}
- Memory queries: ${handoffData.queryCount || 0}

## Context Understanding
${handoffData.contextNotes || 'No specific context notes.'}

## Issues Encountered
${handoffData.issues || 'No issues reported.'}

## Next Session Recommendations
${handoffData.recommendations || 'Continue normal operation.'}
`;

    await fs.mkdir(handoffPath, { recursive: true });
    await fs.writeFile(path.join(handoffPath, filename), content, 'utf8');
    console.log('[System] Handoff written:', filename);
  }

  // Debug method to check index status
  async debugIndex() {
    await this.ensureIndex();
    
    console.log('[MemoryVaultManager] Debug Info:');
    console.log('- Vault Path:', this.vaultPath);
    console.log('- Current Project:', this.currentProject || 'None');
    console.log('- Index Path:', this.indexPath);
    console.log('- Total Capsules:', this.getCapsuleCount());
    console.log('- Index Structure:', {
      capsules: Object.keys(this.index?.capsules || {}).length,
      tags: Object.keys(this.index?.tags || {}).length,
      sessions: Object.keys(this.index?.sessions || {}).length
    });
    
    // Show capsules by project
    const projectCounts = {};
    for (const [id, info] of Object.entries(this.index?.capsules || {})) {
      const project = info.project || 'general';
      projectCounts[project] = (projectCounts[project] || 0) + 1;
    }
    console.log('- Capsules by Project:', projectCounts);
    
    // Sample a few capsules
    const sampleIds = Object.keys(this.index?.capsules || {}).slice(0, 3);
    console.log('- Sample Capsules:');
    for (const id of sampleIds) {
      const info = this.index.capsules[id];
      console.log(`  - ${id}: ${info.contentType || 'no-type'} in ${info.project || 'general'} at ${info.path}`);
    }
  }
}

module.exports = { MemoryVaultManager };

