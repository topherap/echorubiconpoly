param (
    [string]$ProjectPath = ".",
    [string]$OutputFile = "D:\Obsidian Vault\ProjectBlueprint.md",
    [string]$CanvasFile = "D:\Obsidian Vault\ProjectBlueprint.canvas",
    [string]$ExcalidrawFile = "D:\Obsidian Vault\ProjectBlueprint.excalidraw.md"
)

# Clean parameters
$ProjectPath = $ProjectPath.Trim('"', '\')
$OutputFile = $OutputFile.Trim('"')
$CanvasFile = $CanvasFile.Trim('"')
$ExcalidrawFile = $ExcalidrawFile.Trim('"')

Write-Host ""
Write-Host "=== Multi-Format Project Blueprint Generator ===" -ForegroundColor Cyan

# Configuration
$excludeDirs = @("node_modules", ".git", "dist", "build", ".vs", ".vscode", "bin", "obj", "packages", "%APPDATA%", "AppData", ".expo", ".gradle")
$includeExts = @(".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".scss", ".json", ".md", ".ps1", ".bat", ".py", ".cs")
$maxDepth = 3

function IsExcluded {
    param($name)
    return $excludeDirs -contains $name
}

function Get-SafeName {
    param($name)
    $safe = $name -replace '[^a-zA-Z0-9\-_\.\s]', ''
    if ($safe.Length -eq 0) { $safe = "unnamed" }
    return $safe
}

# Validate path
if (-not (Test-Path $ProjectPath)) {
    Write-Host "ERROR: Path not found: $ProjectPath" -ForegroundColor Red
    exit 1
}

$ProjectPath = (Resolve-Path $ProjectPath).Path
$ProjectName = Split-Path $ProjectPath -Leaf

Write-Host "Scanning: $ProjectPath"

# Collect all project data
$projectData = @{
    Nodes = @()
    Edges = @()
}

$nodeId = 0
$nodeMap = @{}

# Recursive scan function
function Scan-ProjectStructure {
    param($path, $parentId, $depth, $x = 0, $y = 0)
    
    if ($depth -gt $maxDepth) { return }
    
    $currentY = $y
    $childX = $x + 300
    
    # Get subdirectories
    $subdirs = Get-ChildItem -Path $path -Directory -ErrorAction SilentlyContinue |
        Where-Object { -not (IsExcluded $_.Name) } |
        Select-Object -First 8
    
    $itemIndex = 0
    foreach ($dir in $subdirs) {
        $dirId = "node_$script:nodeId"
        $safeName = Get-SafeName $dir.Name
        
        $node = @{
            Id = $dirId
            Name = $safeName
            Type = "directory"
            Path = $dir.FullName
            X = $childX
            Y = $currentY + ($itemIndex * 150)
            ParentId = $parentId
        }
        
        $script:projectData.Nodes += $node
        $script:nodeMap[$dir.FullName] = $node
        
        if ($parentId) {
            $script:projectData.Edges += @{
                From = $parentId
                To = $dirId
            }
        }
        
        $script:nodeId++
        $itemIndex++
        
        # Recurse
        Scan-ProjectStructure -path $dir.FullName -parentId $dirId -depth ($depth + 1) -x $childX -y ($currentY + ($itemIndex * 150))
    }
    
    # Get files (only at shallow depths)
    if ($depth -le 2) {
        $files = Get-ChildItem -Path $path -File -ErrorAction SilentlyContinue |
            Where-Object { $includeExts -contains $_.Extension.ToLower() } |
            Select-Object -First 5
        
        foreach ($file in $files) {
            $fileId = "node_$script:nodeId"
            $safeName = Get-SafeName $file.Name
            
            $node = @{
                Id = $fileId
                Name = $safeName
                Type = "file"
                Extension = $file.Extension
                Path = $file.FullName
                X = $childX
                Y = $currentY + ($itemIndex * 150)
                ParentId = $parentId
            }
            
            $script:projectData.Nodes += $node
            
            if ($parentId) {
                $script:projectData.Edges += @{
                    From = $parentId
                    To = $fileId
                }
            }
            
            $script:nodeId++
            $itemIndex++
        }
    }
}

# Create root node
$rootNode = @{
    Id = "node_$nodeId"
    Name = $ProjectName
    Type = "root"
    Path = $ProjectPath
    X = 400
    Y = 400
    ParentId = $null
}
$projectData.Nodes += $rootNode
$nodeMap[$ProjectPath] = $rootNode
$nodeId++

# Scan the project
Write-Host "Building project structure..."
Scan-ProjectStructure -path $ProjectPath -parentId $rootNode.Id -depth 1 -x 400 -y 400

Write-Host "Found: $($projectData.Nodes.Count) nodes, $($projectData.Edges.Count) connections"

# 1. Generate Obsidian Canvas
Write-Host ""
Write-Host "Creating Obsidian Canvas..." -ForegroundColor Yellow

$canvasData = @{
    nodes = @()
    edges = @()
}

# Create canvas nodes
foreach ($node in $projectData.Nodes) {
    $canvasNode = @{
        id = $node.Id
        x = $node.X
        y = $node.Y
        width = 250
        height = 60
        type = "text"
        text = $node.Name
    }
    
    # Color based on type
    switch ($node.Type) {
        "root" { $canvasNode.color = "6" }  # Purple
        "directory" { $canvasNode.color = "4" }  # Blue
        "file" { 
            switch ($node.Extension) {
                { $_ -in ".js", ".jsx", ".ts", ".tsx" } { $canvasNode.color = "3" }  # Yellow
                { $_ -in ".json", ".xml", ".yaml" } { $canvasNode.color = "2" }  # Orange
                { $_ -in ".md", ".txt" } { $canvasNode.color = "5" }  # Red
                default { $canvasNode.color = "1" }  # Gray
            }
        }
    }
    
    $canvasData.nodes += $canvasNode
}

# Create canvas edges
foreach ($edge in $projectData.Edges) {
    $canvasData.edges += @{
        id = "edge_$($edge.From)_$($edge.To)"
        fromNode = $edge.From
        fromSide = "right"
        toNode = $edge.To
        toSide = "left"
    }
}

$canvasJson = $canvasData | ConvertTo-Json -Depth 10 -Compress
Set-Content -Path $CanvasFile -Value $canvasJson -Encoding UTF8

# 2. Generate simplified Excalidraw (without the complex calculations)
Write-Host "Creating Excalidraw diagram..." -ForegroundColor Yellow

# Create simple Excalidraw content
$excalidrawContent = @"
---

excalidraw-plugin: parsed
tags: [excalidraw]

---
==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==

# Project Structure: $ProjectName

\`\`\`excalidraw-json
{
  "type": "excalidraw",
  "version": 2,
  "elements": [
    {
      "id": "welcome",
      "type": "text",
      "x": 300,
      "y": 200,
      "width": 400,
      "height": 100,
      "text": "Project: $ProjectName\n\nSwitch to Excalidraw view to see the diagram\nThen use the Canvas file for full interactivity",
      "fontSize": 20,
      "fontFamily": 1,
      "textAlign": "center",
      "verticalAlign": "middle"
    }
  ]
}
\`\`\`
"@

Set-Content -Path $ExcalidrawFile -Value $excalidrawContent -Encoding UTF8

# 3. Generate the original Markdown
Write-Host "Creating Markdown blueprint..." -ForegroundColor Yellow

$lines = @()
$lines += "# Project Blueprint: $ProjectName"
$lines += ""
$lines += "## Available Formats"
$lines += ""
$lines += "This project blueprint is available in multiple formats:"
$lines += ""
$lines += "### 🎨 Interactive Canvas"
$lines += "**[[$(Split-Path $CanvasFile -Leaf)]]**"
$lines += "- Native Obsidian format"
$lines += "- Drag and drop nodes"
$lines += "- Color-coded by file type"
$lines += "- Double-click to edit"
$lines += ""
$lines += "### 📝 Excalidraw (Optional)"
$lines += "**[[$(Split-Path $ExcalidrawFile -Leaf)]]**"
$lines += "- Requires Excalidraw plugin"
$lines += "- Hand-drawn style"
$lines += ""
$lines += "## Quick Stats"
$lines += "- **Total Items:** $($projectData.Nodes.Count)"
$lines += "- **Directories:** $($projectData.Nodes | Where-Object {$_.Type -eq 'directory'} | Measure-Object).Count"
$lines += "- **Files:** $($projectData.Nodes | Where-Object {$_.Type -eq 'file'} | Measure-Object).Count"
$lines += ""
$lines += "## Mindmap View"
$lines += ""
$lines += '```mermaid'
$lines += 'mindmap'
$lines += "  root(($ProjectName))"

# Simple mindmap content
$topDirs = Get-ChildItem -Path $ProjectPath -Directory -ErrorAction SilentlyContinue |
    Where-Object { -not (IsExcluded $_.Name) } |
    Select-Object -First 8

foreach ($dir in $topDirs) {
    $safeName = Get-SafeName $dir.Name
    $lines += "    $safeName"
}

$lines += '```'
$lines += ""
$lines += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

$content = $lines -join "`r`n"
$content | Out-File -FilePath $OutputFile -Encoding UTF8

# Final output
Write-Host ""
Write-Host "SUCCESS! Created blueprint files:" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Canvas file created successfully!" -ForegroundColor Green
Write-Host "   $CanvasFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "📄 Markdown with links created!" -ForegroundColor Green
Write-Host "   $OutputFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Basic Excalidraw placeholder created" -ForegroundColor Yellow
Write-Host "   $ExcalidrawFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "To use:" -ForegroundColor Yellow
Write-Host "1. The Canvas file is ready to use - open it from within Obsidian"
Write-Host "2. It's fully interactive with your project structure!"