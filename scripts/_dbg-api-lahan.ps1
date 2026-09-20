$raw = [System.IO.File]::ReadAllText("I:\pertanian\pertanian-2\src\services\api.ts")
$i = $raw.IndexOf("lahan-fallback")
Write-Host "idx lahan-fallback: $i"
if ($i -ge 0) {
  $seg = $raw.Substring([Math]::Max(0, $i - 60), 400)
  Write-Host ("SEG: [" + ($seg -replace "`r", "<CR>" -replace "`n", "<LF>`n") + "]")
}
$j = $raw.IndexOf("fetchAsetLahan")
Write-Host "idx fetchAsetLahan: $j"
if ($j -ge 0) {
  $seg2 = $raw.Substring([Math]::Max(0, $j - 120), 300)
  Write-Host ("SEG2: [" + ($seg2 -replace "`r", "<CR>" -replace "`n", "<LF>`n") + "]")
}
# cari fetchLahanBanjarnegara
$k = $raw.IndexOf("fetchLahanBanjarnegara")
Write-Host "idx fetchLahanBanjarnegara: $k"
