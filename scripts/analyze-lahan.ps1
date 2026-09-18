param(
  [string]$Lahan = "public/data/lahan-fallback.json",
  [string]$Area  = "data-source/desa-area.json"
)
$lahan = Get-Content $Lahan -Raw -Encoding UTF8 | ConvertFrom-Json
$areaRaw = Get-Content $Area -Raw -Encoding UTF8 | ConvertFrom-Json

# desa-area.json -> dict key "KEC|DESA" (normalized) -> area (Ha)
$area = @{}
foreach ($k in ($areaRaw.PSObject.Properties)) {
  $area[$k.Name] = [double]$k.Value
}

function NormKey([string]$kec, [string]$desa) {
  $k = ("$kec" -replace '[^A-Za-z]','').ToUpper()
  $d = ("$desa" -replace '[^A-Za-z]','').ToUpper()
  return "$k|$d"
}

Write-Output ("desa count: " + $lahan.Count)
Write-Output ("--- DESA dengan jumlah > luas fisik (impossible) ---")
$flagged = 0
foreach ($d in $lahan) {
  $key = NormKey $d.kecamatan $d.desa
  $phys = $area[$key]
  if ($null -eq $phys) { $phys = -1 }
  $jumlah = [double]$d.jumlah
  if ($phys -gt 0 -and $jumlah -gt ($phys * 1.2)) {
    $flagged++
    $ratio = [math]::Round($jumlah / $phys, 2)
    Write-Output ("{0,-16} {1,-22} jumlah={2,10:N1} fisik={3,8:N1} rasio={4,5:N1}x  (sawah={5}, bsawah={6})" -f $d.kecamatan, $d.desa, $jumlah, $phys, $ratio, $d.lahanSawah, $d.lahanBukanSawah)
  }
}
Write-Output ("flagged = " + $flagged)
Write-Output ("--- DESA tanpa data luas fisik (key tidak cocok) ---")
foreach ($d in $lahan) {
  $key = NormKey $d.kecamatan $d.desa
  $phys = $area[$key]
  if ($null -eq $phys) {
    Write-Output ("{0,-16} {1,-22} jumlah={2}" -f $d.kecamatan, $d.desa, $d.jumlah)
  }
}
