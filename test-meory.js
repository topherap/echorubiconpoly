const { getVaultPath } = require('./components/utils/VaultPathManager');
const MemorySystem = require('./src/memory').MemorySystem;

async function test() {
    const memorySystem = new MemorySystem(getVaultPath());
    const context = await memorySystem.buildContextForInput('what are my recipes?');
    
    console.log('Memory count:', context.memoryCount);
    console.log('Context length:', context.contextLength);
    
    if (context.memory && context.memory.length > 0) {
        console.log('\nFirst 3 memories:');
        context.memory.slice(0, 3).forEach((mem, i) => {
            console.log(`${i+1}. Type: ${mem.type}`);
            console.log(`   Content: ${mem.content?.substring(0, 100)}...`);
        });
    }
}

test();