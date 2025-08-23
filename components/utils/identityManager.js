// === IDENTITY MANAGER ===
// 🧠 HIPPOCAMPUS - Long-term memory formation and retrieval

// Technical: Persists AI identity configuration to disk
// Brain Function: Like the hippocampus consolidating short-term memories into long-term storage
// Purpose: Ensures Q remembers who they are between sessions (no more amnesia on restart)

const fs = require('fs').promises;
const path = require('path');

class IdentityManager {
  constructor(vaultPath) {
    this.vaultPath = vaultPath;
    this.identityPath = path.join(vaultPath, '.echo', 'identity.json');
  }

  // === MEMORY ENCODING ===
  // 🧠 HIPPOCAMPUS - Converting experiences into stored memories
  
  // Technical: Writes identity data to JSON file in vault
  // Brain Function: Like hippocampal encoding, transforming active identity into persistent memory
  // Purpose: Saves Q's chosen name, personality, and user preferences after onboarding
  async saveIdentity(identity) {
    try {
      // Ensure .echo directory exists
      const echoDir = path.join(this.vaultPath, '.echo');
      await fs.mkdir(echoDir, { recursive: true });
      
      // Save identity with timestamp
      const identityWithMeta = {
        ...identity,
        savedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      await fs.writeFile(
        this.identityPath, 
        JSON.stringify(identityWithMeta, null, 2),
        'utf8'
      );
      
      console.log('[Identity] Consolidated to long-term storage:', identity.ai.name);
      return true;
    } catch (error) {
      console.error('[Identity] Memory consolidation failed:', error);
      return false;
    }
  }

  // === MEMORY RETRIEVAL ===
  // 🧠 HIPPOCAMPUS - Recalling stored memories
  
  // Technical: Reads identity from disk and parses JSON
  // Brain Function: Like hippocampal retrieval, bringing dormant memories back to consciousness
  // Purpose: Restores Q's personality on app startup, maintaining relationship continuity
  async loadIdentity() {
    try {
      const data = await fs.readFile(this.identityPath, 'utf8');
      const identity = JSON.parse(data);
      console.log('[Identity] Retrieved from long-term memory:', identity.ai.name);
      return identity;
    } catch (error) {
      console.log('[Identity] No existing memories found (first run)');
      return null;
    }
  }

  // === MEMORY CHECK ===
  // 🧠 HIPPOCAMPUS - Recognition memory
  
  // Technical: Checks if identity file exists
  // Brain Function: Like hippocampal recognition - "Have I formed this memory before?"
  // Purpose: Determines whether to show onboarding (new user) or load existing identity
  async exists() {
    try {
      await fs.access(this.identityPath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = IdentityManager;