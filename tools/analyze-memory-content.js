// tools/analyze-memory-content.js
const fs = require('fs');
const path = require('path');

const capsulesPath = 'D:\\Obsidian Vault\\.echo\\capsules';

console.log('=== MEMORY CAPSULE ANALYSIS ===\n');

const capsuleFiles = fs.readdirSync(capsulesPath).filter(f => f.endsWith('.json'));
console.log(`Total capsules: ${capsuleFiles.length}\n`);

// Categories to track
const categories = {
  recipes: [],
  clients: [],
  notes: [],
  conversations: [],
  echo_related: [],
  other: []
};

// Keywords for classification
const keywords = {
  recipes: ['recipe', 'ingredient', 'cook', 'food', 'dish', 'meal'],
  clients: ['client', 'customer', 'project', 'invoice', 'contract'],
  notes: ['note', 'todo', 'reminder', 'idea', 'thought'],
  echo_related: ['echo', 'rubicon', 'memory', 'capsule', 'vault', 'q-lib']
};

// Analyze each capsule
for (const file of capsuleFiles) {
  try {
    const content = JSON.parse(fs.readFileSync(path.join(capsulesPath, file), 'utf8'));
    const text = JSON.stringify(content).toLowerCase();
    
    let categorized = false;
    
    // Check each category
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => text.includes(word))) {
        categories[category].push({
          file,
          date: content.timestamp ? new Date(content.timestamp).toLocaleDateString() : 'unknown',
          preview: (content.summary || content.content || content.input || '').slice(0, 100)
        });
        categorized = true;
        break;
      }
    }
    
    if (!categorized) {
      if (content.type === 'conversation' || content.messages) {
        categories.conversations.push({
          file,
          date: content.timestamp ? new Date(content.timestamp).toLocaleDateString() : 'unknown',
          preview: (content.summary || content.content || '').slice(0, 100)
        });
      } else {
        categories.other.push({
          file,
          type: content.type,
          preview: (content.summary || content.content || '').slice(0, 100)
        });
      }
    }
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
  }
}

// Report findings
console.log('=== CONTENT BREAKDOWN ===');
for (const [category, items] of Object.entries(categories)) {
  console.log(`\n${category.toUpperCase()}: ${items.length} capsules`);
  
  if (items.length > 0 && items.length <= 5) {
    // Show all if few
    items.forEach(item => {
      console.log(`  - [${item.date}] ${item.preview}...`);
    });
  } else if (items.length > 5) {
    // Show sample if many
    console.log(`  Showing first 3:`);
    items.slice(0, 3).forEach(item => {
      console.log(`  - [${item.date}] ${item.preview}...`);
    });
  }
}

// Summary
console.log('\n=== SUMMARY ===');
console.log(`Personal content found:`);
console.log(`- Recipes: ${categories.recipes.length}`);
console.log(`- Clients: ${categories.clients.length}`);
console.log(`- Notes: ${categories.notes.length}`);
console.log(`\nSystem content:`);
console.log(`- Echo-related: ${categories.echo_related.length}`);
console.log(`- Conversations: ${categories.conversations.length}`);
console.log(`- Other: ${categories.other.length}`);