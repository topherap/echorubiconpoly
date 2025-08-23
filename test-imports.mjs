// test-imports.js - Run this with Node to test if imports work
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log('Testing Echo imports...\n');

try {
    // Test if files exist
    const fs = require('fs');
    const path = require('path');
    
    const files = [
        './src/echo/memory/capsuleRetriever.js',
        './src/echo/memory/ContextInjector.js',
        './src/echo/memory/ModelInterface.js'
    ];
    
    files.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`✓ Found: ${file}`);
            // Try to read first line
            const content = fs.readFileSync(file, 'utf8');
            const firstLine = content.split('\n')[0];
            console.log(`  First line: ${firstLine.substring(0, 50)}...`);
        } else {
            console.log(`✗ Missing: ${file}`);
        }
    });
    
} catch (error) {
    console.error('Error:', error.message);
}
