param([int]$Port = 9336, [string]$Screenshot = '')
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Args = @((Join-Path $Root 'scripts\injector.mjs'), '--port', "$Port", '--verify', '--once')
if ($Screenshot) { $Args += @('--screenshot', $Screenshot) }
& node @Args
if ($LASTEXITCODE -ne 0) { throw 'Dream Skin 验证失败' }
