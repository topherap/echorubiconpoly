const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');


class SecurityManager {
  constructor(vaultPath, db) {
    this.vaultPath = vaultPath;
    this.db = db;
    this.attempts = 0;
    this.securityPath = path.join(vaultPath, '.echo-security');
    this.genesisPath = path.join(this.securityPath, 'genesis-pair.enc');
    this.configPath = path.join(this.securityPath, 'config.enc');
    this.authenticated = false;
    this.sessionTimeout = null;
  }

  async initialize() {
    try {
      // Create security directory if it doesn't exist
      await fs.mkdir(this.securityPath, { recursive: true });
      
      // Check if genesis pair exists
      try {
        await fs.access(this.genesisPath);
        return true; // Already initialized
      } catch {
        return false; // Needs onboarding
      }
    } catch (error) {
      console.error('Security initialization error:', error);
      return false;
    }
  }
  
  // ... rest of the methods go here
  // Encryption helpers
  encrypt(data) {
    const algorithm = 'aes-256-gcm';
    const key = this.deriveKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(encryptedData) {
    const algorithm = 'aes-256-gcm';
    const key = this.deriveKey();
    const buffer = Buffer.from(encryptedData, 'base64');
    
    const iv = buffer.slice(0, 16);
    const authTag = buffer.slice(16, 32);
    const encrypted = buffer.slice(32);
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  }

  deriveKey() {
    // Use machine ID + app path for device-specific key
    const salt = crypto.createHash('sha256')
      .update(app.getPath('userData'))
      .update(process.platform)
      .digest();
    
    return crypto.pbkdf2Sync('echo-rubicon-2024', salt, 100000, 32, 'sha256');
  }

  // Genesis pair management
  async createGenesisPair(prompt, completion, enableDestruction) {
    const genesis = {
      prompt: prompt.trim(),
      completion: completion.trim(),
      destructionEnabled: enableDestruction,
      created: Date.now(),
      deviceId: this.getDeviceId()
    };
    
    const encrypted = this.encrypt(genesis);
    await fs.writeFile(this.genesisPath, encrypted, 'utf8');
    
    // Save config separately
    const config = {
      destructionEnabled: enableDestruction,
      failedAttempts: 0,
      lockedUntil: null
    };
    
    await fs.writeFile(this.configPath, this.encrypt(config), 'utf8');
    
    return { success: true };
  }

  async loadGenesisPair() {
    try {
      const encrypted = await fs.readFile(this.genesisPath, 'utf8');
      return this.decrypt(encrypted);
    } catch (error) {
      console.error('Failed to load genesis pair:', error);
      return null;
    }
  }

  // Authentication
  async verifyCompletion(userInput) {
    const genesis = await this.loadGenesisPair();
    if (!genesis) {
      return { success: false, error: 'No genesis pair found' };
    }
    
    const normalized = this.normalizeString(userInput);
    const expected = this.normalizeString(genesis.completion);
    
    if (this.fuzzyMatch(normalized, expected) > 0.85) {
      this.attempts = 0;
      this.authenticated = true;
      this.startSessionTimer();
      
      // Update config to reset failed attempts
      await this.updateConfig({ failedAttempts: 0 });
      
      return { success: true };
    }
    
    this.attempts++;
    await this.updateConfig({ failedAttempts: this.attempts });
    
    if (this.attempts >= 3) {
      if (genesis.destructionEnabled) {
        await this.executeDestruction();
        return { success: false, destroyed: true };
      } else {
        await this.executeLockdown();
        return { success: false, locked: true };
      }
    }
    
    return { 
      success: false, 
      attemptsRemaining: 3 - this.attempts,
      hint: this.attempts === 2 ? 'Last attempt' : undefined
    };
  }

  async isAuthenticated() {
    // Check if locked
    const config = await this.loadConfig();
    if (config && config.lockedUntil && config.lockedUntil > Date.now()) {
      return false;
    }
    
    return this.authenticated;
  }

  async getChallenge() {
    const genesis = await this.loadGenesisPair();
    if (!genesis) return null;
    
    return {
      prompt: genesis.prompt,
      attemptsRemaining: 3 - this.attempts
    };
  }

  // Helper methods
  normalizeString(str) {
    return str.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  fuzzyMatch(str1, str2) {
    // Levenshtein distance-based matching
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];
    
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : 1 - distance / maxLen;
  }

  getDeviceId() {
    return crypto.createHash('sha256')
      .update(app.getPath('userData'))
      .update(process.platform)
      .update(require('os').hostname())
      .digest('hex')
      .substring(0, 16);
  }

  startSessionTimer() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    
    // 30 minute session timeout
    this.sessionTimeout = setTimeout(() => {
      this.authenticated = false;
    }, 30 * 60 * 1000);
  }

  // Config management
  async loadConfig() {
    try {
      const encrypted = await fs.readFile(this.configPath, 'utf8');
      return this.decrypt(encrypted);
    } catch {
      return null;
    }
  }

  async updateConfig(updates) {
    const config = await this.loadConfig() || {};
    Object.assign(config, updates);
    await fs.writeFile(this.configPath, this.encrypt(config), 'utf8');
  }

  // Security actions
  async executeDestruction() {
    console.log('DESTRUCTION TRIGGERED - In production, this would wipe data');
    
    // In development, just log
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode - skipping actual destruction');
      return;
    }
    
    // Production destruction sequence
    try {
      // 1. Overwrite files with random data
      const files = [this.genesisPath, this.configPath];
      for (const file of files) {
        const randomData = crypto.randomBytes(1024);
        await fs.writeFile(file, randomData);
      }
      
      // 2. Delete files
      await fs.rm(this.securityPath, { recursive: true, force: true });
      
      // 3. Clear app data
      this.authenticated = false;
      this.attempts = 0;
      
    } catch (error) {
      console.error('Destruction error:', error);
    }
  }

  async executeLockdown() {
    // Lock for 24 hours
    const lockUntil = Date.now() + (24 * 60 * 60 * 1000);
    await this.updateConfig({ 
      lockedUntil: lockUntil,
      failedAttempts: 3
    });
    
    this.authenticated = false;
  }

  // Check if system needs onboarding
  async needsOnboarding() {
    try {
      await fs.access(this.genesisPath);
      return false;
    } catch {
      return true;
    }
  }
}

module.exports = SecurityManager;