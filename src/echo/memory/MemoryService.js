const path = require('path');
const fs = require('../../memory/fsReplacement'); // REDIRECTED TO QLIB
const { QLIB_MODEL } = require('../../installer/qlib-setup');
const { resolveNoteTarget } = require('./NoteTools');
const { autoAppendToNote } = require('./NoteTools'); // at top of file



class MemoryService {
  constructor(vaultPath) {
    this.vaultPath = vaultPath;
    this.qlibModel = QLIB_MODEL;
    this.capsulePath = path.join(vaultPath, '.echo', 'capsules');
    console.log('[MemoryService] Initialized with vault:', vaultPath);
    console.log('[MemoryService] Q-Lib model:', this.qlibModel);
  }
  
  // Q-Lib extracts facts from vault based on query
  async extractRelevantMemory(params) {
  const { query, conversation, maxTokens } = params;
  console.log('[MemoryService] Extracting memory:', { query, conversation });

    
    // FIXED: Search vault content instead of capsules
    const relevantContent = await this.searchVaultContent(query);
    
    // Build extraction prompt for Q-Lib
    const prompt = `ROLE: Memory librarian. Extract facts only. No creativity.
QUERY: "${query}"
MEMORY_DATA: ${JSON.stringify(relevantContent.slice(0, 5))}
TASK: Extract ONLY relevant facts from memory data.
RETURN FORMAT: { "facts": ["fact1", "fact2"], "sources": ["source1", "source2"] }
OUTPUT JSON ONLY:`;
    
    try {
      const response = await this.callQLib(prompt);
      const parsed = this.parseQLibResponse(response);
      console.log('[MemoryService] Extracted', parsed.facts.length, 'facts');
      return parsed;
    } catch (error) {
      console.error('[MemoryService] Extraction failed:', error);
      return { facts: [], sources: [] };
    }
  }
  
  // NEW: Search vault content with layered approach
  async searchVaultContent(query) {
    console.log('[MemoryService] Searching vault content for:', query);
    
    try {
      // Use layered search approach
      const results = await this.performLayeredSearch(query);
      
      // Convert search results to format expected by Q-Lib
      const contentData = results.map(result => ({
        path: result.path,
        content: result.content,
        type: result.matchType || 'content',
        score: result.score || 0
      }));
      
      console.log('[MemoryService] Found', contentData.length, 'vault content results');
      return contentData;
    } catch (error) {
      console.error('[MemoryService] Vault search failed:', error);
      return [];
    }
  }
  
  // NEW: Layered search method
  async performLayeredSearch(query) {
    let results = [];
    
    // LAYER 1: Target folder detection
    const targetFolder = this.detectTargetFolder(query);
    if (targetFolder) {
      console.log(`[MemoryService] Target folder detected: ${targetFolder}`);
      const folderResults = await this.searchSpecificFolder(targetFolder, query);
      results = [...results, ...folderResults];
    }
    
    // LAYER 2: Full vault content (excluding conversations)
    if (results.length < 3) {
      console.log('[MemoryService] Searching full vault content');
      const vaultResults = await this.searchFullVault(query);
      results = [...results, ...vaultResults];
    }
    
    // LAYER 3: Limited conversation context (max 1 for minimal noise)
    if (results.length < 5) {
      console.log('[MemoryService] Adding minimal conversation context');
      const conversations = await this.searchConversations(query, 1);
      results = [...results, ...conversations];
    }
    
    return results.slice(0, 10);
  }
  
  // NEW: Detect target folder
  detectTargetFolder(query) {
    const folderMap = {
      'recipe': 'Foods',
      'recipes': 'Foods',
      'food': 'Foods',
      'foods': 'Foods',
      'client': 'clients',
      'clients': 'clients',
      'medical': 'medical',
      'legal': 'legal',
      'contact': 'contacts',
      'contacts': 'contacts'
    };
    
    const queryLower = query.toLowerCase();
    for (const [key, folder] of Object.entries(folderMap)) {
      if (queryLower.includes(key)) {
        return folder;
      }
    }
    return null;
  }
  
  // NEW: Search specific folder
  async searchSpecificFolder(folderName, query) {
    const folderPath = path.join(this.vaultPath, folderName);
    
    try {
      const files = await fs.readdir(folderPath, { recursive: true });
      const results = [];
      
      for (const file of files) {
        if (file.endsWith('.md') || file.endsWith('.json')) {
          const filePath = path.join(folderPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          
          const searchResult = this.processFile(content, query, path.join(folderName, file), 'content');
          if (searchResult) {
            searchResult.score += 50; // Boost for targeted folder
            results.push(searchResult);
          }
        }
      }
      
      return results.sort((a, b) => b.score - a.score).slice(0, 50);
    } catch (error) {
      console.error(`[MemoryService] Failed to search folder ${folderName}:`, error);
      return [];
    }
  }
  
  // NEW: Search full vault
  async searchFullVault(query) {
    const excludeFolders = ['conversations', 'Chats', 'Echo'];
    
    try {
      const getAllFiles = async (dir, baseDir = '') => {
        const files = [];
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          const relativePath = baseDir ? path.join(baseDir, item.name) : item.name;
          
          if (item.isDirectory() && !item.name.startsWith('.')) {
            const subFiles = await getAllFiles(fullPath, relativePath);
            files.push(...subFiles);
          } else if (item.isFile() && (item.name.endsWith('.md') || item.name.endsWith('.json'))) {
            files.push({ fullPath, relativePath });
          }
        }
        return files;
      };
      
      const allFiles = await getAllFiles(this.vaultPath);
      const results = [];
      
      for (const file of allFiles) {
        if (excludeFolders.some(folder => file.relativePath.startsWith(folder))) {
          continue;
        }
        
        const content = await fs.readFile(file.fullPath, 'utf8');
        const searchResult = this.processFile(content, query, file.relativePath, 'content');
        if (searchResult) {
          results.push(searchResult);
        }
      }
      
      return results.sort((a, b) => b.score - a.score).slice(0, 3);
    } catch (error) {
      console.error('[MemoryService] Failed to search full vault:', error);
      return [];
    }
  }
  
  // NEW: Search conversations with limit
  async searchConversations(query, limit = 1) {
    const conversationFolders = ['conversations', 'Chats'];
    const results = [];
    
    for (const folder of conversationFolders) {
      const folderPath = path.join(this.vaultPath, folder);
      
      try {
        const files = await fs.readdir(folderPath);
        const sortedFiles = files
          .filter(f => f.endsWith('.md'))
          .sort((a, b) => b.localeCompare(a))
          .slice(0, limit);
        
        for (const file of sortedFiles) {
          const filePath = path.join(folderPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          
          const searchResult = this.processFile(content, query, path.join(folder, file), 'conversation');
          if (searchResult) {
            searchResult.score = Math.max(1, searchResult.score - 10); // Deprioritize
            searchResult.content = searchResult.content.slice(0, 500); // Limit content
            results.push(searchResult);
          }
        }
      } catch (error) {
        console.error(`[MemoryService] Failed to search conversations in ${folder}:`, error);
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }
  
  // NEW: Process file for relevance
  processFile(content, query, relativePath, type) {
    let searchableContent = content;
    if (relativePath.endsWith('.json')) {
      try {
        const jsonData = JSON.parse(content);
        searchableContent = JSON.stringify(jsonData, null, 2);
        if (jsonData.content && jsonData.content.summary) {
          searchableContent = `${jsonData.content.summary} ${searchableContent}`;
        }
      } catch (e) {
        // Use raw content if JSON parse fails
      }
    }
    
    const contentLower = searchableContent.toLowerCase();
    const queryLower = query.toLowerCase();
    
    const extension = path.extname(relativePath);
    const filenameWithoutExt = path.basename(relativePath, extension).toLowerCase();
    const filenameMatches = filenameWithoutExt.includes(queryLower);
    const contentMatches = contentLower.includes(queryLower);
    
    if (!filenameMatches && !contentMatches) {
      return null;
    }
    
    const matchCount = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
    const score = (filenameMatches ? 20 : 0) + matchCount;
    
    return {
      path: relativePath,
      content: content,
      score: score,
      matchType: type
    };
  }
  
  // Q-Lib summarizes long content
  async summarizeContent(content, maxLength = 500) {
    console.log('[MemoryService] Summarizing', content.length, 'chars to max', maxLength);
    
    if (content.length <= maxLength) {
      return content;
    }
    
    const prompt = `ROLE: Summarizer. Compress to key facts only.
CONTENT: ${content}
MAX_LENGTH: ${maxLength} characters
TASK: Extract only the most important facts. No interpretation.
SUMMARY:`;
    
    try {
      const summary = await this.callQLib(prompt);
      return summary.substring(0, maxLength);
    } catch (error) {
      console.error('[MemoryService] Summarization failed:', error);
      return content.substring(0, maxLength);
    }
  }
  
  // Q-Lib categorizes interactions for filing
  async categorizeInteraction(interaction) {
    console.log('[MemoryService] Categorizing interaction');
    
    const prompt = `ROLE: Filing clerk. Categorize this interaction.
TIMESTAMP: ${interaction.timestamp}
USER_INPUT: ${interaction.input}
AI_RESPONSE: ${interaction.response?.substring(0, 200)}
TASK: Categorize for filing. Be precise.
RETURN FORMAT: { "category": "type", "tags": ["tag1", "tag2"], "importance": 1-5 }
OUTPUT JSON ONLY:`;
    
    try {
      const response = await this.callQLib(prompt);
      const parsed = this.parseQLibResponse(response);
      console.log('[MemoryService] Categorized as:', parsed.category);
      return parsed;
    } catch (error) {
      console.error('[MemoryService] Categorization failed:', error);
      return { category: 'general', tags: [], importance: 3 };
    }
  }
  
  // KEPT: Legacy capsule search (for backward compatibility)
  async searchCapsules(query) {
    try {
      // Ensure capsule directory exists
      await fs.mkdir(this.capsulePath, { recursive: true });
      
      // Read all capsule files
      const files = await fs.readdir(this.capsulePath);
      const capsules = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(this.capsulePath, file), 'utf8');
            const capsule = JSON.parse(content);
            
            // Simple relevance check (can be improved with better search)
            if (this.isRelevant(capsule, query)) {
              capsules.push(capsule);
            }
          } catch (err) {
            console.warn('[MemoryService] Failed to read capsule:', file, err.message);
          }
        }
      }
      
      // Sort by timestamp, most recent first
      capsules.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      console.log('[MemoryService] Found', capsules.length, 'relevant capsules');
      return capsules;
    } catch (error) {
      console.error('[MemoryService] Capsule search failed:', error);
      return [];
    }
  }
  
  // Simple relevance check (can be enhanced)
  isRelevant(capsule, query) {
    const queryLower = query.toLowerCase();
    const checkString = (str) => str && str.toLowerCase().includes(queryLower);
    
    return checkString(capsule.input) || 
           checkString(capsule.response) ||
           (capsule.tags && capsule.tags.some(tag => checkString(tag)));
  }
  
  // Call Q-Lib model via Ollama
  async callQLib(prompt) {
    const { apiCall } = require('./api-wrapper'); // Use local wrapper
    
    try {
      const response = await apiCall({
        model: this.qlibModel,
        prompt: prompt,
        stream: false,
        temperature: 0.1, // Very low for factual extraction
        options: {
          num_predict: 500, // Limit response length
          stop: ['\n\n', 'User:', 'Human:', 'Assistant:'] // Stop sequences
        }
      });
      
      return response;
    } catch (error) {
      console.error('[MemoryService] Q-Lib call failed:', error);
      throw error;
    }
  }
  
  // Parse Q-Lib response (handles both JSON and text)
  parseQLibResponse(response) {
    try {
      // First try to parse as JSON
      if (response.includes('{')) {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      
      // Fallback: extract facts from text
      const facts = response.split('\n')
        .filter(line => line.trim().length > 0)
        .filter(line => !line.includes('ROLE:') && !line.includes('TASK:'))
        .map(line => line.replace(/^[-*•]\s*/, '').trim());
      
      return { facts, sources: [] };
    } catch (error) {
      console.warn('[MemoryService] Failed to parse Q-Lib response:', error);
      return { facts: [], sources: [] };
    }
  }
}

module.exports = MemoryService;


