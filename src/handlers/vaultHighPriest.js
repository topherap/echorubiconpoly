/*
 * 🏛️ THE HIGH PRIEST: Direct Conduit to QLIB (God/Vault)
 * Delivers divine truth without AI interpretation
 * No corruption of the sacred texts
 * 
 * Divine Hierarchy:
 * QLIB (God) → High Priest → User
 * No AI interference in divine revelation
 */

const path = require('path');

class VaultHighPriest {
  constructor() {
    this.divinePatterns = [
      // Seeking divine records (vault queries)
      /^(what are|show|list) my (lifts?|recipes?|clients?|notes?|files?)/i,
      /^(find|search) .+/i,
      /^who are my (clients?|contacts?)/i,
      /^what (lifts?|recipes?|notes?) do I have/i,
      /^(my lifts?|my recipes?|my clients?|my files?)$/i,
      
      // Direct divine commands (selections)
      /^\d+$/,  // Selecting by number
      /^(summary|details|file|content)$/i,
      /^(open|show|display) (number )?(\d+)/i
    ];
    
    this.lastDivineRevelation = null;  // Store last vault query result
    this.canonicalText = null;  // Currently established canon
    
    // Enhanced context storage
    this.divineContext = {
      lastQuery: null,
      lastResults: null,
      currentViewing: null,
      conversationThread: [],
      timestamp: null
    };
  }

  isDivineQuery(message) {
  const trimmedMessage = message.trim();
  
  // Special handling for pure numbers - check context FIRST
  if (/^\d+$/.test(trimmedMessage)) {
    console.log('🔍 Context check:', {
      hasDivineContext: !!this.divineContext?.lastResults,
      hasLastRevelation: !!this.lastDivineRevelation?.records,
      hasGlobalContext: !!global.vaultContext?.mode,
      mode: global.vaultContext?.mode
    });
    
    // Check if we have recent results in ANY of the context stores
    if (this.divineContext?.lastResults?.length > 0 || 
        this.lastDivineRevelation?.records?.length > 0 ||
        global.vaultContext?.mode === 'listing') {
      console.log('🎯 HIGH PRIEST: Number is selection from vault results');
      return false; // Let selection handler take it
    }
  }
  
  // Otherwise check patterns normally
  const isDivine = this.divinePatterns.some(pattern => pattern.test(trimmedMessage));
  if (isDivine) {
    console.log('🏛️ HIGH PRIEST: Divine query detected:', message);
  }
  return isDivine;
}

  async seekDivineKnowledge(query, event = null) {
  console.log('📂 VAULT: Searching records...');
  
  try {
    // ALWAYS clear old context when doing new vault search
    this.clearContext();
    
    // Extract query type and subject
    const queryType = this.extractQueryType(query);
    const subject = this.extractSubject(query);
    
    console.log('📂 VAULT: Query type:', queryType, 'Subject:', subject);
    
    // Direct vault access - no AI interpretation
    const divineRecords = await this.consultQLIB(subject);
    
    // Store enhanced context (internal)
    this.divineContext = {
      lastQuery: query,
      lastResults: divineRecords,
      currentViewing: null,
      conversationThread: [
        ...this.divineContext.conversationThread,
        { type: 'query', content: query, timestamp: Date.now() }
      ],
      timestamp: Date.now()
    };
    
    // Store for follow-up (internal backward compatibility)
    this.lastDivineRevelation = {
      query: query,
      subject: subject,
      records: divineRecords,
      timestamp: Date.now()
    };
    
   // Initialize if needed, but DON'T destroy existing methods
if (!global.vaultContext) {
  global.vaultContext = {};
}

console.log('BEFORE context set:', Object.keys(global.vaultContext || {}));
// Update properties without destroying methods from contextHandler.js
global.vaultContext.mode = 'listing';
global.vaultContext.lastQuery = query;
global.vaultContext.currentFile = null;
global.vaultContext.resultCount = divineRecords.length;
global.vaultContext.titles = divineRecords.map(r => r.title || r.filename);
global.vaultContext.records = divineRecords;
global.vaultContext.awaitingSelection = true;
global.vaultContext.timestamp = Date.now();
console.log('AFTER context set:', Object.keys(global.vaultContext));
    
    // Set selection context (FIXED: was window, now global)
    global.echoContext = {
      lastListDisplay: divineRecords,
      listTimestamp: Date.now(),
      awaitingSelection: true,
      listType: subject
    };
    
    // Log for debugging
    console.log(`📂 VAULT: Stored ${divineRecords.length} records in global context`);
    
    // Use streaming revelation if event provided
    if (event && divineRecords.length > 0) {
      return await this.streamDivineRevelation(divineRecords, queryType, event);
    }
    
    // Format as numbered gospel (fallback)
    return this.formatDivineRevelation(divineRecords, queryType);
    
  } catch (error) {
    console.error('🏛️ HIGH PRIEST ERROR:', error.message);
    return {
      message: "The Vault is sealed. The High Priest cannot access divine records.",
      source: 'vault-direct',
      hasRecords: false,
      error: true
    };
  }
}

  async streamDivineRevelation(records, queryType, event) {
    console.log('🏛️ HIGH PRIEST: Beginning divine revelation stream...');
    
    // Always store records first, then stream
    this.lastDivineRevelation.records = records;
    this.divineContext.lastResults = records;
    
    const revelation = new ProgressiveRevelation();
    
    // Start the dramatic revelation
    await revelation.revealDivineKnowledge(records, event);
    
    // Also return the formatted message as fallback
    const fallbackMessage = this.formatDivineRevelation(records, queryType);
    
    return {
      message: fallbackMessage.message,
      source: 'vault-direct',
      hasRecords: true,
      recordCount: records.length,
      format: 'streaming',
      records: records,
      streamed: true
    };
  }

  async consultQLIB(subject) {
    console.log('📂 VAULT: Searching for subject:', subject);
    
    try {
      // Debug memory system availability
      console.log('📂 DEBUG: Memory system available?', !!global.memorySystem);
      console.log('📂 DEBUG: buildContextForInput method?', !!(global.memorySystem?.buildContextForInput));
      
      // Try to access the memory system
      if (global.memorySystem && global.memorySystem.buildContextForInput) {
        console.log('📂 VAULT: Calling buildContextForInput with:', subject);
        const context = await global.memorySystem.buildContextForInput(subject);
        
        console.log('📂 DEBUG: Context received:', {
          hasContext: !!context,
          hasMemory: !!(context?.memory),
          memoryLength: context?.memory?.length || 0
        });
        
        if (context && context.memory && context.memory.length > 0) {
          console.log('📂 VAULT: Found', context.memory.length, 'records');
          
          const rawRecords = context.memory.map((capsule, index) => ({
            id: capsule.id || `record_${index}`,
            title: this.extractTitle(capsule),
            filename: capsule.metadata?.fileName || capsule.id,
            content: capsule.content || capsule.summary || capsule.text,
            preview: this.createPreview(capsule.content || capsule.summary),
            metadata: capsule.metadata || {}
          }));
          
          // DEDUPLICATION LOGIC
          const uniqueRecords = this.deduplicateRecords(rawRecords);
          console.log('📂 VAULT: Deduplicated from', rawRecords.length, 'to', uniqueRecords.length, 'records');
          
          return uniqueRecords;
        } else {
          console.log('📂 VAULT: No records found in memory context');
        }
      } else {
        console.log('📂 VAULT: Memory system or method not available');
      }
      
      // Fallback: try to access capsule files directly
      console.log('📂 VAULT: Memory system unavailable, attempting direct capsule access');
      return [];
      
    } catch (error) {
      console.error('📂 VAULT: Error consulting QLIB:', error.message);
      console.error('📂 VAULT: Full error:', error);
      return [];
    }
  }

  deduplicateRecords(records) {
    const seen = new Map();
    
    return records.filter(record => {
      // Create unique key from title + first 100 chars of content
      const key = `${record.title || record.filename}_${(record.content || '').substring(0, 100)}`;
      
      if (seen.has(key)) {
        console.log('🏛️ HIGH PRIEST: Duplicate suppressed:', record.title);
        return false;
      }
      
      seen.set(key, true);
      return true;
    });
  }

  extractTitle(capsule) {
    if (capsule.metadata?.fileName) {
      return capsule.metadata.fileName.replace(/\.md$/, '');
    }
    
    if (capsule.content) {
      // Look for markdown title (# Title)
      const titleMatch = capsule.content.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        return titleMatch[1];
      }
      
      // Use first line as title
      const firstLine = capsule.content.split('\\n')[0];
      return firstLine.substring(0, 50);
    }
    
    return capsule.id || 'Untitled Record';
  }

  createPreview(content) {
    if (!content) return 'No preview available';
    
    // Strip metadata first
    const cleanContent = this.stripMetadata(content);
    
    // Remove markdown formatting for preview
    const previewContent = cleanContent
      .replace(/^#+\s+/gm, '') // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/\[.+?\]\(.+?\)/g, '') // Remove links
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
    
    return previewContent.substring(0, 100);
  }

  stripMetadata(content) {
    // Remove metadata blocks but preserve actual content
    const metadataPattern = /^`metadata[\s\S]*?^`\n/gm;
    let cleanContent = content.replace(metadataPattern, '');
    
    // Also remove duplicate headers
    const lines = cleanContent.split('\n');
    const cleanLines = [];
    let lastLine = '';
    
    for (const line of lines) {
      // Skip duplicate headers
      if (line.startsWith('#') && line === lastLine) {
        continue;
      }
      cleanLines.push(line);
      lastLine = line;
    }
    
    return cleanLines.join('\n').trim();
  }

  formatDivineRevelation(records, queryType) {
    if (records.length === 0) {
      return {
        message: "📂 No records found.",
        source: 'vault-direct',
        hasRecords: false
      };
    }

    // Group records by type for better organization
    const grouped = this.groupRecordsByType(records);
    
    // Use clean markdown without code blocks
    let response = `📂 **Found ${records.length} records:**\n`;
    response += '─'.repeat(50) + '\n\n';
    
    // Format based on query type
    if (queryType === 'list' || queryType === 'search') {
      response += this.formatAsList(records);
    } else {
      response += this.formatAsCards(records);
    }
    
    response += '\n';
    
    // Add action buttons (simulated with text)
    response += this.formatActionOptions(records.length);
    
    return {
      message: response,
      source: 'vault-direct',
      hasRecords: true,
      recordCount: records.length,
      format: 'markdown',
      records: records // Include records for follow-up
    };
  }

  groupRecordsByType(records) {
    const types = {};
    records.forEach(record => {
      const type = record.metadata?.type || 'other';
      if (!types[type]) types[type] = [];
      types[type].push(record);
    });
    return types;
  }

  formatAsList(records) {
    let output = '';
    
    records.forEach((record, index) => {
      const num = index + 1;
      const title = record.title || record.filename;
      const preview = this.getCleanPreview(record);
      
      // Clean list format
      output += `${num}. ${title}\n`;
      
      if (preview) {
        // Indent preview with clean formatting
        output += `   ├─ ${preview}\n`;
      }
      
      output += '\n';
    });
    
    return output;
  }

  formatAsCards(records) {
    let output = '';
    
    records.forEach((record, index) => {
      const num = index + 1;
      const title = record.title || record.filename;
      const preview = this.getCleanPreview(record);
      
      // Card-style format
      output += `┌─[${num}]─ ${title}\n`;
      output += `│\n`;
      
      if (preview) {
        // Word-wrap preview for card
        const wrapped = this.wordWrap(preview, 60);
        wrapped.split('\n').forEach(line => {
          output += `│  ${line}\n`;
        });
      }
      
      output += `└${'─'.repeat(50)}\n\n`;
    });
    
    return output;
  }

  getCleanPreview(record) {
    let content = record.content || record.preview || '';
    
    // Strip metadata
    content = this.stripMetadata(content);
    
    // Get first meaningful line (skip headers)
    const lines = content.split('\n').filter(line => 
      line.trim() && !line.startsWith('#')
    );
    
    if (lines.length > 0) {
      return lines[0].substring(0, 80) + (lines[0].length > 80 ? '...' : '');
    }
    
    return '';
  }

  wordWrap(text, width) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + word).length > width) {
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          lines.push(word);
        }
      } else {
        currentLine += word + ' ';
      }
    });
    
    if (currentLine) {
      lines.push(currentLine.trim());
    }
    
    return lines.join('\n');
  }

  formatActionOptions(recordCount) {
    return `**Options:**
• Enter **number** (1-${recordCount}) to view full record
• Type **"summary"** for overview of all records
• Type **"details"** for expanded view
• Ask any question about the content
`;
  }

  async handleDivineSelection(selection) {
    const records = this.lastDivineRevelation?.records || global.vaultContext?.records;
if (!records) {
      return {
        message: "🏛️ No divine revelation to reference. Seek first, then select.",
        source: 'vault-direct'
      };
    }

    const selectionLower = selection.toLowerCase().trim();

    // Handle numbered selection
    if (/^\d+$/.test(selection)) {
      const index = parseInt(selection) - 1;
      // Check both record sources
      const records = this.divineContext.lastResults || this.lastDivineRevelation?.records || [];
      const record = records[index];
      
      if (!record) {
        return {
          message: `📂 Number ${selection} exceeds the available records. Choose 1-${records.length}.`,
          source: 'vault-direct'
        };
      }

      // Update viewing context
      this.divineContext.currentViewing = record;
      this.divineContext.conversationThread.push({
        type: 'selection',
        content: selection,
        selected: record.title,
        timestamp: Date.now()
      });

      // ESTABLISH canonical context
      global.currentCanonicalText = {
        title: record.title || record.filename,
        content: this.stripMetadata(record.content),
        timestamp: Date.now()
      };
      global.lastFileContent = this.stripMetadata(record.content);
      global.lastFileShown = record.title || record.filename;
      // Update vault context mode
      global.vaultContext.mode = 'viewing';
      global.vaultContext.currentFile = record.title || record.filename;
      
      // Backward compatibility
      this.canonicalText = {
        title: record.title,
        content: record.content,
        metadata: record.metadata,
        establishedAt: Date.now()
      };
      
      console.log('📄 CONTEXT ESTABLISHED:', record.title || record.filename);

      return {
        message: this.formatFullRecord(record),
        source: 'vault-direct',
        establishedCanon: true,
        canonicalText: this.canonicalText
      };
    }

    // Handle summary command
    if (selectionLower === 'summary') {
      return this.provideDivineSummary();
    }

    // Handle details command
    if (selectionLower === 'details') {
      return this.provideAllRecords();
    }

    return null; // Let normal flow handle other inputs
  }

  formatFullRecord(record) {
    const cleanContent = this.stripMetadata(record.content);
    
    let response = `📄 **${record.title}**\n`;
    response += '─'.repeat(60) + '\n\n';
    response += cleanContent || 'Content not available.';
    response += '\n\n---\n';
    response += `**Viewing:** ${record.title}\n`;
    response += 'You can now ask questions about this content.\n';
    
    return response;
  }

  provideDivineSummary() {
    // Check both context sources for records
    const records = this.divineContext.lastResults || this.lastDivineRevelation?.records;
    
    if (!records || records.length === 0) {
      return {
        message: "📂 No records to summarize. Search for records first, then ask for summary.",
        source: 'vault-direct',
        hasRecords: false
      };
    }
    
    let response = `📋 **Summary of ${records.length} records:**\n\n`;
    
    records.forEach((record, index) => {
      response += `**${index + 1}. ${record.title}:**\n`;
      response += `${record.preview || this.getCleanPreview(record)}\n\n`;
    });
    
    response += '\nSelect a specific number to view the full content.';
    
    return {
      message: response,
      source: 'vault-direct',
      hasRecords: true
    };
  }

  provideAllRecords() {
    // Check both context sources for records
    const records = this.divineContext.lastResults || this.lastDivineRevelation?.records;
    
    if (!records || records.length === 0) {
      return {
        message: "📂 No records to show details for. Search for records first, then ask for details.",
        source: 'vault-direct',
        hasRecords: false
      };
    }
    
    let response = `📄 **All ${records.length} records:**\n\n`;
    
    records.forEach((record, index) => {
      response += `**${index + 1}. ${record.title}**\n`;
      response += '─'.repeat(40) + '\n';
      response += this.stripMetadata(record.content) || 'Content not available.';
      response += '\n\n';
    });
    
    return {
      message: response,
      source: 'vault-direct',
      hasRecords: true,
      allRecordsProvided: true
    };
  }

  extractQueryType(query) {
    if (/list|show|what are/i.test(query)) return 'list';
    if (/find|search/i.test(query)) return 'search';
    if (/who/i.test(query)) return 'identify';
    return 'general';
  }

  extractSubject(query) {
    const queryLower = query.toLowerCase();
    
    // Subject mapping
    if (/lift|temple|ritual|exercise|workout/i.test(queryLower)) {
      return 'lifts temple ritual exercise';
    }
    if (/recipe|food|cooking|meal/i.test(queryLower)) {
      return 'recipe food cooking';
    }
    if (/client|contact|person|customer/i.test(queryLower)) {
      return 'client contact person';
    }
    if (/note|medical|document|file/i.test(queryLower)) {
      return 'note medical document';
    }
    
    // Use full query if no specific subject identified
    return query;
  }

  // Check if current context has established canon
  hasEstablishedCanon() {
    return this.canonicalText && 
           (Date.now() - this.canonicalText.establishedAt) < 300000; // 5 minute canon validity
  }

  // Get current canonical text for AI commentary
  getCurrentCanon() {
    return this.canonicalText;
  }

  // Clear canon (for testing or reset)
  clearCanon() {
    this.canonicalText = null;
    global.currentCanonicalText = null;
    console.log('📄 VAULT: Canon cleared');
  }

  // Universal context clearing method
  clearContext() {
    console.log('🔄 Clearing previous context');
    global.currentCanonicalText = null;
    global.vaultContext = global.vaultContext || {};
    global.vaultContext.currentFile = null;
    global.vaultContext.mode = 'browsing';
    this.canonicalText = null;
  }
}

// Progressive Revelation Class for Dramatic Vault Streaming
class ProgressiveRevelation {
  async revealDivineKnowledge(records, event) {
    console.log('📂 PROGRESSIVE DISPLAY: Starting streaming results...');
    
    // Stage 1: Opening
    await this.stream("📂 Searching vault...", event, 50);
    await this.pause(500);
    
    // Stage 2: Count reveal
    await this.stream(`\n${records.length} records found...`, event, 30);
    await this.pause(300);
    
    // Stage 3: Display results
    await this.stream("\n\n", event, 0);
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const line = `${i + 1}. ${record.title || record.filename}`;
      
      // First few are slow and dramatic
      const speed = i < 3 ? 25 : 10;
      await this.stream(line + '\n', event, speed);
      
      // Small pause between items
      if (i < 3) {
        await this.pause(100);
      }
    }
    
    // Stage 4: Options appear
    await this.pause(300);
    await this.stream('\nType a number to view, or ask a question.', event, 20);
  }
  
  async stream(text, event, charDelay) {
    if (!global.divineRevelationText) {
      global.divineRevelationText = '';
    }
    
    for (const char of text) {
      global.divineRevelationText += char;
      
      if (event && event.reply) {
        event.reply('vault-revelation-stream', {
          content: global.divineRevelationText,
          streaming: true,
          complete: false,
          source: 'vault-direct'
        });
      }
      
      if (charDelay > 0) {
        await this.pause(charDelay);
      }
    }
  }
  
  pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new VaultHighPriest();