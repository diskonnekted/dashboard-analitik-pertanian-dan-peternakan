$raw = [System.IO.File]::ReadAllText("I:\pertanian\pertanian-2\src\components\MapWidget.tsx")
$j = $raw.IndexOf("{/* --- TOP RIGHT: Search Bar --- */}")
if ($j -lt 0) { $j = $raw.IndexOf("Search Bar") }
Write-Host "idx: $j"
$seg = $raw.Substring($j, 900)
# tampilkan dengan marker newline & tab
$vis = $seg -replace "`r", "<CR>" -replace "`n", "<LF>`n" -replace "`t", "<TAB>"
Write-Host $vis
