/**
 * Universal Capsule Filter
 * Blocks capsule_*.json files from appearing in search results
 * Applied across all search endpoints to ensure clean data
 */

function filterOutCapsules(results) {
  if (!results || !Array.isArray(results)) {
    console.log('[CAPSULE_FILTER] No results to filter or not array:', typeof results);
    return results;
  }
  
  const filtered = results.filter(item => {
    if (!item || typeof item !== 'object') {
      console.log('[CAPSULE_FILTER] Invalid item:', item);
      return true; // Keep non-objects for safety
    }
    
    // Get all possible name/path fields
    const filename = item.filename || item.name || item.title || '';
    const filePath = item.path || item.relativePath || item.file || '';
    const id = item.id || '';
    
    // Block anything that looks like a capsule
    const reasons = [];
    
    if (filename.includes('capsule_')) {
      reasons.push(`filename contains capsule_: ${filename}`);
    }
    
    if (filePath.includes('/capsules/') || filePath.includes('\\capsules\\')) {
      reasons.push(`path contains capsules folder: ${filePath}`);
    }
    
    if (filePath.includes('capsule_')) {
      reasons.push(`path contains capsule_: ${filePath}`);
    }
    
    if (id.includes('capsule_')) {
      reasons.push(`id contains capsule_: ${id}`);
    }
    
    // Block .echo folder entirely (contains conversation logs and capsules)
    if (filePath.includes('/.echo/') || filePath.includes('\\.echo\\') || filePath.includes('.echo/') || filePath.includes('.echo\\')) {
      reasons.push(`path in .echo folder: ${filePath}`);
    }
    
    // Block by folder name directly
    const folder = item.folder || '';
    if (folder === '.echo' || folder.startsWith('.echo')) {
      reasons.push(`folder is .echo: ${folder}`);
    }
    
    // Block if any capsule indicators found
    if (reasons.length > 0) {
      console.log('[CAPSULE_FILTER] BLOCKING:', reasons.join(', '));
      return false;
    }
    
    // Allow everything else including legitimate chat logs and notes
    return true;
  });
  
  const blockedCount = results.length - filtered.length;
  if (blockedCount > 0) {
    console.log(`[CAPSULE_FILTER] Filtered out ${blockedCount} capsule files, kept ${filtered.length} results`);
  }
  
  return filtered;
}

module.exports = { filterOutCapsules };