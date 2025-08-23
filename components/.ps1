$folder = "claude globals"
$components = @(
    @{ File = "myai_complete_global.js";      Global = "MyAI" },
    @{ File = "settings_panel_global.js";     Global = "SettingsPanel" },
    @{ File = "dev_panel_global.js";          Global = "DevPanel" },
    @{ File = "obsidian_notes_global.js";     Global = "ObsidianNotes" }
)

foreach ($component in $components) {
    $path = ".\$folder\$($component.File)"
    $globalName = $component.Global

    $guard = @"
(function () {
  'use strict';

  // 🛡️ React global check
  if (typeof window.React === 'undefined' || typeof window.ReactDOM === 'undefined') {
    console.error('[$globalName] React not available, deferring...');
    setTimeout(() => window.$globalName?.init?.(), 100);
    return;
  }
"@

    if (Test-Path $path) {
        $original = Get-Content $path
        Set-Content $path ($guard + "`n" + ($original -join "`n"))
        Write-Host "✅ Injected React guard into: $($component.File)"
    } else {
        Write-Host "⚠️ File not found: $($component.File)"
    }
}
