@echo off
REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed.
    echo Attempting to install Node.js using Chocolatey...
    REM Check if Chocolatey is installed
    choco --version >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo Chocolatey is not installed.
        echo Please install Node.js manually from https://nodejs.org/ or install Chocolatey first.
        pause
        exit /b
    ) else (
        REM Install Node.js silently
        choco install -y nodejs
        REM After installation, refresh the PATH (the user may need to open a new terminal if issues persist)
    )
) else (
    echo Node.js is installed.
)

echo Installing dependencies...
npm install

echo Starting Express server...
REM Replace "server.js" with the actual path if your server file has a different name.
start cmd /k "node server.js"

REM Wait a few seconds for the server to start
timeout /t 3 >nul

echo Starting React client...
start cmd /k "npm start"

REM Allow time for the client to boot before opening the browser
timeout /t 5 >nul

echo Opening client in browser...
start http://localhost:3000

echo Opening server endpoint in browser...
start http://localhost:3001/cars

pause