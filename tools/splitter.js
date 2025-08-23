// splitter.js

const fs = require('fs');
const path = require('path');
const { tokenize } = require('./tokenizer');
const {
    parseImport,
    parseExport
} = require('./scopeAnalyzer');
const { findBreakPoints } = require('./breakpointFinder');
const {
    analyzeDependencies,
    generateImportsExports
} = require('./dependencyGraph');

function split(filePath, numChunks = 4) {
    const code = fs.readFileSync(filePath, 'utf8');
    const tokens = tokenize(code);

    // Manually extract global imports/exports
    const imports = [];
    const exports = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.value === 'import') {
            parseImport(tokens, i, imports);
        }
        if (token.value === 'export') {
            parseExport(tokens, i, exports);
        }
    }

    const breakPoints = findBreakPoints(tokens, numChunks);
    const chunks = analyzeDependencies(tokens, breakPoints);
    const processedChunks = generateImportsExports(chunks);

    const baseName = path.basename(filePath, '.js');
    const baseDir = path.dirname(filePath);

    // Add original imports to first chunk
    if (imports.length > 0) {
        processedChunks[0].imports.unshift(...imports);
    }

    // Add original exports to last chunk
    if (exports.length > 0) {
        processedChunks[processedChunks.length - 1].exports.push(...exports);
    }

    processedChunks.forEach((chunk, index) => {
        const content = [
            ...chunk.imports,
            chunk.imports.length > 0 ? '' : null,
            chunk.content,
            chunk.exports.length > 0 ? '' : null,
            ...chunk.exports
        ].filter(line => line !== null).join('\n');

        const outputPath = path.join(baseDir, `${baseName}-chunk${index + 1}.js`);
        fs.writeFileSync(outputPath, content);
    });

    console.log(`✅ Split ${filePath} into ${numChunks} intelligent chunks`);
    console.log(`📦 Output files: ${processedChunks.map((_, i) => `${baseName}-chunk${i + 1}.js`).join(', ')}`);
}

// CLI entrypoint
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: node splitter.js <file.js> [chunks]');
        process.exit(1);
    }

    const filePath = args[0];
    const chunks = parseInt(args[1]) || 4;
    split(filePath, chunks);
}

module.exports = { split };
