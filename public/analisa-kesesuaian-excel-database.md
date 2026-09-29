# Laporan Analisis Kesesuaian Template Excel ↔ Database ↔ UI

**Tanggal**: 4 September 2026  
**Aplikasi**: SISPERTANI v2.0.0 (Dashboard Analitik Pertanian & Peternakan Kabupaten Banjarnegara)  
**Stack**: React SPA + MySQL (backend) → Import/Export via REST API

---

## 1. Arsitektur Import/Export Saat Ini

```
┌─────────────┐   HTTP POST   ┌──────────────────┐   MySQL   ┌─────────────┐
│   Admin     │ ─────────────►│   Backend API    │ ◄────────►│  Database   │
│   (Browser) │ ◄──────────── │ /api/v1/admin/*  │           │  (sispertani)│
│             │   .xlsx file  │   ┌─────────────┐ │           └─────────────┘
│  Form Input │ ─────────────► │ │  excel.js   │ │
└─────────────┘               │ │ importWB()  │ │
         ▲                    │ │ exportWB()  │ │
         │                    │ │ buildWB()   │ │
         └────────────────────┘ │  build()    │ │
                                └─────────────┘ │
                                        │       │
                                        ▼       ▼
                              ┌─────────────────────┐
                              │  Paket Statis       │
                              │  database/template- │
                              │  import-export/     │
                              │  ├── templates/     │
                              │  │    16 xlsx        │
                              │  │    37 csv         │
                              │  └── exports/       │
                              │       37 xlsx csv     │
                              └─────────────────────┘
```

### 3 Lapisan

| Lapisan | Lokasi | Fungsi |
|---------|--------|--------|
| **Engine** | `backend/src/lib/excel.js` | `buildWorkbook()`, `importWorkbook()`, `build()` — generate & parse .xlsx menggunakan `exceljs` |
| **Konfigurasi** | `backend/src/lib/domains.js` | 15 domain, 35 sheet, 500+ kolom, normalisasi nama, validasi enum |
| **API** | `backend/src/routes/admin.js` | `GET /template/:domain`, `GET /export/:domain`, `POST /import/:domain`, `GET /paket/*` |

### Prinsip Desain

- **Kolom Excel dibaca dinamis** dari `information_schema.columns` MySQL → selalu sinkron dengan skema DB
- **Kolom teknis di-skip**: `id`, `kecamatan_id`, `desa_norm`, `created_at`, `updated_at`, `sumber`
- **Tipe JSON/longtext di-skip** (data kompleks seperti `st2023_desa.ternak`)
- **Upsert key**: baris dengan kombinasi kunci natural yang sama → UPDATE; baru → INSERT
- **Normalisasi nama**: alias kecamatan (Purwareja Klampok/Purwanegara/Wanadadi), desa_norm uppercase

---

## 2. Inventaris Template & Export Excel

### 2.1 Template (16 domain)

| Domain | Label | Sheet | Tabel DB | Kolom Kunci (Upsert) |
|--------|-------|-------|----------|----------------------|
| bantuan-program | Bantuan — Program | Program | `bantuan_program` | nama + sumber_dana + tahun_anggaran |
| bantuan-alokasi | Bantuan — Alokasi Tahunan | Alokasi | `bantuan_alokasi` | tahun |
| bantuan-korelasi | Bantuan — Korelasi Sektor | Korelasi | `bantuan_korelasi` | sektor |
| padi | Padi | Padi | `padi_produksi` | kecamatan + tahun + jenis |
| palawija | Palawija | Palawija | `palawija_produksi` | kecamatan + tahun + komoditas |
| hortikultura (4 sheet) | Luas/Produksi per Kecamatan/Kabupaten | horti_luas, horti_produksi, horti_luas_kabupaten, horti_produksi_kabupaten | kecamatan + kelompok + komoditas + tahun; kelompok + komoditas + tahun (kabupaten) |
| perkebunan (3 sheet) | Areal/Produksi per Kecamatan/Kabupaten | perkebunan_areal, perkebunan_produksi, perkebunan_produksi_kabupaten | kecamatan + tanaman + tahun; tanaman + tahun (kabupaten) |
| peternakan (6 sheet) | Populasi/Daging/Telur/Susu&Kulit/Aliran/Pemotongan RPH | 6 tabel | kecamatan + kelompok/jenis/alokasi/lokasi + tahun |
| perikanan (9 sheet) | Tangkap/Budidaya/Benih/Kolam/Waduk/Mina Padi/tempat/Obyek | 9 tabel | kecamatan + jenis_alat/tahun/obyek/arah |
| lahan | Lahan | Penggunaan Lahan | `lahan_penggunaan` | kategori + tahun |
| lumbung | Lumbung Pangan | Lumbung Pangan | `lumbung_pangan` | kecamatan + tahun |
| ekonomi (3 sheet) | Inflasi/Pasar/Nilai Ekonomi | `inflasi`, `pasar`, `nilai_ekonomi_tahunan` | wilayah+tahun; jenis+tahun; bidang+komoditas+tahun+triwulan |
| kelembagaan (2 sheet) | Kelompok Tani/KTH | `kelompok_tani`, `kelompok_tani_hutan` | kecamatan + desa + tahun |
| st2023 | ST2023 Desa | ST2023 Desa | `st2023_desa` | kecamatan + desa |
| renstra | Target Renstra | Target Renstra | `renstra_target` | indikator + tahun_target |

### 2.2 Paket Statis (File yang sudah di-generate)

- **16 template Excel** di `database/template-import-export/templates/`
- **37 export Excel** di `database/template-import-export/exports/`
- **37 template CSV** di `database/template-import-export/templates/csv/`
- **37 export CSV** di `database/template-import-export/exports/csv/`

### 2.3 Contoh Header CSV (37 file)

| File | Kolom |
|------|-------|
| `padi.csv` | Kecamatan, Tahun, Jenis, Luas Panen (Ha), Produksi (Ton), Rata-rata (Ku/Ha) |
| `populasi.csv` | Kecamatan, Kelompok, Jenis, Tahun, Jumlah (Ekor) |
| `kelompok_tani.csv` | Kecamatan, Desa, Tahun, Kelompok Tani, Anggota Tani, Kelompok Perikanan, Anggota Perikanan, Gapoktan, Anggota Gapoktan |
| `inflasi.csv` | Wilayah, Tahun, Inflasi (%) |
| `alokasi.csv` | Tahun, APBD (Miliar Rp), APBN (Miliar Rp) |
| `korelasi.csv` | Sektor, Bantuan (Miliar Rp), Kenaikan Produksi (%) |

---

## 3. MAPPING: Template Kolom vs Database Kolom

### 3.1 Tabel `padi_produksi`

| Kolom DB | Label Excel | Tipe | Ada di Template? | Ada di CSV? | Ada di UI Halaman? |
|----------|-------------|------|:-:|:-:|:-:|
| id | *(skip)* | bigint | ✅ | ✅ | N/A |
| kecamatan_id | Kecamatan | FK | ✅ | ✅ | ✅ (di peta) |
| tahun | Tahun | int | ✅ | ✅ | ✅ (filter dropdown) |
| jenis | Jenis | ENUM | ✅ | ✅ | ✅ (dropdown sawah/ladang) |
| luas_panen_ha | Luas Panen (Ha) | decimal | ✅ | ✅ | ✅ (chart KPI) |
| produksi_ton | Produksi (Ton) | decimal | ✅ | ✅ | ✅ (chart KPI) |
| rata_ku_ha | Rata-rata (Ku/Ha) | decimal | ✅ | ✅ | ✅ (chart) |
| sumber | Sumber | varchar | ✅ (auto) | N/A | N/A |

**Status: ✅ SESUAI — semua kolom ada di template, CSV, dan UI.**

### 3.2 Tabel `kelompok_tani`

| Kolom DB | Label Excel | Tipe | Ada di Template? | Ada di CSV? | Ada di UI Halaman? |
|----------|-------------|------|:-:|:-:|:-:|
| id | *(skip)* | bigint | ✅ | ✅ | N/A |
| kecamatan_id | Kecamatan | FK | ✅ | ✅ | ✅ (filter dropdown) |
| desa | Desa | varchar | ✅ | ✅ | ✅ (kolom tabel) |
| tahun | Tahun | int | ✅ | ✅ | ✅ (filter dropdown) |
| kelompok_tani | Kelompok Tani | int | ✅ | ✅ | ✅ (KPI card) |
| anggota_tani | Anggota Tani | int | ✅ | ✅ | ✅ (KPI card + chart) |
| kelompok_perikanan | Kelompok Perikanan | int | ✅ | ✅ | ✅ (KPI card) |
| anggota_perikanan | Anggota Perikanan | int | ✅ | ✅ | ✅ (KPI card + chart) |
| gapoktan | Gapoktan | int | ✅ | ✅ | ✅ (KPI card) |
| anggota_gapoktan | Anggota Gapoktan | int | ✅ | ✅ | ✅ (KPI card + chart) |
| sumber | Sumber | varchar | ✅ (auto) | N/A | N/A |

**Status: ✅ SESUAI — semua kolom ada di template, CSV, dan UI `/farmers`.**

### 3.3 Tabel `bantuan_program`

| Kolom DB | Label Excel | Tipe | Ada di Template? | Ada di CSV? | Ada di UI Halaman? |
|----------|-------------|------|:-:|:-:|:-:|
| id | *(skip)* | bigint | ✅ | ✅ | N/A |
| nama | Nama Program | varchar | ✅ | ✅ | ✅ (kolom tabel) |
| sumber_dana | Sumber Dana | ENUM | ✅ | ✅ | ✅ (kolom tabel) |
| tahun_anggaran | Tahun Anggaran | int | ✅ | ✅ | ✅ (kolom tabel) |
| nilai_rupiah | Nilai (Rupiah) | bigint | ✅ | ✅ | ✅ (kolom tabel) |
| sektor | Sektor | varchar | ✅ | ✅ | ✅ (kolom tabel) |
| penerima_jumlah | Jumlah Penerima | int | ✅ | ✅ | ✅ (kolom tabel) |
| penerima_jenis | Jenis Penerima | varchar | ✅ | ✅ | ✅ (kolom tabel) |
| dampak_level | Tingkat Dampak | ENUM | ✅ | ✅ | ✅ (kolom tabel) |
| dampak_catatan | Catatan Dampak | text | ✅ | ❌ | ❌ (textarea) |
| created_at | *(skip)* | datetime | ✅ | ✅ | N/A |
| updated_at | *(skip)* | datetime | ✅ | ✅ | N/A |

**Status: ⚠️ SEBAGIAN — kolom `dampak_catatan` ada di template tapi tidak ditampilkan di tabel UI (`/government-assistance`).**

### 3.4 Tabel `kwt_kelompok_wanita_tani` (BARU, belum terkonfigurasi di `domains.js`)

| Kolom DB | Label Excel | Tipe | Ada di Template? | Ada di CSV? | Ada di UI Halaman? |
|----------|-------------|------|:-:|:-:|:-:|
| id | *(skip)* | bigint | ❌ | ❌ | N/A |
| nama_kelompok | Nama Kelompok | varchar | ❌ | ❌ | ✅ (kolom tabel) |
| kecamatan | Kecamatan | varchar | ❌ | ❌ | ✅ (kolom tabel) |
| desa | Desa | varchar | ❌ | ❌ | ✅ (kolom tabel) |
| jenis | Jenis | ENUM | ❌ | ❌ | ✅ (dropdown KWT/Pokdakan/etc) |
| jumlah_anggota | Jumlah Anggota | int | ❌ | ❌ | ✅ (KPI card) |
| produk_andalan | Produk Andalan | varchar | ❌ | ❌ | ✅ (kolom tabel) |
| tahun_registrasi | Tahun Registrasi | year | ❌ | ❌ | ✅ (kolom tabel) |
| latitude | Latitude | decimal | ❌ | ❌ | N/A |
| longitude | Longitude | decimal | ❌ | ❌ | N/A |

**Status: ❌ TIDAK ADA — tabel ini sudah ada di DB (digunakan halaman `/sebaran-bidang`) tapi belum dikonfigurasi di `domains.js`, tidak ada template Excel, tidak ada endpoint API import/export.**

### 3.5 Tabel `komoditas_unggulan` (BARU, belum terkonfigurasi di `domains.js`)

| Kolom DB | Label Excel | Tipe | Ada di Template? | Ada di CSV? | Ada di UI Halaman? |
|----------|-------------|------|:-:|:-:|:-:|
| id | *(skip)* | bigint | ❌ | ❌ | N/A |
| bidang | Bidang | ENUM | ❌ | ❌ | ✅ (filter) |
| komoditas | Komoditas | varchar | ❌ | ❌ | ✅ (filter) |
| varietas | Varietas | varchar | ❌ | ❌ | ✅ (kolom tabel) |
| kecamatan | Kecamatan | varchar | ❌ | ❌ | ✅ (kolom tabel) |
| luas_lahan | Luas Lahan (Ha) | decimal | ❌ | ❌ | ✅ (kolom tabel) |
| produktivitas | Produktivitas (Kg/Ha) | decimal | ❌ | ❌ | ✅ (kolom tabel) |
| produksi | Produksi (Ton) | decimal | ❌ | ❌ | ✅ (kolom tabel) |
| ketersediaan_benih | Ketersediaan Benih | ENUM | ❌ | ❌ | ✅ (kolom tabel) |
| tahun | Tahun | year | ❌ | ❌ | ✅ (filter) |

**Status: ❌ TIDAK ADA — tabel ini digunakan halaman `/komoditas-unggulan` tapi belum ada template/API import.**

### 3.6 Tabel `ltt_katam` (BARU, belum terkonfigurasi di `domains.js`)

| Kolom DB | Label Excel | Tipe | Ada di Template? | Ada di CSV? | Ada di UI Halaman? |
|----------|-------------|------|:-:|:-:|:-:|
| id | *(skip)* | bigint | ❌ | ❌ | N/A |
| komoditas | Komoditas | ENUM | ❌ | ❌ | ✅ (filter) |
| kecamatan | Kecamatan | varchar | ❌ | ❌ | ✅ (filter) |
| jenis | Jenis | ENUM | ❌ | ❌ | ✅ (dropdown LTT/Katam) |
| luas_rencana | Luas Rencana (Ha) | decimal | ❌ | ❌ | ✅ (chart) |
| luas_tanam | Luas Tanam (Ha) | decimal | ❌ | ❌ | ✅ (chart) |
| luas_panen | Luas Panen (Ha) | decimal | ❌ | ❌ | ✅ (chart) |
| produksi_rencana | Produksi Rencana (Ton) | decimal | ❌ | ❌ | ✅ (chart) |
| produksi_aktual | Produksi Aktual (Ton) | decimal | ❌ | ❌ | ✅ (chart) |
| bulan_mulai | Bulan Mulai | tinyint | ❌ | ❌ | ✅ (filter) |
| bulan_panen | Bulan Panen | tinyint | ❌ | ❌ | ✅ (filter) |
| tahun | Tahun | year | ❌ | ❌ | ✅ (filter) |
| source | Source | varchar | ❌ | ❌ | N/A |

**Status: ❌ TIDAK ADA — tabel ini digunakan halaman `/ltt-katam` tapi belum ada template/API import.**

---

## 4. ANALISIS GAP

### 4.1 Gap Import/Export (Tabel DB tidak punya template)

| # | Tabel DB | Halaman UI | Sheet di domains.js | Status |
|---|----------|------------|---------------------|--------|
| 1 | `kwt_kelompok_wanita_tani` | `/sebaran-bidang` | ❌ Tidak ada | **TIDAK TERKONEKSI** |
| 2 | `komoditas_unggulan` | `/komoditas-unggulan` | ❌ Tidak ada | **TIDAK TERKONEKSI** |
| 3 | `ltt_katam` | `/ltt-katam` | ❌ Tidak ada | **TIDAK TERKONEKSI** |
| 4 | `kth_detail` | (relasional ke kelompok_tani_hutan) | ❌ Tidak ada (by design) | **DIKNIALUI** |
| 5 | `lahan_desa` | `/lahan` (detail desa) | ❌ Tidak ada (kolom JSON) | **DIKNALUI** |

### 4.2 Gap UI Admin vs Template

| Halaman | Template | Fitur Import/Export |
|---------|----------|---------------------|
| `/admin` | 15 domain configured | ✅ Import, ✅ Export, ✅ Template, ✅ Paket |
| `/government-assistance` | ✅ `bantuan-program` di domains.js | ✅ Admin bisa via /admin |
| `/farmers` | ✅ `kelembagaan` di domains.js | ✅ Admin bisa via /admin |
| `/komoditas-unggulan` | ❌ Tidak di domains.js | ❌ Admin tidak bisa import via /admin |
| `/sebaran-bidang` | ❌ Tidak di domains.js | ❌ Admin tidak bisa import via /admin |
| `/ltt-katam` | ❌ Tidak di domains.js | ❌ Admin tidak bisa import via /admin |

### 4.3 Gap Data di Halaman vs Template

| Halaman | Data yang ditampilkan | Template yang relevan | Keterangan |
|---------|----------------------|----------------------|------------|
| `/government-assistance` | Program bantuan + alokasi | ✅ `bantuan-program`, ✅ `bantuan-alokasi` | ✅ OK |
| `/government-assistance` | Korelasi sektor | ✅ `bantuan-korelasi` | ✅ OK |
| `/government-assistance` | Kolom `dampak_catatan` | ✅ Ada di template | ❌ Tidak tampil di tabel UI |
| `/farmers` | Kelompok Tani/Pokkan/Gapoktan | ✅ `kelembagaan` | ✅ OK |
| `/komoditas-unggulan` | 4 komoditas unggulan | ❌ Tidak ada template | ❌ Input manual hanya lewat DB |
| `/sebaran-bidang` | KWT + komoditas unggulan | ❌ Tidak ada template | ❌ Input manual hanya lewat DB |
| `/ltt-katam` | LTT & Kalender Tanam | ❌ Tidak ada template | ❌ Input manual hanya lewat DB |

---

## 5. RINGKASAN TEMUAN

### ✅ Area yang Sudah Bagus

| # | Item | Penjelasan |
|---|------|------------|
| 1 | **Kolom Excel ↔ DB selalu sinkron** | Kolom dibaca dari `information_schema.columns` setiap request → tidak mungkin miss |
| 2 | **Normalisasi nama robust** | Aliases kecamatan + desa_norm uppercase + normKey normalization |
| 3 | **Upsert key benar** | Kombinasi kunci natural (kecamatan+tahun+jenis) mencegah duplikasi |
| 4 | **15 domain sudah lengkap** | Padi, palawija, hortikultura, perkebunan, peternakan, perikanan, lahan, lumbung, ekonomi, kelembagaan, st2023, renstra, bantuan-program/alokasi/korelasi |
| 5 | **Paket statis tersedia** | 16 xlsx templates + 37 CSV siap download untuk offline use |
| 6 | **Sheet PETUNJUK informatif** | Panduan penggunaan, daftar kolom, aturan upsert, daftar kecamatan di setiap template |
| 7 | **Validasi import kuat** | Enum check, year range, kecamatan validation, max 10k baris |
| 8 | **Skip kolom teknis otomatis** | id, kecamatan_id, desa_norm, created_at, updated_at, sumber — semua di-skip |

### ⚠️ Area yang Perlu Diperbaiki

| # | Temuan | Dampak | Prioritas |
|---|--------|--------|-----------|
| 1 | **3 tabel DB belum punya template** (`kwt_kelompok_wanita_tani`, `komoditas_unggulan`, `ltt_katam`) | Admin harus input manual via MySQL/phpMyAdmin, tidak bisa via UI admin | 🔴 **Tinggi** |
| 2 | **Kolom `dampak_catatan` tidak tampil di tabel UI** (`/government-assistance`) | Data yang diimport via template tapi tidak bisa dilihat di halaman | 🟡 **Sedang** |
| 3 | **Tidak ada kolom `sumber` di export** (auto-fill saat import, tapi tidak ada di CSV export) | Tidak bisa trace asal data dari export file | 🟢 **Rendah** |
| 4 | **CSV export vs export Excel berbeda** — 37 file CSV vs 37 file xlsx (jumlah sama, tapi Excel punya 3 sheet: PETUNJUK + DATA + CONTOH) | Tidak ada inkonsistensi, tapi dokumentasi admin perlu diperjelas | 🟢 **Rendah** |

### 🔍 Detail 3 Tabel Tanpa Template

**1. `kwt_kelompok_wanita_tani`** — 10 kolom, digunakan halaman `/sebaran-bidang`
- 6 kolom input: `nama_kelompok`, `kecamatan`, `desa`, `jenis`, `jumlah_anggota`, `produk_andalan`, `tahun_registrasi`
- 2 kolom geo: `latitude`, `longitude`
- Enum: jenis = [KWT, Pokdakan, Poklahsar, Pokmamas]

**2. `komoditas_unggulan`** — 10 kolom, digunakan halaman `/komoditas-unggulan`
- 6 kolom input: `bidang`, `komoditas`, `varietas`, `kecamatan`, `luas_lahan`, `produktivitas`, `produksi`, `ketersediaan_benih`, `tahun`
- Enum: bidang = [Pangan, Horti, Perkebunan, Peternakan, Perikanan]; ketersediaan_benih = [Tersedia, Terbatas, Langka]

**3. `ltt_katam`** — 13 kolom, digunakan halaman `/ltt-katam`
- 8 kolom input: `komoditas`, `kecamatan`, `jenis`, `luas_rencana`, `luas_tanam`, `luas_panen`, `produksi_rencana`, `produksi_aktual`, `bulan_mulai`, `bulan_panen`, `tahun`
- Enum: jenis = [LTT, Katam]; komoditas = [Padi, Jagung, Kedelai, dll]

---

## 6. REKOMENDASI

### 🔴 High — Tambahkan 3 template ke `domains.js` (1 hari kerja)

Konfigurasi 3 entry baru di `domains.js` untuk tabel `kwt_kelompok_wanita_tani`, `komoditas_unggulan`, dan `ltt_katam`. Setelah itu:
- Admin bisa download template via `/admin`
- Bisa import via `POST /api/v1/admin/import/:domain`
- Bisa export via `GET /api/v1/admin/export/:domain`

### 🟡 Medium — Tampilkan kolom `dampak_catatan` di tabel UI

Tambahkan kolom "Catatan Dampak" di tabel halaman `/government-assistance` untuk kolom `dampak_catatan` dari tabel `bantuan_program`.

### 🟢 Low — Standarisisasi kolom `sumber` di export CSV

Sertakan kolom `sumber` di semua CSV export untuk traceability (opsional, data sudah ada di DB).
