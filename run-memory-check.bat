@echo off
setlocal

:: Set absolute paths
set root=C:\Users\tophe\Documents\Echo Rubicon
set logdir=%root%\logs

:: Create logs folder if missing
if not exist "%logdir%" mkdir "%logdir%"

:: Generate timestamp
for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set timestamp=%%a

:: Define report files
set report_md=%logdir%\diagnostic-merged-%timestamp%.md
set report_json=%logdir%\diagnostic-merged-%timestamp%.json

:: Run scripts and tee output to .md
echo Running diagnose-memory-pipeline.js...
node "%root%\diagnose-memory-pipeline.js" >> "%report_md%"

echo. >> "%report_md%"
echo --------------------------- >> "%report_md%"
echo Running master-diag-lite.js... >> "%report_md%"
node "%root%\master-diag-lite.js"

:: Copy internal JSON results file to timestamped one
copy "%logdir%\diagnostic-*.json" "%report_json%" >nul

:: Confirm result
echo ✅ Merged diagnostics saved:
echo - Markdown: %report_md%
echo - JSON:     %report_json%
start "" "%report_md%"

pause
