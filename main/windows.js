const { BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
// Add this with the other requires at the top
const { getVaultPath: getVaultPathFromManager } = require('../components/utils/VaultPathManager');

let mainWindow = null;
let securityWindow = null;
let onboardingWindow = null;

// Function to calculate responsive window size
function calculateWindowSize(screenWidth, screenHeight, scaleFactor = 1) {
  let windowWidth, windowHeight;
  
  console.log(`[WINDOW] Raw screen size: ${screenWidth}x${screenHeight}`);
  console.log(`[WINDOW] Scale factor: ${scaleFactor}`);
  
  // Account for DPI scaling - use actual physical pixels
  const physicalWidth = Math.round(screenWidth * scaleFactor);
  const physicalHeight = Math.round(screenHeight * scaleFactor);
  
  console.log(`[WINDOW] Physical screen size: ${physicalWidth}x${physicalHeight}`);
  
  // Use fixed sizes based on actual screen width to avoid DPI issues
  if (screenWidth >= 2560 || physicalWidth >= 2560) {
    // 32" 4K or similar - use very large fixed size
    windowWidth = 2200;
    windowHeight = 1400;
    console.log('[WINDOW] Ultra-large screen (32"+) detected, using 2200x1400');
  } else if (screenWidth >= 1920 || physicalWidth >= 1920) {
    // 20-27" monitors - use large fixed size
    windowWidth = 1600;
    windowHeight = 1000;
    console.log('[WINDOW] Large screen (20-27") detected, using 1600x1000');
  } else if (screenWidth >= 1366 || physicalWidth >= 1366) {
    // 15" laptops - use medium fixed size
    windowWidth = 1200;
    windowHeight = 800;
    console.log('[WINDOW] Medium screen (15") detected, using 1200x800');
  } else {
    // Very small screens - use percentage
    windowWidth = Math.round(screenWidth * 0.95);
    windowHeight = Math.round(screenHeight * 0.95);
    console.log('[WINDOW] Small screen detected, using 95% sizing');
  }
  
  // Enforce absolute minimum dimensions
  windowWidth = Math.max(windowWidth, 800);
  windowHeight = Math.max(windowHeight, 600);
  
  // Don't exceed screen size (leave some margin)
  // Use the raw screen dimensions for limiting, not physical
  windowWidth = Math.min(windowWidth, screenWidth - 50);
  windowHeight = Math.min(windowHeight, screenHeight - 50);
  
  console.log(`[WINDOW] Final calculated size: ${windowWidth}x${windowHeight}`);
  
  return { width: windowWidth, height: windowHeight };
}

function createWindow() {
  try {
    // Get ALL displays and find the best one to use
    const allDisplays = screen.getAllDisplays();
    console.log(`[WINDOW] Available displays:`, allDisplays.length);
    
    // Log all display info
    allDisplays.forEach((display, index) => {
      console.log(`[WINDOW] Display ${index}: ${display.bounds.width}x${display.bounds.height} (${display.bounds.width > 1500 ? 'Large' : display.bounds.width > 1200 ? 'Medium' : 'Small'})`);
    });
    
    // Choose the largest available display (likely the external monitor)
    let targetDisplay = allDisplays.reduce((largest, current) => {
      const largestArea = largest.bounds.width * largest.bounds.height;
      const currentArea = current.bounds.width * current.bounds.height;
      return currentArea > largestArea ? current : largest;
    });
    
    // If we have multiple displays, prefer non-primary (external monitors)
    if (allDisplays.length > 1) {
      const externalDisplays = allDisplays.filter(d => !d.primary);
      if (externalDisplays.length > 0) {
        // Choose the largest external display
        targetDisplay = externalDisplays.reduce((largest, current) => {
          const largestArea = largest.bounds.width * largest.bounds.height;
          const currentArea = current.bounds.width * current.bounds.height;
          return currentArea > largestArea ? current : largest;
        });
        console.log(`[WINDOW] Using external display instead of primary`);
      }
    }
    
    const { width: screenWidth, height: screenHeight } = targetDisplay.workAreaSize;
    const scaleFactor = targetDisplay.scaleFactor || 1;
    
    console.log(`[WINDOW] Selected display: ${screenWidth}x${screenHeight}`);
    console.log(`[WINDOW] Display bounds:`, targetDisplay.bounds);
    console.log(`[WINDOW] Work area size:`, targetDisplay.workAreaSize);
    console.log(`[WINDOW] Scale factor:`, scaleFactor);
    
    // Calculate responsive window size using the helper function
    const { width: windowWidth, height: windowHeight } = calculateWindowSize(screenWidth, screenHeight, scaleFactor);

    mainWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      minWidth: 800,
      minHeight: 600,
      x: targetDisplay.bounds.x + Math.round((targetDisplay.bounds.width - windowWidth) / 2),
      y: targetDisplay.bounds.y + Math.round((targetDisplay.bounds.height - windowHeight) / 2),
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true
      },
      frame: true, // For custom title bar
      backgroundColor: '#1a1a1a',
      show: false // Don't show until ready
    });
    
    console.log(`[WINDOW] Window positioned at: ${mainWindow.getBounds().x}, ${mainWindow.getBounds().y}`);
    
    console.log(`[WINDOW] Main window created successfully`);
  } catch (error) {
    console.error('[WINDOW] Error creating main window:', error);
    // Fallback to safe defaults
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true
      },
      frame: true,
      backgroundColor: '#1a1a1a',
      show: false,
      center: true
    });
    console.log('[WINDOW] Used fallback window size');
  }

  // Load the main HTML file
  mainWindow.loadFile(path.join(__dirname, '../index.html'));
  
  // Add F5 refresh support
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F5' && input.type === 'keyDown') {
      mainWindow.webContents.reload();
      event.preventDefault();
    }
  });
  
  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}

function createSecurityWindow() {
  securityWindow = new BrowserWindow({
    width: 500,
    height: 600,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    frame: true,
    backgroundColor: '#1a1a1a',
    show: false
  });

  securityWindow.loadFile(path.join(__dirname, '../security-challenge.html'));
  
  securityWindow.once('ready-to-show', () => {
    securityWindow.show();
  });

  securityWindow.on('closed', () => {
    securityWindow = null;
  });

  return securityWindow;
}

function createOnboardingWindow() {
  try {
    // Get primary display work area for onboarding window
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    console.log(`[ONBOARDING] Creating onboarding window for screen: ${screenWidth}x${screenHeight}`);
    
    // Onboarding window should be smaller and centered
    let onboardingWidth = Math.round(screenWidth * 0.7);
    let onboardingHeight = Math.round(screenHeight * 0.8);
    
    // Enforce reasonable bounds for onboarding
    onboardingWidth = Math.max(onboardingWidth, 600);
    onboardingHeight = Math.max(onboardingHeight, 500);
    onboardingWidth = Math.min(onboardingWidth, 1200);
    onboardingHeight = Math.min(onboardingHeight, 900);
    
    console.log(`[ONBOARDING] Calculated window size: ${onboardingWidth}x${onboardingHeight}`);

    onboardingWindow = new BrowserWindow({
      width: onboardingWidth,
      height: onboardingHeight,
      minWidth: 600,
      minHeight: 500,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true
      },
      frame: true,
      backgroundColor: '#0f0f0f',
      show: false,
      titleBarStyle: 'default',
      center: true
    });
  } catch (error) {
    console.error('[ONBOARDING] Error creating onboarding window:', error);
    // Fallback to safe defaults
    onboardingWindow = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 600,
      minHeight: 500,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true
      },
      frame: true,
      backgroundColor: '#0f0f0f',
      show: false,
      titleBarStyle: 'default',
      center: true
    });
    console.log('[ONBOARDING] Used fallback window size');
  }

  onboardingWindow.loadFile(path.join(__dirname, '../onboarding.html'));
  
  // Open DevTools in development for debugging
  if (process.env.NODE_ENV === 'development') {
    onboardingWindow.webContents.openDevTools();
  }
  
  onboardingWindow.once('ready-to-show', () => {
    onboardingWindow.show();
  });

  onboardingWindow.on('closed', () => {
    onboardingWindow = null;
    // REMOVED: Automatic window creation - let app flow handle this
  });

  return onboardingWindow;
}

// Add transition function to handle onboarding -> main window flow
function transitionFromOnboardingToMain() {
  // Close onboarding if still open
  if (onboardingWindow && !onboardingWindow.isDestroyed()) {
    onboardingWindow.close();
  }
  
  // Create main window after a brief delay to ensure clean transition
  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
    }
  }, 100);
}

// Helper function to get vault path - RENAMED to avoid conflicts
async function getVaultPathOld() {
  const { app } = require('electron');
  
  try {
    // First check if obsidianVaultPath is stored
    const vaultPathFile = path.join(app.getPath('userData'), 'vaultPath.txt');
    const vaultPath = await fs.readFile(vaultPathFile, 'utf8');
    if (vaultPath && vaultPath !== 'Not set') {
      return vaultPath;
    }
  } catch (error) {
    // File doesn't exist or error reading
  }
  
  // Check hardcoded path from app.js
  const { userVaultPath } = require('./app');
  if (userVaultPath) {
    return userVaultPath;
  }
  
  // Default to Documents/Echo Vault
  return path.join(os.homedir(), 'Documents', 'Echo Vault');
}

// Getter functions for windows
function getMainWindow() {
  return mainWindow;
}

function getSecurityWindow() {
  return securityWindow;
}

function getOnboardingWindow() {
  return onboardingWindow;
}

// Initialize windows based on app state
function initializeWindows() {
  // Listen for app ready event
  ipcMain.once('app-ready', async () => {
    try {
      // Get the vault path - USE THE NEW VAULTPATHMANAGER
      const vaultPath = getVaultPathFromManager() || 'D:\\Obsidian Vault';
      console.log('[WINDOWS] Using vault path:', vaultPath); // Debug log
      
      // Check for onboarding completion marker in vault
      const lockPath = path.join(vaultPath, '.echo', 'config', 'FIRST_RUN_COMPLETE');
      console.log('[WINDOWS] Checking for marker at:', lockPath); // Debug log
      
      try {
        await fs.access(lockPath);
        console.log('First run complete marker found, loading main window');
        // Onboarding complete, show main window
        createWindow();
      } catch (error) {
        console.log('First run marker not found, showing onboarding');
        console.log('[WINDOWS] Error details:', error.message); // Debug log
        // First run, show onboarding
        createOnboardingWindow();
      }
    } catch (error) {
      console.error('Error initializing windows:', error);
      // Fallback to onboarding on any error
      createOnboardingWindow();
    }
  });

  // Handle onboarding completion
  ipcMain.on('onboarding-complete', () => {
    console.log('Onboarding complete, transitioning to main window');
    transitionFromOnboardingToMain();
  });

  // Handle window creation requests
  ipcMain.on('create-main-window', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
    }
  });

  ipcMain.on('create-security-window', () => {
    if (!securityWindow || securityWindow.isDestroyed()) {
      createSecurityWindow();
    }
  });

  ipcMain.on('create-onboarding-window', () => {
    if (!onboardingWindow || onboardingWindow.isDestroyed()) {
      createOnboardingWindow();
    }
  });

  // Handle window state queries
  ipcMain.handle('get-window-state', () => {
    return {
      hasMainWindow: !!mainWindow && !mainWindow.isDestroyed(),
      hasSecurityWindow: !!securityWindow && !securityWindow.isDestroyed(),
      hasOnboardingWindow: !!onboardingWindow && !onboardingWindow.isDestroyed()
    };
  });

  // Note: IPC handlers for select-folder, get-model-options, etc. 
  // are registered in ipc-handlers.js to avoid duplication
}

module.exports = {
  initializeWindows,
  createWindow,
  createSecurityWindow,
  createOnboardingWindow,
  getMainWindow,
  getSecurityWindow,
  getOnboardingWindow,
  transitionFromOnboardingToMain,
  getVaultPath: getVaultPathOld  // Export the old function to maintain compatibility
};