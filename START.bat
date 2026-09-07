@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  npm install
)
echo.
echo Starting CATSMARKET...
npm start
pause
