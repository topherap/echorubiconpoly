const fs = require('fs/promises');
const path = require('path');
const { MemoryVaultManager } = require('../src/memory/MemoryVaultManager');

// Configuration constants
const CONFIG = {
 MAX_TOKENS_PER_CONTEXT: 4000,
 MAX_CAPSULES_PER_TAG: 50,
 RELEVANCE_DECAY_DAYS: 90,
 SIMILARITY_THRESHOLD: 0.7,
 TOKEN_ESTIMATES: {
   CAPSULE_OVERHEAD: 30,  // formatting, dates, etc
   AVG_SUMMARY_TOKENS: 100
 }
};

// Improved similarity using normalized edit distance
function similarity(a, b) {
 if (!a || !b) return 0;
 
 // Normalize strings
 const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
 const s1 = normalize(a);
 const s2 = normalize(b);
 
 // Calculate Levenshtein distance
 const matrix = Array(s2.length + 1).fill(null).map(() => 
   Array(s1.length + 1).fill(null)
 );
 
 for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
 for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
 
 for (let j = 1; j <= s2.length; j++) {
   for (let i = 1; i <= s1.length; i++) {
     const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
     matrix[j][i] = Math.min(
       matrix[j][i - 1] + 1,
       matrix[j - 1][i] + 1,
       matrix[j - 1][i - 1] + cost
     );
   }
 }
 
 const maxLen = Math.max(s1.length, s2.length);
 return 1 - (matrix[s2.length][s1.length] / maxLen);
}

// Calculate relevance score based on recency and importance
function calculateRelevance(capsule, currentTime) {
 const ageInDays = (currentTime - new Date(capsule.timestamp)) / (1000 * 60 * 60 * 24);
 const recencyScore = Math.max(0, 1 - (ageInDays / CONFIG.RELEVANCE_DECAY_DAYS));
 
 // Priority boost for certain capsule types
 const priorityBoost = capsule.priority || 1;
 
 return recencyScore * priorityBoost;
}

// Estimate token count for a capsule
function estimateTokens(capsule) {
 const summaryTokens = Math.ceil((capsule.summary?.length || 0) / 4);
 return CONFIG.TOKEN_ESTIMATES.CAPSULE_OVERHEAD + summaryTokens;
}

async function buildThreadedMemory(vaultPath, options = {}) {
 const {
   maxCapsules = CONFIG.MAX_CAPSULES_PER_TAG,
   tokenBudget = CONFIG.MAX_TOKENS_PER_CONTEXT,
   tags = null  // null = all tags, array = specific tags
 } = options;
 
 const vaultManager = new MemoryVaultManager(vaultPath);
 await vaultManager.initialize();
 
 // Stream capsules if possible, otherwise fall back to batch load
 const capsules = await vaultManager.loadCapsules();
 const currentTime = new Date();
 const threads = {};
 
 // Group by tags with per-tag deduplication
 for (const capsule of capsules) {
   const capsuleTags = capsule.tags || ['untagged'];
   const summary = capsule.summary?.trim();
   if (!summary) continue;
   
   // Filter tags if specified
   const relevantTags = tags 
     ? capsuleTags.filter(t => tags.includes(t))
     : capsuleTags;
   
   for (const tag of relevantTags) {
     if (!threads[tag]) {
       threads[tag] = {
         capsules: [],
         seenSummaries: new Map()
       };
     }
     
     // Per-tag deduplication
     let isDuplicate = false;
     for (const [prevSummary, prevId] of threads[tag].seenSummaries) {
       if (similarity(prevSummary, summary) > CONFIG.SIMILARITY_THRESHOLD) {
         isDuplicate = true;
         break;
       }
     }
     
     if (!isDuplicate) {
       threads[tag].seenSummaries.set(summary, capsule.id);
       threads[tag].capsules.push({
         id: capsule.id,
         timestamp: capsule.timestamp,
         summary,
         label: capsule.title || tag,
         relevance: calculateRelevance(capsule, currentTime),
         estimatedTokens: estimateTokens(capsule)
       });
     }
   }
 }
 
 // Sort by relevance and apply limits
 for (const tag in threads) {
   threads[tag].capsules.sort((a, b) => b.relevance - a.relevance);
   
   // Apply token budget
   let tokenCount = 0;
   let selectedCapsules = [];
   
   for (const capsule of threads[tag].capsules) {
     if (tokenCount + capsule.estimatedTokens > tokenBudget) break;
     if (selectedCapsules.length >= maxCapsules) break;
     
     tokenCount += capsule.estimatedTokens;
     selectedCapsules.push(capsule);
   }
   
   // Re-sort by timestamp for chronological display
   threads[tag] = selectedCapsules.sort((a, b) => 
     new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
   );
 }
 
 return threads;
}

async function buildContextTimeline(tag, vaultPath, options = {}) {
 const threads = await buildThreadedMemory(vaultPath, {
   ...options,
   tags: [tag]
 });
 
 const items = threads[tag] || [];
 
 if (items.length === 0) {
   return `## Memory Timeline: ${tag}\n\nNo relevant memories found.`;
 }
 
 const lines = [`## Memory Timeline: ${tag}`, ''];
 let tokenCount = 50; // Header tokens
 
 for (const item of items) {
   const date = new Date(item.timestamp).toLocaleDateString();
   const entry = `- **${date}** [${item.label}]: ${item.summary}`;
   const entryTokens = Math.ceil(entry.length / 4);
   
   // Stop if we'd exceed budget
   if (tokenCount + entryTokens > (options.tokenBudget || CONFIG.MAX_TOKENS_PER_CONTEXT)) {
     lines.push(`\n*[${items.length - lines.length + 2} additional memories omitted due to token limits]*`);
     break;
   }
   
   lines.push(entry);
   tokenCount += entryTokens;
 }
 
 return lines.join('\n');
}

// New utility functions for token-aware operations
async function getRelevantContext(tags, vaultPath, currentQuery = '', options = {}) {
 const threads = await buildThreadedMemory(vaultPath, {
   ...options,
   tags
 });
 
 // Flatten and re-sort by relevance across all requested tags
 const allCapsules = [];
 for (const tag of tags) {
   if (threads[tag]) {
     allCapsules.push(...threads[tag].map(c => ({ ...c, tag })));
   }
 }
 
 // Re-calculate relevance if we have a current query
 if (currentQuery) {
   allCapsules.forEach(capsule => {
     const querySimilarity = similarity(capsule.summary, currentQuery);
     capsule.relevance = capsule.relevance * (1 + querySimilarity);
   });
 }
 
 return allCapsules
   .sort((a, b) => b.relevance - a.relevance)
   .slice(0, options.maxResults || 10);
}

module.exports = {
 buildThreadedMemory,
 buildContextTimeline,
 getRelevantContext,
 CONFIG
};
