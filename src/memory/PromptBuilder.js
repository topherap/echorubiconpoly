const fs = require('fs/promises');
const path = require('path');
const { ContextBuilder } = require('./context');
const { injectQLibFacts } = require('./injectQLibFacts');

class PromptBuilder {
  constructor(config = {}) {
    this.config = config;
    this.maxContextLength = config.maxContextLength || 8000; // Token limit management
  }

  async buildSystemPrompt(identity, userInput, memories, vaultResults) {
    // Build the system prompt that Q actually uses
    const currentProject = this.config.currentProject || null;
    
    const systemPrompt = `You are ${identity.ai.name}, an AI assistant in Echo Rubicon with perfect memory.
Your role: ${identity.ai.role || 'Echo Rubicon AI Assistant'}
User's name: ${identity.user.name}

CRITICAL RULES:
1. NEVER LIE
2. You are ${currentProject ? `currently working within the "${currentProject}" project` : 'not in any specific project context'}
3. Distinguish between personal requests ("my recipes", "my notes", "my clients") and general requests
4. For PERSONAL requests (containing "my", "our", "I have", etc.):
   - You MUST share all content found in your provided context/memories
   - This is the user's own data - always provide it when asked
   - ${currentProject ? `Prioritize content from the "${currentProject}" project` : 'Search across all available content'}
   - If nothing found, say "I don't have any of your [thing] ${currentProject ? `in the ${currentProject} project` : 'in my memory'}"
   - NEVER make up personal content
5. For GENERAL requests ("what's a good recipe", "how to cook", etc.):
   - You may use general knowledge and be creative
   - Offer to help create new content
   - Suggest ideas freely

Examples:
- "What are my recipes?" → Only list recipes found in ${currentProject ? `the ${currentProject} project` : 'memory/vault'}
- "Give me a recipe" → Can suggest general recipes from knowledge
- "Show my client list" → Only show actual stored clients ${currentProject ? `in ${currentProject}` : ''}
- "What makes a good client?" → Can discuss general principles

When you have context, cite it naturally. When you don't, be honest about it.`;

    return systemPrompt;
  }

  buildMemoryContext(memories, vaultResults) {
    const sections = [];
    
    // Add memory timeline header
    sections.push("Here is relevant context from your memory:\n\n\n\n---\n# Threaded Memory Timeline");
    
    // Format memories
    if (memories && memories.length > 0) {
      sections.push("\nRecent relevant memories:\n");
      
      memories.forEach(memory => {
        const date = new Date(memory.timestamp).toLocaleDateString();
        const type = memory.type || memory.metadata?.type || 'general';
        
        // Extract meaningful content from capsule
        let content = '';
        if (memory.metadata?.recipeName) {
          content = `Recipe: ${memory.metadata.recipeName}`;
        } else if (memory.summary) {
          content = memory.summary;
        } else if (memory.content) {
          // Take first 200 chars if content is too long
          content = memory.content.substring(0, 200);
        }
        
        // Add metadata block if present
        if (memory.metadata) {
          content += `. \`\`\`metadata\n`;
          if (memory.metadata.When) content += `## When\n${memory.metadata.When}\n`;
          if (memory.metadata.What) content += `\n## What\n${memory.metadata.What}\n`;
          if (memory.metadata.Why) content += `\n## Why\n${memory.metadata.Why}\n`;
          if (memory.metadata.Folder) content += `\n## Folder\n${memory.metadata.Folder}\n`;
          if (memory.metadata.Tags) content += `\n## Tags\n${memory.metadata.Tags.map(t => `- ${t}`).join('\n')}\n`;
          content += `\`\`\`\n`;
        }
        
        // Format as shown in the logs
        sections.push(`[${date}] [${type}] ${content}...\n`);
      });
    }
    
    return sections.join('\n');
  }

  buildVaultContext(vaultResults) {
    if (!vaultResults || vaultResults.length === 0) return '';
    
    const sections = ["Vault search results:\n"];
    
    vaultResults.forEach(result => {
      const fileName = result.metadata?.fileName || 'Unknown file';
      // Take first 300 chars of content
      const content = (result.content || result.summary || '').substring(0, 300);
      
      sections.push(`File: ${fileName}\n${content}\n\n---\n`);
    });
    
    return sections.join('\n');
  }

  async buildPrompt(identity, userInput, contextData = {}, selectedModel = '', setStatus = null) {
    const messages = [];

    // 🧠 Build dynamic context (calls ContextBuilder + memory system)
    const contextBuilder = new ContextBuilder();
    const builtContext = await contextBuilder.buildContext(userInput);

    // Inject Q-Lib facts into vault context
    const enhancedVault = await injectQLibFacts({
      voicePrompt: userInput,
      qlibKeyword: userInput,
      messages: contextData.messages || [],
      vaultContext: builtContext.vault || '',
      selectedModel,
      modelIdentities: identity,
      setStatus
    });

    // Replace builtContext.vault with enhanced context
    builtContext.vault = [{ content: enhancedVault }];

    // 🔧 System prompt (core identity + fallback rules)
    messages.push({
      role: "system",
      content: this.buildSystemPrompt(identity, userInput, builtContext.memory, builtContext.vault)
    });

    // 🧩 Inject memory context
    if (builtContext.memory && builtContext.memory.length > 0) {
      messages.push({
        role: "system",
        content: this.buildMemoryContext(builtContext.memory, builtContext.vault)
      });
    }

    // 📚 Inject vault (file-level) context
    if (builtContext.vault && builtContext.vault.length > 0) {
      messages.push({
        role: "system",
        content: this.buildVaultContext(builtContext.vault)
      });
    }

    // 💬 Add user message
    messages.push({
      role: "user",
      content: userInput
    });

    return messages;
  }

  // Allocate search priority based on query type
  allocateByQueryType(query) {
    const lowerQuery = query.toLowerCase();
    
    // Prioritize vault for listing/finding queries
    if (lowerQuery.includes('list') || lowerQuery.includes('show') || lowerQuery.includes('what are')) {
      return { vault: 0.7, memory: 0.3 };
    }
    
    // Prioritize memory for temporal queries
    if (lowerQuery.includes('remember') || lowerQuery.includes('last') || lowerQuery.includes('before')) {
      return { vault: 0.2, memory: 0.8 };
    }
    
    // Balanced for general queries
    return { vault: 0.5, memory: 0.5 };
  }
}

module.exports = PromptBuilder;