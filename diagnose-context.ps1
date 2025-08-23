# Diagnostic script to find prompt construction and context injection issues

Write-Host "=== ECHO AI CONTEXT INJECTION DIAGNOSTIC ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Find where prompts are constructed
Write-Host "[1] Searching for prompt construction patterns..." -ForegroundColor Yellow
$promptPatterns = @(
   "role.*system.*content",
   "role.*user.*content", 
   "messages\s*=\s*\[",
   "formatPrompt",
   "buildPrompt",
   "memoryContext",
   "contextBuilder",
   "enhancedPrompt"
)

$results = @{}
foreach ($pattern in $promptPatterns) {
   Write-Host "  Searching for: $pattern" -ForegroundColor Gray
   $files = Get-ChildItem -Path . -Include "*.js" -Recurse -ErrorAction SilentlyContinue | 
            Select-String -Pattern $pattern -ErrorAction SilentlyContinue
   if ($files) {
       $results[$pattern] = $files
       Write-Host "    Found in $($files.Count) locations" -ForegroundColor Green
   }
}

# Step 2: Find the actual ollama/API call
Write-Host ""
Write-Host "[2] Finding model invocation code..." -ForegroundColor Yellow
$modelCalls = Get-ChildItem -Path . -Include "*.js" -Recurse | 
             Select-String -Pattern "ollama\.chat|ollama\.generate|fetch.*ollama|axios.*ollama|model\.generate" |
             Select-Object -First 5

foreach ($call in $modelCalls) {
   Write-Host "  $($call.Filename):$($call.LineNumber)" -ForegroundColor Cyan
   
   # Get surrounding context (20 lines before and after)
   $fileContent = Get-Content $call.Path
   $startLine = [Math]::Max(0, $call.LineNumber - 20)
   $endLine = [Math]::Min($fileContent.Count - 1, $call.LineNumber + 20)
   
   Write-Host "  Context around model call:" -ForegroundColor Gray
   for ($i = $startLine; $i -le $endLine; $i++) {
       if ($i -eq ($call.LineNumber - 1)) {
           Write-Host ">>> $($fileContent[$i])" -ForegroundColor Yellow
       } else {
           $line = $fileContent[$i]
           if ($line -match "memoryContext|contextBuilder|enhancedPrompt|messages") {
               Write-Host "    $line" -ForegroundColor Green
           } elseif ($line -match "prompt|message|content") {
               Write-Host "    $line" -ForegroundColor Cyan
           }
       }
   }
   Write-Host ""
}

# Step 3: Trace memory context flow
Write-Host "[3] Tracing memory context flow..." -ForegroundColor Yellow
$contextFlow = Get-ChildItem -Path . -Include "*.js" -Recurse | 
              Select-String -Pattern "processMemoryContext|getRelevantMemories|buildContext|memoryContext\s*=" |
              Select-Object -First 10

foreach ($flow in $contextFlow) {
   Write-Host "  $($flow.Filename):$($flow.LineNumber) - $($flow.Line.Trim())" -ForegroundColor Cyan
}

# Step 4: Find debug logs showing context content
Write-Host ""
Write-Host "[4] Checking for context debug logs..." -ForegroundColor Yellow
$debugLogs = Get-ChildItem -Path . -Include "*.js" -Recurse | 
            Select-String -Pattern "console\.log.*context|console\.log.*memory|DEBUG.*CONTEXT|Final prompt" |
            Select-Object -First 10

foreach ($log in $debugLogs) {
   Write-Host "  $($log.Filename):$($log.LineNumber)" -ForegroundColor Gray
   Write-Host "    $($log.Line.Trim())" -ForegroundColor DarkGray
}

# Step 5: Extract the critical section
Write-Host ""
Write-Host "[5] CRITICAL CHECK - How is context added to prompt?" -ForegroundColor Red
$criticalFiles = @(
   "chatSendHandler.js",
   "chat-handler.js", 
   "chatHandler.js",
   "ipc-handlers.js",
   "sendHandler.js"
)

foreach ($file in $criticalFiles) {
   $found = Get-ChildItem -Path . -Filter $file -Recurse -ErrorAction SilentlyContinue
   if ($found) {
       Write-Host ""
       Write-Host "  Analyzing $file..." -ForegroundColor Yellow
       $content = Get-Content $found.FullName
       
       # Find where messages array is built
       for ($i = 0; $i -lt $content.Count; $i++) {
           if ($content[$i] -match "messages\s*=|prompt\s*=|const prompt") {
               Write-Host "    Line $($i+1): Message/Prompt construction found" -ForegroundColor Green
               
               # Show next 15 lines to see how context is added
               Write-Host "    --- CODE SNIPPET ---" -ForegroundColor Cyan
               for ($j = $i; $j -lt [Math]::Min($i + 15, $content.Count); $j++) {
                   if ($content[$j] -match "memoryContext|context|enhanced") {
                       Write-Host "    > $($content[$j])" -ForegroundColor Yellow
                   } else {
                       Write-Host "      $($content[$j])" -ForegroundColor Gray
                   }
               }
               Write-Host "    --- END SNIPPET ---" -ForegroundColor Cyan
               break
           }
       }
   }
}

# Step 6: Summary
Write-Host ""
Write-Host "=== DIAGNOSTIC SUMMARY ===" -ForegroundColor Cyan
Write-Host "To fix the 'cannot access' issue, look for:" -ForegroundColor Yellow
Write-Host "1. Where 'messages' array is constructed" -ForegroundColor White
Write-Host "2. Whether memoryContext is INSIDE a message or floating separately" -ForegroundColor White
Write-Host "3. If context is concatenated to user/system content" -ForegroundColor White
Write-Host ""
Write-Host "Run this to see the exact problem:" -ForegroundColor Green
Write-Host 'Select-String -Path .\**\*.js -Pattern "messages.*=.*\[" -Context 0,20 | ForEach-Object { $_.Context.PostContext }' -ForegroundColor Cyan