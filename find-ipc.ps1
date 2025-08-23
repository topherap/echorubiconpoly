# Search for IPC message sending patterns in Echo Rubicon

$searchPath = "C:\Users\tophe\Documents\Echo Rubicon"
$patterns = @(
    "window\.api\.send",
    "ipcRenderer\.send",
    "chat:send",
    "chat:message",
    "send.*chat",
    "send.*message",
    "\.send\(.*(chat|message)",
    "selectedLocalModel",
    "selectedAPIModel",
    "setSelectedLocalModel",
    "setSelectedAPIModel"
)

Write-Host "=== SEARCHING ECHO RUBICON FOR IPC PATTERNS ===" -ForegroundColor Cyan
Write-Host "Search path: $searchPath" -ForegroundColor Gray
Write-Host ""

foreach ($pattern in $patterns) {
    Write-Host "Searching for: $pattern" -ForegroundColor Yellow
    
    $results = Get-ChildItem -Path $searchPath -Include *.js,*.jsx,*.ts,*.tsx -Recurse -ErrorAction SilentlyContinue | 
        Select-String -Pattern $pattern -Context 2,2
    
    if ($results) {
        Write-Host "Found $($results.Count) matches:" -ForegroundColor Green
        foreach ($result in $results | Select-Object -First 5) {
            Write-Host "`nFile: $($result.Path)" -ForegroundColor Magenta
            Write-Host "Line $($result.LineNumber):" -ForegroundColor Gray
            Write-Host $result.Line.Trim()
            if ($result.Context.PreContext) {
                Write-Host "  Before: $($result.Context.PreContext -join ' ')" -ForegroundColor DarkGray
            }
            if ($result.Context.PostContext) {
                Write-Host "  After: $($result.Context.PostContext -join ' ')" -ForegroundColor DarkGray
            }
        }
        Write-Host ""
    } else {
        Write-Host "No matches found" -ForegroundColor Red
    }
    Write-Host "-" * 60
}

Write-Host "`n=== SEARCH COMPLETE ===" -ForegroundColor Cyan