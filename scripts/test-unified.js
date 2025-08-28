const { MemoryCapsule } = require('../src/memory/capsule');
const { MemoryVaultManager } = require('../src/memory/vault');

async function testUnifiedSystem(vaultPath) {
    console.log('Testing unified epoch system...');
    
    // Mock vault manager
    const mockVaultManager = {
        vaultPath: vaultPath
    };
    
    const vault = new MemoryVaultManager(mockVaultManager);
    
    // Create test capsule
    const testCapsule = new MemoryCapsule({
        content: "Test capsule for unified epoch system",
        type: "conversation",
        timestamp: Date.now()
    });
    
    console.log('Test capsule ID:', testCapsule.id);
    console.log('Created at:', new Date(testCapsule.timestamp));
    
    // Save capsule
    const result = await vault.saveCapsule(testCapsule);
    console.log('Saved to:', result.path);
    
    console.log('Test complete - check if capsule appears in misc/recent/');
}

if (require.main === module) {
    const vaultPath = process.argv[2];
    
    if (!vaultPath) {
        console.log('Usage: node scripts/test-unified.js "D:\\Obsidian Vault"');
        process.exit(1);
    }
    
    testUnifiedSystem(vaultPath)
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Error:', err);
            process.exit(1);
        });
}