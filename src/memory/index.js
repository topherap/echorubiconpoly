// src/memory/index.js
// Brain Region: Hippocampus
// Function: Memory consolidation, storage, retrieval, and integration
// Central hub for all memory operations - forms new memories and retrieves relevant ones

const path = require('path');
const { MemoryVaultManager } = require('./MemoryVaultManager');
const { ContextBuilder }     = require('./context');
const { MemoryCapsule }      = require('./MemoryCapsule');
const ChaosAnalyzer = require('../../backend/qlib/chaosanalyzer');
const { retrieveRelevantCapsules } = require('./utils/relevance');

let buildContextTimeline;
try {
  buildContextTimeline = require('../../tools/memory/threaderEngine').buildContextTimeline;
} catch (e) {
  console.warn('threaderEngine not loaded:', e?.message || e);
}


class MemorySystem {
  constructor(vaultInput, options = {}) {
    // ── vault manager
    if (typeof vaultInput === 'string') {
      this.vaultManager = new MemoryVaultManager(vaultInput);
    } else if (vaultInput && typeof vaultInput.vaultPath === 'string') {
      this.vaultManager = vaultInput;
    } else {
      console.error('[MemorySystem] ❌ Invalid vault input:', vaultInput);
      throw new Error('MemorySystem requires a valid vault path or manager.');
    }
    // Line 32 - existing
this.store = this.vaultManager;

// All saves now go through vault.js unified system - removed fallback saves

// Update method also removed - all updates go through vault.js
    
    // ── memory context builder
    // FIXED: Increased token limit to 8000
    this.contextBuilder = new ContextBuilder({
      maxTokens: options.maxContextTokens || 8000
    });

    // ── optional auto-chaos (disabled by default to avoid side effects on construction)
    if (options.runChaosOnInit) {
      ChaosAnalyzer.runChaosOnVault({
        vaultPath: this.vaultManager.vaultPath,
        dryRun: false,
        logPath: path.join(this.vaultManager.echoPath, 'chaos-log.json')
      });
    }

    this.sessionId = this.generateSessionId();
    this.currentTopic = null;
  }

generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async markCapsuleAsInaccurate(capsuleId) {
  try {
    // Load capsule through vault manager
    const capsule = await this.vaultManager.getCapsule(capsuleId);
    if (!capsule) {
      throw new Error(`Capsule ${capsuleId} not found`);
    }
    
    // Mark as inaccurate
    capsule.verification = {
      timestamp: new Date().toISOString(),
      isAccurate: false,
      markedBy: 'user-correction',
      reason: 'User indicated information was incorrect'
    };
    
    capsule.tags = capsule.tags || [];
    if (!capsule.tags.includes('user-flagged-inaccurate')) {
      capsule.tags.push('user-flagged-inaccurate');
    }
    
    capsule.searchPriority = -1;
    
    // Save through unified vault system
    await this.vaultManager.saveCapsule(capsule);
    console.log(`[MEMORY] Marked capsule ${capsuleId} as inaccurate`);
    return { success: true };
    
  } catch (err) {
    console.error(`[MEMORY] Error marking capsule ${capsuleId}:`, err);
    return { success: false, error: err.message };
  }
}

async processConversation(userInput, aiResponse, metadata = {}) {
  const capsule = MemoryCapsule.fromConversation(userInput, aiResponse, {
    sessionId: this.sessionId,
    topic: this.currentTopic,
    model: metadata.model,
    importance: metadata.importance,
    userCorrecting: metadata.userCorrecting,
    previousCapsuleId: metadata.previousCapsuleId
  });
  
  const capsuleId = capsule.id;
  
  // CRITICAL FIX: Save capsule and track for feedback
// All saves now go through unified vault system
await this.vaultManager.saveCapsule(capsule);

global.lastResponseCapsuleId = capsuleId;

// Auto-create note if confidence is high
try {
  const { resolveNoteTarget } = require('../echo/memory/NoteTools');
  const fs = require('fs');

  if (capsule.confidence >= 0.75 && capsule.entities?.subject) {
    const subject = capsule.entities.subject;
    const type = capsule.entities.type || 'contact';
    const notePath = resolveNoteTarget(subject, type, this.vaultManager.vaultPath);

    if (!fs.existsSync(notePath)) {
      const content = `# ${subject.charAt(0).toUpperCase() + subject.slice(1)}\n\nCreated automatically from conversation capsule.\n`;
      fs.writeFileSync(notePath, content, 'utf8');
      console.log(`[NOTE-CREATE] Auto-created note for: ${subject} → ${notePath}`);
    }
  }
} catch (err) {
  console.warn('[NOTE-CREATE] Failed to auto-create note:', err.message);
}
  // Q-lib entity extraction
  try {
    const nonContentPatterns = ['hi q', 'hello', 'test', 'yo', 'hey', 'ok', 'thanks', 'bye'];
    const isNonContent = nonContentPatterns.includes(userInput.trim().toLowerCase());
    const hasMinimalContent = userInput.length > 8 && /\w{4,}/.test(userInput);
    
    if (hasMinimalContent && !isNonContent) {
      console.log('[Q-LIB] Content detected, running extraction on:', userInput);
      
      const { QLibInterface } = require('./QLibInterface');
      const qlib = new QLibInterface(this.vaultManager.vaultPath);
      
      if (typeof qlib.extract === 'function') {
        const qExtract = await qlib.extract(userInput, aiResponse);
        
        if (qExtract?.entities?.length > 0) {
          const nonsenseEntities = ['names found', 'hi', 'q', 'hello', 'names'];
          const validEntity = qExtract.entities[0];
          
          if (validEntity && 
              validEntity.length > 3 && 
              !nonsenseEntities.includes(validEntity.toLowerCase())) {
            
            capsule.entities = capsule.entities || {};
            capsule.entities.subject = validEntity;
            
            // Smart type detection
            const contentLower = (userInput + ' ' + aiResponse).toLowerCase();
            
            if (contentLower.includes('recipe') || contentLower.includes('cook') || contentLower.includes('ingredient')) {
              capsule.entities.type = 'recipe';
            } else if (contentLower.includes('workout') || contentLower.includes('exercise') || contentLower.includes('lift') || contentLower.includes('temple')) {
              capsule.entities.type = 'fitness';
            } else if (contentLower.includes('client') || contentLower.includes('invoice') || contentLower.includes('business')) {
              capsule.entities.type = 'business';
            } else if (contentLower.includes('project') || contentLower.includes('task') || contentLower.includes('milestone')) {
              capsule.entities.type = 'project';
            } else {
              capsule.entities.type = 'contact';
            }
            
            console.log('[Q-LIB] Valid entity extracted:', capsule.entities.subject, 'type:', capsule.entities.type);
            
            // Update capsule after entity extraction
            await this.store.update(capsuleId, capsule);
          } else {
            console.log('[Q-LIB] Filtered out low-confidence entity:', validEntity);
          }
        } else {
          console.log('[Q-LIB] No entities extracted.');
        }
      }
    } else {
      console.log('[Q-LIB] Skipped extraction for non-content input:', userInput);
    }
  } catch (err) {
    console.warn('[Q-LIB] Extraction failed:', err.message);
  }

  // === ADD SEMANTIC TAGS ===
  try {
    const { ChaosAnalyzer } = require('../../backend/qlib/chaosanalyzer');
    const analyzer = new ChaosAnalyzer();
    
    // Extract semantic tags from the conversation content
    const fullContent = `${userInput}\n${aiResponse}`;
    const semanticTags = analyzer.extractSemanticTags(fullContent);
    
    // Add semantic tags to capsule
    if (semanticTags && semanticTags.length > 0) {
      capsule.semantic_tags = semanticTags;
      capsule.tags = [...new Set([...(capsule.tags || []), ...semanticTags])];
      console.log('[SEMANTIC] Added tags:', semanticTags);
    }
  } catch (err) {
    console.warn('[SEMANTIC] Failed to extract semantic tags:', err.message);
  }

  // ✅ Log capsule details AFTER it's defined
  console.log('[DEBUG] Capsule ID:', capsule.id);
  console.log('[DEBUG] Capsule confidence:', capsule.confidence);
  console.log('[DEBUG] Capsule entities:', capsule.entities);
  console.log('[DEBUG] Capsule semantic_tags:', capsule.semantic_tags);

  await this.vaultManager.saveCapsule(capsule);
  await this.vaultManager.createConversationNote(capsule);

  const { autoAppendToNote } = require('../echo/memory/NoteTools');

  if (capsule.confidence >= 0.75 && capsule.entities?.subject) {
    try {
      const summary = capsule.summary || capsule.messages?.[1]?.content || '';
      const target = capsule.entities.subject;
      const type = capsule.entities.type || 'contact';

      const writtenPath = autoAppendToNote(target, summary, type, this.vaultManager.vaultPath);
      console.log('[NOTE-AUTO] Appended memory to note:', writtenPath);
    } catch (err) {
      console.warn('[NOTE-AUTO] Failed to append note:', err.message);
    }
  }

  await this.applyAnnotations(metadata.qlibFacts || [], capsule);

  if (metadata.topic) {
    this.currentTopic = metadata.topic;
  }

  if (metadata.userCorrecting && metadata.previousCapsuleId) {
    try {
      await this.markCapsuleAsInaccurate(metadata.previousCapsuleId);
    } catch (err) {
      console.error('[MEMORY] Failed to mark previous capsule:', err);
    }
  }

  return capsule;
}

async applyAnnotations(facts = [], capsule) {
  if (!facts || facts.length === 0) return;

  const annotate = require('./annotateVaultNoteWithQlib');

  for (const fact of facts) {
    await annotate(
      this.vaultManager.vaultPath,
      fact.path,
      {
        model: capsule.metadata?.model || 'unknown',
        tags: fact.tags || capsule.tags || [],
        context: capsule.summary || capsule.content || '',
        refNote: capsule.topic || null,
        capsuleId: capsule.id
      }
    );
  }
}

async buildContextForInput(userInput, options = {}) {
  options = options || {};
  console.log(`[Hippocampus] Building context for: "${userInput}"`);
  
  // Get chaos-weighted memories from vault
  const rawMemories = await this.vaultManager.searchMemories(userInput);
  
  // FIXED: Enhanced semantic search using semantic_tags
  const enhancedMemories = rawMemories.map(mem => {
    // Check if semantic tags match the query
    if (mem.semantic_tags && Array.isArray(mem.semantic_tags)) {
      const queryLower = userInput.toLowerCase();
      const tagMatch = mem.semantic_tags.some(tag => 
        queryLower.includes(tag.toLowerCase()) || 
        tag.toLowerCase().includes(queryLower)
      );
      
      if (tagMatch && typeof mem.score === 'number') {
        // Boost score for semantic tag matches
        mem.score = Math.min(mem.score * 1.5, 1.0);
        mem._semanticBoost = true;
      }
    }
    return mem;
  });
  
  // Filter and sort by chaos score
  const scoredMemories = enhancedMemories
    .filter(m => typeof m.score === 'number' && m.score > 0)
    .sort((a, b) => b.score - a.score);
  
  // Also get unscored memories as fallback
  const unscoredMemories = enhancedMemories.filter(m => typeof m.score !== 'number');
  
  // Combine: scored first, then unscored
  const sortedMemories = [...scoredMemories, ...unscoredMemories];
  
  // Apply relevance threshold and limit
  const relevanceThreshold = Number.isFinite(options.minScore) ? options.minScore : 0.05;
  const limit = options.limit || 20;
  
  let selectedMemories = sortedMemories
    .filter(m => typeof m.score !== 'number' || m.score >= relevanceThreshold)
    .slice(0, limit);
  
  console.log('[Hippocampus] Memory selection:', {
    raw: rawMemories.length,
    scored: scoredMemories.length,
    selected: selectedMemories.length,
    topScore: scoredMemories[0]?.score || 0,
    semanticBoosts: selectedMemories.filter(m => m._semanticBoost).length
  });
  
  // If too few high-relevance memories, augment with recent & re-score locally
  if (selectedMemories.length < 3) {
    let candidates = [];
    if (typeof this.vaultManager?.searchMemories === 'function') {
      candidates = await this.vaultManager.searchMemories(userInput);
    } else if (typeof this.vaultManager?.getRecentCapsules === 'function') {
      candidates = await this.vaultManager.getRecentCapsules(50);
    } else if (typeof this.vaultManager?.listAllCapsules === 'function') {
      candidates = await this.vaultManager.listAllCapsules();
    } else {
      candidates = []; // last resort
    }

    // Missing import/require for retrieveRelevantCapsules function
    const { retrieveRelevantCapsules } = require('./utils/relevance');
    
    const recent = retrieveRelevantCapsules(userInput, candidates, {
      limit: 10,
      minScore: 0.05 // permissive; ranking will prune
      // disableBoosts: true  // uncomment if you want pure control behavior
    });

    const seen = new Set(selectedMemories.map(m => m.id));
    const toAdd = (recent || [])
      .filter(r => r && !seen.has(r.id))
      .slice(0, Math.max(0, 10 - selectedMemories.length))
      .map(r => ({ ...r, score: r._score || r.score || 0, _fallbackRecent: true }));

    // Deduplicate and limit
    const memoryIds = new Set(selectedMemories.map(m => m.id || m.content?.substring(0,50)));
    toAdd.forEach(mem => {
      const id = mem.id || mem.content?.substring(0,50);
      if (!memoryIds.has(id) && selectedMemories.length < 20) {
        selectedMemories.push(mem);
        memoryIds.add(id);
      }
    });
    console.log('[Hippocampus] Added recent memories with deduplication:', toAdd.length, '→', selectedMemories.length);
  }
  
  // Type-based prioritization (optional enhancement)
  if (options.preferTypes) {
    const preferredTypes = options.preferTypes || ['urgent', 'contact', 'meeting'];
    const prioritized = selectedMemories.filter(m => 
      m.metadata?.type && preferredTypes.includes(m.metadata.type)
    );
    const others = selectedMemories.filter(m => 
      !m.metadata?.type || !preferredTypes.includes(m.metadata.type)
    );
    selectedMemories = [...prioritized, ...others].slice(0, limit);
  }
  
  // FIXED: Pass skipFiltering flag to bypass aggressive filtering
  const context = await this.contextBuilder.buildContext(userInput, selectedMemories, {
    ...options,
    skipFiltering: true,  // CRITICAL FIX: Bypass the aggressive filtering
    maxTokens: 8000,      // Use larger token budget
    recentDays: 30        // Look back further
  });
  
  const threadTags = options.threadTags || ['client', 'project', 'note'];

  let threadContext = '';
  // Add safety check for buildContextTimeline
  if (typeof buildContextTimeline === 'function') {
    try {
      for (const tag of threadTags) {
        const thread = await buildContextTimeline(tag, this.vaultManager.vaultPath);
        threadContext += `\n${thread}\n`;
      }
    } catch (err) {
      console.warn('[Hippocampus] Thread context building failed:', err.message);
      threadContext = '[Thread context unavailable]';
    }
  }
  
  // Safe score range calculation
  let scoreInfo = '';
  if (scoredMemories.length > 0) {
    const highScore = typeof scoredMemories[0]?.score === 'number' 
      ? scoredMemories[0].score.toFixed(2) 
      : 'N/A';
    const lowScore = typeof scoredMemories[scoredMemories.length - 1]?.score === 'number'
      ? scoredMemories[scoredMemories.length - 1].score.toFixed(2)
      : '0.00';
    scoreInfo = `\n[Memory relevance: ${highScore} - ${lowScore}]`;
  }
  
  const finalContext = `${context}${scoreInfo}\n\n---\n# Threaded Memory Timeline\n${threadContext}`;
  
  console.log('[Hippocampus] Context built:', {
    memoryCount: selectedMemories.length,
    contextLength: finalContext.length,
    containsContent: finalContext.length > 100,
    typeDistribution: selectedMemories.reduce((acc, m) => {
      const type = m.metadata?.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {})
  });
  
  return {
    context: finalContext,
    memory: selectedMemories,
    capsuleCount: selectedMemories.length,
    sessionId: this.sessionId,
    vault: [],
    scores: scoredMemories.map(m => m.score),
    _debug: {
      relevanceThreshold,
      hadFallback: selectedMemories.some(m => m._fallbackRecent),
      hadSemanticBoost: selectedMemories.some(m => m._semanticBoost),
      scoreRange: [scoredMemories[0]?.score || 0, scoredMemories[scoredMemories.length-1]?.score || 0]
    },
    // BRIDGE: Include IPC globals for AI systems
    lastFileContent: global.lastFileContent || null,
    vaultContext: global.vaultContext || {},
    lastFileShown: global.lastFileShown || null,
  };
}

async getStats() {
  return await this.vaultManager.getStats();
}

async search(query) {
  return await this.vaultManager.searchMemories(query);
}

async createSummary(capsules, summaryText) {
  const safeCapsules = Array.isArray(capsules) ? capsules : [];
  const summary = MemoryCapsule.fromSummary(safeCapsules, summaryText);
  await this.vaultManager.saveCapsule(summary);
  return summary;
}

newSession() {
  this.sessionId = this.generateSessionId();
  this.currentTopic = null;
}

async markImportant(capsuleId) {
  console.log(`[Hippocampus] Marking ${capsuleId} as important`);
  // TODO: write logic to elevate importance field in index or capsule itself
}
}

const vaultPath = require('../../components/utils/VaultPathManager').getVaultPath();
const memorySystem = new MemorySystem(vaultPath);
memorySystem.vaultManager = new MemoryVaultManager(vaultPath);

module.exports = {
  memorySystem,
  MemorySystem,
  MemoryCapsule,
  ContextBuilder,
  MemoryVaultManager
};

