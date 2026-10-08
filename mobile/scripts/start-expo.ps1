# Expo start helper: LAN by default; -Tunnel when phone cannot reach PC.
param(
  [switch]$Tunnel,
  [switch]$Lan,
  [int]$Port = 8081
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' } |
  Select-Object -First 1).IPAddress

if ($ip) {
  $env:REACT_NATIVE_PACKAGER_HOSTNAME = $ip
  Write-Host "Packager hostname: $ip" -ForegroundColor Cyan
} else {
  Write-Host 'No LAN IPv4 found. Use -Tunnel or connect Wi-Fi.' -ForegroundColor Yellow
}

if ($Tunnel) {
  Write-Host 'Starting with tunnel (bypasses firewall, needs internet)...' -ForegroundColor Green
  npx expo start --tunnel --port $Port
} else {
  $profile = Get-NetConnectionProfile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($profile -and $profile.NetworkCategory -eq 'Public') {
    Write-Host ''
    Write-Host 'WARNING: Wi-Fi is Public. Phone may not reach Metro.' -ForegroundColor Red
    Write-Host 'Fix: Settings, Network, Wi-Fi, your network, Private network' -ForegroundColor Yellow
    Write-Host 'Or run as Admin: scripts\allow-expo-firewall.bat' -ForegroundColor Yellow
    Write-Host 'Or use: npm run start:tunnel' -ForegroundColor Yellow
    Write-Host ''
  }
  npx expo start --lan --port $Port
}
