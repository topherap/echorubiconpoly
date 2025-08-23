// temp-identity-fix.js
// Run this to add identity to config.json

const fs = require('fs').promises;
const path = require('path');

async function setTempIdentity() {
  try {
    // Path to config.json
    const configPath = path.join('C:\\Users\\tophe\\Documents\\Echo Rubicon', 'config.json');
    
    // Read current config
    console.log('📖 Reading config.json...');
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // Add identity section
    config.identity = {
      ai: { 
        name: 'Q', 
        role: 'Echo Rubicon AI Assistant' 
      },
      user: { 
        name: 'User' 
      },
      profile: 'standard'
    };
    
    // Save updated config
    console.log('💾 Saving identity to config...');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    console.log('✅ Identity added to config.json');
    console.log('   AI Name: Q');
    console.log('   Role: Echo Rubicon AI Assistant');
    console.log('\n🔄 Restart Echo for it to take effect');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run it
setTempIdentity();