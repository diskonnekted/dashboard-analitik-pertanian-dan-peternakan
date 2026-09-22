# Template Import & Export Database SISPERTANI

Paket template Excel (.xlsx) dan CSV untuk seluruh domain database aplikasi SISPERTANI
(Banjarnegara). Dibuat **22 September 2026** — 16 domain, 37 tabel, 18.495 baris data live.

Template 15 domain dasbor dibuat oleh **engine aplikasi yang sama** dengan yang dipakai
Dasbor Admin (`backend/src/lib/excel.js`), sehingga formatnya 100% identik dan dijamin
dapat diimpor balik tanpa penyesuaian.

## Struktur Folder

```
template-import-export/
├── generate-templates.mjs   ← generator (jalankan ulang kapan pun)
├── README.md                ← dokumen ini
├── templates/               ← TEMPLATE IMPORT — xlsx siap isi (16 domain)
│   └── csv/                 ← template CSV per tabel (37) — header + baris contoh nyata
└── exports/                 ← SNAPSHOT DATA LIVE per tanggal (16 domain)
    └── csv/                 ← export CSV per tabel (37) — data penuh
```

Nama file mengikuti domain: `template-peternakan.xlsx`, `template-padi.xlsx`,
`template-perikanan.xlsx`, dst. Versi CSV memakai nama tabel: `populasi.csv`,
`tangkap_per_alat.csv`, dst.

## Daftar Domain (16)

| Domain | File Template | Sheet / Tabel | Baris Live |
|---|---|---|---|
| Padi | `templates/template-padi.xlsx` | padi_produksi | 164 |
| Palawija | `templates/template-palawija.xlsx` | palawija_produksi | 442 |
| Hortikultura | `templates/template-hortikultura.xlsx` | luas & produksi per kecamatan + kabupaten (4 sheet) | 6.385 |
| Perkebunan | `templates/template-perkebunan.xlsx` | areal per kecamatan, produksi per kecamatan + kabupaten (3 sheet) | 2.557 |
| **Peternakan** | `templates/template-peternakan.xlsx` | populasi, daging, telur, susu & kulit, aliran ternak, pemotongan RPH (6 sheet) | 4.685 |
| Perikanan | `templates/template-perikanan.xlsx` | tangkap per alat, perairan umum, budidaya, benih, kolam, waduk, mina padi, tempat pemeliharaan, obyek penangkapan (9 sheet) | 2.314 |
| Lahan | `templates/template-lahan.xlsx` | penggunaan_lahan | 121 |
| Lumbung Pangan | `templates/template-lumbung.xlsx` | lumbung_pangan | 140 |
| Ekonomi | `templates/template-ekonomi.xlsx` | inflasi, pasar (2 sheet) | 89 |
| Kelembagaan | `templates/template-kelembagaan.xlsx` | kelompok_tani, kelompok_tani_hutan (2 sheet) | 1.022 |
| Sensus Pertanian 2023 | `templates/template-st2023.xlsx` | st2023_desa | 278 |
| Renstra | `templates/template-renstra.xlsx` | target_renstra | 0 (belum terisi) |
| Bantuan — Program | `templates/template-bantuan-program.xlsx` | bantuan_program | 0 (belum terisi) |
| Bantuan — Alokasi | `templates/template-bantuan-alokasi.xlsx` | bantuan_alokasi | 0 (belum terisi) |
| Bantuan — Korelasi | `templates/template-bantuan-korelasi.xlsx` | bantuan_korelasi | 0 (belum terisi) |
| Referensi | `templates/template-referensi.xlsx` | kecamatan, desa (2 sheet) | 20 + 278 |

## Cara Pakai — IMPORT (Upload Data)

1. Unduh / salin template domain yang sesuai, mis. `template-peternakan.xlsx`.
2. Isi data pada **sheet data** (yang bukan `PETUNJUK` dan bukan `CONTOH *`).
   Sheet `CONTOH *` berisi 2 baris contoh dari database — jangan diisi, tidak diimpor.
3. Buka aplikasi → **Dasbor Admin** (`/admin`) → login → pilih domain → tombol **Import**
   → pilih file yang sudah diisi.
4. Laporan impor muncul: jumlah baris baru (inserted), diperbarui (updated), dan error per baris.

Aturan pengisian (sama dengan sheet PETUNJUK di setiap template):

- **Jangan mengubah atau menghapus baris header** — sistem mencocokkan kolom dari judulnya.
- **Kecamatan** harus salah satu dari 20 kecamatan resmi Banjarnegara
  (ejaan varian dikenali otomatis oleh sistem).
- **Tahun** harus 2000–2030.
- **Angka**: pemisah ribuan koma, desimal titik — contoh `1.234` dan `12.5`.
- **Upsert by natural key** (kecamatan/jenis/tahun atau sejenisnya): baris dengan kunci
  yang sama akan **memperbarui** data lama, bukan menduplikasi.
- Kolom `sumber` diisi otomatis `"manual"` oleh sistem — tidak perlu ditulis.
- Baris dengan sel wajib kosong akan dilewati dan dilaporkan, tidak membatalkan baris lain.

## Cara Pakai — EXPORT

- File di `exports/` adalah snapshot data per tanggal (contoh:
  `export-peternakan-2026-09-22.xlsx`) — cocok untuk backup/audit/offline.
- Untuk data terbaru, gunakan tombol **Export** di Dasbor Admin (selalu query langsung).
- `exports/csv/` berisi versi CSV per tabel dari snapshot yang sama.

## Catatan CSV

- Semua CSV ditulis **UTF-8 dengan BOM** agar Excel membaca karakter khusus (², •) dengan benar.
- Di Python/Pandas: `pd.read_csv(..., encoding="utf-8-sig")`.
- Impor via Dasbor Admin **hanya menerima .xlsx** — CSV disediakan untuk pertukaran data
  dengan tools lain (Pandas, R, Google Sheets, dsb.).

## Domain REFERENSI (Khusus)

`template-referensi.xlsx` / `export-referensi-*.xlsx` berisi kecamatan (20) dan desa (278).
Domain ini **tidak dikelola lewat Dasbor Admin** (by design):

- Mutasi data referensi dilakukan lewat importer GeoJSON: `database/import/ref.mjs`.
- File ini untuk **dokumentasi, audit, dan pemetaan nama → kode BPS** — bukan untuk impor.

## Tabel TANPA Template (By Design)

| Tabel | Alasan |
|---|---|
| `dataset_sumber` | metadata sumber internal (CKAN/CSV/manual) |
| `sync_log` | audit log sinkronisasi sistem |
| `kth_detail` | rincian anggota KTH dalam kolom JSON |
| `lahan_desa` | kolom JSON + dikelola ETL ST2023 (regen dari `database/import/`) |

Jika butuh isi `lahan_desa`, gunakan endpoint `/api/v1/lahan/desa` atau regenerasi ETL —
bukan Excel.

## Regenerasi Template

```bash
cd database/template-import-export
node generate-templates.mjs      # atau: npm run generate
```

Prasyarat: **MySQL/MariaDB hidup** (data `sispertani`) + `backend/.env` tersedia.
Generator memanggil engine backend langsung (`buildWorkbook`), jadi hasilnya selalu
sinkron dengan aplikasi. Folder `templates/csv/` dan `exports/csv/` dibersihkan otomatis
sebelum ditulis ulang.

## Verifikasi yang Sudah Dilakukan (22 Sep 2026)

- **Round-trip import 15/15 PASS**: setiap `template-*.xlsx` (versi kosong) di-POST ke
  `POST /api/v1/admin/import/:domain` → semua sheet terdeteksi dengan tabel yang benar,
  0 error, 0 inserted/updated (DB tidak berubah) — membuktikan header & format dikenali.
- Export CSV cross-check: tabrakan nama sheet antar domain (hortikultura vs perkebunan)
  sudah dipisah — `produksi_per_kecamatan.csv` (3.298 baris) vs
  `perkebunan_produksi_per_kecamatan.csv` (1.219 baris).
- Kolom teknis (`id`, `kecamatan_id`, `desa_norm`, `nama_norm`, `sumber`, timestamps)
  dikecualikan dari semua template, konsisten dengan engine dasbor.
