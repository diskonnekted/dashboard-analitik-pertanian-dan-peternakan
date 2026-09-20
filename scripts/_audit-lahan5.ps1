# 1) Seri tahunan sawah & bukan sawah resmi (tidy Distankan)
$csv = Import-Csv "I:\pertanian\pertanian-2\public\14. Distankan KP\tidy\Luas Penggunaan Lahan menurut Jenis Penggunaan (Ha)\Luas Penggunaan Lahan menurut Jenis Penggunaan (Ha) tidy.csv"
Write-Host '--- seri I. Lahan sawah ---'
$csv | Where-Object kategori -eq 'I. Lahan sawah' | Sort-Object {[int]$_.tahun} | ForEach-Object { "{0}: {1}" -f $_.tahun, $_.value }
Write-Host '--- seri II. Bukan lahan sawah ---'
$csv | Where-Object kategori -eq 'II. Bukan lahan sawah' | Sort-Object {[int]$_.tahun} | ForEach-Object { "{0}: {1}" -f $_.tahun, $_.value }

# 2) Simulasi bersih: buang 10 duplikat
$json = Get-Content "I:\pertanian\pertanian-2\public\data\lahan-fallback.json" -Raw | ConvertFrom-Json
$clean = $json | Where-Object {
  -not ($_.kecamatan -eq 'Purwarejaklampok') -and
  -not ($_.desa -eq 'PAGEALAK' -and $_.kecamatan -eq 'Madukara') -and
  -not ($_.desa -eq 'PURWODADI' -and $_.kecamatan -eq 'Karangkobar')
}
$s = ($clean | Measure-Object lahanSawah -Sum).Sum
$b = ($clean | Measure-Object lahanBukanSawah -Sum).Sum
Write-Host ''
Write-Host ("SETELAH HAPUS 10 DUPLIKAT -> rows={0}  sawah={1:N2}  bukan={2:N2}" -f $clean.Count, $s, $b)
Write-Host '--- per kecamatan (setelah bersih) ---'
$clean | Group-Object kecamatan | Sort-Object Name | ForEach-Object { "{0,-22} {1,3}" -f $_.Name, $_.Count }
