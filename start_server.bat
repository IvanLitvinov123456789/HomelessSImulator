@echo off
cd /d "%~dp0"
where py >nul 2>nul && (start "" http://127.0.0.1:8765/index.html & py -m http.server 8765 --bind 127.0.0.1 & exit /b)
where python >nul 2>nul && (start "" http://127.0.0.1:8765/index.html & python -m http.server 8765 --bind 127.0.0.1 & exit /b)
echo Python not found. Use start_game.bat.
pause
