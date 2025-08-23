// metadata-stripper.js
const fs = require('fs').promises;
const path = require('path');

/**
 * Strips ALL metadata pollution from the top of markdown files
 * Handles: YAML frontmatter, unclosed ```metadata blocks, and cascading corruption
 */
function stripAllMetadata(content) {
  if (!content) return '';
  
  // Step 1: Remove YAML frontmatter (even if malformed)
  // Matches from start of file: --- ... --- (greedy, handles nested)
  content = content.replace(/^---[\s\S]*?---\s*\n/m, '');
  
  // Step 2: Remove ```metadata blocks (even if unclosed)
  // This regex handles:
  // - ```metadata with or without closing ```
  // - Multiple stacked blocks
  // - Blocks that run to end of file
  let previousLength;
  do {
    previousLength = content.length;
    
    // Remove from start of content only
    content = content.replace(/^```metadata[\s\S]*?(?:```|$)\s*\n?/m, '');
    
    // Also catch variant forms
    content = content.replace(/^```[\s]*metadata[\s\S]*?(?:```|$)\s*\n?/m, '');
    
  } while (content.length < previousLength); // Keep going until no more changes
  
  // Step 3: Remove markdown metadata sections (## Who, ## What, etc.)
  // Only from the top of the file, stop at first real content
  const lines = content.split('\n');
  let realContentStart = 0;
  let inMetadataSection = true;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Metadata section headers
    if (inMetadataSection && /^##\s+(Who|What|When|Where|Why|Tags|Updated|Folder|Echo Notes)/i.test(line)) {
      continue;
    }
    
    // Metadata content (follows metadata headers)
    if (inMetadataSection && line && !line.startsWith('#') && !line.startsWith('---')) {
      // Check if this looks like metadata content
      if (i > 0 && /^##\s+(Who|What|When|Where|Why|Tags|Updated|Folder|Echo Notes)/i.test(lines[i-1])) {
        continue;
      }
    }
    
    // Tags in list format
    if (inMetadataSection && /^\s*-\s+\w+/.test(line) && i > 0 && /^##\s+Tags/i.test(lines[i-1])) {
      continue;
    }
    
    // Horizontal rule ends metadata
    if (line === '---') {
      realContentStart = i + 1;
      break;
    }
    
    // Real content detected
    if (line && !line.match(/^##\s+(Who|What|When|Where|Why|Tags|Updated|Folder|Echo Notes)/i)) {
      realContentStart = i;
      break;
    }
  }
  
  // Return only content after metadata
  return lines.slice(realContentStart).join('\n').trim();
}

/**
 * Process a single file
 */
async function cleanFile(filePath, options = {}) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const cleaned = stripAllMetadata(content);
    
    if (options.backup) {
      const date = new Date().toISOString().split('T')[0];
await fs.writeFile(filePath + `.${date}.bak`, content, 'utf8');
    }
    
    if (!options.dryRun) {
      await fs.writeFile(filePath, cleaned, 'utf8');
    }
    
    return {
      path: filePath,
      originalLength: content.length,
      cleanedLength: cleaned.length,
      bytesRemoved: content.length - cleaned.length,
      success: true
    };
  } catch (error) {
    return {
      path: filePath,
      error: error.message,
      success: false
    };
  }
}

/**
 * Clean an entire folder
 */
async function cleanFolder(folderPath, options = {}) {
  const results = [];
  
  try {
    const files = await fs.readdir(folderPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    for (const file of mdFiles) {
      const filePath = path.join(folderPath, file);
      const result = await cleanFile(filePath, options);
      results.push(result);
      
      if (result.success) {
        console.log(`✓ Cleaned: ${file} (removed ${result.bytesRemoved} bytes)`);
      } else {
        console.log(`✗ Failed: ${file} - ${result.error}`);
      }
    }
  } catch (error) {
    console.error(`Error reading folder: ${error.message}`);
  }
  
  return results;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const targetPath = args[0];
  
  if (!targetPath) {
    console.log('Usage: node metadata-stripper.js <path> [--backup] [--dry-run]');
    console.log('  <path>    - File or folder to clean');
    console.log('  --backup  - Create .backup files');
    console.log('  --dry-run - Show what would be removed without changing files');
    process.exit(1);
  }
  
  const options = {
    backup: args.includes('--backup'),
    dryRun: args.includes('--dry-run')
  };
  
  (async () => {
    const stats = await fs.stat(targetPath);
    
    if (stats.isDirectory()) {
      console.log(`Cleaning folder: ${targetPath}`);
      const results = await cleanFolder(targetPath, options);
      
      const successful = results.filter(r => r.success).length;
      const totalRemoved = results.reduce((sum, r) => sum + (r.bytesRemoved || 0), 0);
      
      console.log(`\nComplete: ${successful}/${results.length} files cleaned`);
      console.log(`Total metadata removed: ${totalRemoved} bytes`);
    } else {
      const result = await cleanFile(targetPath, options);
      if (result.success) {
        console.log(`Cleaned ${targetPath} - removed ${result.bytesRemoved} bytes`);
      } else {
        console.log(`Failed: ${result.error}`);
      }
    }
  })();
}

module.exports = { stripAllMetadata, cleanFile, cleanFolder };