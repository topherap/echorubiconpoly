// test-vault-only.js - Look inside foods folder
const fs = require('fs').promises;
const path = require('path');

async function testVault() {
  const vaultPath = 'D:\\Obsidian Vault';
  const foodsPath = path.join(vaultPath, 'foods');
  
  console.log('Checking foods folder:', foodsPath);
  
  try {
    // List contents of foods folder
    const files = await fs.readdir(foodsPath);
    console.log('\nFoods folder contains', files.length, 'items:');
    
    // Show all files
    files.forEach((file, i) => {
      console.log(`${i + 1}. ${file}`);
    });
    
    // Filter for markdown files
    const mdFiles = files.filter(f => f.endsWith('.md'));
    console.log('\nMarkdown files:', mdFiles.length);
    
    // Look for carnivore ice cream
    const carnivore = files.filter(f => 
      f.toLowerCase().includes('carnivore') || 
      f.toLowerCase().includes('ice')
    );
    console.log('\nCarnivore/Ice cream related:', carnivore);
    
  } catch (error) {
    console.log('ERROR:', error.message);
  }
}

testVault();