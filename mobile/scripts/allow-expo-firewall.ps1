# Run PowerShell as Administrator, then:
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   .\scripts\allow-expo-firewall.ps1
#
# Allows phones on your Wi-Fi to reach Metro (8081) and the backend (5000).

$rules = @(
  @{ Name = 'WildPulse Expo Metro 8081'; Port = 8081 },
  @{ Name = 'WildPulse Backend API 5000'; Port = 5000 }
)

foreach ($r in $rules) {
  $existing = Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Rule already exists: $($r.Name)"
    continue
  }
  New-NetFirewallRule -DisplayName $r.Name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $r.Port | Out-Null
  Write-Host "Added firewall rule: $($r.Name) (TCP $($r.Port))"
}

Write-Host "Done. Restart expo with: npm run start:lan"
