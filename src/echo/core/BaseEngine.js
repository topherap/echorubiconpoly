// BaseEngine.js - Base class for all AI engines
import { searchCapsules } from '../memory/capsuleRetriever.js';
import { ContextInjector } from '../memory/ContextInjector.js';
import { MemoryWriter } from '../memory/MemoryWriter.js';
import { ModelInterface } from '../memory/ModelInterface.js';
import { createAgentCapsule } from '../memory/capsule.js';
import path from 'path';
import fs from 'fs';

// Dynamically load vaultPath from config.json
let fallbackVaultPath = 'D:\\Obsidian Vault';

try {
  const configPath = path.resolve('config', 'config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(raw);
  if (config.vaultPath) {
    fallbackVaultPath = config.vaultPath;
  } else {
    console.warn('[BaseEngine] vaultPath missing in config.json');
  }
} catch (err) {
  console.error('[BaseEngine] Failed to load vault config:', err.message);
}

export class BaseEngine {
  constructor({ name, role, personality, vaultPath, apiCall, useAPI = false, apiModel = 'gpt-4', localModel = 'claude' }) {
    this.name = name;
    this.role = role;
    this.personality = personality;
    this.vaultPath = vaultPath || fallbackVaultPath;

    this.context = new ContextInjector();
    this.writer = new MemoryWriter(vaultPath);
    this.modelInterface = new ModelInterface(apiCall, useAPI, apiModel, localModel);
    console.log(`[BaseEngine] Initialized ${name} engine with vault path: ${vaultPath}`);
  }

  async respond(userInput, externalMemory = []) {
    console.log(`[BaseEngine] respond() called with input: "${userInput}"`);
    
    // 1. Load capsules
    const memoryCapsules = searchCapsules({
      vaultPath: this.vaultPath,
      agent: this.name,
      tags: [`#${this.role}`]
    });
    console.log(`[BaseEngine] Found ${memoryCapsules.length} memory capsules`);

    // 2. Build context
    const { getRecentMessages } = require('../../utils/getRecentMessages');
const recent = getRecentMessages(externalMemory);

const { systemPrompt, tokenCount } = this.context.buildPrompt(
  memoryCapsules,
  userInput,
  recent,
  this.name
);

    console.log(`[BaseEngine] Built prompt with ${tokenCount} tokens`);

    // 3. Query model
    console.log('[BaseEngine] Calling model.generate()...');
    const reply = await this.modelInterface.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
      ],
      model: this.modelInterface.selectedAPIModel
    });
    console.log(`[BaseEngine] Got reply: "${reply}"`);

    // 4. Create capsule
    console.log('[BaseEngine] Creating agent capsule...');
    const capsule = createAgentCapsule({
      role: this.role,
      contextPrompt: systemPrompt,
      response: reply,
      model: this.modelInterface.selectedAPIModel || this.modelInterface.selectedLocalModel,
      metadata: {
        agent: this.name,
        userInput: userInput
      }
    });
    console.log('[BaseEngine] Capsule created:', JSON.stringify(capsule, null, 2));

    // 5. Write capsule
    console.log('[BaseEngine] Writing capsule...');
    try {
      await this.writer.writeCapsule(capsule);
      console.log('[BaseEngine] Capsule written successfully');
    } catch (error) {
      console.error('[BaseEngine] Error writing capsule:', error);
    }

    // 6. Log markdown
    console.log('[BaseEngine] Logging markdown...');
    try {
      await this.writer.logMarkdown(this.name, userInput, reply, capsule.metadata?.project || 'general');
      console.log('[BaseEngine] Markdown logged successfully');
    } catch (error) {
      console.error('[BaseEngine] Error logging markdown:', error);
    }
    return reply;
  }

  // Add queryModel method that engines are using
  async queryModel(prompt) {
    const reply = await this.modelInterface.generate({
      messages: [
        { role: 'system', content: prompt }
      ],
      model: this.modelInterface.selectedAPIModel || this.modelInterface.selectedLocalModel
    });
    return reply;
  }
}

export default BaseEngine;
