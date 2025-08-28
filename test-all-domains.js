const VaultService = require('./src/v2/services/vaultService');
const path = require('path');
const fs = require('fs').promises;

async function setupTestData(vaultPath) {
  // Create recipes (5 expected)
  await fs.mkdir(path.join(vaultPath, 'recipes'), { recursive: true });
  const recipes = [
    'pasta-carbonara.md',
    'chicken-tikka-masala.md', 
    'beef-stir-fry.md',
    'greek-salad.md',
    'mushroom-risotto.md'
  ];
  
  for (const recipe of recipes) {
    await fs.writeFile(path.join(vaultPath, 'recipes', recipe), `# ${recipe.replace('.md', '').replace('-', ' ')}\nRecipe content`);
  }

  // Create temple lifts (6 expected)
  await fs.mkdir(path.join(vaultPath, 'temple'), { recursive: true });
  await fs.mkdir(path.join(vaultPath, 'lifts'), { recursive: true });
  const templeLifts = [
    { file: 'squat-temple.md', dir: 'temple' },
    { file: 'deadlift-session.md', dir: 'lifts' },
    { file: 'bench-press-temple.md', dir: 'temple' },
    { file: 'overhead-press.md', dir: 'lifts' },
    { file: 'temple-routine.md', dir: 'temple' },
    { file: 'powerlifting-session.md', dir: 'lifts' }
  ];
  
  for (const lift of templeLifts) {
    await fs.writeFile(path.join(vaultPath, lift.dir, lift.file), `# ${lift.file.replace('.md', '').replace('-', ' ')}\nLift content`);
  }

  // Create meeting notes (4 expected)
  await fs.mkdir(path.join(vaultPath, 'meetings'), { recursive: true });
  await fs.mkdir(path.join(vaultPath, 'notes'), { recursive: true });
  const meetingNotes = [
    { file: 'weekly-standup.md', dir: 'meetings' },
    { file: 'client-meeting-notes.md', dir: 'notes' },
    { file: 'project-review.md', dir: 'meetings' }, 
    { file: 'team-meeting.md', dir: 'meetings' }
  ];
  
  for (const note of meetingNotes) {
    await fs.writeFile(path.join(vaultPath, note.dir, note.file), `# ${note.file.replace('.md', '').replace('-', ' ')}\nMeeting content`);
  }
}

async function testAllDomains() {
  const testVaultPath = path.join(__dirname, 'test-data', 'vault-domains');
  const vaultService = new VaultService({ vaultPath: testVaultPath });
  
  console.log('=== TEST DISCIPLINE: ALL THREE DOMAINS ===\n');
  
  // Setup test data
  await setupTestData(testVaultPath);
  
  // Test domains with expected counts
  const testDomains = [
    { query: "what are my recipes", expected: 5 },
    { query: "what are my temple lifts", expected: 6 },  
    { query: "what are my meeting notes", expected: 4 }
  ];
  
  let allPassed = true;
  
  // Debug: Check if files exist
  console.log('DEBUG: Checking vault contents...');
  const allFiles = await vaultService.getAllVaultFiles();
  console.log(`Total files in vault: ${allFiles.length}`);
  console.log(`Files: ${allFiles.map(f => `${f.name} (${f.directory})`).join(', ')}\n`);
  
  for (const [index, domain] of testDomains.entries()) {
    console.log(`${index + 1}. Testing: "${domain.query}"`);
    
    // Debug: Check pattern extraction
    const pattern = vaultService.extractPattern(domain.query);
    console.log(`   Pattern: term="${pattern.term}", type="${pattern.type}", folders=[${pattern.folders.join(', ')}]`);
    
    const results = await vaultService.search(domain.query);
    const actual = results.length;
    const passed = actual === domain.expected;
    
    console.log(`   Expected: ${domain.expected}, Got: ${actual} ${passed ? '✅' : '❌'}`);
    
    if (!passed) {
      allPassed = false;
      console.log(`   Files found: ${results.map(r => r.name).join(', ')}`);
    }
    
    console.log('');
  }
  
  // Summary
  console.log(`=== TEST RESULT: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'} ===`);
  
  if (allPassed) {
    console.log('🎉 Generic VaultService works across all domains!');
  } else {
    console.log('🔧 Fix needed in pattern matching logic');
  }
}

testAllDomains();