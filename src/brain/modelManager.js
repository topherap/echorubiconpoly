/**
 * ModelManager - Manages communication with different AI models
 * Handles Ollama API integration, response formatting, and fallback logic
 */

const fs = require('fs').promises;
const path = require('path');

class ModelManager {
  constructor() {
    this.config = require('./brainConfig.json');
    this.models = this.config.models;
    this.ollama = null;
    this.modelMemory = new Map(); // Store last 5 responses per model
    this.responseStats = new Map(); // Track response times and success rates
    
    this.initializeOllama();
    
    this.trace('model-manager', 'ModelManager initialized', {
      availableModels: Object.keys(this.models),
      ollamaLoaded: !!this.ollama
    });
  }

  /**
   * Initialize Ollama connection - look for existing Ollama integration
   */
  async initializeOllama() {
    try {
      // Try to find existing Ollama integration
      const possiblePaths = [
        path.join(__dirname, '../../lib/ollama.js'),
        path.join(__dirname, '../../src/ollama.js'),
        path.join(__dirname, '../QLib.js'), // Might have Ollama integration
        path.join(__dirname, '../../vendor/ollama.js')
      ];

      for (const ollamaPath of possiblePaths) {
        try {
          const ollamaModule = require(ollamaPath);
          if (ollamaModule && (ollamaModule.chat || ollamaModule.generate)) {
            this.ollama = ollamaModule;
            this.trace('model-manager', 'Found existing Ollama integration', { path: ollamaPath });
            break;
          }
        } catch (err) {
          // Path doesn't exist, continue
        }
      }

      // If no existing integration found, create basic Ollama client
      if (!this.ollama) {
        this.ollama = await this.createBasicOllamaClient();
      }
    } catch (err) {
      this.trace('model-manager', 'Failed to initialize Ollama', { error: err.message });
      this.ollama = null;
    }
  }

  /**
   * Create basic Ollama client using fetch
   */
  async createBasicOllamaClient() {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    
    return {
      chat: async (model, messages, options = {}) => {
        const response = await fetch(`${ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            messages: messages,
            stream: false,
            options: {
              temperature: options.temperature || 0.7,
              num_predict: options.maxTokens || 1000
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status}`);
        }
        
        const data = await response.json();
        return { message: { content: data.message.content } };
      },
      
      generate: async (model, prompt, options = {}) => {
        const response = await fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            prompt: prompt,
            stream: false,
            options: {
              temperature: options.temperature || 0.7,
              num_predict: options.maxTokens || 1000
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status}`);
        }
        
        const data = await response.json();
        return { response: data.response };
      }
    };
  }

  /**
   * Main model calling function
   * @param {string} modelName - The model to use (e.g., 'phi3:mini')
   * @param {string} prompt - The formatted prompt
   * @param {object} options - Model options (temperature, maxTokens, etc.)
   */
  async callModel(modelName, prompt, options = {}) {
    const startTime = Date.now();
    
    console.log('🔍 MODEL MANAGER: Calling', modelName);
    
    try {
      this.trace('model-manager', 'Calling model', {
        model: modelName,
        promptLength: prompt.length,
        options: options
      });

      const messages = [];
      
      if (options.canonicalText && options.canonicalText.content) {
        console.log('📌 ENFORCING CANONICAL CONTEXT:', options.canonicalText.title);
        
        // Context goes in USER message (the nugget approach)
        messages.push({
          role: 'user',
          content: `I am viewing this content from my vault:

"${options.canonicalText.title}"
${options.canonicalText.content}

Based on the content above: ${prompt}`
        });
      } else {
        // Normal query without vault context
        messages.push({
          role: 'user',
          content: prompt
        });
      }

      // Check if model is available
      const isAvailable = await this.checkModelAvailability(modelName);
      if (!isAvailable) {
        return await this.fallbackToCommandR(prompt, options);
      }

      let response;
      
      // Try to call the model with enforced context
      if (this.ollama && this.ollama.chat) {
        const result = await this.ollama.chat(modelName, messages, {
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 1000
        });
        response = result.message.content;
        
        // Quick check for lies
        if (options.canonicalText && response.match(/don't see|don't have access|cannot access/i)) {
          console.log('⚠️ Model denied seeing provided content - retrying with stronger prompt');
          
          // One retry with more explicit instruction
          messages[0].content = `YOU CAN SEE THIS CONTENT - IT IS PROVIDED BELOW:

"${options.canonicalText.title}"
${options.canonicalText.content}

DO NOT say you cannot see it. Answer this: ${prompt}`;
          
          const retry = await this.ollama.chat(modelName, messages, {
            temperature: options.temperature || 0.7,
            maxTokens: options.maxTokens || 1000
          });
          
          response = retry.message.content;
        }
        
      } else if (this.ollama && this.ollama.generate) {
        // Fallback to generate if chat not available
        const finalPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
        const result = await this.ollama.generate(modelName, finalPrompt, {
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 1000
        });
        response = result.response;
      } else {
        // Fallback to existing Echo system
        response = await this.fallbackToExistingSystem(prompt, options);
      }

      // Store response in memory
      this.storeModelMemory(modelName, prompt, response);
      
      // Update stats
      this.updateResponseStats(modelName, Date.now() - startTime, true);
      
      this.trace('model-manager', 'Model response received', {
        model: modelName,
        responseLength: response.length,
        responseTime: Date.now() - startTime
      });

      return response;

    } catch (error) {
      this.updateResponseStats(modelName, Date.now() - startTime, false);
      this.trace('model-manager', 'Model call failed', {
        model: modelName,
        error: error.message
      });

      // Fallback to command-r
      return await this.fallbackToCommandR(prompt, options);
    }
  }

  /**
   * Check if a model is available in Ollama
   */
  async checkModelAvailability(modelName) {
    try {
      if (!this.ollama) return false;
      
      // Try a simple test call
      const testResponse = await this.ollama.generate(modelName, 'test', { maxTokens: 1 });
      return !!testResponse;
    } catch (err) {
      return false;
    }
  }

  /**
   * Get model configuration
   */
  getModelConfig(modelName) {
    // Find brain that uses this model
    for (const [brain, config] of Object.entries(this.models)) {
      if (config.name === modelName) {
        return {
          brain: brain,
          ...config
        };
      }
    }
    return null;
  }

  /**
   * Format prompt for specific model/brain type
   */
  formatPromptForModel(brain, userQuery, context = {}) {
    const modelConfig = this.models[brain];
    
    if (!modelConfig) {
      return this.formatGenericPrompt(userQuery, context);
    }

    switch (brain) {
      case 'clerk':
        return this.formatClerkPrompt(userQuery, context, modelConfig);
      case 'reader':
        return this.formatReaderPrompt(userQuery, context, modelConfig);
      case 'analyst':
        return this.formatAnalystPrompt(userQuery, context, modelConfig);
      case 'conversationalist':
        return this.formatConversationalistPrompt(userQuery, context, modelConfig);
      default:
        return this.formatGenericPrompt(userQuery, context);
    }
  }

  /**
   * Format prompt for Clerk brain (lists, navigation)
   */
  formatClerkPrompt(userQuery, context, config) {
    let prompt = `You are a specialized assistant for handling lists and navigation tasks.\n\n`;
    
    // Add specialties context
    prompt += `Your specialties: ${config.specialties.join(', ')}\n\n`;
    
    // Add file content if available
    if (context.lastFileContent) {
      prompt += `Recent file context:\n${context.lastFileContent.content.substring(0, 500)}...\n\n`;
    }
    
    // Add conversation history if available
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const lastFew = context.conversationHistory.slice(-3);
      prompt += `Recent conversation:\n`;
      lastFew.forEach(msg => {
        prompt += `${msg.role}: ${msg.content.substring(0, 100)}\n`;
      });
      prompt += `\n`;
    }
    
    prompt += `Task: ${userQuery}\n\n`;
    prompt += `Instructions:\n`;
    prompt += `- Provide clear, numbered lists when appropriate\n`;
    prompt += `- Keep responses concise and well-organized\n`;
    prompt += `- For file selection, provide specific options\n`;
    prompt += `- Use bullet points or numbers for clarity\n\n`;
    prompt += `Response:`;

    return prompt;
  }

  /**
   * Format prompt for Reader brain (summarization, explanation)
   */
  formatReaderPrompt(userQuery, context, config) {
    let prompt = `You are a specialized assistant for reading, summarizing, and explaining content.\n\n`;
    
    // Add specialties context
    prompt += `Your specialties: ${config.specialties.join(', ')}\n\n`;
    
    // Add file content if available (this is crucial for Reader)
    if (context.lastFileContent) {
      prompt += `Content to analyze:\n`;
      prompt += `Filename: ${context.lastFileContent.fileName}\n`;
      prompt += `Content:\n${context.lastFileContent.content}\n\n`;
    }
    
    prompt += `User request: ${userQuery}\n\n`;
    prompt += `Instructions:\n`;
    prompt += `- Provide clear, comprehensive summaries\n`;
    prompt += `- Focus on key points and main themes\n`;
    prompt += `- Use structured format when helpful\n`;
    prompt += `- Explain complex concepts simply\n\n`;
    prompt += `Response:`;

    return prompt;
  }

  /**
   * Format prompt for Analyst brain (technical, code)
   */
  formatAnalystPrompt(userQuery, context, config) {
    let prompt = `You are a specialized technical analyst and code expert.\n\n`;
    
    // Add specialties context
    prompt += `Your specialties: ${config.specialties.join(', ')}\n\n`;
    
    // Add code context if available
    if (context.lastFileContent && this.isCodeFile(context.lastFileContent.fileName)) {
      prompt += `Code to analyze:\n`;
      prompt += `File: ${context.lastFileContent.fileName}\n`;
      prompt += `\`\`\`\n${context.lastFileContent.content}\n\`\`\`\n\n`;
    }
    
    prompt += `Technical query: ${userQuery}\n\n`;
    prompt += `Instructions:\n`;
    prompt += `- Provide technical, accurate analysis\n`;
    prompt += `- Include code examples when relevant\n`;
    prompt += `- Explain technical concepts clearly\n`;
    prompt += `- Focus on practical solutions\n\n`;
    prompt += `Response:`;

    return prompt;
  }

  /**
   * Format prompt for Conversationalist brain (general chat)
   */
  formatConversationalistPrompt(userQuery, context, config) {
    let prompt = `You are a friendly, conversational AI assistant.\n\n`;
    
    // Add personality context
    prompt += `Your role: Engaging conversation partner with empathy and creativity\n`;
    prompt += `Your specialties: ${config.specialties.join(', ')}\n\n`;
    
    // Add conversation history for continuity
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const lastFew = context.conversationHistory.slice(-5);
      prompt += `Conversation history:\n`;
      lastFew.forEach(msg => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
      prompt += `\n`;
    }
    
    prompt += `Current message: ${userQuery}\n\n`;
    prompt += `Instructions:\n`;
    prompt += `- Be warm, engaging, and personable\n`;
    prompt += `- Show empathy and understanding\n`;
    prompt += `- Be creative when appropriate\n`;
    prompt += `- Maintain conversation flow\n\n`;
    prompt += `Response:`;

    return prompt;
  }

  /**
   * Generic prompt formatter
   */
  formatGenericPrompt(userQuery, context) {
    let prompt = `User query: ${userQuery}\n\n`;
    
    if (context.lastFileContent) {
      prompt += `Context: ${context.lastFileContent.content.substring(0, 300)}...\n\n`;
    }
    
    prompt += `Please provide a helpful response.`;
    return prompt;
  }

  /**
   * Fallback to command-r model
   */
  async fallbackToCommandR(prompt, options) {
    this.trace('model-manager', 'Falling back to command-r');
    
    try {
      // Try to use existing system's command-r integration
      return await this.fallbackToExistingSystem(prompt, options);
    } catch (err) {
      // Last resort - return error message
      return `I apologize, but I'm having trouble connecting to the AI models. Please check that Ollama is running and the required models are installed.\n\nOriginal query: ${prompt.substring(0, 100)}...`;
    }
  }

  /**
   * Fallback to existing Echo system
   */
  async fallbackToExistingSystem(prompt, options) {
    // This would integrate with existing Echo Rubicon's model calling system
    // For now, return a placeholder that indicates we need integration
    this.trace('model-manager', 'Using existing system fallback');
    
    return `[ModelManager Integration Needed] This would call the existing Echo Rubicon model system with:\nPrompt: ${prompt.substring(0, 200)}...\nOptions: ${JSON.stringify(options)}`;
  }

  /**
   * Store model response in memory for context
   */
  storeModelMemory(modelName, prompt, response) {
    if (!this.modelMemory.has(modelName)) {
      this.modelMemory.set(modelName, []);
    }
    
    const memory = this.modelMemory.get(modelName);
    memory.push({
      timestamp: Date.now(),
      prompt: prompt.substring(0, 200),
      response: response.substring(0, 500)
    });
    
    // Keep only last 5 responses
    if (memory.length > 5) {
      memory.shift();
    }
  }

  /**
   * Update response statistics
   */
  updateResponseStats(modelName, responseTime, success) {
    if (!this.responseStats.has(modelName)) {
      this.responseStats.set(modelName, {
        totalCalls: 0,
        successfulCalls: 0,
        averageResponseTime: 0,
        lastUsed: null
      });
    }
    
    const stats = this.responseStats.get(modelName);
    stats.totalCalls++;
    if (success) stats.successfulCalls++;
    stats.averageResponseTime = (stats.averageResponseTime * (stats.totalCalls - 1) + responseTime) / stats.totalCalls;
    stats.lastUsed = Date.now();
  }

  /**
   * Get model statistics
   */
  getModelStats() {
    const stats = {};
    this.responseStats.forEach((stat, model) => {
      stats[model] = {
        ...stat,
        successRate: stat.totalCalls > 0 ? stat.successfulCalls / stat.totalCalls : 0
      };
    });
    return stats;
  }

  /**
   * Check if file is a code file
   */
  isCodeFile(fileName) {
    const codeExtensions = ['.js', '.py', '.java', '.cpp', '.c', '.php', '.rb', '.go', '.rs', '.ts', '.jsx', '.tsx'];
    return codeExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  /**
   * Switch between models (for load balancing or fallback)
   */
  async switchModel(fromModel, toModel) {
    this.trace('model-manager', 'Switching models', { from: fromModel, to: toModel });
    
    // Check if target model is available
    const isAvailable = await this.checkModelAvailability(toModel);
    return isAvailable;
  }

  /**
   * Trace logging helper
   */
  trace(category, message, data = {}) {
    if (global.trace) {
      global.trace(category, message, data);
    } else {
      console.log(`[${category.toUpperCase()}] ${message}`, data);
    }
  }
}

module.exports = ModelManager;