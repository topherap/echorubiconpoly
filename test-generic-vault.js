const VaultService = require('./src/v2/services/vaultService');
const path = require('path');

async function testGenericVault() {
  const testVaultPath = path.join(__dirname, 'test-data', 'vault');
  const vaultService = new VaultService({ vaultPath: testVaultPath });
  
  console.log('=== TESTING GENERIC VAULT SERVICE ===\n');
  
  // Create some test data for different content types
  const fs = require('fs').promises;
  
  // Create workout files
  await fs.mkdir(path.join(testVaultPath, 'workouts'), { recursive: true });
  await fs.writeFile(path.join(testVaultPath, 'workouts', 'bench-press-workout.md'), '# Bench Press Workout\nChest exercise routine');
  await fs.writeFile(path.join(testVaultPath, 'workouts', 'squat-day.md'), '# Squat Day\nLeg workout routine');
  
  // Create client files
  await fs.mkdir(path.join(testVaultPath, 'clients'), { recursive: true });
  await fs.writeFile(path.join(testVaultPath, 'clients', 'john-doe.md'), '# John Doe\nClient information');
  await fs.writeFile(path.join(testVaultPath, 'clients', 'jane-smith.md'), '# Jane Smith\nClient details');
  
  // Test different queries
  console.log('1. Testing: "what are my recipes?"');
  const recipes = await vaultService.search('what are my recipes');
  console.log(`Found ${recipes.length} recipes`);
  
  console.log('\n2. Testing: "what are my workouts?"');
  const workouts = await vaultService.search('what are my workouts');
  console.log(`Found ${workouts.length} workouts`);
  
  console.log('\n3. Testing: "what are my clients?"');
  const clients = await vaultService.search('what are my clients');
  console.log(`Found ${clients.length} clients`);
  
  console.log('\n4. Testing: "show me all files"');
  const allFiles = await vaultService.search('show me all files');
  console.log(`Found ${allFiles.length} total files`);
  
  // Show detailed results
  console.log('\nDetailed results:');
  console.log('Recipes:', recipes.map(r => r.name));
  console.log('Workouts:', workouts.map(w => w.name));
  console.log('Clients:', clients.map(c => c.name));
}

testGenericVault();