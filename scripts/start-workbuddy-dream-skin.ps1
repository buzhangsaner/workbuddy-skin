param([int]$Port = 9336, [string]$ThemeId = 'pink-custom', [switch]$RestartExisting, [switch]$Once)
$ErrorActionPreference = 'Stop'
$ForceTheme = $PSBoundParameters.ContainsKey('ThemeId')
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Exe = Join-Path $env:LOCALAPPDATA 'Programs\WorkBuddy\WorkBuddy.exe'
if (-not (Test-Path -LiteralPath $Exe)) { throw 'WorkBuddy.exe was not found.' }
$BundledNode = Join-Path $Root 'runtime\node.exe'
$SystemNode = Get-Command node -ErrorAction SilentlyContinue
$Node = if (Test-Path -LiteralPath $BundledNode) { $BundledNode } elseif ($SystemNode) { $SystemNode.Source } else { $null }
if (-not $Node) { throw 'Node.js 22 or newer is required.' }
$NodeMajor = [int]((& $Node --version).TrimStart('v').Split('.')[0])
if ($NodeMajor -lt 22) { throw 'Node.js 22 or newer is required.' }
function Test-Debugger { try { $null = Invoke-RestMethod "http://127.0.0.1:$Port/json/list" -TimeoutSec 2; return $true } catch { return $false } }
if (-not (Test-Debugger)) {
  $Running = Get-Process WorkBuddy -ErrorAction SilentlyContinue
  if ($Running -and -not $RestartExisting) { throw 'WorkBuddy is running. Exit it first or use -RestartExisting.' }
  if ($Running) { $Running | Stop-Process; Start-Sleep -Seconds 2 }
  $OldPort = $env:WORKBUDDY_REMOTE_DEBUGGING_PORT
  $env:WORKBUDDY_REMOTE_DEBUGGING_PORT = "$Port"
  try { Start-Process -FilePath $Exe -ArgumentList "--remote-debugging-address=127.0.0.1" }
  finally { $env:WORKBUDDY_REMOTE_DEBUGGING_PORT = $OldPort }
  for ($i = 0; $i -lt 30 -and -not (Test-Debugger); $i++) { Start-Sleep -Milliseconds 500 }
}
if (-not (Test-Debugger)) { throw 'The WorkBuddy debugging endpoint is not ready.' }
$Injector = Join-Path $Root 'scripts\injector.mjs'
$ThemeDir = Join-Path $Root "themes\$ThemeId"
if (-not (Test-Path -LiteralPath (Join-Path $ThemeDir 'theme.json'))) { throw 'The selected Dream Skin theme was not found.' }
$EscapedInjector = [regex]::Escape($Injector)
Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match $EscapedInjector } | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
$ApplyArgs = @($Injector, '--port', "$Port", '--theme-dir', $ThemeDir, '--once')
if (-not $ForceTheme) { $ApplyArgs += '--respect-selection' }
& $Node @ApplyArgs
if ($LASTEXITCODE -ne 0) { throw 'Dream Skin initial injection failed.' }
if (-not $Once) {
  $WatchArgs = @($Injector, '--port', "$Port", '--theme-dir', $ThemeDir, '--respect-selection')
  Start-Process -FilePath $Node -ArgumentList $WatchArgs -WindowStyle Hidden
}
Write-Host 'WorkBuddy Dream Skin started.'
