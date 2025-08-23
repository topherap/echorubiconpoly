const path = require('path');
const fs = require('fs');

// This file must exist
const indexPath = path.join('D:\\Obsidian Vault', '.echo', 'index.json');

if (!fs.existsSync(indexPath)) {
  console.log('❌ index.json is missing');
} else {
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  console.log('✅ index.json loaded. Capsule count:', index?.capsules?.length);
}
