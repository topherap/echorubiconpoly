const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs/promises');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { getVaultPath, vaultExists } = require('../../components/utils/VaultPathManager');
const memoryTracer = require('../../main/utils/memoryTracer');

let qlibInstance = null;

class QLibInterface {
  constructor(vaultPath) {
    this.model = 'command-r7b:latest';
    this.extractionModel = 'granite3.3:2b'; // Use granite for extraction
    this.isAvailable = true;
    this.vaultPath = vaultPath;
    this.index = null;
    this.categoryMap = null;
  }

  // Initialize vault and load category mappings
  async forceVaultScan(vaultPath = this.vaultPath) {
    if (!vaultPath) {
      console.error('[Q-lib] No vault path provided');
      return;
    }

    const files = await this.readVaultFiles(vaultPath);
    this.index = await this.indexFiles(files);
    this.categoryMap = await this.buildCategoryMap(vaultPath);
    console.log('[Q-lib] Vault indexed:', files.length, 'files');
  }

  // Build category map from folder structure
  async buildCategoryMap(vaultPath) {
    const map = {};
    const entries = await fs.readdir(vaultPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const folderPath = path.join(vaultPath, entry.name);
        const category = this.inferCategory(entry.name);
        map[entry.name.toLowerCase()] = category;
      }
    }
    
    return map;
  }

  // Infer category from folder name
  inferCategory(folderName) {
    const patterns = {
      'clients': 'client',
      'projects': 'project',
      'recipes': 'recipe',
      'people': 'person',
      'companies': 'company',
      'echo': 'conversation',
      'conversations': 'conversation',
      'notes': 'note'
    };
    
    const lower = folderName.toLowerCase();
    return patterns[lower] || lower.replace(/s$/, ''); // Remove plural 's'
  }

  // Walk vault and load .md files
  async readVaultFiles(vaultPath) {
    const fileList = [];

    const walk = async (dir, relativePath = '') => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          if (['.obsidian', '.trash', 'node_modules', '.git'].includes(entry.name)) continue;
          await walk(fullPath, relPath);
        } else if (entry.isFile() && fullPath.endsWith('.md')) {
          const content = await fs.readFile(fullPath, 'utf8');
          fileList.push({ 
            file: fullPath,
            relativePath: relPath,
            folder: relativePath.split(path.sep)[0] || 'root',
            content 
          });
        }
      }
    };

    await walk(vaultPath);
    return fileList;
  }

  // Read a single vault file
  async readVaultFile(filePath) {
    try {
      console.log('[Q-lib] Reading single file:', filePath);
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error('[Q-lib] Error reading file:', error);
      throw error;
    }
  }

  // Index files with metadata
  async indexFiles(files) {
    this.index = files.map(f => ({
      file: f.file,
      relativePath: f.relativePath,
      folder: f.folder,
      wordCount: f.content.split(/\s+/).length,
      title: this.extractTitle(f.content),
      category: this.categoryMap?.[f.folder.toLowerCase()] || f.folder
    }));
    return this.index;
  }

  // Extract title from markdown content
  extractTitle(content) {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ')) {
        return line.substring(2).trim();
      }
    }
    return null;
  }

  // PRIMARY EXTRACTION METHOD - Fixed version
  async extractFacts(text, options = {}) {
    console.log('[Q-Lib] Extracting facts from:', text.substring(0, 50) + '...');
    memoryTracer.track('QLIB_EXTRACT_START', { query: text, options });
    
    const prompt = `Extract structured information from this query.
Identify:
- entities: specific names of people, companies, or things
- actions: verbs like list, show, find, get, display
- types: categories like client, project, recipe, file
- specifics: exact file or item names mentioned
- temporal: time references like today, yesterday, last week

Query: "${text}"

Return ONLY valid JSON with these exact fields:
{"entities":[],"actions":[],"types":[],"specifics":[],"temporal":[]}`;

    try {
      memoryTracer.track('QLIB_PROMPT', { model: this.extractionModel, prompt });
      const response = await this.callOllamaAPI(prompt, this.extractionModel);
      memoryTracer.track('QLIB_RAW_RESPONSE', { response });
      
      // Parse response with multiple fallback strategies
      let facts = await this.parseExtractedFacts(response);
      memoryTracer.track('QLIB_PARSED_FACTS', facts);
      
      // Enhance with pattern matching
      facts = this.enhanceWithPatterns(facts, text);
      memoryTracer.track('QLIB_ENHANCED_FACTS', facts);
      
      console.log('[Q-Lib] Extracted facts:', facts);
      return facts;
      
    } catch (error) {
      console.error('[Q-Lib] Extraction error:', error);
      memoryTracer.track('QLIB_EXTRACT_ERROR', { error: error.message, stack: error.stack });
      return this.fallbackExtraction(text);
    }
  }

  // Parse LLM response with multiple strategies
  async parseExtractedFacts(response) {
    // Strategy 1: Direct JSON parse
    try {
      const parsed = JSON.parse(response);
      memoryTracer.track('QLIB_PARSE_SUCCESS', { strategy: 'direct', result: parsed });
      return parsed;
    } catch (e) {
      memoryTracer.track('QLIB_PARSE_FAIL', { strategy: 'direct', error: e.message });
      
      // Strategy 2: Extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          memoryTracer.track('QLIB_PARSE_SUCCESS', { strategy: 'markdown', result: parsed });
          return parsed;
        } catch (e2) {
          memoryTracer.track('QLIB_PARSE_FAIL', { strategy: 'markdown', error: e2.message });
        }
      }
      
      // Strategy 3: Find any JSON-like structure
      const objectMatch = response.match(/\{[^{}]*\}/);
      if (objectMatch) {
        try {
          const parsed = JSON.parse(objectMatch[0]);
          memoryTracer.track('QLIB_PARSE_SUCCESS', { strategy: 'regex', result: parsed });
          return parsed;
        } catch (e3) {
          memoryTracer.track('QLIB_PARSE_FAIL', { strategy: 'regex', error: e3.message });
        }
      }
      
      // Strategy 4: Return empty structure
      memoryTracer.track('QLIB_PARSE_FALLBACK', { response });
      return {
        entities: [],
        actions: [],
        types: [],
        specifics: [],
        temporal: []
      };
    }
  }

  // Enhance extracted facts with pattern matching
  enhanceWithPatterns(facts, text) {
    const enhanced = { ...facts };
    const lower = text.toLowerCase();
    
    // Action patterns
    const actionPatterns = {
      'list': ['list', 'show all', 'display all'],
      'show': ['show', 'display', 'view'],
      'find': ['find', 'search', 'locate'],
      'get': ['get', 'fetch', 'retrieve'],
      'open': ['open', 'load'],
      'summarize': ['summarize', 'summary', 'overview']
    };
    
    for (const [action, patterns] of Object.entries(actionPatterns)) {
      if (patterns.some(p => lower.includes(p)) && !enhanced.actions.includes(action)) {
        enhanced.actions.push(action);
      }
    }
    
    // Type patterns with plurals
    const typePatterns = [
      'client', 'clients',
      'project', 'projects',
      'recipe', 'recipes',
      'file', 'files',
      'note', 'notes',
      'conversation', 'conversations'
    ];
    
    typePatterns.forEach(type => {
      if (lower.includes(type) && !enhanced.types.includes(type)) {
        enhanced.types.push(type.replace(/s$/, '')); // Store singular form
      }
    });
    
    // Extract quoted strings as specifics
    const quotedMatches = text.match(/"([^"]+)"/g);
    if (quotedMatches) {
      quotedMatches.forEach(match => {
        const specific = match.replace(/"/g, '');
        if (!enhanced.specifics.includes(specific)) {
          enhanced.specifics.push(specific);
        }
      });
    }
    
    // Temporal patterns
    const temporalPatterns = [
      'today', 'yesterday', 'tomorrow',
      'this week', 'last week', 'next week',
      'this month', 'last month',
      'recently', 'latest'
    ];
    
    temporalPatterns.forEach(temporal => {
      if (lower.includes(temporal) && !enhanced.temporal.includes(temporal)) {
        enhanced.temporal.push(temporal);
      }
    });
    
    return enhanced;
  }

  // Fallback extraction using pure patterns
  fallbackExtraction(text) {
    console.log('[Q-Lib] Using fallback extraction');
    return this.enhanceWithPatterns({
      entities: [],
      actions: [],
      types: [],
      specifics: [],
      temporal: []
    }, text);
  }

  // Unified Ollama API call
  async callOllamaAPI(prompt, model = null, options = {}) {
    const selectedModel = model || this.model;
    memoryTracer.track('QLIB_OLLAMA_CALL', { model: selectedModel, options });
    
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          prompt: prompt,
          stream: false,
          temperature: options.temperature || 0.1,
          max_tokens: options.maxTokens || 500,
          ...options
        })
      });
      
      if (!response.ok) {
        const error = `Ollama API error: ${response.statusText}`;
        memoryTracer.track('QLIB_OLLAMA_ERROR', { error, status: response.status });
        throw new Error(error);
      }
      
      const data = await response.json();
      memoryTracer.track('QLIB_OLLAMA_SUCCESS', { 
        model: selectedModel,
        responseLength: data.response?.length 
      });
      return data.response || '';
    } catch (error) {
      console.error('[Q-Lib] Ollama API call failed:', error);
      memoryTracer.track('QLIB_OLLAMA_EXCEPTION', { 
        error: error.message,
        model: selectedModel 
      });
      throw error;
    }
  }

  // Folder summarization with category awareness
  async summarize({ mode = 'summarize', objective, files, folder }) {
    const category = this.categoryMap?.[folder.toLowerCase()] || 'items';
    console.log(`[Q-Lib] Summarizing ${files.length} ${category}s in ${folder}`);
    
    const prompt = this.buildSummaryPrompt({ 
      mode, 
      objective, 
      folder, 
      files,
      category 
    });
    
    const response = await this.callOllamaAPI(
      this.formatPromptForGenerate(prompt),
      this.model,
      { temperature: 0.3, maxTokens: 1000 }
    );
    
    return {
      summary: response || '[No summary generated]',
      sources: files.map(f => f.file),
      metadata: { 
        folder, 
        category,
        fileCount: files.length 
      }
    };
  }

  // Convert chat format to generate format
  formatPromptForGenerate(chatPrompt) {
    const messages = chatPrompt.messages || [];
    let formatted = '';
    
    messages.forEach(msg => {
      if (msg.role === 'system') {
        formatted += `System: ${msg.content}\n\n`;
      } else if (msg.role === 'user') {
        formatted += `User: ${msg.content}\n\n`;
      }
    });
    
    formatted += 'Assistant:';
    return formatted;
  }

  // Build summary prompt with category context
  buildSummaryPrompt({ mode, objective, folder, files, category }) {
    const joinedFiles = files.slice(0, 10).map(f => {
      const title = this.extractTitle(f.content) || path.basename(f.file, '.md');
      const preview = f.content.substring(0, 500).replace(/\n+/g, ' ');
      return `### ${title}\n${preview}...`;
    }).join('\n\n');
    
    return {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are Q-Lib, a vault summarizer. 
Mode: ${mode}
Category: Each file represents one ${category}.
Objective: ${objective || 'Provide a concise overview'}

Instructions:
- List the main ${category}s found
- Note any patterns or relationships
- Flag duplicates if present
- Be concise and factual
- Output will be used by another AI`
        },
        {
          role: 'user',
          content: `Folder: ${folder}\nFiles (${files.length} total, showing first 10):\n\n${joinedFiles}`
        }
      ]
    };
  }

  // Search vault with enhanced filtering
  async searchVault(query, options = {}) {
    const {
      includeFolders = [],
      excludeFolders = ['conversations', '.obsidian', '.trash'],
      includeEcho = false,
      limit = 10
    } = options;
    
    memoryTracer.track('QLIB_SEARCH_START', { query, options });
    
    // Extract facts from query
    const facts = await this.extractFacts(query);
    memoryTracer.track('QLIB_SEARCH_FACTS', facts);
    
    // Determine target folders based on extracted types
    let targetFolders = includeFolders;
    
    // Ensure facts.types is an array (handle string case)
    const typesArray = Array.isArray(facts.types) ? facts.types : [facts.types].filter(Boolean);
    
    if (typesArray.length > 0 && targetFolders.length === 0) {
      targetFolders = typesArray.flatMap(type => {
        // Map type to folder name
        const folderMap = {
          'client': 'clients',
          'project': 'projects',
          'recipe': ['recipes', 'Foods', 'foods'], // Support multiple recipe folders
          'conversation': 'echo'
        };
        const mapped = folderMap[type];
        if (Array.isArray(mapped)) {
          return mapped; // Return array for multiple possible folders
        }
        return mapped || type + 's';
      });
    }
    
    memoryTracer.track('QLIB_TARGET_FOLDERS', { targetFolders });
    
    // Filter index based on criteria
    if (!this.index || !Array.isArray(this.index)) {
      console.warn('[Q-lib] Index not available, returning empty results');
      return { query, facts, results: [], targetFolders, excludeFolders };
    }
    
    const results = this.index
      .filter(item => {
        // Folder filtering
        if (targetFolders.length > 0 && !targetFolders.includes(item.folder)) {
          return false;
        }
        if (excludeFolders.includes(item.folder) && !includeEcho) {
          return false;
        }
        
        // Specific file matching
        if (facts.specifics.length > 0) {
          const fileName = path.basename(item.file, '.md').toLowerCase();
          return facts.specifics.some(s => fileName.includes(s.toLowerCase()));
        }
        
        // Entity matching
        if (facts.entities.length > 0) {
          const title = (item.title || '').toLowerCase();
          return facts.entities.some(e => title.includes(e.toLowerCase()));
        }
        
        return true;
      })
      .slice(0, limit);
    
    const searchResults = {
      query,
      facts,
      results,
      targetFolders,
      excludeFolders: includeEcho ? excludeFolders.filter(f => f !== 'echo') : excludeFolders
    };
    
    memoryTracer.track('QLIB_SEARCH_RESULTS', {
      resultCount: results.length,
      folders: [...new Set(results.map(r => r.folder))]
    });
    
    return searchResults;
  }
}

// Singleton initializer
async function getQlibInstance(vaultPath = null) {
  if (!qlibInstance) {
    vaultPath = vaultPath || getVaultPath();
    if (!vaultPath || !vaultExists(vaultPath)) {
      throw new Error('[Q-LIB] No valid vault path found.');
    }

    qlibInstance = new QLibInterface(vaultPath);
    await qlibInstance.forceVaultScan();
    console.log('[Q-LIB] Singleton initialized with vault:', vaultPath);
  }

  return qlibInstance;
}

module.exports = { QLibInterface, getQlibInstance };