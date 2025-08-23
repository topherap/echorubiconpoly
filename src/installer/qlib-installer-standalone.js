#!/usr/bin/env node
// Standalone Q-Lib Installer for Echo Rubicon
// Can be run independently: node qlib-installer-standalone.js

const { exec } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const execAsync = promisify(exec);

const QLIB_MODEL = 'granite3.3:2b';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logProgress(message) {
  process.stdout.write(`\r${colors.cyan}${message}${colors.reset}`);
}

async function checkOllama() {
  try {
    await execAsync('ollama --version');
    return true;
  } catch (e) {
    return false;
  }
}

async function checkQLibInstalled() {
  try {
    const { stdout } = await execAsync('ollama list');
    return stdout.includes(QLIB_MODEL);
  } catch (e) {
    return false;
  }
}

async function installQLib() {
  return new Promise((resolve, reject) => {
    log(`\nDownloading ${QLIB_MODEL}...`, colors.yellow);
    log('This is a one-time download (~1GB)\n', colors.yellow);
    
    const pullProcess = exec(`ollama pull ${QLIB_MODEL}`);
    let lastProgress = '';
    
    pullProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      
      // Parse Ollama's progress output
      if (output.includes('pulling')) {
        logProgress('📥 Connecting to model registry...');
      } else if (output.includes('%')) {
        // Extract percentage
        const match = output.match(/(\d+)%/);
        if (match) {
          const percent = match[1];
          const bar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));
          logProgress(`📥 Downloading: [${bar}] ${percent}%`);
        }
      } else if (output.includes('verifying')) {
        logProgress('🔍 Verifying download...');
      } else if (output.includes('success')) {
        console.log(''); // New line
        log('✅ Q-Lib installed successfully!', colors.green);
      }
    });
    
    pullProcess.stderr.on('data', (data) => {
      console.error(`\n${colors.red}Error: ${data}${colors.reset}`);
    });
    
    pullProcess.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Installation failed with code ${code}`));
      }
    });
  });
}

async function testQLib() {
  log('\n🧪 Testing Q-Lib...', colors.cyan);
  
  try {
    const testPrompt = 'Extract facts from: "Echo Rubicon is an AI assistant." Return JSON: {"facts": [...]}';
    
    const { stdout } = await execAsync(`ollama run ${QLIB_MODEL} "${testPrompt}" --verbose=false`);
    
    log('✅ Q-Lib test successful!', colors.green);
    log('Response preview:', colors.cyan);
    console.log(stdout.substring(0, 200) + '...\n');
    
    return true;
  } catch (error) {
    log('❌ Q-Lib test failed', colors.red);
    console.error(error.message);
    return false;
  }
}

async function main() {
  console.clear();
  log('🧠 Echo Rubicon Q-Lib Installer', colors.bright);
  log('================================\n', colors.bright);
  
  // Check Ollama
  log('Checking for Ollama...', colors.cyan);
  if (!await checkOllama()) {
    log('\n❌ Ollama not found!', colors.red);
    log('\n📋 Ollama is required for Echo\'s memory engine.', colors.yellow);
    log('   It\'s free, open-source, and runs 100% locally.\n', colors.yellow);
    
    log('👉 Download Ollama here:', colors.bright);
    log('   https://ollama.ai\n', colors.cyan);
    
    log('📦 What is Ollama?', colors.bright);
    log('   • Runs AI models locally (no cloud, no fees)', colors.reset);
    log('   • Your data never leaves your computer', colors.reset);
    log('   • Required for Echo\'s Q-Lib memory system\n', colors.reset);
    
    log('🔧 Installation steps:', colors.bright);
    log('   1. Download Ollama from the link above', colors.reset);
    log('   2. Run the installer (admin rights needed)', colors.reset);
    log('   3. Start Ollama (it runs in your system tray)', colors.reset);
    log('   4. Run this Echo installer again\n', colors.reset);
    
    log('💡 Tip: Ollama uses ~500MB disk space plus model storage', colors.yellow);
    
    // Add pause for Windows
    if (process.platform === 'win32') {
      log('\nPress any key to exit...', colors.cyan);
      require('child_process').execSync('pause > nul');
    }
    
    process.exit(1);
  }
  log('✅ Ollama detected', colors.green);
  
  // Check if Ollama is running
  try {
    await execAsync('ollama list');
  } catch (e) {
    log('\n⚠️  Ollama is installed but not running!', colors.yellow);
    log('\n🔧 To start Ollama:', colors.bright);
    
    if (process.platform === 'win32') {
      log('   • Look for Ollama in your system tray', colors.reset);
      log('   • Or search "Ollama" in Start Menu', colors.reset);
      log('   • Or run: ollama serve', colors.reset);
    } else {
      log('   • Run: ollama serve', colors.reset);
    }
    
    log('\n💡 Ollama runs in the background and uses ~200MB RAM', colors.yellow);
    log('   You can close it anytime from the system tray\n', colors.yellow);
    
    // Add pause for Windows
    if (process.platform === 'win32') {
      log('\nPress any key to exit...', colors.cyan);
      require('child_process').execSync('pause > nul');
    }
    
    process.exit(1);
  }
  
  // Check if Q-Lib already installed
  log('\nChecking for Q-Lib...', colors.cyan);
  if (await checkQLibInstalled()) {
    log('✅ Q-Lib already installed!', colors.green);
    
    // Offer to test
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\nRun a test? (y/N): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'y') {
      await testQLib();
    }
    
    process.exit(0);
  }
  
  // Q-Lib not found - show info and install
  log('\n📚 About Q-Lib:', colors.bright);
  log('   Q-Lib is Echo\'s memory engine - a small AI that:', colors.reset);
  log('   • Searches your conversations instantly', colors.reset);
  log('   • Extracts facts without hallucination', colors.reset);
  log('   • Runs 100% locally on your computer', colors.reset);
  log('   • Uses only ~1GB disk space\n', colors.reset);
  
  log('🚀 Ready to install Q-Lib?', colors.bright);
  log('   Download size: ~1GB (one-time)', colors.yellow);
  log('   Install time: 2-5 minutes\n', colors.yellow);
  
  // Install Q-Lib
  try {
    await installQLib();
    
    // Test installation
    log('\nRunning post-install test...', colors.cyan);
    await testQLib();
    
    log('\n🎉 Q-Lib installation complete!', colors.green);
    log('\nEcho Rubicon is now ready to use.', colors.bright);
    
    // Add pause for Windows
    if (process.platform === 'win32') {
      log('\nPress any key to exit...', colors.cyan);
      require('child_process').execSync('pause > nul');
    }
    
  } catch (error) {
    log(`\n❌ Installation failed: ${error.message}`, colors.red);
    
    // Add pause for Windows
    if (process.platform === 'win32') {
      log('\nPress any key to exit...', colors.cyan);
      require('child_process').execSync('pause > nul');
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkOllama, checkQLibInstalled, installQLib };