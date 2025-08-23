// main/store.js
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class Store {
  constructor() {
    // Store data in userData directory
    const userDataPath = app.getPath('userData');
    this.path = path.join(userDataPath, 'config.json');
    this.data = this.loadData();
  }

  loadData() {
    try {
      return JSON.parse(fs.readFileSync(this.path));
    } catch (error) {
      // Return default data if file doesn't exist
      return {
        vaultPath: null,
        theme: 'dark',
        security: {
          tier: 'standard'
        }
      };
    }
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }

  save() {
    try {
      fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Failed to save store:', error);
    }
  }
}

// Create singleton instance
const store = new Store();

module.exports = { store };