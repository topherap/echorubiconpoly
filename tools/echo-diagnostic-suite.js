// echo-diagnostic-suite.js
// Comprehensive diagnostic and analysis tool for Echo Rubicon
// Version 3.1 - Enhanced with complete file mapping

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class EchoDiagnosticSuite {
  constructor() {
    this.projectRoot = 'C:\\Users\\tophe\\Documents\\Echo Rubicon';
    this.vaultPath = 'D:\\Obsidian Vault';
    this.toolsDir = 'C:\\Users\\tophe\\Documents\\tools';
    this.logsDir = 'C:\\Users\\tophe\\Documents\\logs';
    
    // Terminal colors
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m'
    };

    // Complete file inventory with all locations
    this.fileInventory = {
      memory: {
        core: [
          'src/memory/index.js',
          'src/memory/MemoryVaultManager.js',
          'src/memory/ContextBuilder.js',
          'src/memory/PromptBuilder.js',
          'src/memory/QLibInterface.js',
          'src/memory/ChatOrchestrator.js'
        ],
        echo: [
          'src/echo/memory/MemoryOrchestrator.js',
          'src/echo/memory/memory-runner.js',
          'src/echo/memory/memory-runner.mjs',
          'src/echo/memory/MemoryService.js',
          'src/echo/memory/MemoryWriter.js',
          'src/echo/memory/ModelInterface.js',
          'src/echo/memory/NoteTools.js',
          'src/echo/memory/VaultInterface.js',
          'src/echo/memory/api-wrapper.js',
          'src/echo/memory/capsuleRetriever.js',
          'src/echo/memory/capsuleRetriever2.js',
          'src/echo/memory/ContextInjector.js',
          'src/echo/memory/LoRAManager.js'
        ]
      },
      qlib: {
        core: [
          'backend/qlib/chaosanalyzer.js',
          'backend/qlib/contextInjector-memoryBlock-patch.js',
          'backend/qlib/epochClassifier.js',
          'backend/qlib/ipc-injection-folderDispatcher.js'
        ],
        retrieval: [
          'backend/qlib/folderLister.js',
          'backend/qlib/folderScopedRetriever.js',
          'backend/qlib/filterCapsulesByQuery.js',
          'backend/qlib/findExactCapsuleMatch.js',
          'backend/qlib/loadCapsules.js',
          'backend/qlib/rerankCapsulesByQuery.js'
        ],
        processing: [
          'backend/qlib/injectionScorer.js',
          'backend/qlib/loadVerbatimRules.js',
          'backend/qlib/retagger.js',
          'backend/qlib/semanticMapper.js',
          'backend/qlib/rustWatcherBridge.js'
        ],
        testing: [
          'backend/qlib/test-recipe-fix.js',
          'backend/qlib/auditCapsulePipeline.js',
          'backend/qlib/auditCapsulePipeline (1).js'
        ]
      },
      handlers: [
        'main/ipc-handlers.js',
        'main/handlers/chatSendHandler.js',
        'main/app.js',
        'main/windows.js'
      ],
      frontend: [
        'components/MyAIInterface.js',
        'components/MyAICore.js',
        'components/utils/VaultPathManager.js',
        'components/utils/identityManager.js'
      ]
    };

    // Analysis categories
    this.analysisCategories = {
      redundantSystems: [],
      unusedFiles: [],
      duplicateFunctionality: [],
      pipelineBreaks: [],
      performanceBottlenecks: []
    };

    // Diagnostic results structure
    this.diagnostics = {
      timestamp: new Date().toISOString(),
      fileAnalysis: {
        total: 0,
        existing: 0,
        missing: 0,
        orphaned: 0,
        redundant: 0
      },
      systemRedundancy: {
        memorySystemCount: 0,
        retrieverCount: 0,
        duplicatedLogic: []
      },
      hallucinations: {
        instances: [],
        patterns: [],
        contamination: {}
      },
      pipeline: {
        summary: {
          totalFiles: 0,
          livingFiles: 0,
          deadFiles: 0,
          orphanedFiles: 0,
          duplicates: 0,
          memoryLeaks: 0,
          hallucinatedCapsules: 0
        },
        files: {
          living: [],
          dead: [],
          orphaned: [],
          duplicates: [],
          hallucinated: []
        },
        flow: {
          working: [],
          broken: [],
          bottlenecks: []
        }
      },
      capsuleAnalysis: {
        total: 0,
        byType: {},
        byProject: {},
        scoreDistribution: {},
        emptyContent: 0,
        withHallucinations: 0
      },
      queries: {
        tested: [],
        failures: [],
        performance: {}
      },
      recommendations: {
        critical: [],
        high: [],
        medium: [],
        low: []
      }
    };

    this.startTime = Date.now();
  }

  // Terminal output helpers
  log(message, color = 'white') {
    console.log(`${this.colors[color]}${message}${this.colors.reset}`);
  }

  logSection(title) {
    console.log('\n' + '='.repeat(80));
    this.log(`  ${title}`, 'bright');
    console.log('='.repeat(80));
  }

  logSubsection(title) {
    console.log('\n' + '-'.repeat(60));
    this.log(`  ${title}`, 'cyan');
    console.log('-'.repeat(60));
  }

  async run() {
    this.log('\n🚀 ECHO RUBICON DIAGNOSTIC SUITE v3.1', 'bright');
    this.log(`Enhanced with complete file mapping | ${new Date().toLocaleString()}`, 'dim');
    
    try {
      await fs.mkdir(this.logsDir, { recursive: true });
      
      // Core diagnostic phases
      await this.phase1_SystemHealth();
      await this.phase2_FileInventoryAnalysis();
      await this.phase3_RedundancyDetection();
      await this.phase4_HallucinationDetection();
      await this.phase5_CapsuleIntegrity();
      await this.phase6_MemoryPipelineTrace();
      await this.phase7_QueryTesting();
      await this.phase8_RecipeSpecificDiagnostic();
      await this.phase9_PerformanceAnalysis();
      await this.phase10_DeepCodeAnalysis();
      await this.phase11_GenerateRecommendations();
      
      // Generate comprehensive reports
      await this.generateReports();
      
      this.logSection('DIAGNOSTIC COMPLETE');
      const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
      this.log(`Total execution time: ${duration}s`, 'green');
      
    } catch (error) {
      this.log(`\n❌ FATAL ERROR: ${error.message}`, 'red');
      console.error(error.stack);
    }
  }

  async phase1_SystemHealth() {
    this.logSection('PHASE 1: SYSTEM HEALTH CHECK');
    
    const health = {
      timestamp: new Date().toISOString(),
      node: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      paths: {
        project: await this.checkPath(this.projectRoot),
        vault: await this.checkPath(this.vaultPath),
        capsules: await this.checkPath(path.join(this.vaultPath, '.echo', 'capsules')),
        logs: await this.checkPath(this.logsDir)
      },
      services: {
        ollama: await this.checkOllama(),
        electronApp: await this.checkElectronApp()
      }
    };

    // Path verification
    for (const [name, exists] of Object.entries(health.paths)) {
      this.log(`  ${exists ? '✅' : '❌'} ${name}: ${exists ? 'accessible' : 'NOT FOUND'}`, 
                exists ? 'green' : 'red');
    }

    // Service checks
    this.log('\n  Service Status:', 'yellow');
    this.log(`    Ollama: ${health.services.ollama ? 'Running' : 'Not detected'}`, 
              health.services.ollama ? 'green' : 'red');
    this.log(`    Electron: ${health.services.electronApp ? 'Can be started' : 'Issues detected'}`,
              health.services.electronApp ? 'green' : 'yellow');

    this.diagnostics.health = health;
  }

  async phase2_FileInventoryAnalysis() {
    this.logSection('PHASE 2: FILE INVENTORY ANALYSIS');
    
    let totalFiles = 0;
    let existingFiles = 0;
    let missingFiles = [];
    
    for (const [category, subcategories] of Object.entries(this.fileInventory)) {
      this.logSubsection(`${category.toUpperCase()} Files`);
      
      if (Array.isArray(subcategories)) {
        // Direct file list
        for (const file of subcategories) {
          totalFiles++;
          const fullPath = path.join(this.projectRoot, file);
          const exists = await this.checkPath(fullPath);
          
          if (exists) {
            existingFiles++;
            const analysis = await this.analyzeComponent(fullPath);
            this.log(`  ✅ ${file} (${analysis.lines} lines, ${analysis.functions.length} functions)`, 'green');
          } else {
            missingFiles.push(file);
            this.log(`  ❌ ${file} - NOT FOUND`, 'red');
          }
        }
      } else {
        // Nested categories
        for (const [subcat, files] of Object.entries(subcategories)) {
          this.log(`\n  ${subcat}:`, 'yellow');
          
          for (const file of files) {
            totalFiles++;
            const fullPath = path.join(this.projectRoot, file);
            const exists = await this.checkPath(fullPath);
            
            if (exists) {
              existingFiles++;
              const analysis = await this.analyzeComponent(fullPath);
              this.log(`    ✅ ${path.basename(file)} (${analysis.functions.length} funcs)`, 'green');
              
              // Check for specific issues
              if (file.includes('capsuleRetriever') && file !== 'src/echo/memory/capsuleRetriever.js') {
                this.analysisCategories.redundantSystems.push({
                  type: 'duplicate_retriever',
                  files: ['capsuleRetriever.js', 'capsuleRetriever2.js']
                });
              }
            } else {
              missingFiles.push(file);
              this.log(`    ❌ ${path.basename(file)} - NOT FOUND`, 'red');
            }
          }
        }
      }
    }
    
    this.diagnostics.fileAnalysis.total = totalFiles;
    this.diagnostics.fileAnalysis.existing = existingFiles;
    this.diagnostics.fileAnalysis.missing = missingFiles.length;
    
    this.log(`\n  File Summary:`, 'yellow');
    this.log(`    Total tracked files: ${totalFiles}`, 'cyan');
    this.log(`    Existing files: ${existingFiles}`, 'green');
    this.log(`    Missing files: ${missingFiles.length}`, missingFiles.length > 0 ? 'red' : 'green');
  }

  async phase3_RedundancyDetection() {
    this.logSection('PHASE 3: REDUNDANCY DETECTION');
    
    this.logSubsection('Memory System Redundancy');
    
    // Check for multiple memory systems
    const memorySystems = [
      { name: 'MemoryVaultManager', file: 'src/memory/MemoryVaultManager.js' },
      { name: 'MemoryService', file: 'src/echo/memory/MemoryService.js' },
      { name: 'MemoryOrchestrator', file: 'src/echo/memory/MemoryOrchestrator.js' },
      { name: 'MemoryWriter', file: 'src/echo/memory/MemoryWriter.js' }
    ];
    
    let activeMemorySystems = 0;
    for (const system of memorySystems) {
      const fullPath = path.join(this.projectRoot, system.file);
      if (await this.checkPath(fullPath)) {
        activeMemorySystems++;
        const usage = await this.findSystemUsage(system.name);
        this.log(`  ${system.name}: ${usage.length} references`, usage.length > 5 ? 'yellow' : 'white');
        
        if (usage.length > 0) {
          this.diagnostics.systemRedundancy.duplicatedLogic.push({
            system: system.name,
            file: system.file,
            references: usage.length
          });
        }
      }
    }
    
    this.diagnostics.systemRedundancy.memorySystemCount = activeMemorySystems;
    
    // Check for multiple retrievers
    this.logSubsection('Capsule Retriever Redundancy');
    
    const retrievers = [
      'src/echo/memory/capsuleRetriever.js',
      'src/echo/memory/capsuleRetriever2.js',
      'backend/qlib/folderScopedRetriever.js',
      'backend/qlib/filterCapsulesByQuery.js',
      'backend/qlib/findExactCapsuleMatch.js'
    ];
    
    let activeRetrievers = 0;
    for (const retriever of retrievers) {
      const fullPath = path.join(this.projectRoot, retriever);
      if (await this.checkPath(fullPath)) {
        activeRetrievers++;
        this.log(`  ✅ ${path.basename(retriever)}`, 'yellow');
      }
    }
    
    this.diagnostics.systemRedundancy.retrieverCount = activeRetrievers;
    
    if (activeMemorySystems > 1) {
      this.diagnostics.recommendations.high.push({
        issue: `${activeMemorySystems} different memory systems detected`,
        action: 'Consolidate to single memory system (recommend MemoryVaultManager)',
        impact: 'Eliminates conflicts and improves maintainability'
      });
    }
    
    if (activeRetrievers > 2) {
      this.diagnostics.recommendations.high.push({
        issue: `${activeRetrievers} different retrieval systems detected`,
        action: 'Consolidate retrieval logic to single capsuleRetriever',
        impact: 'Simplifies search logic and improves performance'
      });
    }
  }

  async phase4_HallucinationDetection() {
    this.logSection('PHASE 4: HALLUCINATION DETECTION');
    
    // Known hallucination patterns
    const hallucinationPatterns = [
      { pattern: /Jane\s+(?:M\.\s+)?Kimani.*(?:politician|Kenyan|government)/i, type: 'jane-kimani-politician' },
      { pattern: /Spaghetti\s+Aglio\s+e\s+Olio/i, type: 'phantom-recipe' },
      { pattern: /I don't have access to your/i, type: 'access-denial' },
      { pattern: /\[INJECTED_MEMORY_CONTENT\]/i, type: 'raw-placeholder' },
      { pattern: /Based on the available information.*don't have/i, type: 'false-negative' }
    ];

    this.logSubsection('Scanning Capsules for Hallucinations');
    
    const capsulePaths = [
      path.join(this.vaultPath, '.echo', 'capsules'),
      path.join(this.vaultPath, '.echo', 'projects', 'clients', 'capsules'),
      path.join(this.vaultPath, '.echo', 'projects', 'general', 'capsules')
    ];

    let totalScanned = 0;
    let hallucinatedCount = 0;

    for (const capsulePath of capsulePaths) {
      if (!await this.checkPath(capsulePath)) continue;
      
      const files = await this.walkDirectory(capsulePath, '.json');
      this.log(`\n  Scanning ${path.basename(path.dirname(capsulePath))}/${path.basename(capsulePath)}: ${files.length} files`, 'cyan');
      
      for (const file of files) {
        totalScanned++;
        try {
          const content = await fs.readFile(file, 'utf8');
          const capsule = JSON.parse(content);
          
          // Check all text fields for hallucinations
          const textToCheck = [
            capsule.content,
            capsule.summary,
            capsule.response,
            JSON.stringify(capsule.messages || [])
          ].join(' ');
          
          for (const hp of hallucinationPatterns) {
            if (hp.pattern.test(textToCheck)) {
              hallucinatedCount++;
              this.diagnostics.hallucinations.instances.push({
                file: path.relative(this.vaultPath, file),
                capsuleId: capsule.id,
                type: hp.type,
                timestamp: capsule.timestamp,
                snippet: textToCheck.substring(0, 200)
              });
              
              this.diagnostics.pipeline.files.hallucinated.push(file);
              this.log(`    🧠 Found ${hp.type} in ${path.basename(file)}`, 'yellow');
              break;
            }
          }
          
        } catch (e) {
          this.log(`    ❌ Error reading ${path.basename(file)}: ${e.message}`, 'red');
        }
      }
    }

    this.log(`\n  Hallucination Summary:`, 'yellow');
    this.log(`    Total capsules scanned: ${totalScanned}`, 'white');
    this.log(`    Hallucinated capsules: ${hallucinatedCount} (${(hallucinatedCount/totalScanned*100).toFixed(1)}%)`, 
              hallucinatedCount > 0 ? 'red' : 'green');
    
    this.diagnostics.pipeline.summary.hallucinatedCapsules = hallucinatedCount;
  }

  async phase5_CapsuleIntegrity() {
    this.logSection('PHASE 5: CAPSULE INTEGRITY ANALYSIS');
    
    const capsuleStats = {
      total: 0,
      valid: 0,
      corrupted: 0,
      empty: 0,
      missingType: 0,
      duplicates: new Map()
    };

    this.logSubsection('Analyzing Capsule Structure');
    
    const capsulePath = path.join(this.vaultPath, '.echo', 'capsules');
    const files = await this.walkDirectory(capsulePath, '.json');
    
    // Also check for orphaned chaos files
    const chaosFiles = await this.walkDirectory(this.vaultPath, '.chaos.json');
    this.log(`\n  Found ${chaosFiles.length} orphaned .chaos.json files`, chaosFiles.length > 0 ? 'yellow' : 'green');
    
    for (const file of files) {
      capsuleStats.total++;
      
      try {
        const content = await fs.readFile(file, 'utf8');
        const capsule = JSON.parse(content);
        
        // Validate structure
        const hasId = !!capsule.id;
        const hasContent = !!(capsule.content || capsule.summary || capsule.messages);
        const hasType = !!(capsule.type || capsule.metadata?.type);
        const hasTimestamp = !!capsule.timestamp;
        
        if (!hasContent) {
          capsuleStats.empty++;
          this.diagnostics.pipeline.files.dead.push({
            path: file,
            reason: 'Empty content'
          });
        }
        
        if (!hasType) {
          capsuleStats.missingType++;
          this.log(`    ⚠️  Missing type: ${path.basename(file)}`, 'yellow');
        }
        
        if (hasId && hasContent && hasType && hasTimestamp) {
          capsuleStats.valid++;
          
          // Check for duplicates
          const hash = crypto.createHash('md5')
            .update(capsule.content || capsule.summary || '')
            .digest('hex');
          
          if (capsuleStats.duplicates.has(hash)) {
            this.diagnostics.pipeline.files.duplicates.push({
              original: capsuleStats.duplicates.get(hash),
              duplicate: file,
              hash
            });
          } else {
            capsuleStats.duplicates.set(hash, file);
          }
        } else {
          capsuleStats.corrupted++;
        }
        
        // Type distribution
        const type = capsule.type || capsule.metadata?.type || 'unknown';
        this.diagnostics.capsuleAnalysis.byType[type] = 
          (this.diagnostics.capsuleAnalysis.byType[type] || 0) + 1;
        
        // Check chaosScore distribution
        const chaosScore = capsule.metadata?.chaosScore || capsule.chaosScore || 0.5;
        const bucket = Math.floor(chaosScore * 10) / 10;
        this.diagnostics.capsuleAnalysis.scoreDistribution[bucket] = 
          (this.diagnostics.capsuleAnalysis.scoreDistribution[bucket] || 0) + 1;
        
      } catch (e) {
        capsuleStats.corrupted++;
        this.diagnostics.pipeline.files.dead.push({
          path: file,
          reason: `Parse error: ${e.message}`
        });
      }
    }
    
    this.log(`\n  Capsule Integrity:`, 'yellow');
    this.log(`    Valid: ${capsuleStats.valid} (${(capsuleStats.valid/capsuleStats.total*100).toFixed(1)}%)`, 'green');
    this.log(`    Corrupted: ${capsuleStats.corrupted}`, capsuleStats.corrupted > 0 ? 'red' : 'green');
    this.log(`    Empty: ${capsuleStats.empty}`, capsuleStats.empty > 0 ? 'yellow' : 'green');
    this.log(`    Missing type: ${capsuleStats.missingType}`, capsuleStats.missingType > 0 ? 'yellow' : 'green');
    this.log(`    Duplicates: ${this.diagnostics.pipeline.files.duplicates.length}`, 'cyan');
    
    this.diagnostics.capsuleAnalysis.total = capsuleStats.total;
    this.diagnostics.capsuleAnalysis.emptyContent = capsuleStats.empty;
  }

  async phase6_MemoryPipelineTrace() {
    this.logSection('PHASE 6: MEMORY PIPELINE TRACE');
    
    const pipelineStages = [
      { 
        stage: 'Input',
        components: ['MyAIInterface.js', 'MyAICore.js'],
        ipc: 'chat:send'
      },
      {
        stage: 'IPC Routing',
        components: ['ipc-handlers.js'],
        handler: 'chatSendHandler'
      },
      {
        stage: 'Memory Search',
        components: ['MemoryVaultManager.js', 'MemoryService.js'],
        method: 'searchMemories'
      },
      {
        stage: 'Capsule Retrieval',
        components: ['capsuleRetriever.js', 'folderScopedRetriever.js'],
        method: 'retrieveRelevantCapsules'
      },
      {
        stage: 'Context Building',
        components: ['ContextBuilder.js', 'ContextInjector.js'],
        method: 'buildContext'
      },
      {
        stage: 'Prompt Injection',
        components: ['PromptBuilder.js', 'chatSendHandler.js'],
        method: 'injectMemory'
      }
    ];

    this.logSubsection('Pipeline Stage Analysis');
    
    for (const stage of pipelineStages) {
      this.log(`\n  ${stage.stage}:`, 'yellow');
      
      let stageWorking = true;
      for (const component of stage.components) {
        const found = await this.findFileContaining(component);
        if (found) {
          this.log(`    ✅ ${component}`, 'green');
        } else {
          this.log(`    ❌ ${component} - NOT FOUND`, 'red');
          stageWorking = false;
          
          this.diagnostics.pipeline.flow.broken.push({
            stage: stage.stage,
            component: component,
            impact: 'Pipeline break - memory may not flow through'
          });
        }
      }
      
      if (stage.method) {
        const hasMethod = await this.checkMethodExists(stage.method);
        this.log(`    ${hasMethod ? '✅' : '❌'} Method: ${stage.method}()`, 
                  hasMethod ? 'green' : 'red');
                  
        if (!hasMethod) {
          this.diagnostics.pipeline.flow.bottlenecks.push({
            stage: stage.stage,
            missing: stage.method,
            impact: 'Critical method missing'
          });
        }
      }
    }
    
    // Check specific pipeline connections
    await this.tracePipelineConnections();
  }

  async phase7_QueryTesting() {
    this.logSection('PHASE 7: QUERY TESTING & VALIDATION');
    
    const testQueries = [
      { 
        query: 'what are my recipes?', 
        expectedType: 'recipe',
        shouldFind: ['Bacon Wrapped Halloumi', 'carnivore ice cream'],
        shouldNotFind: ['Spaghetti Aglio e Olio']
      },
      {
        query: 'list all my clients',
        expectedType: 'client',
        shouldFind: ['Angela Smith', 'John Doe'],
        shouldNotFind: ['Jane Kimani politician']
      },
      {
        query: 'Jane Kimani',
        expectedType: 'specific',
        shouldFind: ['attorney', 'compliance'],
        shouldNotFind: ['politician', 'Kenyan government']
      }
    ];

    this.logSubsection('Query Pattern Testing');
    
    for (const test of testQueries) {
      this.log(`\n  Testing: "${test.query}"`, 'cyan');
      
      // Test capsule retrieval
      const results = await this.testCapsuleRetrieval(test.query);
      
      const testResult = {
        query: test.query,
        expectedType: test.expectedType,
        capsulesFound: results.length,
        correctResults: 0,
        hallucinations: 0,
        performance: results.timeMs
      };
      
      // Validate results
      for (const result of results.capsules) {
        const content = JSON.stringify(result).toLowerCase();
        
        // Check for expected content
        let hasExpected = false;
        for (const expected of test.shouldFind) {
          if (content.includes(expected.toLowerCase())) {
            hasExpected = true;
            testResult.correctResults++;
            break;
          }
        }
        
        // Check for hallucinations
        for (const hallucination of test.shouldNotFind) {
          if (content.includes(hallucination.toLowerCase())) {
            testResult.hallucinations++;
            this.log(`    🧠 Hallucination found: ${hallucination}`, 'red');
          }
        }
      }
      
      const status = testResult.hallucinations === 0 && testResult.correctResults > 0 ? '✅' : '❌';
      this.log(`  ${status} Results: ${testResult.correctResults} correct, ${testResult.hallucinations} hallucinations`, 
                testResult.hallucinations === 0 ? 'green' : 'red');
      
      this.diagnostics.queries.tested.push(testResult);
      
      if (testResult.hallucinations > 0 || testResult.correctResults === 0) {
        this.diagnostics.queries.failures.push(test.query);
      }
    }
  }

  async phase8_RecipeSpecificDiagnostic() {
    this.logSection('PHASE 8: RECIPE-SPECIFIC DIAGNOSTIC');
    
    this.logSubsection('Recipe Capsule Analysis');
    
    // Check Foods folder
    const foodsPath = path.join(this.vaultPath, 'Foods');
    const recipeFiles = await this.walkDirectory(foodsPath, '.md');
    this.log(`  Recipe files in Foods folder: ${recipeFiles.length}`, 'cyan');
    
    // Check recipe capsules
    const capsulePath = path.join(this.vaultPath, '.echo', 'capsules');
    const allCapsules = await this.walkDirectory(capsulePath, '.json');
    
    let recipeCapsules = 0;
    let recipeCapsulesWithType = 0;
    let recipeCapsulesFound = [];
    
    for (const file of allCapsules) {
      if (path.basename(file).startsWith('recipe-')) {
        recipeCapsules++;
        
        try {
          const content = await fs.readFile(file, 'utf8');
          const capsule = JSON.parse(content);
          
          if (capsule.type === 'recipe' || capsule.metadata?.type === 'recipe') {
            recipeCapsulesWithType++;
          }
          
          recipeCapsulesFound.push({
            id: capsule.id,
            type: capsule.type,
            metadataType: capsule.metadata?.type,
            hasContent: !!capsule.content,
            recipeName: capsule.metadata?.recipeName || 'Unknown'
          });
          
        } catch (e) {
          this.log(`    ❌ Error reading recipe capsule: ${e.message}`, 'red');
        }
      }
    }
    
    this.log(`\n  Recipe Capsule Status:`, 'yellow');
    this.log(`    Total recipe capsules: ${recipeCapsules}`, 'cyan');
    this.log(`    With proper type field: ${recipeCapsulesWithType}`, 
              recipeCapsulesWithType === recipeCapsules ? 'green' : 'yellow');
    
    // Test calculateRelevance implementation
    const calcRelevancePath = path.join(this.projectRoot, 'src/echo/memory/capsuleRetriever.js');
    if (await this.checkPath(calcRelevancePath)) {
      const content = await fs.readFile(calcRelevancePath, 'utf8');
      
      this.log(`\n  calculateRelevance Implementation Check:`, 'yellow');
      
      const hasTypeMatching = content.includes('capsule.type') && 
                            content.includes('typeMatch') &&
                            content.includes('queryLower.includes(capsuleType)');
      
      this.log(`    ${hasTypeMatching ? '✅' : '❌'} Type matching logic implemented`, 
                hasTypeMatching ? 'green' : 'red');
      
      const weightCheck = content.match(/typeMatch:\s*([\d.]+)/);
      if (weightCheck) {
        const weight = parseFloat(weightCheck[1]);
        this.log(`    Type match weight: ${weight}`, weight >= 0.3 ? 'green' : 'yellow');
        
        if (weight < 0.3) {
          this.diagnostics.recommendations.critical.push({
            issue: 'Type match weight too low for effective matching',
            action: 'Increase typeMatch weight to at least 0.3',
            impact: 'Ensures typed queries return relevant results'
          });
        }
      }
    }
    
    // Test with actual recipe capsule
    if (recipeCapsulesFound.length > 0) {
      this.log(`\n  Testing Relevance Calculation:`, 'yellow');
      const testCapsule = recipeCapsulesFound[0];
      const relevance = await this.testRelevanceCalculation(testCapsule, 'what are my recipes?');
      this.log(`    Sample capsule relevance score: ${relevance.toFixed(2)}`, 
                relevance > 0.1 ? 'green' : 'red');
    }
  }

  async phase9_PerformanceAnalysis() {
    this.logSection('PHASE 9: PERFORMANCE ANALYSIS');
    
    const metrics = {
      fileIO: {},
      indexSize: {},
      searchSpeed: {},
      memoryUsage: {}
    };

    this.logSubsection('System Performance Metrics');
    
    // Memory usage
    const memUsage = process.memoryUsage();
    metrics.memoryUsage = {
      heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
      heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2) + 'MB',
      external: (memUsage.external / 1024 / 1024).toFixed(2) + 'MB'
    };
    
    this.log(`  Heap Used: ${metrics.memoryUsage.heapUsed}`, 'cyan');
    this.log(`  Heap Total: ${metrics.memoryUsage.heapTotal}`, 'cyan');
    
    // Check index performance
    this.logSubsection('Index Performance');
    
    const indexPath = path.join(this.vaultPath, '.echo', 'index.json');
    if (await this.checkPath(indexPath)) {
      const stats = await fs.stat(indexPath);
      const content = await fs.readFile(indexPath, 'utf8');
      const index = JSON.parse(content);
      
      metrics.indexSize = {
        fileSize: (stats.size / 1024).toFixed(2) + 'KB',
        entries: Object.keys(index).length,
        lastModified: stats.mtime
      };
      
      this.log(`  Index size: ${metrics.indexSize.fileSize}`, 'cyan');
      this.log(`  Index entries: ${metrics.indexSize.entries}`, 'cyan');
      this.log(`  Last updated: ${new Date(stats.mtime).toLocaleString()}`, 'dim');
    }

    // Test search performance
    this.logSubsection('Search Performance');
    
    const searchTests = ['recipe', 'client', 'lift'];
    for (const term of searchTests) {
      const start = Date.now();
      await this.testCapsuleRetrieval(term);
      const elapsed = Date.now() - start;
      
      metrics.searchSpeed[term] = elapsed;
      this.log(`  "${term}" search: ${elapsed}ms`, elapsed < 100 ? 'green' : 'yellow');
    }
    
    // File I/O test
    const testFile = path.join(this.vaultPath, '.echo', 'test-perf.json');
    const writeStart = Date.now();
    await fs.writeFile(testFile, JSON.stringify({ test: true }));
    metrics.fileIO.writeTime = Date.now() - writeStart;
    
    const readStart = Date.now();
    await fs.readFile(testFile, 'utf8');
    metrics.fileIO.readTime = Date.now() - readStart;
    
    await fs.unlink(testFile).catch(() => {});
    
    this.log(`\n  File I/O Performance:`, 'yellow');
    this.log(`    Write: ${metrics.fileIO.writeTime}ms`, 'cyan');
    this.log(`    Read: ${metrics.fileIO.readTime}ms`, 'cyan');
    
    this.diagnostics.queries.performance = metrics;
  }

  async phase10_DeepCodeAnalysis() {
    this.logSection('PHASE 10: DEEP CODE ANALYSIS');
    
    this.logSubsection('Critical Path Analysis');
    
    // Trace the complete path from input to response
    const criticalPath = [
      { 
        step: 'User types query',
        file: 'components/MyAIInterface.js',
        method: 'sendVoiceCommand'
      },
      {
        step: 'IPC message sent',
        file: 'main/ipc-handlers.js',
        method: 'chat:send handler'
      },
      {
        step: 'Memory context built',
        file: 'src/memory/index.js',
        method: 'buildContextForInput'
      },
      {
        step: 'Capsules retrieved',
        file: 'src/echo/memory/capsuleRetriever.js',
        method: 'retrieveRelevantCapsules'
      },
      {
        step: 'Relevance calculated',
        file: 'src/echo/memory/capsuleRetriever.js',
        method: 'calculateRelevance'
      },
      {
        step: 'Context injected',
        file: 'main/handlers/chatSendHandler.js',
        method: 'memory injection'
      },
      {
        step: 'Model called',
        file: 'main/handlers/chatSendHandler.js',
        method: 'callOllamaModel'
      }
    ];
    
    let pathComplete = true;
    for (const step of criticalPath) {
      const fullPath = path.join(this.projectRoot, step.file);
      const exists = await this.checkPath(fullPath);
      
      let hasMethod = false;
      if (exists && step.method) {
        const content = await fs.readFile(fullPath, 'utf8');
        hasMethod = content.includes(step.method.split(' ')[0]);
      }
      
      const status = exists && (!step.method || hasMethod);
      this.log(`  ${status ? '✅' : '❌'} ${step.step}`, status ? 'green' : 'red');
      
      if (!status) {
        pathComplete = false;
        this.diagnostics.pipeline.flow.broken.push({
          step: step.step,
          file: step.file,
          method: step.method,
          impact: 'Critical path broken'
        });
      }
    }
    
    if (!pathComplete) {
      this.diagnostics.recommendations.critical.push({
        issue: 'Critical path from input to response is broken',
        action: 'Fix missing components in the pipeline',
        impact: 'System cannot process queries end-to-end'
      });
    }
    
    // Check for common code issues
    this.logSubsection('Common Issues Check');
    
    const issues = await this.checkCommonIssues();
    for (const issue of issues) {
      this.log(`  ${issue.severity === 'error' ? '❌' : '⚠️'} ${issue.description}`, 
                issue.severity === 'error' ? 'red' : 'yellow');
    }
  }

  async phase11_GenerateRecommendations() {
    this.logSection('PHASE 11: GENERATING RECOMMENDATIONS');
    
    const recs = this.diagnostics.recommendations;
    
    // Critical recommendations based on findings
    if (this.diagnostics.pipeline.summary.hallucinatedCapsules > 0) {
      recs.critical.push({
        issue: `${this.diagnostics.pipeline.summary.hallucinatedCapsules} hallucinated capsules contaminating memory`,
        action: 'Run hallucination cleanup script to remove contaminated capsules',
        command: 'node tools/cleanup-hallucinations.js',
        impact: 'Prevents false information from being returned in queries'
      });
    }
    
    if (this.diagnostics.queries.failures.length > 0) {
      recs.critical.push({
        issue: 'Recipe queries returning no results despite capsules existing',
        action: 'Verify calculateRelevance function includes type matching logic',
        code: `
// Add to calculateRelevance after weights definition:
if (capsule.type || capsule.metadata?.type) {
  const capsuleType = (capsule.type || capsule.metadata?.type || '').toLowerCase();
  if (queryLower.includes(capsuleType) || 
      queryLower.includes(capsuleType + 's') ||
      queryLower.includes(capsuleType.replace(/s$/, ''))) {
    score += weights.typeMatch;
  }
}`,
        impact: 'Enables recipe and other typed queries to work correctly'
      });
    }
    
    // System redundancy recommendations
    if (this.diagnostics.systemRedundancy.memorySystemCount > 2) {
      recs.high.push({
        issue: `${this.diagnostics.systemRedundancy.memorySystemCount} redundant memory systems`,
        action: 'Archive unused memory systems and consolidate to MemoryVaultManager',
        files: this.diagnostics.systemRedundancy.duplicatedLogic.map(d => d.file),
        impact: 'Reduces complexity and maintenance burden'
      });
    }
    
    if (this.diagnostics.systemRedundancy.retrieverCount > 2) {
      recs.high.push({
        issue: `${this.diagnostics.systemRedundancy.retrieverCount} redundant retrieval systems`,
        action: 'Consolidate to single capsuleRetriever.js',
        files: [
          'capsuleRetriever2.js - archive',
          'folderScopedRetriever.js - integrate useful features',
          'filterCapsulesByQuery.js - merge logic'
        ],
        impact: 'Simplifies search path and improves performance'
      });
    }
    
    // File organization
    if (this.diagnostics.fileAnalysis.missing > 0) {
      recs.medium.push({
        issue: `${this.diagnostics.fileAnalysis.missing} tracked files are missing`,
        action: 'Review and remove references to missing files',
        impact: 'Prevents runtime errors from missing dependencies'
      });
    }
    
    // Performance recommendations
    if (this.diagnostics.queries.performance?.searchSpeed) {
      const slowSearches = Object.entries(this.diagnostics.queries.performance.searchSpeed)
        .filter(([term, time]) => time > 100);
      
      if (slowSearches.length > 0) {
        recs.medium.push({
          issue: 'Slow search performance detected',
          action: 'Implement caching layer for frequent queries',
          details: `Slow terms: ${slowSearches.map(([t, time]) => `${t} (${time}ms)`).join(', ')}`,
          impact: 'Improves response time for common queries'
        });
      }
    }
    
    // Print recommendations
    const priorities = ['critical', 'high', 'medium', 'low'];
    for (const priority of priorities) {
      if (recs[priority].length > 0) {
        this.logSubsection(`${priority.toUpperCase()} Priority`);
        for (const rec of recs[priority]) {
          this.log(`\n  Issue: ${rec.issue}`, priority === 'critical' ? 'red' : 'yellow');
          this.log(`  Action: ${rec.action}`, 'white');
          if (rec.command) {
            this.log(`  Command: ${rec.command}`, 'cyan');
          }
          if (rec.code) {
            this.log(`  Code fix:`, 'cyan');
            console.log(rec.code);
          }
          if (rec.files) {
            this.log(`  Files involved:`, 'cyan');
            rec.files.forEach(f => this.log(`    - ${f}`, 'dim'));
          }
          this.log(`  Impact: ${rec.impact}`, 'dim');
        }
      }
    }
  }

  // Helper methods
  async checkPath(filepath) {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  async checkOllama() {
    try {
      const { stdout } = await execPromise('ollama list');
      return stdout.includes('NAME');
    } catch {
      return false;
    }
  }

  async checkElectronApp() {
    const mainPath = path.join(this.projectRoot, 'main.js');
    return await this.checkPath(mainPath);
  }

  async walkDirectory(dir, extension = '') {
    const files = [];
    
    async function walk(currentDir) {
      try {
        const items = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(currentDir, item.name);
          
          if (item.isDirectory() && !item.name.startsWith('.')) {
            await walk(fullPath);
          } else if (item.isFile() && item.name.endsWith(extension)) {
            files.push(fullPath);
          }
        }
      } catch (e) {}
    }
    
    await walk(dir);
    return files;
  }

  async analyzeComponent(filepath) {
    try {
      const content = await fs.readFile(filepath, 'utf8');
      const lines = content.split('\n').length;
      
      const functionMatches = content.match(/(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/g) || [];
      const functions = functionMatches.map(m => {
        const match = m.match(/(\w+)\s*(?:=|\()/);
        return match ? match[1] : null;
      }).filter(Boolean);
      
      // Check for imports/requires
      const imports = [];
      const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      let match;
      while ((match = requirePattern.exec(content)) !== null) {
        imports.push(match[1]);
      }
      
      return {
        lines,
        functions: [...new Set(functions)],
        imports: [...new Set(imports)]
      };
    } catch (e) {
      return { lines: 0, functions: [], imports: [] };
    }
  }

  async findSystemUsage(systemName) {
    const locations = [];
    const searchDirs = [
      path.join(this.projectRoot, 'src'),
      path.join(this.projectRoot, 'main'),
      path.join(this.projectRoot, 'components'),
      path.join(this.projectRoot, 'backend')
    ];

    for (const dir of searchDirs) {
      const files = await this.walkDirectory(dir, '.js');
      
      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf8');
          if (content.includes(systemName)) {
            locations.push(path.relative(this.projectRoot, file));
          }
        } catch (e) {}
      }
    }

    return locations;
  }

  async findFileContaining(filename) {
    const files = await this.walkDirectory(this.projectRoot, '.js');
    
    for (const file of files) {
      if (path.basename(file) === filename) {
        return file;
      }
    }
    
    return null;
  }

  async checkMethodExists(methodName) {
    const files = await this.walkDirectory(this.projectRoot, '.js');
    
    for (const file of files.slice(0, 100)) { // Check first 100 files
      try {
        const content = await fs.readFile(file, 'utf8');
        if (content.includes(methodName)) {
          return true;
        }
      } catch (e) {}
    }
    
    return false;
  }

  async tracePipelineConnections() {
    this.logSubsection('Pipeline Connection Analysis');
    
    const connections = [
      { from: 'chat:send', to: 'buildContextForInput', description: 'IPC to Memory' },
      { from: 'buildContextForInput', to: 'searchMemories', description: 'Memory to Search' },
      { from: 'searchMemories', to: 'retrieveRelevantCapsules', description: 'Search to Retrieval' },
      { from: 'retrieveRelevantCapsules', to: 'calculateRelevance', description: 'Retrieval to Scoring' }
    ];
    
    for (const conn of connections) {
      const exists = await this.checkConnection(conn.from, conn.to);
      
      if (!exists) {
        this.diagnostics.pipeline.flow.bottlenecks.push({
          break: `${conn.from} → ${conn.to}`,
          description: conn.description
        });
      }
      
      this.log(`  ${exists ? '✅' : '❌'} ${conn.description}`, exists ? 'green' : 'red');
    }
  }

  async checkConnection(from, to) {
    // Simplified connection check
    const files = await this.walkDirectory(this.projectRoot, '.js');
    
    for (const file of files.slice(0, 50)) { // Check first 50 files
      try {
        const content = await fs.readFile(file, 'utf8');
        if (content.includes(from) && content.includes(to)) {
          return true;
        }
      } catch (e) {}
    }
    
    return false;
  }

  async testCapsuleRetrieval(query) {
    const start = Date.now();
    const capsules = [];
    
    // Simulate capsule retrieval
    const capsulePath = path.join(this.vaultPath, '.echo', 'capsules');
    const files = await this.walkDirectory(capsulePath, '.json');
    
    for (const file of files.slice(0, 20)) { // Test first 20
      try {
        const content = await fs.readFile(file, 'utf8');
        const capsule = JSON.parse(content);
        
        if (JSON.stringify(capsule).toLowerCase().includes(query.toLowerCase())) {
          capsules.push(capsule);
        }
      } catch (e) {}
    }
    
    return {
      capsules,
      timeMs: Date.now() - start
    };
  }

  async testRelevanceCalculation(capsule, query) {
    // Simulate relevance calculation
    let score = 0;
    const queryLower = query.toLowerCase();
    const capsuleType = (capsule.type || capsule.metadataType || '').toLowerCase();
    
    // Type matching
    if (capsuleType && (queryLower.includes(capsuleType) || queryLower.includes(capsuleType + 's'))) {
      score += 0.35;
    }
    
    // Content matching
    if (capsule.hasContent) {
      score += 0.1;
    }
    
    return score;
  }

  async checkCommonIssues() {
    const issues = [];
    
    // Check for Q-lib initialization error
    const appFile = path.join(this.projectRoot, 'main', 'app.js');
    if (await this.checkPath(appFile)) {
      const content = await fs.readFile(appFile, 'utf8');
      if (content.includes('getQlibInstance is not a function')) {
        issues.push({
          severity: 'error',
          description: 'Q-lib initialization failure detected',
          location: 'main/app.js'
        });
      }
    }
    
    // Check for minScore null error
    const handlers = path.join(this.projectRoot, 'main', 'ipc-handlers.js');
    if (await this.checkPath(handlers)) {
      const content = await fs.readFile(handlers, 'utf8');
      if (!content.includes('minScore || 0') && !content.includes('minScore ?? 0')) {
        issues.push({
          severity: 'warning',
          description: 'minScore null reference vulnerability',
          location: 'main/ipc-handlers.js',
          fix: 'Add: const minScore = options?.minScore || 0.01;'
        });
      }
    }
    
    // Check for duplicate capsule retrievers
    const retriever1 = path.join(this.projectRoot, 'src/echo/memory/capsuleRetriever.js');
    const retriever2 = path.join(this.projectRoot, 'src/echo/memory/capsuleRetriever2.js');
    
    if (await this.checkPath(retriever1) && await this.checkPath(retriever2)) {
      issues.push({
        severity: 'warning',
        description: 'Multiple capsule retrievers detected (capsuleRetriever.js and capsuleRetriever2.js)',
        location: 'src/echo/memory/',
        fix: 'Consolidate to single retriever or archive unused version'
      });
    }
    
    return issues;
  }

  async generateReports() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Generate comprehensive markdown report
    const mdPath = path.join(this.logsDir, `echo-diagnostic-${timestamp}.md`);
    let markdown = `# Echo Rubicon Diagnostic Report\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
    markdown += `**Duration:** ${((Date.now() - this.startTime) / 1000).toFixed(2)}s\n\n`;
    
    // Executive Summary
    markdown += `## Executive Summary\n\n`;
    markdown += `### System Overview\n`;
    markdown += `- Total Files Tracked: ${this.diagnostics.fileAnalysis.total}\n`;
    markdown += `- Files Present: ${this.diagnostics.fileAnalysis.existing}\n`;
    markdown += `- Files Missing: ${this.diagnostics.fileAnalysis.missing}\n`;
    markdown += `- Memory Systems: ${this.diagnostics.systemRedundancy.memorySystemCount}\n`;
    markdown += `- Retrieval Systems: ${this.diagnostics.systemRedundancy.retrieverCount}\n\n`;
    
    markdown += `### Critical Issues\n`;
    markdown += `- Hallucinated Capsules: ${this.diagnostics.pipeline.summary.hallucinatedCapsules}\n`;
    markdown += `- Failed Queries: ${this.diagnostics.queries.failures.length}\n`;
    markdown += `- Pipeline Breaks: ${this.diagnostics.pipeline.flow.bottlenecks.length}\n\n`;
    
    // File System Analysis
    markdown += `## File System Analysis\n\n`;
    markdown += `### File Categories\n`;
    markdown += `| Category | Total | Present | Missing |\n`;
    markdown += `|----------|-------|---------|----------|\n`;
    
    let categoryStats = {};
    for (const [cat, files] of Object.entries(this.fileInventory)) {
      let total = 0;
      let present = 0;
      
      if (Array.isArray(files)) {
        total = files.length;
        for (const file of files) {
          if (await this.checkPath(path.join(this.projectRoot, file))) present++;
        }
      } else {
        for (const subfiles of Object.values(files)) {
          total += subfiles.length;
          for (const file of subfiles) {
            if (await this.checkPath(path.join(this.projectRoot, file))) present++;
          }
        }
      }
      
      categoryStats[cat] = { total, present, missing: total - present };
      markdown += `| ${cat} | ${total} | ${present} | ${total - present} |\n`;
    }
    
    // System Redundancy
    if (this.diagnostics.systemRedundancy.duplicatedLogic.length > 0) {
      markdown += `\n## System Redundancy Analysis\n\n`;
      markdown += `Found ${this.diagnostics.systemRedundancy.memorySystemCount} memory systems:\n\n`;
      
      for (const system of this.diagnostics.systemRedundancy.duplicatedLogic) {
        markdown += `- **${system.system}**: ${system.references} references\n`;
        markdown += `  - File: \`${system.file}\`\n`;
      }
    }
    
    // Hallucination Analysis
    if (this.diagnostics.hallucinations.instances.length > 0) {
      markdown += `\n## Hallucination Analysis\n\n`;
      markdown += `Found ${this.diagnostics.hallucinations.instances.length} hallucinated capsules:\n\n`;
      
      const byType = {};
      for (const h of this.diagnostics.hallucinations.instances) {
        byType[h.type] = (byType[h.type] || 0) + 1;
      }
      
      markdown += `| Hallucination Type | Count |\n`;
      markdown += `|-------------------|-------|\n`;
      for (const [type, count] of Object.entries(byType)) {
        markdown += `| ${type} | ${count} |\n`;
      }
      
      markdown += `\n### Sample Hallucinations\n\n`;
      for (const h of this.diagnostics.hallucinations.instances.slice(0, 3)) {
        markdown += `- **${h.type}** in \`${path.basename(h.file)}\`\n`;
        markdown += `  - Snippet: "${h.snippet.substring(0, 100)}..."\n`;
      }
    }
    
    // Query Test Results
    markdown += `\n## Query Test Results\n\n`;
    markdown += `| Query | Expected | Found | Correct | Hallucinations | Status |\n`;
    markdown += `|-------|----------|-------|---------|----------------|--------|\n`;
    
    for (const test of this.diagnostics.queries.tested) {
      const status = test.hallucinations === 0 && test.correctResults > 0 ? '✅' : '❌';
      markdown += `| ${test.query} | ${test.expectedType} | ${test.capsulesFound} | ${test.correctResults} | ${test.hallucinations} | ${status} |\n`;
    }
    
    // Pipeline Analysis
    if (this.diagnostics.pipeline.flow.broken.length > 0) {
      markdown += `\n## Pipeline Breaks\n\n`;
      for (const broken of this.diagnostics.pipeline.flow.broken) {
        markdown += `### ${broken.stage || broken.step}\n`;
        markdown += `- Component: \`${broken.component || broken.file}\`\n`;
        markdown += `- Impact: ${broken.impact}\n\n`;
      }
    }
    
    // Recommendations
    markdown += `\n## Recommendations\n\n`;
    
    for (const priority of ['critical', 'high', 'medium']) {
      if (this.diagnostics.recommendations[priority].length > 0) {
        markdown += `### ${priority.toUpperCase()} Priority\n\n`;
        for (const rec of this.diagnostics.recommendations[priority]) {
          markdown += `#### ${rec.issue}\n`;
          markdown += `- **Action:** ${rec.action}\n`;
          if (rec.command) markdown += `- **Command:** \`${rec.command}\`\n`;
          if (rec.files) {
            markdown += `- **Files:**\n`;
            rec.files.forEach(f => markdown += `  - ${f}\n`);
          }
          markdown += `- **Impact:** ${rec.impact}\n\n`;
        }
      }
    }
    
    await fs.writeFile(mdPath, markdown, 'utf8');
    this.log(`\n📄 Markdown report saved: ${mdPath}`, 'green');
    
    // Generate JSON report
    const jsonPath = path.join(this.logsDir, `echo-diagnostic-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(this.diagnostics, null, 2), 'utf8');
    this.log(`📊 JSON report saved: ${jsonPath}`, 'green');
    
    // Generate actionable cleanup script
    await this.generateCleanupScript();
    
    // Generate consolidation script
    await this.generateConsolidationScript();
  }

  async generateCleanupScript() {
    const scriptPath = path.join(this.logsDir, 'echo-cleanup-script.js');
    
    let script = `// Auto-generated cleanup script for Echo Rubicon
// Generated: ${new Date().toLocaleString()}
// WARNING: This script will DELETE files. Review carefully before running.

const fs = require('fs').promises;
const path = require('path');

async function cleanupEchoIssues() {
  console.log('Starting Echo Rubicon cleanup...');
  let cleaned = 0;
  
`;

    // Add hallucination cleanup
    if (this.diagnostics.pipeline.summary.hallucinatedCapsules > 0) {
      script += `  // Remove hallucinated capsules
  console.log('\\nRemoving hallucinated capsules...');
  const hallucinatedFiles = ${JSON.stringify(this.diagnostics.pipeline.files.hallucinated, null, 2)};
  
  for (const file of hallucinatedFiles) {
    try {
      await fs.unlink(file);
      console.log('  ✅ Removed:', path.basename(file));
      cleaned++;
    } catch (e) {
      console.error('  ❌ Failed to remove:', file, e.message);
    }
  }
  
`;
    }
    
    // Add empty capsule cleanup
    if (this.diagnostics.capsuleAnalysis.emptyContent > 0) {
      script += `  // Remove empty capsules
  console.log('\\nRemoving empty capsules...');
  const emptyFiles = ${JSON.stringify(this.diagnostics.pipeline.files.dead.filter(d => d.reason === 'Empty content').map(d => d.path), null, 2)};
  
  for (const file of emptyFiles) {
    try {
      await fs.unlink(
await fs.unlink(file);
     console.log('  ✅ Removed empty:', path.basename(file));
     cleaned++;
   } catch (e) {
     console.error('  ❌ Failed to remove:', file, e.message);
   }
 }
 
`;
   }
   
   // Add duplicate cleanup
   if (this.diagnostics.pipeline.files.duplicates.length > 0) {
     script += `  // Remove duplicate capsules (keeping originals)
 console.log('\\nRemoving duplicate capsules...');
 const duplicates = ${JSON.stringify(this.diagnostics.pipeline.files.duplicates.map(d => d.duplicate), null, 2)};
 
 for (const file of duplicates) {
   try {
     await fs.unlink(file);
     console.log('  ✅ Removed duplicate:', path.basename(file));
     cleaned++;
   } catch (e) {
     console.error('  ❌ Failed to remove:', file, e.message);
   }
 }
 
`;
   }
   
   script += `  console.log('\\nCleanup complete!');
 console.log('Total files cleaned:', cleaned);
}

// Safety check
console.log('This script will DELETE ${this.diagnostics.pipeline.files.hallucinated.length + this.diagnostics.pipeline.files.dead.length + this.diagnostics.pipeline.files.duplicates.length} files.');
console.log('Type "yes" to continue, or Ctrl+C to cancel:');

const readline = require('readline');
const rl = readline.createInterface({
 input: process.stdin,
 output: process.stdout
});

rl.question('Continue? ', (answer) => {
 if (answer.toLowerCase() === 'yes') {
   cleanupEchoIssues().catch(console.error);
 } else {
   console.log('Cleanup cancelled.');
 }
 rl.close();
});
`;
   
   await fs.writeFile(scriptPath, script, 'utf8');
   this.log(`🧹 Cleanup script generated: ${scriptPath}`, 'cyan');
 }

 async generateConsolidationScript() {
   const scriptPath = path.join(this.logsDir, 'echo-consolidation-script.js');
   
   let script = `// Auto-generated consolidation script for Echo Rubicon
// Generated: ${new Date().toLocaleString()}
// PURPOSE: Archive redundant systems and consolidate to single implementations

const fs = require('fs').promises;
const path = require('path');

async function consolidateEchoSystems() {
 console.log('Starting Echo Rubicon system consolidation...');
 
 // Create archive directory
 const archiveDir = path.join('${this.projectRoot}', 'archived', new Date().toISOString().split('T')[0]);
 await fs.mkdir(archiveDir, { recursive: true });
 console.log('Archive directory created:', archiveDir);
 
`;

   // Archive redundant memory systems
   if (this.diagnostics.systemRedundancy.memorySystemCount > 2) {
     script += `  // Archive redundant memory systems
 console.log('\\nArchiving redundant memory systems...');
 const redundantMemorySystems = [
   'src/echo/memory/MemoryOrchestrator.js',
   'src/echo/memory/MemoryWriter.js',
   'src/echo/memory/memory-runner.js',
   'src/echo/memory/memory-runner.mjs'
 ];
 
 for (const file of redundantMemorySystems) {
   const sourcePath = path.join('${this.projectRoot}', file);
   const destPath = path.join(archiveDir, file);
   
   try {
     await fs.mkdir(path.dirname(destPath), { recursive: true });
     await fs.rename(sourcePath, destPath);
     console.log('  ✅ Archived:', file);
     
     // Create README in place of archived file
     const readme = \`// ARCHIVED: \${new Date().toLocaleString()}
// This file has been moved to: \${path.relative('${this.projectRoot}', destPath)}
// Primary memory system is now: MemoryVaultManager
// If you need this functionality, integrate it into the main system.
\`;
     await fs.writeFile(sourcePath + '.ARCHIVED', readme, 'utf8');
   } catch (e) {
     console.error('  ❌ Failed to archive:', file, e.message);
   }
 }
 
`;
   }
   
   // Archive redundant retrievers
   if (this.diagnostics.systemRedundancy.retrieverCount > 2) {
     script += `  // Archive redundant retrieval systems
 console.log('\\nArchiving redundant retrieval systems...');
 const redundantRetrievers = [
   'src/echo/memory/capsuleRetriever2.js',
   'backend/qlib/folderScopedRetriever.js',
   'backend/qlib/filterCapsulesByQuery.js'
 ];
 
 for (const file of redundantRetrievers) {
   const sourcePath = path.join('${this.projectRoot}', file);
   const destPath = path.join(archiveDir, file);
   
   try {
     // First check if there are unique functions to preserve
     const content = await fs.readFile(sourcePath, 'utf8');
     const uniqueFunctions = [];
     
     // Extract function names
     const funcMatches = content.match(/(?:async\\s+)?function\\s+(\\w+)|(?:const|let|var)\\s+(\\w+)\\s*=\\s*(?:async\\s*)?\\(/g) || [];
     
     if (funcMatches.length > 0) {
       console.log('    Found', funcMatches.length, 'functions in', file);
       // TODO: Manual review needed to merge unique functionality
     }
     
     await fs.mkdir(path.dirname(destPath), { recursive: true });
     await fs.rename(sourcePath, destPath);
     console.log('  ✅ Archived:', file);
     
   } catch (e) {
     console.error('  ❌ Failed to archive:', file, e.message);
   }
 }
 
`;
   }
   
   // Update imports/requires
   script += `  // Update import references
 console.log('\\nUpdating import references...');
 
 const filesToUpdate = [
   'main/ipc-handlers.js',
   'src/memory/index.js',
   'main/app.js'
 ];
 
 for (const file of filesToUpdate) {
   const filePath = path.join('${this.projectRoot}', file);
   try {
     let content = await fs.readFile(filePath, 'utf8');
     
     // Replace old imports with new ones
     content = content.replace(/MemoryOrchestrator/g, 'MemoryVaultManager');
     content = content.replace(/capsuleRetriever2/g, 'capsuleRetriever');
     
     await fs.writeFile(filePath, content, 'utf8');
     console.log('  ✅ Updated imports in:', file);
   } catch (e) {
     console.error('  ❌ Failed to update:', file, e.message);
   }
 }
 
 console.log('\\nConsolidation complete!');
 console.log('Archived files are in:', archiveDir);
 console.log('\\nNEXT STEPS:');
 console.log('1. Review archived files for unique functionality to preserve');
 console.log('2. Test the system with consolidated components');
 console.log('3. Remove archive directory once confirmed working');
}

// Run consolidation
consolidateEchoSystems().catch(console.error);
`;
   
   await fs.writeFile(scriptPath, script, 'utf8');
   this.log(`🔧 Consolidation script generated: ${scriptPath}`, 'cyan');
 }
}

// Run if called directly
if (require.main === module) {
 const suite = new EchoDiagnosticSuite();
 suite.run().catch(console.error);
}

module.exports = EchoDiagnosticSuite;