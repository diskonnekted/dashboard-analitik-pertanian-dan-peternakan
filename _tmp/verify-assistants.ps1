$cli = 'C:\Program Files\AionUi\resources\bundled-aioncore\win32-x64\aioncore.exe'
$inFile = 'I:\pertanian\pertanian-2\_tmp\asst-in.json'
$enc = New-Object System.Text.UTF8Encoding($false)
$log = @()
$ids = @{
  'Sispertani Data BPS' = 'custom-1790041593426-8edd'
  'Sispertani Frontend' = 'custom-1790041594050-fa3d'
  'Sispertani Backend Deploy' = 'custom-1790041594818-8d6d'
  'Sispertani Docs Audit' = 'custom-1790041595495-01dd'
}
foreach ($name in $ids.Keys) {
  $id = $ids[$name]
  [IO.File]::WriteAllText($inFile, ('{"assistant_id": "' + $id + '"}'), $enc)
  $rr = (cmd /c ('"' + $cli + '" config assistants rule read < ' + $inFile)) -join ' '
  $rg = (cmd /c ('"' + $cli + '" config assistants get < ' + $inFile)) -join ' '
  $ruleLen = -1
  $modelVal = '?'
  $firstLine = ''
  try {
    $jr = $rr | ConvertFrom-Json
    $content = $jr.data.content
    if (-not $content -and $jr.data.rule) { $content = $jr.data.rule.content }
    if ($content) {
      $ruleLen = $content.Length
      $firstLine = ($content -split "`n")[0]
    }
  } catch {}
  try {
    $jg = $rg | ConvertFrom-Json
    if ($jg.data.defaults.model.value) { $modelVal = $jg.data.defaults.model.value }
  } catch {}
  $log += "${name}: model=$modelVal | rules=$ruleLen chars | baris1=$firstLine"
}
$log -join [char]10
