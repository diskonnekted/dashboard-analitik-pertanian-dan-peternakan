# SISPERTANI — Data Pertanian Banjarnegara

Dashboard pertanian Kabupaten Banjarnegara. Aplikasi berbasis React + Vite dengan data referensi BPS Distankan Banjarnegara.

## Struktur Data Referensi

Folder `public/14. Distankan KP/` berisi **39 dataset** BPS pertanian Banjarnegara yang sudah dinormalisasi ke format CSV.

**Lihat [PETA_DATABASE.md](public/14.%20Distankan%20KP/PETA_DATABASE.md) untuk dokumentasi lengkap** struktur database, mode extraction, dan catatan normalisasi.

## Ringkasan 39 Dataset

| Kategori | Jumlah |
|----------|--------|
| Tipe A: Per Kecamatan | 14 |
| Tipe B: Penggunaan Lahan | 1 |
| Tipe C: Sub-tabel 511 (Luas Panen/Produksi/Rata-rata) | 6 |
| Tipe E: Per Jenis Tanaman (no Kecamatan) | 11 |
| Tipe F: Per Kecamatan + Jenis Tanaman | 7 |

## Format File Output

Setiap folder dataset punya:
- `<folder> CSV.csv` — wide format (1 baris per kecamatan × tahun)
- `tidy/<folder> tidy.csv` — long format (1 baris per observasi)
- `<folder>*.xlsx` — sumber asli BPS

## Re-extract Data

```powershell
python "I:\pertanian\pertanian-2\extract_distankan.py"
```

Lihat juga: `normalisasi_data.md` (catatan diskusi normalisasi).