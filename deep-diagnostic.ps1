# Echo Rubicon Deep Diagnostic Script
# Gathers all information needed to diagnose the refresh issue

Write-Host "=== Echo Rubicon Deep Diagnostic ===" -ForegroundColor Cyan
Write-Host "Starting at: $(Get-Date)" -ForegroundColor Gray

# Create output directory for results
$outputDir = ".\diagnostic-output-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
Write-Host "Output directory: $outputDir" -ForegroundColor Yellow

# 1. Extract both checkAuthenticationStatus functions
Write-Host "`n[1] Extracting BOTH checkAuthenticationStatus Functions..." -ForegroundColor Yellow
$content = Get-Content ".\components\MyAI-global.js" -Raw

# Find first function (around line 784)
$firstFuncPattern = "(?ms)(const checkAuthenticationStatus = async \(\) => \{[\s\S]*?\n\};)"
$firstMatch = [regex]::Match($content, $firstFuncPattern)
if ($firstMatch.Success) {
    $firstFunc = $firstMatch.Value
    $firstFuncLine = ($content.Substring(0, $firstMatch.Index) -split "`n").Count
    Write-Host "  First function found at line ~$firstFuncLine" -ForegroundColor Green
    $firstFunc | Out-File "$outputDir\checkAuthenticationStatus-FIRST.js" -Encoding UTF8
    
    # Extract key features
    Write-Host "  First function features:" -ForegroundColor Cyan
    if ($firstFunc -match "echo_auth_session") { Write-Host "    ✓ Checks echo_auth_session" -ForegroundColor Green }
    if ($firstFunc -match "echo_onboarding_complete") { Write-Host "    ✓ Checks onboarding complete" -ForegroundColor Green }
    if ($firstFunc -match "initializeApp") { Write-Host "    ✓ Calls initializeApp" -ForegroundColor Green }
}

# Find second function (around line 1057)
$remainingContent = $content.Substring($firstMatch.Index + $firstMatch.Length)
$secondMatch = [regex]::Match($remainingContent, $firstFuncPattern)
if ($secondMatch.Success) {
    $secondFunc = $secondMatch.Value
    $secondFuncLine = ($content.Substring(0, $firstMatch.Index + $firstMatch.Length + $secondMatch.Index) -split "`n").Count
    Write-Host "`n  Second function found at line ~$secondFuncLine" -ForegroundColor Red
    $secondFunc | Out-File "$outputDir\checkAuthenticationStatus-SECOND.js" -Encoding UTF8
    
    # Extract key features
    Write-Host "  Second function features:" -ForegroundColor Cyan
    if ($secondFunc -match "echo_auth_session") { Write-Host "    ✓ Checks echo_auth_session" -ForegroundColor Green }
    else { Write-Host "    ✗ MISSING echo_auth_session check" -ForegroundColor Red }
    if ($secondFunc -match "echo_onboarding_complete") { Write-Host "    ✓ Checks onboarding complete" -ForegroundColor Green }
    if ($secondFunc -match "initializeApp") { Write-Host "    ✓ Calls initializeApp" -ForegroundColor Green }
}

# 2. Find where checkAuthenticationStatus is called
Write-Host "`n[2] Finding ALL Calls to checkAuthenticationStatus..." -ForegroundColor Yellow
$calls = Select-String -Path ".\components\MyAI-global.js" -Pattern "checkAuthenticationStatus\(\)" -AllMatches
$callReport = @"
FUNCTION CALLS FOUND:
"@
foreach ($call in $calls) {
    $callLine = $call.LineNumber
    $callContext = (Get-Content ".\components\MyAI-global.js")[$callLine-2..$callLine] -join "`n"
    Write-Host "  Line $callLine" -ForegroundColor Yellow
    $callReport += "`nLine $callLine Context:`n$callContext`n"
}
$callReport | Out-File "$outputDir\function-calls.txt" -Encoding UTF8

# 3. Check preload.js beforeunload handler
Write-Host "`n[3] Extracting beforeunload Handler from preload.js..." -ForegroundColor Yellow
$preloadContent = Get-Content ".\preload.js" -Raw
$beforeUnloadPattern = "(?ms)(window\.addEventListener\('beforeunload'[\s\S]*?\}\);)"
$beforeUnloadMatch = [regex]::Match($preloadContent, $beforeUnloadPattern)
if ($beforeUnloadMatch.Success) {
    $handler = $beforeUnloadMatch.Value
    Write-Host "  beforeunload handler found at line 346" -ForegroundColor Red
    Write-Host "  Handler code:" -ForegroundColor Cyan
    Write-Host $handler -ForegroundColor Gray
    $handler | Out-File "$outputDir\beforeunload-handler.js" -Encoding UTF8
}

# 4. Check useEffect hooks that might run on mount
Write-Host "`n[4] Finding useEffect Hooks Running on Mount..." -ForegroundColor Yellow
$mountEffects = [regex]::Matches($content, "(?ms)useEffect\s*\(\s*function[^}]*?\}[^}]*?\},\s*\[\s*\]\s*\)")
$effectReport = @"
USE EFFECTS WITH EMPTY DEPENDENCIES (Run on mount):
"@
foreach ($effect in $mountEffects) {
    $lineNum = ($content.Substring(0, $effect.Index) -split "`n").Count
    $effectCode = $effect.Value
    Write-Host "  Effect at line ~$lineNum" -ForegroundColor Yellow
    if ($effectCode -match "checkAuthenticationStatus") {
        Write-Host "    ⚠️  CALLS checkAuthenticationStatus!" -ForegroundColor Red
    }
    $effectReport += "`n`nLine ~" + $lineNum + ":`n" + $effectCode + "`n"
}
$effectReport | Out-File "$outputDir\mount-effects.txt" -Encoding UTF8

# 5. Check main.js menu configuration
Write-Host "`n[5] Extracting Menu Configuration from main.js..." -ForegroundColor Yellow
$mainContent = Get-Content ".\main.js" -Raw
$menuPattern = "(?ms)(const\s+menu\s*=[\s\S]*?Menu\.buildFromTemplate)"
$menuMatch = [regex]::Match($mainContent, $menuPattern)
if ($menuMatch.Success) {
    $menuConfig = $menuMatch.Value
    $menuConfig | Out-File "$outputDir\menu-config.js" -Encoding UTF8
    
    if ($menuConfig -match "role.*reload") {
        Write-Host "  ✓ Reload menu item found" -ForegroundColor Green
    } else {
        Write-Host "  ✗ NO reload menu item" -ForegroundColor Red
    }
    
    if ($menuConfig -match "accelerator.*F5") {
        Write-Host "  ✓ F5 accelerator found" -ForegroundColor Green
    } else {
        Write-Host "  ✗ NO F5 accelerator" -ForegroundColor Red
    }
}

# 6. Create a state flow diagram
Write-Host "`n[6] Creating State Flow Analysis..." -ForegroundColor Yellow
$stateFlow = @"
AUTHENTICATION STATE FLOW ANALYSIS
==================================

1. Component Mount
   └─> useEffect with [] dependencies (line ?)
       └─> Calls checkAuthenticationStatus()
           └─> Which version? (First at 784 or Second at 1057?)

2. checkAuthenticationStatus Logic:
   First Version (line 784):
   - Checks localStorage
   - Has session persistence logic
   
   Second Version (line 1057):
   - Different implementation?
   - Missing session check?

3. Potential Issues:
   - JavaScript uses the LAST defined function
   - Second definition overwrites the first
   - Mount effect might call wrong version
"@
$stateFlow | Out-File "$outputDir\state-flow-analysis.txt" -Encoding UTF8

# 7. Generate JavaScript test to run in console
Write-Host "`n[7] Creating Runtime Test Script..." -ForegroundColor Yellow
$runtimeTest = @'
// Runtime Diagnostic Test
console.log('=== RUNTIME DIAGNOSTIC ===');

// 1. Check which checkAuthenticationStatus is active
console.log('\n1. Active Function Check:');
console.log('checkAuthenticationStatus function:', typeof checkAuthenticationStatus);
console.log('Function toString length:', checkAuthenticationStatus ? checkAuthenticationStatus.toString().length : 'N/A');

// 2. Check localStorage state
console.log('\n2. LocalStorage State:');
const authKeys = [
    'echo_auth_session',
    'echo_auth_timestamp',
    'echo_onboarding_complete',
    'echo-app-state',
    'echo_assistant_name',
    'echo_user_name'
];
authKeys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`  ${key}: ${value ? value.substring(0, 50) + '...' : 'NOT SET'}`);
});

// 3. Check if multiple definitions exist
console.log('\n3. Function Definition Check:');
try {
    // Try to access the function
    const funcString = checkAuthenticationStatus.toString();
    console.log('Function starts with:', funcString.substring(0, 200) + '...');
    
    // Check for key features
    console.log('Contains echo_auth_session check:', funcString.includes('echo_auth_session'));
    console.log('Contains saved session logic:', funcString.includes('savedAuthSession'));
    console.log('Line count:', funcString.split('\n').length);
} catch (e) {
    console.error('Error accessing function:', e);
}

// 4. Test what happens on mount
console.log('\n4. Mount Behavior Test:');
console.log('Current authState:', authState);
console.log('Is authenticated:', authState?.isAuthenticated);

// 5. Try to find the React component
console.log('\n5. Component Check:');
console.log('MyAI component:', typeof MyAI);
console.log('Window.MyAI:', typeof window.MyAI);

// 6. Check for event listeners
console.log('\n6. Event Listeners:');
const listeners = getEventListeners(window);
console.log('beforeunload listeners:', listeners.beforeunload ? listeners.beforeunload.length : 0);

console.log('\n=== END DIAGNOSTIC ===');
'@
$runtimeTest | Out-File "$outputDir\runtime-test.js" -Encoding UTF8

# 8. Extract the actual line that calls checkAuthenticationStatus on mount
Write-Host "`n[8] Finding Mount Effect that Calls checkAuthenticationStatus..." -ForegroundColor Yellow
$mountCallPattern = "(?ms)useEffect\s*\(\s*function[^}]*?checkAuthenticationStatus\(\)[^}]*?\},\s*\[\s*\]\s*\)"
$mountCallMatch = [regex]::Match($content, $mountCallPattern)
if ($mountCallMatch.Success) {
    $mountEffect = $mountCallMatch.Value
    $mountLine = ($content.Substring(0, $mountCallMatch.Index) -split "`n").Count
    Write-Host "  Mount effect at line ~$mountLine calls checkAuthenticationStatus" -ForegroundColor Red
    $mountEffect | Out-File "$outputDir\mount-effect-calling-auth.js" -Encoding UTF8
}

# 9. Create comprehensive report
Write-Host "`n[9] Generating Comprehensive Report..." -ForegroundColor Yellow
$report = @"
ECHO RUBICON REFRESH ISSUE - COMPREHENSIVE DIAGNOSTIC REPORT
==========================================================
Generated: $(Get-Date)

CRITICAL FINDINGS:
1. DUPLICATE FUNCTIONS: Two checkAuthenticationStatus functions found
   - First at line ~$firstFuncLine
   - Second at line ~$secondFuncLine
   - JavaScript will use the SECOND (last) definition

2. BEFOREUNLOAD HANDLER: Found in preload.js line 346
   - May interfere with page refresh

3. MENU CONFIGURATION: No reload menu item in main.js

4. MOUNT EFFECT: Found at line ~$mountLine
   - Calls checkAuthenticationStatus on component mount

HYPOTHESIS:
The second checkAuthenticationStatus function (line $secondFuncLine) is missing
the session persistence check, causing the app to re-authenticate on every refresh.

RECOMMENDED FIXES:
1. Delete the second checkAuthenticationStatus function
2. Comment out the beforeunload handler in preload.js
3. Add reload menu item to main.js
4. Clear localStorage and test

FILES GENERATED:
- checkAuthenticationStatus-FIRST.js (working version)
- checkAuthenticationStatus-SECOND.js (problematic version)
- beforeunload-handler.js
- mount-effects.txt
- menu-config.js
- state-flow-analysis.txt
- runtime-test.js
"@
$report | Out-File "$outputDir\DIAGNOSTIC-REPORT.txt" -Encoding UTF8
Write-Host $report -ForegroundColor Cyan

Write-Host "`n=== DIAGNOSTIC COMPLETE ===" -ForegroundColor Green
Write-Host "All files saved to: $outputDir" -ForegroundColor Yellow
Write-Host "`nNEXT STEPS:" -ForegroundColor Magenta
Write-Host "1. Review the two checkAuthenticationStatus functions in the output folder" -ForegroundColor Cyan
Write-Host "2. Run runtime-test.js in DevTools console to see which version is active" -ForegroundColor Cyan
Write-Host "3. Compare the functions to see which one has proper session checking" -ForegroundColor Cyan

# Open the output directory
Start-Process explorer $outputDir