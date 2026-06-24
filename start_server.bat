@echo off
setlocal
cd /d "%~dp0"
set "PORT=9281"

where py >nul 2>&1
if not errorlevel 1 goto use_py

where python >nul 2>&1
if not errorlevel 1 goto use_python

echo.
echo Python was not found.
echo Install Python and enable "Add Python to PATH", then try again.
echo.
pause
exit /b 1

:use_py
echo Server v2.8.1: http://127.0.0.1:%PORT%/index.html
py -m http.server %PORT% --bind 127.0.0.1
if errorlevel 1 goto server_failed
exit /b 0

:use_python
echo Server v2.8.1: http://127.0.0.1:%PORT%/index.html
python -m http.server %PORT% --bind 127.0.0.1
if errorlevel 1 goto server_failed
exit /b 0

:server_failed
echo.
echo Failed to start the local server on port %PORT%.
echo.
pause
exit /b 1
