$json = Get-Content "I:\pertanian\pertanian-2\public\data\lahan-fallback.json" -Raw | ConvertFrom-Json
$geo = Get-Content "I:\pertanian\pertanian-2\public\peta_desa_v3.geojson" -Raw -Encoding UTF8 | ConvertFrom-Json

function Norm([string]$s) {
  $t = $s.ToUpper().Trim()
  $t = $t -replace '^DESA\s+', '' -replace '^KEL\.?\s*', '' -replace '^KELURAHAN\s+', ''
  $t = $t -replace '[\.\s]+', ''
  return $t
}

$geoNorm = $geo.features | ForEach-Object { Norm $_.properties.Nama_Desa_ } | Sort-Object -Unique
$jsonNorm = $json | ForEach-Object { Norm $_.desa } | Sort-Object -Unique
Write-Host "geojson norm unique: $($geoNorm.Count) | json norm unique: $($jsonNorm.Count)"

Write-Host '--- NORMALISASI: di JSON, TIDAK di geojson ---'
Compare-Object $geoNorm $jsonNorm | Where-Object SideIndicator -eq '=>' | ForEach-Object InputObject
Write-Host '--- NORMALISASI: di geojson, TIDAK di JSON ---'
Compare-Object $geoNorm $jsonNorm | Where-Object SideIndicator -eq '<=' | ForEach-Object InputObject

Write-Host '--- duplikat baris: nama+kec sama persis ---'
$json | Group-Object { (Norm $_.desa) + '|' + $_.kecamatan.ToUpper().Trim() } | Where-Object Count -gt 1 | ForEach-Object {
  $g = $_.Group[0]; "{0} | {1}  x{2}  (sawah: {3})" -f $g.desa, $g.kecamatan, $_.Count, ($_.Group | ForEach-Object lahanSawah) -join ', '
}

Write-Host '--- total & rata ---'
$sawah = ($json | Measure-Object lahanSawah -Sum).Sum
$bukan = ($json | Measure-Object lahanBukanSawah -Sum).Sum
Write-Host ("rows={0}  sawah={1:N1}  bukan={2:N1}" -f $json.Count, $sawah, $bukan)
