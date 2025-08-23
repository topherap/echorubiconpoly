# Find all JavaScript files in current directory and subdirectories
Write-Host "=== SEARCHING FOR YOUR JAVASCRIPT FILES ===" -ForegroundColor Cyan
Write-Host ""

# Get all JS files
$jsFiles = Get-ChildItem -Path . -Filter "*.js" -Recurse -File | Where-Object { 
    $_.FullName -notmatch "node_modules|\.git|dist|build|vendor"
}

if ($jsFiles.Count -eq 0) {
    Write-Host "❌ No JavaScript files found!" -ForegroundColor Red
    Write-Host "Make sure you're in the right directory" -ForegroundColor Yellow
    exit
}

Write-Host "Found $($jsFiles.Count) JavaScript file(s):" -ForegroundColor Green
$jsFiles | ForEach-Object { Write-Host "  📄 $($_.FullName)" -ForegroundColor White }
Write-Host ""

# Look for files that likely contain OpenAI/chat functionality
Write-Host "=== ANALYZING FILES FOR OPENAI/CHAT CODE ===" -ForegroundColor Cyan
$candidates = @()

foreach ($file in $jsFiles) {
    $content = Get-Content $file.FullName -Raw
    $score = 0
    $markers = @()
    
    # Check for OpenAI/chat related keywords
    if ($content -match "openai|OpenAI|apiKey|api[_-]key") { 
        $score += 3
        $markers += "OpenAI references"
    }
    if ($content -match "websocket|WebSocket|ws:|wss:") { 
        $score += 2
        $markers += "WebSocket"
    }
    if ($content -match "sendMessage|send[_-]message|postMessage") { 
        $score += 2
        $markers += "Message sending"
    }
    if ($content -match "chat|Chat|message|Message") { 
        $score += 1
        $markers += "Chat references"
    }
    if ($content -match "\.querySelector\(['""]\.chat|getElementById\(['""]chat") { 
        $score += 2
        $markers += "Chat DOM queries"
    }
    
    if ($score -gt 0) {
        $candidates += [PSCustomObject]@{
            File = $file
            Score = $score
            Markers = $markers -join ", "
            Lines = ($content -split "`n").Count
        }
    }
}

if ($candidates.Count -eq 0) {
    Write-Host "⚠️  No files with OpenAI/chat code found" -ForegroundColor Yellow
    Write-Host "Showing all JS files instead:" -ForegroundColor Yellow
    $candidates = $jsFiles | ForEach-Object {
        [PSCustomObject]@{
            File = $_
            Score = 0
            Markers = "No chat markers found"
            Lines = (Get-Content $_.FullName).Count
        }
    }
}

# Sort by score and display
$candidates = $candidates | Sort-Object Score -Descending

Write-Host ""
Write-Host "=== MOST LIKELY FILE ===" -ForegroundColor Green
$mainFile = $candidates[0].File

Write-Host "📍 Target File: $($mainFile.FullName)" -ForegroundColor Yellow
Write-Host "   Indicators: $($candidates[0].Markers)" -ForegroundColor Gray
Write-Host "   Total Lines: $($candidates[0].Lines)" -ForegroundColor Gray
Write-Host ""

# Find the best insertion point
$content = Get-Content $mainFile.FullName -Raw
$lines = $content -split "`n"

# Look for insertion point
$insertLine = -1
$lastFunctionLine = -1
$beforeListenersLine = -1

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    
    # Track last function definition
    if ($line -match "^function\s+\w+|^const\s+\w+\s*=\s*function|^let\s+\w+\s*=\s*function") {
        $lastFunctionLine = $i
        # Find the end of this function
        $braceCount = 0
        $foundStart = $false
        for ($j = $i; $j -lt $lines.Count; $j++) {
            if ($lines[$j] -match "{") { 
                $braceCount += ([regex]::Matches($lines[$j], "{").Count)
                $foundStart = $true
            }
            if ($lines[$j] -match "}") { 
                $braceCount -= ([regex]::Matches($lines[$j], "}").Count)
            }
            if ($foundStart -and $braceCount -eq 0) {
                $lastFunctionLine = $j + 1
                break
            }
        }
    }
    
    # Check for event listeners (usually at bottom)
    if ($line -match "addEventListener|\.on\(|document\.ready|\$\(document\)\.ready") {
        if ($beforeListenersLine -eq -1) {
            $beforeListenersLine = $i - 1
        }
    }
}

# Determine best insertion point
if ($beforeListenersLine -gt 0) {
    $insertLine = $beforeListenersLine
    $location = "before event listeners"
} elseif ($lastFunctionLine -gt 0) {
    $insertLine = $lastFunctionLine
    $location = "after last function"
} else {
    $insertLine = [Math]::Max(0, $lines.Count - 10)
    $location = "near end of file"
}

Write-Host "=== WHERE TO ADD THE CODE ===" -ForegroundColor Cyan
Write-Host "Insert at line: $($insertLine + 1) ($location)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Preview of insertion point:" -ForegroundColor Gray
Write-Host "─────────────────────────────────────────" -ForegroundColor DarkGray

# Show context
$startContext = [Math]::Max(0, $insertLine - 3)
$endContext = [Math]::Min($lines.Count - 1, $insertLine + 3)

for ($i = $startContext; $i -le $endContext; $i++) {
    if ($i -eq $insertLine) {
        Write-Host ""
        Write-Host ">>> ========== INSERT NEW CODE HERE ==========" -ForegroundColor Green -BackgroundColor DarkGreen
        Write-Host ">>> // Auto-scroll chat to bottom" -ForegroundColor Green -BackgroundColor DarkGreen
        Write-Host ">>> function autoScrollChat() { ..." -ForegroundColor Green -BackgroundColor DarkGreen
        Write-Host ">>> =========================================" -ForegroundColor Green -BackgroundColor DarkGreen
        Write-Host ""
    }
    Write-Host ("{0,4}: {1}" -f ($i + 1), $lines[$i])
}

Write-Host "─────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
Write-Host "=== QUICK ACTIONS ===" -ForegroundColor Cyan
Write-Host "1. Open file in notepad:  " -NoNewline
Write-Host "notepad `"$($mainFile.FullName)`"" -ForegroundColor Yellow
Write-Host "2. Open file in VS Code:  " -NoNewline  
Write-Host "code `"$($mainFile.FullName)`" -g:$($insertLine + 1)" -ForegroundColor Yellow
Write-Host "3. Create backup first:   " -NoNewline
Write-Host "Copy-Item `"$($mainFile.FullName)`" `"$($mainFile.FullName).backup`"" -ForegroundColor Yellow