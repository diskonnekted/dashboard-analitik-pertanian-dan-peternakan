$base = "I:\pertanian\pertanian-2\public\14. Distankan KP"

function Clean-Num([string]$v) {
    if ([string]::IsNullOrWhiteSpace($v)) { return 0.0 }
    $c = $v.Trim().Trim('"').Trim() -replace '\s', ''
    if ($c -match ',') { $c = $c -replace ',', '' }
    $n = 0.0; [double]::TryParse($c, [ref]$n) | Out-Null; return $n
}

# 1. PADI 2022 (Sawah+Ladang CSV, tanpa baris Jumlah)
$padi = Import-Csv "$base\Luas  Panen,  Produksi dan Rata-rata Produksi\Luas Panen, Produksi dan Rata-rata Produksi Padi Sawah Dan Padi Ladang CSV.csv"
$p22 = $padi | Where-Object { $_.Tahun -eq '2022' -and $_.Kecamatan -notmatch 'Jumlah' }
$totPadi = 0.0; foreach ($r in $p22) { $totPadi += (Clean-Num $r.'Produksi Padi Sawah (Ton)') + (Clean-Num $r.'Produksi Padi Ladang(Ton)') }
"PADI 2022 (n=$($p22.Count)): $([Math]::Round($totPadi,2)) Ton  | klaim halaman: 170.806"

# 2. SAPI 2022 (tanpa baris Jumlah)
$tb = Import-Csv "$base\Jumlah Ternak Besar Menurut Kecamatan dan Jenis Ternak\Jumlah Ternak Besar Menurut Kecamatan dan Jenis Ternak CSV.csv"
$tb22 = $tb | Where-Object { $_.Tahun -eq '2022' -and $_.Kecamatan -notmatch 'Jumlah' }
$sapi = 0.0; $perah = 0.0; foreach ($r in $tb22) { $sapi += Clean-Num $r.'Sapi'; $perah += Clean-Num $r.'Sapi Perah' }
"SAPI 2022 (n=$($tb22.Count)): Sapi=$sapi + Perah=$perah = $($sapi+$perah) Ekor | klaim halaman: 30.270"

# 3. KAMBING+DOMBA 2022 (tanpa baris Jumlah)
$tk = Import-Csv "$base\Jumlah  Ternak Kecil Menurut Kecamatan dan Jenis Ternak\Jumlah  Ternak Kecil Menurut Kecamatan dan Jenis Ternak CSV.csv"
$tk22 = $tk | Where-Object { $_.Tahun -eq '2022' -and $_.Kecamatan -notmatch 'Jumlah' }
$kamb = 0.0; $dom = 0.0; foreach ($r in $tk22) { $kamb += Clean-Num $r.'Kambing'; $dom += Clean-Num $r.'Domba' }
"KAMBING+DOMBA 2022 (n=$($tk22.Count)): $kamb + $([Math]::Round($dom,2)) = $([Math]::Round($kamb+$dom,2)) Ekor | klaim halaman: 303.490"

# 4. PERIKANAN BUDIDAYA 2022 (tanpa baris Jumlah) + breakdown per jenis
$pb = Import-Csv "$base\Produksi dan Nilai Produksi Perikanan Budidaya Menurut Kecamatan dan Jenis Budidaya\Produksi dan Nilai Produksi Perikanan Budidaya Menurut Kecamatan dan Jenis Budidaya CSV.csv"
"baris budidaya 2022 (semua): $(($pb | Where-Object { $_.Tahun -eq '2022' }).Count)"
$pb22 = $pb | Where-Object { $_.Tahun -eq '2022' -and $_.Kecamatan -notmatch 'Jumlah' }
$pem = 0.0; $kja = 0.0; $minap = 0.0
foreach ($r in $pb22) {
    $pem += Clean-Num $r.'Pembesaran Produksi (Kg)'
    $kja += Clean-Num $r.'Karamba Jaring Apung Produksi (Kg)'
    $minap += Clean-Num $r.'Minapadi Tumpang Sari Produksi (Kg)'
}
"BUDIDAYA 2022 (n=$($pb22.Count)): Pembesaran=$([Math]::Round($pem/1000,3))T + KJA=$([Math]::Round($kja/1000,3))T + Minapadi=$([Math]::Round($minap/1000,3))T = $([Math]::Round(($pem+$kja+$minap)/1000,3)) Ton | klaim halaman: 24.364"
