// orphan-backtrace.js
// 🧠 Memory reconstruction crawler - rebuilds lost call chains
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const ORPHAN_LIST = [
  "backend\\qlib\\threader\\threaderEngine.js",
  "components\\legacy\\DevPanel.jsx",
  "components\\legacy\\model-benchmarks.jsx",
  "components\\legacy\\ObsidianNotes.jsx",
  "components\\legacy\\SettingsPanel.jsx"
];

const PROJECT_ROOT = path.resolve(__dirname);
const BACKTRACE_LOG = path.join(__dirname, 'logs', 'orphan-backtrace.json');
const SCAN_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Import detection patterns
const IMPORT_PATTERNS = [
  // Standard require
  { 
    pattern: /(?:^|\s)require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/gm,
    type: 'require'
  },
  // ES6 imports
  { 
    pattern: /(?:^|\s)import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/gm,
    type: 'import'
  },
  // Dynamic imports
  { 
    pattern: /(?:^|\s)import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/gm,
    type: 'dynamic'
  },
  // Commented require
  { 
    pattern: /\/\/.*?require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/gm,
    type: 'commented-require'
  },
  // Commented import
  { 
    pattern: /\/\/.*?import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/gm,
    type: 'commented-import'
  }
];

function loadOrphanList() {
  return ORPHAN_LIST.map(p => path.normalize(p).replace(/\\/g, '/'));
}

function scanCodebase(rootPath) {
  const files = [];
  
  function traverse(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip common non-source directories
          if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
            traverse(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (SCAN_EXTENSIONS.includes(ext)) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              files.push({
                path: path.relative(rootPath, fullPath).replace(/\\/g, '/'),
                content
              });
            } catch (err) {
              console.warn(chalk.yellow(`⚠️  Could not read ${fullPath}: ${err.message}`));
            }
          }
        }
      }
    } catch (err) {
      console.warn(chalk.yellow(`⚠️  Could not scan ${dir}: ${err.message}`));
    }
  }
  
  traverse(rootPath);
  return files;
}

function findImportMentions(fileContent, orphanPath) {
  const matches = [];
  const lines = fileContent.split('\n');
  
  lines.forEach((lineText, index) => {
    const lineNumber = index + 1;
    const trimmed = lineText.trim();
    
    IMPORT_PATTERNS.forEach(({ pattern, type }) => {
      // Reset pattern for each line
      pattern.lastIndex = 0;
      let match;
      
      while ((match = pattern.exec(lineText)) !== null) {
        const importPath = match[1];
        
        if (pathMatches(importPath, orphanPath)) {
          const isCommented = type.includes('commented') || 
                            trimmed.startsWith('//') || 
                            trimmed.startsWith('/*');
          
          matches.push({
            line: lineNumber,
            commentStatus: isCommented ? 'commented' : 'active',
            importType: type,
            matchText: trimmed,
            importPath
          });
        }
      }
    });
  });
  
  return matches;
}

function pathMatches(importPath, orphanPath) {
  // Normalize paths for comparison
  const normalized = path.normalize(importPath).replace(/\\/g, '/');
  const orphanNorm = path.normalize(orphanPath).replace(/\\/g, '/');
  
  // Remove file extensions for comparison
  const importBase = normalized.replace(/\.(js|jsx|ts|tsx)$/, '');
  const orphanBase = orphanNorm.replace(/\.(js|jsx|ts|tsx)$/, '');
  
  // Multiple matching strategies
  return (
    // Exact match
    importBase === orphanBase ||
    // Orphan path ends with import path
    orphanBase.endsWith(importBase) ||
    // Import path ends with orphan path
    importBase.endsWith(orphanBase) ||
    // Basename match (last resort)
    path.basename(importBase) === path.basename(orphanBase)
  );
}

function mapBacklinks() {
  const orphans = loadOrphanList();
  const codebaseFiles = scanCodebase(PROJECT_ROOT);
  const traceMap = {};
  
  console.log(chalk.bold(`\n🔍 Scanning ${codebaseFiles.length} files for orphan references...`));
  
  orphans.forEach(orphanPath => {
    console.log(chalk.blue(`\n📄 Tracing: ${orphanPath}`));
    
    const backlinks = [];
    
    codebaseFiles.forEach(file => {
      const mentions = findImportMentions(file.content, orphanPath);
      
      if (mentions.length > 0) {
        mentions.forEach(mention => {
          backlinks.push({
            file: file.path,
            ...mention
          });
        });
        
        const statusIcon = mentions.some(m => m.commentStatus === 'active') ? '🔗' : '💬';
        console.log(chalk.gray(`  ${statusIcon} ${file.path} (${mentions.length} matches)`));
      }
    });
    
    traceMap[orphanPath] = {
      usedBy: backlinks,
      status: determineStatus(backlinks),
      totalReferences: backlinks.length,
      activeReferences: backlinks.filter(b => b.commentStatus === 'active').length
    };
  });
  
  return traceMap;
}

function determineStatus(backlinks) {
  if (backlinks.length === 0) return 'orphaned';
  
  const activeLinks = backlinks.filter(b => b.commentStatus === 'active');
  const commentedLinks = backlinks.filter(b => b.commentStatus === 'commented');
  
  if (activeLinks.length > 0) return 'partially connected';
  if (commentedLinks.length > 0) return 'commented out';
  
  return 'unknown';
}

function saveResult(traceMap) {
  // Ensure logs directory exists
  const logsDir = path.dirname(BACKTRACE_LOG);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Write detailed results
  fs.writeFileSync(BACKTRACE_LOG, JSON.stringify(traceMap, null, 2), 'utf8');
  
  // Display summary
  console.log(chalk.bold('\n📊 Backtrace Summary:'));
  
  Object.entries(traceMap).forEach(([orphan, data]) => {
    const statusColor = data.status === 'orphaned' ? 'red' : 
                       data.status === 'partially connected' ? 'yellow' : 'blue';
    
    console.log(chalk[statusColor](
      `${orphan}: ${data.status} (${data.activeReferences}/${data.totalReferences} active)`
    ));
  });
  
  console.log(chalk.green(`\n✅ Detailed backtrace saved to: ${BACKTRACE_LOG}`));
}

// Main execution
(function runBacktrace() {
  console.log(chalk.bold('\n🧠 Orphan Backtrace Crawler'));
  console.log(chalk.gray('Reconstructing lost call chains...'));
  
  try {
    const traceMap = mapBacklinks();
    saveResult(traceMap);
    
    // Quick reconnection hints
    console.log(chalk.bold('\n💡 Quick Reconnection Hints:'));
    Object.entries(traceMap).forEach(([orphan, data]) => {
      if (data.status === 'commented out') {
        console.log(chalk.yellow(`• ${orphan}: Uncomment imports in ${data.usedBy.length} files`));
      } else if (data.status === 'orphaned') {
        console.log(chalk.red(`• ${orphan}: No references found - may need manual integration`));
      }
    });
    
  } catch (error) {
    console.error(chalk.red(`\n💥 Backtrace failed: ${error.message}`));
    process.exit(1);
  }
})();