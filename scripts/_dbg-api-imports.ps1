$raw = [System.IO.File]::ReadAllText("I:\pertanian\pertanian-2\src\services\api.ts")
Write-Host ("Papa import    : " + ($raw -match 'import Papa from "papaparse"'))
Write-Host ("withCache ada  : " + $raw.Contains("const withCache"))
Write-Host ("fetchWithTimeout: " + $raw.Contains("fetchWithTimeout"))
Write-Host ("getCachedData  : " + $raw.Contains("function getCachedData"))
Write-Host ("jumlah baris   : " + ([System.IO.File]::ReadAllLines("I:\pertanian\pertanian-2\src\services\api.ts")).Count)
# contoh fetcher CSV lokal yg asli (cari '14. Distankan KP')
$m = [regex]::Matches($raw, '14\. Distankan KP[^"'']*')
Write-Host "--- contoh path Distankan di api.ts ---"
$m | Select-Object -First 6 | ForEach-Object { $_.Value }
