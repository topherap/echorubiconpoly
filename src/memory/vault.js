// src/memory/vault.js
const path = require('path');
const { MemoryCapsule } = require('./capsule');

class MemoryVaultManager {
  constructor(vaultManager) {
    this.vaultManager = vaultManager; // Use existing vault manager
    this.memoryPath = '.echo/memory';
    this.capsulesPath = '.echo/capsules'; // Updated to new structure
  }

    // Save a memory capsule with project-based organization
  async saveCapsule(capsule) {
    console.log('[DEBUG] saveCapsule called with:', capsule.id);
    
    // Detect project from current context or capsule content
    const project = this.detectProject(capsule);
    console.log('[DEBUG] Detected project:', project);
    
    let relativePath;

    // If capsule ID starts with "memory-" save to misc folder (special/system capsules)
    if (capsule.id.startsWith('memory-')) {
      relativePath = path.join(this.capsulesPath, 'misc', `${capsule.id}.json`);
    }
    // Save to project-specific folder
    else {
      relativePath = path.join(this.capsulesPath, project, `${capsule.id}.json`);
    }

    console.log('[DEBUG] Writing capsule to:', relativePath);
    
    try {
      // Use filesystem directly since writeFile method doesn't exist
      const fs = require('fs/promises');
      const path = require('path');
      
      // Get absolute path
      const vaultPath = this.vaultManager.vaultPath || this.vaultManager.store?.vaultPath;
      const absolutePath = path.join(vaultPath, relativePath);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      
      // Write file
      await fs.writeFile(absolutePath, JSON.stringify(capsule.toJSON ? capsule.toJSON() : capsule, null, 2), 'utf8');
      console.log('[DEBUG] Capsule write successful to:', absolutePath);
      return { path: relativePath };
    } catch (error) {
      console.error('[DEBUG] Capsule write failed:', error);
      throw error;
    }
  }

  // Detect project from capsule content or current context
  detectProject(capsule) {
    // Check if capsule has project metadata
    if (capsule.project) {
      return capsule.project;
    }
    
    // Check for client-related content
    if (this.containsClientInfo(capsule)) {
      return 'clients';
    }
    
    // Check for food/recipe content
    if (this.containsFoodInfo(capsule)) {
      return 'food';
    }
    
    // Check for conversation patterns
    if (this.isOpenChatConversation(capsule)) {
      return 'openchat';
    }
    
    // Default to misc
    return 'misc';
  }

  // Helper methods for content detection
  containsClientInfo(capsule) {
    const content = JSON.stringify(capsule).toLowerCase();
    return content.includes('client') || content.includes('timeshare') || content.includes('maintenance fee');
  }

  containsFoodInfo(capsule) {
    const content = JSON.stringify(capsule).toLowerCase();
    return content.includes('recipe') || content.includes('ingredient') || content.includes('cooking') || content.includes('food');
  }

  isOpenChatConversation(capsule) {
    // Default conversation type
    return !this.containsClientInfo(capsule) && !this.containsFoodInfo(capsule);
  }

  // Load capsules using existing vault infrastructure
  async loadCapsules(options = {}) {
    const { startDate, endDate, type } = options;
    const capsules = [];
    
    try {
      // Recursively find all JSON files in capsules directory
      const findJsonFiles = async (dir) => {
        const files = await this.vaultManager.listFiles(dir);
        
        for (const file of files || []) {
          const fullPath = path.join(dir, file);
          
          // If it's a JSON file, load it
          if (file.endsWith('.json')) {
            try {
              const content = await this.vaultManager.readFile(fullPath);
              const capsuleData = JSON.parse(content);
              capsules.push(new MemoryCapsule(capsuleData));
            } catch (e) {
              console.error('[DEBUG] Error loading capsule:', fullPath, e);
            }
          }
          // If it's a directory, search it too
          else if (!file.includes('.')) {
            await findJsonFiles(fullPath);
          }
        }
      };
      
      // Start search from capsules root
     return capsules.filter(capsule => {
  if (
    !capsule ||
    typeof capsule !== 'object' ||
    !capsule.timestamp ||
    isNaN(new Date(capsule.timestamp))
  ) return false;

  if (startDate && new Date(capsule.timestamp) < startDate) return false;
  if (endDate && new Date(capsule.timestamp) > endDate) return false;
  if (type && capsule.type !== type) return false;
  return true;
});

      
    } catch (error) {
      console.error('[DEBUG] Error loading capsules:', error);
      return [];
    }
  }

  // Create conversation note using existing vault methods
  async createConversationNote(capsule) {
    const date = new Date(capsule.timestamp);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    const note = {
      title: `Chat - ${dateStr} ${timeStr}`,
      content: this.formatConversationNote(capsule),
      tags: ['conversation', ...(capsule.tags || [])],
      folder: 'conversations'
    };
    
    // Use existing vault manager's note creation
    return await this.vaultManager.createNote(note);
  }

  formatConversationNote(capsule) {
    let content = '';
    
    if (capsule.messages && capsule.messages.length > 0) {
      capsule.messages.forEach(msg => {
        content += `## ${msg.role}\n${msg.content}\n\n`;
      });
    }
    
    if (capsule.summary) {
      content += `## Summary\n${capsule.summary}\n\n`;
    }
    
    content += `---\n`;
    content += `*Memory Capsule: ${capsule.id}*\n`;
    content += `*Created: ${new Date(capsule.timestamp).toLocaleString()}*`;
    
    return content;
  }

  // Quick search through memory capsules
  async searchMemories(query) {
    const capsules = await this.loadCapsules();
    const queryLower = query.toLowerCase();
    
    // Score and sort by relevance
    return capsules
      .map(capsule => {
        const content = JSON.stringify(capsule).toLowerCase();
        const score = this.calculateRelevance(content, queryLower);
        return { capsule, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.capsule);
  }

  calculateRelevance(content, query) {
    let score = 0;
    
    // Exact match
    if (content.includes(query)) {
      score += 10;
    }
    
    // Word matches
    const words = query.split(/\s+/);
    words.forEach(word => {
      if (content.includes(word)) {
        score += 2;
      }
    });
    
    return score;
  }

  // Get memory statistics
  async getStats() {
    const capsules = await this.loadCapsules();
    
    return {
      totalMemories: capsules.length,
      types: this.countByType(capsules),
      oldest: this.findOldest(capsules),
      newest: this.findNewest(capsules),
      totalTokens: this.estimateTotalTokens(capsules)
    };
  }

  countByType(capsules) {
    return capsules.reduce((acc, cap) => {
      acc[cap.type] = (acc[cap.type] || 0) + 1;
      return acc;
    }, {});
  }

  findOldest(capsules) {
    if (!capsules.length) return null;
    return capsules.reduce((oldest, cap) => 
      new Date(cap.timestamp) < new Date(oldest.timestamp) ? cap : oldest
    );
  }

  findNewest(capsules) {
    if (!capsules.length) return null;
    return capsules.reduce((newest, cap) => 
      new Date(cap.timestamp) > new Date(newest.timestamp) ? cap : newest
    );
  }

  estimateTotalTokens(capsules) {
    return capsules.reduce((total, cap) => total + (cap.tokenCount || 0), 0);
  }

  // Add intent detection
  //Understanding what the user means"Wernicke's Area (Language Comprehension)

  // "Is this a question? A command? A memory to store?"
  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Edit/Append patterns
    const editPatterns = [
      /^remember that (.+) (likes?|prefers?|wants?|needs?|has|is)/i,
      /^update (.+):/i,
      /^add to (.+):/i,
      /^note that (.+) about (.+)/i,
      /(.+) also (likes?|prefers?|has|is)/i
    ];
    
    // Query patterns
    const queryPatterns = [
      /^(who|what|where|when|why|how|tell me about|show me|find|search|list)/i,
      /\?$/, // Ends with question mark
      /(is|are|was|were|has|have|had)\s+\w+\?/i
    ];
    
    // Create patterns
    const createPatterns = [
      /^(create|add|make|new) (client|person|folder|project|category)[:s]?\s+(.+)/i,
      /^save (.+) as (client|person)/i
    ];
    
    // Check patterns in order of specificity
    for (const pattern of editPatterns) {
      const match = message.match(pattern);
      if (match) {
        let subject = null;
        if (match[1]) subject = match[1].trim();
        if (match[2] && pattern.toString().includes('about')) subject = match[2].trim();
        
        return {
          type: 'edit',
          subject: subject,
          content: message
        };
      }
    }
    
    for (const pattern of createPatterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          type: 'create',
          category: match[2] || match[1],
          name: match[3] || match[1]
        };
      }
    }
    
    for (const pattern of queryPatterns) {
      if (pattern.test(message)) {
        return {
          type: 'query',
          query: message
        };
      }
    }
    
    // Default to query
    return {
      type: 'query',
      query: message
    };
  }
}

module.exports = { MemoryVaultManager };
