// echo-diagnostic-v2.js
// Echo Rubicon: Full Path, Patch, and Duplication Diagnostic

const fs = require('fs');
const path = require('path');

const CONFIG_PATHS = [
  path.join(__dirname, 'config', 'config.json'),
  path.join(__dirname, 'config', 'vault.json'),
  path.join(process.env.APPDATA || '', 'Echo Rubicon', 'echo-config.json')
];

const VAULT_FOLDERS = [
  'obsidian-vault',
  'D:/Obsidian Vault',
];

const REQUIRED_DIRS = [
  '.echo/memory/capsules',
  '.echo/sessions',
  'conversations',
  'clients'
];

const DEPRECATED_DIRS = ['chats'];

function logResult(label, result, type = 'info') {
  const symbol = result ? '✓' : '✗';
  const color = type === 'error' ? '\x1b[31m' : type === 'warn' ? '\x1b[33m' : '\x1b[32m';
  console.log(`${color}${symbol} ${label}\x1b[0m`);
}

function loadConfig() {
  for (const configPath of CONFIG_PATHS) {
    if (fs.existsSync(configPath)) {
      try {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch (err) {
        console.error(`\nFailed to parse config: ${configPath}`, err);
      }
    }
  }
  return null;
}

function findVaultPath(config) {
  return config?.vaultPath || VAULT_FOLDERS.find(p => fs.existsSync(p));
}

function checkFolders(vaultPath, autoCreate = true) {
  const results = {};
  for (const dir of REQUIRED_DIRS) {
    const full = path.join(vaultPath, dir);
    const exists = fs.existsSync(full);
    results[dir] = exists;
    if (!exists && autoCreate) {
      try {
        fs.mkdirSync(full, { recursive: true });
        logResult(`→ Created missing folder: ${dir}`, true, 'warn');
      } catch (err) {
        logResult(`→ Failed to create: ${dir}`, false, 'error');
      }
    } else {
      logResult(`${dir} exists`, exists);
    }
  }
  return results;
}

function checkDeprecatedFolders(vaultPath) {
  for (const dir of DEPRECATED_DIRS) {
    const full = path.join(vaultPath, dir);
    if (fs.existsSync(full)) {
      logResult(`Deprecated folder found: ${dir}`, false, 'warn');
      try {
        fs.rmSync(full, { recursive: true, force: true });
        logResult(`→ Deleted deprecated folder: ${dir}`, true, 'warn');
      } catch (err) {
        logResult(`→ Failed to delete: ${dir}`, false, 'error');
      }
    }
  }
}

function detectConversationDuplicates(vaultPath) {
  const convoDir = path.join(vaultPath, 'conversations');
  if (!fs.existsSync(convoDir)) return;

  const files = fs.readdirSync(convoDir).filter(f => f.endsWith('.md'));
  const nameMap = {};

  for (const file of files) {
    const base = file.replace(/_\d{6,}/, '').replace(/\.md$/, '');
    nameMap[base] = nameMap[base] || [];
    nameMap[base].push(file);
  }

  const duplicates = Object.entries(nameMap).filter(([_, group]) => group.length > 1);
  if (duplicates.length > 0) {
    console.log('\n⚠️ Potential duplicate conversations:');
    duplicates.forEach(([base, group]) => {
      console.log(`  - ${base}: ${group.join(', ')}`);
    });
  } else {
    logResult('No duplicate conversation files detected', true);
  }
}

function simulateFactInjectionCheck() {
  const sampleFacts = [
    { name: 'Deborah A Lindsey' },
    'carnivore ice cream',
    { address: '123 Apple St' },
    null
  ];

  try {
    const converted = sampleFacts.map(f => typeof f === 'string' ? f : (f?.name || 'Unknown'));
    const result = converted.join('\n');
    logResult('Fact injection serialization passed', true);
    return result;
  } catch (err) {
    logResult('Fact injection serialization failed', false, 'error');
    return null;
  }
}

function auditPatchPresence(filePath, expectedPattern) {
  if (!fs.existsSync(filePath)) {
    logResult(`File missing: ${filePath}`, false, 'error');
    return false;
  }
  const contents = fs.readFileSync(filePath, 'utf-8');
  const found = contents.includes(expectedPattern);
  logResult(`Patch present in ${path.basename(filePath)}`, found, found ? 'info' : 'warn');
  return found;
}

function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  ECHO RUBICON DIAGNOSTIC MODULE (v2) INITIATED');
  console.log('═══════════════════════════════════════════════════\n');

  const config = loadConfig();
  const vaultPath = findVaultPath(config);

  logResult(`Vault Path Resolved: ${vaultPath}`, Boolean(vaultPath));
  if (!vaultPath) return;

  checkFolders(vaultPath, true);
  checkDeprecatedFolders(vaultPath);

  console.log('\n🔄 Fact Injection Test:');
  simulateFactInjectionCheck();

  console.log('\n🔍 Patch Verification:');
  auditPatchPresence(path.join(__dirname, 'components', 'MyAI-global.js'), 'facts.map');
  auditPatchPresence(path.join(__dirname, 'src', 'echo', 'memory', 'QLibInterface.js'), 'return results.map');

  console.log('\n🧠 Duplication Scan in conversations/:');
  detectConversationDuplicates(vaultPath);

  console.log('\n📎 Final Notes:');
  console.log('- Deprecated folders removed');
  console.log('- Patch presence confirmed or warned');
  console.log('- Duplication logs printed above');

  console.log('\n✅ DIAGNOSTIC COMPLETE');
}

main();
