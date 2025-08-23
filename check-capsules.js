// check-capsules.js
const fs = require('fs');
const path = require('path');

const capsulePath = 'D:\\Obsidian Vault\\.echo\\capsules';

console.log('=== CHECKING CAPSULES FOR CLIENT/RECIPE INFO ===\n');

fs.readdirSync(capsulePath).forEach(file => {
    if (file.endsWith('.json')) {
        const content = fs.readFileSync(path.join(capsulePath, file), 'utf-8');
        const capsule = JSON.parse(content);
        
        console.log(`\nCapsule: ${file}`);
        console.log(`Created: ${capsule.created || 'unknown'}`);
        
        // Check for client mentions
        if (content.includes('client')) {
            console.log('  ⚠️  Mentions "client"');
            // Find the specific mention
            if (content.includes('6 client')) {
                console.log('  ❌ FOUND "6 client" mention!');
            }
            if (content.includes('5 client')) {
                console.log('  ✅ Found "5 client" mention');
            }
        }
        
        // Check for recipe mentions
        if (content.includes('recipe')) {
            console.log('  ⚠️  Mentions "recipe"');
            if (content.includes('5 recipe')) {
                console.log('  ✅ Found "5 recipe" mention');
            }
        }
        
        // Show summary if it exists
        if (capsule.summary) {
            console.log(`  Summary: ${capsule.summary.substring(0, 100)}...`);
        }
    }
});

// Also check why paranoia file has so many recipe mentions
console.log('\n=== CHECKING PARANOIA FILE ===');
const paranoiaPath = 'D:\\Obsidian Vault\\Echo\\paranoia file.md';
const paranoiaContent = fs.readFileSync(paranoiaPath, 'utf-8');
const recipeCount = (paranoiaContent.match(/recipe/gi) || []).length;
console.log(`Recipe mentions in paranoia file: ${recipeCount}`);
console.log('First 500 chars:', paranoiaContent.substring(0, 500));