$raw = [System.IO.File]::ReadAllText("I:\pertanian\pertanian-2\src\pages\index.tsx")
$lines = $raw -split "`n"
Write-Host ("TOTAL LINES: " + $lines.Count)
# temukan baris penting
for ($i = 0; $i -lt $lines.Count; $i++) {
  $l = $lines[$i]
  if ($l -match 'await fetch|setLahanData|setLahanResmi|Total Lahan Sawah|Lahan Bukan Sawah|Cakupan Wilayah|Total Desa|Luas Sawah|totalDesa|trend=|StatCard') {
    Write-Host ("{0,4}: {1}" -f ($i + 1), $l.TrimEnd("`r"))
  }
}
