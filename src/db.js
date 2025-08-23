const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const crypto = require('crypto');

// Path: ~/.echo/echo.db
const dbDir = path.join(require('os').homedir(), '.echo');
const dbPath = path.join(dbDir, 'echo.db');

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
const db = new Database(dbPath);

// Run once: schema definition
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password_hash TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  title TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER,
  sender TEXT,
  content TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vaults (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  encrypted_data TEXT,
  passphrase_hash TEXT,
  failed_attempts INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0
);
`);

function hashPassphrase(pass) {
  return crypto.createHash('sha256').update(pass).digest('hex');
}

// User functions
function createUser(username, hash) {
  const stmt = db.prepare(`INSERT INTO users (username, password_hash) VALUES (?, ?)`);
  stmt.run(username, hash);
}

function getUser(username) {
  return db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
}

// Vault functions
function createShadowVault(userId, passphrase, data = '{}') {
  const encrypted = Buffer.from(data).toString('base64'); // simple placeholder
  const passHash = hashPassphrase(passphrase);
  const stmt = db.prepare(`
    INSERT INTO vaults (user_id, encrypted_data, passphrase_hash)
    VALUES (?, ?, ?)
  `);
  stmt.run(userId, encrypted, passHash);
}

function validatePassphrase(vaultId, input) {
  const vault = db.prepare(`SELECT * FROM vaults WHERE id = ?`).get(vaultId);
  if (!vault || vault.deleted) return false;

  const inputHash = hashPassphrase(input);
  if (inputHash === vault.passphrase_hash) {
    return true;
  } else {
    const failed = vault.failed_attempts + 1;
    if (failed >= 3) {
      db.prepare(`UPDATE vaults SET deleted = 1 WHERE id = ?`).run(vaultId);
    } else {
      db.prepare(`UPDATE vaults SET failed_attempts = ? WHERE id = ?`).run(failed, vaultId);
    }
    return false;
  }
}

function destroyVault(vaultId) {
  db.prepare(`UPDATE vaults SET deleted = 1 WHERE id = ?`).run(vaultId);
}

module.exports = {
  createUser,
  getUser,
  createShadowVault,
  validatePassphrase,
  destroyVault,
  dbPath
};
