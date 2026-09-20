$json = Get-Content "I:\pertanian\pertanian-2\public\data\lahan-fallback.json" -Raw | ConvertFrom-Json
$geo = Get-Content "I:\pertanian\pertanian-2\public\peta_desa_v3.geojson" -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "geojson features: $($geo.features.Count)"
Write-Host ("sample props keys: " + ($geo.features[0].properties.PSObject.Properties.Name -join ', '))

$geoNames = $geo.features | ForEach-Object {
  $p = $_.properties
  $n = $p.Nama_Desa_; if (-not $n) { $n = $p.Name }; if (-not $n) { $n = $p.nama_desa }; if (-not $n) { $n = $p.desa }
  if ($n) { $n.ToString().Trim().ToUpper() } else { "??" }
} | Sort-Object -Unique
Write-Host "geojson unique names: $($geoNames.Count)"

$jsonNames = $json | ForEach-Object { $_.desa.Trim().ToUpper() } | Sort-Object -Unique
Write-Host "json unique names  : $($jsonNames.Count)"

Write-Host '--- di JSON tapi TIDAK di geojson (kandidat salah eja/fiktif) ---'
Compare-Object $geoNames $jsonNames | Where-Object SideIndicator -eq '=>' | ForEach-Object InputObject

Write-Host '--- di geojson tapi TIDAK di JSON (desa tanpa data lahan) ---'
Compare-Object $geoNames $jsonNames | Where-Object SideIndicator -eq '<=' | ForEach-Object InputObject
