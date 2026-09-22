# Laporan Audit Data & Kualitas Dataset SISPERTANI
**Tanggal:** 22 September 2026
**Proyek:** SISPERTANI — Dashboard Pertanian Kabupaten Banjarnegara
**Penulis:** Sispertani Data BPS (teammate)

---

## 1. Ringkasan

Audit ini menilik data & kualitas dataset SISPERTANI berdasarkan tiga lapis sumber:
(1) berkas xlsx mentah BPS Distankan, (2) CSV publik yang dinormalisasi, dan
(3) hasil import MySQL. Berdasarkan memori proyek (PETA_DATABASE.md + catatan perbaikan 20–22 Sep 2026), **data utama sudah terverifikasi vs tabel resmi BPS** pada sebagian besar domain (ternak 90/90, perikanan tangkap 48/48, lumbung pangan 140/140, lahan T4.10 278/278). Namun, ada catatan penting: sumber xlsx mentah tidak berada di `_tmp/` akar sebagaimana diperkirakan — ia ada di `public/14. Distankan KP/`. Folder `tidy/` juga ditemukan kosong (template belum terisi). Tidak ada file yang dimodifikasi dalam audit ini.

---

## 2. Sumber & Arsitektur Data

### 2.1 Sumber Utama: xlsx Mentah BPS Distankan
- **Lokasi:** `public/14. Distankan KP/` (bukan di `_tmp/` akar).
- **Jumlah folder:** 39 kecamatan resmi Banjarnegara (sesuai fakta domain).
- **Isi:** Setiap folder kecamatan mengandung sub-folder per tabel BPS (misal: 5.1.1 Padi, 5.1.2 Jagung, dll.), masing-masing dengan sub-folder `_tmp/` internal yang berisi xlsx per tahun.
- **Total file xlsx yang dilacak Git:** 1.654 file (`git ls-files '*.xlsx'`).
- **Variasi ejaan:** Diketahui luar biasa; contoh:
  - `Purwonegoro` → `Purwanegara`
  - `Purworejo Klampok` → `Purwareja Klampok`
  - `SARWODADI` → `SARWADADI`
  - Catatan: `Karangmoncol` adalah **Purbalingga**, bukan Banjarnegara.

### 2.2 CSV Publik (Normalisasi)
- **Lokasi:** `public/14. Distankan KP/` (52 folder tabel).
- **Struktur per tabel:** 3 varian file CSV:
  1. **Asli** (`*.csv`) — 52 file
  2. **_tmp lama** (`_tmp/*.csv`) — 52 file (berisi file kerja hasil merge yang pernah rusak, seperti kasus 511b: data geser; tidak dapat dipercaya).
  3. **Tidy** (`tidy/*.csv`) — **0 file** (folder ada, namun kosong; diduga template yang belum terisi).
- **Tipe struktur:** A/B/C/E/F (lihat PETA_DATABASE.md untuk pola parsing tiap tipe).

### 2.3 CKAN Pemkab (Fallback/Snapshot)
- **Akses:** Live via HTTP pada runtime (api.ts di `src/services/`).
- **Catatan:** Snapshot CKAN kadang **header-less** (terdeteksi via regex `^produksi` polos) atau **korup**. Jika demikian, sistem fallback ke CSV lokal.
- **Manifest:** `public/data/ckan-catalog.json` & `public/data/manifest.json` **tidak ditemukan di disk** — berarti CKAN hanya diakses secara dinamis/eksternal.

### 2.4 MySQL (Hasil Import)
- **Skema:** `database/schema.sql` (37 tabel, termasuk `lahan_desa`, 12 kolom lahan kritis T4.10, 3 tabel bantuan).
- **ETL:** `database/import/` dengan `datasets.mjs` (~35 KB, logika pemetaan tiap dataset) dan `run.mjs` (orchestrator).
- **Baseline dry-run:** ~19.500 baris, 0 warning (per catatan migrasi MySQL 21 Sep 2026).
- **Status:** MySQL/XAMPP **belum terhubung/terinstal** di mesin (per catatan, backend Express 4100 live dev).

### 2.5 ST2023 Ekstraksi (Khusus Lahan)
- **Lokasi:** `_tmp/st2023-lahan/` (41 file: `.json` + `.txt` per kecamatan).
- **Sesuai:** Ini adalah **hasil ekstraksi teks dari PDF ST2023**, bukan berkas xlsx mentah. Digunakan sebagai sumber untuk tabel lahan_desa.
- **Verifikasi:** 278 desa, Σ 7.581,47 Ha (rata-rata 27,8 Ha/desa) — sesuai baseline ST2023 T4.10.

---

## 3. Coverage per Domain Data

Berdasarkan integrasi MySQL (37 tabel) dan catatan perbaikan 20–22 Sep 2026:

| Domain | Tipe CSV | File Sumber | Verifikasi vs BPS | Status |
|---|---|---|---|---|
| **Padi & Palawija** (food-crops) | — | 52 folder tabel (termasuk 511*) | ✅ Agregasi tertimbang (Σprod×10÷Σluas) | Selesai |
| **Hortikultura** (horticulture) | E/F | CSV tipe E/F | Partial (dropdown tahun diperbaiki 21 Sep) | Selesai |
| **Perkebunan** (plantation) | B | CSV | ✅ Total = Σprod/Σluas | Selesai |
| **Ternak** (livestock) | A | CSV | ✅ **90/90 sel** (Σ vs Jumlah resmi) | Selesai |
| **Ternak (Flow)** (livestock-flow) | A | CSV | ✅ **113/114 sel** (1 = quirk BPS) | Selesai |
| **Perikanan** (fisheries) | C | 2 CSV (tangkap/budidaya) | ✅ Tangkap 48/48 + Budidaya 36/36 | Selesai |
| **Nilai Ekonomi** (economic-value) | — | CSV | ✅ 4 sel koreksi 2022, Jumlah 906,5 M (2024) | Selesai |
| **Lumbung Pangan** (food-security) | B | CSV | ✅ **140/140 sel**, Σ=63 unit / 95.826 ton | Selesai |
| **Lahan Desa** (lahan_desa) | ST2023 T4.10 | 278 desa | ✅ **278/278 desa** Σ 7.581 Ha | Selesai |
| **Lahan Kritis** (lahan kritis) | ST2023 T4.10 | — | ✅ **278/278 desa**, 20/20 kec Σ match | Selesai |
| **Petani** (farmers) | ST2023 | — | ✅ 4 koreksi JSON kelembagaan | Selesai |
| **Bantuan** (bantuan) | MySQL | 3 tabel | 🔄 Data kosong di MySQL, isi via dasbor admin | Siap pakai |
| **Prediksi/Padi** (prediction) | — | CSV Sawah+Ladang | ✅ 8 titik 2018–2025, proyeksi 2026 = 177.276 ton | Selesai |

---

## 4. Status Verifikasi vs Tabel Resmi BPS

| Tabel / Dataset | Sumber Asli | Jumlah Sel | Sel Cocok (vs BPS) | Catatan |
|---|---|---|---|---|
| Ternak (livestock) | CSV tipe A | 90 | **90** | Σ total ton/nilai == Jumlah resmi BPS |
| Perikanan Tangkap (per-alat) | CSV | 48 | **48** | Audit aritmetika sel per sel |
| Perikanan Budidaya (nilai) | CSV | 36 | **36** | 6 sel dikoreksi (unit BPS terdistorsi) |
| Lumbung Pangan | CSV | 140 | **140** | Σ unit = 63, Σ ton = 95.826 (xlsx _tmp korup di CKAN 2025 — fallback) |
| Lahan Kritis T4.10 (desa) | ST2023 PDF | 278 | **278** | 20/20 kecamatan Σ match BPS |
| Lahan Desa ST2023 | PDF ST2023 | 54 kolom | — | Σ = 7.581,47 Ha, varian ejaan 9 kelompok |
| Food Crops (agregat tertimbang) | CSV | — | ✅ | Rata jadi tertimbang (Ku/Ha realistis 60–69) |

---

## 5. Koreksi & Quirk yang Diketahui

1. **Varian ejaan kecamatan (Banjarnegara):**
   - `Purwonegoro` → `Purwanegara`
   - `Purworejo Klampok` → `Purwareja Klampok`
   - `SARWODADI` → `SARWADADI` (juga diketahui typo BPS: `SARWODADI` di geojson → koreksi ke `SARWADADI`)
   - `WINONG#2` berada di kecamatan **BAWANG**, bukan Winong
   - `Tempuran` (Kalibening #2) vs `Bedana` — typo BPS dikoreksi via Pemkab 2023
   - `Kutayasa` (Winong #2) — varian ejaan dikoreksi
   - `Parakan` (Purwanegara) ≠ `Parakancanggah` (Banjarnegara) = dua entitas berbeda
2. **Satuan campuran di datastore Pemkab:** Diketahui, dikoreksi di MySQL (konvensi uppercase, tidak ada prefix `Kec.`/`Ds.`).
3. **Sel BPS terdistorsi / xlsx korup:** Contoh dokumen 511b, 511c, 511d, 511e — nilainya tersimpan di kolom-1 (grup tahun), bukan struktur tabel biasa. Dikoreksi manual.
4. **Snapshot CKAN korup:** Terutama untuk tahun 2025 (misal: Bawang 12 vs 3). Sistem otomatis fallback ke CSV lokal.
5. **Header-less CKAN:** Deteksi via regex `^produksi` polos; jika header tak terbaca, gunakan CSV lokal.
6. **Angka desimal:** Pakai `cleanFloat`; `parseInt` pernah **merusak** desimal 100× dan **membalik tanda** (kasus Domba 2021 / Itik 2022).
7. **Tahun parsial:** 2022 dikecualikan dari perhitungan tren (data belum lengkap).
8. **Folder en-dash:** Nama folder dengan en-dash (–) rawan gagal di PowerShell. Solusi: rename ke hyphen ASCII.
9. **File `_tmp` di dalam xlsx merge:** Pernah rusak (511b: data geser); jangan dipercaya — selalu kembali ke xlsx asli.
10. **Folder `tidy/`:** Kosong — template normalisasi modern yang belum terisi. Sebaiknya diisi jika akan dipakai konsumen eksternal.
11. **Path public/ di-fetch:** Wajib ASCII-only (en-dash pernah bikin **404 di produksi**).
12. **Cache key:** Versi cache per modul harus di-*bump* tiap kali CSV regen (withCache) — tercatat contoh bump v2–v7 di berbagai modul.

---

## 6. Risiko & Anomali yang Perlu Perhatian

1. **Sumber xlsx mentah di lokasi tidak standar:** Berkas 1.654 xlsx berada di `public/14. Distankan KP/`, dilacak oleh Git — ini OK secara teknis, tapi **berkas produksi (`dist/`)** juga memuat copy xlsx. Sebaiknya `dist/` **gitignore** agar tidak membesar.
2. **Folder `tidy/` kosong:** Berpotensi menyesatkan jika konsumen eksternal mengharapkan CSV tidy. Perlu keputusan: diisi, dihapus, atau di-dokumentasikan sebagai roadmap.
3. **CKAN eksternal / dinamis:** `ckan-catalog.json` & `manifest.json` tidak ada di disk — audit kualitas bergantung pada snapshot live. Sebaiknya **snapshot CKAN disimpan periodik** di `public/data/` sebagai fallback.
4. **MySQL belum terhubung:** Backend Express 4100 dapat pakai, tapi produksi belum deploy API + MySQL (gap P4-1 di `pengembangan.md`). Ini adalah blocker utama untuk migrasi data penuh.

---

## 7. Referensi

- `public/14. Distankan KP/PETA_DATABASE.md` — peta dataset utama, pola tiap tipe CSV.
- Memory proyek (aionui-sispertani): catatan perbaikan 20–22 Sep 2026 (ternak, perikanan, lumbung, lahan kritis, ekonomi, rekomendasi, hortikultur).
- `database/schema.sql` — skema 37 tabel MySQL.
- `database/import/datasets.mjs`, `run.mjs` — logika ETL Node.
- `src/services/api.ts` — fetcher + withCache (cache key per modul).
