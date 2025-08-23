const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
console.error(`Analyzing: ${projectRoot}`);

const usedFiles = new Set();
const allFiles = new Map();

// Core entry points for Electron app
const entryPoints = [
    'main.js',
    'preload.js',
    'index.html',
    'src/renderer.js',
    'src/index.js'
];

// Important directories that contain active code
const activeDirs = ['src', 'components', 'backend', 'main', 'tools/core'];

function scanDirectory(dir, isActive = false) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (!item.startsWith('.') && item !== 'node_modules') {
                const subIsActive = isActive || activeDirs.some(ad => fullPath.includes(ad));
                scanDirectory(fullPath, subIsActive);
            }
        } else if (item.endsWith('.js')) {
            const relPath = path.relative(projectRoot, fullPath);
            allFiles.set(relPath, { path: fullPath, isInActiveDir: isActive });
        }
    });
}

// Mark entry points as used
entryPoints.forEach(ep => {
    const fullPath = path.join(projectRoot, ep);
    if (fs.existsSync(fullPath)) {
        usedFiles.add(path.relative(projectRoot, fullPath));
    }
});

// Scan all directories
scanDirectory(projectRoot);

// Analyze imports to find used files
function analyzeImports(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const importPatterns = [
            /require\s*\(\s*['"\`]([^'"\`]+)['"\`]\s*\)/g,
            /import.*from\s+['"\`]([^'"\`]+)['"\`]/g
        ];
        
        importPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const imp = match[1];
                if (imp.startsWith('.')) {
                    const resolved = path.resolve(path.dirname(filePath), imp);
                    [resolved, resolved + '.js', resolved + '/index.js'].forEach(candidate => {
                        if (fs.existsSync(candidate)) {
                            usedFiles.add(path.relative(projectRoot, candidate));
                        }
                    });
                }
            }
        });
    } catch (e) {}
}

// Analyze all files in active directories
allFiles.forEach((info, relPath) => {
    if (info.isInActiveDir || usedFiles.has(relPath)) {
        analyzeImports(info.path);
    }
});

// Categorize unused files
const unusedByCategory = {
    diagnostics: [],
    tests: [],
    backups: [],
    tools: [],
    rootScripts: [],
    other: []
};

allFiles.forEach((info, relPath) => {
    if (!usedFiles.has(relPath) && !info.isInActiveDir) {
        const name = path.basename(relPath).toLowerCase();
        const dir = path.dirname(relPath);
        
        if (name.includes('diag') || name.includes('diagnostic') || name.includes('audit')) {
            unusedByCategory.diagnostics.push(relPath);
        } else if (name.includes('test') || name.includes('spec')) {
            unusedByCategory.tests.push(relPath);
        } else if (name.includes('backup') || name.includes('old') || name.includes('copy')) {
            unusedByCategory.backups.push(relPath);
        } else if (dir.includes('tools') && !dir.includes('tools/core')) {
            unusedByCategory.tools.push(relPath);
        } else if (dir === '.' && name.startsWith('echo-')) {
            unusedByCategory.rootScripts.push(relPath);
        } else {
            unusedByCategory.other.push(relPath);
        }
    }
});

const totalUnused = Object.values(unusedByCategory).reduce((sum, arr) => sum + arr.length, 0);

console.log(JSON.stringify({
    stats: {
        total: allFiles.size,
        used: usedFiles.size,
        unused: totalUnused,
        inActiveDirs: Array.from(allFiles.values()).filter(f => f.isInActiveDir).length
    },
    unusedByCategory,
    summary: Object.fromEntries(
        Object.entries(unusedByCategory).map(([k, v]) => [k, v.length])
    )
}, null, 2));
