@echo off
setlocal
cd /d "%~dp0"
if not exist "index.html" (
  echo ERROR: index.html was not found.
  echo Extract the complete folder from the ZIP archive first.
  pause
  exit /b 1
)
start "" "%~dp0index.html"
exit /b 0
