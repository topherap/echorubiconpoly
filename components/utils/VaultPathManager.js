const fs = require('fs');
const path = require('path');
const os = require('os');

const fallbackFile = path.join(os.homedir(), '.echo', 'lastVaultPath.json');
const configFile = path.resolve(__dirname, '../config/config.json');

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getFromConfig() {
  try {
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    return config.vaultPath;
  } catch {
    return null;
  }
}

function getFromFallbackFile() {
  try {
    const saved = JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
    return saved.vaultPath;
  } catch {
    return null;
  }
}

function saveFallback(pathValue) {
  try {
    ensureDirExists(path.dirname(fallbackFile));
    fs.writeFileSync(fallbackFile, JSON.stringify({ vaultPath: pathValue }, null, 2), 'utf8');
  } catch (err) {
    console.warn('[VaultPathManager] Could not save fallback vault path:', err.message);
  }
}

function getVaultPath() {
  return process.env.ECHO_VAULT_PATH || getFromConfig() || getFromFallbackFile() || null;
}

function setVaultPath(pathValue) {
  saveFallback(pathValue);
}

function vaultExists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

module.exports = {
  getVaultPath,
  setVaultPath,
  vaultExists
};
