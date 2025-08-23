# === CONFIG ===
$projectPath = "C:\Users\tophe\Documents\EchoRubicon"
$repoURL     = "https://github.com/topherap/echorubiconpoly.git"
$backupRoot  = "D:\Backups"

# === PREP ===
Set-Location $projectPath
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupName = "EchoRubiconBackup_$timestamp.zip"
$backupPath = Join-Path $backupRoot $backupName

# === ENSURE BACKUP DIRECTORY EXISTS ===
if (!(Test-Path $backupRoot)) {
    New-Item -ItemType Directory -Force -Path $backupRoot
    Write-Host "Created backup directory: $backupRoot" -ForegroundColor Green
}

# === CHECK GIT STATUS ===
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "Changes detected, staging files..." -ForegroundColor Yellow
} else {
    Write-Host "No changes detected" -ForegroundColor Cyan
}

# === STAGE, COMMIT, PUSH ===
git add .
git commit -m "Auto-deploy: Rubicon checkpoint [$timestamp]" --allow-empty
git push origin main

# === TAG SNAPSHOT ===
$tagName = "backup-$timestamp"
git tag $tagName
git push origin $tagName

# === ZIP IT (EXCLUDE .git) ===
if (Test-Path "C:\Program Files\7-Zip\7z.exe") {
    & "C:\Program Files\7-Zip\7z.exe" a -tzip $backupPath "$projectPath\*" -xr!".git"
    Write-Host "Backup archive created successfully" -ForegroundColor Green
} else {
    Write-Host "7-Zip not found, trying PowerShell compression..." -ForegroundColor Yellow
    Compress-Archive -Path "$projectPath\*" -DestinationPath $backupPath -Force
}

# === DONE ===
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy complete." -ForegroundColor Green
Write-Host "Backup saved to: $backupPath" -ForegroundColor White
Write-Host "Git tag created: $tagName" -ForegroundColor White
Write-Host "Repository: $repoURL" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan