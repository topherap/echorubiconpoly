// tools/retag-capsules-standalone.js
const fs = require('fs');
const path = require('path');

const capsulesPath = 'D:\\Obsidian Vault\\.echo\\capsules';

// Import classifier from MemoryVaultManager
function classifyContent(capsule) {
  const text = JSON.stringify(capsule).toLowerCase();
  const tags = capsule.tags || [];
  
  // Actual recipes have specific structural markers
  if ((tags.includes('recipes') || text.includes('#recipes')) && 
      (text.includes('ingredients:') || 
       text.includes('method:') || 
       text.includes('tbsp') || 
       text.includes('cup') ||
       text.includes('calories:'))) {
    return 'recipe';
  }
  
  // Client records have contact info
  if ((text.includes('@') || text.includes('phone')) && 
      (text.includes('email') || text.includes('pitched') || text.includes('client'))) {
    return 'client';
  }
  
  // Handoff reports and documentation
  if (text.includes('handoff') || 
      text.includes('echo rubicon') || 
      text.includes('memory architecture') ||
      text.includes('executive summary')) {
    return 'documentation';
  }
  
  // Project notes
  if (text.includes('todo') || 
      text.includes('task') || 
      text.includes('project') ||
      text.includes('complete')) {
    return 'project';
  }
  
  // Default to conversation
  return 'conversation';
}

async function retagAllCapsules() {
  console.log('=== CAPSULE RE-TAGGING SCRIPT ===\n');
  
  const files = fs.readdirSync(capsulesPath).filter(f => f.endsWith('.json'));
  console.log(`Processing ${files.length} capsules...\n`);
  
  const stats = {
    recipe: 0,
    client: 0,
    documentation: 0,
    project: 0,
    conversation: 0,
    errors: 0
  };
  
  for (const file of files) {
    try {
      const filePath = path.join(capsulesPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const capsule = JSON.parse(content);
      
      // Classify content
      const contentType = classifyContent(capsule);
      
      // Update capsule
      capsule.contentType = contentType;
      capsule.classifiedAt = new Date().toISOString();
      
      // Fix tags
      if (!capsule.tags) capsule.tags = [];
      
      // Add proper content type tag
      const typeTag = `type:${contentType}`;
      if (!capsule.tags.includes(typeTag)) {
        capsule.tags.push(typeTag);
      }
      
      // Special handling for recipes
      if (contentType === 'recipe') {
        if (!capsule.tags.includes('actual-recipe')) {
          capsule.tags.push('actual-recipe');
        }
        // Remove generic recipes tag if it's not a real recipe
      } else if (capsule.tags.includes('recipes')) {
        // This was mis-tagged
        capsule.tags = capsule.tags.filter(t => t !== 'recipes');
        capsule.tags.push('mentions-recipes');
      }
      
      // Save updated capsule
      fs.writeFileSync(filePath, JSON.stringify(capsule, null, 2));
      stats[contentType]++;
      
      // Log actual recipes
      if (contentType === 'recipe') {
        console.log(`✅ Found actual recipe: ${capsule.title || capsule.summary?.slice(0, 50) || file}`);
      }
      
    } catch (e) {
      console.error(`Error processing ${file}:`, e.message);
      stats.errors++;
    }
  }
  
  console.log('\n=== RETAGGING COMPLETE ===');
  console.log('Results:');
  Object.entries(stats).forEach(([type, count]) => {
    console.log(`- ${type}: ${count}`);
  });
}

// Run it
retagAllCapsules().catch(console.error);