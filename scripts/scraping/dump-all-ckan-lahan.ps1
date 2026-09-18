# Dump baris mentah SEMUA paket CKAN lahan (tahun terbaru) untuk audit satuan
$CkanBase = 'https://opendata.banjarnegarakab.go.id'
$resources = [ordered]@{
  'Banjarnegara' = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-banjarnegara'
  'Batur'        = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-batur'
  'Bawang'       = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kecamatan-bawang'
  'Punggelan'    = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-punggelan'
  'Wanayasa'     = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-wanayasa'
  'Pandanarum'   = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kecamatan-pandanarum'
  'Pagedongan'   = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kecamatan-pagedongan'
  'Mandiraja'    = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-mandiraja'
  'Susukan'      = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-susukan'
  'Pagentan'     = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kecamatan-pagentan'
  'Pejawaran'    = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-pejawaran-th-2023-2025'
  'Wanadadi'     = 'luas-lahan-sawah-menurut-jenis-tanah-dan-desa-kelurahan-di-kecamatan-wanadadi'
  'Purwanegara'  = 'data-luas-lahan-pertanian-di-kecamatan-purwanegara'
}
foreach ($kec in $resources.Keys) {
  "=== $kec ==="
  try {
    $p = Invoke-RestMethod -Uri "$CkanBase/api/3/action/package_show?id=$($resources[$kec])" -TimeoutSec 60
    $res = $p.result.resources | Where-Object { "$($_.datastore_active)" -ieq 'true' } | Select-Object -First 1
    $d = Invoke-RestMethod -Uri "$CkanBase/api/3/action/datastore_search?resource_id=$($res.id)&limit=1000" -TimeoutSec 60
    $recs = $d.result.records
    $maxTahun = ($recs | ForEach-Object { [int]"$($_.Tahun)" } | Measure-Object -Maximum).Maximum
    foreach ($r in ($recs | Where-Object { [int]"$($_.Tahun)" -eq $maxTahun })) {
      $desa = $r.'Desa/Kelurahan'; if (-not $desa) { $desa = $r.Desa }
      $sw = $r.'Lahan Sawah'; if ($null -eq $sw) { $sw = $r.'Lahan sawah' }
      $bs = $r.'Lahan Bukan Sawah'; if ($null -eq $bs) { $bs = $r.'Lahan bukan sawah' }
      '{0,-24} sawah={1,-14} bukan={2,-14} jumlah={3}' -f $desa, $sw, $bs, $r.Jumlah
    }
  } catch { "  ERROR: $($_.Exception.Message)" }
}
