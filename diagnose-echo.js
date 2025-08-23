// diagnose-echo.js - Complete Echo Rubicon System Diagnostic
const fs = require('fs').promises;
const path = require('path');
const { ipcRenderer } = require('electron');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class EchoDiagnostic {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      vaultPath: null,
      fileSystem: {},
      searchSystem: {},
      qlibSystem: {},
      memorySystem: {},
      contextPipeline: {},
      dataFlow: {},
      errors: [],
      recommendations: []
    };
  }

  log(message, level = 'info') {
    const colorMap = {
      'info': colors.cyan,
      'success': colors.green,
      'warning': colors.yellow,
      'error': colors.red,
      'header': colors.magenta
    };
    console.log(`${colorMap[level] || ''}${message}${colors.reset}`);
  }

  async run() {
    this.log('\n═══════════════════════════════════════════════════════════', 'header');
    this.log('       ECHO RUBICON COMPLETE SYSTEM DIAGNOSTIC', 'header');
    this.log('═══════════════════════════════════════════════════════════\n', 'header');

    await this.testFileSystem();
    await this.testSearchSystem();
    await this.testQLibSystem();
    await this.checkQLibPatch();
    await this.testMemorySystem();
    await this.testContextPipeline();
    await this.analyzeDataFlow();
    await this.generateReport();
  }

  async testFileSystem() {
    this.log('\n▶ 1. FILE SYSTEM ANALYSIS', 'header');
    this.log('─────────────────────────', 'header');

    try {
      const vaultPath = process.env.OBSIDIAN_VAULT_PATH || 'D:\\Obsidian Vault';
      this.results.vaultPath = vaultPath;
      this.log(`Vault Path: ${vaultPath}`);

      try {
        await fs.access(vaultPath);
        this.log('✓ Vault directory accessible', 'success');
      } catch {
        this.log('✗ Vault directory NOT accessible', 'error');
        this.results.errors.push('Vault directory not found');
        return;
      }

      const clientsPath = path.join(vaultPath, 'clients');
      try {
        const clientFiles = await fs.readdir(clientsPath);
        this.results.fileSystem.clientFiles = clientFiles;
        this.log(`\nClient Files Found: ${clientFiles.length}`, 'info');
        for (const file of clientFiles.slice(0, 5)) {
          const filePath = path.join(clientsPath, file);
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf8');
          this.log(`  • ${file} (${stats.size} bytes)`);
          const nameMatch = content.match(/^#?\s*(.+?)[\r\n]/);
          if (nameMatch) this.log(`    Name: ${nameMatch[1]}`, 'success');
        }
      } catch (e) {
        this.log('✗ Cannot read clients directory', 'error');
        this.results.errors.push(`Clients directory error: ${e.message}`);
      }

      const foodsPath = path.join(vaultPath, 'Foods');
      try {
        const foodFiles = await fs.readdir(foodsPath);
        this.results.fileSystem.foodFiles = foodFiles;
        this.log(`\nFood/Recipe Files Found: ${foodFiles.length}`, 'info');
        for (const file of foodFiles.slice(0, 5)) this.log(`  • ${file}`);
      } catch (e) {
        this.log('✗ Cannot read Foods directory', 'error');
        this.results.errors.push(`Foods directory error: ${e.message}`);
      }

      const conversationDirs = ['conversations', 'Chats'];
      for (const dir of conversationDirs) {
        const convPath = path.join(vaultPath, dir);
        try {
          const files = await fs.readdir(convPath);
          const todayFiles = files.filter(f => f.includes('2025-01-04'));
          this.log(`\n${dir} Directory:`, 'info');
          this.log(`  Total files: ${files.length}`);
          this.log(`  Today's files: ${todayFiles.length}`);
          let pollutionCount = 0;
          for (const file of todayFiles) {
            const content = await fs.readFile(path.join(convPath, file), 'utf8');
            if (content.includes('Unknown') || content.includes('no information about your clients')) pollutionCount++;
          }
          if (pollutionCount > 0) {
            this.log(`  ⚠️  Pollution detected: ${pollutionCount} files with wrong answers`, 'warning');
            this.results.fileSystem[`${dir}Pollution`] = pollutionCount;
          }
        } catch (e) {
          this.log(`  Cannot read ${dir}: ${e.message}`, 'warning');
        }
      }

    } catch (error) {
      this.log(`File system test failed: ${error.message}`, 'error');
      this.results.errors.push(`File system: ${error.message}`);
    }
  }

  async testSearchSystem() {
    this.log('\n\n▶ 2. SEARCH SYSTEM ANALYSIS', 'header');
    this.log('───────────────────────────', 'header');

    const testQueries = [
      { query: 'clients', expected: 'keyword', purpose: 'Find client files' },
      { query: 'who are my clients?', expected: 'natural', purpose: 'Natural language query' },
      { query: 'recipes', expected: 'keyword', purpose: 'Find recipe files' },
      { query: 'carnivore ice cream', expected: 'specific', purpose: 'Specific recipe' }
    ];

    this.log('\nSearch Query Analysis:');
    for (const test of testQueries) {
      this.log(`\nQuery: "${test.query}"`);
      this.log(`  Type: ${test.expected}`);
      this.log(`  Purpose: ${test.purpose}`);
      const keyword = this.extractKeywords(test.query);
      this.log(`  Extracted: "${keyword}"`, keyword !== test.query ? 'success' : 'warning');
    }

    this.results.searchSystem.queryPatterns = testQueries;
  }

  async testQLibSystem() {
    this.log('\n\n▶ 3. Q-LIB SYSTEM ANALYSIS', 'header');
    this.log('──────────────────────────', 'header');

    this.log('\nQ-Lib Data Structure Analysis:');

    const structures = {
      clients: {
        type: 'object_array',
        sample: [
          {content: '#clients', type: 'content'},
          {score: 52},
          {path: 'clients\\Deborah A Lindsey.md', type: 'content', score: 52}
        ]
      },
      recipes: {
        type: 'string_array',
        sample: [
          'Foods\\Bacon-Wrapped Halloumi & Chorizo Skewers with Paprika Oil.md',
          'Foods\\carnivore ice cream.md'
        ]
      }
    };

    for (const [key, data] of Object.entries(structures)) {
      this.log(`\n${key.toUpperCase()} Structure:`);
      this.log(`  Type: ${data.type}`);
      this.log(`  Processing needed: ${data.type === 'object_array' ? 'Extract from objects' : 'Parse paths'}`);
      const processed = data.sample
        .filter(item => item.path || typeof item === 'string')
        .map(item => (item.path || item).split('\\').pop().replace('.md', ''));
      this.log(`  Processed result: ${JSON.stringify(processed)}`, 'success');
    }

    this.results.qlibSystem = structures;
  }

  async checkQLibPatch() {
    this.log('\n\n▶ 3b. Q-LIB PATCH VERIFICATION', 'header');
    this.log('────────────────────────────────', 'header');

    const patchTargets = [
      path.join(__dirname, 'src', 'memory', 'QLibInterface.js'),
      path.join(__dirname, 'components', 'MyAI-global.js')
    ];

    for (const filePath of patchTargets) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const patchRegex = /parsed\.facts\s*=\s*parsed\.facts\.map/;
        this.log(`\n📄 Checking: ${filePath}`);
        if (patchRegex.test(content)) {
          this.log('✅ Patch FOUND: parsed.facts = parsed.facts.map', 'success');
        } else {
          this.log('❌ Patch NOT found', 'error');
          this.results.errors.push(`Patch not found in ${filePath}`);
        }
      } catch (e) {
        this.log(`⚠️ File missing or unreadable: ${filePath}`, 'warning');
        this.results.errors.push(`Missing patch target: ${filePath}`);
      }
    }
  }

  async testMemorySystem() { /* ... unchanged ... */ }
  async testContextPipeline() { /* ... unchanged ... */ }
  async analyzeDataFlow() { /* ... unchanged ... */ }
  async generateReport() { /* ... unchanged ... */ }

  extractKeywords(query) {
    const keywordMap = {
      'clients': ['client', 'clients', 'who are my clients'],
      'recipes': ['recipe', 'recipes', 'how many recipes'],
      'foods': ['food', 'foods', 'carnivore ice cream']
    };
    for (let keyword in keywordMap) {
      if (keywordMap[keyword].some(phrase => query.toLowerCase().includes(phrase))) {
        return keyword;
      }
    }
    return query;
  }
}

const diagnostic = new EchoDiagnostic();
diagnostic.run().catch(console.error);
