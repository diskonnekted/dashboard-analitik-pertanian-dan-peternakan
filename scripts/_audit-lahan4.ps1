$json = Get-Content "I:\pertanian\pertanian-2\public\data\lahan-fallback.json" -Raw | ConvertFrom-Json

$targets = 'PAGEALAK','PAGELAK','KARANTENGAH','KARANGTENGAH','PEGUNDUNGAN','PEKIKIRAN','PAKIKIRAN','PAGERGUNUNG','PEGERGUNUNG','PENARUSAN KULON','PENARUSAN WETAN','PUCUNGBEDUG','PUCUNGBEDUK','PURWODADI','PURWADADI','SARWODADI','SARWADADI','SINGAMERTA','SINGOMERTO','GUMINGSIR','PURWONEGORO','PURWANEGARA'
Write-Host '--- baris JSON untuk nama-nama varian ---'
$json | Where-Object { $targets -contains $_.desa.Trim().ToUpper() } | ForEach-Object { "{0,-22} | {1,-18} | sawah={2,9} | bukan={3,9}" -f $_.desa, $_.kecamatan, $_.lahanSawah, $_.lahanBukanSawah }

Write-Host ''
Write-Host '--- total resmi tidy Luas Penggunaan Lahan ---'
$csv = Import-Csv "I:\pertanian\pertanian-2\public\14. Distankan KP\tidy\Luas Penggunaan Lahan menurut Jenis Penggunaan (Ha)\Luas Penggunaan Lahan menurut Jenis Penggunaan (Ha) tidy.csv"
$csv | Group-Object kategori | ForEach-Object { $latest = $_.Group | Sort-Object {[int]$_.tahun} | Select-Object -Last 1; "{0,-45} tahun {1} = {2}" -f $_.Name, $latest.tahun, $latest.value }
