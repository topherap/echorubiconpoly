const { retrieveRelevantCapsules } = require('./src/echo/memory/capsuleRetriever');

async function test() {
  console.log('Testing retriever for "who are my clients?"...');
  const results = await retrieveRelevantCapsules('who are my clients?', {
    vaultPath: 'D:\\Obsidian Vault',
    limit: 20,
    project: 'clients'  // Try with project context
  });
  
  console.log(`\nFound ${results.length} results`);
  console.log('\nQuery intent detection:');
  const { detectQueryIntent } = require('./src/echo/memory/capsuleRetriever');
  const intent = detectQueryIntent('who are my clients?');
  console.log('Intent:', intent);
  
  results.slice(0, 5).forEach((r, i) => {
    console.log(`\n${i+1}. ${r.metadata?.fileName || r.id}`);
    console.log(`   Type: ${r.type || r.metadata?.type}`);
    console.log(`   Score: ${r.relevanceScore?.toFixed(3)}`);
    console.log(`   Project: ${r.metadata?.project || 'none'}`);
  });
}

test().catch(console.error);
