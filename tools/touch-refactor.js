const fs = require('fs-extra');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;

const INPUT_FILE = './monstrosity.js'; // Adjust to your file
const OUTPUT_BASE = './chunks/';

async function run() {
    const code = await fs.readFile(INPUT_FILE, 'utf8');
    const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'classProperties']
    });

    const topLevelNodes = [];
    traverse(ast, {
        Program(path) {
            path.node.body.forEach(node => topLevelNodes.push(node));
        }
    });

    const chunkSize = Math.ceil(topLevelNodes.length / 4);
    await fs.ensureDir(OUTPUT_BASE);

    for (let i = 0; i < 4; i++) {
        const chunkNodes = topLevelNodes.slice(i * chunkSize, (i + 1) * chunkSize);
        const chunkAst = {
            type: 'File',
            program: {
                type: 'Program',
                body: chunkNodes,
                sourceType: 'module'
            }
        };
        const output = generator(chunkAst).code;
        await fs.writeFile(path.join(OUTPUT_BASE, `chunk${i + 1}.js`), output);
    }

    console.log('✅ Split complete: 4 chunks in /chunks');
}

run();
