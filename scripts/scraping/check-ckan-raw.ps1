# Dump semua baris tahun terbaru dari paket CKAN untuk audit satuan
param([Parameter(Mandatory=$true)][string]$Pkg, [int]$Tahun = 2025)
$CkanBase = 'https://opendata.banjarnegarakab.go.id'
$p = Invoke-RestMethod -Uri "$CkanBase/api/3/action/package_show?id=$Pkg" -TimeoutSec 60
$res = $p.result.resources | Where-Object { "$($_.datastore_active)" -ieq 'true' } | Select-Object -First 1
$d = Invoke-RestMethod -Uri "$CkanBase/api/3/action/datastore_search?resource_id=$($res.id)&limit=1000" -TimeoutSec 60
$recs = $d.result.records | Where-Object { "$($_.Tahun)" -eq "$Tahun" }
foreach ($r in $recs) {
  $desa = $r.'Desa/Kelurahan'; if (-not $desa) { $desa = $r.Desa }
  $sw = $r.'Lahan Sawah'; if ($null -eq $sw) { $sw = $r.'Lahan sawah' }
  $bs = $r.'Lahan Bukan Sawah'; if ($null -eq $bs) { $bs = $r.'Lahan bukan sawah' }
  '{0,-22} sawah={1,-14} bukan={2,-14} jumlah={3}' -f $desa, $sw, $bs, $r.Jumlah
}
