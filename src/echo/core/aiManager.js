// aiManager.js - Unified AI agent manager for core directory
import { verifySpine } from './SpineGuardian.js';
import { WriterEngine } from '../engines/WriterEngine.js';
import { CodeEngine } from '../engines/CodeEngine.js';
import { BusinessEngine } from '../engines/BusinessEngine.js';
import { GeneralEngine } from '../engines/GeneralEngine.js';
import path from 'path';
import fs from 'fs';

// Registry of role to engine mapping
const roleEngineMap = {
  writer: WriterEngine,
  code: CodeEngine,
  coder: CodeEngine, // alias
  business: BusinessEngine,
  strategist: BusinessEngine, // alias
  general: GeneralEngine,
  default: GeneralEngine
};

// Load user-defined personality file (simple text)
function loadPersonality(name) {
  const personalityPath = path.resolve(`./memory/agents/${name}/persona.txt`);
  if (!fs.existsSync(personalityPath)) return '';
  return fs.readFileSync(personalityPath, 'utf8');
}

/**
 * Main AI Manager class
 */
export class AIManager {
  constructor(config) {
    this.config = config;
    this.engines = {};
    this.initializeEngines();
  }

  initializeEngines() {
    // Verify spine before loading any engines
    if (!verifySpine()) {
      throw new Error('[AIManager] SPINE verification failed. Cannot initialize engines.');
    }

    // Initialize all available engines
    for (const [role, EngineClass] of Object.entries(roleEngineMap)) {
      try {
        this.engines[role] = new EngineClass(this.config);
      } catch (err) {
        console.error(`[AIManager] Failed to initialize ${role} engine:`, err.message);
      }
    }
  }

  getEngine(role) {
    return this.engines[role] || this.engines.general || this.engines.default;
  }

  async delegate(role, input) {
    const engine = this.getEngine(role);
    
    // Handle different input formats
    if (typeof input === 'string') {
      return engine.respond(input);
    } else if (Array.isArray(input)) {
      // Handle message array format
      const userMessage = input.find(m => m.role === 'user')?.content || '';
      return engine.respond(userMessage);
    }
    
    // Role-specific methods
    switch (role) {
      case 'writer':
        return engine.generateCreativeOutput(input);
      case 'coder':
      case 'code':
        return engine.writeFunction(input);
      case 'strategist':
      case 'business':
        return engine.draftStrategy(input);
      case 'general':
      default:
        return engine.respond(input);
    }
  }

  listEngines() {
    return Object.keys(this.engines);
  }
}

/**
 * Legacy function for compatibility
 * @param {Object} config - Contains name, role, vaultPath, optional personality
 * @returns {object} AI instance (engine)
 */
export function loadAgent({ name, role, vaultPath }) {
  if (!verifySpine()) {
    throw new Error(`[aiManager] SPINE verification failed. AI "${name}" was blocked.`);
  }

  const EngineClass = roleEngineMap[role] || roleEngineMap.general;
  if (!EngineClass) {
    throw new Error(`[aiManager] No engine registered for role: ${role}`);
  }

  const personality = loadPersonality(name);

  const agent = new EngineClass({
    name,
    role,
    personality,
    vaultPath,
  });

  return agent;
}

// Default export
export default AIManager;