@echo off
:: Title and description
echo ==========================
echo Installing Dependencies
echo ==========================

:: Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

:: Install dependencies using npm
echo Installing npm dependencies...
npm install

:: Check for successful installation
if %errorlevel% neq 0 (
    echo Failed to install dependencies. Please check for errors and try again.
    pause
    exit /b
)

:: Success message
echo ==========================
echo Installation Complete!
echo ==========================
echo To start the program, run: 
echo    npm start
pause
