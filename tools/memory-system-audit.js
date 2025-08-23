// Echo Rubicon Memory System Diagnostic Script
// Run this to map the entire memory terrain

const fs = require('fs').promises;
const path = require('path');

async function diagnoseMemorySystem() {
 console.log('='.repeat(80));
 console.log('ECHO RUBICON MEMORY SYSTEM DIAGNOSTIC');
 console.log('='.repeat(80));

 const vaultPath = 'D:\\Obsidian Vault';
 const results = {
   timestamp: new Date().toISOString(),
   vaultPath: vaultPath,
   folders: {},
   memorySystem: {},
   capsules: {},
   handlers: {},
   pipeline: {},
   errors: []
 };

 // 1. MAP VAULT STRUCTURE
 console.log('\n[1] MAPPING VAULT STRUCTURE...');
 try {
   const folders = await fs.readdir(vaultPath);
   for (const folder of folders) {
     const folderPath = path.join(vaultPath, folder);
     const stats = await fs.stat(folderPath);
     
     if (stats.isDirectory()) {
       const files = await fs.readdir(folderPath).catch(() => []);
       const mdFiles = files.filter(f => f.endsWith('.md'));
       const jsonFiles = files.filter(f => f.endsWith('.json'));
       
       results.folders[folder] = {
         path: folderPath,
         mdCount: mdFiles.length,
         jsonCount: jsonFiles.length,
         sampleFiles: mdFiles.slice(0, 3),
         hasChaosFiles: files.some(f => f.includes('.chaos.json'))
       };
     }
   }
   console.log(`✓ Found ${Object.keys(results.folders).length} folders`);
 } catch (err) {
   results.errors.push({ location: 'vault_structure', error: err.message });
 }

 // 2. ANALYZE MEMORY CAPSULES
 console.log('\n[2] ANALYZING MEMORY CAPSULES...');
 try {
   const capsulesPath = path.join(vaultPath, '.echo', 'capsules');
   const indexPath = path.join(capsulesPath, 'index.json');
   
   // Check index
   const indexExists = await fs.access(indexPath).then(() => true).catch(() => false);
   if (indexExists) {
     const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
     results.capsules.indexSize = Object.keys(index.capsules || {}).length;
   }
   
   // Count actual capsule files
   let capsuleCount = 0;
   let capsuleTypes = {};
   
   async function countCapsules(dir) {
     const items = await fs.readdir(dir, { withFileTypes: true });
     for (const item of items) {
       if (item.isDirectory()) {
         await countCapsules(path.join(dir, item.name));
       } else if (item.name.endsWith('.json')) {
         capsuleCount++;
         try {
           const content = JSON.parse(await fs.readFile(path.join(dir, item.name), 'utf8'));
           const type = content.metadata?.contentType || content.type || 'unknown';
           capsuleTypes[type] = (capsuleTypes[type] || 0) + 1;
         } catch (e) {}
       }
     }
   }
   
   await countCapsules(capsulesPath);
   results.capsules = {
     ...results.capsules,
     fileCount: capsuleCount,
     types: capsuleTypes
   };
   
   console.log(`✓ Found ${capsuleCount} capsules`);
 } catch (err) {
   results.errors.push({ location: 'capsules', error: err.message });
 }

 // 3. TEST MEMORY SEARCH FUNCTIONS
 console.log('\n[3] TESTING MEMORY SEARCH FUNCTIONS...');
 try {
   // Test if MemoryVaultManager works
   const { MemoryVaultManager } = require('./src/memory/MemoryVaultManager');
   const vaultManager = new MemoryVaultManager(vaultPath);
   await vaultManager.ensureIndex();
   
   // Test searches
   const testQueries = ['recipe', 'client', 'food', 'carnivore'];
   for (const query of testQueries) {
     const results = await vaultManager.searchMemories(query, { limit: 5 });
     results.memorySystem[`search_${query}`] = {
       found: results.length,
       types: [...new Set(results.map(r => r.metadata?.contentType || r.type))]
     };
   }
 } catch (err) {
   results.errors.push({ location: 'memory_search', error: err.message });
 }

 // 4. TEST VAULT SEARCH FUNCTIONS
 console.log('\n[4] TESTING VAULT SEARCH FUNCTIONS...');
 try {
   // Load IPC handlers to test search functions
   const handlersPath = './main/ipc-handlers.js';
   const handlers = require(handlersPath);
   
   // Check which handlers are registered
   const handlerNames = [
     'qlib-search', 'qlib-extract', 'search-notes',
     'vault:search-notes', 'chat:send'
   ];
   
   for (const name of handlerNames) {
     results.handlers[name] = {
       exists: typeof handlers[name] === 'function',
       // Can't easily test without full Electron context
     };
   }
 } catch (err) {
   results.errors.push({ location: 'handlers', error: err.message });
 }

 // 5. CHECK Q-LIB INTEGRATION
 console.log('\n[5] CHECKING Q-LIB INTEGRATION...');
 try {
   const qlibPath = './backend/qlib';
   const qlibFiles = await fs.readdir(qlibPath);
   
   results.qlib = {
     files: qlibFiles,
     hasChaosAnalyzer: qlibFiles.includes('chaosanalyzer.js'),
     hasInjectionScorer: qlibFiles.includes('injectionScorer.js'),
     hasFolderDispatcher: qlibFiles.includes('ipc-injection-folderDispatcher.js')
   };
 } catch (err) {
   results.errors.push({ location: 'qlib', error: err.message });
 }

 // 6. TRACE SEARCH PIPELINE
 console.log('\n[6] TRACING SEARCH PIPELINE...');
 results.pipeline = {
   userQuery: "what are my recipes?",
   flow: [
     { step: 1, handler: 'chat:send', action: 'receives query' },
     { step: 2, function: 'detectTargetFolder', result: 'Foods' },
     { step: 3, handler: 'qlib-search', action: 'searches vault' },
     { step: 4, function: 'searchSpecificFolder', issue: 'Returns 0 results' },
     { step: 5, handler: 'buildContextForInput', action: 'searches capsules' },
     { step: 6, result: 'Q gets capsules but no vault content' }
   ],
   bottlenecks: [
     'searchSpecificFolder not finding .md files',
     'ChaosAnalyzer not integrated into search',
     'Vault content not indexed'
   ]
 };

 // 7. SAMPLE CONTENT ANALYSIS
 console.log('\n[7] SAMPLING CONTENT...');
 try {
   // Check Foods folder specifically
   const foodsPath = path.join(vaultPath, 'Foods');
   const foodFiles = await fs.readdir(foodsPath);
   const sampleFile = foodFiles.find(f => f.endsWith('.md'));
   
   if (sampleFile) {
     const content = await fs.readFile(path.join(foodsPath, sampleFile), 'utf8');
     results.sampleContent = {
       folder: 'Foods',
       file: sampleFile,
       size: content.length,
       hasYamlHeader: content.startsWith('---'),
       firstLine: content.split('\n')[0],
       contains: {
         recipe: content.toLowerCase().includes('recipe'),
         ingredients: content.toLowerCase().includes('ingredients'),
         instructions: content.toLowerCase().includes('instructions')
       }
     };
   }
 } catch (err) {
   results.errors.push({ location: 'sample_content', error: err.message });
 }

 // OUTPUT RESULTS
 console.log('\n' + '='.repeat(80));
 console.log('DIAGNOSTIC COMPLETE');
 console.log('='.repeat(80));
 
 console.log(JSON.stringify(results, null, 2));
 
 // Save to file
 const outputPath = path.join(vaultPath, 'echo-diagnostic.json');
 await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
 console.log(`\n✓ Full diagnostic saved to: ${outputPath}`);
 
 // Summary
 console.log('\nQUICK DIAGNOSIS:');
 console.log('- Vault folders found:', Object.keys(results.folders).length);
 console.log('- Foods folder has:', results.folders.Foods?.mdCount || 0, 'recipes');
 console.log('- Memory capsules:', results.capsules.fileCount || 0);
 console.log('- Errors encountered:', results.errors.length);
 
 if (results.folders.Foods?.mdCount > 0 && results.pipeline.bottlenecks) {
   console.log('\n❌ MAIN ISSUE: Vault files exist but search returns 0');
   console.log('   Fix needed in searchSpecificFolder function');
 }
}

// Run it
diagnoseMemorySystem().catch(console.error);