# Migrasi SISPERTANI ke MySQL — Fase A: Skema + Import

Paket ini mengimpor **seluruh sumber data file** SISPERTANI (42 CSV BPS/Distankan,
5 JSON fallback, GeoJSON desa, 2 snapshot CKAN/BPS) ke MySQL 8 sebagai **database utama**.
CSV/CKAN tetap dipertahankan sebagai fallback dan sumber sinkronisasi.

## Struktur

```
database/
├── schema.sql          -- DDL lengkap (37 tabel, MySQL 8.0+, InnoDB utf8mb4)
└── import/
    ├── package.json    -- deps: mysql2, papaparse (Node >= 20)
    ├── .env.example    -- salin ke .env, isi kredensial
    ├── lib.mjs         -- koneksi, parser CSV, resolver kecamatan, mesin melt, upsert
    ├── ref.mjs         -- seed kecamatan (20) + desa (278) dari GeoJSON
    ├── datasets.mjs    -- importer semua dataset (padi..st2023)
    ├── run.mjs         -- orkestrator (dry-run / full / --only)
    └── inspect.mjs     -- diagnostik struktur sumber (bukan bagian import)
```

## Baseline terverifikasi (dry-run, 0 warning)

Hasil `node run.mjs --dry-run` yang sudah divalidasi terhadap struktur file asli.
Jika angka berubah setelah edit, selidiki dulu sebelum import:

| dataset | baris | catatan verifikasi |
|---|---|---|
| ref | 337 | 20 kecamatan + 278 desa + 39 entri dataset_sumber |
| padi | 164 | 140 baris sumber (20 kec × 7 th, 2018-2024) × 2 jenis, minus sel kosong |
| palawija | 442 | 3 file × 140 baris × 2 komoditas, minus sel kosong |
| horti | 5.444 | 7 file per-kecamatan (wide-year di-melt) |
| horti-kab | 941 | 7 file "Menurut Jenis Tanaman" |
| perkebunan | 2.557 | areal 1.300 + produksi 1.218 kecamatan + ~39 total kabupaten (blok JENIS) |
| ternak | 3.627 | populasi + daging + telur + susu/kulit + pemotongan |
| ternak-flow | 1.058 | pemasukan + pengeluaran |
| perikanan | 2.328 | budidaya, tangkap, perairan umum, obyek, benih, minapadi, waduk, kolam, pemeliharaan |
| lahan | 121 | penggunaan lahan kabupaten (2014+) |
| lahan-desa | 556 | 278 fallback + 278 updated (di DB ter-dedup jadi 278 via upsert) |
| lumbung | 140 | 20 kec × 7 th — cocok dengan verifikasi 140/140 vs xlsx |
| ekonomi | 89 | pasar 4 jenis × 10 th + inflasi 7 wilayah × 7 th |
| kelembagaan | 1.379 | poktan 2022-2024 + snapshot SIMLUH 2026 + rincian KTH |
| st2023 | 278 | satu baris per desa |
| **TOTAL** | **≈ 19.500** | |

## Setup

```powershell
# 1. Buat database + user
mysql -u root -p < schema.sql
mysql -u root -p -e "CREATE USER IF NOT EXISTS 'sispertani'@'%' IDENTIFIED BY 'PASSWORD-KUAT';
                     GRANT SELECT, INSERT, UPDATE, DELETE ON sispertani.* TO 'sispertani'@'%';"

# 2. Install deps & konfigurasi
cd database\import
npm install
copy .env.example .env   # lalu edit .env

# 3. Validasi parsing TANPA menyentuh DB (wajib dulu!)
node run.mjs --dry-run

# 4. Import penuh
node --env-file=.env run.mjs

# subset tertentu:
node --env-file=.env run.mjs --only=ref,padi,perikanan
```

## Verifikasi pasca-import

Jalankan query ini dan bandingkan dengan nilai yang sudah terverifikasi manual
(dari audit terhadap xlsx asli BPS):

```sql
-- Jumlah baris per tabel (bandingkan dengan tabel baseline di atas)
SELECT 'padi_produksi' t, COUNT(*) n FROM padi_produksi
UNION ALL SELECT 'palawija_produksi', COUNT(*) FROM palawija_produksi
UNION ALL SELECT 'horti_luas', COUNT(*) FROM horti_luas
UNION ALL SELECT 'horti_produksi', COUNT(*) FROM horti_produksi
UNION ALL SELECT 'perkebunan_areal', COUNT(*) FROM perkebunan_areal
UNION ALL SELECT 'perkebunan_produksi_kabupaten', COUNT(*) FROM perkebunan_produksi_kabupaten
UNION ALL SELECT 'ternak_populasi', COUNT(*) FROM ternak_populasi
UNION ALL SELECT 'kelompok_tani', COUNT(*) FROM kelompok_tani
UNION ALL SELECT 'lahan_desa', COUNT(*) FROM lahan_desa
UNION ALL SELECT 'desa', COUNT(*) FROM desa
UNION ALL SELECT 'kecamatan', COUNT(*) FROM kecamatan;
-- harapan: kecamatan=20, desa=278, lahan_desa=278

-- Padi 2024 = 176.200 ton (terverifikasi, koreksi atas klaim 171.560 yg th 2022)
SELECT tahun, ROUND(SUM(produksi_ton)) ton FROM padi_produksi
WHERE tahun IN (2022, 2024) GROUP BY tahun;

-- Lumbung 2024 = 63 unit / 95.826 ton (terverifikasi vs BPS)
SELECT SUM(lumbung_unit) unit, SUM(lumbung_kapasitas_ton) ton
FROM lumbung_pangan WHERE tahun = 2024;

-- Nilai budidaya 2024 ≈ Rp 906,5 M  (ingat: kolom dalam RIBU rupiah)
SELECT tahun, SUM(nilai_ribu_rp)/1000 AS nilai_juta_rp
FROM ikan_budidaya WHERE tahun = 2024 GROUP BY tahun;
-- harapan: ≈ 906.500 juta

-- Jejak audit
SELECT * FROM sync_log ORDER BY id DESC LIMIT 20;
```

## Keputusan desain penting

1. **Baris "Jumlah" CSV tidak diimpor** — itu agregat kabupaten; dihitung ulang
   via `SUM()` agar tidak double-count. (Sesuai temuan audit: CSV memang memuat
   baris Jumlah.)
2. **Kolom `sumber`** di setiap tabel fakta: `csv` / `json_fallback` / `ckan` /
   `manual`. Upsert **tidak pernah meng-update kolom `sumber`** (hanya diisi
   saat INSERT pertama) — jadi tanda `manual` pada baris yang dikoreksi tangan
   bertahan saat re-import CSV. **Aturan sinkron CKAN (Fase 3): jangan pernah
   menimpa baris `csv`/`manual` secara otomatis** — banyak sel sudah dikoreksi
   manual terhadap xlsx asli (lumbung 9 sel, perikanan 6 sel, kelembagaan 4
   baris, dsb).
3. **`nilai_ribu_rp` disimpan mentah dalam RIBU rupiah** sesuai sumber BPS
   (mis. `163145` = Rp 163.145.000; harga implisit ≈ Rp 22rb/kg). Konversi
   dilakukan di lapisan API, bukan di data.
4. **Angka BPS**: koma = ribuan, titik = desimal, `-`/kosong = `NULL`.
5. **Normalisasi kecamatan** dicerminkan dari `src/services/api.ts`:
   `Purwonegoro→Purwanegara`, `Purworejo Klampok→Purwareja Klampok`,
   `Wonodadi→Wanadadi`. Nama tak dikenal → warning, baris dilewati (tidak
   pernah diam-diam salah-kunci).
6. **GeoJSON tetap file statis** (4,4 MB). Tabel `desa` hanya menyimpan nama +
   relasi kecamatan untuk integritas referensial.

## File sumber yang SENGAJA dilewati

| File | Alasan |
|---|---|
| `_tmp/**` | File kerja RUSAK (data geser) — jangan pernah dipakai |
| `tidy/**` | Turunan dari CSV utama (melt naif) |
| `Luas  Panen,  Produksi dan Rata-rata Produksi CSV.csv` | Padi gabungan — 2018-2021 tidak akurat (hanya Padi Ladang); digantikan file "Padi Sawah Dan Padi Ladang" |
| `Luas dan Produksi Ikan Menurut Kecamatan dan Tempat Pemeliharaan CSV.csv` | Header duplikat rusak hasil flatten BPS; digantikan file "...Jenis Tempat Pemeliharaan" |
| `snapshots/padi-2025.csv`, `lumbung-2025.csv`, `sayuran-2018-2024.csv` | Snapshot CKAN — korup/subset; CSV primer sudah mencakup |

## File dengan header ambigu (dipetakan posisional — PERHATIAN)

Header hasil flatten tabel BPS 2-baris yang kehilangan konteks grupnya:

- **Minapadi**: kolom `Produksi` kedua disimpan apa adanya di `produksi_tambahan_kg`.
- **Kolam**: kolom `Luas` kedua disimpan di `luas_tambahan`.
- **Obyek penangkapan**: `[Sungai total, Sendiri, Lain daerah, Waduk total]` posisional.
- **Kulit & susu**: sumber hanya punya 1 kolom per grup ternak (tidak memisahkan
  kulit vs susu) — disimpan di `nilai` dengan `catatan`.

Jika nanti file sumber diperbaiki BPS, importer ini harus dicek ulang (ada
warning otomatis bila nama kolom kunci berubah).

## Setelah ini (Fase berikutnya)

- **Fase B**: backend Express read-only (`/api/v1/...`) membaca tabel-tabel ini;
  39 fetcher di `src/services/api.ts` dialihkan dari `/data/*.csv` ke API,
  dengan fallback CSV lokal tetap dipertahankan (pola yang sama seperti
  fallback CKAN→snapshot saat ini).
- **Fase C**: cron sinkronisasi CKAN → upsert baris `sumber='ckan'` saja.
- **Fase D**: isi `renstra_target` (saat ini masih hardcoded di `renstra.tsx`).
