@echo off
setlocal
cd /d "%~dp0"
set "PORT=8765"

if not exist "index.html" (
  echo ERROR: index.html was not found.
  pause
  exit /b 1
)

for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":%PORT%" ^| findstr "LISTENING"') do taskkill /PID %%P /F >nul 2>&1

where py >nul 2>&1
if not errorlevel 1 goto use_py
where python >nul 2>&1
if not errorlevel 1 goto use_python
where python3 >nul 2>&1
if not errorlevel 1 goto use_python3

echo ERROR: Python 3 was not found.
echo Use start_game.bat instead, or install Python 3.
pause
exit /b 1

:use_py
start "Game server" /min py -3 -m http.server %PORT% --bind 127.0.0.1
goto open_game

:use_python
start "Game server" /min python -m http.server %PORT% --bind 127.0.0.1
goto open_game

:use_python3
start "Game server" /min python3 -m http.server %PORT% --bind 127.0.0.1

:open_game
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:%PORT%/"
exit /b 0
