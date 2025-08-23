// tools/master-memory-diagnostic.js
// Master Memory System Diagnostic Tool for Echo Rubicon
// Combines all diagnostic capabilities into one comprehensive tool

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class MasterMemoryDiagnostic {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.logsDir = path.join(this.projectRoot, 'logs');
    this.vaultPath = 'D:\\Obsidian Vault';
    this.results = {
      timestamp: new Date().toISOString(),
      system: {
        projectRoot: this.projectRoot,
        vaultPath: this.vaultPath,
        nodeVersion: process.version,
        platform: process.platform
      },
      vault: {},
      capsules: {},
      memory: {},
      search: {},
      pipeline: {},
      architecture: {},
      issues: [],
      recommendations: []
    };
  }

  async run() {
    console.log('🔍 ECHO RUBICON MASTER MEMORY DIAGNOSTIC');
    console.log('=' .repeat(80));
    console.log(`Started: ${new Date().toLocaleString()}`);
    console.log(`Vault: ${this.vaultPath}`);
    console.log(`Project: ${this.projectRoot}`);
    console.log('=' .repeat(80) + '\n');

    try {
      // Ensure logs directory exists
      await fs.mkdir(this.logsDir, { recursive: true });

      // Run all diagnostic phases
      await this.phase1_VaultStructure();
      await this.phase2_CapsuleAnalysis();
      await this.phase3_MemorySystem();
      await this.phase4_SearchPipeline();
      await this.phase5_Architecture();
      await this.phase6_ContentAnalysis();
      await this.phase7_Integration();

      // Generate final report
      await this.generateReport();

    } catch (error) {
      console.error('❌ Fatal error:', error);
      this.results.fatalError = error.message;
    }
  }

  async phase1_VaultStructure() {
    console.log('\n📁 PHASE 1: VAULT STRUCTURE ANALYSIS');
    console.log('-'.repeat(40));

    try {
      const folders = await fs.readdir(this.vaultPath);
      let totalMdFiles = 0;
      let totalJsonFiles = 0;

      for (const folder of folders) {
        const folderPath = path.join(this.vaultPath, folder);
        const stats = await fs.stat(folderPath);
        
        if (stats.isDirectory()) {
          const files = await fs.readdir(folderPath).catch(() => []);
          const mdFiles = files.filter(f => f.endsWith('.md'));
          const jsonFiles = files.filter(f => f.endsWith('.json'));
          const chaosFiles = files.filter(f => f.includes('.chaos.json'));
          
          totalMdFiles += mdFiles.length;
          totalJsonFiles += jsonFiles.length;

          this.results.vault[folder] = {
            mdCount: mdFiles.length,
            jsonCount: jsonFiles.length,
            chaosCount: chaosFiles.length,
            sampleFiles: mdFiles.slice(0, 3),
            isEmpty: mdFiles.length === 0 && jsonFiles.length === 0
          };

          // Special folders check
          if (folder === 'Foods' && mdFiles.length > 0) {
            console.log(`✅ Foods folder: ${mdFiles.length} recipes found`);
            this.results.vault.Foods.recipes = mdFiles.map(f => f.replace('.md', ''));
          }
          if (folder === 'clients' && mdFiles.length > 0) {
            console.log(`✅ Clients folder: ${mdFiles.length} client files`);
          }
        }
      }

      console.log(`\n📊 Vault Summary:`);
      console.log(`   Total folders: ${Object.keys(this.results.vault).length}`);
      console.log(`   Total .md files: ${totalMdFiles}`);
      console.log(`   Total .json files: ${totalJsonFiles}`);

      // Check critical folders
      if (!this.results.vault['.echo']) {
        this.results.issues.push('Missing .echo folder - memory system not initialized');
      }

    } catch (error) {
      this.results.issues.push(`Vault structure error: ${error.message}`);
    }
  }

  async phase2_CapsuleAnalysis() {
    console.log('\n💊 PHASE 2: CAPSULE SYSTEM ANALYSIS');
    console.log('-'.repeat(40));

    try {
      const capsulesPath = path.join(this.vaultPath, '.echo', 'capsules');
      const indexPath = path.join(this.vaultPath, '.echo', 'index.json');
      
      // Check index
      let indexData = null;
      try {
        const indexContent = await fs.readFile(indexPath, 'utf8');
        indexData = JSON.parse(indexContent);
        this.results.capsules.indexExists = true;
        this.results.capsules.indexEntries = Object.keys(indexData.capsules || {}).length;
        console.log(`✅ Index found: ${this.results.capsules.indexEntries} entries`);
      } catch (e) {
        this.results.capsules.indexExists = false;
        this.results.issues.push('Capsule index missing or corrupted');
        console.log('❌ No capsule index found');
      }

      // Count actual capsule files
      let capsuleCount = 0;
      let capsuleTypes = {};
      let recipeCount = 0;
      let clientCount = 0;

      const scanDir = async (dir) => {
        try {
          const items = await fs.readdir(dir, { withFileTypes: true });
          for (const item of items) {
            if (item.isDirectory()) {
              await scanDir(path.join(dir, item.name));
            } else if (item.name.endsWith('.json') && !item.name.includes('index')) {
              capsuleCount++;
              
              // Sample capsule analysis
              if (capsuleCount <= 5) {
                try {
                  const content = JSON.parse(await fs.readFile(path.join(dir, item.name), 'utf8'));
                  const type = content.metadata?.contentType || content.type || 'unknown';
                  capsuleTypes[type] = (capsuleTypes[type] || 0) + 1;
                  
                  // Check for recipes
                  if (content.metadata?.contentType === 'recipe' || 
                      content.category === 'Foods' ||
                      (content.content && content.content.toLowerCase().includes('ingredients'))) {
                    recipeCount++;
                  }
                  
                  // Check for clients
                  if (content.metadata?.contentType === 'client' || 
                      content.category === 'clients') {
                    clientCount++;
                  }
                } catch (e) {}
              }
            }
          }
        } catch (e) {}
      };

      await scanDir(capsulesPath);

      this.results.capsules.fileCount = capsuleCount;
      this.results.capsules.types = capsuleTypes;
      this.results.capsules.recipes = recipeCount;
      this.results.capsules.clients = clientCount;

      console.log(`\n📊 Capsule Summary:`);
      console.log(`   Total capsules: ${capsuleCount}`);
      console.log(`   Recipe capsules: ${recipeCount}`);
      console.log(`   Client capsules: ${clientCount}`);
      console.log(`   Types:`, capsuleTypes);

      // Check for mismatches
      if (indexData && Math.abs(this.results.capsules.indexEntries - capsuleCount) > 5) {
        this.results.issues.push(`Index mismatch: ${this.results.capsules.indexEntries} indexed vs ${capsuleCount} files`);
      }

    } catch (error) {
      this.results.issues.push(`Capsule analysis error: ${error.message}`);
    }
  }

  async phase3_MemorySystem() {
    console.log('\n🧠 PHASE 3: MEMORY SYSTEM ANALYSIS');
    console.log('-'.repeat(40));

    try {
      // Test MemoryVaultManager
      const { MemoryVaultManager } = require('../src/memory/MemoryVaultManager');
      const vaultManager = new MemoryVaultManager(this.vaultPath);
      
      await vaultManager.ensureIndex();
      const capsuleCount = vaultManager.getCapsuleCount();
      
      console.log(`✅ MemoryVaultManager initialized`);
      console.log(`   Capsules in index: ${capsuleCount}`);

      // Test search functionality
      const testQueries = ['recipe', 'client', 'carnivore'];
      for (const query of testQueries) {
        const results = await vaultManager.searchMemories(query, { limit: 5 });
        this.results.memory[`search_${query}`] = {
          found: results.length,
          hasContent: results.some(r => r.content || r.summary)
        };
        console.log(`   Search "${query}": ${results.length} results`);
      }

      // Test recipe retrieval specifically
      const recipes = await vaultManager.getRecipes();
      this.results.memory.recipesFound = recipes.length;
      console.log(`   Direct recipe search: ${recipes.length} found`);

    } catch (error) {
      this.results.issues.push(`Memory system error: ${error.message}`);
      console.log('❌ Memory system failed:', error.message);
    }
  }

  async phase4_SearchPipeline() {
    console.log('\n🔍 PHASE 4: SEARCH PIPELINE ANALYSIS');
    console.log('-'.repeat(40));

    this.results.pipeline = {
      flow: [
        { step: 'User Query', example: 'what are my recipes?' },
        { step: 'IPC Handler', handler: 'chat:send', status: '?' },
        { step: 'Folder Detection', function: 'detectTargetFolder', result: 'Foods' },
        { step: 'Vault Search', function: 'searchSpecificFolder', status: '?' },
        { step: 'Memory Context', function: 'buildContextForInput', status: '?' },
        { step: 'AI Response', status: '?' }
      ],
      bottlenecks: []
    };

    // Check if search functions exist
    try {
      const ipcPath = path.join(this.projectRoot, 'main', 'ipc-handlers.js');
      const ipcContent = await fs.readFile(ipcPath, 'utf8');
      
      const functions = [
        'detectTargetFolder',
        'searchSpecificFolder',
        'buildContextForInput',
        'implementLayeredSearch'
      ];

      for (const func of functions) {
        if (ipcContent.includes(`function ${func}`)) {
          console.log(`✅ ${func} found`);
        } else {
          console.log(`❌ ${func} missing`);
          this.results.pipeline.bottlenecks.push(`Missing function: ${func}`);
        }
      }

      // Check for key patterns
      if (!ipcContent.includes('what are my')) {
        this.results.pipeline.bottlenecks.push('List query detection missing');
      }

    } catch (error) {
      this.results.issues.push(`Pipeline analysis error: ${error.message}`);
    }
  }

  async phase5_Architecture() {
    console.log('\n🏗️ PHASE 5: ARCHITECTURE ANALYSIS');
    console.log('-'.repeat(40));

    const components = {
      'Frontend Memory': ['src/echo/memory', 'components/memory'],
      'Backend Q-lib': ['backend/qlib', 'src/memory/QLibInterface.js'],
      'Vault Manager': ['src/memory/MemoryVaultManager.js'],
      'IPC Handlers': ['main/ipc-handlers.js'],
      'Chat System': ['src/memory/ChatOrchestrator.js']
    };

    for (const [name, paths] of Object.entries(components)) {
      let exists = false;
      for (const p of paths) {
        const fullPath = path.join(this.projectRoot, p);
        try {
          await fs.access(fullPath);
          exists = true;
          break;
        } catch (e) {}
      }
      
      this.results.architecture[name] = exists;
      console.log(`${exists ? '✅' : '❌'} ${name}`);
    }

    // Check for ChaosAnalyzer
    const chaosPath = path.join(this.projectRoot, 'backend/qlib/chaosanalyzer.js');
    try {
      const chaosContent = await fs.readFile(chaosPath, 'utf8');
      this.results.architecture.ChaosAnalyzer = chaosContent.includes('analyzeNote');
      console.log(`✅ ChaosAnalyzer found (${chaosContent.length} bytes)`);
    } catch (e) {
      this.results.architecture.ChaosAnalyzer = false;
      console.log('❌ ChaosAnalyzer missing');
    }
  }

  async phase6_ContentAnalysis() {
    console.log('\n📝 PHASE 6: CONTENT ANALYSIS');
    console.log('-'.repeat(40));

    // Sample a recipe file
    try {
      const foodsPath = path.join(this.vaultPath, 'Foods');
      const files = await fs.readdir(foodsPath);
      const recipeFile = files.find(f => f.toLowerCase().includes('carnivore') && f.endsWith('.md'));
      
      if (recipeFile) {
        const content = await fs.readFile(path.join(foodsPath, recipeFile), 'utf8');
        this.results.search.sampleRecipe = {
          file: recipeFile,
          size: content.length,
          hasIngredients: content.toLowerCase().includes('ingredient'),
          firstLine: content.split('\n')[0],
          contentPreview: content.substring(0, 200).replace(/\n/g, ' ')
        };
        console.log(`✅ Sample recipe: ${recipeFile}`);
        console.log(`   Size: ${content.length} chars`);
        console.log(`   First line: ${this.results.search.sampleRecipe.firstLine}`);
      }
    } catch (e) {
      console.log('❌ Could not sample recipe content');
    }
  }

  async phase7_Integration() {
    console.log('\n🔗 PHASE 7: INTEGRATION TESTS');
    console.log('-'.repeat(40));

    // Test the complete flow
    const integrationTests = [
      {
        name: 'Vault → Capsules',
        test: () => this.results.capsules.fileCount > 0,
        issue: 'No capsules created from vault'
      },
      {
        name: 'Capsules → Memory Search',
        test: () => this.results.memory.search_recipe?.found > 0,
        issue: 'Memory search not finding capsules'
      },
      {
        name: 'Recipe Detection',
        test: () => this.results.vault.Foods?.mdCount > 0 && this.results.memory.recipesFound > 0,
        issue: 'Recipes exist but not searchable'
      },
      {
        name: 'Index Integrity',
        test: () => Math.abs((this.results.capsules.indexEntries || 0) - this.results.capsules.fileCount) < 10,
        issue: 'Index out of sync with capsule files'
      }
    ];

    for (const test of integrationTests) {
      const passed = test.test();
      console.log(`${passed ? '✅' : '❌'} ${test.name}`);
      if (!passed) {
        this.results.issues.push(test.issue);
      }
    }
  }

  async generateReport() {
    console.log('\n📊 GENERATING FINAL REPORT');
    console.log('=' .repeat(80));

    // Summary
    console.log('\n🎯 KEY FINDINGS:');
    
    if (this.results.vault.Foods?.mdCount > 0) {
      console.log(`✅ ${this.results.vault.Foods.mdCount} recipes in vault`);
    }
    
    if (this.results.memory.recipesFound === 0 && this.results.vault.Foods?.mdCount > 0) {
      console.log('❌ Recipes exist but Q cannot see them');
      this.results.recommendations.push('Run capsule import to index vault files');
    }

    if (this.results.capsules.recipes === 0 && this.results.vault.Foods?.mdCount > 0) {
      console.log('❌ No recipe capsules found');
      this.results.recommendations.push('Recipe files need to be imported as capsules');
    }

    // Issues summary
    if (this.results.issues.length > 0) {
      console.log('\n⚠️ ISSUES FOUND:');
      this.results.issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    // Core fix for search
    if (this.results.pipeline.bottlenecks.includes('List query detection missing')) {
      this.results.recommendations.push(
        'Update searchSpecificFolder to return ALL files when query contains "what are my"'
      );
    }

    // Capsule import needed
    if (this.results.capsules.fileCount < this.results.vault.Foods?.mdCount) {
      this.results.recommendations.push(
        'Run vault import: node tools/import-vault-direct.js'
      );
    }

    // Index rebuild needed
    if (this.results.capsules.indexEntries !== this.results.capsules.fileCount) {
      this.results.recommendations.push(
        'Rebuild capsule index: await vaultManager.rebuildIndexFromDisk()'
      );
    }

    this.results.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });

    // Save detailed report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.logsDir, `memory-diagnostic-${timestamp}.json`);
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log(`\n💾 Full report saved to: ${reportPath}`);
    console.log('\n✅ DIAGNOSTIC COMPLETE\n');
  }
}

// Run the diagnostic
if (require.main === module) {
  const diagnostic = new MasterMemoryDiagnostic();
  diagnostic.run().catch(console.error);
}

module.exports = MasterMemoryDiagnostic;