# Echo Rubicon Refresh Diagnostic Script
# Run this in the project root directory

Write-Host "=== Echo Rubicon Refresh Diagnostic ===" -ForegroundColor Cyan
Write-Host "Starting diagnostic at: $(Get-Date)" -ForegroundColor Gray

# Check if we're in the right directory
if (-not (Test-Path ".\package.json")) {
    Write-Host "ERROR: Not in Echo Rubicon project root!" -ForegroundColor Red
    exit
}

# 1. Check localStorage state
Write-Host "`n[1] Checking Browser LocalStorage Keys..." -ForegroundColor Yellow
$localStorageScript = @"
const keys = Object.keys(localStorage);
console.log('LOCALSTORAGE_KEYS:' + JSON.stringify(keys));
console.log('AUTH_STATE:' + localStorage.getItem('echo_auth_session'));
console.log('ONBOARDING:' + localStorage.getItem('echo_onboarding_complete'));
console.log('APP_STATE:' + localStorage.getItem('echo-app-state'));
"@

# 2. Search for preventDefault patterns
Write-Host "`n[2] Searching for Refresh Prevention Patterns..." -ForegroundColor Yellow
$preventPatterns = @(
    "preventDefault.*F5",
    "preventDefault.*refresh", 
    "beforeunload",
    "onbeforeunload",
    "e\.key.*F5",
    "keydown.*F5",
    "keyCode.*116",
    "return false.*reload"
)

foreach ($pattern in $preventPatterns) {
    Write-Host "  Checking: $pattern" -ForegroundColor Gray
    $results = Select-String -Path ".\components\*.js", ".\src\**\*.js", ".\*.js" -Pattern $pattern -CaseSensitive:$false
    if ($results) {
        Write-Host "  FOUND in:" -ForegroundColor Red
        foreach ($result in $results) {
            Write-Host "    $($result.Filename):$($result.LineNumber) - $($result.Line.Trim())" -ForegroundColor Yellow
        }
    }
}

# 3. Check for infinite loops in useEffect
Write-Host "`n[3] Checking useEffect Dependencies..." -ForegroundColor Yellow
$useEffectPattern = "useEffect\s*\(\s*function.*?\}.*?\[(.*?)\]"
$files = Get-ChildItem -Path . -Include "*.js","*.jsx" -Recurse -ErrorAction SilentlyContinue

foreach ($file in $files) {
    if ($file.FullName -match "node_modules") { continue }
    
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match $useEffectPattern) {
        $matches = [regex]::Matches($content, $useEffectPattern)
        foreach ($match in $matches) {
            $deps = $match.Groups[1].Value
            if ($deps -match "loadVault|vault" -and $deps -ne "") {
                $lineNum = ($content.Substring(0, $match.Index) -split "`n").Count
                Write-Host "  Potential Issue in $($file.Name):$lineNum" -ForegroundColor Red
                Write-Host "    Dependencies: [$deps]" -ForegroundColor Yellow
            }
        }
    }
}

# 4. Check recent Git changes
Write-Host "`n[4] Recent Git Changes (last 10 commits)..." -ForegroundColor Yellow
if (Test-Path ".git") {
    git log --oneline -10 --name-only | ForEach-Object {
        if ($_ -match "\.js$|\.jsx$|\.html$") {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }
}

# 5. Check for console errors in the app
Write-Host "`n[5] Creating Debug HTML to Check Runtime Errors..." -ForegroundColor Yellow
$debugHtml = @"
<!DOCTYPE html>
<html>
<head>
    <title>Echo Debug</title>
</head>
<body>
    <h1>Echo Rubicon Debug Console</h1>
    <pre id="output"></pre>
    <script>
        const output = document.getElementById('output');
        
        // Override console methods
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        console.log = function(...args) {
            originalLog.apply(console, args);
            output.textContent += '[LOG] ' + args.join(' ') + '\n';
        };
        
        console.error = function(...args) {
            originalError.apply(console, args);
            output.textContent += '[ERROR] ' + args.join(' ') + '\n';
        };
        
        console.warn = function(...args) {
            originalWarn.apply(console, args);
            output.textContent += '[WARN] ' + args.join(' ') + '\n';
        };
        
        // Check localStorage
        output.textContent += '=== LOCALSTORAGE ===\n';
        Object.keys(localStorage).forEach(key => {
            output.textContent += key + ': ' + localStorage.getItem(key).substring(0, 50) + '...\n';
        });
        
        // Listen for errors
        window.addEventListener('error', (e) => {
            output.textContent += '[WINDOW ERROR] ' + e.message + ' at ' + e.filename + ':' + e.lineno + '\n';
        });
    </script>
</body>
</html>
"@
$debugHtml | Out-File "debug-console.html" -Encoding UTF8

# 6. Check main process logs
Write-Host "`n[6] Checking Electron Main Process..." -ForegroundColor Yellow
$mainJs = Get-Content ".\main.js" -ErrorAction SilentlyContinue
if ($mainJs) {
    # Check for reload prevention in main process
    if ($mainJs -match "preventDefault|beforeunload|will-prevent-unload") {
        Write-Host "  WARNING: Found reload prevention in main.js" -ForegroundColor Red
    }
    
    # Check menu configuration - FIXED LINE
    if ($mainJs -match "role:\s*['`"]reload['`"]") {
        Write-Host "  ✓ Reload menu item found" -ForegroundColor Green
    } else {
        Write-Host "  ✗ No reload menu item found" -ForegroundColor Red
    }
}

# 7. Generate diagnostic report
Write-Host "`n[7] Generating Diagnostic Report..." -ForegroundColor Yellow
$report = @"
ECHO RUBICON REFRESH DIAGNOSTIC REPORT
Generated: $(Get-Date)

POTENTIAL ISSUES FOUND:
"@

# Check specific lines from the audit
Write-Host "`n[8] Checking Specific Problem Lines..." -ForegroundColor Yellow
$problemLines = @{
    "MyAI-global.js" = @(213, 2726)
}

foreach ($file in $problemLines.Keys) {
    if (Test-Path ".\components\$file") {
        $content = Get-Content ".\components\$file"
        foreach ($lineNum in $problemLines[$file]) {
            if ($lineNum -le $content.Count) {
                Write-Host "  Line $lineNum in ${file}:" -ForegroundColor Yellow
                Write-Host "    $($content[$lineNum-1])" -ForegroundColor Gray
                $report += "`n- Line $lineNum in ${file}: $($content[$lineNum-1])"
            }
        }
    }
}

# 8. Test Electron IPC
Write-Host "`n[9] Creating IPC Test..." -ForegroundColor Yellow
$ipcTest = @"
// Add this to your renderer console to test IPC
if (window.electronAPI) {
    console.log('ElectronAPI available:', Object.keys(window.electronAPI));
    
    // Test if reload is being intercepted
    window.addEventListener('beforeunload', (e) => {
        console.log('beforeunload event fired');
        debugger; // This will pause if DevTools is open
    });
    
    // Try programmatic reload
    setTimeout(() => {
        console.log('Attempting reload...');
        window.location.reload();
    }, 5000);
} else {
    console.log('ElectronAPI not found - running in browser mode?');
}
"@
$ipcTest | Out-File "ipc-test.js" -Encoding UTF8

# Save report
$report | Out-File "refresh-diagnostic-report.txt" -Encoding UTF8

Write-Host "`n=== DIAGNOSTIC COMPLETE ===" -ForegroundColor Green
Write-Host "Files created:" -ForegroundColor Cyan
Write-Host "  - debug-console.html (open in browser to see runtime errors)" -ForegroundColor Gray
Write-Host "  - ipc-test.js (paste into DevTools console)" -ForegroundColor Gray
Write-Host "  - refresh-diagnostic-report.txt (summary of findings)" -ForegroundColor Gray

Write-Host "`n[QUICK FIX ATTEMPT]" -ForegroundColor Magenta
Write-Host "Try this in DevTools console:" -ForegroundColor Yellow
Write-Host @"
// Clear potentially corrupted state
localStorage.removeItem('echo_auth_session');
localStorage.removeItem('echo_auth_timestamp');
localStorage.setItem('echo_onboarding_complete', 'true');
window.location.reload();
"@ -ForegroundColor Cyan

# Final check - look for the actual function causing issues
Write-Host "`n[10] Searching for loadVault usage..." -ForegroundColor Yellow
Select-String -Path ".\components\MyAI-global.js" -Pattern "loadVault" -Context 2,2 | ForEach-Object {
    Write-Host "Line $($_.LineNumber): $($_.Line)" -ForegroundColor Yellow
}

# Additional check for auth flow
Write-Host "`n[11] Checking Authentication Flow..." -ForegroundColor Yellow
Select-String -Path ".\components\MyAI-global.js" -Pattern "checkAuthenticationStatus|handleAuthSuccess|echo_auth_session" | ForEach-Object {
    Write-Host "  Line $($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Gray
}