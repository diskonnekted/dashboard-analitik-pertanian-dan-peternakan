# 📊 Laporan Analisis Data Lahan Desa

**Tanggal:** 20 September 2026  
**Kecamatan Fokus:** Banjarmangu, Banjarnegara  
**Sumber Data:**
1. **CKAN Distankan KP** - https://opendata.banjarnegarakab.go.id/organization/distankan-kp
2. **BPS ST2023** - https://banjarnegarakab.bps.go.id/id/publication?keyword=sensus+pertanian

---

## 🔍 METODOLOGI

Analisis dibandingkan tiga sumber data:
- **CKAN Distankan KP** (`lahan-ckan-merged.json`) - Data dari OpenData Banjarnegara
- **Fallback Lokal** (`public/data/lahan-fallback.json`) - Data perbaikan lokal (tahun 2025)
- **BPS Sensus Pertanian 2023 (ST2023)** (`data-source/lahan-st2023-*.json`) - Data sensus resmi BPS (tahun 2023)

---

## 🚨 MASALAH YANG DITEMUKAN

### 1. Data CKAN Berisi Angka Salah (Desimal Salah Tempat)

Beberapa desa di CKAN memiliki nilai lahan yang **1000x lebih besar** dari nilai sebenarnya:

| Desa | CKAN (Salah) | Fallback (Benar) | BPS ST2023 | Status |
|------|-------------|-------------------|------------|--------|
| SEMARANG | Sawah: 60.700 ha | Sawah: 60.7 ha | - | ❌ Salah 1000x |
| SOKANANDI | Sawah: 98.285 ha | Sawah: 98.285 ha | - | ❌ Salah |
| AMPELSARI | Sawah: 1.810.000 ha | Sawah: 60 ha | - | ❌ Salah 1000x |
| KARANGTENGAH | Sawah: 1.119 ha | Sawah: 1.119 ha | - | ⚠️ Perlu verifikasi |

**Akar masalah:** Data CKAN mengalami kesalahan konversi desimal - nilai yang seharusnya dalam hektar (misal 60.7) tertulis sebagai 60700.

### 2. Data CKAN Tidak Memiliki Rincian Lahan

Data CKAN hanya memiliki:
- lahan_sawah
- lahan_bukan_sawah
- jumlah

Sementara BPS ST2023 menyediakan rincian lebih detail:
- lahan_sawah
- lahan_bukan_sawah (terdiri dari: tanaman tahunan, tanaman pangan, padang rumput)
- lahan tidak ditanami (termasuk belum ditanami, kandang, bangunan)

### 3. Data Fallback Belum Lengkap

File fallback (`public/data/lahan-fallback.json`) belum mencakup semua desa dan belum memiliki rincian ST2023 untuk kecamatan Banjarmangu.

---

## 📈 PERBANDINGAN DATA (Kecamatan Banjarmangu)

### Data BPS ST2023 (Tahun 2023) vs Fallback (Tahun 2025)

| Desa | Sawah (BPS) | Sawah (Fallback) | Bukan Sawah (BPS) | Bukan Sawah (Fallback) | Total (BPS) | Total (Fallback) | Selisih (%) |
|------|------------|------------------|-------------------|------------------------|-------------|------------------|-------------|
| BANJARKULON | 57.938 ha | - | 22.389 ha | - | 80.327 ha | - | - |
| BANJARMANGU | 35.392 ha | - | 57.901 ha | - | 93.293 ha | - | - |
| BEJI | 12.606 ha | - | 206.847 ha | - | 219.453 ha | - | - |
| GRIPIT | 0.2 ha | - | 36.387 ha | - | 36.587 ha | - | - |
| JENGGAWUR | 71.755 ha | - | 13.508 ha | - | 85.263 ha | - | - |
| KALILUNJAR | 5.192 ha | - | 170.65 ha | - | 175.842 ha | - | - |
| KENDAGA | 6.012 ha | - | 197.646 ha | - | 203.658 ha | - | - |
| KESENET | 4.832 ha | - | 132.9 ha | - | 137.732 ha | - | - |
| MAJATENGAH | 6.025 ha | - | 109.583 ha | - | 115.608 ha | - | - |
| PASEH | 13.487 ha | - | 147.65 ha | - | 161.137 ha | - | - |
| PEKANDANGAN | 0 ha | - | 177.708 ha | - | 177.708 ha | - | - |
| PRENDENGAN | 50.972 ha | - | 168.662 ha | - | 219.633 ha | - | - |
| REJASARI | 25.754 ha | - | 55.368 ha | - | 81.122 ha | - | - |
| SIGEBLOG | 0.636 ha | - | 312.553 ha | - | 313.189 ha | - | - |
| SIJENGGUNG | 3.963 ha | - | 156.577 ha | - | 160.54 ha | - | - |
| SIJERUK | 13.718 ha | - | 96.959 ha | - | 110.676 ha | - | - |
| SIPEDANG | 14.321 ha | - | 250.675 ha | - | 264.996 ha | - | - |

### Perbandingan dengan Fallback Banjarnegara

| Desa | BPS ST2023 | Fallback | CKAN | Status |
|------|------------|----------|------|--------|
| SEMARANG | - | 60.7 ha | 60.700 ha ❌ | Data tersimpan ratusan |
| SOKANANDI | - | 98.285 ha | 98285 ha ❌ | Data tersimpan ribuan |

---

## ✅ REKOMENDASI PERBAIKAN

### Prioritas 1: Perbaiki Data Fallback Banjarmangu
Ganti data fallback untuk kecamatan Banjarmangu dengan data BPS ST2023:

```json
[
  {
    "desa": "BANJARKULON",
    "kecamatan": "Banjarmangu",
    "lahanSawah": 57.938,
    "lahanBukanSawah": 22.389,
    "jumlah": 80.327,
    "tahun": 2023,
    "rincian": {
      "bukanSawah": 1.658,
      "padangRumputSementara": 0,
      "padangRumputPermanen": 0,
      "belumDitanami": 0.155,
      "tanamanTahunan": 20.426,
      "kandangBangunan": 0.149
    }
  }
  // ... dst untuk semua desa
]
```

### Prioritas 2: Perbaiki Data CKAN
File `lahan-ckan-merged.json` harus diperbaiki dengan:
1. Memperbaiki angka desimal yang salah (bagi dengan 1000)
2. Menambahkan rincian ST2023

### Prioritas 3: Tambahkan Rincian ST2023 ke Semua File
Setiap entry data lahan harus mencakup rincian:
- `lahanSawah`
- `lahanBukanSawah`
- `lahanTidakDitanami`
- `rincian.bukanSawah`
- `rincian.tanamanTahunan`
- `rincian.tanamanPangan`
- `rincian.kandangBangunan`

---

## 📝 CATATAN IMPLEMENTASI

- Data BPS ST2023 menjadi sumber utama yang paling akurat
- Data fallback digunakan sebagai cadangan bila BPS tidak tersedia
- Data CKAN hanya sebagai sumber referensi tambahan (dengan perbaikan)
- Format data harus konsisten di semua file JSON
- Tahun data BPS ST2023 adalah 2023, sedangkan fallback menggunakan 2025
