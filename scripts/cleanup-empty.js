const fs = require('fs-extra');
const path = require('path');

async function cleanupEmptyFolders(vaultPath) {
    const capsulesPath = path.join(vaultPath, '.echo/capsules');
    
    console.log('🧹 Cleaning up empty folders...');
    
    const foldersToCheck = ['2025', '2025-08', 'clients', 'food', 'openchat'];
    let cleaned = 0;
    
    for (const folder of foldersToCheck) {
        const folderPath = path.join(capsulesPath, folder);
        
        if (await fs.pathExists(folderPath)) {
            const isEmpty = await isFolderEmpty(folderPath);
            if (isEmpty) {
                await fs.remove(folderPath);
                console.log(`  🗑️ Removed: ${folder}/`);
                cleaned++;
            } else {
                console.log(`  📂 Kept: ${folder}/ (contains files)`);
            }
        }
    }
    
    console.log(`✅ Cleaned ${cleaned} empty folders`);
}

async function isFolderEmpty(folderPath) {
    try {
        const items = await fs.readdir(folderPath);
        
        // Recursively check if any subdirectories contain files
        for (const item of items) {
            const itemPath = path.join(folderPath, item);
            const stat = await fs.stat(itemPath);
            
            if (stat.isFile()) {
                return false; // Found a file
            } else if (stat.isDirectory()) {
                const subEmpty = await isFolderEmpty(itemPath);
                if (!subEmpty) return false; // Subdirectory has files
            }
        }
        
        return true; // No files found
    } catch (e) {
        return false; // Assume not empty if we can't read it
    }
}

// CLI execution
if (require.main === module) {
    const vaultPath = process.argv[2];
    
    if (!vaultPath) {
        console.log('❌ Usage: node scripts/cleanup-empty.js "D:\\Obsidian Vault"');
        process.exit(1);
    }
    
    cleanupEmptyFolders(vaultPath)
        .then(() => {
            console.log('🎯 CLEANUP COMPLETE');
            process.exit(0);
        })
        .catch(err => {
            console.error('💥 Error:', err);
            process.exit(1);
        });
}