$modelList = @('claude-fable-5','claude-opus-4-8','claude-sonnet-4-6')
$out = @()
foreach ($m in $modelList) {
  [IO.File]::WriteAllText('I:\pertanian\pertanian-2\_tmp\hc.json', ('{"provider_id": "52f82ef9", "model": "' + $m + '"}'), (New-Object System.Text.UTF8Encoding($false)))
  $t0 = Get-Date
  $r = (cmd /c '"C:\Program Files\AionUi\resources\bundled-aioncore\win32-x64\aioncore.exe" config providers health-check < I:\pertanian\pertanian-2\_tmp\hc.json') -join ' '
  $dt = [int]((Get-Date) - $t0).TotalSeconds
  try {
    $j = $r | ConvertFrom-Json
    $st = $j.data.status
    if (-not $st) { $st = 'no-status' }
    $out += "$m => $st (${dt}s)"
  } catch {
    $out += "$m => RAW (${dt}s): $r"
  }
}
$out -join [char]10
