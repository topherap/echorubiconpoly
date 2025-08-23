$root = "C:\Users\tophe\Documents\Echo Rubicon"

# Define search terms
$patterns = @(
    "MemoryVaultManager",
    "searchMemories",
    "getCapsulesBy",
    "bulkAssignEpochs",
    "loadCapsule",
    "assignEpochAndWeight",
    "generateSearchText"
)

# Search all .js and .jsx files under Echo Rubicon
Get-ChildItem -Path $root -Recurse -Include *.js, *.jsx | ForEach-Object {
    $file = $_.FullName
    Get-Content $file | ForEach-Object { $_ } | ForEach-Object {
        $line = $_
        foreach ($pattern in $patterns) {
            if ($line -match $pattern) {
                Write-Host "$file :: $line" -ForegroundColor Yellow
                break
            }
        }
    }
}
