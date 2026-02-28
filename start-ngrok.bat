@echo off
echo Starting ngrok tunnel for port 5001...
echo.

REM Kill existing ngrok processes  
taskkill /F /IM ngrok.exe /T 2>nul
timeout /t 2 /nobreak

REM Start ngrok
start "" ngrok http 5001

echo.
echo Waiting for ngrok to start...
timeout /t 5 /nobreak

echo.
echo Opening ngrok dashboard at http://localhost:4040
echo Look for the "Forwarding" URL that looks like: https://xxxx-xx-xxx-xxx-x.ngrok.io
echo.
start http://localhost:4040

pause
