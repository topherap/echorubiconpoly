// Echo Rubicon Emergency Persistence Repair
// Run with: node emergency_persistence_fix.js

const fs = require('fs');
const path = require('path');

console.log('🚨 ECHO RUBICON PERSISTENCE REPAIR 🚨\n');

// 1. CHECK CRITICAL FILES
const checks = {
  'Vault Path': 'D:\\Obsidian Vault',
  'First Run Marker': 'D:\\Obsidian Vault\\.echo\\config\\FIRST_RUN_COMPLETE',
  'Identity File': 'D:\\Obsidian Vault\\.echo\\identity.json',
  'IPC Handlers': 'main\\ipc-handlers.js',
  'Windows.js': 'main\\windows.js',
  'useAuth.js': 'src\\components\\useAuth.js',
  'MyAICore.js': 'components\\MyAICore.js'
};

console.log('=== FILE CHECKS ===');
for (const [name, filepath] of Object.entries(checks)) {
  const exists = fs.existsSync(filepath);
  console.log(`${exists ? '✅' : '❌'} ${name}: ${filepath}`);
}

// 2. SHOW LOCALSTORAGE KEYS TO CHECK
console.log('\n=== LOCALSTORAGE KEYS TO VERIFY ===');
console.log('Run this in DevTools Console (F12):');
console.log(`
localStorage.getItem('echo_ai_name')        // Should return AI name
localStorage.getItem('echo_user_name')      // Should return user name  
localStorage.getItem('echoAuthenticated')   // Should be "true"
localStorage.getItem('echo_onboarding_complete') // Should be "true"
`);

// 3. CRITICAL CODE FIXES
console.log('\n=== CRITICAL FIXES IF BROKEN ===\n');

console.log('FIX 1: windows.js (Line ~170)');
console.log('FIND:');
console.log('  const vaultPath = await getVaultPath();');
console.log('REPLACE WITH:');
console.log('  const { getVaultPath: getVaultPathFromManager } = require(\'../components/utils/VaultPathManager\');');
console.log('  const vaultPath = getVaultPathFromManager() || \'D:\\\\Obsidian Vault\';');

console.log('\nFIX 2: useAuth.js (Line ~25)');
console.log('FIND:');
console.log('  const [isAuthenticated, setIsAuthenticated] = React.useState(false);');
console.log('REPLACE WITH:');
console.log('  const [isAuthenticated, setIsAuthenticated] = React.useState(() => {');
console.log('    const saved = localStorage.getItem(\'echoAuthenticated\');');
console.log('    return saved === \'true\';');
console.log('  });');

console.log('\nFIX 3: MyAICore.js (Add in useEffect around line 130)');
console.log('ADD THIS CODE:');
console.log(`
  // Send identity from localStorage to main process
  const aiName = localStorage.getItem('echo_ai_name');
  const userName = localStorage.getItem('echo_user_name');
  
  if (aiName && userName) {
    window.electronAPI.invoke('identity:set', {
      ai: { name: aiName, role: 'Echo Rubicon AI Assistant' },
      user: { name: userName }
    });
  }
`);

console.log('\nFIX 4: ipc-handlers.js (Add handler)');
console.log('ADD THIS HANDLER:');
console.log(`
safeHandle('identity:set', async (event, identity) => {
  global.currentIdentity = identity;
  console.log('[IDENTITY] Set from renderer:', identity);
  
  // Save to disk
  const vaultPath = getVaultPath();
  const identityManager = new IdentityManager(vaultPath);
  await identityManager.saveIdentity(identity);
  
  return { success: true };
});
`);

console.log('\n=== PATH FIXES ===');
console.log('IdentityManager location: components\\utils\\identityManager.js');
console.log('Import should be: require(\'../components/utils/identityManager\')');

console.log('\n=== MEMORY CONTEXT FIX ===');
console.log('If Q doesn\'t remember vault content, check:');
console.log('1. MemorySystem is initialized in main/app.js');
console.log('2. Context is being passed to prompt builder');
console.log('3. Capsule retriever uses correct vault path');

console.log('\n✅ Repair checklist complete!');