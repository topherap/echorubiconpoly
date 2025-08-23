@echo off
setlocal

set SCRIPT_DIR=%~dp0
set PS_SCRIPT=%SCRIPT_DIR%Generate-ProjectMap.ps1
set PROJECT_DIR=C:\Users\tophe\Documents\Echo Rubicon
set OUTPUT_FILE=D:\Obsidian Vault\ProjectBlueprint.md
set CANVAS_FILE=D:\Obsidian Vault\ProjectBlueprint.canvas
set EXCALIDRAW_FILE=D:\Obsidian Vault\ProjectBlueprint.excalidraw.md

echo ===============================================
echo Generating Multi-Format Project Blueprint...
echo ===============================================

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" -ProjectPath "%PROJECT_DIR%" -OutputFile "%OUTPUT_FILE%" -CanvasFile "%CANVAS_FILE%" -ExcalidrawFile "%EXCALIDRAW_FILE%"

echo.
echo ✅ Blueprint created in 3 formats:
echo    1. Markdown: %OUTPUT_FILE%
echo    2. Canvas: %CANVAS_FILE%
echo    3. Excalidraw: %EXCALIDRAW_FILE%
echo.
echo Opening main blueprint in Obsidian...

:: Open the markdown file which has links to other formats
start "" "obsidian://open?path=%OUTPUT_FILE%"

echo.
echo To view interactive formats:
echo - Canvas: Click the link in the opened note
echo - Excalidraw: Click the link and switch to Excalidraw view
echo.
pause