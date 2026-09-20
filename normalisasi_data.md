# Progress Normalisasi Distankan KP

## Status 8/8 DONE
- Item 1: "Ayam Ras Layer" diperlakukan sebagai ayam ras petelur — `clean_metric_label` EN_SINGLE_BLACKLIST="layer".
- Item 2: `pertanian2` → `Lahan bukan pertanian lainnya` (Penggunaan Lahan).
- Item 3: `J u m l a h` di-merge A:C → di-detect via combined col0+col1+col2.
- Item 4: EN bocor di folder 511 → skip baris EN-only di label_row_idx.
- Item 5: Tipe E-Kec (per Kecamatan + Jenis Tanaman) → mode F baru. Header = "{Tanaman} ({unit}) {Tahun}".
- Item 6: Float precision → round ke 2 desimal.
- Item 7: Nilai "-" + Excel error (#REF!, #N/A) → _is_empty_marker() skip.
- Item 8: Gap tahun Produksi Telur 2019 → bukan bug extractor. BPS tidak terbitkan data per-kecamatan untuk 2019 (file hanya stacked Tahun 2015-2018).

## Struktur BPS Banjarnegara yang sudah dipetakan
- **col A**: nomor urut ("01.", "1.", "(1)")
- **col B**: nama kecamatan (atau merged A:C untuk baris Jumlah / sub-header)
- **col C**: kadang header sub-unit "(Ha)", atau kosong
- **col D-G/H**: nilai metric

## Merged cell patterns
- Banyak baris kecamatan di-merge `A:C` (3 kolom merged).
- Baris `J u m l a h` selalu di-merge `A:C` dengan value di col A.
- Baris header tertentu juga `A:B` (misal title) atau `A:H` (unit row).
- openpyxl membaca value di top-left saja.

## Hasil akhir
- 39 folder extracted OK, 0 error
- Output di `public/14. Distankan KP/<folder>/<folder> CSV.csv` (wide) + `tidy/<folder>/<folder> tidy.csv`
- Index di `public/distankan-index.json`