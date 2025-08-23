// NEVER modify Object.prototype!
// Compression state + trigger logic
const state = {
    lastCompressionRun: Date.now(),
    notesSinceLastCompression: 0
};

function shouldRunCompression() {
    const now = Date.now();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    return (
        (now - state.lastCompressionRun) >= fourteenDays ||
        state.notesSinceLastCompression >= 1000
    );
}
// This file bootstraps the modular architecture
// Echo Rubicon - Main Entry Point
const { app, dialog } = require('electron');
const { fork } = require('child_process');
const path = require('path');

// NEVER modify Object.prototype!
// Set memory limits and optimizations BEFORE app is ready
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=8192');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

// Windows-specific optimizations
if (process.platform === 'win32') {
  // Let Windows handle DPI naturally - don't force scaling
  app.commandLine.appendSwitch('high-dpi-support', '1');
  // Don't force any scaling - this prevents tiny windows
}

// Import Q-Lib setup utilities
const { checkOllamaInstalled, checkQLibInstalled, installQLib, startOllamaIfNeeded } = require('./src/installer/qlib-setup');

// Add Q-Lib install flag
global.showingQLIBInstall = false;

// Initialize memory process variable
let memoryProcess = null;

// Q-Lib readiness check
async function ensureQLibReady() {
  console.log('[Main] Checking Q-Lib readiness...');
  
  // Check if Ollama is installed
  if (!await checkOllamaInstalled()) {
    dialog.showErrorBox(
      'Ollama Required', 
      'Echo Rubicon requires Ollama for local AI memory.\n\n' +
      'Please install from: https://ollama.ai\n\n' +
      'After installing, restart Echo.'
    );
    app.quit();
    return false;
  }
  
  // Try to start Ollama if not running
  if (!await startOllamaIfNeeded()) {
    dialog.showErrorBox(
      'Ollama Not Running',
      'Could not start Ollama service.\n' +
      'Please start Ollama manually and restart Echo.'
    );
    app.quit();
    return false;
  }
  
  // Check if Q-Lib model is installed
  if (!await checkQLibInstalled()) {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'First-Time Setup Required',
      message: 'Echo needs to install its memory engine (Q-Lib).\n\n' +
               'This is a one-time download (~1GB) that enables:\n' +
               '• Lightning-fast memory retrieval\n' +
               '• Zero hallucination extraction\n' +
               '• Complete privacy (runs locally)\n\n' +
               'Install now?',
      buttons: ['Install Q-Lib', 'Exit'],
      defaultId: 0,
      cancelId: 1
    });
    
    if (result.response === 1) {
      app.quit();
      return false;
    }
    
    // Set flag to show installer UI
    global.showingQLIBInstall = true;
  }
  
  return true;
}

// Memory process spawner
function spawnMemoryProcess() {
  console.log('[Main] Spawning memory process...');
  
  memoryProcess = fork('./src/echo/memory/memory-runner.mjs', {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    silent: false,
    execArgv: ['--max-old-space-size=2048'] // Give memory process 2GB
  });
  
  // Capture stdout
  if (memoryProcess.stdout) {
    memoryProcess.stdout.on('data', (data) => {
      console.log(`[Memory stdout]: ${data}`);
    });
  }
  
  // Capture stderr
  if (memoryProcess.stderr) {
    memoryProcess.stderr.on('data', (data) => {
      console.error(`[Memory stderr]: ${data}`);
    });
  }
  
  memoryProcess.on('message', (msg) => {
    console.log('[Main] Memory process message:', msg);
  });
  
  memoryProcess.on('error', (err) => {
    console.error('[Main] Memory process error:', err);
  });
  
  memoryProcess.on('exit', (code, signal) => {
    console.log(`[Main] Memory process exited with code ${code} and signal ${signal}`);
    memoryProcess = null;
    
    // Restart if crashed unexpectedly
    if (code !== 0 && !app.isQuitting) {
      console.log('[Main] Restarting memory process in 5 seconds...');
      setTimeout(spawnMemoryProcess, 5000);
    }
  });
  
  // Test communication
  setTimeout(() => {
    if (memoryProcess) {
      console.log('[Main] Sending ping to memory process...');
      memoryProcess.send({ type: 'ping' });
    }
  }, 1000);
}

// Start app when ready
app.whenReady().then(async () => {
  // Check Q-Lib first
  if (!await ensureQLibReady()) {
    return; // Exit if Q-Lib check failed
  }
  
  // Initialize core app modules
  require('./main/app');
  
  // Initialize IPC handlers
  const { initializeIpcHandlers } = require('./main/ipc-handlers');
  initializeIpcHandlers();
  
  // Initialize window management
  const { initializeWindows } = require('./main/windows');
  initializeWindows();
  
  // Server is started automatically in app.js
  
  // Clear auth data ONLY on true app start (not refreshes)
const { BrowserWindow } = require('electron');
let hasCleared = false; // Track if we've already cleared

setTimeout(() => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0 && !hasCleared) {
    windows[0].webContents.once('dom-ready', () => {
      // Only clear once per app launch
      if (!hasCleared) {
        hasCleared = true;
        windows[0].webContents.executeJavaScript(`
          // Clear only auth-related items on app start
          ['echo_auth_session', 'echo_auth_timestamp', 'echo_rubicon_token', 'echoAuthenticated'].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          });
          console.log('[AUTH] Cleared auth data on app start');
        `);
      }
    });
  }
}, 100);
  
  // Spawn memory process after everything else is ready
  //spawnMemoryProcess();
  
  console.log('[Main] Echo Rubicon initialized successfully');
});

// Cleanup on app quit
app.on('before-quit', () => {
  app.isQuitting = true;
  if (memoryProcess) {
    console.log('[Main] Killing memory process...');
    memoryProcess.kill();
  }
});

// Monitor memory usage (optional but helpful)
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const usage = process.memoryUsage();
    console.log(`[Memory Monitor] RSS: ${Math.round(usage.rss / 1024 / 1024)}MB, Heap: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
  }, 30000); // Log every 30 seconds
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error);
  dialog.showErrorBox('Unexpected Error', `Echo encountered an error:\n${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled rejection at:', promise, 'reason:', reason);
});

console.log('[Main] Echo Rubicon main process starting...');
console.log('[Main] Echo Rubicon main process starting...');

// Start Q2 compression scheduler
setInterval(async () => {
  try {
    if (shouldRunCompression()) {
      await Q2.runCompression();
    }
  } catch (err) {
    console.error('[Q2] Compression failed:', err);
  }
}, 60000); // check every 60 seconds


// Auto-patched
module.exports = {};
