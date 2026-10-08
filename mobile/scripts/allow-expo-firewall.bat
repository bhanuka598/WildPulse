@echo off
net session >nul 2>&1
if %errorLevel% neq 0 (
  echo Requesting Administrator...
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

netsh advfirewall firewall add rule name="WildPulse Expo Metro 8081" dir=in action=allow protocol=TCP localport=8081
netsh advfirewall firewall add rule name="WildPulse Backend API 5000" dir=in action=allow protocol=TCP localport=5000

powershell -NoProfile -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private" 2>nul

echo.
echo Also enable Node.js in Windows Firewall:
echo   Win+R -^> firewall.cpl -^> Allow an app -^> Node.js (Private + Public)
echo.
echo Done. Press any key to close.
pause >nul
