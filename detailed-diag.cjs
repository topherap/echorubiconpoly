console.log('=== PACKAGE.JSON ===');
const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
console.log('Main entry:', pkg.main);
console.log('Scripts:', Object.keys(pkg.scripts || {}));

console.log('=== MAIN FILE CHECK ===');
const mainContent = require('fs').readFileSync('main/app.js', 'utf8');
console.log('Loads ipc-handlers:', mainContent.includes('ipc-handlers'));

console.log('=== MEMORY SYSTEM TEST ===');
try {
  const memIndex = require('./src/memory/index.js');
  console.log('Memory exports:', Object.keys(memIndex));
  console.log('MemorySystem type:', typeof memIndex.MemorySystem);
  if (memIndex.MemorySystem) {
    const ms = new memIndex.MemorySystem('D:\\\\Obsidian Vault');
    console.log('MemorySystem created successfully!');
  }
} catch (err) {
  console.log('ERROR:', err.message);
}

console.log('=== IPC HANDLERS CHECK ===');
const ipcContent = require('fs').readFileSync('main/ipc-handlers.js', 'utf8');
console.log('Has appendCapsule:', ipcContent.includes('appendCapsule'));
console.log('Has initializeMemorySystems:', ipcContent.includes('initializeMemorySystems'));
console.log('Calls initializeMemorySystems:', ipcContent.includes('initializeMemorySystems()'));
