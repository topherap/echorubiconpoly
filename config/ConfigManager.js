// config/ConfigManager.js
// Handles all configuration storage and validation for Echo Rubicon

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

class ConfigManager {
  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'echo-config.json');
    this.algorithm = 'aes-256-gcm';
    this.secret = this.getOrCreateSecret();
  }

  // Get or create encryption secret
  getOrCreateSecret() {
    const secretPath = path.join(app.getPath('userData'), '.echo-secret');
    try {
      return require('fs').readFileSync(secretPath, 'utf8');
    } catch {
      // Create new secret
      const secret = crypto.randomBytes(32).toString('hex');
      require('fs').writeFileSync(secretPath, secret, 'utf8');
      return secret;
    }
  }

  // Encrypt sensitive data
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.secret, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  // Decrypt sensitive data
  decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(
      this.algorithm, 
      Buffer.from(this.secret, 'hex'), 
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Load configuration
  async load() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(data);
      
      // Decrypt sensitive fields
      if (config.licenseKey && typeof config.licenseKey === 'object') {
        config.licenseKey = this.decrypt(config.licenseKey);
      }
      
      if (config.trialStarted && typeof config.trialStarted === 'object') {
        config.trialStarted = this.decrypt(config.trialStarted);
      }
      
      if (config.apiKeys) {
        Object.keys(config.apiKeys).forEach(key => {
          if (typeof config.apiKeys[key] === 'object') {
            config.apiKeys[key] = this.decrypt(config.apiKeys[key]);
          }
        });
      }
      
      return config;
    } catch (error) {
      console.log('No existing config found, this is a first run');
      return null;
    }
  }

  // Save configuration
  async save(config) {
    // Create a copy to avoid modifying the original
    const configToSave = JSON.parse(JSON.stringify(config));
    
    // Encrypt sensitive fields
    if (configToSave.licenseKey) {
      configToSave.licenseKey = this.encrypt(configToSave.licenseKey);
    }
    
    if (configToSave.trialStarted) {
      configToSave.trialStarted = this.encrypt(configToSave.trialStarted);
    }
    
    if (configToSave.apiKeys) {
      Object.keys(configToSave.apiKeys).forEach(key => {
        if (configToSave.apiKeys[key]) {
          configToSave.apiKeys[key] = this.encrypt(configToSave.apiKeys[key]);
        }
      });
    }
    
    // Add metadata
    configToSave.lastSaved = new Date().toISOString();
    configToSave.version = '1.0.0';
    
    await fs.writeFile(this.configPath, JSON.stringify(configToSave, null, 2), 'utf8');
    
    console.log('Configuration saved successfully');
  }

  // Check if trial has expired
  isTrialExpired(config) {
    if (!config || config.edition !== 'free') {
      return false;
    }
    
    const trialStart = new Date(config.trialStarted);
    const now = new Date();
    const daysPassed = (now - trialStart) / (1000 * 60 * 60 * 24);
    
    return daysPassed > 14;
  }

  // Check if onboarding is complete
  isOnboardingComplete(config) {
    if (!config) return false;
    
    return config.onboardingComplete === true &&
           config.edition &&
           config.ai?.name &&
           config.vault &&
           config.security?.configured;
  }

  // Validate license key format
  validateLicenseKey(key) {
    // Basic format validation
    const format = /^ECHO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!format.test(key)) return false;
    
    // Check for promo codes
    const promoCodes = {
      'ECHO-DEV-FREE-001': { edition: 'pro', type: 'dev-free' },
      'ECHO-DEV-FREE-002': { edition: 'pro', type: 'dev-free' },
      // ... up to 100
      'ECHO-BETA-TEST-001': { edition: 'personal', type: 'beta' }
    };
    
    if (promoCodes[key]) {
      return promoCodes[key];
    }
    
    // Determine edition from key pattern (simplified)
    if (key.includes('PRO')) {
      return { edition: 'pro', type: 'standard' };
    } else if (key.includes('HOST')) {
      return { edition: 'hosted', type: 'standard' };
    } else {
      return { edition: 'personal', type: 'standard' };
    }
  }

  // Get feature flags based on edition
  getFeatures(edition, isPromo = false, promoType = null) {
    const features = {
      free: {
        localAI: true,
        obsidianSync: true,
        voice: false,
        tts: false,
        apiAccess: false,
        whisper: false,
        elevenLabs: false,
        hostedBackend: false,
        maxDays: 14
      },
      personal: {
        localAI: true,
        obsidianSync: true,
        voice: true,
        tts: true,
        apiAccess: false,
        whisper: false,
        elevenLabs: false,
        hostedBackend: false,
        maxDays: Infinity
      },
      pro: {
        localAI: true,
        obsidianSync: true,
        voice: true,
        tts: true,
        apiAccess: true,
        whisper: true,
        elevenLabs: true,
        hostedBackend: false,
        maxDays: Infinity
      },
      hosted: {
        localAI: true,
        obsidianSync: true,
        voice: true,
        tts: true,
        apiAccess: true,
        whisper: true,
        elevenLabs: true,
        hostedBackend: true,
        maxDays: Infinity
      }
    };
    
    // Special handling for dev-free promos
    if (isPromo && promoType === 'dev-free') {
      return {
        ...features.pro,
        hostedBackend: false,
        requiresApiKeys: true
      };
    }
    
    return features[edition] || features.free;
  }
}

module.exports = ConfigManager;