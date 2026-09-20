$h = @'
line1
line2
'@
$bytes = [System.Text.Encoding]::UTF8.GetBytes($h)
Write-Host ("here-string bytes: " + ($bytes -join ','))
Write-Host ("ps1 file bytes (head): ")
$raw = [System.IO.File]::ReadAllBytes("I:\pertanian\pertanian-2\scripts\_dbg-herestring.ps1")
Write-Host ($raw[0..40] -join ',')
