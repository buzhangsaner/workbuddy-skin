param([string]$ThemeId = '')
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$CatalogPath = Join-Path $Root 'themes\catalog.json'
$ParsedCatalog = Get-Content -LiteralPath $CatalogPath -Raw -Encoding UTF8 | ConvertFrom-Json
$Catalog = @()
foreach ($Entry in $ParsedCatalog) { $Catalog += $Entry }

if (-not $ThemeId) {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  $Form = New-Object System.Windows.Forms.Form
  $Form.Text = 'Choose WorkBuddy Theme'
  $Form.StartPosition = 'CenterScreen'
  $Form.Size = New-Object System.Drawing.Size(520, 420)
  $Form.FormBorderStyle = 'FixedDialog'
  $Form.MaximizeBox = $false
  $Label = New-Object System.Windows.Forms.Label
  $Label.Text = 'Select one of the fifteen Codex Dream Skin themes:'
  $Label.SetBounds(20, 18, 470, 24)
  $List = New-Object System.Windows.Forms.ListBox
  $List.SetBounds(20, 50, 465, 270)
  $List.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 11)
  foreach ($Item in $Catalog) { [void]$List.Items.Add("$($Item.name)  -  $($Item.description)") }
  $List.SelectedIndex = 0
  $Apply = New-Object System.Windows.Forms.Button
  $Apply.Text = 'Apply Theme'
  $Apply.SetBounds(280, 335, 100, 32)
  $Apply.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $Cancel = New-Object System.Windows.Forms.Button
  $Cancel.Text = 'Cancel'
  $Cancel.SetBounds(385, 335, 100, 32)
  $Cancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
  $Form.Controls.AddRange(@($Label, $List, $Apply, $Cancel))
  $Form.AcceptButton = $Apply
  $Form.CancelButton = $Cancel
  if ($Form.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { exit 0 }
  $ThemeId = $Catalog[$List.SelectedIndex].id
}

$Selected = $Catalog | Where-Object { $_.id -eq $ThemeId } | Select-Object -First 1
if (-not $Selected) { throw "Unknown WorkBuddy theme: $ThemeId" }
& (Join-Path $Root 'scripts\start-workbuddy-dream-skin.ps1') -ThemeId $ThemeId -RestartExisting
Write-Host "Applied theme: $($Selected.name)"
