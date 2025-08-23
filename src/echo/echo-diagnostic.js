// echo-diagnostic.js
// Save this file in your Echo Rubicon root directory and run with: node echo-diagnostic.js

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const VAULT_PATH = 'D:\\Obsidian Vault';
const OLLAMA_MODEL = 'granite3.3:2b';

console.log('=== ECHO RUBICON COMPLETE DIAGNOSTIC ===\n');

// Test 1: Verify Vault Access
console.log('[TEST 1] Checking vault access...');
if (fs.existsSync(VAULT_PATH)) {
    console.log('✅ Vault found at:', VAULT_PATH);
} else {
    console.log('❌ Vault NOT FOUND at:', VAULT_PATH);
    process.exit(1);
}

// Test 2: Check Folder Structure
console.log('\n[TEST 2] Checking folder structure...');
const foldersToCheck = ['Foods', 'clients', 'Echo', 'conversations', 'chats', 'Chats'];
const folderStatus = {};

foldersToCheck.forEach(folder => {
    const folderPath = path.join(VAULT_PATH, folder);
    if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
        folderStatus[folder] = files.length;
        console.log(`✅ ${folder}/: ${files.length} markdown files`);
        if (files.length > 0 && files.length <= 10) {
            console.log(`   Files: ${files.join(', ')}`);
        }
    } else {
        folderStatus[folder] = 0;
        console.log(`❌ ${folder}/: NOT FOUND`);
    }
});

// Test 3: Search for Recipes Manually
console.log('\n[TEST 3] Manually searching for recipes...');
const recipeFiles = [];
const searchForRecipes = (dir) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            searchForRecipes(fullPath);
        } else if (file.endsWith('.md')) {
            const content = fs.readFileSync(fullPath, 'utf-8').toLowerCase();
            if (content.includes('recipe') || content.includes('ingredients') || 
                fullPath.toLowerCase().includes('food') || fullPath.toLowerCase().includes('recipe')) {
                recipeFiles.push({
                    path: fullPath.replace(VAULT_PATH + path.sep, ''),
                    hasRecipeWord: content.includes('recipe'),
                    hasIngredients: content.includes('ingredients'),
                    inFoodFolder: fullPath.includes('Foods')
                });
            }
        }
    });
};

searchForRecipes(VAULT_PATH);
console.log(`Found ${recipeFiles.length} files mentioning recipes/food:`);
recipeFiles.forEach(file => {
    console.log(`  - ${file.path} (Food folder: ${file.inFoodFolder}, Has "recipe": ${file.hasRecipeWord})`);
});

// Test 4: Search for Clients Manually
console.log('\n[TEST 4] Manually searching for clients...');
const clientsPath = path.join(VAULT_PATH, 'clients');
if (fs.existsSync(clientsPath)) {
    const clientFiles = fs.readdirSync(clientsPath)
        .filter(f => f.endsWith('.md') && !f.includes('unknown-client'));
    console.log(`Found ${clientFiles.length} client files:`);
    clientFiles.forEach(file => {
        console.log(`  - ${file}`);
    });
} else {
    console.log('❌ No clients folder found');
}

// Test 5: Test Q-lib AI
console.log('\n[TEST 5] Testing granite3.3:2b availability...');
const testOllama = spawn('ollama', ['run', OLLAMA_MODEL, 'Say "OK"'], { shell: true });
let ollamaWorks = false;

testOllama.stdout.on('data', (data) => {
    console.log('✅ Ollama response:', data.toString().trim());
    ollamaWorks = true;
});

testOllama.stderr.on('data', (data) => {
    console.log('❌ Ollama error:', data.toString());
});

// Test 6: Simulate Q-lib Search Function
console.log('\n[TEST 6] Simulating Q-lib search function...');
function simulateSearchDir(dirPath, query, excludeFolders = []) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    function searchRecursive(currentPath) {
        try {
            const items = fs.readdirSync(currentPath);
            
            items.forEach(item => {
                const itemPath = path.join(currentPath, item);
                const relativePath = path.relative(VAULT_PATH, itemPath);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory()) {
                    const folderName = path.basename(itemPath);
                    if (!excludeFolders.some(ex => folderName.toLowerCase() === ex.toLowerCase())) {
                        searchRecursive(itemPath);
                    }
                } else if (item.endsWith('.md')) {
                    const content = fs.readFileSync(itemPath, 'utf-8');
                    const contentLower = content.toLowerCase();
                    const matches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
                    
                    if (matches > 0) {
                        results.push({
                            path: relativePath,
                            score: matches,
                            content: content.substring(0, 500)
                        });
                    }
                }
            });
        } catch (err) {
            console.error('Search error in:', currentPath, err.message);
        }
    }
    
    searchRecursive(dirPath);
    return results.sort((a, b) => b.score - a.score);
}

// Test recipe search
const recipeSearchResults = simulateSearchDir(VAULT_PATH, 'recipe', ['conversations', 'chats', '.obsidian']);
console.log(`Recipe search found ${recipeSearchResults.length} results:`);
recipeSearchResults.slice(0, 5).forEach((result, i) => {
    console.log(`  ${i + 1}. ${result.path} (score: ${result.score})`);
});

// Test 7: Test Layered Search
console.log('\n[TEST 7] Testing layered search strategy...');
const folderMap = {
    'recipe': 'Foods',
    'recipes': 'Foods',
    'client': 'clients',
    'clients': 'clients'
};

function testLayeredSearch(query) {
    console.log(`\nLayered search for "${query}":`);
    
    // Detect folder
    let targetFolder = null;
    const queryLower = query.toLowerCase();
    for (const [keyword, folder] of Object.entries(folderMap)) {
        if (queryLower.includes(keyword)) {
            targetFolder = folder;
            break;
        }
    }
    
    if (targetFolder) {
        console.log(`  Layer 2: Target folder detected: ${targetFolder}`);
        const folderPath = path.join(VAULT_PATH, targetFolder);
        if (fs.existsSync(folderPath)) {
            const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
            console.log(`  Found ${files.length} files in ${targetFolder}/`);
            return files.length;
        }
    } else {
        console.log('  No target folder detected, would search full vault');
    }
    return 0;
}

const recipeCount = testLayeredSearch('recipes');
const clientCount = testLayeredSearch('clients');

// Test 8: Memory Capsules
console.log('\n[TEST 8] Checking memory capsules...');
const capsulePaths = [
    path.join(VAULT_PATH, '.echo', 'memory', 'capsules'),
    path.join(VAULT_PATH, 'Echo', 'memory', 'capsules'),
    path.join(VAULT_PATH, '.echo', 'capsules')
];

capsulePaths.forEach(capsulePath => {
    if (fs.existsSync(capsulePath)) {
        const capsules = fs.readdirSync(capsulePath).filter(f => f.endsWith('.json'));
        console.log(`✅ Found ${capsules.length} capsules in ${capsulePath}`);
        
        // Check for recipe-related capsules
        capsules.forEach(capsuleFile => {
            const content = fs.readFileSync(path.join(capsulePath, capsuleFile), 'utf-8');
            if (content.includes('recipe') || content.includes('5 recipes')) {
                console.log(`  ⚠️ Capsule ${capsuleFile} mentions recipes!`);
            }
        });
    }
});

// Final Summary
console.log('\n=== DIAGNOSTIC SUMMARY ===');
console.log(`\n1. ACTUAL FILES:`);
console.log(`   - Recipes in Foods/: ${folderStatus['Foods'] || 0}`);
console.log(`   - Clients in clients/: ${folderStatus['clients'] || 0}`);
console.log(`   - Total files mentioning "recipe": ${recipeFiles.length}`);

console.log(`\n2. Q'S CLAIMS:`);
console.log(`   - Q says: 5 recipes (WHERE IS THIS FROM?)`);
console.log(`   - Q says: 6 clients (WHERE IS THIS FROM?)`);

console.log(`\n3. LAYERED SEARCH WOULD RETURN:`);
console.log(`   - Recipes: ${recipeCount} files from Foods/`);
console.log(`   - Clients: ${clientCount} files from clients/`);

console.log(`\n4. PROBABLE ISSUES:`);
if (recipeCount !== 5) {
    console.log(`   ❌ Q says 5 recipes but Foods/ has ${recipeCount}`);
}
if (clientCount !== 6) {
    console.log(`   ❌ Q says 6 clients but clients/ has ${clientCount}`);
}
if (recipeSearchResults[0] && !recipeSearchResults[0].path.includes('Foods')) {
    console.log(`   ❌ Recipe search returns ${recipeSearchResults[0].path} first (not from Foods/)`);
}

console.log('\n=== END DIAGNOSTIC ===');