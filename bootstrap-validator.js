// Bootstrap Error Validator
// Confirms or refutes the require() crash blocking window.MyAI registration
// Outputs to terminal and saves JSON log to specified directory

console.log('🔍 Bootstrap Error Validator - Starting diagnostic...');

// Global results object for JSON export
let diagnosticResults = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: {},
    verdict: ''
};

// Test 1: Check if require() is available in current runtime
function testRequireAvailability() {
    console.log('\n🔍 Test 1: Checking require() availability...');
    try {
        if (typeof require === 'undefined') {
            console.log('❌ CONFIRMED: require() is not defined in this runtime');
            diagnosticResults.tests.requireAvailable = false;
            diagnosticResults.tests.requireError = 'require is not defined';
            return false;
        } else {
            console.log('✅ require() is available');
            diagnosticResults.tests.requireAvailable = true;
            return true;
        }
    } catch (e) {
        console.log('❌ CONFIRMED: require() throws error:', e.message);
        diagnosticResults.tests.requireAvailable = false;
        diagnosticResults.tests.requireError = e.message;
        return false;
    }
}

// Test 2: Simulate the problematic require() calls from MyAI-global.js
function testProblematicRequires() {
    const problematicRequires = [
        './legacy/DevPanel.jsx',
        '../src/memory/QLibInterface.js',
        '../src/echo/memory/MemoryOrchestrator.js',
        './capsuleRetriever.js',
        './ModelInterface.js',
        './ContextInjector.js'
    ];
    
    console.log('\n🔍 Test 2: Testing problematic require() calls...');
    
    diagnosticResults.tests.requirePaths = {};
    
    problematicRequires.forEach(path => {
        try {
            // Don't actually require - just test the syntax
            eval('var testVar = require("' + path + '")');
            console.log('✅ ' + path + ' - would succeed');
            diagnosticResults.tests.requirePaths[path] = { success: true };
        } catch (e) {
            console.log('❌ ' + path + ' - FAILS: ' + e.message);
            diagnosticResults.tests.requirePaths[path] = { success: false, error: e.message };
        }
    });
}

// Test 3: Check if both MyAI variants exist (current state)
function checkMyAIRegistration() {
    console.log('\n🔍 Test 3: Checking MyAI registration variants...');
    
    if (typeof window !== 'undefined') {
        // Check both possible registration points
        const myaiExists = typeof window.MyAI !== 'undefined';
        const myaiGlobalExists = typeof window.MyAIGlobal !== 'undefined';
        
        console.log('window.MyAI exists:', myaiExists);
        console.log('window.MyAI type:', typeof window.MyAI);
        
        console.log('window.MyAIGlobal exists:', myaiGlobalExists);
        console.log('window.MyAIGlobal type:', typeof window.MyAIGlobal);
        
        // Check for any MyAI-related globals
        const myaiKeys = Object.keys(window).filter(function(key) {
            return key.toLowerCase().includes('myai') || key.toLowerCase().includes('ai');
        });
        
        if (myaiKeys.length > 0) {
            console.log('🔍 Found AI-related globals:', myaiKeys);
            myaiKeys.forEach(function(key) {
                console.log('  - window.' + key + ': ' + typeof window[key]);
            });
        }
        
        const result = { 
            myai: myaiExists, 
            myaiGlobal: myaiGlobalExists, 
            anyRegistered: myaiExists || myaiGlobalExists,
            aiGlobals: myaiKeys
        };
        
        diagnosticResults.tests.myAIRegistration = result;
        
        if (result.anyRegistered) {
            console.log('✅ At least one MyAI variant is registered');
        } else {
            console.log('❌ No MyAI variants are registered');
        }
        
        return result;
    } else {
        console.log('❌ window object not available (not browser environment)');
        const result = { myai: false, myaiGlobal: false, anyRegistered: false, aiGlobals: [] };
        diagnosticResults.tests.myAIRegistration = result;
        return result;
    }
}

// Test 4: Simulate safe MyAI registration (without require calls)
function testSafeMyAIRegistration() {
    console.log('\n🔍 Test 4: Testing safe MyAI registration...');
    
    try {
        // Simulate a minimal MyAI function without require() calls
        function MockMyAI() {
            console.log('MockMyAI function executed');
            return 'MockMyAI loaded';
        }
        
        if (typeof window !== 'undefined') {
            window.TestMyAI = MockMyAI;
            console.log('✅ Safe registration successful');
            console.log('window.TestMyAI exists:', typeof window.TestMyAI !== 'undefined');
            diagnosticResults.tests.safeRegistration = { success: true };
            return true;
        } else {
            console.log('❌ Cannot test - no window object');
            diagnosticResults.tests.safeRegistration = { success: false, error: 'no window object' };
            return false;
        }
    } catch (e) {
        console.log('❌ Safe registration failed:', e.message);
        diagnosticResults.tests.safeRegistration = { success: false, error: e.message };
        return false;
    }
}

// Test 5: Runtime environment detection
function detectRuntimeEnvironment() {
    console.log('\n🔍 Test 5: Runtime Environment Detection...');
    
    const env = {
        browser: typeof window !== 'undefined',
        node: typeof process !== 'undefined' && process.versions && process.versions.node,
        electron: typeof window !== 'undefined' && window.process && window.process.type,
        webWorker: typeof importScripts === 'function',
        module: typeof module !== 'undefined' && module.exports,
        commonjs: typeof require !== 'undefined' && typeof module !== 'undefined',
        es6: typeof Symbol !== 'undefined' && typeof Symbol.iterator !== 'undefined'
    };
    
    console.log('Environment flags:', env);
    diagnosticResults.tests.environment = env;
    
    // Determine most likely environment
    let envType;
    if (env.electron) {
        console.log('🔍 Detected: Electron environment');
        envType = 'electron';
    } else if (env.browser && !env.node) {
        console.log('🔍 Detected: Browser environment');
        envType = 'browser';
    } else if (env.node && !env.browser) {
        console.log('🔍 Detected: Node.js environment');
        envType = 'node';
    } else {
        console.log('🔍 Detected: Unknown/hybrid environment');
        envType = 'unknown';
    }
    
    diagnosticResults.tests.environmentType = envType;
    return envType;
}

// Save results to JSON file
function saveResultsToFile() {
    console.log('\n💾 Saving results to JSON file...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = 'bootstrap-diagnostic-' + timestamp + '.json';
    const filepath = 'C:\\Users\\tophe\\Documents\\Echo Rubicon\\logs\\' + filename;
    
    try {
        // In browser environment, we can't directly write files
        // Instead, we'll create a downloadable blob
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            const jsonString = JSON.stringify(diagnosticResults, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('✅ JSON file prepared for download: ' + filename);
            console.log('📁 Target path: ' + filepath);
        } else {
            // For Node.js environments, attempt to write file
            const fs = require('fs');
            const path = require('path');
            
            // Ensure directory exists
            const dir = path.dirname(filepath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(filepath, JSON.stringify(diagnosticResults, null, 2));
            console.log('✅ JSON file saved: ' + filepath);
        }
    } catch (e) {
        console.log('❌ Could not save JSON file:', e.message);
        console.log('📋 Results object available in diagnosticResults variable');
    }
}

// Terminal display formatting
function displayTerminalSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 BOOTSTRAP DIAGNOSTIC SUMMARY');
    console.log('='.repeat(60));
    
    const summary = diagnosticResults.summary;
    
    console.log('⏰ Timestamp:', diagnosticResults.timestamp);
    console.log('🔧 require() available:', summary.requireAvailable);
    console.log('🌐 Environment type:', summary.environmentType);
    console.log('🤖 MyAI registered:', summary.myAIRegistered);
    console.log('🤖 MyAIGlobal registered:', summary.myAIGlobalRegistered);
    console.log('✅ Any MyAI registered:', summary.anyMyAIRegistered);
    console.log('🛡️ Safe registration works:', summary.safeRegistrationWorks);
    
    console.log('\n⚖️ VERDICT:');
    console.log(diagnosticResults.verdict);
    
    console.log('\n' + '='.repeat(60));
}

// Main diagnostic function
function runBootstrapDiagnostic() {
    console.log('🚀 Bootstrap Error Diagnostic - Full Analysis\n');
    
    const requireAvailable = testRequireAvailability();
    const environmentType = detectRuntimeEnvironment();
    const myAIRegistration = checkMyAIRegistration();
    const safeRegistration = testSafeMyAIRegistration();
    
    // Test problematic requires (this will likely fail)
    testProblematicRequires();
    
    // Build summary
    diagnosticResults.summary = {
        requireAvailable: requireAvailable,
        environmentType: environmentType,
        myAIRegistered: myAIRegistration.myai,
        myAIGlobalRegistered: myAIRegistration.myaiGlobal,
        anyMyAIRegistered: myAIRegistration.anyRegistered,
        safeRegistrationWorks: safeRegistration
    };
    
    // Generate verdict
    if (!requireAvailable && !myAIRegistration.anyRegistered && safeRegistration) {
        diagnosticResults.verdict = 'CONFIRMED: Bootstrap error is due to require() incompatibility. require() is not available in this runtime, no MyAI variants are registered (blocked by require() crash), but safe registration works (proves JS execution is fine). SOLUTION: Replace require() calls with import statements or runtime-compatible alternatives.';
    } else if (requireAvailable && !myAIRegistration.anyRegistered) {
        diagnosticResults.verdict = 'PARTIAL: require() works but no MyAI variants registered. Issue may be in specific require() paths or module loading.';
    } else if (myAIRegistration.anyRegistered) {
        let registeredVariants = [];
        if (myAIRegistration.myai) registeredVariants.push('window.MyAI');
        if (myAIRegistration.myaiGlobal) registeredVariants.push('window.MyAIGlobal');
        diagnosticResults.verdict = 'REFUTED: At least one MyAI variant is registered (' + registeredVariants.join(', ') + ') - bootstrap may be working.';
    } else {
        diagnosticResults.verdict = 'INCONCLUSIVE: Mixed results - deeper investigation needed.';
    }
    
    // Display results
    displayTerminalSummary();
    
    // Save to file
    saveResultsToFile();
    
    return diagnosticResults;
}

// Execute the diagnostic
runBootstrapDiagnostic();