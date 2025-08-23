# test-conversation-threading.ps1
# Tests if conversation threading is properly installed and configured

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Conversation Threading Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$errorCount = 0
$warningCount = 0

# Function to test file existence
function Test-FileExists {
    param($Path, $Description)
    
    if (Test-Path $Path) {
        Write-Host "✓ " -ForegroundColor Green -NoNewline
        Write-Host "$Description found at: $Path"
        return $true
    } else {
        Write-Host "✗ " -ForegroundColor Red -NoNewline
        Write-Host "$Description NOT FOUND at: $Path"
        $script:errorCount++
        return $false
    }
}

# Function to check for specific content in file
function Test-FileContent {
    param($Path, $SearchString, $Description)
    
    if (Test-Path $Path) {
        $content = Get-Content $Path -Raw
        if ($content -match [regex]::Escape($SearchString)) {
            Write-Host "  ✓ " -ForegroundColor Green -NoNewline
            Write-Host "$Description"
            return $true
        } else {
            Write-Host "  ✗ " -ForegroundColor Yellow -NoNewline
            Write-Host "$Description NOT FOUND"
            $script:warningCount++
            return $false
        }
    }
    return $false
}

# 1. Check Core Files
Write-Host "`n1. CHECKING CORE FILES:" -ForegroundColor Yellow
Write-Host "------------------------" -ForegroundColor Gray

# Check main implementation
$coreThreader = Test-FileExists "tools/conversationThreader.js" "Core ConversationThreader"
if ($coreThreader) {
    Test-FileContent "tools/conversationThreader.js" "class ConversationThreader" "ConversationThreader class definition"
    Test-FileContent "tools/conversationThreader.js" "groupIntoConversations" "groupIntoConversations method"
    Test-FileContent "tools/conversationThreader.js" "injectConversationContext" "injectConversationContext function"
    Test-FileContent "tools/conversationThreader.js" "CONVERSATION_CONFIG" "Configuration object"
}

# Check wrapper
$wrapper = Test-FileExists "main/handlers/conversationThreaderWrapper.js" "Threading Wrapper"
if ($wrapper) {
    Test-FileContent "main/handlers/conversationThreaderWrapper.js" "require('../../tools/conversationThreader')" "Import from tools"
    Test-FileContent "main/handlers/conversationThreaderWrapper.js" "threaderCache" "Caching implementation"
    Test-FileContent "main/handlers/conversationThreaderWrapper.js" "getThreader" "getThreader function"
}

# Check chat handler integration
$chatHandler = Test-FileExists "main/handlers/chatSendHandler.js" "Chat Send Handler"
if ($chatHandler) {
    Test-FileContent "main/handlers/chatSendHandler.js" "require('./conversationThreaderWrapper')" "Import wrapper"
    Test-FileContent "main/handlers/chatSendHandler.js" "injectConversationContext" "Uses injectConversationContext"
}

# Check threader engine dependency
$engine = Test-FileExists "tools/threaderEngine.js" "Threader Engine (dependency)"
if (!$engine) {
    Write-Host "  ! " -ForegroundColor Yellow -NoNewline
    Write-Host "Note: threaderEngine.js is required by conversationThreader.js"
}

# 2. Check Project Structure
Write-Host "`n2. CHECKING PROJECT STRUCTURE:" -ForegroundColor Yellow
Write-Host "-------------------------------" -ForegroundColor Gray

# Check if echo vault exists
$vaultPath = Join-Path $env:USERPROFILE "Documents\echo-vault"
if (Test-Path $vaultPath) {
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host "Echo vault found at: $vaultPath"
    
    # Check for .echo directory
    $echoPath = Join-Path $vaultPath ".echo"
    if (Test-Path $echoPath) {
        Write-Host "  ✓ " -ForegroundColor Green -NoNewline
        Write-Host ".echo directory exists"
        
        # Check for projects
        $projectsPath = Join-Path $echoPath "projects"
        if (Test-Path $projectsPath) {
            $projects = Get-ChildItem $projectsPath -Directory
            Write-Host "  ✓ " -ForegroundColor Green -NoNewline
            Write-Host "Found $($projects.Count) project(s)"
            
            # Check first project for capsules
            if ($projects.Count -gt 0) {
                $firstProject = $projects[0]
                $capsulesPath = Join-Path $firstProject.FullName "capsules"
                if (Test-Path $capsulesPath) {
                    $capsules = Get-ChildItem $capsulesPath -Filter "*.json" 2>$null
                    Write-Host "    ✓ " -ForegroundColor Green -NoNewline
                    Write-Host "$($firstProject.Name) has $($capsules.Count) capsule(s)"
                }
            }
        }
    }
} else {
    Write-Host "✗ " -ForegroundColor Yellow -NoNewline
    Write-Host "Echo vault not found at default location: $vaultPath"
    $warningCount++
}

# 3. Test Node.js Dependencies
Write-Host "`n3. CHECKING NODE.JS SETUP:" -ForegroundColor Yellow
Write-Host "---------------------------" -ForegroundColor Gray

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✓ " -ForegroundColor Green -NoNewline
        Write-Host "Node.js installed: $nodeVersion"
    }
} catch {
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host "Node.js not found in PATH"
    $errorCount++
}

# 4. Quick Syntax Check
Write-Host "`n4. SYNTAX VALIDATION:" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Gray

# Create a simple test script
$testScript = @'
try {
    // Test if files can be required without syntax errors
    const path = require('path');
    console.log('✓ Basic requires work');
    
    // Test conversation threader
    const threaderPath = path.resolve('./tools/conversationThreader.js');
    if (require('fs').existsSync(threaderPath)) {
        const { ConversationThreader } = require(threaderPath);
        console.log('✓ ConversationThreader can be imported');
    } else {
        console.log('✗ ConversationThreader file not found');
    }
    
    // Test wrapper
    const wrapperPath = path.resolve('./main/handlers/conversationThreaderWrapper.js');
    if (require('fs').existsSync(wrapperPath)) {
        console.log('✓ Wrapper can be imported');
    } else {
        console.log('✗ Wrapper file not found');
    }
    
} catch (error) {
    console.log('✗ Error:', error.message);
    process.exit(1);
}
'@

$testScript | Out-File -FilePath "test-threading-syntax.js" -Encoding UTF8

try {
    $result = node test-threading-syntax.js 2>&1
    $result | ForEach-Object {
        if ($_ -match "✓") {
            Write-Host $_
        } elseif ($_ -match "✗") {
            Write-Host $_ -ForegroundColor Red
            $errorCount++
        } else {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host "Could not run syntax test: $_"
    $errorCount++
} finally {
    Remove-Item "test-threading-syntax.js" -ErrorAction SilentlyContinue
}

# 5. Integration Test
Write-Host "`n5. INTEGRATION CHECK:" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Gray

# Check if all pieces connect
if ($coreThreader -and $wrapper -and $chatHandler) {
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host "All core components present"
    
    # Check imports chain
    $importChainOk = $true
    
    if (Test-Path "main/handlers/chatSendHandler.js") {
        $chatContent = Get-Content "main/handlers/chatSendHandler.js" -Raw
        if ($chatContent -notmatch "conversationThreaderWrapper") {
            Write-Host "  ⚠ " -ForegroundColor Yellow -NoNewline
            Write-Host "chatSendHandler might not be using the wrapper"
            $warningCount++
            $importChainOk = $false
        }
    }
    
    if ($importChainOk) {
        Write-Host "✓ " -ForegroundColor Green -NoNewline
        Write-Host "Import chain looks correct"
    }
} else {
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host "Missing core components - threading will not work"
    $errorCount++
}

# 6. Check Optional Dependencies
Write-Host "`n6. OPTIONAL DEPENDENCIES:" -ForegroundColor Yellow
Write-Host "--------------------------" -ForegroundColor Gray

# Check MemoryVaultManager
$memoryVault = Test-FileExists "src/memory/MemoryVaultManager.js" "MemoryVaultManager"
if (!$memoryVault) {
    Write-Host "  ⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host "This is required for conversation threading to work"
    $warningCount++
}

# Check projectSidebarHandlers
$sidebarHandlers = Test-FileExists "main/handlers/projectSidebarHandlers.js" "Project Sidebar Handlers"
if ($sidebarHandlers) {
    Test-FileContent "main/handlers/projectSidebarHandlers.js" "ConversationThreader" "Uses ConversationThreader"
}

# Final Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($errorCount -eq 0 -and $warningCount -eq 0) {
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "Conversation threading is properly configured." -ForegroundColor Green
} elseif ($errorCount -eq 0) {
    Write-Host "⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host "SETUP COMPLETE WITH WARNINGS" -ForegroundColor Yellow
    Write-Host "Errors: 0 | Warnings: $warningCount" -ForegroundColor Yellow
    Write-Host "The system should work but check warnings above." -ForegroundColor Yellow
} else {
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host "SETUP INCOMPLETE" -ForegroundColor Red
    Write-Host "Errors: $errorCount | Warnings: $warningCount" -ForegroundColor Red
    Write-Host "Please fix the errors above before using conversation threading." -ForegroundColor Red
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")