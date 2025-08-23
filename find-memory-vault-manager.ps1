# Find all MemoryVaultManager instantiations in Echo Rubicon codebase

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Finding MemoryVaultManager instantiations" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get current directory (should be Echo Rubicon root)
$rootPath = Get-Location

Write-Host "Searching in: $rootPath" -ForegroundColor Yellow
Write-Host ""

# Search patterns to find
$patterns = @(
    "new MemoryVaultManager",
    "MemoryVaultManager(",
    "MemoryVaultManager\s*\(",
    "= MemoryVaultManager",
    "createMemoryVaultManager",
    "MemoryVaultManager\.prototype",
    "extends MemoryVaultManager"
)

# File extensions to search
$extensions = @("*.js", "*.mjs", "*.ts", "*.jsx")

Write-Host "SEARCH RESULTS:" -ForegroundColor Green
Write-Host "---------------" -ForegroundColor Green

foreach ($pattern in $patterns) {
    Write-Host "`nPattern: '$pattern'" -ForegroundColor Magenta
    
    foreach ($ext in $extensions) {
        $files = Get-ChildItem -Path $rootPath -Filter $ext -Recurse -ErrorAction SilentlyContinue | 
                 Where-Object { $_.FullName -notmatch "node_modules|\.git|dist|build" }
        
        foreach ($file in $files) {
            $matches = Select-String -Path $file.FullName -Pattern $pattern -CaseSensitive
            
            if ($matches) {
                foreach ($match in $matches) {
                    $relativePath = $file.FullName.Replace($rootPath, "").TrimStart("\")
                    Write-Host "  📄 $relativePath" -ForegroundColor Yellow
                    Write-Host "     Line $($match.LineNumber): " -NoNewline -ForegroundColor Gray
                    Write-Host "$($match.Line.Trim())" -ForegroundColor White
                }
            }
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DETAILED CONTEXT SEARCH" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Now search for instantiations with context (5 lines before and after)
Write-Host "`nShowing context around instantiations:" -ForegroundColor Green

$mainPattern = "new MemoryVaultManager"
$files = Get-ChildItem -Path $rootPath -Filter "*.js" -Recurse -ErrorAction SilentlyContinue | 
         Where-Object { $_.FullName -notmatch "node_modules|\.git|dist|build" }

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -ErrorAction SilentlyContinue
    
    for ($i = 0; $i -lt $content.Count; $i++) {
        if ($content[$i] -match $mainPattern) {
            $relativePath = $file.FullName.Replace($rootPath, "").TrimStart("\")
            
            Write-Host "`n📍 Found in: $relativePath (line $($i+1))" -ForegroundColor Yellow
            Write-Host "   Context:" -ForegroundColor Gray
            
            # Show 3 lines before
            $startLine = [Math]::Max(0, $i - 3)
            $endLine = [Math]::Min($content.Count - 1, $i + 3)
            
            for ($j = $startLine; $j -le $endLine; $j++) {
                if ($j -eq $i) {
                    Write-Host "→  " -NoNewline -ForegroundColor Red
                    Write-Host "$($j+1): $($content[$j])" -ForegroundColor Yellow
                } else {
                    Write-Host "   $($j+1): $($content[$j])" -ForegroundColor DarkGray
                }
            }
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "CHECKING FOR MISSING VAULT PATH" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Look specifically for instantiations without parameters
$noParamPattern = "new MemoryVaultManager\(\s*\)"
Write-Host "`nSearching for instantiations with NO parameters:" -ForegroundColor Red

foreach ($file in $files) {
    $matches = Select-String -Path $file.FullName -Pattern $noParamPattern
    
    if ($matches) {
        foreach ($match in $matches) {
            $relativePath = $file.FullName.Replace($rootPath, "").TrimStart("\")
            Write-Host "  ⚠️  FOUND EMPTY INSTANTIATION:" -ForegroundColor Red
            Write-Host "      $relativePath" -ForegroundColor Yellow
            Write-Host "      Line $($match.LineNumber): $($match.Line.Trim())" -ForegroundColor White
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Count total occurrences
$totalCount = 0
foreach ($file in $files) {
    $count = (Select-String -Path $file.FullName -Pattern "MemoryVaultManager" -AllMatches).Count
    $totalCount += $count
}

Write-Host "Total MemoryVaultManager references: $totalCount" -ForegroundColor Green
Write-Host ""
Write-Host "Look for instantiations missing vaultPath parameter!" -ForegroundColor Yellow
Write-Host "The error suggests one is being created without proper initialization." -ForegroundColor Yellow