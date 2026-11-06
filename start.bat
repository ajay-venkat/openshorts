@echo off
title OpenShorts Launcher
echo ========================================================
echo               Starting OpenShorts Platform
echo ========================================================

:: Refresh PATH to include winget-installed tools like ffmpeg
set "PATH=%PATH%;%LOCALAPPDATA%\Microsoft\WinGet\Links;C:\Program Files\FFmpeg\bin"

echo [1/2] Launching Backend on http://localhost:8008 ...
start "OpenShorts Backend" cmd /k ".\venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8008"

echo [2/2] Launching Frontend on http://localhost:5175 ...
cd dashboard
start "OpenShorts Frontend" cmd /k "npm run dev"
cd ..

echo ========================================================
echo OpenShorts services are running!
echo Dashboard: http://localhost:5175
echo API Docs:  http://localhost:8008/docs
echo ========================================================
timeout /t 4 >nul
start http://localhost:5175

