// test-retrieval.js
const { retrieveRelevantCapsules } = require('./src/echo/memory/capsuleRetriever');

async function testRetrieval() {
  console.log('Testing capsule retrieval...\n');
  
  // Test searching for a specific client
  const results = await retrieveRelevantCapsules('Angela Smith', {
    vaultPath: 'D:\\Obsidian Vault',
    project: 'clients',
    limit: 5
  });
  
  console.log(`Found ${results.length} results for "Angela Smith"\n`);
  
  results.forEach((capsule, i) => {
    console.log(`Result ${i + 1}:`);
    console.log('ID:', capsule.id);
    console.log('Has content:', !!capsule.content);
    console.log('Content preview:', capsule.content ? capsule.content.substring(0, 200) + '...' : 'NO CONTENT');
    console.log('---\n');
  });
}

testRetrieval().catch(console.error);