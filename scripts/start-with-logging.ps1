# Echo Rubicon Log Tracker
# Starts the application with comprehensive logging and automatic rotation

param(
    [string]$LogDir = "logs",
    [string]$MaxLogSize = "10MB",
    [int]$KeepLogs = 5
)

# Ensure logs directory exists
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Generate timestamp for log file
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logFile = Join-Path $LogDir "echo_live_$timestamp.log"
$latestLog = Join-Path $LogDir "echo_live.log"

Write-Host "Starting Echo Rubicon with logging..." -ForegroundColor Green
Write-Host "Log file: $logFile" -ForegroundColor Cyan
Write-Host "Latest log symlink: $latestLog" -ForegroundColor Cyan

# Function to rotate logs
function Rotate-Logs {
    param([string]$LogDirectory, [int]$Keep)
    
    $logFiles = Get-ChildItem -Path $LogDirectory -Name "echo_live_*.log" | Sort-Object Name -Descending
    if ($logFiles.Count -gt $Keep) {
        $filesToDelete = $logFiles | Select-Object -Skip $Keep
        foreach ($file in $filesToDelete) {
            $fullPath = Join-Path $LogDirectory $file
            Write-Host "Rotating old log: $file" -ForegroundColor Yellow
            Remove-Item $fullPath -Force
        }
    }
}

# Rotate old logs
Rotate-Logs -LogDirectory $LogDir -Keep $KeepLogs

# Start npm with logging
try {
    Write-Host "Starting npm start..." -ForegroundColor Green
    
    # Create named pipe for real-time monitoring
    $process = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru -NoNewWindow -RedirectStandardOutput $logFile -RedirectStandardError $logFile
    
    # Create/update latest log symlink
    if (Test-Path $latestLog) {
        Remove-Item $latestLog -Force
    }
    New-Item -ItemType SymbolicLink -Path $latestLog -Target $logFile -Force | Out-Null
    
    Write-Host "Process started with PID: $($process.Id)" -ForegroundColor Green
    Write-Host "Monitoring logs in real-time. Press Ctrl+C to stop." -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    # Monitor log file in real-time
    $lastPosition = 0
    while (!$process.HasExited) {
        if (Test-Path $logFile) {
            $content = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
            if ($content -and $content.Length -gt $lastPosition) {
                $newContent = $content.Substring($lastPosition)
                Write-Host $newContent -NoNewline
                $lastPosition = $content.Length
            }
        }
        Start-Sleep -Milliseconds 500
    }
    
    Write-Host "`nProcess exited with code: $($process.ExitCode)" -ForegroundColor $(if($process.ExitCode -eq 0) {"Green"} else {"Red"})
    
} catch {
    Write-Host "Error starting process: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`nLog saved to: $logFile" -ForegroundColor Cyan