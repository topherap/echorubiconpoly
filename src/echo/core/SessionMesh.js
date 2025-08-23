// SessionMesh.js - Runtime conductor with fixed imports
import { AIManager } from './aiManager.js'; // Named export
import { searchCapsules, getAllNotes } from '../memory/capsuleRetriever.js'; // Added getAllNotes
import { ContextInjector } from '../memory/ContextInjector.js';

export class SessionMesh {
  constructor(config) {
    this.config = config;
    this.aiManager = new AIManager(config);
    this.injector = new ContextInjector();
  }

  async handleInput(role, userInput) {
    const memory = searchCapsules({
      vaultPath: this.config.vaultPath,
      agent: role,
      tags: [`#${role}`]
    });

    const promptData = this.injector.buildPrompt(
      memory,
      userInput,
      [], // recent messages
      role
    );

    const response = await this.aiManager.delegate(role, userInput);

    return {
      role,
      userInput,
      contextPrompt: promptData.systemPrompt,
      response,
      timestamp: new Date().toISOString()
    };
  }

  async runDialogue(role, inputs = []) {
    const log = [];
    for (const input of inputs) {
      const result = await this.handleInput(role, input);
      log.push(result);
    }
    return log;
  }

  /**
   * Hard forensic audit: count notes matching a concept (like recipes, projects, symptoms)
   * Returns { count, ids, examples }
   */
  async countByConcept(concept) {
    const synonyms = this.getSynonymsForConcept(concept);
    const notes = await getAllNotes(this.config.vaultPath); // or however your getAllNotes works

    const matches = [];

    for (const note of notes) {
      const text = note.content.toLowerCase();
      if (synonyms.some(word => text.includes(word))) {
        matches.push({
          id: note.id,
          snippet: text.slice(0, 120).replace(/\s+/g, ' ') + '...'
        });
      }
    }

    return {
      count: matches.length,
      ids: matches.map(m => m.id),
      examples: matches.slice(0, 5).map(m => m.snippet)
    };
  }

  getSynonymsForConcept(concept) {
    switch (concept.toLowerCase()) {
      case 'recipe':
        return ['recipe', 'cook', 'cooking', 'dish', 'meal', 'ingredients', 'broth', 'ice cream'];
      case 'project':
        return ['project', 'prototype', 'draft', 'build', 'scaffold'];
      case 'symptom':
        return ['symptom', 'rash', 'itch', 'flare', 'reaction'];
      default:
        return [concept.toLowerCase()];
    }
  }
}
