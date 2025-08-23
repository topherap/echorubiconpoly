// onboarding-diagnostic.js
// Comprehensive diagnostic to find why onboarding persistence is broken

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class OnboardingDiagnostic {
  constructor() {
    this.projectRoot = 'C:\\Users\\tophe\\Documents\\Echo Rubicon';
    this.vaultPath = 'D:\\Obsidian Vault';
    this.findings = {
      markers: {},
      configs: {},
      vaultPathIssues: [],
      codeIssues: [],
      summary: []
    };
  }

  async run() {
    console.log('🔍 Echo Rubicon Onboarding Persistence Diagnostic\n');
    
    await this.checkAllMarkers();
    await this.checkVaultPathLogic();
    await this.checkWindowsJS();
    await this.checkIPCHandlers();
    await this.analyzeTiming();
    await this.checkLocalStorage();
    
    this.generateReport();
  }

  async checkAllMarkers() {
    console.log('1️⃣ Checking all marker files...\n');
    
    // Check vault marker
    const vaultMarker = path.join(this.vaultPath, '.echo', 'config', 'FIRST_RUN_COMPLETE');
    try {
      const stats = await fs.stat(vaultMarker);
      this.findings.markers.vaultMarker = {
        exists: true,
        path: vaultMarker,
        created: stats.birthtime,
        modified: stats.mtime,
        size: stats.size
      };
      console.log(`✅ Vault marker exists: ${vaultMarker}`);
      console.log(`   Created: ${stats.birthtime}`);
    } catch (err) {
      this.findings.markers.vaultMarker = { exists: false, error: err.message };
      console.log(`❌ Vault marker NOT found: ${vaultMarker}`);
    }

    // Check userData markers
    const userDataPaths = [
      path.join(os.homedir(), 'AppData', 'Roaming', 'echo-rubicon', 'onboarding-complete.json'),
      path.join(os.homedir(), 'AppData', 'Roaming', 'Echo Rubicon', 'onboarding-complete.json'),
      path.join(os.homedir(), '.echo', 'onboarding-complete.json')
    ];

    for (const userDataPath of userDataPaths) {
      try {
        const content = await fs.readFile(userDataPath, 'utf8');
        const data = JSON.parse(content);
        this.findings.markers[userDataPath] = {
          exists: true,
          data: data,
          path: userDataPath
        };
        console.log(`✅ userData marker found: ${userDataPath}`);
      } catch (err) {
        // Silent fail for non-existent paths
      }
    }
  }

  async checkVaultPathLogic() {
    console.log('\n2️⃣ Checking VaultPathManager...\n');
    
    try {
      // Check if VaultPathManager works
      const vaultPathManager = require(path.join(this.projectRoot, 'components', 'utils', 'VaultPathManager.js'));
      
      // Test getVaultPath
      const vaultPath = vaultPathManager.getVaultPath();
      console.log(`   getVaultPath() returns: ${vaultPath}`);
      
      if (!vaultPath) {
        this.findings.vaultPathIssues.push('getVaultPath() returns null/undefined');
        
        // Check where it should be stored
        const lastVaultPath = path.join(os.homedir(), '.echo', 'lastVaultPath.json');
        try {
          const content = await fs.readFile(lastVaultPath, 'utf8');
          const data = JSON.parse(content);
          console.log(`   lastVaultPath.json contains: ${data.path}`);
          this.findings.vaultPathIssues.push(`Saved path exists but not loaded: ${data.path}`);
        } catch (err) {
          console.log(`   lastVaultPath.json not found or invalid`);
          this.findings.vaultPathIssues.push('No saved vault path found');
        }
      }
      
      // Test direct set and get
      vaultPathManager.setVaultPath(this.vaultPath);
      const afterSet = vaultPathManager.getVaultPath();
      console.log(`   After setVaultPath: ${afterSet}`);
      
      if (afterSet !== this.vaultPath) {
        this.findings.vaultPathIssues.push('setVaultPath/getVaultPath not working correctly');
      }
      
    } catch (err) {
      console.log(`❌ VaultPathManager error: ${err.message}`);
      this.findings.vaultPathIssues.push(`VaultPathManager load error: ${err.message}`);
    }
  }

  async checkWindowsJS() {
    console.log('\n3️⃣ Analyzing windows.js startup logic...\n');
    
    const windowsPath = path.join(this.projectRoot, 'main', 'windows.js');
    try {
      const content = await fs.readFile(windowsPath, 'utf8');
      
      // Find the initialization logic
      const initMatch = content.match(/async\s+function\s+initializeWindows[\s\S]*?catch.*?\{[\s\S]*?\}/);
      if (initMatch) {
        // Check what it's doing
        const logic = initMatch[0];
        
        // Check if it gets vault path
        if (logic.includes('getVaultPath()')) {
          console.log('✅ windows.js calls getVaultPath()');
          
          // Check if it has error handling
          if (!logic.includes('if (!vaultPath)') && !logic.includes('vaultPath ||')) {
            console.log('❌ No null check for vaultPath');
            this.findings.codeIssues.push('windows.js doesn\'t handle null vaultPath');
          }
        }
        
        // Check marker path construction
        const markerPathMatch = logic.match(/path\.join\([^,]+,\s*['"]\.echo['"]/);
        if (markerPathMatch) {
          console.log('✅ Constructs .echo path correctly');
        }
        
        // Check for timing issues
        if (logic.includes('app.whenReady')) {
          console.log('⚠️  Initialization inside app.whenReady - possible timing issue');
          this.findings.codeIssues.push('Vault path might not be available during app.whenReady');
        }
      }
      
    } catch (err) {
      console.log(`❌ Could not analyze windows.js: ${err.message}`);
    }
  }

  async checkIPCHandlers() {
    console.log('\n4️⃣ Checking IPC handlers...\n');
    
    const ipcPath = path.join(this.projectRoot, 'main', 'ipc-handlers.js');
    try {
      const content = await fs.readFile(ipcPath, 'utf8');
      
      // Check onboarding:complete handler
      if (content.includes('onboarding:complete')) {
        console.log('✅ Has onboarding:complete handler');
        
        // Check if it creates the right marker
        const handlerMatch = content.match(/onboarding:complete[^}]*\{[\s\S]*?\n\}\)/);
        if (handlerMatch) {
          const handler = handlerMatch[0];
          if (handler.includes('.echo/config/FIRST_RUN_COMPLETE')) {
            console.log('✅ Creates correct vault marker');
          } else {
            console.log('❌ Does NOT create vault marker');
            this.findings.codeIssues.push('onboarding:complete doesn\'t create vault marker');
          }
        }
      }
      
    } catch (err) {
      console.log(`❌ Could not check IPC handlers: ${err.message}`);
    }
  }

  async analyzeTiming() {
    console.log('\n5️⃣ Analyzing timing issues...\n');
    
    // Check main.js for startup sequence
    const mainPath = path.join(this.projectRoot, 'main.js');
    try {
      const content = await fs.readFile(mainPath, 'utf8');
      
      // Find what runs on app.whenReady
      const readyMatch = content.match(/app\.whenReady\(\)[\s\S]*?\}\)/);
      if (readyMatch) {
        const readyCode = readyMatch[0];
        
        // Check order of operations
        const vaultPathPos = readyCode.indexOf('getVaultPath');
        const windowsPos = readyCode.indexOf('initializeWindows');
        const requirePos = readyCode.indexOf('require');
        
        if (vaultPathPos > -1 && windowsPos > -1 && vaultPathPos > windowsPos) {
          console.log('⚠️  Windows initialized before vault path is set');
          this.findings.codeIssues.push('Race condition: windows init before vault path');
        }
        
        // Check if VaultPathManager is required early enough
        if (requirePos > windowsPos) {
          console.log('⚠️  Modules loaded after window initialization');
          this.findings.codeIssues.push('Module load order issue');
        }
      }
    } catch (err) {
      console.log(`❌ Could not analyze main.js: ${err.message}`);
    }
  }

  async checkLocalStorage() {
    console.log('\n6️⃣ Checking localStorage simulation...\n');
    
    // Check for any localStorage files
    const localStoragePaths = [
      path.join(os.homedir(), 'AppData', 'Roaming', 'Echo Rubicon', 'Local Storage'),
      path.join(os.homedir(), '.echo', 'localStorage')
    ];
    
    for (const lsPath of localStoragePaths) {
      try {
        const files = await fs.readdir(lsPath);
        console.log(`Found localStorage at: ${lsPath}`);
        console.log(`Files: ${files.join(', ')}`);
      } catch (err) {
        // Silent fail
      }
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60) + '\n');
    
    // Marker status
    console.log('🎯 MARKER STATUS:');
    if (this.findings.markers.vaultMarker?.exists) {
      console.log(`✅ Vault marker exists (created ${this.findings.markers.vaultMarker.created})`);
    } else {
      console.log('❌ Vault marker MISSING');
    }
    
    // Main issues
    console.log('\n❌ CRITICAL ISSUES:');
    
    if (this.findings.vaultPathIssues.length > 0) {
      console.log('\nVaultPath Problems:');
      this.findings.vaultPathIssues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
    }
    
    if (this.findings.codeIssues.length > 0) {
      console.log('\nCode Problems:');
      this.findings.codeIssues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
    }
    
    // Root cause analysis
    console.log('\n💡 ROOT CAUSE ANALYSIS:');
    
    if (this.findings.vaultPathIssues.includes('getVaultPath() returns null/undefined')) {
      console.log('\n🔴 PRIMARY ISSUE: getVaultPath() returns null during startup');
      console.log('   This causes windows.js to check the wrong path for markers');
      console.log('   Even though markers exist, they\'re not found');
      
      console.log('\n🔧 FIX NEEDED:');
      console.log('   1. Make VaultPathManager load synchronously on startup');
      console.log('   2. OR add fallback in windows.js when vaultPath is null');
      console.log('   3. OR check userData marker first as fallback');
    }
    
    // Save detailed report
    const reportPath = path.join(this.projectRoot, 'logs', `onboarding_diagnostic_${Date.now()}.json`);
    fs.writeFile(reportPath, JSON.stringify(this.findings, null, 2))
      .then(() => console.log(`\n💾 Detailed report saved to: ${reportPath}`))
      .catch(err => console.log(`\n❌ Could not save report: ${err.message}`));
  }
}

// Run diagnostic
const diagnostic = new OnboardingDiagnostic();
diagnostic.run().catch(console.error);