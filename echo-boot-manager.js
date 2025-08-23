// echo-boot-manager.js - COMPLETE FIXED VERSION
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

const PATHS = {
  meilisearchExe: 'C:\\Users\\tophe\\Documents\\Echo Rubicon\\meilisearch.exe',
  meilisearchDir: 'C:\\Users\\tophe\\Documents\\Echo Rubicon\\echo-backend-rust',
  rustDir: 'C:\\Users\\tophe\\Documents\\Echo Rubicon\\echo-backend-rust',
  electronDir: 'C:\\Users\\tophe\\Documents\\Echo Rubicon',
  logFile: 'C:\\Users\\tophe\\Documents\\Echo Rubicon\\vault\\Logs\\boot-log.md'
};

const PORTS = {
  meilisearch: 7700,
  rust: 3000
};

const MAX_ATTEMPTS = 5;
let currentAttempt = 0;
let processes = [];

// Ensure log directory exists
function ensureLogDir() {
  const logDir = path.dirname(PATHS.logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// Write to log file
function writeLog(message) {
  ensureLogDir();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const logEntry = `${message} - ${timestamp}\n`;
  fs.appendFileSync(PATHS.logFile, logEntry);
}

// Check if port is open
function checkPort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

// Wait helper
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Kill all child processes
function killAllProcesses() {
  processes.forEach(proc => {
    try {
      process.kill(proc.pid, 'SIGTERM');
    } catch (e) {}
  });
  processes = [];
}

// Start Meilisearch explicitly configured
async function startMeilisearch() {
  console.log('🚀 Starting Meilisearch with explicit flags...');
  writeLog('starting meilisearch');

  if (!fs.existsSync(PATHS.meilisearchExe)) {
    throw new Error(`MeiliSearch not found at ${PATHS.meilisearchExe}`);
  }

  const meiliProcess = spawn(PATHS.meilisearchExe, [
    '--db-path', './data.ms',
    '--http-addr', '127.0.0.1:7700',
    '--master-key', 'HfcjPnJMXnoXpF3iFk24_M-phz95JesleVwcyOqCaY',
    '--no-analytics',
    '--env', 'production'
  ], {
    cwd: PATHS.meilisearchDir,
    stdio: 'inherit',
    detached: false
  });

  processes.push(meiliProcess);

  await wait(8000);
  const isUp = await checkPort('127.0.0.1', PORTS.meilisearch);
  writeLog(`meilisearch port ${PORTS.meilisearch} check: ${isUp ? 'open' : 'closed'}`);
  if (!isUp) throw new Error('Meilisearch failed to respond on 127.0.0.1:7700');
  console.log('✅ Meilisearch is running.');
}

// Start Rust backend with proper compilation handling
async function startRustBackend() {
  console.log('🦀 Starting Rust backend...');
  writeLog('starting rust backend');

  const rustProcess = spawn('cargo', ['run', '--release'], {
    cwd: PATHS.rustDir,
    stdio: 'inherit',
    detached: false
  });

  processes.push(rustProcess);

  console.log('⏳ Waiting for Rust compilation (this can take 2-3 minutes on first run)...');
  
  // Check port every 10 seconds for up to 3 minutes
  let attempts = 0;
  const maxAttempts = 18; // 18 * 10 seconds = 3 minutes
  
  while (attempts < maxAttempts) {
    await wait(10000);
    attempts++;
    
    const isUp = await checkPort('127.0.0.1', PORTS.rust);
    if (isUp) {
      writeLog(`rust port ${PORTS.rust} check: open`);
      console.log('✅ Rust backend is running.');
      return;
    }
    
    console.log(`⏳ Still waiting for Rust... (${attempts * 10}/180 seconds)`);
  }
  
  writeLog(`rust port ${PORTS.rust} check: closed`);
  throw new Error('Rust backend failed to respond on 127.0.0.1:3000 after 3 minutes');
}

// Start Electron frontend
// Start Electron frontend
async function startElectron() {
  console.log('⚡ Starting Electron frontend...');
  writeLog('starting electron frontend');

  const electronProcess = spawn('npm', ['start'], {
    cwd: PATHS.electronDir,
    shell: true,  // <-- ADD THIS BACK for npm
    detached: false
  });

  processes.push(electronProcess);

  console.log('✅ Electron frontend started.');
}

// Orchestrate sequence
async function bootSequence() {
  const failures = [];
  try { await startMeilisearch(); } catch (e) { failures.push(`- ${e.message}`); }
  if (failures.length === 0) try { await startRustBackend(); } catch (e) { failures.push(`- ${e.message}`); }
  if (failures.length === 0) try { await startElectron(); } catch (e) { failures.push(`- ${e.message}`); }

  if (failures.length > 0) {
    writeLog(`boot attempt failed\n${failures.join('\n')}`);
    throw new Error('Boot sequence failed.');
  } else {
    writeLog('boot successful');
    console.log('🎉 Echo Rubicon fully operational.');
  }
}

// Main retry driver
async function main() {
  console.log('🔧 ECHO RUBICON BOOT MANAGER\n============================\n');

  if (!fs.existsSync(PATHS.meilisearchExe)) {
    console.error(`❌ MeiliSearch missing. Expected at: ${PATHS.meilisearchExe}`);
    console.error(`Download from https://github.com/meilisearch/meilisearch/releases`);
    process.exit(1);
  }

  while (currentAttempt < MAX_ATTEMPTS) {
    currentAttempt++;
    console.log(`\n📍 Boot attempt ${currentAttempt} of ${MAX_ATTEMPTS}`);

    try {
      await bootSequence();
      console.log('\n✨ All systems running. Press Ctrl+C to exit.');
      process.stdin.resume();
      return;
    } catch (e) {
      console.error(`\n❌ Boot attempt ${currentAttempt} failed: ${e.message}`);
      killAllProcesses();
      if (currentAttempt < MAX_ATTEMPTS) {
        console.log('🔄 Retrying in 5 seconds...');
        await wait(5000);
      }
    }
  }

  console.error('\n💀 All boot attempts failed. See logs:');
  console.error(PATHS.logFile);
  process.exit(1);
}

// Handle shutdown
process.on('SIGINT', () => { console.log('\n🛑 Shutting down Echo Rubicon...'); killAllProcesses(); process.exit(0); });
process.on('SIGTERM', () => { killAllProcesses(); process.exit(0); });

// Kick off
main().catch(e => { console.error('Fatal error:', e); killAllProcesses(); process.exit(1); });