const path = require('path');
const { buildContextTimeline } = require('./threaderEngine');

const vaultPath = 'D:/Obsidian Vault'; // Your known valid vault path
const topic = 'client'; // Or 'recipes', 'project', etc.

(async () => {
  try {
    const timeline = await buildContextTimeline(topic, vaultPath);
    console.log('\n🧠 MEMORY TIMELINE CONTEXT:\n');
    console.log(timeline);
  } catch (err) {
    console.error('❌ Timeline generation failed:', err.message);
  }
})();


// Auto-patched
module.exports = {};
