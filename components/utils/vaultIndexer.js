// utils/vaultIndexer.js

const fs = require('fs');
const path = require('path');

function getMarkdownFiles(dir, fileList = []) {
  console.log(`🔍 Scanning directory: ${dir}`);
  
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    console.log(`📁 Found ${files.length} items in ${dir}`);
    
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        console.log(`📂 Found subdirectory: ${file.name}`);
        // Skip hidden directories and common non-content folders
        if (!file.name.startsWith('.') && !file.name.startsWith('_')) {
          getMarkdownFiles(filePath, fileList);
        } else {
          console.log(`⏭️  Skipping hidden/system directory: ${file.name}`);
        }
      } else if (file.name.endsWith('.md')) {
        console.log(`📄 Found markdown file: ${file.name}`);
        fileList.push(filePath);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading directory ${dir}:`, error);
  }
  
  return fileList;
}

function parseMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const headings = [];
  const tags = new Set();
  const tasks = [];
  const previewLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      headings.push({
        level: headingMatch[1].length,
        text: headingMatch[2],
        line: i + 1
      });
    }

    const tagMatches = line.match(/(^|\s)(#[\w/-]+)/g);
    if (tagMatches) {
      tagMatches.forEach(tag => tags.add(tag.trim()));
    }

    const taskMatch = line.match(/^\s*[-*]\s+\[ \]\s+(.*)/);
    if (taskMatch) {
      tasks.push({
        text: taskMatch[1],
        line: i + 1
      });
    }

    if (previewLines.length < 5 && line.trim()) {
      previewLines.push(line.trim());
    }
  }

  return {
    headings,
    tags: Array.from(tags),
    tasks,
    preview: previewLines
  };
}

function indexVault(vaultPath) {
  const files = getMarkdownFiles(vaultPath);
  const vaultIndex = {};

  files.forEach(filePath => {
    // Use relative path as key
    const relativePath = path.relative(vaultPath, filePath);
    vaultIndex[relativePath] = parseMarkdown(filePath);
  });

  console.log(`✅ Indexed ${Object.keys(vaultIndex).length} markdown files from vault`);
  return vaultIndex;
}

module.exports = {
  indexVault
};