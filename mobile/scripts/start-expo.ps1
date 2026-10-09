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

# A LAN hostname during --tunnel makes Expo Go download the bundle from
# 192.168.x.x. That fails on a Public Wi-Fi profile with
# "Failed to download remote update".
if ($Tunnel) {
  Remove-Item Env:REACT_NATIVE_PACKAGER_HOSTNAME -ErrorAction SilentlyContinue
} elseif ($ip) {
  $env:REACT_NATIVE_PACKAGER_HOSTNAME = $ip
  Write-Host "Packager hostname: $ip" -ForegroundColor Cyan
} else {
  Write-Host 'No LAN IPv4 found. Use -Tunnel or connect Wi-Fi.' -ForegroundColor Yellow
}

if ($Tunnel) {
  # ngrok on exp.direct answers only on HTTPS. Expo Go turns exp:// into http://
  # and the download hangs. exps:// makes Expo Go use https://.
  & node (Join-Path $PSScriptRoot 'patch-tunnel-https.js')
  Write-Host 'Starting with tunnel (bypasses firewall, needs internet)...' -ForegroundColor Green
  Write-Host 'Scan the exps:// QR. An exp:// URL will fail on this tunnel.' -ForegroundColor Yellow
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
