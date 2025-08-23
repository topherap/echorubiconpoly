const LoRAManager = require('./LoRAManager');

class ModelInterface {
  constructor(apiCall, useAPI, selectedAPIModel, selectedLocalModel) {
    // If apiCall not provided, use built-in fetch
    this.apiCall = apiCall || this.defaultApiCall.bind(this);
    this.useAPI = useAPI || false;
    this.selectedAPIModel = selectedAPIModel || 'gpt-4o-mini';
    this.selectedLocalModel = selectedLocalModel || 'llama3.2:3b-instruct-fp16';
    this.baseURL = 'http://localhost:49200';  // Express backend port
    
    // Add LoRA manager
    this.loraManager = new LoRAManager();
  }

  async defaultApiCall(endpoint, options) {
    try {
      const url = this.baseURL + endpoint;
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.error('API call failed:', error);
      // Return a mock response for testing
      return {
        ok: true,
        json: async () => ({ reply: "Mock response: API server not running. Your input was received." })
      };
    }
  }

  async generate(options) {
    const endpoint = this.useAPI ? '/voice' : '/local';
    const selectedModel = options.model || (this.useAPI ? this.selectedAPIModel : this.selectedLocalModel);
    console.log('[ModelInterface] Selected model:', selectedModel);
    console.log('[ModelInterface] Is model compatible:', this.loraManager.isModelCompatible(selectedModel));
    
    // Handle both single message and multi-message formats
    let prompt, system;
    if (options.messages.length === 1) {
      // Single message - use it as the prompt
      prompt = options.messages[0].content;
      const aiName = localStorage.getItem('echo_ai_name') || 'Q';
      const userName = localStorage.getItem('echo_user_name') || 'User';
      system = `You are ${aiName}, a helpful AI assistant working with ${userName}.`;
    } else if (options.messages.length >= 2) {
      // Multiple messages - use standard format
      system = options.messages[0].content;
      prompt = options.messages[1].content;
    } else {
      throw new Error('No messages provided to generate');
    }

    // Check if LoRA should be applied
    if (this.loraManager.isModelCompatible(selectedModel)) {
      const loraConfig = this.loraManager.getLoRAConfig();
      if (loraConfig) {
        console.log('[ModelInterface] Applying Sovereign Spine LoRA enhancement');
        // Prepend LoRA context to system prompt
        system = loraConfig.prompt_template + system;
      }
    }

    const response = await this.apiCall(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        model: selectedModel,
        systemPrompt: system
      })
    });

    if (!response.ok) {
      throw new Error('HTTP error ' + response.status);
    }

    const data = await response.json();
    return data.reply;
  }
}

module.exports = ModelInterface;