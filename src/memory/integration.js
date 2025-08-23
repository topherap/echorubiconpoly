// src/memory/integration.js
const { MemorySystem } = require('./index');
const { MemoryVaultManager } = require('./vault');
const { VaultManager } = require('../vault/VaultManager'); // Your existing vault manager

class MemoryIntegration {
  constructor(config) {
    this.config = config;
    this.memorySystem = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return this.memorySystem;

    try {
      // Initialize your existing vault manager
      const vaultManager = new VaultManager(this.config.vaultPath);
      await vaultManager.initialize();

      // Create memory-specific vault manager
      const memoryVaultManager = new MemoryVaultManager(vaultManager);

      // Create memory system
      this.memorySystem = new MemorySystem(memoryVaultManager, {
        maxContextTokens: this.config.maxContextTokens || 2000
      });

      this.initialized = true;
      console.log('[MemoryIntegration] Initialized successfully');
      return this.memorySystem;

    } catch (error) {
      console.error('[MemoryIntegration] Initialization failed:', error);
      throw error;
    }
  }

  // Convenience method for chat handling
  async handleChatTurn(userInput, aiResponse, metadata = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Process the conversation
    const capsule = await this.memorySystem.processConversation(
      userInput,
      aiResponse,
      metadata
    );

    // Build context for next turn
    const context = await this.memorySystem.buildContextForInput(userInput);

    return {
      capsule,
      context,
      sessionId: this.memorySystem.sessionId
    };
  }

  // Get memory system instance
  getMemorySystem() {
    if (!this.initialized) {
      throw new Error('Memory system not initialized. Call initialize() first.');
    }
    return this.memorySystem;
  }

  // Quick search
  async search(query) {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.memorySystem.search(query);
  }

  // Get stats
  async getStats() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.memorySystem.getStats();
  }
}

// Singleton instance
let memoryIntegrationInstance = null;

function getMemoryIntegration(config) {
  if (!memoryIntegrationInstance) {
    memoryIntegrationInstance = new MemoryIntegration(config);
  }
  return memoryIntegrationInstance;
}

module.exports = {
  MemoryIntegration,
  getMemoryIntegration
};