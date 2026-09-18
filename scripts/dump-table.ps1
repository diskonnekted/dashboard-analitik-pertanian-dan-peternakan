param([string]$File)
$c = Get-Content $File -Raw
$j = $c | ConvertFrom-Json
foreach ($r in $j) {
  $desa = $r.'Desa/Kelurahan'
  $sawah = $r.'Lahan Sawah'
  $bsawah = $r.'Lahan Bukan Sawah'
  $jumlah = $r.'Jumlah'
  $thn = $r.'Tahun'
  Write-Output ("$desa | sawah=$sawah | bsawah=$bsawah | jumlah=$jumlah | thn=$thn")
}
