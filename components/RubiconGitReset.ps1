# === CONFIG ===
$projectPath = "C:\Users\tophe\Documents\Echo Rubicon"
$repoURL     = "https://github.com/topherap/rubicon-backup.git"
$forceNukeGit = $true  # Set to $false if you don't want to delete .git

# === EXECUTION ===
Set-Location $projectPath

# Optional: nuke .git
if ($forceNukeGit -and (Test-Path ".git")) {
    Write-Host "🧨 Removing existing .git folder..."
    Remove-Item -Recurse -Force .git
}

# Init clean repo
Write-Host "⚙️ Initializing Git repo..."
git init

# .gitignore setup
$ignoreRules = @(
    "/echo-backend-rust/target",
    "*.exe",
    "*.log",
    "node_modules/",
    "dist/",
    "build/",
    "nul"
)
$ignoreRules -join "`n" | Out-File -Encoding ascii -Append .gitignore

# Stage and commit
git add .
git commit -m "Initial commit: clean Rubicon state with ignore rules"

# Rename branch
git branch -M main

# Add origin
Write-Host "🔗 Setting remote origin to rubicon-backup..."
git remote remove origin -ErrorAction SilentlyContinue
git remote add origin $repoURL

# Push with upstream + force
Write-Host "🚀 Force pushing to origin/main..."
git push --force --set-upstream origin main

Write-Host "`n✅ Rubicon Git repo reset complete. Clean state pushed to: $repoURL"
