// echo-memory-pipeline-analyzer.js
// Advanced Memory Pipeline Analyzer & Living/Dead File Mapper for Echo Rubicon
// Zero dependencies - pure Node.js implementation

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class EchoMemoryPipelineAnalyzer {
  constructor() {
    this.toolsDir = 'C:\\Users\\tophe\\Documents\\tools';
    this.logsDir = 'C:\\Users\\tophe\\Documents\\logs';
    this.projectRoot = 'C:\\Users\\tophe\\Documents\\Echo Rubicon';
    this.vaultPath = 'D:\\Obsidian Vault';
    
    // Terminal colors (ANSI escape codes)
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

    // Analysis results structure
    this.pipeline = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: 0,
        livingFiles: 0,
        deadFiles: 0,
        orphanedFiles: 0,
        duplicates: 0,
        memoryLeaks: 0
      },
      files: {
        living: [],
        dead: [],
        orphaned: [],
        duplicates: []
      },
      memoryFlow: {
        input: [],
        processing: [],
        storage: [],
        retrieval: [],
        output: []
      },
      bottlenecks: [],
      recommendations: [],
      performanceMetrics: {},
      audit: {
        unusedFiles: [],
        unlinkedFunctions: [],
        pipelineHoles: []
      }
    };

    this.startTime = Date.now();
    
    // Expected pipeline flow
    this.expectedPipeline = [
      'MyAICore.js',
      'ChatOrchestrator',
      'MemoryVaultManager',
      'capsuleRetriever',
      'PromptBuilder'
    ];
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
    this.log('\n🚀 ECHO RUBICON MEMORY PIPELINE ANALYZER', 'bright');
    this.log(`Version: 2.0 | ${new Date().toLocaleString()}`, 'dim');
    
    try {
      // Ensure logs directory exists
      await fs.mkdir(this.logsDir, { recursive: true });

      // Run all analysis phases
      await this.phase1_SystemHealth();
      await this.phase2_FileSystemMap();
      await this.phase3_MemoryPipelineTrace();
      await this.phase4_LivingDeadAnalysis();
      await this.phase5_QueryFlowAnalysis();
      await this.phase6_PerformanceProfile();
      await this.phase7_IntegrationMap();
      await this.phase8_Recommendations();
      
      // New phases
      await this.phase9_UnusedFileAnalysis();
      await this.phase10_PipelineHoleDetection();

      // Generate reports
      await this.generateMarkdownReport();
      await this.generateJSONReport();
      
      this.logSection('ANALYSIS COMPLETE');
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
        logs: await this.checkPath(this.logsDir)
      }
    };

    // Check critical directories
    for (const [name, exists] of Object.entries(health.paths)) {
      this.log(`  ${exists ? '✅' : '❌'} ${name}: ${exists ? 'accessible' : 'NOT FOUND'}`, 
                exists ? 'green' : 'red');
    }

    // Memory usage
    const memMB = (health.memory.heapUsed / 1024 / 1024).toFixed(2);
    this.log(`  💾 Memory usage: ${memMB}MB`, 'cyan');

    this.pipeline.health = health;
  }

  async phase2_FileSystemMap() {
    this.logSection('PHASE 2: FILE SYSTEM MAPPING');
    
    const fileMap = {
      vault: {},
      echo: {},
      project: {}
    };

    // Map vault structure
    this.logSubsection('Vault Structure');
    fileMap.vault = await this.mapDirectory(this.vaultPath, {
      maxDepth: 3,
      includeStats: true,
      patterns: ['.md', '.json', '.chaos.json']
    });

    // Map .echo directory
    this.logSubsection('Echo Directory');
    const echoPath = path.join(this.vaultPath, '.echo');
    fileMap.echo = await this.mapDirectory(echoPath, {
      maxDepth: 5,
      includeStats: true,
      patterns: ['.json', '.md']
    });

    // Count capsules by type
    const capsuleCounts = await this.countCapsuleTypes(echoPath);
    this.log('\n  Capsule Distribution:', 'yellow');
    for (const [type, count] of Object.entries(capsuleCounts)) {
      this.log(`    ${type}: ${count}`, 'white');
    }

    this.pipeline.fileMap = fileMap;
  }

  async phase3_MemoryPipelineTrace() {
    this.logSection('PHASE 3: MEMORY PIPELINE TRACE');
    
    const trace = {
      components: [],
      connections: [],
      dataFlow: []
    };

    // Trace component files
    const components = [
      { name: 'Frontend Entry', file: 'components/MyAICore.js', type: 'input' },
      { name: 'IPC Handlers', file: 'main/ipc-handlers.js', type: 'processing' },
      { name: 'Memory Vault Manager', file: 'src/memory/MemoryVaultManager.js', type: 'storage' },
      { name: 'Capsule Retriever', file: 'src/echo/memory/capsuleRetriever.js', type: 'retrieval' },
      { name: 'Chat Orchestrator', file: 'src/memory/ChatOrchestrator.js', type: 'processing' },
      { name: 'Q-Lib Interface', file: 'src/memory/QLibInterface.js', type: 'processing' },
      { name: 'Memory Service', file: 'src/echo/memory/MemoryService.js', type: 'processing' },
      { name: 'Chaos Analyzer', file: 'backend/qlib/chaosanalyzer.js', type: 'processing' }
    ];

    this.logSubsection('Component Analysis');
    for (const comp of components) {
      const fullPath = path.join(this.projectRoot, comp.file);
      const exists = await this.checkPath(fullPath);
      const analysis = exists ? await this.analyzeComponent(fullPath) : null;
      
      trace.components.push({
        ...comp,
        exists,
        analysis
      });

      const status = exists ? '✅' : '❌';
      const info = analysis ? `(${analysis.functions.length} functions, ${analysis.lines} lines)` : '';
      this.log(`  ${status} ${comp.name} ${info}`, exists ? 'green' : 'red');
      
      if (analysis && analysis.calls.length > 0) {
        this.log(`     → Calls: ${analysis.calls.slice(0, 3).join(', ')}...`, 'dim');
      }
    }

    // Trace data flow
    this.logSubsection('Data Flow Analysis');
    trace.dataFlow = await this.traceDataFlow();
    
    this.pipeline.memoryTrace = trace;
  }

  async phase4_LivingDeadAnalysis() {
    this.logSection('PHASE 4: LIVING/DEAD FILE ANALYSIS');
    
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    // Analyze capsules
    this.logSubsection('Capsule Lifecycle');
    const capsulePath = path.join(this.vaultPath, '.echo', 'capsules');
    const capsules = await this.walkDirectory(capsulePath, '.json');
    
    let living = 0, dead = 0, orphaned = 0;
    
    for (const file of capsules) {
      try {
        const stats = await fs.stat(file);
        const content = await fs.readFile(file, 'utf8');
        const data = JSON.parse(content);
        
        // Determine status
        const isReferenced = await this.isFileReferenced(file);
        const isRecent = stats.mtime.getTime() > oneWeekAgo;
        const hasValidContent = data.content || data.summary || data.messages;
        
        if (isReferenced && hasValidContent) {
          living++;
          this.pipeline.files.living.push({
            path: file,
            lastModified: stats.mtime,
            size: stats.size,
            type: data.type || 'unknown'
          });
        } else if (!isReferenced) {
          orphaned++;
          this.pipeline.files.orphaned.push({
            path: file,
            reason: 'No references found',
            age: this.getFileAge(stats.mtime)
          });
        } else if (!hasValidContent) {
          dead++;
          this.pipeline.files.dead.push({
            path: file,
            reason: 'Empty or invalid content',
            size: stats.size
          });
        }
      } catch (e) {
        dead++;
        this.pipeline.files.dead.push({
          path: file,
          reason: `Parse error: ${e.message}`
        });
      }
    }

    this.log(`\n  Capsule Status:`, 'yellow');
    this.log(`    🟢 Living: ${living} (referenced & valid)`, 'green');
    this.log(`    🔴 Dead: ${dead} (invalid/corrupted)`, 'red');
    this.log(`    🟡 Orphaned: ${orphaned} (no references)`, 'yellow');
    
    // Check for duplicates
    await this.findDuplicates();
    
    this.pipeline.summary.livingFiles = living;
    this.pipeline.summary.deadFiles = dead;
    this.pipeline.summary.orphanedFiles = orphaned;
  }

  async phase5_QueryFlowAnalysis() {
    this.logSection('PHASE 5: QUERY FLOW ANALYSIS');
    
    const queryFlow = {
      patterns: [],
      bottlenecks: [],
      optimizations: []
    };

    // Test query patterns
    const testQueries = [
      { query: 'list all my clients', type: 'categorical', expectedPath: 'clients' },
      { query: 'what are my recipes?', type: 'categorical', expectedPath: 'foods' },
      { query: 'Jane Kimani', type: 'specific', expectedPath: 'any' },
      { query: 'carnivore ice cream', type: 'specific', expectedPath: 'foods' }
    ];

    this.logSubsection('Query Pattern Analysis');
    for (const test of testQueries) {
      const flow = await this.traceQueryFlow(test.query);
      queryFlow.patterns.push({
        ...test,
        flow
      });
      
      const status = flow.successful ? '✅' : '❌';
      this.log(`  ${status} "${test.query}"`, flow.successful ? 'green' : 'red');
      if (flow.bottleneck) {
        this.log(`     ⚠️  Bottleneck: ${flow.bottleneck}`, 'yellow');
        queryFlow.bottlenecks.push(flow.bottleneck);
      }
    }

    this.pipeline.queryFlow = queryFlow;
  }

  async phase6_PerformanceProfile() {
    this.logSection('PHASE 6: PERFORMANCE PROFILING');
    
    const metrics = {
      fileIO: {},
      memory: {},
      search: {}
    };

    // File I/O performance
    this.logSubsection('File I/O Performance');
    const testFile = path.join(this.vaultPath, '.echo', 'capsules', 'test-perf.json');
    
    // Write test
    const writeStart = Date.now();
    await fs.writeFile(testFile, JSON.stringify({ test: true }));
    metrics.fileIO.writeTime = Date.now() - writeStart;
    
    // Read test
    const readStart = Date.now();
    await fs.readFile(testFile, 'utf8');
    metrics.fileIO.readTime = Date.now() - readStart;
    
    // Cleanup
    await fs.unlink(testFile).catch(() => {});
    
    this.log(`  Write speed: ${metrics.fileIO.writeTime}ms`, 'cyan');
    this.log(`  Read speed: ${metrics.fileIO.readTime}ms`, 'cyan');
    
    // Memory usage analysis
    this.logSubsection('Memory Usage');
    const memBefore = process.memoryUsage();
    
    // Simulate loading capsules
    const capsules = await this.walkDirectory(path.join(this.vaultPath, '.echo'), '.json');
    const loadedData = [];
    for (const file of capsules.slice(0, 100)) {
      try {
        const content = await fs.readFile(file, 'utf8');
        loadedData.push(JSON.parse(content));
      } catch (e) {}
    }
    
    const memAfter = process.memoryUsage();
    metrics.memory.heapGrowth = ((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(2);
    
    this.log(`  Heap growth: ${metrics.memory.heapGrowth}MB for ${loadedData.length} capsules`, 'cyan');
    
    this.pipeline.performanceMetrics = metrics;
  }

  async phase7_IntegrationMap() {
    this.logSection('PHASE 7: INTEGRATION MAPPING');
    
    const integration = {
      connections: [],
      missingLinks: [],
      redundancies: []
    };

    // Map IPC connections
    this.logSubsection('IPC Channel Mapping');
    const ipcFile = path.join(this.projectRoot, 'main', 'ipc-handlers.js');
    if (await this.checkPath(ipcFile)) {
      const content = await fs.readFile(ipcFile, 'utf8');
      const channels = this.extractIPCChannels(content);
      
      this.log(`  Found ${channels.length} IPC channels:`, 'yellow');
      channels.slice(0, 5).forEach(ch => {
        this.log(`    • ${ch}`, 'white');
      });
      
      integration.connections = channels;
    }

    // Check for redundant systems
    const memorySystems = [
      'MemoryVaultManager',
      'MemoryService',
      'SessionMesh',
      'MemoryOrchestrator'
    ];

    this.logSubsection('Memory System Redundancy Check');
    for (const system of memorySystems) {
      const found = await this.findSystemUsage(system);
      if (found.length > 0) {
        this.log(`  ⚠️  ${system}: ${found.length} references`, 'yellow');
        if (found.length > 1) {
          integration.redundancies.push({
            system,
            locations: found
          });
        }
      }
    }

    this.pipeline.integration = integration;
  }

  async phase8_Recommendations() {
    this.logSection('PHASE 8: GENERATING RECOMMENDATIONS');
    
    const recommendations = [];

    // Based on dead files
    if (this.pipeline.summary.deadFiles > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: `${this.pipeline.summary.deadFiles} dead capsule files`,
        action: 'Run cleanup script to remove corrupted capsules',
        impact: 'Reduces search noise and improves performance'
      });
    }

    // Based on orphaned files
    if (this.pipeline.summary.orphanedFiles > 10) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: `${this.pipeline.summary.orphanedFiles} orphaned capsules`,
        action: 'Rebuild index to include orphaned files or archive them',
        impact: 'Recovers potentially valuable memory data'
      });
    }

    // Based on bottlenecks
    if (this.pipeline.queryFlow?.bottlenecks?.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Query flow bottlenecks detected',
        action: 'Implement categorical query detection in capsuleRetriever',
        impact: 'Enables "list all X" queries to work properly'
      });
    }

    // Based on redundancies
    if (this.pipeline.integration?.redundancies?.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Multiple memory systems detected',
        action: 'Consolidate to single memory system (recommend MemoryVaultManager)',
        impact: 'Eliminates conflicts and improves maintainability'
      });
    }

    // Performance based
    if (this.pipeline.performanceMetrics?.fileIO?.readTime > 50) {
      recommendations.push({
        priority: 'LOW',
        issue: 'Slow file I/O detected',
        action: 'Consider implementing memory caching layer',
        impact: 'Improves response time for frequent queries'
      });
    }

    this.logSubsection('Priority Recommendations');
    for (const rec of recommendations.sort((a, b) => {
      const priority = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priority[a.priority] - priority[b.priority];
    })) {
      const color = rec.priority === 'HIGH' ? 'red' : rec.priority === 'MEDIUM' ? 'yellow' : 'white';
      this.log(`\n  [${rec.priority}] ${rec.issue}`, color);
      this.log(`  → Action: ${rec.action}`, 'white');
      this.log(`  → Impact: ${rec.impact}`, 'dim');
    }

    this.pipeline.recommendations = recommendations;
  }

  async phase9_UnusedFileAnalysis() {
    this.logSection('PHASE 9: UNUSED FILE ANALYSIS');
    
    this.logSubsection('Scanning for Isolated Files');
    
    // Get all JS files in the project
    const jsFiles = await this.walkDirectory(this.projectRoot, '.js');
    const totalFiles = jsFiles.length;
    this.log(`  Total JS files: ${totalFiles}`, 'cyan');
    
    // Build import/require map
    const importMap = new Map();
    const exportMap = new Map();
    
    for (const file of jsFiles) {
      const relativePath = path.relative(this.projectRoot, file);
      
      // Skip test files and archived files
      if (relativePath.includes('test') || 
          relativePath.includes('archive') || 
          relativePath.includes('orphan') ||
          relativePath.includes('node_modules')) {
        continue;
      }
      
      try {
        const content = await fs.readFile(file, 'utf8');
        const analysis = await this.analyzeComponent(file);
        
        // Track what this file imports
        const imports = this.extractImports(content);
        importMap.set(relativePath, imports);
        
        // Track what this file exports
        const exports = this.extractExports(content);
        exportMap.set(relativePath, exports);
        
        // Check if file is imported anywhere
        let isImported = false;
        for (const [otherFile, otherImports] of importMap) {
          if (otherFile !== relativePath) {
            for (const imp of otherImports) {
              if (file.includes(imp) || imp.includes(path.basename(file, '.js'))) {
                isImported = true;
                break;
              }
            }
          }
          if (isImported) break;
        }
        
        // If not imported, check if it's an entry point
        const isEntryPoint = relativePath.includes('main.js') || 
                           relativePath.includes('app.js') || 
                           relativePath.includes('index.js') ||
                           relativePath.includes('preload.js');
        
        if (!isImported && !isEntryPoint) {
          this.pipeline.audit.unusedFiles.push({
            file: relativePath,
            lines: analysis?.lines || 0,
            functions: analysis?.functions || [],
            reason: 'Never imported by any other file'
          });
        }
        
      } catch (e) {
        console.error(`Error analyzing ${file}:`, e.message);
      }
    }
    
    this.log(`\n  Unused Files Found: ${this.pipeline.audit.unusedFiles.length}`, 
              this.pipeline.audit.unusedFiles.length > 0 ? 'yellow' : 'green');
    
    // Log first few unused files
    for (const unused of this.pipeline.audit.unusedFiles.slice(0, 5)) {
      this.log(`    🧱 ${unused.file} (${unused.lines} lines)`, 'yellow');
      if (unused.functions.length > 0) {
        this.log(`       Functions: ${unused.functions.slice(0, 3).join(', ')}`, 'dim');
      }
    }
    
    // Check for unlinked functions
    this.logSubsection('Unlinked Function Detection');
    
    const memoryFunctions = [
      'searchMemories',
      'buildContext',
      'retrieveRelevantCapsules',
      'buildContextForInput',
      'extractRelevantMemory'
    ];
    
    for (const func of memoryFunctions) {
      const implementations = await this.findFunctionImplementations(func);
      const calls = await this.findFunctionCalls(func);
      
      if (implementations.length > 0 && calls.length === 0) {
        this.pipeline.audit.unlinkedFunctions.push({
          function: func,
          implementedIn: implementations,
          reason: 'Function exists but never called'
        });
        this.log(`  🔌 ${func}() implemented but never called`, 'yellow');
      }
    }
  }

  async phase10_PipelineHoleDetection() {
    this.logSection('PHASE 10: PIPELINE HOLE DETECTION');
    
    this.logSubsection('Expected Pipeline Flow Analysis');
    
    // Check each expected connection
    const pipelineStages = [
      { from: 'MyAICore', to: 'IPC Handler', via: 'chat:send' },
      { from: 'IPC Handler', to: 'MemoryVaultManager', via: 'searchMemories' },
      { from: 'MemoryVaultManager', to: 'capsuleRetriever', via: 'retrieveRelevantCapsules' },
      { from: 'capsuleRetriever', to: 'Context Builder', via: 'buildContext' },
      { from: 'Context Builder', to: 'AI Model', via: 'prompt injection' }
    ];
    
    for (const stage of pipelineStages) {
      const exists = await this.checkPipelineConnection(stage);
      
      if (!exists) {
        this.pipeline.audit.pipelineHoles.push({
          stage: `${stage.from} → ${stage.to}`,
          missingLink: stage.via,
          impact: 'Memory context may not reach AI'
        });
        this.log(`  🕳️  Missing: ${stage.from} → ${stage.to} (via ${stage.via})`, 'red');
      } else {
        this.log(`  ✅ Connected: ${stage.from} → ${stage.to}`, 'green');
      }
    }
    
    // Check for specific patterns
    this.logSubsection('Pattern Detection');
    
    // Pattern 1: Memory retrieved but not used
    const memoryRetrievalPattern = await this.checkPattern({
      name: 'Unused Memory Retrieval',
      searchFor: 'searchMemories',
      expectFollow: ['content', 'context', 'prompt'],
      withinLines: 50
    });
    
    if (memoryRetrievalPattern.violations.length > 0) {
      for (const violation of memoryRetrievalPattern.violations) {
        this.pipeline.audit.pipelineHoles.push({
          stage: 'Memory Usage',
          file: violation.file,
          line: violation.line,
          missingLink: 'Memory retrieved but not passed to prompt',
          impact: 'AI responds without context'
        });
        this.log(`  🕳️  ${violation.file}:${violation.line} - Memory retrieved but not used`, 'red');
      }
    }
    
    // Pattern 2: Function returns but result ignored
    const unusedReturns = await this.findUnusedReturns();
    for (const unused of unusedReturns) {
      this.pipeline.audit.pipelineHoles.push({
        stage: 'Return Value Usage',
        file: unused.file,
        function: unused.function,
        missingLink: 'Return value ignored',
        impact: 'Data loss in pipeline'
      });
    }
    
    this.log(`\n  Total Pipeline Holes: ${this.pipeline.audit.pipelineHoles.length}`, 
              this.pipeline.audit.pipelineHoles.length > 0 ? 'red' : 'green');
  }

  // New helper methods for phase 9 and 10
  extractImports(content) {
    const imports = [];
    
    // CommonJS requires
    const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = requirePattern.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    // ES6 imports
    const importPattern = /import\s+(?:.*\s+from\s+)?['"]([^'"]+)['"]/g;
    while ((match = importPattern.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  extractExports(content) {
    const exports = [];
    
    // module.exports
    if (content.includes('module.exports')) {
      const exportPattern = /module\.exports(?:\.\w+)?\s*=\s*(\w+)/g;
      let match;
      while ((match = exportPattern.exec(content)) !== null) {
        exports.push(match[1]);
      }
    }
    
    // ES6 exports
    const es6Pattern = /export\s+(?:default\s+)?(?:function\s+)?(\w+)/g;
    let match;
    while ((match = es6Pattern.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  async findFunctionImplementations(functionName) {
    const implementations = [];
    const files = await this.walkDirectory(this.projectRoot, '.js');
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const patterns = [
          new RegExp(`function\\s+${functionName}\\s*\\(`),
          new RegExp(`${functionName}\\s*=\\s*(?:async\\s*)?function`),
          new RegExp(`${functionName}\\s*=\\s*(?:async\\s*)?\\(`),
          new RegExp(`async\\s+${functionName}\\s*\\(`)
        ];
        
        if (patterns.some(p => p.test(content))) {
          implementations.push(path.relative(this.projectRoot, file));
        }
      } catch (e) {}
    }
    
    return implementations;
  }

  async findFunctionCalls(functionName) {
    const calls = [];
    const files = await this.walkDirectory(this.projectRoot, '.js');
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const patterns = [
          new RegExp(`${functionName}\\s*\\(`),
          new RegExp(`\\.${functionName}\\s*\\(`),
          new RegExp(`await\\s+${functionName}\\s*\\(`)
        ];
        
        if (patterns.some(p => p.test(content))) {
          calls.push(path.relative(this.projectRoot, file));
        }
      } catch (e) {}
    }
    
    return calls;
  }

  async checkPipelineConnection(stage) {
    // Check if the connection exists in code
    try {
      const sourceFiles = await this.findFilesContaining(stage.from);
      const targetFiles = await this.findFilesContaining(stage.to);
      const connectionFiles = await this.findFilesContaining(stage.via);
      
      // Check if source calls the connection
      for (const source of sourceFiles) {
        const content = await fs.readFile(source, 'utf8');
        if (content.includes(stage.via)) {
          return true;
        }
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }

  async findFilesContaining(text) {
    const files = [];
    const allFiles = await this.walkDirectory(this.projectRoot, '.js');
    
    for (const file of allFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        if (content.includes(text)) {
          files.push(file);
        }
      } catch (e) {}
    }
    
    return files;
  }

  async checkPattern(pattern) {
    const violations = [];
    const files = await this.walkDirectory(this.projectRoot, '.js');
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(pattern.searchFor)) {
            // Check if expected follow-up exists within range
            let foundFollow = false;
            const endLine = Math.min(i + pattern.withinLines, lines.length);
            
            for (let j = i; j < endLine; j++) {
              if (pattern.expectFollow.some(f => lines[j].includes(f))) {
                foundFollow = true;
                break;
              }
            }
            
            if (!foundFollow) {
              violations.push({
                file: path.relative(this.projectRoot, file),
                line: i + 1,
                pattern: pattern.name
              });
            }
          }
        }
      } catch (e) {}
    }
    
    return { pattern: pattern.name, violations };
  }

  async findUnusedReturns() {
    const unused = [];
    // Simplified check - look for await calls that don't assign result
    const files = await this.walkDirectory(this.projectRoot, '.js');
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const pattern = /await\s+(\w+)\s*\([^)]*\)\s*;/g;
        let match;
        
        while ((match = pattern.exec(content)) !== null) {
          // Check if it's a known function that returns important data
          const funcName = match[1];
          if (['searchMemories', 'buildContext', 'retrieveRelevantCapsules'].includes(funcName)) {
            unused.push({
              file: path.relative(this.projectRoot, file),
              function: funcName,
              context: match[0]
            });
          }
        }
      } catch (e) {}
    }
    
    return unused;
  }

  // Existing helper methods remain unchanged
  async checkPath(filepath) {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  async mapDirectory(dirPath, options = {}) {
    const { maxDepth = 3, includeStats = false, patterns = [] } = options;
    const map = {};

    async function scan(dir, depth = 0) {
      if (depth > maxDepth) return;
      
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          const relativePath = path.relative(dirPath, fullPath);
          
          if (item.isDirectory()) {
            map[relativePath] = { type: 'directory', files: 0 };
            await scan(fullPath, depth + 1);
          } else if (item.isFile()) {
            const ext = path.extname(item.name);
            if (patterns.length === 0 || patterns.includes(ext)) {
              const parentDir = path.dirname(relativePath);
              if (map[parentDir]) {
                map[parentDir].files++;
              }
              
              if (includeStats) {
                const stats = await fs.stat(fullPath);
                map[relativePath] = {
                  type: 'file',
                  size: stats.size,
                  modified: stats.mtime
                };
              }
            }
          }
        }
      } catch (e) {}
    }

    await scan(dirPath);
    return map;
  }

  async countCapsuleTypes(echoPath) {
    const counts = {};
    const capsulePath = path.join(echoPath, 'capsules');
    const files = await this.walkDirectory(capsulePath, '.json');
    
    for (const file of files.slice(0, 100)) { // Sample first 100
      try {
        const content = await fs.readFile(file, 'utf8');
        const data = JSON.parse(content);
        const type = data.type || data.metadata?.contentType || 'unknown';
        counts[type] = (counts[type] || 0) + 1;
      } catch (e) {}
    }
    
    return counts;
  }

  async analyzeComponent(filepath) {
    try {
      const content = await fs.readFile(filepath, 'utf8');
      const lines = content.split('\n').length;
      
      // Extract functions
      const functionMatches = content.match(/(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/g) || [];
      const functions = functionMatches.map(m => {
        const match = m.match(/(\w+)\s*(?:=|\()/);
        return match ? match[1] : null;
      }).filter(Boolean);
      
      // Extract calls to other components
      const calls = [];
      const callPatterns = [
        /require\(['"]([^'"]+)['"]\)/g,
        /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
        /ipcMain\.handle\(['"]([^'"]+)['"]/g,
        /window\.electronAPI\.(\w+)/g
      ];
      
      for (const pattern of callPatterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          calls.push(match[1]);
        }
      }
      
      return {
        lines,
        functions: [...new Set(functions)],
        calls: [...new Set(calls)]
      };
    } catch (e) {
      return null;
    }
  }

  async traceDataFlow() {
    // Simplified data flow trace
    return [
      { stage: 'User Input', component: 'MyAICore', status: 'unknown' },
      { stage: 'IPC Channel', component: 'chat:send', status: 'unknown' },
      { stage: 'Memory Search', component: 'MemoryVaultManager', status: 'unknown' },
      { stage: 'Capsule Retrieval', component: 'capsuleRetriever', status: 'unknown' },
      { stage: 'Context Building', component: 'ChatOrchestrator', status: 'unknown' },
      { stage: 'AI Processing', component: 'Model Interface', status: 'unknown' },
      { stage: 'Response', component: 'Frontend', status: 'unknown' }
    ];
  }

  async walkDirectory(dir, extension = '') {
    const files = [];
    
    async function walk(currentDir) {
      try {
        const items = await fs.readdir(currentDir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(currentDir, item.name);
          
          if (item.isDirectory()) {
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

  async isFileReferenced(filepath) {
    // Check if file is referenced in index
    try {
      const indexPath = path.join(this.vaultPath, '.echo', 'index.json');
      const indexContent = await fs.readFile(indexPath, 'utf8');
      const filename = path.basename(filepath);
      return indexContent.includes(filename);
    } catch {
      return false;
    }
  }

  getFileAge(mtime) {
    const age = Date.now() - mtime.getTime();
    const days = Math.floor(age / (24 * 60 * 60 * 1000));
    return `${days} days`;
  }

  async findDuplicates() {
    const hashes = new Map();
    const capsulePath = path.join(this.vaultPath, '.echo', 'capsules');
    const files = await this.walkDirectory(capsulePath, '.json');
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const hash = crypto.createHash('md5').update(content).digest('hex');
        
        if (hashes.has(hash)) {
          this.pipeline.files.duplicates.push({
            original: hashes.get(hash),
            duplicate: file,
            hash
          });
        } else {
          hashes.set(hash, file);
        }
      } catch (e) {}
    }
    
    this.pipeline.summary.duplicates = this.pipeline.files.duplicates.length;
  }

  async traceQueryFlow(query) {
    // Simulate query flow trace
    const flow = {
      query,
      steps: [],
      successful: false,
      bottleneck: null
    };

    // Check if query detection would work
    const isCategorical = query.match(/^(list|show|what are|give me) (all )?(my |the )?/i);
    
    if (isCategorical && !await this.checkPath(path.join(this.projectRoot, 'src/echo/memory/capsuleRetriever.js'))) {
      flow.bottleneck = 'capsuleRetriever missing categorical support';
    }

    return flow;
  }

  extractIPCChannels(content) {
    const channels = [];
    const pattern = /ipcMain\.handle\(['"]([^'"]+)['"]/g;
    const matches = content.matchAll(pattern);
    
    for (const match of matches) {
      channels.push(match[1]);
    }
    
    return channels;
  }

  async findSystemUsage(systemName) {
    const locations = [];
    const searchDirs = [
      path.join(this.projectRoot, 'src'),
      path.join(this.projectRoot, 'main'),
      path.join(this.projectRoot, 'components')
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

  async generateMarkdownReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.logsDir, `memory-pipeline-${timestamp}.md`);
    
    let markdown = `# Echo Rubicon Memory Pipeline Analysis\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
    markdown += `**Duration:** ${((Date.now() - this.startTime) / 1000).toFixed(2)}s\n\n`;
    
    // Executive Summary
    markdown += `## Executive Summary\n\n`;
    markdown += `- **Total Files:** ${this.pipeline.summary.totalFiles}\n`;
    markdown += `- **Living Files:** ${this.pipeline.summary.livingFiles} ✅\n`;
    markdown += `- **Dead Files:** ${this.pipeline.summary.deadFiles} ❌\n`;
    markdown += `- **Orphaned Files:** ${this.pipeline.summary.orphanedFiles} ⚠️\n`;
    markdown += `- **Duplicates:** ${this.pipeline.summary.duplicates}\n`;
    markdown += `- **Unused Files:** ${this.pipeline.audit.unusedFiles.length}\n`;
    markdown += `- **Pipeline Holes:** ${this.pipeline.audit.pipelineHoles.length}\n\n`;
    
    // Critical Issues
    if (this.pipeline.recommendations.filter(r => r.priority === 'HIGH').length > 0) {
      markdown += `## 🚨 Critical Issues\n\n`;
      for (const rec of this.pipeline.recommendations.filter(r => r.priority === 'HIGH')) {
        markdown += `### ${rec.issue}\n`;
        markdown += `- **Action:** ${rec.action}\n`;
        markdown += `- **Impact:** ${rec.impact}\n\n`;
      }
    }
    
    // Memory Flow Diagram
    markdown += `## Memory Flow Diagram\n\n`;
    markdown += '```mermaid\n';
    markdown += 'graph TD\n';
    markdown += '    A[User Input] --> B[IPC Handler]\n';
    markdown += '    B --> C[Memory Search]\n';
    markdown += '    C --> D[Capsule Retrieval]\n';
    markdown += '    D --> E[Context Building]\n';
    markdown += '    E --> F[AI Processing]\n';
    markdown += '    F --> G[Response]\n';
    
    // Add bottlenecks to diagram
    if (this.pipeline.queryFlow?.bottlenecks?.length > 0) {
      markdown += `    C -.-> H[BOTTLENECK: ${this.pipeline.queryFlow.bottlenecks[0]}]\n`;
    }
    
    // Add pipeline holes to diagram
    if (this.pipeline.audit.pipelineHoles.length > 0) {
      markdown += `    D -.-> I[HOLE: ${this.pipeline.audit.pipelineHoles[0].missingLink}]\n`;
    }
    
    markdown += '```\n\n';
    
    // Component Status
    markdown += `## Component Status\n\n`;
    markdown += '| Component | Status | Details |\n';
    markdown += '|-----------|--------|----------|\n';
    
    if (this.pipeline.memoryTrace?.components) {
      for (const comp of this.pipeline.memoryTrace.components) {
        const status = comp.exists ? '✅' : '❌';
        const details = comp.analysis ? `${comp.analysis.functions.length} functions` : 'Not found';
        markdown += `| ${comp.name} | ${status} | ${details} |\n`;
      }
    }
    
    // New sections for unused files and pipeline holes
    if (this.pipeline.audit.unusedFiles.length > 0) {
      markdown += `\n## Unused Files\n\n`;
      markdown += '| File | Lines | Reason |\n';
      markdown += '|------|-------|--------|\n';
      for (const file of this.pipeline.audit.unusedFiles.slice(0, 10)) {
        markdown += `| ${file.file} | ${file.lines} | ${file.reason} |\n`;
      }
      if (this.pipeline.audit.unusedFiles.length > 10) {
        markdown += `\n*... and ${this.pipeline.audit.unusedFiles.length - 10} more unused files*\n`;
      }
    }
    
    if (this.pipeline.audit.pipelineHoles.length > 0) {
      markdown += `\n## Pipeline Holes\n\n`;
      for (const hole of this.pipeline.audit.pipelineHoles) {
        markdown += `### ${hole.stage}\n`;
        markdown += `- **Missing Link:** ${hole.missingLink}\n`;
        markdown += `- **Impact:** ${hole.impact}\n`;
        if (hole.file) {
          markdown += `- **Location:** ${hole.file}${hole.line ? ':' + hole.line : ''}\n`;
        }
        markdown += '\n';
      }
    }
    
    // Dead Files
    if (this.pipeline.files.dead.length > 0) {
      markdown += `\n## Dead Files (First 10)\n\n`;
      for (const file of this.pipeline.files.dead.slice(0, 10)) {
        markdown += `- \`${path.basename(file.path)}\`: ${file.reason}\n`;
      }
    }
    
    // Recommendations
    markdown += `\n## Recommendations\n\n`;
    for (const rec of this.pipeline.recommendations) {
      markdown += `### [${rec.priority}] ${rec.issue}\n`;
      markdown += `- **Action:** ${rec.action}\n`;
      markdown += `- **Impact:** ${rec.impact}\n\n`;
    }
    
    // Performance Metrics
    if (this.pipeline.performanceMetrics) {
      markdown += `## Performance Metrics\n\n`;
      markdown += `- **File Write:** ${this.pipeline.performanceMetrics.fileIO?.writeTime}ms\n`;
      markdown += `- **File Read:** ${this.pipeline.performanceMetrics.fileIO?.readTime}ms\n`;
      markdown += `- **Memory Growth:** ${this.pipeline.performanceMetrics.memory?.heapGrowth}MB\n`;
    }
    
    await fs.writeFile(reportPath, markdown, 'utf8');
    this.log(`\n📄 Markdown report saved: ${reportPath}`, 'green');
  }

  async generateJSONReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.logsDir, `memory-pipeline-${timestamp}.json`);
    
    await fs.writeFile(reportPath, JSON.stringify(this.pipeline, null, 2), 'utf8');
    this.log(`📊 JSON report saved: ${reportPath}`, 'green');
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new EchoMemoryPipelineAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = EchoMemoryPipelineAnalyzer;