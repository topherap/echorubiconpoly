param(
    [string]$ProjectRoot = "C:\Users\tophe\Documents\Echo Rubicon",
    [string]$ExileDir = "C:\Users\tophe\Documents\Echo Rubicon\rubicon-exile",
    [switch]$WhatIf = $false
)

# Load the unused files list
$unusedFiles = Get-Content "unused-files-list.json" | ConvertFrom-Json

# Files to NEVER move (safety list)
$neverMove = @(
    "*package*.json",
    "main.js",
    "preload.js",
    "index.html",
    "*webpack*",
    "*babel*",
    ".gitignore"
)

# Create exile directory if needed
if (-not $WhatIf -and -not (Test-Path $ExileDir)) {
    New-Item -ItemType Directory -Path $ExileDir -Force | Out-Null
}

$movedFiles = @()
$skippedFiles = @()

# Function to safely move a file
function Move-FileToExile {
    param($RelativePath)
    
    $sourcePath = Join-Path $ProjectRoot $RelativePath
    
    # Safety check - skip if doesn't exist
    if (-not (Test-Path $sourcePath)) {
        Write-Host "  SKIP: File not found - $RelativePath" -ForegroundColor Yellow
        return $false
    }
    
    # Check against never-move patterns
    foreach ($pattern in $neverMove) {
        if ($RelativePath -like $pattern) {
            Write-Host "  SKIP: Protected file - $RelativePath" -ForegroundColor Yellow
            $script:skippedFiles += $RelativePath
            return $false
        }
    }
    
    $targetPath = Join-Path $ExileDir $RelativePath
    $targetDir = Split-Path $targetPath -Parent
    
    if ($WhatIf) {
        Write-Host "  Would move: $RelativePath" -ForegroundColor Cyan
        return $true
    } else {
        # Create directory structure
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        
        # Move the file
        Move-Item -Path $sourcePath -Destination $targetPath -Force
        Write-Host "  MOVED: $RelativePath" -ForegroundColor Green
        
        $script:movedFiles += @{
            original = $sourcePath
            exile = $targetPath
            relativePath = $RelativePath
            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        return $true
    }
}

# Process categories in order of safety
$categories = @(
    @{Name="Diagnostics"; Files=$unusedFiles.diagnostics; Color="Cyan"},
    @{Name="Tests"; Files=$unusedFiles.tests; Color="Yellow"},
    @{Name="Root Scripts"; Files=$unusedFiles.rootScripts; Color="Magenta"},
    @{Name="Tools"; Files=$unusedFiles.tools; Color="Blue"},
    @{Name="Other"; Files=$unusedFiles.other; Color="Gray"}
)

foreach ($category in $categories) {
    Write-Host "`nProcessing $($category.Name) ($($category.Files.Count) files)..." -ForegroundColor $category.Color
    
    foreach ($file in $category.Files) {
        Move-FileToExile -RelativePath $file | Out-Null
    }
}

# Save manifest
if (-not $WhatIf -and $movedFiles.Count -gt 0) {
    $manifest = @{
        moveDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        projectRoot = $ProjectRoot
        exileDir = $ExileDir
        movedCount = $movedFiles.Count
        skippedCount = $skippedFiles.Count
        movedFiles = $movedFiles
        skippedFiles = $skippedFiles
    }
    
    $manifestPath = Join-Path $ExileDir "exile-manifest-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $manifest | ConvertTo-Json -Depth 10 | Out-File -FilePath $manifestPath -Encoding UTF8
    
    Write-Host "`n========== Summary ==========" -ForegroundColor Green
    Write-Host "Moved: $($movedFiles.Count) files" -ForegroundColor Green
    Write-Host "Skipped: $($skippedFiles.Count) files" -ForegroundColor Yellow
    Write-Host "Manifest saved to: $manifestPath" -ForegroundColor Cyan
} elseif ($WhatIf) {
    Write-Host "`n========== Dry Run Summary ==========" -ForegroundColor Yellow
    Write-Host "Would move: $($categories.Files.Count | Measure-Object -Sum).Sum files"
    Write-Host "Run without -WhatIf to actually move files"
}
