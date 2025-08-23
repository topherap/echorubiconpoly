@echo off
echo ========================================
echo    ECHORUBICON DEPLOYMENT SYSTEM
echo ========================================
echo.

:: Run the PowerShell deployment script
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\tophe\Documents\EchoRubicon\RubiconDeploy.ps1"

echo.
pause