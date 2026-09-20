$json = Get-Content "I:\pertanian\pertanian-2\public\data\lahan-fallback.json" -Raw | ConvertFrom-Json
$geo = Get-Content "I:\pertanian\pertanian-2\public\geojson\desa-banjarnegara-20kec.geojson" -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "geojson features: $($geo.features.Count)"

$geoNames = $geo.features | ForEach-Object {
  $n = $_.properties.Nama_Desa_
  if (-not $n) { $n = $_.properties.Name }
  $n.ToString().Trim().ToUpper()
} | Sort-Object -Unique
Write-Host "geojson unique names: $($geoNames.Count)"

$jsonNames = $json | ForEach-Object { $_.desa.Trim().ToUpper() } | Sort-Object -Unique
Write-Host "json unique names  : $($jsonNames.Count)"

Write-Host '--- di JSON tapi TIDAK di geojson (kandidat fiktif/salah eja) ---'
Compare-Object $geoNames $jsonNames | Where-Object SideIndicator -eq '=>' | ForEach-Object InputObject

Write-Host '--- di geojson tapi TIDAK di JSON (desa tanpa data lahan) ---'
Compare-Object $geoNames $jsonNames | Where-Object SideIndicator -eq '<=' | ForEach-Object InputObject

Write-Host '--- nama duplikat di JSON (nama sama >1 baris) ---'
$json | Group-Object { $_.desa.Trim().ToUpper() } | Where-Object Count -gt 1 | ForEach-Object { "{0} x{1}" -f $_.Name, $_.Count }
