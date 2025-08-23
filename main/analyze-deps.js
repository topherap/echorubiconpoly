const fs = require('fs');
const path = require('path');

console.error('Starting analysis...');

const projectRoot = process.argv[2] || process.cwd();
console.error('Project root:', projectRoot);

const usedFiles = new Set();
const allFiles = new Set();

// Add your entry points
['main.js', 'renderer.js', 'index.html', 'preload.js'].forEach(entry => {
    const fullPath = path.join(projectRoot, entry);
    if (fs.existsSync(fullPath)) {
        usedFiles.add(fullPath);
        console.error('Entry point found:', entry);
    }
});

// Find all JS files
function findFiles(dir) {
    try {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                findFiles(fullPath);
            } else if (item.endsWith('.js')) {
                allFiles.add(fullPath);
            }
        });
    } catch (e) {
        console.error('Error scanning:', dir, e.message);
    }
}

findFiles(projectRoot);
console.error(`Found ${allFiles.size} total JS files`);

// For now, mark files with 'test', 'old', 'backup' as unused
const unused = Array.from(allFiles).filter(file => {
    const relative = file.toLowerCase();
    return (relative.includes('test') || 
            relative.includes('old') || 
            relative.includes('backup') ||
            relative.includes('example')) &&
           !usedFiles.has(file);
});

console.log(JSON.stringify({
    stats: {
        total: allFiles.size,
        used: usedFiles.size,
        unused: unused.length
    },
    unused: unused
}, null, 2));