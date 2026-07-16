param([switch]$StartNow, [switch]$SkipShortcuts, [string]$DestinationRoot = '')
$ErrorActionPreference = 'Stop'
$SourceRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$InstallRoot = if ($DestinationRoot) { [IO.Path]::GetFullPath($DestinationRoot) } else { Join-Path $env:LOCALAPPDATA 'WorkBuddyDreamSkin\app' }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 22 or newer is required.' }
$NodeMajor = [int]((& node --version).TrimStart('v').Split('.')[0])
if ($NodeMajor -lt 22) { throw 'Node.js 22 or newer is required.' }

if ([IO.Path]::GetFullPath($SourceRoot) -ne [IO.Path]::GetFullPath($InstallRoot)) {
  New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
  foreach ($Folder in @('assets', 'src', 'scripts', 'themes', 'editor')) {
    $Destination = Join-Path $InstallRoot $Folder
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    Copy-Item -Path (Join-Path $SourceRoot "$Folder\*") -Destination $Destination -Recurse -Force
  }
  foreach ($File in @('package.json', 'README.md')) {
    Copy-Item -LiteralPath (Join-Path $SourceRoot $File) -Destination (Join-Path $InstallRoot $File) -Force
  }
}

if (-not $SkipShortcuts) {
  $Desktop = [Environment]::GetFolderPath('Desktop')
  $Shell = New-Object -ComObject WScript.Shell
  $Items = @(
    @('WorkBuddy Dream Skin.lnk', 'script', 'start-workbuddy-dream-skin.ps1'),
    @('Choose WorkBuddy Theme.lnk', 'script', 'switch-workbuddy-theme.ps1'),
    @('Restore WorkBuddy.lnk', 'script', 'restore-workbuddy-dream-skin.ps1'),
    @('Dream Skin Editor.lnk', 'html', 'workbuddy-dream-skin-editor.html')
  )
  foreach ($Item in $Items) {
    $Shortcut = $Shell.CreateShortcut((Join-Path $Desktop $Item[0]))
    if ($Item[1] -eq 'html') {
      $Shortcut.TargetPath = Join-Path $InstallRoot "editor\$($Item[2])"
    } else {
      $Shortcut.TargetPath = 'powershell.exe'
      $ScriptPath = Join-Path $InstallRoot "scripts\$($Item[2])"
      $Extra = if ($Item[2] -eq 'start-workbuddy-dream-skin.ps1') { ' -RestartExisting' } else { '' }
      $Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`"$Extra"
    }
    $Shortcut.WorkingDirectory = $InstallRoot
    $Shortcut.Save()
  }
}
Write-Host "WorkBuddy Dream Skin installed at $InstallRoot"
if ($StartNow) { & (Join-Path $InstallRoot 'scripts\start-workbuddy-dream-skin.ps1') -RestartExisting }
