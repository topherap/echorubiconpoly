// trace-identity.js
// Investigate why identity isn't persisting between sessions

const fs = require('fs').promises;
const path = require('path');

async function traceIdentityPersistence() {
  console.log('🔍 Tracing Identity Persistence Issue\n');
  
  const projectRoot = 'C:\\Users\\tophe\\Documents\\Echo Rubicon';
  
  // 1. Check config.json
  console.log('1️⃣ Checking config.json...');
  const configPath = path.join(projectRoot, 'config.json');
  try {
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    console.log('✅ Config exists');
    console.log('   Keys:', Object.keys(config));
    
    if (config.identity) {
      console.log('   Identity in config:', config.identity);
    } else if (config.currentIdentity) {
      console.log('   currentIdentity in config:', config.currentIdentity);
    } else if (config.ai || config.user) {
      console.log('   AI/User in config:', { ai: config.ai, user: config.user });
    } else {
      console.log('   ❌ No identity data in config!');
    }
  } catch (err) {
    console.log('❌ Error reading config:', err.message);
  }
  
  // 2. Check where config is loaded
  console.log('\n2️⃣ Checking config loading in main/app.js...');
  const appPath = path.join(projectRoot, 'main', 'app.js');
  try {
    const appContent = await fs.readFile(appPath, 'utf8');
    
    // Look for config loading
    if (appContent.includes('config.json')) {
      console.log('✅ app.js references config.json');
      
      // Check if it loads identity
      if (appContent.includes('currentIdentity')) {
        console.log('✅ app.js references currentIdentity');
      } else {
        console.log('❌ app.js does NOT set currentIdentity');
      }
      
      // Check for global.currentIdentity
      if (appContent.includes('global.currentIdentity')) {
        console.log('✅ app.js sets global.currentIdentity');
      } else {
        console.log('❌ app.js does NOT set global.currentIdentity');
      }
    } else {
      console.log('❌ app.js does NOT load config.json');
    }
  } catch (err) {
    console.log('❌ Error reading app.js:', err.message);
  }
  
  // 3. Check IPC handlers for identity initialization
  console.log('\n3️⃣ Checking identity in ipc-handlers.js...');
  const ipcPath = path.join(projectRoot, 'main', 'ipc-handlers.js');
  try {
    const ipcContent = await fs.readFile(ipcPath, 'utf8');
    
    // Look for identity initialization
    const identityPatterns = [
      'global.currentIdentity =',
      'currentIdentity =',
      'loadIdentity',
      'initializeIdentity'
    ];
    
    for (const pattern of identityPatterns) {
      if (ipcContent.includes(pattern)) {
        console.log(`✅ Found: ${pattern}`);
        
        // Find the context
        const index = ipcContent.indexOf(pattern);
        const start = Math.max(0, index - 200);
        const end = Math.min(ipcContent.length, index + 200);
        const context = ipcContent.substring(start, end);
        console.log('   Context:', context.split('\n').find(line => line.includes(pattern))?.trim());
      }
    }
    
    // Check for onboarding handler
    if (ipcContent.includes('onboarding:complete')) {
      console.log('✅ Has onboarding:complete handler');
      
      // Check if it saves identity
      const onboardingMatch = ipcContent.match(/onboarding:complete[^}]+\{([^}]+)\}/s);
      if (onboardingMatch && onboardingMatch[1].includes('currentIdentity')) {
        console.log('✅ Onboarding handler sets identity');
      } else {
        console.log('❌ Onboarding handler does NOT set identity');
      }
    }
  } catch (err) {
    console.log('❌ Error reading ipc-handlers:', err.message);
  }
  
  // 4. Check for identity manager
  console.log('\n4️⃣ Checking for identity manager...');
  const identityManagerPath = path.join(projectRoot, 'components', 'utils', 'identityManager.js');
  try {
    await fs.access(identityManagerPath);
    console.log('✅ identityManager.js exists');
    
    const content = await fs.readFile(identityManagerPath, 'utf8');
    
    // Check for key functions
    const functions = ['saveIdentity', 'loadIdentity', 'getCurrentIdentity'];
    for (const func of functions) {
      if (content.includes(func)) {
        console.log(`   ✅ Has ${func} function`);
      } else {
        console.log(`   ❌ Missing ${func} function`);
      }
    }
  } catch (err) {
    console.log('❌ identityManager.js not found');
  }
  
  // 5. Check startup sequence
  console.log('\n5️⃣ Checking startup sequence...');
  console.log('Looking for where identity should be loaded on boot...');
  
  // Check main process entry
  const mainEntry = path.join(projectRoot, 'main.js');
  try {
    const mainContent = await fs.readFile(mainEntry, 'utf8');
    if (mainContent.includes('app.whenReady')) {
      console.log('✅ Found app.whenReady in main.js');
      
      if (mainContent.includes('loadIdentity') || mainContent.includes('currentIdentity')) {
        console.log('✅ Main process attempts to load identity');
      } else {
        console.log('❌ Main process does NOT load identity on startup');
      }
    }
  } catch (err) {
    console.log('   main.js not found, checking package.json for entry point');
  }
  
  // 6. Summary
  console.log('\n📊 SUMMARY:');
  console.log('The identity persistence break is likely because:');
  console.log('1. Identity is saved to config during onboarding');
  console.log('2. But NOT loaded from config on app startup');
  console.log('3. global.currentIdentity remains undefined');
  console.log('4. So Q acts like first run every time');
  
  console.log('\n🔧 FIX NEEDED:');
  console.log('Add identity loading to app startup sequence');
  console.log('Either in main/app.js or main.js after app.whenReady()');
}

// Run trace
traceIdentityPersistence().catch(console.error);