# EmergencyFix.ps1 - Remove all large files from Git and fix repository
Write-Host "=== EMERGENCY FIX FOR LARGE REPOSITORY ===" -ForegroundColor Red
Write-Host "This will remove all unnecessary files from Git tracking" -ForegroundColor Yellow
Write-Host ""

Set-Location "C:\Users\tophe\Documents\EchoRubicon"

# Step 1: Remove all the problematic files from Git (but keep them locally)
Write-Host "Step 1: Removing large files from Git tracking..." -ForegroundColor Cyan

$filesToRemove = @(
    "BACKUP_COMPARE.zip",
    "BACKUP_COMPARE",
    "venv",
    "node_modules", 
    "echo-backend-rust/target",
    "dist",
    "WindsurfUserSetup-x64-1.10.7.exe",
    "meilisearch.exe",
    "echo-backend-rust/meilisearch"
)

foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        Write-Host "  Removing from Git: $file" -ForegroundColor Yellow
        git rm -r --cached $file 2>$null
    }
}

# Step 2: Create/Update .gitignore
Write-Host "`nStep 2: Creating comprehensive .gitignore..." -ForegroundColor Cyan

$gitignoreContent = @"
# === CRITICAL: BACKUP AND LARGE FILES ===
BACKUP_COMPARE.zip
BACKUP_COMPARE/
*BACKUP*/
*backup*/
*compare*/

# === PYTHON VIRTUAL ENVIRONMENT ===
venv/
env/
*.pyc
__pycache__/

# === NODE MODULES ===
node_modules/

# === RUST BUILD ===
target/
Cargo.lock

# === BUILD OUTPUTS ===
dist/
out/
build/
*.exe
*.dll
meilisearch
meilisearch.exe

# === INSTALLERS ===
*Setup*.exe
*.msi

# === LARGE FILES ===
*.zip
*.rar
*.7z

# === TEMPORARY ===
*.tmp
*.temp
*.log
"@

$gitignoreContent | Out-File -FilePath ".gitignore" -Encoding UTF8
Write-Host "  .gitignore created successfully" -ForegroundColor Green

# Step 3: Commit the cleanup
Write-Host "`nStep 3: Committing cleanup..." -ForegroundColor Cyan
git add .gitignore
git commit -m "Remove large files and add comprehensive .gitignore"

# Step 4: Check the new size
Write-Host "`nStep 4: Checking new repository size..." -ForegroundColor Cyan
$gitSize = git count-objects -vH | Select-String "size-pack" 
Write-Host "  New Git size: $gitSize" -ForegroundColor Green

Write-Host "`n=== FIX COMPLETE ===" -ForegroundColor Green
Write-Host "Now you can push to GitHub successfully:" -ForegroundColor Yellow
Write-Host "  git push origin main --force" -ForegroundColor White
Write-Host ""
Write-Host "Note: Your files are still on disk, just not tracked by Git" -ForegroundColor Cyan