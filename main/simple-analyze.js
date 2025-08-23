const fs = require('fs');
const path = require('path');

console.error('Starting analysis...');

const projectRoot = process.argv[2] || process.cwd();
console.error('Project root:', projectRoot);

const allFiles = [];

function findFiles(dir) {
    try {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                findFiles(fullPath);
            } else if (item.endsWith('.js')) {
                allFiles.push(fullPath);
            }
        });
    } catch (e) {
        console.error('Error scanning:', dir, e.message);
    }
}

findFiles(projectRoot);

const unused = allFiles.filter(file => {
    const relative = file.toLowerCase();
    return relative.includes('test') || 
           relative.includes('old') || 
           relative.includes('backup');
});

console.log(JSON.stringify({
    stats: {
        total: allFiles.length,
        unused: unused.length
    },
    unused: unused
}, null, 2));
