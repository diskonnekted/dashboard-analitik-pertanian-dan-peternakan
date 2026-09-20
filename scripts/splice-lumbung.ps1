param()

$apiPath = "I:\pertanian\pertanian-2\src\services\api.ts"
$funcPath = "I:\pertanian\pertanian-2\scripts\new-lumbung-func.txt"

$raw = [System.IO.File]::ReadAllText($apiPath)
$newLines = [System.IO.File]::ReadAllLines($funcPath)
$newFunc = ($newLines -join "`r`n")

$startMarker = "// Data lumbung & gudang pangan."
$sigMarker = "export const fetchLumbungPangan"
$endMarker = "export interface MarketData"

$start = $raw.IndexOf($startMarker)
if ($start -lt 0) { $start = $raw.IndexOf($sigMarker) }
if ($start -lt 0) { Write-Error "start marker tidak ditemukan"; exit 1 }

# mundur ke awal baris
while ($start -gt 0 -and $raw[$start-1] -ne "`n") { $start-- }

$end = $raw.IndexOf($endMarker, $start)
if ($end -lt 0) { Write-Error "end marker tidak ditemukan"; exit 1 }
# mundur ke awal baris endMarker
while ($end -gt 0 -and $raw[$end-1] -ne "`n") { $end-- }

$before = $raw.Substring(0, $start)
$after = $raw.Substring($end)

# pastikan ada tepat satu baris kosong sebelum endMarker
$replacement = $newFunc + "`r`n`r`n"

$result = $before + $replacement + $after
[System.IO.File]::WriteAllText($apiPath, $result, (New-Object System.Text.UTF8Encoding($false)))

Write-Output ("OK. start=" + $start + " end=" + $end + " panjang-baru=" + $result.Length)
