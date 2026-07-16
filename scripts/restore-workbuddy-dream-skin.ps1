param([int]$Port = 9336)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Injector = Join-Path $Root 'scripts\injector.mjs'
$Escaped = [regex]::Escape($Injector)
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -match $Escaped } | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
Start-Sleep -Milliseconds 300
try { & node $Injector --port $Port --remove --once | Out-Host } catch { Write-Warning 'WorkBuddy is offline; its next normal launch will use the original skin.' }
Write-Host 'Dream Skin stopped and removed.'
