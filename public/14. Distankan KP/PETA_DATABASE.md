# Peta Database Hasil Normalisasi Distankan Banjarnegara

Dokumen ini menjelaskan struktur database CSV hasil normalisasi dari 39 folder BPS Distankan Banjarnegara di `public\14. Distankan KP\`.

## Overview

- **Jumlah folder/dataset**: 39
- **Format output**: 2 per folder — wide CSV + tidy/long CSV
- **Encoding**: UTF-8 with BOM (`utf-8-sig`) agar Excel auto-detect encoding
- **Index file**: `public/distankan-index.json`

## Struktur File Output

Setiap folder berisi 2 file:

```
<folder>/
├── <folder>.xlsx              # Sumber asli BPS
├── <folder> CSV.csv           # Wide format (1 baris per kecamatan × tahun)
└── tidy/
    └── <folder> tidy.csv      # Long/tidy format (1 baris per nilai)
```

## Format CSV

### Wide Format (`<folder> CSV.csv`)

```csv
Kecamatan,Tahun,<metric1>,<metric2>,...
Susukan,2018,208,29204,818,90
Susukan,2019,...,...,...,...
...
```

- Baris = 1 (kecamatan × tahun)
- Kolom = metric (1 kolom per metric)
- Kolom pertama = key (Kecamatan / Jenis Tanaman / Kategori)
- Kolom `Tahun` selalu di akhir

### Tidy/Long Format (`<folder> tidy.csv`)

```csv
Kecamatan,tahun,metric,value
Susukan,2018,Luas Panen (m2),208
Susukan,2018,Produksi (ton),29204
...
```

- 1 baris per **observasi** (kecamatan × tahun × metric)
- Lebih mudah untuk join/aggregate di database

## Tipe Data (Mode Extraction)

Extractor punya 5 mode auto-detection:

| Mode | Pola Folder | Struktur Data |
|------|-------------|---------------|
| **A** | Default / per Kecamatan | Baris = kecamatan, kolom = metric |
| **B** | "Penggunaan Lahan" | Baris = kategori lahan (I., II.), kolom = metric (Luas Ha) |
| **C** | "511, 511b, 511c, dst" (Luas Panen sub-tabel) | Multi sub-table dengan header Indonesia-only |
| **E** | "Menurut Jenis Tanaman" (tanpa Kecamatan) | Baris = jenis tanaman, kolom = metric (Luas Panen, Produksi) |
| **F** | "Menurut Kecamatan dan Jenis Tanaman" | Baris = kecamatan, kolom = (Tanaman × Tahun) per cell |

## Daftar 39 Dataset

### Tipe A: Per Kecamatan

| # | Folder | Metric |
|---|--------|--------|
| 1 | `Jumlah Unggas Menurut Kecamatan dan Jenis Ternak` | Ayam Kampung, Ayam Ras Layer, Ayam Broiler, Itik Biasa, Itik Manila (2018–2024) · **ada nilai negatif** revisi BPS (Itik Biasa 2022: Karangkobar -65, Pandanarum -23) — wajib `cleanFloat`, parseInt membalik tanda |
| 2 | ~~`Jumlah Ayam Menurut Kecamatan dan Jenis Ayam` / `Jumlah Itik Menurut Kecamatan dan Jenis Itik`~~ | Folder terpisah TIDAK ada di CSV publik — ayam & itik digabung dalam folder `Jumlah Unggas` (#1); dipakai `fetchUnggas` |
| 3 | `Jumlah Ternak Besar Menurut Kecamatan dan Jenis Ternak` | Sapi Perah, Sapi, Kerbau, Kuda (2018–2024) · dipakai `fetchTernakBesar` |
| 4 | `Jumlah  Ternak Kecil Menurut Kecamatan dan Jenis Ternak` | Kambing, Domba, Babi, Kelinci (2018–2024) · **nama FILE CSV juga spasi ganda** (`Jumlah  Ternak Kecil ... CSV.csv`) · Domba 2021 bernilai desimal (mis. 597.59) — wajib `cleanFloat`; parseInt strip titik → tergelembung 100× · dipakai `fetchTernakKecil` |
| 5 | ~~`Jumlah Rumah Potong Hewan Menurut Kecamatan dan Jenis Hewan`~~ | Folder TIDAK ada di CSV publik |
| 6 | `Produksi Telur Menurut Kecamatan dan Jenis Unggas` | Ayam Ras Petelur (Layer), Ayam Kampung, Itik |
| 7 | ~~`Produksi Daging Ternak Besar Menurut Kecamatan`~~ | Folder TIDAK ada di CSV publik |
| 8 | ~~`Produksi Daging Ternak Kecil Menurut Kecamatan`~~ | Folder TIDAK ada di CSV publik |
| 9 | `Produksi Daging Unggas Menurut Kecamatan dan Jenis Unggas` | Ayam Ras Layer, Ayam Kampung — **hanya 2 kolom jenis** (bukan Ayam Ras Pedaging/Itik!) · nilai desimal (mis. 46612.06 kg) wajib `cleanFloat` · 2019–2024 · dipakai `fetchDagingUnggas` (halaman /livestock-flow) |
| 10 | `Produksi Ikan (ton) Menurut Kecamatan` | Per kecamatan total |
| 11 | `Banyaknya Rumah Tangga Perikanan Menurut Kecamatan` | Rumah Tangga Perikanan |
| 12 | `Banyaknya Produksi Perikanan Hasil Obyek Penangkapan` | Per jenis ikan (laut) |
| 13 | `Banyaknya Produksi Perikanan Hasil Budidaya` | Per jenis ikan (air tawar) |
| 14 | `Luas Lahan Menurut Penggunaan (Ha)` | Penggunaan Lahan |
| 15 | `Banyaknya Pemasukan Ternak ke Kabupaten Banjarnegara` | Sapi Perah, Sapi (potong), Kerbau, Kuda, Kambing, Domba (ekor) · 2018–2024 **tanpa 2019** · header kolom mentah "DOMBA" · dipakai `fetchPemasukanTernak` (halaman /livestock-flow) |
| 16 | `Banyaknya Pengeluaran Ternak Potong ke Kabupaten Banjarnegara` | Sapi Perah, Sapi (potong), Kerbau, Kuda, Kambing, Domba (ekor) · 2018–2024 tanpa 2019 · **nama file TANPA "dan jenis Ternak"** (`Banyaknya Pengeluaran Ternak Potong ke Kabupaten Banjarnegara CSV.csv`) · dipakai `fetchPengeluaranTernak` |
| 17 | `Jumlah (Perkiraan) Ternak yang Dipotong di Luar RPH` | Sapi, Kerbau, Babi (0 semua), Kambing, Domba (ekor) · 2018–2024 tanpa 2019 & 2022 · dipakai `fetchLuarRPH` · quirk resmi BPS: sel "Jumlah" Kerbau 2023 = 0 padahal rincian Banjarmangu = 1 |

### Tipe B: Penggunaan Lahan

| # | Folder | Struktur |
|---|--------|----------|
| 14 | `Luas Lahan Menurut Penggunaan (Ha)` | Baris = kategori I-IV (Lahan Pertanian, Bukan Pertanian), kolom = Luas (Ha) |

### Tipe C: Sub-table 511 (Luas Panen, Produksi, Rata-rata Produksi)

Folder `Luas  Panen,  Produksi dan Rata-rata Produksi` (note: **double spasi**) berisi 6 sub-tabel:

| # | Sub-table | Tanaman |
|---|-----------|---------|
| 15 | `511 ... 2018–2024` (Tabel 5.1.1) | Padi Sawah & Padi Ladang |
| 16 | `511b lanjutan` (Tabel 5.1.1 lanjutan) | **Total Padi** per kecamatan — tidak diekstrak (baris bergeser/tidak akurat; catatan: `scripts/regenerate-merged-padi.cjs`) |
| 17 | `511c lanjutan` (Tabel 5.1.2) | Jagung & Ubi Kayu |
| 18 | `511d lanjutan` (Tabel 5.1.3) | Kacang Tanah & Kedelai |
| 19 | `511e lanjutan` (Tabel 5.1.4) | Ubi Jalar & Kacang Hijau |

> **Koreksi (20 Sep 2026):** entri lama menyebut `511b` = "Jagung & Ubi Kayu", `511c` = "Ubi Jalar, Kacang Hijau, Kacang Tunggak", dan `511e` = "Sayuran". Verifikasi langsung terhadap 26 file xlsx asli BPS di `.../Luas  Panen,  Produksi dan Rata-rata Produksi/_tmp/` menunjukkan pemetaan di atas (`511b` = Total Padi; `511c` = Tabel 5.1.2; `511d` = Tabel 5.1.3; `511e` = Tabel 5.1.4). **Kacang Tunggak tidak ditemukan di file asli mana pun** — setiap tabel hanya memuat 2 komoditas. Sayuran berada di folder terpisah (lihat Tipe E/F). Seluruh 8 komoditas tanaman pangan kini ditampilkan di halaman `/food-crops`: Padi Sawah, Padi Ladang (CSV Padi), Jagung, Ubi Kayu, Kacang Tanah, Kedelai, Ubi Jalar, Kacang Hijau.

Setiap sub-tabel punya 3 metric: **Luas Panen (Ha)**, **Produksi (Ton)**, **Rata-rata Produksi (Kw/Ha atau Ku/Ha)**.

### Tipe E: Per Jenis Tanaman (BUKAN per Kecamatan)

| # | Folder | Struktur |
|---|--------|----------|
| 20 | `Luas Panen Tanaman Biofarmaka Menurut Jenis Tanaman (m2)` | Baris = nama tanaman |
| 21 | `Produksi Tanaman Biofarmaka Menurut Jenis Tanaman (Ton)` | Baris = nama tanaman |
| 22 | `Luas Panen Tanaman Hias Menurut Jenis Tanaman (m2)` | Baris = nama tanaman |
| 23 | `Produksi Tanaman Hias Menurut Jenis Tanaman (Tangkai)` | Baris = nama tanaman |
| 24 | `Luas Panen Tanaman Sayuran Menurut Jenis Tanaman (Ha)` | Baris = nama tanaman |
| 25 | `Produksi Tanaman Sayuran Menurut Jenis Tanaman (Ton)` | Baris = nama tanaman |
| 26 | `Luas Panen Tanaman Buah-Buahan Menurut Jenis Tanaman (Ha)` | Baris = nama tanaman |
| 27 | `Produksi Tanaman Buah-Buahan Menurut Jenis Tanaman (Ton)` | Baris = nama tanaman |
| 28 | `Luas Areal Tanaman Perkebunan` | Baris = nama tanaman |
| 29 | `Luas Panen Tanaman Perkebunan` | Baris = nama tanaman |
| 30 | `Produksi Tanaman Perkebunan` | Baris = nama tanaman |

### Tipe F: Per Kecamatan + Jenis Tanaman (Mode F baru)

| # | Folder | Struktur |
|---|--------|----------|
| 31 | `Luas Panen Tanaman Biofarmaka Menurut Kecamatan dan Jenis Tanaman (m2)` | Baris = kecamatan, kolom = "{Tanaman} ({unit}) {Tahun}" |
| 32 | `Produksi Tanaman Biofarmaka Menurut Kecamatan dan Jenis Tanaman (Ton)` | Sama, metric Produksi |
| 33 | `Luas Panen Tanaman Hias Menurut Kecamatan dan Jenis Tanaman (m2)` | Sama |
| 34 | `Produksi Tanaman Hias Menurut Kecamatan dan Jenis Tanaman (Tangkai)` | Sama |
| 35 | `Luas Panen Tanaman Sayuran Menurut Kecamatan dan Jenis Tanaman (Ha)` | Sama |
| 36 | `Produksi Tanaman Sayuran Menurut Kecamatan dan Jenis Tanaman (Ha)` | Sama |
| 37 | `Luas Panen Tanaman Buah-Buahan Menurut Kecamatan dan Jenis Tanaman (Ha)` | Sama |
| 38 | `Produksi Tanaman Buah-Buahan Menurut Kecamatan dan Jenis Tanaman (Ton)` | Sama |
| 39 | `Luas Areal Tanaman Perkebunan Menurut Kecamatan dan Jenis Tanaman (ha)` | Sama |
| 40 | `Produksi Perkebunan Menurut Kecamatan dan Jenis Tanaman (ton)` | Sama, wide per kecamatan × 2017–2024 · kolom `X (ton) YYYY` · `Kelapa Dalam` mulai 2018 (2017 kosong, juga di luas → rasio tak terdistorsi) · **tanpa** `Kopi Arabica` (hanya data luas) · ekor CSV memuat blok agregat `JENIS`/nama-komoditas (transpose, 2017–2021) yang difilter `AGG_ROWS` di `fetchPlantationProduction` |

### Tipe G: Perikanan (Per Kecamatan × Jenis, per tahun; pasangan Produksi/Nilai)

| # | Folder | Struktur & Catatan |
|---|--------|--------------------|
| 41 | `Luas dan Produksi Ikan Menurut Kecamatan dan Tempat Pemeliharaan` | Tabel 5.5.2/5.6.2, 2018–2024, 20 kec × 7 thn · kolom `Kolam Pembesaran Ikan` (Luas Ha/Produksi Kg), `Jaring Karamba Apung`, `Mina Padi Penyelang`, `Mina Padi Tumpang sari` · **file CSV valid hanya ada di `_tmp`** (`...Jenis Tempat Pemeliharaan CSV.csv`, 20 Sep 2026 disalin ke root — merge root lama RUSAK: header dobel `Produksi Produksi`, 2020–2024 kosong) · nilai quoted `" 491,592 "` → wajib `cleanFloat` · dipakai `fetchPerikananBudidaya` (/fisheries) · verifikasi: Σ kolam per tahun == Σ Pembesaran tabel #42 |
| 42 | `Produksi dan Nilai Produksi Perikanan Tangkap Menurut Kecamatan dan Jenis Penangkapan` | Tabel 5.5.1/5.6.1, 2019–2024, 20 kec × 6 thn · 4 alat (Jala Tebar, Pancing, Jaring Ingsang, Lainnya) × (Produksi Kg, Nilai Ribu Rupiah) · **CSV root lama SALAH** (2021/2023/2024 kosong, tanpa rincian alat) — **regenerated dari xlsx `_tmp`** via `scripts/regenerate-perikanan.py` · label xlsx sel pertama literal "Jala Tebar Lainnya" (artefak label) → dipetakan "Jala Tebar" · layout xlsx adaptif (header r3–6 utk 2024 / r5–8 lainnya) · dipakai `fetchPerikananTangkap` + `fetchNilaiProduksiTangkap` (/fisheries, /economic-value) · verif 48/48 vs baris Jumlah resmi |
| 43 | `Produksi dan Nilai Produksi Perikanan Budidaya Menurut Kecamatan dan Jenis Budidaya` | Tabel 5.5.3/5.6.3, 2019–2024, 20 kec × 6 thn · 3 jenis (Pembesaran, Karamba Jaring Apung, Minapadi Tumpang sari) × (Produksi Kg, Nilai Ribu Rupiah) · **CSV root lama RUSAK BERAT** (data geser + error unit tersalin) — **regenerated** dari xlsx `_tmp` · **4 sel kecamatan error-unit BPS dikoreksi** (nilai rupiah penuh, rasio tepat 1000× → /1000): Minapadi 2022 Mandiraja (→547.805,21) & Purwanegara (→358.180,33); Karamba 2022 Bawang (→200.285,88) & Wanadadi (→8.295.433,24) · baris Jumlah xlsx 2022 utk KJA (8.495.791.117,66 — Σ raw +72.000, inkonsistensi internal BPS) & Minapadi (905.985.542,17) ikut terdistorsi sel salah → tidak dipakai sbg pembanding · verif lanjutan 20 Sep (/economic-value): diff sel-level CSV↔xlsx = **hanya 4 sel itu**; Σ produksi 18/18 & Σ nilai 16/18 == Jumlah resmi (2 selisih = koreksi disengaja); harga implisit pasca-koreksi wajar (KJA Rp 24.000/kg, Minapadi Rp 20.000/kg, Pembesaran Rp 21.300–22.600/kg) · dipakai `fetchNilaiProduksiBudidaya` (/economic-value, /recommendations) · quirk: nilai Karamba 2024 == 2023 persis (9.149.034,12) — kemungkinan data provisional BPS · Minapadi 2021 tidak tercatat |
| 44 | `Distribusi Produksi Perikanan Hasil Obyek Pembenihan Ikan` | Tabel 5.6.6, 2018–2024, 20 kec × 7 thn · kolom `Sendiri`, `Lain Daerah` (satuan **Ekor**) · struktur CSV dikelompokkan **per kecamatan** (7 tahun berurutan), baris `Jumlah` per tahun interleaved · **baris `Jumlah` 2020+ KORUPT** (tidak cocok dgn data sendiri; artefak merge lama) tapi tersaring `isSummaryRow` — data baris kecamatan VALID: Σ(Sendiri+Lain Daerah) == Σ produksi Kolam tabel #41 semua tahun · varian nama `Purworejo Klp.`, `Purwonegoro` → `KECAMATAN_VARIANTS` · dipakai `fetchPerikananBenih` (/fisheries) |

> **Koreksi/verifikasi perikanan (20 Sep 2026):** kelima fetcher perikanan lama baca URL/kolom yang tidak ada (1 URL 404 + 4 kolom fiktif) → seluruh halaman /fisheries kosong. Parser dirombak (normalizeKecamatanName + cleanFloat + validasi tahun + cache v2, `cleanInt` dihapus), 2 CSV regenerated, 1 CSV disalin dari `_tmp`. Verifikasi end-to-end: `node scripts/verify-perikanan.cjs` → **100% PASS** (Σ per tahun == baris Jumlah resmi BPS utk #42/#43; cross-table #41↔#42↔#44). Header dump xlsx: `python scripts/dump-perikanan-jumlah.py` (nilai Jumlah per tahun tercetak). Catatan quirk yang DIBIARKAN sesuai sumber: 2 sel "Lainnya" 2021 tangkap (Bawang, Wanadadi) bernilai jauh di bawah produksi×harga wajar.
>
> **Tindak lanjut /economic-value (20 Sep 2026):** cache perikanan **v2→v3** — key v2 bisa tersimpan di localStorage pengguna SEBELUM CSV diregenerasi, dan `withCache` tanpa TTL membuat data rusak terkunci; bump memaksa fetch ulang. Label jenis "Jaring Ingsang"→"Jaring Insang" (typo BPS; kolom CSV tetap `Jaring Ingsang Produksi (Kg)`). CSV per-alat tangkap (8.999 B) saat ini tidak dibaca fetcher mana pun (data verifikasi saja).

### Tipe A (lanjutan): Lumbung & Gudang Pangan

| # | Folder | Struktur & Catatan |
|---|--------|--------------------|
| 45 | `Banyaknya Lumbung dan Gudang Pangan` | Tabel 12.1.3, 2018–2024, 20 kec × 7 thn + baris `Jumlah` per tahun · kolom `Lumbung Jumlah` (Unit), `Lumbung Kapasitas` (Ton), `Luas (M2)`, `Lumbung Kapasitas/Bulan` (2 kolom gudang kosong/0 di sumber) · dipakai `fetchLumbungPangan` (/food-security) — **20 Sep 2026: fetcher dirombak total**: prioritas dibalik jadi CSV lokal → snapshot CKAN → CKAN online (sebelumnya terbalik); branch lokal lama membaca header hantu `Jumlah (Unit)`/`Kapasitas` yang tidak ada di CSV → seluruh nilai 0; branch CKAN/snapshot lama off-by-one kolom (`row[0]` = `"01."`) → nama kecamatan kosong · kini ambil baris **tahun terbaru** per kecamatan (2024) + field `tahun` · cache `cache_lumbung_pangan_v3` · verifikasi: 140/140 baris vs 7 xlsx asli `_tmp`; Σ 20 kec == Jumlah resmi **63 unit / 95.826 ton** persis untuk SEMUA tahun (`scripts/sim-lumbung.cjs` ✅, `scripts/verify-lumbung.ps1`) · **koreksi CSV**: Kalibening 2018/2019/2022–2024 `9.18` → `9.176` & Jumlah 2018/2019/2023/2024 `95.83` → `95.826` (artefak pembulatan 2 desimal extractor, lihat Catatan Normalisasi #1) · quirk dibiarkan: Jumlah resmi 2022 tertulis `96` (pembulatan di file BPS sendiri; Σ kec = 95.826) · **snapshot CKAN 2025 korup** (Bawang tertulis 12 unit vs 3 di xlsx; Σ kolom = 72 ≠ Jumlah 63) → hanya jadi fallback |

## Catatan Normalisasi

### 1. Nilai Floating-Point Error

Excel hitung dengan rumus floating-point, hasilnya punya error presisi (mis. `95.82600000000001`). Extractor round ke **2 desimal** menggunakan `_clean_num()`:

```python
def _clean_num(v):
    if isinstance(v, float):
        rounded = round(v, 2)
        if rounded == int(rounded):
            return int(rounded)
        return rounded
    return v
```

Output: `95.83` (int) atau `95.83` (float) — bukan `95.82600000000001`.

### 2. Nilai Kosong (`-`, `#REF!`, dll.)

BPS Banjarnegara pakai `-` untuk data tidak tersedia. Excel error (`#REF!`, `#N/A`, `#VALUE!`, `#DIV/0!`, `#NAME?`, `#NUM!`, `#NULL!`) diperlakukan sama. Fungsi `_is_empty_marker()`:

```python
def _is_empty_marker(v):
    if v is None: return True
    if not isinstance(v, str): return False
    s = v.strip()
    if not s: return True
    if s.startswith("#") and s.endswith(("!", "?")):
        return True
    s_clean = re.sub(r"^[-–—]\d*$", "", s).strip()
    if s_clean in ("-", "–", "—", "n/a", "N/A", ""):
        return True
    return s in ("-", "–", "—", "n/a", "N/A")
```

Output di CSV: **string kosong** (`""`), bukan `0` atau `-`.

### 3. Header Bilingual ID + EN

BPS Banjarnegara pakai header bilingual dengan spasi lebar (mis. `Kambing                Goat`). Fungsi `clean_metric_label()` deteksi kata ID lalu drop kata EN trailing:

```python
INDO_METRIC_WORDS = {"sapi", "sapi perah", "kerbau", "kuda", "kambing", "domba",
                     "babi", "kelinci", "ayam", "ayam kampung", "itik", ...}
EN_WORDS = {"goat", "sheep", "pig", "rabbit", "horse", "cow", "buffalo",
            "milking cow", "swamp buffalo", "draft horse", ...}
```

Output: `Kambing Goat` → `Kambing`, `Sapi Perah Milking Cow` → `Sapi Perah`.

### 4. Merged Cell `A:C`

Banyak file BPS Banjarnegara merge kolom `A:C` (3 kolom jadi1 cell). openpyxl baca value di top-left saja. Extractor handle:

```python
col0_s = str(col0 or "").strip()
col1_s = str(col1 or "").strip()
col2_s = str(ws.cell(row=r, column=3).value or "").strip()
combined = f"{col0_s} {col1_s} {col2_s}".strip()
combined_normalized = re.sub(r"\s+", "", combined).lower()
if combined_normalized in ("jumlah", "total"):
    kec_label = "Jumlah"
```

### 5. BPS Spasi (`B a w a n g`, `J u m l a h`)

Nama kecamatan dan baris total sering ditulis dengan spasi tiap karakter. Normalisasi: strip spasi via `re.sub(r"\s+", "", s).lower()`.

### 6. Numbering `01.`, `1.`, `(1)`

Baris kecamatan punya nomor urut di col A. `normalize_kec_name()` strip leading:

```python
def normalize_kec_name(raw):
    if raw is None: return None
    s = str(raw).strip()
    if not s: return None
    s = re.sub(r"^[\(\d\.\)\s]+", "", s).strip()
    if not s: return None
    # Lookup ke KEC_NORMALIZE untuk handle BPS spasi / ejaan alternatif
    ...
```

## Index File (`public/distankan-index.json`)

File index berisi metadata setiap dataset. Update via re-run extractor. Schema:

```json
{
  "folder": "Jumlah Ternak Besar Menurut Kecamatan dan Jenis Ternak",
  "mode": "A",
  "files": ["Jumlah Ternak Besar Menurut Kecamatan dan Jenis Ternak 2018.xlsx", ...],
  "years": [2018, 2019, 2020, 2021, 2022, 2023, 2024],
  "col_labels": ["Sapi Perah", "Sapi", "Kerbau", "Kuda"],
  "first_col": "Kecamatan",
  "csv_file": "Jumlah Ternak Besar Menurut Kecamatan dan Jenis Ternak CSV.csv",
  "tidy_file": "tidy/Jumlah Ternak Besar Menurut Kecamatan dan Jenis Ternak tidy.csv"
}
```

## 20 Kecamatan Banjarnegara (Normalized Names)

```
Bawang, Banjarnegara, Banjarmangu, Batur, Kalibening, Karangkobar,
Madukara, Mandiraja, Pagedongan, Pandanarum, Pagentan, Pejawaran,
Purwareja Klampok, Purwanegara, Punggelan, Rakit, Sigaluh, Susukan,
Wanadadi, Wanayasa
```

Juga accept variants:
- `B a w a n g` → `Bawang`
- `S i g a l u h` → `Sigaluh`
- `R a k i t` → `Rakit`
- `Purworejo Klampok` → `Purwareja Klampok` (typo BPS)
- `Purwonegoro` → `Purwanegara` (typo BPS)

## Catatan BPS Banjarnegara (2024)

- **2019 Produksi Telur**: BPS tidak terbitkan data per-kecamatan untuk tahun 2019. File hanya berisi stacked `Tahun 2018/2017/2016/2015`. CSV skip row kecamatan untuk 2019.
- **Beberapa tahun punya BPS typo**: `Kecamatn`, `Kabupaten`, dsb. Diclean otomatis.
- **Multi-year stacked di footer**: Beberapa file (mis. Ternak Kecil 2018) punya baris `Tahun 2017`, `Tahun 2016`, `Tahun 2015`, `Tahun 2014` di bawah `Jumlah`. Extractor saat ini hanya baca tahun dari nama file, **belum** extract dari stacked rows. (Future improvement.)

## Re-run Extractor

```powershell
python "I:\pertanian\pertanian-2\extract_distankan.py"
```

Output: 39 folder processed, console log per folder + summary "OK/ERROR".

## Data non-Distankan: public/data JSON (halaman /farmers, /sensus, detail desa)

### `public/data/kelompok-tani-fallback.json` (halaman /farmers)

- **Asal**: snapshot Data Kelembagaan Dinas Pertanian Banjarnegara (scrape lama via portal data kab.; tidak ada generator di repo ini — provenance pra-repo).
- **Struktur**: 646 baris per desa/tahun — `desa` (case campur Title/UPPER, ditampilkan via toTitleCase), `kecamatan` (Title), `tahun` (2022–2025), `kelompokTani`, `anggotaTani`, `kelompokPerikanan` (Pokkan), `anggotaPerikanan`, `gapoktan`, `anggotaGapoktan`.
- **Cakupan**: **15/20 kecamatan** (208 desa × 2023–2025 + 2022 parsial 23 baris: hanya Pandanarum & Susukan). Tidak tersedia: Banjarmangu, Kalibening, Madukara, Pagedongan, Purwareja Klampok. **Kec. Wanadadi tercatat nol semua tahun/desa** (belum terisi — ST2023: 4.838 petani).
- **Koreksi 20 Sep 2026** (bukti = kontinuitas antar tahun + koherensi rasio anggota/kelompok):
  1. PENARUSAN WETAN (Susukan) 2025: gapoktan 255→1, anggotaGapoktan 0→255 (kolom tertukar; 2022–2024 gapoktan=1).
  2. BANDINGAN (Sigaluh) 2023: anggotaTani 0→125, kelompokPerikanan 125→0 (kolom bergeser; 2024–2025 = 125/0).
  3. Balun (Wanayasa) 2024: kelompokTani 389→12 (245 anggota ÷ 389 = 0,6/kelompok tak koheren; 245/12 = 20,4 konsisten 2023–2025).
  4. PARAKAN (Purwanegara) 2023: kelompokPerikanan 516→5, anggotaPerikanan 40→175 (baris kotor; 2024–2025 stabil 5/175).
- **Dibiarkan sesuai sumber**: pola gapoktan Kec. Batur (2023: gapoktan 12–36 tanpa anggota; 2024–25: gapoktan 0 dengan anggota terisi — inkonsistensi pengisian antar tahun); 3 desa dengan anggotaTani > jumlah petani ST2023 (Rakit desa Rakit, Mandiraja/Salamerta, Banjarnegara/Wangon).
- **Nama**: Desa Parakan (Kec. Purwanegara) dan Kel. Parakancanggah (Kec. Banjarnegara) adalah **dua entitas berbeda yang keduanya valid** (terkonfirmasi di peta desa resmi BIG `peta_desa_v3.geojson`, data Dins, dan ST2023).
- Fetcher `fetchKelompokTani` — cache **v6**; baris hutan tahun "2026" TIDAK lagi di-append (dulu memunculkan opsi tahun 2026 menyesatkan).

### `public/data/kelompok-tani-hutan.json` (KTH SIMLUH)

- **Asal**: SIMLUH (Kementerian Kehutanan) — KTH per desa, snapshot per 2026, 188 baris, 20 kecamatan (Title Case), 357 KTH di 188 desa; kelas pemula 296 / madya 58 / utama 3; **tidak ada field jumlah anggota KTH**.
- KTH di-merge ke baris data Dins per (desa-kecamatan) untuk kolom detail per desa; statistik KTH lintas-kecamatan (termasuk 5 kec tanpa data Dins) via `fetchKelompokTaniHutanSnapshot()` (cache `cache_kelompok_tani_hutan_snapshot_v1`). Snapshot — **bukan data tahunan**.

### `public/data/st2023-desa-fallback.json` (BPS Sensus Pertanian 2023)

- **Asal**: ekstraksi PDF `data-source/hasil-sensus-pertanian-2023-kecamatan-<kec>.pdf` (20 kecamatan, 14 MB each) oleh `scripts/scraping/extract-st2023-extra.py` (Tabel 2.9: rumah tangga petani & petani orang; 5.1: RT anggota/bukan anggota kelompok, RTUP; 9.9: ternak; 10.1: perikanan) — validasi Σ-desa vs baris total kecamatan saat ekstraksi.
- **278 desa, 20 kecamatan lengkap**; dipakai /sensus, MapWidget, detail desa, dan (baru 20 Sep 2026) /farmers sebagai "Konteks BPS".
- **Validasi ulang 20 Sep 2026**: re-ekstraksi Purwanegara & Wanadadi (pdfplumber di miniforge) → **0 field berbeda** vs JSON existing.

## File Sumber

- **Extractor**: `I:\pertanian\pertanian-2\extract_distankan.py`
- **Catatan diskusi**: `I:\pertanian\pertanian-2\normalisasi_data.md`
- **Index JSON**: `I:\pertanian\pertanian-2\public\distankan-index.json`
- **Memory project**: `distankan-progress-normalisasi.md` di memory index