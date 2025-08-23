const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const QLIB_MODEL = 'granite3.3:2b'; // Hardcoded, never changes

async function checkOllamaInstalled() {
  try {
    const { stdout } = await execAsync('ollama --version');
    console.log('[Q-Lib Setup] Ollama detected:', stdout.trim());
    return true;
  } catch (e) {
    console.log('[Q-Lib Setup] Ollama not found');
    return false;
  }
}

async function checkQLibInstalled() {
  try {
    const { stdout } = await execAsync('ollama list');
    const installed = stdout.includes(QLIB_MODEL);
    console.log(`[Q-Lib Setup] ${QLIB_MODEL} installed:`, installed);
    return installed;
  } catch (e) {
    console.error('[Q-Lib Setup] Error checking models:', e.message);
    return false;
  }
}

async function installQLib(progressCallback) {
  progressCallback('Starting Q-Lib installation...');
  
  return new Promise((resolve, reject) => {
    const pullProcess = exec(`ollama pull ${QLIB_MODEL}`);
    
    pullProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log('[Q-Lib Install]', output);
      
      // Parse Ollama's download progress
      if (output.includes('pulling')) {
        progressCallback('Connecting to model registry...');
      } else if (output.includes('%')) {
        progressCallback(output);
      } else if (output.includes('verifying')) {
        progressCallback('Verifying download...');
      } else if (output.includes('success')) {
        progressCallback('Q-Lib installed successfully!');
      }
    });
    
    pullProcess.stderr.on('data', (data) => {
      console.error('[Q-Lib Install Error]', data.toString());
    });
    
    pullProcess.on('exit', (code) => {
      if (code === 0) {
        console.log('[Q-Lib Setup] Installation complete');
        resolve();
      } else {
        reject(new Error(`Installation failed with code ${code}`));
      }
    });
    
    pullProcess.on('error', (err) => {
      reject(err);
    });
  });
}

// Test if Ollama is running
async function startOllamaIfNeeded() {
  try {
    // Try to list models - if this fails, Ollama isn't running
    await execAsync('ollama list');
    return true;
  } catch (e) {
    console.log('[Q-Lib Setup] Starting Ollama service...');
    try {
      // Try to start Ollama
      exec('ollama serve', { detached: true });
      // Wait a bit for it to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      return true;
    } catch (startErr) {
      console.error('[Q-Lib Setup] Could not start Ollama:', startErr);
      return false;
    }
  }
}

module.exports = { 
  checkOllamaInstalled, 
  checkQLibInstalled, 
  installQLib,
  startOllamaIfNeeded,
  QLIB_MODEL 
};