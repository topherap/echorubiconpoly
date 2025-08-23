const fs = require('fs');
const path = require('path');

console.log('ECHO RUBICON SIMPLE DIAGNOSTIC');
console.log('========================================');

const PROJECT_ROOT = process.cwd();
console.log('Project root:', PROJECT_ROOT);

const keyFiles = [
  'src/memory/index.js',
  'main/ipc-handlers.js',
  'main/app.js',
  'package.json'
];

keyFiles.forEach(file => {
  const exists = fs.existsSync(path.join(PROJECT_ROOT, file));
  console.log((exists ? 'YES' : 'NO ') + ' ' + file);
});

console.log('Done!');
