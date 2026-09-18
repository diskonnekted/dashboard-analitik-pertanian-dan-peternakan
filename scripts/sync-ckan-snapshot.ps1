<#
.SYNOPSIS
  Snapshot data CKAN opendata.banjarnegarakab.go.id -> public/data/snapshots/ (storage sederhana).

.DESCRIPTION
  Tujuan: saat server CKAN down, aplikasi tetap membaca data dari snapshot statis lokal.
  Snapshot adalah file biasa di public/ -> ikut ter-commit ke repo & tersaji oleh hosting apa pun
  tanpa database/server tambahan.

  Yang di-snapshot:
  1. Lima CSV CKAN yang di-fetch live oleh src/services/api.ts (padi, sayuran, inflasi,
     lumbung pangan, pasar). File disimpan APA ADANYA (byte-identik) supaya parser jalur
     "online" di api.ts bisa langsung memakainya.
  2. Katalog dataset (hasil package_search 7 kata kunci, dedupe) -> ckan-catalog.json,
     dipakai sebagai fallback konteks ChatBot "Si Pertani".
  3. manifest.json -> jejak audit (kapan diambil, dari URL mana, ukuran).

  Cara pakai (dev server Vite harus jalan agar proxy CKAN aktif):
    powershell -File scripts/sync-ckan-snapshot.ps1 [-CkanBase "http://localhost:5173"]

  Jalankan berkala (mis. mingguan) agar snapshot tidak basi.
#>
param(
  [string]$CkanBase = "http://localhost:5173",
  [string]$OutDir   = "public/data/snapshots"
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# --- CSV CKAN yang dipakai api.ts (URL harus sama persis dengan di kode)
$csvSources = [ordered]@{
  'padi-2025.csv'            = '/dataset/9238267d-6b2e-4c44-a3f6-6d70351c75a0/resource/8180ee00-dedd-4b08-b165-ef3bd6bb7075/download/total-luas-panen-produksi-dan-rata-rata-produksi-tanaman-pangan-padi-2025.csv'
  'sayuran-2018-2024.csv'    = '/dataset/226f7b4c-a07c-4248-a837-ea4dba4ec05e/resource/e6481f04-0ffd-40df-871f-7005a8d266cb/download/produksi-tanaman-sayuran-menurut-kecamatan-dan-jenis-tanaman-2018-2024.csv'
  'inflasi-2018-2024.csv'    = '/dataset/5b935f47-a0df-4185-9328-2e13131dcd15/resource/bf424522-8fe9-46a1-99d3-3b102cf890b2/download/perbandingan_laju_inflasi_2018-2024.csv'
  'lumbung-pangan-2025.csv'  = '/dataset/bd6ca920-4cd8-49a2-8e5d-291f01e1a11e/resource/1e578131-0fc4-4db4-95a4-a3af66aa7bec/download/banyaknya-lumbung-dan-gudang-pangan-kab-banjarnegara-menurut-kecamatan-2025.csv'
  'pasar-2016-2025.csv'      = '/dataset/d6f86fd9-32b1-40c1-b7c3-ccf311271bff/resource/aa29ce02-f750-46df-b1fd-9ba681bb500c/download/banyaknya-pasar-dirinci-menurut-jenisnya-2016-2025.csv'
}

$manifest = [ordered]@{ fetchedAt = (Get-Date).ToUniversalTime().ToString('o'); files = @() }
$okCount = 0; $failCount = 0

foreach ($name in $csvSources.Keys) {
  $rel = $csvSources[$name]
  $dest = Join-Path $OutDir $name
  try {
    Invoke-WebRequest -Uri "$CkanBase$rel" -OutFile $dest -UseBasicParsing -TimeoutSec 90
    $size = (Get-Item $dest).Length
    # Deteksi jebakan: server kadang balas halaman HTML error dengan status 200
    $head = Get-Content $dest -TotalCount 1 -Encoding UTF8
    if ($head -match '^\s*<!DOCTYPE|^\s*<html') { throw "Respons berupa HTML, bukan CSV" }
    $manifest.files += [ordered]@{ name = $name; source = $rel; bytes = $size; status = 'ok' }
    $okCount++
    Write-Host ("OK   {0,-26} {1,8:N0} bytes" -f $name, $size)
  } catch {
    $failCount++
    $manifest.files += [ordered]@{ name = $name; source = $rel; status = "GAGAL: $($_.Exception.Message)" }
    Write-Host "FAIL $name : $($_.Exception.Message)"
    if (Test-Path $dest) { Remove-Item $dest -Force }   # jangan tinggalkan file rusak
  }
}

# --- Katalog dataset untuk ChatBot (cermin logika fetchOpenDataCatalog di api.ts)
try {
  $queries = @('pertanian','pangan','hortikultura','perkebunan','peternakan','perikanan','lahan')
  $seen = @{}; $all = @()
  foreach ($q in $queries) {
    try {
      $r = Invoke-RestMethod -Uri "$CkanBase/api/3/action/package_search?q=$([uri]::EscapeDataString($q))&rows=100" -TimeoutSec 60
      foreach ($d in $r.result.results) { if (-not $seen.ContainsKey($d.id)) { $seen[$d.id] = $true; $all += $d } }
    } catch { Write-Host "  katalog q=$q gagal: $($_.Exception.Message)" }
  }
  $entries = foreach ($d in $all) {
    [ordered]@{
      id    = $d.id
      title = $d.title
      notes = ("$($d.notes)").Substring(0, [math]::Min(200, "$($d.notes)".Length))
      org   = if ($d.organization) { $d.organization.title } else { 'Tidak diketahui' }
      tags  = @($d.tags | ForEach-Object { if ($_.display_name) { $_.display_name } else { $_.name } })
      csvUrls  = @($d.resources | Where-Object { "$($_.format)".ToUpper() -eq 'CSV' }  | ForEach-Object { $_.url } | Where-Object { $_ })
      xlsxUrls = @($d.resources | Where-Object { @('XLSX','XLS') -contains "$($_.format)".ToUpper() } | ForEach-Object { $_.url } | Where-Object { $_ })
      totalResources = @($d.resources).Count
    }
  }
  $catalog = [ordered]@{ totalDatasets = $entries.Count; entries = $entries; fetchedAt = (Get-Date).ToUniversalTime().ToString('o') }
  $json = ConvertTo-Json $catalog -Depth 5
  $catalogPath = Join-Path (Join-Path (Get-Location).Path ($OutDir -replace '/','\')) 'ckan-catalog.json'
  [System.IO.File]::WriteAllText($catalogPath, $json, (New-Object System.Text.UTF8Encoding($false)))
  $manifest.files += [ordered]@{ name = 'ckan-catalog.json'; source = 'package_search x7'; bytes = $json.Length; status = "ok ($($entries.Count) dataset)" }
  Write-Host "OK   ckan-catalog.json          $($entries.Count) dataset"
} catch {
  $manifest.files += [ordered]@{ name = 'ckan-catalog.json'; status = "GAGAL: $($_.Exception.Message)" }
  Write-Host "FAIL ckan-catalog.json : $($_.Exception.Message)"
}

# --- Manifest audit
$mjson = ConvertTo-Json $manifest -Depth 4
$manifestPath = Join-Path (Join-Path (Get-Location).Path ($OutDir -replace '/','\')) 'manifest.json'
[System.IO.File]::WriteAllText($manifestPath, $mjson, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "`n=== SNAPSHOT SELESAI: $okCount CSV ok, $failCount gagal -> $OutDir ==="
