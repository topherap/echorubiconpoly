@echo off
echo.
echo ============================================
echo    Echo Rubicon Q-Lib Memory Engine Setup
echo ============================================
echo.

node "%~dp0qlib-installer-standalone.js"

if errorlevel 1 (
    echo.
    echo Installation failed!
    pause
    exit /b 1
)

echo.
echo Setup complete!
pause
