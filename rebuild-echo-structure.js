// rebuild-echo-structure.js
// Rebuild Echo file structure without fake data

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const CONFIG = {
  VAULT_PATH: 'D:\\Obsidian Vault',
  ECHO_PATH: 'D:\\Obsidian Vault\\.echo'
};

async function createEchoStructure() {
  console.log('📁 Creating Echo directory structure...');
  
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const directories = [
    // Main .echo structure
    path.join(CONFIG.ECHO_PATH),
    path.join(CONFIG.ECHO_PATH, 'capsules'),
    path.join(CONFIG.ECHO_PATH, 'capsules', year.toString()),
    path.join(CONFIG.ECHO_PATH, 'capsules', year.toString(), month),
    path.join(CONFIG.ECHO_PATH, 'capsules', year.toString(), month, day),
    path.join(CONFIG.ECHO_PATH, 'chats'),
    path.join(CONFIG.ECHO_PATH, 'chats', 'open'),
    path.join(CONFIG.ECHO_PATH, 'config'),
    path.join(CONFIG.ECHO_PATH, 'memory'),
    path.join(CONFIG.ECHO_PATH, 'projects'),
    
    // Project-specific structures
    path.join(CONFIG.ECHO_PATH, 'projects', 'clients'),
    path.join(CONFIG.ECHO_PATH, 'projects', 'clients', 'capsules'),
    path.join(CONFIG.ECHO_PATH, 'projects', 'foods'),
    path.join(CONFIG.ECHO_PATH, 'projects', 'foods', 'capsules'),
    path.join(CONFIG.ECHO_PATH, 'projects', 'lifts'),
    path.join(CONFIG.ECHO_PATH, 'projects', 'lifts', 'capsules'),
    path.join(CONFIG.ECHO_PATH, 'projects', 'sephirot'),
    path.join(CONFIG.ECHO_PATH, 'projects', 'sephirot', 'capsules'),
    path.join(CONFIG.ECHO_PATH, 'projects', 'tarot'),
    path.join(CONFIG.ECHO_PATH, 'projects', 'tarot', 'capsules')
  ];
  
  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      const relativePath = path.relative(CONFIG.VAULT_PATH, dir);
      console.log(`✅ ${relativePath}`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.log(`❌ Error creating ${dir}: ${err.message}`);
      }
    }
  }
}

async function createProjectConfigs() {
  console.log('\n📋 Creating project configuration files...');
  
  const projects = [
    {
      name: 'clients',
      description: 'Client and business contact management',
      categories: ['sales', 'business', 'contacts'],
      folders: ['clients']
    },
    {
      name: 'foods', 
      description: 'Recipes and food-related content',
      categories: ['cooking', 'recipes', 'nutrition'],
      folders: ['foods', 'recipes']
    },
    {
      name: 'lifts',
      description: 'Workout routines and fitness tracking',
      categories: ['physical', 'fitness', 'workouts'],
      folders: ['lifts', 'workouts', 'fitness']
    },
    {
      name: 'sephirot',
      description: 'Kabbalistic and spiritual content',
      categories: ['spiritual', 'kabbalah', 'esoteric'],
      folders: ['sephirot', 'kabbalah', 'spiritual']
    },
    {
      name: 'tarot',
      description: 'Tarot readings and interpretations',
      categories: ['divination', 'tarot', 'esoteric'],
      folders: ['tarot', 'divination']
    }
  ];
  
  for (const project of projects) {
    const configPath = path.join(CONFIG.ECHO_PATH, 'projects', project.name, 'project.json');
    
    const config = {
      name: project.name,
      description: project.description,
      categories: project.categories,
      folders: project.folders,
      created: new Date().toISOString(),
      version: '1.0.0'
    };
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Created config: projects/${project.name}/project.json`);
  }
}

async function createCapsuleIndex() {
  console.log('\n🗃️  Creating capsule index...');
  
  const indexPath = path.join(CONFIG.ECHO_PATH, 'memory', 'capsule-index.json');
  
  const index = {
    version: '1.0.0',
    created: new Date().toISOString(),
    totalCapsules: 0,
    projects: {},
    lastUpdate: new Date().toISOString()
  };
  
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  console.log(`✅ Created: memory/capsule-index.json`);
}

async function createMemoryConfig() {
  console.log('\n⚙️  Creating memory configuration...');
  
  const memoryConfigPath = path.join(CONFIG.ECHO_PATH, 'config', 'memory.json');
  
  const memoryConfig = {
    capsuleRetention: {
      maxAge: '1 year',
      maxCount: 10000,
      autoArchive: true
    },
    projects: {
      autoInfer: true,
      defaultProject: 'general',
      categories: {
        'clients': ['sales', 'business', 'contacts'],
        'foods': ['cooking', 'recipes', 'nutrition'],
        'lifts': ['physical', 'fitness', 'workouts'],
        'sephirot': ['spiritual', 'kabbalah', 'esoteric'],
        'tarot': ['divination', 'tarot', 'esoteric']
      }
    },
    search: {
      maxResults: 20,
      minRelevance: 0.1,
      projectBoost: 1.5
    },
    created: new Date().toISOString()
  };
  
  await fs.writeFile(memoryConfigPath, JSON.stringify(memoryConfig, null, 2));
  console.log(`✅ Created: config/memory.json`);
}

async function createReadme() {
  console.log('\n📖 Creating structure documentation...');
  
  const readmePath = path.join(CONFIG.ECHO_PATH, 'README.md');
  
  const readmeContent = `# Echo Rubicon File Structure

## Directory Structure

\`\`\`
.echo/
├── capsules/           # General memory capsules (by date)
│   └── YYYY/MM/DD/    # Date-organized storage
├── chats/             # Chat sessions
│   └── open/          # Active chat sessions
├── config/            # System configuration
├── memory/            # Memory indexes and metadata
└── projects/          # Project-specific storage
    ├── clients/       # Client management
    │   └── capsules/  # Client-related memories
    ├── foods/         # Recipe and food content
    │   └── capsules/  # Food-related memories
    ├── lifts/         # Fitness and workouts
    │   └── capsules/  # Fitness-related memories
    ├── sephirot/      # Spiritual/Kabbalistic content
    │   └── capsules/  # Spiritual memories
    └── tarot/         # Tarot and divination
        └── capsules/  # Tarot-related memories
\`\`\`

## Capsule Storage Rules

1. **Project-specific capsules**: Go in \`projects/{project}/capsules/\`
2. **General capsules**: Go in \`capsules/YYYY/MM/DD/\`
3. **Auto-classification**: System infers project from content
4. **Fallback**: Unclassified content goes to date-organized general storage

## Configuration Files

- \`config/memory.json\`: Memory system settings
- \`projects/{name}/project.json\`: Project-specific configuration

---
*Structure rebuilt: ${new Date().toISOString()}*
`;
  
  await fs.writeFile(readmePath, readmeContent);
  console.log(`✅ Created: README.md`);
}

async function verifyStructure() {
  console.log('\n🔍 Verifying structure...');
  
  const checkPaths = [
    '.echo/capsules',
    '.echo/projects/clients/capsules',
    '.echo/projects/foods/capsules', 
    '.echo/projects/lifts/capsules',
    '.echo/config',
    '.echo/memory'
  ];
  
  let allGood = true;
  
  for (const checkPath of checkPaths) {
    const fullPath = path.join(CONFIG.VAULT_PATH, checkPath);
    const exists = fsSync.existsSync(fullPath);
    
    if (exists) {
      console.log(`✅ ${checkPath}`);
    } else {
      console.log(`❌ ${checkPath} - MISSING`);
      allGood = false;
    }
  }
  
  return allGood;
}

async function main() {
  console.log('🏗️  REBUILDING ECHO FILE STRUCTURE\n');
  console.log(`Vault: ${CONFIG.VAULT_PATH}`);
  console.log(`Echo:  ${CONFIG.ECHO_PATH}\n`);
  
  try {
    await createEchoStructure();
    await createProjectConfigs();
    await createCapsuleIndex();
    await createMemoryConfig();
    await createReadme();
    
    console.log('\n🔍 VERIFICATION:');
    const isValid = await verifyStructure();
    
    if (isValid) {
      console.log('\n🎉 STRUCTURE REBUILD COMPLETE!');
      console.log('\n📋 What was created:');
      console.log('   📁 Complete .echo directory structure');
      console.log('   ⚙️  Project configurations for 5 projects');
      console.log('   🗃️  Memory index and configuration');
      console.log('   📖 Documentation');
      
      console.log('\n🚀 NEXT STEPS:');
      console.log('1. Echo will now find the expected project paths');
      console.log('2. Memory capsules will be properly categorized');
      console.log('3. Restart Echo to pick up the new structure');
      console.log('4. Test: "what are my clients?" should now work');
      
    } else {
      console.log('\n❌ Structure verification failed - check errors above');
    }
    
  } catch (err) {
    console.error('❌ Error rebuilding structure:', err);
  }
}

main();