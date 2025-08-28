const fs = require('fs-extra');
const path = require('path');

// Import your existing epoch classifier
const { assignEpochAndWeight } = require('../backend/qlib/epochClassifier');

async function migrateCapsulesToEpochs(vaultPath) {
    const capsulesPath = path.join(vaultPath, '.echo/capsules');
    
    console.log('🧬 Starting Temporal Sovereignty Migration...');
    console.log('📂 Scanning:', capsulesPath);
    
    if (!await fs.pathExists(capsulesPath)) {
        console.log('❌ No capsules directory found');
        return;
    }
    
    const allCapsules = [];
    await scanForCapsules(capsulesPath, allCapsules);
    
    console.log(`📊 Found ${allCapsules.length} capsules to migrate`);
    await analyzeCurrentStructure(allCapsules);
    console.log('📋 Current structure audit complete');
    
    // PERFORM MIGRATION
    await performMigration(allCapsules, vaultPath);
    
    return allCapsules;
}

async function scanForCapsules(dir, results, depth = 0) {
    if (depth > 4) return; // Safety limit
    
    const items = await fs.readdir(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
            await scanForCapsules(fullPath, results, depth + 1);
        } else if (item.endsWith('.json')) {
            try {
                const capsule = JSON.parse(await fs.readFile(fullPath, 'utf8'));
                results.push({
                    capsule,
                    currentPath: fullPath,
                    relativePath: path.relative(dir, fullPath)
                });
            } catch (e) {
                console.log('⚠️ Skipping invalid JSON:', fullPath);
            }
        }
    }
}

async function analyzeCurrentStructure(capsules) {
    console.log('\n📁 CURRENT STORAGE: All capsules in root folder (flat)');
    
    const epochCounts = { recent: 0, fading: 0, midterm: 0, longterm: 0 };
    
    console.log('\n🧬 EPOCH CLASSIFICATION PREVIEW (First 5):');
    
    for (const { capsule } of capsules.slice(0, 5)) {
        try {
            const epochData = assignEpochAndWeight(capsule);
            const project = 'misc';
            
            const created = new Date(capsule.timestamp || capsule.createdAt).toLocaleDateString();
            console.log(`  📄 ${capsule.id}: ${project}/${epochData.epoch} (weight: ${epochData.weight})`);
        } catch (e) {
            console.log(`  ⚠️ ${capsule.id}: Classification failed`);
        }
    }
    
    // Count all capsules
    for (const { capsule } of capsules) {
        try {
            const epochData = assignEpochAndWeight(capsule);
            epochCounts[epochData.epoch]++;
        } catch (e) {
            epochCounts.longterm++;
        }
    }
    
    console.log('\n📊 EPOCH DISTRIBUTION:');
    console.log(`  🟢 Recent: ${epochCounts.recent} capsules`);
    console.log(`  🟡 Fading: ${epochCounts.fading} capsules`);
    console.log(`  🟠 Midterm: ${epochCounts.midterm} capsules`);
    console.log(`  🔴 Longterm: ${epochCounts.longterm} capsules`);
}

async function performMigration(capsules, vaultPath) {
    console.log('\n🚀 PERFORMING MIGRATION...');
    
    const capsulesPath = path.join(vaultPath, '.echo/capsules');
    let migrated = 0;
    
    for (const { capsule, currentPath } of capsules) {
        try {
            const epochData = assignEpochAndWeight(capsule);
            const project = 'misc';
            
            const newDir = path.join(capsulesPath, project, epochData.epoch);
            const newPath = path.join(newDir, path.basename(currentPath));
            
            if (currentPath === newPath) continue;
            
            await fs.ensureDir(newDir);
            await fs.move(currentPath, newPath);
            
            migrated++;
            if (migrated <= 3) {
                console.log(`  📦 ${capsule.id} → ${project}/${epochData.epoch}/`);
            }
            
        } catch (e) {
            console.log(`  ❌ Failed: ${capsule.id}`);
        }
    }
    
    console.log(`\n✅ MIGRATED ${migrated} CAPSULES`);
    await showNewStructure(capsulesPath);
}

async function showNewStructure(capsulesPath) {
    console.log('\n📁 NEW STRUCTURE:');
    
    try {
        const projects = await fs.readdir(capsulesPath);
        
        for (const project of projects.filter(p => !p.includes('.'))) {
            const projectPath = path.join(capsulesPath, project);
            
            if ((await fs.stat(projectPath)).isDirectory()) {
                console.log(`  📂 ${project}/`);
                
                const epochs = await fs.readdir(projectPath);
                for (const epoch of epochs.filter(e => !e.includes('.'))) {
                    const epochPath = path.join(projectPath, epoch);
                    
                    if ((await fs.stat(epochPath)).isDirectory()) {
                        const files = await fs.readdir(epochPath);
                        const count = files.filter(f => f.endsWith('.json')).length;
                        console.log(`    📁 ${epoch}/: ${count} capsules`);
                    }
                }
            }
        }
    } catch (e) {
        console.log('  ⚠️ Structure analysis failed');
    }
}

// CLI execution
if (require.main === module) {
    const vaultPath = process.argv[2];
    
    if (!vaultPath) {
        console.log('❌ Usage: node scripts/migrate-to-epochs.js "D:\\Obsidian Vault"');
        process.exit(1);
    }
    
    migrateCapsulesToEpochs(vaultPath)
        .then(() => {
            console.log('🎯 TEMPORAL SOVEREIGNTY ESTABLISHED');
            process.exit(0);
        })
        .catch(err => {
            console.error('💥 Error:', err);
            process.exit(1);
        });
}

module.exports = { migrateCapsulesToEpochs };