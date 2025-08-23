# Capsule Wipe and Test Script
$vaultPath = "D:\Obsidian Vault"
$capsulePath = Join-Path $vaultPath ".echo\capsules"
$projectCapsulePath = Join-Path $vaultPath ".echo\projects"

Write-Host "=== CAPSULE WIPE AND TEST SCRIPT ===" -ForegroundColor Yellow

# Count existing capsules
Write-Host "`n1. Counting existing capsules..." -ForegroundColor Cyan
$capsuleCount = (Get-ChildItem -Path $capsulePath -Filter "*.json" -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
$projectCapsuleCount = (Get-ChildItem -Path $projectCapsulePath -Filter "*.json" -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host "Found $capsuleCount general capsules"
Write-Host "Found $projectCapsuleCount project capsules"

# Delete all capsules
Write-Host "`n2. Deleting all capsules..." -ForegroundColor Red
if (Test-Path $capsulePath) {
    Remove-Item -Path "$capsulePath\*" -Recurse -Force
    Write-Host "Deleted general capsules"
}

# Run initialization
Write-Host "`n3. Running vault initialization..." -ForegroundColor Cyan
node tools\initializeVault.js

# Check results
Start-Sleep -Seconds 2
$newCount = (Get-ChildItem -Path $capsulePath -Filter "*.json" -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
if ($newCount -eq 0) {
    Write-Host "`n✅ SUCCESS: No capsules created!" -ForegroundColor Green
} else {
    Write-Host "`n❌ FAIL: Found $newCount capsules!" -ForegroundColor Red
}
