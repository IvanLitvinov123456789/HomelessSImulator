@echo off
setlocal
set "PORT=9290"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
exit /b 0
