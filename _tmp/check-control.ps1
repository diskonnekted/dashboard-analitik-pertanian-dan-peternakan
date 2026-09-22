[IO.File]::WriteAllText('I:\pertanian\pertanian-2\_tmp\hc.json', '{"provider_id": "52f82ef9", "model": "gemini-3-7-flash"}', (New-Object System.Text.UTF8Encoding($false)))
$t0 = Get-Date
$r = (cmd /c '"C:\Program Files\AionUi\resources\bundled-aioncore\win32-x64\aioncore.exe" config providers health-check < I:\pertanian\pertanian-2\_tmp\hc.json') -join ' '
$dt = [int]((Get-Date) - $t0).TotalSeconds
"$r"
"wall-clock: ${dt}s"
