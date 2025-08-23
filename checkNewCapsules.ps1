# checkNewCapsules.ps1

$newCapsulePath = "D:\Obsidian Vault\.echo\capsules\2025-08\06"
$oldCapsulePath = "D:\Obsidian Vault\.echo\capsules"

Write-Host "`n🔍 CHECKING NEW vs OLD CAPSULE FORMATS" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# Get one new capsule (that's failing)
$newCapsule = Get-ChildItem -Path $newCapsulePath -Filter "capsule_*.json" | Select-Object -First 1

if ($newCapsule) {
    Write-Host "`n📄 NEW CAPSULE FORMAT (failing):" -ForegroundColor Yellow
    Write-Host "File: $($newCapsule.Name)" -ForegroundColor White
    
    $content = Get-Content $newCapsule.FullName -Raw
    Write-Host "`nRaw content preview:" -ForegroundColor Gray
    Write-Host $content.Substring(0, [Math]::Min(500, $content.Length)) -ForegroundColor DarkGray
    
    try {
        $json = $content | ConvertFrom-Json
        Write-Host "`nParsed structure:" -ForegroundColor Green
        $json | Format-List
    } catch {
        Write-Host "❌ Failed to parse as JSON: $_" -ForegroundColor Red
    }
}

# Get one old capsule (that works)
$oldCapsule = Get-ChildItem -Path $oldCapsulePath -Filter "recipe-*.json" -Recurse | Select-Object -First 1

if ($oldCapsule) {
    Write-Host "`n📄 OLD CAPSULE FORMAT (working):" -ForegroundColor Yellow
    Write-Host "File: $($oldCapsule.Name)" -ForegroundColor White
    
    $content = Get-Content $oldCapsule.FullName -Raw
    Write-Host "`nRaw content preview:" -ForegroundColor Gray
    Write-Host $content.Substring(0, [Math]::Min(500, $content.Length)) -ForegroundColor DarkGray
    
    try {
        $json = $content | ConvertFrom-Json
        Write-Host "`nParsed structure:" -ForegroundColor Green
        $json | Format-List
    } catch {
        Write-Host "❌ Failed to parse as JSON: $_" -ForegroundColor Red
    }
}

Write-Host "`n🔍 CHECKING ALL NEW CAPSULES:" -ForegroundColor Cyan
$allNew = Get-ChildItem -Path $newCapsulePath -Filter "capsule_*.json"
Write-Host "Found $($allNew.Count) new capsules" -ForegroundColor White

foreach ($file in $allNew | Select-Object -First 3) {
    Write-Host "`n📄 $($file.Name):" -ForegroundColor Yellow
    try {
        $json = Get-Content $file.FullName -Raw | ConvertFrom-Json
        Write-Host "  ✅ Valid JSON" -ForegroundColor Green
        Write-Host "  Fields: $($json.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
    } catch {
        Write-Host "  ❌ Invalid JSON" -ForegroundColor Red
        # Show first 200 chars to see what's wrong
        $raw = Get-Content $file.FullName -Raw
        Write-Host "  First 200 chars: $($raw.Substring(0, [Math]::Min(200, $raw.Length)))" -ForegroundColor DarkGray
    }
}