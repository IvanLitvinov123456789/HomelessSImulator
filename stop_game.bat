@echo off
setlocal
set "PORT=8765"
set "FOUND=0"
for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  taskkill /PID %%P /F >nul 2>&1
  set "FOUND=1"
)
if "%FOUND%"=="1" (
  echo Local game server stopped.
) else (
  echo No local game server is running.
)
pause
