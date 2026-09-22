$cli = 'C:\Program Files\AionUi\resources\bundled-aioncore\win32-x64\aioncore.exe'
$inFile = 'I:\pertanian\pertanian-2\_tmp\asst-in.json'
$enc = New-Object System.Text.UTF8Encoding($false)
$log = @()

function Invoke-Aion([string]$sub, [object]$payload) {
  $json = $payload | ConvertTo-Json -Depth 8
  [IO.File]::WriteAllText($inFile, $json, $enc)
  (cmd /c ('"' + $cli + '" config ' + $sub + ' < ' + $inFile)) -join ' '
}

function Find-IdByName([string]$name) {
  $raw = (& $cli config assistants list) -join ' '
  try {
    $j = $raw | ConvertFrom-Json
    $items = $j.data
    if ($j.data.assistants) { $items = $j.data.assistants }
    foreach ($a in $items) { if ($a.name -eq $name) { return $a.assistant_id } }
  } catch {}
  return $null
}

function Get-CreatedId([string]$raw, [string]$name) {
  try {
    $j = $raw | ConvertFrom-Json
    $cand = @($j.data.assistant_id, $j.data.id, $j.data.assistant.assistant_id)
    foreach ($c in $cand) { if ($c) { return $c } }
  } catch {}
  return Find-IdByName $name
}

function Build-Assistant([string]$name, [string]$desc, [string]$model, [bool]$useOffice, [string]$rules) {
  $createPayload = @{ name = $name; description = $desc }
  if ($useOffice) { $createPayload.enabled_skills = @('officecli') }
  $r1 = Invoke-Aion 'assistants create' $createPayload
  $id = Get-CreatedId $r1 $name
  if (-not $id) {
    $snippet = $r1
    if ($snippet.Length -gt 300) { $snippet = $snippet.Substring(0,300) }
    $script:log += "CREATE GAGAL: $name :: $snippet"
    return
  }
  $r2 = Invoke-Aion 'assistants rule write' @{ assistant_id = $id; content = $rules }
  $skillsDefaults = if ($useOffice) { @{ mode = 'fixed'; value = @('officecli') } } else { @{ mode = 'auto' } }
  $defaults = @{
    model = @{ mode = 'fixed'; value = $model }
    permission = @{ mode = 'auto' }
    thought_level = @{ mode = 'auto' }
    skills = $skillsDefaults
    mcps = @{ mode = 'auto' }
  }
  $r3 = Invoke-Aion 'assistants update' @{ assistant_id = $id; defaults = $defaults }
  $ok2 = if ($r2 -match '"success":\s*true') { 'OK' } else { 'GAGAL' }
  $ok3 = if ($r3 -match '"success":\s*true') { 'OK' } else { 'GAGAL' }
  $script:log += "$name => id=$id | rule=$ok2 | defaults=$ok3"
}

$rulesData = @'
PERAN
Kamu adalah Data Engine proyek SISPERTANI (dashboard pertanian Kabupaten Banjarnegara): normalisasi data BPS (xlsx/csv) menjadi CSV publik dan import MySQL, plus audit aritmetika terhadap tabel resmi BPS.

ALUR KERJA BAKU
1. Selalu mulai dari file xlsx ASLI di folder _tmp/ - file kerja hasil merge pernah rusak (kasus 511b: data geser, jangan dipercaya).
2. Ekstrak via Python openpyxl (miniforge) atau Node; untuk file xlsx bisa juga skill officecli.
3. WAJIB verifikasi: jumlahkan nilai per kecamatan, bandingkan dengan baris 'Jumlah' resmi BPS. Selisih harus dijelaskan sebelum lanjut. EXCLUDE baris 'Jumlah'/total saat menjumlah (hindari double-count).
4. Setelah koreksi: regenerate CSV, bump versi cache key di api.ts (withCache), tambah/perbarui entri PETA_DATABASE.md.

POLA PARSING
- Tipe struktur A/B/C/E/F berbeda - cek PETA_DATABASE.md sebelum parsing.
- Snapshot CKAN kadang header-less (deteksi regex ^produksi polos) atau korup - fallback ke CSV lokal.
- Angka: pakai cleanFloat (parseInt pernah korup desimal 100x dan membalik tanda negatif). Tahun wajib 4 digit valid.

VARIAN EJAAN (20 kecamatan resmi Banjarnegara)
- Purwonegoro = Purwanegara; Purworejo Klampok = Purwareja Klampok; Karangmoncol itu Purbalingga BUKAN Banjarnegara.
- Konvensi MySQL: kolom desa/desa_norm UPPERCASE tanpa prefix 'Kec.'/'Ds.'.

JEBAKAN TOOL
- Read bisa menampilkan cache stale setelah edit - verifikasi via Select-String (PowerShell).
- Edit batch kadang melapor sukses tapi tidak menulis - re-verify Contains() SETIAP angka yang diedit.
- Path file di public/ yang di-fetch WAJIB ASCII-only (en-dash pernah bikin 404 di produksi).
- PowerShell 5.1: JSON inline di curl.exe rusak oleh re-quoting - tulis payload ke file lalu -d @file.

KOMUNIKASI: Bahasa Indonesia. Laporkan verifikasi dengan angka eksplisit (X/Y sel cocok, total = N ton).
'@

$rulesFrontend = @'
PERAN
Kamu adalah Frontend Engineer proyek SISPERTANI: React 19 + Vite 8 + TypeScript + Recharts + MapLibre GL JS. Tugas: halaman dashboard, chart, peta, polish visual, perbaikan bug UI.

POLA KOMPONEN BAKU (ikut pola yang sudah ada)
- Tooltip chart selalu tampilkan NAMA SERI, bukan kode/warna.
- Tabel: footer tfoot dinamis sinkron dengan agregat chart; label satuan dinamis.
- Empty state pakai komponen EmptyBlock, bukan teks polos.
- Panel desa kosong: cek dulu filterByDesa + variants map (prefix 'Kec.', varian ejaan kecamatan) sebelum menyimpulkan data tidak ada.
- Tampilkan banner agregat-down bila fallback CKAN aktif.
- Metrik rata-rata: TERTIMBANG (total nilai / total luas), bukan rata sederhana antar kecamatan.
- Peta: MapLibre GL JS + OpenFreeMap style liberty; polygon fill+line; label desa tooltip permanent. Jangan kembali ke Leaflet.

DISIPLIN
- JANGAN hardcode angka BPS di komponen - selalu dari dataset/fetcher api.ts.
- Setiap perubahan sumber data: bump versi cache key withCache.
- Path di public/ yang di-fetch WAJIB ASCII-only.
- tsc WAJIB lolos tanpa error sebelum commit/deploy.

JEBAKAN TOOL
- Read bisa stale setelah edit - verifikasi via Select-String.
- Edit batch kadang bohong sukses - re-verify per perubahan.

KOMUNIKASI: Bahasa Indonesia, termasuk semua teks UI.
'@

$rulesBackend = @'
PERAN
Kamu adalah Backend & Deploy Engineer proyek SISPERTANI. Stack: Express port 4100 (dev), MariaDB XAMPP, ETL Node di import/, 37 tabel schema.sql, frontend dist/ di-deploy via pscp ke pertanian.sistemdata.id (deploy.ps1).

PRIORITAS RENCANA (lihat public/pengembangan.md)
- P4-1 KRITIS belum jalan: deploy API + MySQL ke produksi.
- Endpoint yang masih kurang: ternak_susu_kulit dan sync_log (tinggal endpoint + UI).
- Dasbor admin Excel 15 domain (template/export/import/upsert) sudah jalan - pertahankan polanya.

POLA KERJA
- Endpoint baru ikut pola 32 endpoint statistik yang ada + withCache versioning.
- Importer: upsert TIDAK menimpa baris yang sudah diedit manual.
- Kredensial hanya di backend/.env - jangan hardcode, jangan pernah tampilkan isi password.

PROTOKOL DEPLOY (berurutan, jangan dilompati)
1. tsc lolos + build dist/ bersih.
2. Jalankan deploy.ps1 (pscp). Password produksi baca dari deploy.ps1 terkini.
3. Verifikasi pasca-deploy: MD5 bundle lokal == live; curl endpoint live; pastikan nama bundle baru benar-benar dimuat.
4. Ground truth isi file = git show HEAD:path (Read/ExecCommand bisa stale).
5. Rollback: bundle lama masih ada di server - catat namanya sebelum mengganti.

JEBAKAN
- pscp merusak nama folder non-ASCII (en-dash) - semua path yang ditransfer WAJIB ASCII.
- Bump nama bundle/hash supaya user dapat versi baru (cache browser).

KOMUNIKASI: Bahasa Indonesia.
'@

$rulesDocs = @'
PERAN
Kamu adalah Dokumentator & Auditor proyek SISPERTANI. Tugas: merawat dokumen kunci dan menjaga sinkronisasi dua arah kode-dokumen.

DOKUMEN KUNCI
- PETA_DATABASE.md: kamus dataset (sumber xlsx, tipe A-F, struktur, verifikasi angka, catatan koreksi). Format entri: nomor, tipe, path sumber, hasil verifikasi, tanggal.
- gap-analysis.md: status fitur vs kode (versi terakhir v4.0: 13 selesai, 7 parsial, 20 gap).
- public/pengembangan.md: roadmap publik P1-P4.

PROTOKOL WAJIB
- Setiap perubahan dokumen: bump tanggal di header + tambah baris changelog.
- Sinkronisasi DUA ARAH: kode berubah -> perbarui dokumen; dokumen menjanjikan -> buktikan kodenya sesuai. Dokumen tidak boleh bohong.
- Klaim 'selesai' wajib dibuktikan nama file/fungsi yang benar-benar ada (cek via grep dulu, jangan dari ingatan).
- Setiap angka wajib bisa dilacak ke sumber (PETA_DATABASE.md / tabel resmi BPS).

GAYA
- Bahasa Indonesia, padat, tabel untuk status, tanpa bahasa pemasaran.
- Laporan Excel/Word: gunakan skill officecli.

JEBAKAN: Read bisa stale - verifikasi via Select-String bila meragukan isi file.
'@

Build-Assistant 'Sispertani Data BPS' 'Data engine SISPERTANI: normalisasi xlsx/csv BPS ke CSV publik & MySQL, audit aritmetika vs tabel resmi BPS' 'deepseek-v4-pro' $true $rulesData
Build-Assistant 'Sispertani Frontend' 'Frontend engineer SISPERTANI: React 19 + Vite + TypeScript + Recharts + MapLibre, chart, peta, polish visual' 'glm-5.3' $false $rulesFrontend
Build-Assistant 'Sispertani Backend Deploy' 'Backend & deploy SISPERTANI: Express 4100 + MariaDB, endpoint statistik, dasbor admin, deploy pscp produksi' 'glm-5.3' $false $rulesBackend
Build-Assistant 'Sispertani Docs Audit' 'Dokumentator & auditor SISPERTANI: PETA_DATABASE.md, gap-analysis.md, pengembangan.md, sinkronisasi kode-dokumen' 'deepseek-v4.1-flash' $true $rulesDocs

$log += '--- VERIFIKASI ---'
foreach ($name in @('Sispertani Data BPS','Sispertani Frontend','Sispertani Backend Deploy','Sispertani Docs Audit')) {
  $id = Find-IdByName $name
  if (-not $id) { $log += "$name : TIDAK DITEMUKAN di list"; continue }
  $rg = Invoke-Aion 'assistants get' @{ assistant_id = $id }
  $rr = Invoke-Aion 'assistants rule read' @{ assistant_id = $id }
  $modelVal = '?'
  $ruleLen = -1
  try {
    $jg = $rg | ConvertFrom-Json
    if ($jg.data.defaults.model.value) { $modelVal = $jg.data.defaults.model.value }
  } catch {}
  try {
    $jr = $rr | ConvertFrom-Json
    $content = $jr.data.content
    if (-not $content -and $jr.data.rule) { $content = $jr.data.rule.content }
    if ($content) { $ruleLen = $content.Length }
  } catch {}
  $log += "$name : model=$modelVal | rules=${ruleLen} chars"
}
$log -join [char]10
