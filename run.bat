@echo off
title ZeeLinks Asset Tracker Launcher
echo =================================================
echo   Starting ZeeLinks Asset Management Prototype
echo =================================================
echo.

REM Start Backend Server (port 5000) in a new window (cmd /k keeps window open on error)
start "ZeeLinks Backend" cmd /k "cd /d "%~dp0backend" && python app.py"

REM Wait 2 seconds so backend binds port 5000 before frontend starts
timeout /t 2 /nobreak >nul

REM Start Frontend React Dev Server (port 3000) in a new window
start "ZeeLinks Frontend" cmd /k "cd /d "%~dp0frontend" && npm start"

echo Both servers have been launched in separate windows:
echo   - Backend API : http://localhost:5000
echo   - Frontend UI : http://localhost:3000
echo.
echo Press any key to close this launcher window...
pause >nul
