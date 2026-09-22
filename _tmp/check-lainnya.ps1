$modelList = @(
  'gpt-5.2',
  'gpt-5.2-chat-latest',
  'gpt-5.2-mini',
  'gpt-5.3',
  'gpt-5.3-chat-latest',
  'gpt-5.3-mini',
  'grok-4.1',
  'grok-4.1-fast',
  'grok-4.1-fast-reasoning',
  'grok-4.1-heavy',
  'grok-4.1-vision',
  'kimi-k3-thinking',
  'kimi-k3-hd',
  'minimax-m3',
  'qwen-3.5',
  'qwen-3.5-max',
  'qwen-3.5-turbo'
)
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
