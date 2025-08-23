// utils/config.js
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

const configPath = path.join(app.getPath('userData'), 'config.json');

async function loadConfig() {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function saveConfig(data) {
  await fs.writeFile(configPath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { loadConfig, saveConfig };