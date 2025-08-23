# Echo Rubicon Troubleshooting Script
Write-Host "=== ECHO RUBICON TROUBLESHOOTING ===" -ForegroundColor Cyan

# Step 1: Find all import statements for missing files
Write-Host "`n[1] Searching for missing imports..." -ForegroundColor Yellow
$missingFiles = @("ModelInterface", "CapsuleRetriever", "VaultInterface", "PennyEngine", "ContextInjector")

foreach ($file in $missingFiles) {
    Write-Host "`nSearching for: $file" -ForegroundColor Green
    Get-ChildItem -Path . -Include *.js,*.jsx -Recurse | 
        Select-String -Pattern "import.*$file|require.*$file" | 
        Format-Table -Property Filename, LineNumber, Line -AutoSize
}

# Step 2: Check if memory files exist
Write-Host "`n[2] Checking if memory files exist..." -ForegroundColor Yellow
$memoryPath = ".\src\memory\"
if (Test-Path $memoryPath) {
    Get-ChildItem -Path $memoryPath -Filter "*.js" | Format-Table Name, Length
} else {
    Write-Host "Memory folder not found at: $memoryPath" -ForegroundColor Red
}

# Step 3: Find potential render loop culprits
Write-Host "`n[3] Finding setState and useEffect patterns..." -ForegroundColor Yellow
Get-ChildItem -Path . -Include MyAI-global.js -Recurse | 
    Select-String -Pattern "setState|useEffect.*\(\s*\(\)" | 
    Format-Table -Property LineNumber, Line -AutoSize

# Step 4: Check for duplicate logging
Write-Host "`n[4] Finding vault write operations..." -ForegroundColor Yellow
Get-ChildItem -Path . -Include *.js -Recurse | 
    Select-String -Pattern "writeToVault|saveConversation|vault\.write" | 
    Format-Table -Property Filename, LineNumber -AutoSize

# Step 5: Generate next action report
Write-Host "`n[5] NEXT ACTIONS:" -ForegroundColor Cyan
Write-Host "1. Create missing files in .\src\memory\ if not found" -ForegroundColor White
Write-Host "2. Fix import paths based on search results above" -ForegroundColor White
Write-Host "3. Add console.log render counter to MyAI-global.js" -ForegroundColor White
Write-Host "4. Check useEffect dependencies (missing arrays)" -ForegroundColor White
Write-Host "5. Test Q-Lib with: window.electronAPI.invoke('qlib-extract', 'test')" -ForegroundColor White