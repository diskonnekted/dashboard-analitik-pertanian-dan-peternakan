<#
.SYNOPSIS
  Rebuild public/data/lahan-fallback.json dari dataset resmi CKAN opendata.banjarnegarakab.go.id

.DESCRIPTION
  Sumber: dataset "Luas Lahan Pertanian Menurut Jenis Tanah dan Desa" per kecamatan (2025,
  beberapa kecamatan hanya punya 2023). Karangkobar & Madukara TIDAK punya dataset resmi
  per-desa -> baris lamanya dipertahankan apa adanya (rincian sawah/ladang tidak tersedia).

  Cara pakai (dev server Vite harus jalan agar proxy CKAN aktif):
    powershell -File scripts/build-lahan-fallback.ps1 [-CkanBase "http://localhost:5173"]
#>
param(
  [string]$CkanBase = "http://localhost:5173",
  [string]$OutFile  = "public/data/lahan-fallback.json"
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

# --- Parser angka tahan-format-campur (dataset CKAN tidak konsisten):
#     "1.234,56" -> 1234.56 | "726,78" -> 726.78 | "1.153" -> 1153 (ribuan)
#     "94.81" -> 94.81 (desimal) | "88" -> 88
function Parse-Num($v) {
  if ($null -eq $v) { return 0.0 }
  if ($v -is [double] -or $v -is [int] -or $v -is [long] -or $v -is [decimal]) { return [double]$v }
  $s = "$v".Trim()
  if ($s -eq '' -or $s -eq '-') { return 0.0 }
  $hasDot = $s.Contains('.'); $hasComma = $s.Contains(',')
  if ($hasDot -and $hasComma) {
    # Format Indonesia: titik=ribuan, koma=desimal
    $s = $s -replace '\.', '' -replace ',', '.'
  } elseif ($hasComma) {
    $s = $s -replace ',', '.'
  } elseif ($hasDot) {
    if ($s -match '^\d{1,3}(\.\d{3})+$') { $s = $s -replace '\.', '' }  # ribuan: "1.153"
    # selain itu anggap titik = desimal: "94.81"
  }
  $d = 0.0
  [void][double]::TryParse($s, [System.Globalization.NumberStyles]::Any,
    [System.Globalization.CultureInfo]::InvariantCulture, [ref]$d)
  return $d
}

# --- Perbaikan korupsi desimal DI SUMBER CKAN: banyak sel kehilangan koma/pembagi desimal.
#     Data BPS "luas lahan" satuannya Hektar, tapi saat entry nilainya sering jadi:
#       * bilangan bulat 6+ digit  = m2 yang lupa dibagi 10000   (mis. "911000" -> 91,1 Ha)
#       * bilangan bulat 4-5 digit = koma desimal hilang          (mis. "1800" -> 1,8 Ha; "3652" -> 3,652)
#       * bilangan bulat < 1000    = sudah Ha                     (mis. "40" -> 40 Ha)
$script:normalizedCount = 0
function Fix-Corrupt([double]$v) {
  if ($v -eq [math]::Floor($v)) {
    if ($v -ge 100000) {
      $script:normalizedCount++
      return [math]::Round($v / 10000, 4)
    }
    if ($v -ge 1000) {
      $script:normalizedCount++
      return [math]::Round($v / 1000, 3)
    }
  }
  return $v
}

# --- Nama desa dari kolom yang bervariasi antar dataset
function Get-DesaName($r) {
  foreach ($f in @('Desa/Kelurahan','Desa','desa','DESA','Nama Desa','Kelurahan')) {
    $val = $r.PSObject.Properties[$f]
    if ($val -and "$($val.Value)".Trim() -ne '') { return "$($val.Value)".Trim().ToUpper() }
  }
  return $null
}

# --- Ambil nilai kolom: prioritaskan kecocokan persis, lalu case-insensitive
#     (CSV Sigaluh punya kolom ganda "Lahan sawah"=sampah vs "Lahan Sawah"=asli)
function Get-Field($r, [string[]]$names) {
  foreach ($n in $names) {
    $prop = $r.PSObject.Properties[$n]
    if ($prop) { return $prop.Value }
  }
  foreach ($n in $names) {
    $prop = $r.PSObject.Properties | Where-Object { $_.Name -ieq $n } | Select-Object -First 1
    if ($prop) { return $prop.Value }
  }
  return $null
}

# --- Kecamatan -> sumber data CKAN (package name; resource datastore dipilih otomatis)
$resources = [ordered]@{
  'Pandanarum'   = @{ pkg = '5-1-luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-pandanarum' }
  'Batur'        = @{ pkg = '5-1-luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-batur' }
  'Punggelan'    = @{ pkg = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-punggelan' }
  'Pagedongan'   = @{ pkg = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-pagedongan' }
  'Wanayasa'     = @{ pkg = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kecamatan-wanayasa' }
  'Bawang'       = @{ pkg = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-bawang' }
  'Banjarnegara' = @{ pkg = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-banjarnegara' }
  'Mandiraja'    = @{ pkg = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-mandiraja' }
  'Susukan'      = @{ pkg = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-susukan' }
  'Pagentan'     = @{ pkg = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kecamatan-pagentan' }
  'Pejawaran'    = @{ pkg = 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-pejawaran-th-2023-2025' }
  'Wanadadi'     = @{ pkg = 'luas-lahan-sawah-menurut-jenis-tanah-dan-desa-kelurahan-di-kecamatan-wanadadi' }
  'Purwanegara'  = @{ pkg = 'data-luas-lahan-pertanian-di-kecamatan-purwanegara' }
  # Datastore Sigaluh & Rakit kosong di server -> unduh CSV-nya langsung
  'Sigaluh'      = @{ csv = "$CkanBase/dataset/b158fb6e-dab1-47e2-878c-6f8b61a9a96e/resource/54b2c0c8-7f15-4b44-b712-50bad4fef662/download/5.1-luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-sigaluh.csv" }
  'Rakit'        = @{ csv = "$CkanBase/dataset/66ce11c0-bad1-4025-86b3-cdd0d0413197/resource/0711d33c-e1b4-404a-a243-725eb48740fa/download/5.1-luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kecamatan-rakit.csv" }
}

function Get-Records($entry) {
  if ($entry.pkg) {
    $p = Invoke-RestMethod -Uri "$CkanBase/api/3/action/package_show?id=$($entry.pkg)" -TimeoutSec 60
    $res = $p.result.resources | Where-Object { "$($_.datastore_active)" -ieq 'true' } | Select-Object -First 1
    if (-not $res) { throw "Tidak ada resource datastore aktif" }
    $d = Invoke-RestMethod -Uri "$CkanBase/api/3/action/datastore_search?resource_id=$($res.id)&limit=1000" -TimeoutSec 60
    return $d.result.records
  }
  $tmp = Join-Path $env:TEMP ("lahan-" + [guid]::NewGuid() + ".csv")
  Invoke-WebRequest -Uri $entry.csv -OutFile $tmp -UseBasicParsing -TimeoutSec 60
  $rows = Import-Csv $tmp -Delimiter ';'
  Remove-Item $tmp -Force
  return $rows
}

$kecamatanOrder = @(
  'Banjarnegara','Banjarmangu','Batur','Bawang','Kalibening','Karangkobar','Madukara',
  'Mandiraja','Pagedongan','Pagentan','Pandanarum','Pejawaran','Punggelan','Purwanegara',
  'Purwareja Klampok','Rakit','Sigaluh','Susukan','Wanadadi','Wanayasa'
)

$result = @()
$report = @()

foreach ($kec in $resources.Keys) {
  try {
    $records = Get-Records $resources[$kec]
    if (-not $records) { throw "0 record" }

    # Ambil tahun terbaru per desa
    $byDesa = @{}
    foreach ($r in $records) {
      $desa = Get-DesaName $r
      if (-not $desa) { continue }
      $tahun = [int](Parse-Num (Get-Field $r @('Tahun','tahun','TAHUN')))
      if (-not $byDesa.ContainsKey($desa) -or $byDesa[$desa].tahun -lt $tahun) {
        $byDesa[$desa] = @{
          desa       = $desa
          kecamatan  = $kec
          sawah      = Fix-Corrupt ([math]::Round((Parse-Num (Get-Field $r @('Lahan Sawah','Lahan sawah','Sawah'))), 3))
          bukanSawah = Fix-Corrupt ([math]::Round((Parse-Num (Get-Field $r @('Lahan Bukan Sawah','Lahan bukan sawah','Bukan Sawah'))), 3))
          tahun      = $tahun
        }
      }
    }

    foreach ($desa in ($byDesa.Keys | Sort-Object)) {
      $e = $byDesa[$desa]
      $result += [ordered]@{
        desa            = $e.desa
        kecamatan       = $e.kecamatan
        lahanSawah      = $e.sawah
        lahanBukanSawah = $e.bukanSawah
        jumlah          = [math]::Round($e.sawah + $e.bukanSawah, 3)
        tahun           = $e.tahun
      }
    }
    $tahunDipakai = ($byDesa.Values | ForEach-Object tahun | Sort-Object -Unique) -join ','
    $report += [pscustomobject]@{ Kecamatan = $kec; Desa = $byDesa.Count; Tahun = $tahunDipakai; Sumber = 'CKAN' }
  } catch {
    $report += [pscustomobject]@{ Kecamatan = $kec; Desa = 0; Tahun = '-'; Sumber = "GAGAL: $($_.Exception.Message)" }
  }
}

# --- Sumber tambahan: hasil ekstraksi PDF Sensus Pertanian 2023 (ST2023) per kecamatan
#     (hasil scripts/scraping/extract-st2023-lahan.py -> data-source/lahan-st2023-*.json)
#     Dipakai untuk kecamatan yang TIDAK punya dataset CKAN (Kalibening, Banjarmangu,
#     Purwareja Klampok, dst). Jika suatu kecamatan punya file ST2023, ia MENANG atas
#     fallback lama yang tidak terverifikasi.
$st2023Covered = @()
foreach ($f in (Get-ChildItem "data-source/lahan-st2023-*.json" -ErrorAction SilentlyContinue)) {
  $extra = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($e in $extra) {
    $kec = "$($e.kecamatan)"
    if ($resources.Contains($kec)) { continue }   # CKAN tetap prioritas
    if ($result | Where-Object { $_.desa -eq "$($e.desa)".ToUpper() -and $_.kecamatan -eq $kec }) { continue }
    $result += [ordered]@{
      desa            = "$($e.desa)".Trim().ToUpper()
      kecamatan       = $kec
      lahanSawah      = [double]$e.lahanSawah
      lahanBukanSawah = [double]$e.lahanBukanSawah
      jumlah          = [double]$e.jumlah
      tahun           = [int]$e.tahun
    }
    if ($st2023Covered -notcontains $kec) { $st2023Covered += $kec }
  }
}
foreach ($kec in $st2023Covered) {
  $n = ($result | Where-Object kecamatan -eq $kec).Count
  $report += [pscustomobject]@{ Kecamatan = $kec; Desa = $n; Tahun = '2023'; Sumber = 'ST2023 (ekstraksi PDF BPS)' }
}

# --- Karangkobar & Madukara: tidak ada dataset resmi -> pertahankan baris lama apa adanya
#     (kecuali sudah tercakup file ST2023)
$old = Get-Content $OutFile -Raw | ConvertFrom-Json
foreach ($kec in @('Karangkobar','Madukara')) {
  if ($st2023Covered -contains $kec) { continue }
  $rows = $old | Where-Object { $_.kecamatan -eq $kec }
  foreach ($r in $rows) {
    $result += [ordered]@{
      desa            = "$($r.desa)".Trim().ToUpper()
      kecamatan       = $kec
      lahanSawah      = Fix-Corrupt ([double]$r.lahanSawah)
      lahanBukanSawah = Fix-Corrupt ([double]$r.lahanBukanSawah)
      jumlah          = Fix-Corrupt ([double]$r.jumlah)
      tahun           = [int]$r.tahun
    }
  }
  $report += [pscustomobject]@{ Kecamatan = $kec; Desa = $rows.Count; Tahun = '2025?'; Sumber = 'FALLBACK LAMA (tidak terverifikasi)' }
}

# --- Normalisasi akhir: koreksi nilai yang masih melebihi luas fisik desa (m2 yang lolos).
#     Luas fisik desa diambil dari geojson (data-source/desa-area.json). Total lahan pertanian
#     tidak mungkin melebihi luas desa; bila melebihi, skala salah (faktor 10) -> bagi 10.
function Norm-Key([string]$kec, [string]$desa) {
  $k = (($kec -replace '[^A-Za-z]', '').ToUpper())
  $d = (($desa -replace '[^A-Za-z]', '').ToUpper())
  return "$k|$d"
}
$areaFile = "data-source/desa-area.json"
$areaMap = @{}
if (Test-Path $areaFile) {
  $areaRaw = Get-Content $areaFile -Raw | ConvertFrom-Json
  foreach ($p in $areaRaw.PSObject.Properties) {
    $areaMap[$p.Name] = [double]$p.Value
  }
  "Luas fisik desa dimuat: $($areaMap.Count) desa"
} else {
  "PERINGATAN: $areaFile tidak ditemukan, normalisasi fisik dilewati"
}
$script:physFixed = 0
if ($areaMap.Count -gt 0) {
  for ($iter = 0; $iter -lt 2; $iter++) {
    $changed = $false
    foreach ($r in $result) {
      $key = Norm-Key "$($r.kecamatan)" "$($r.desa)"
      if (-not $areaMap.ContainsKey($key)) { continue }
      $fisik = $areaMap[$key]
      if ($fisik -le 0) { continue }
      $j = [double]$r.jumlah
      if ($j -gt ($fisik * 1.15)) {
        $r.lahanSawah      = [math]::Round(([double]$r.lahanSawah / 10), 4)
        $r.lahanBukanSawah = [math]::Round(([double]$r.lahanBukanSawah / 10), 4)
        $r.jumlah          = [math]::Round(([double]$r.lahanSawah + [double]$r.lahanBukanSawah), 4)
        $script:physFixed++
        $changed = $true
      }
    }
    if (-not $changed) { break }
  }
  "Koreksi m2/kilas desimal (vs luas fisik): $($script:physFixed) sel"
}

# Urutkan sesuai urutan kecamatan baku, lalu nama desa
$sorted = $result | Sort-Object @{ E = { $kecamatanOrder.IndexOf($_.kecamatan) } }, desa

# Backup & tulis (UTF-8 tanpa BOM)
Copy-Item $OutFile "$OutFile.bak" -Force
$json = ConvertTo-Json $sorted -Depth 3
$abs = Join-Path (Get-Location).Path ($OutFile -replace '/','\')
[System.IO.File]::WriteAllText($abs, $json, (New-Object System.Text.UTF8Encoding($false)))

"`n=== REBUILD SELESAI: $($sorted.Count) desa, $($script:normalizedCount) sel dikoreksi (m2/koma) + $($script:physFixed) sel dikoreksi (vs luas fisik) ==="
$report | Sort-Object Kecamatan | Format-Table -AutoSize
"Backup lama: $OutFile.bak"
