const path = require('path');
const fs = require('fs');
const os = require('os');

class VaultConfig {
  constructor() {
    // Check environment variable first
    this.vaultPath = process.env.OBSIDIAN_VAULT_PATH || this.findVaultPath();
  }

  findVaultPath() {
    // Common Obsidian vault locations to check
    const possiblePaths = [
      // User-specific config file
      path.join(os.homedir(), '.oracle-bridge', 'vault-config.json'),
      // Windows default locations
      path.join(os.homedir(), 'Documents', 'Obsidian Vault'),
      path.join(os.homedir(), 'Obsidian'),
      // Mac/Linux default locations  
      path.join(os.homedir(), 'obsidian'),
      path.join(os.homedir(), 'Documents', 'obsidian'),
    ];

    // Check for config file first
    const configPath = possiblePaths[0];
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.vaultPath && fs.existsSync(config.vaultPath)) {
          return config.vaultPath;
        }
      } catch (e) {
        console.warn('Config file exists but cannot be read:', e.message);
      }
    }

    // Scan for actual vault folders
    for (const vPath of possiblePaths.slice(1)) {
      if (fs.existsSync(path.join(vPath, '.obsidian'))) {
        return vPath;
      }
    }

    throw new Error('No Obsidian vault found. Set OBSIDIAN_VAULT_PATH environment variable.');
  }

  saveConfig(vaultPath) {
    const configDir = path.join(os.homedir(), '.oracle-bridge');
    const configFile = path.join(configDir, 'vault-config.json');
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configFile, JSON.stringify({ 
      vaultPath,
      savedAt: new Date().toISOString() 
    }, null, 2));
  }
}

module.exports = new VaultConfig();