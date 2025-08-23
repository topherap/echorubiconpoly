@echo off
echo Setting up Echo Rubicon monitoring...

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

:: Get timestamp for log file
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set timestamp=%mydate%_%mytime%

:: Set up the monitoring command
echo Starting Echo Rubicon with output capture...
echo Log file: logs\echo_%timestamp%.log
echo.
echo You can now run: npm start 2^>^&1 ^| tee logs\echo_%timestamp%.log
echo.
echo Or for real-time monitoring:
echo npm start 2^>^&1 ^| tee logs\echo_live.log
echo.
pause