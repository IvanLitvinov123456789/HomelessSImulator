@echo off
setlocal
cd /d "%~dp0"
set "PORT=9230"
set "URL=http://127.0.0.1:%PORT%/index.html?v=2.3"

call "%~dp0stop_game.bat" >nul 2>&1
start "Homeless Survival v2.3 Server" /min "%~dp0start_server.bat"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$url='%URL%'; for($i=0; $i -lt 20; $i++){ try { Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1 | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 500 } }; exit 1" >nul 2>&1
if errorlevel 1 goto server_error

start "" "%URL%"
exit /b 0

:server_error
echo.
echo The local game server did not start.
echo Open start_server.bat to see the exact error.
echo Make sure Python is installed and available as py or python.
echo.
pause
exit /b 1
