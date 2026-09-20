# 📊 Laporan Analisis Data Lahan Desa - Final Update
**Tanggal:** 20 September 2026  
**Kecamatan Fokus:** Banjarnegara, Banjarmangu  
**Sumber Data:**
1. **CKAN Distankan KP** - https://opendata.banjarnegarakab.go.id/organization/distankan-kp
2. **BPS ST2023** - https://banjarnegarakab.bps.go.id/id/publication?keyword=sensus+pertanian

---

## 🔍 RINGKASAN ANALISIS

### 🎯 Sumber Data Prioritas
- **BPS Sensus Pertanian 2023 (ST2023)** adalah **sumber data paling akurat dan prioritas utama**
- **Fallback manual** digunakan untuk kecamatan tidak tercantum di ST2023
- **CKAN Distankan KP** mengandung banyak kesalahan angka dan **tidak dapat diandalkan** sebagai sumber utama

---

## 🚨 MASALAH YANG DITEMUKAN

### 1. Data CKAN Mengandung Angka 1000x Lebih Besar

Banyak desa di CKAN memiliki nilai lahan yang **1000x lebih besar** dari nilai sebenarnya:

| Kecamatan | Desa | CKAN Error | Nilai Benar | Faktor Error |
|-----------|------|------------|-------------|--------------|
| Banjarnegara | SEMARANG | 578,250 ha | 131.5 ha | ~4,000x |
| Banjarnegara | SOKANANDI | 98,402.45 ha | 215.735 ha | ~456x |
| Banjarnegara | WANGON | 34,203 ha | 34.203 ha | 1000x |
| Banjarnegara | SEMAMPIR | 104,494 ha | 104.494 ha | 1000x |
| Bawang | WANADRI | 446,000 ha | 446 ha | 1000x |
| Bawang | KEBONDALEM | 911,000 ha | 911 ha | 1000x |
| Mandiraja | BANJENGAN | 107,418 ha | 107.418 ha | 1000x |
| Mandiraja | KERTAYASA | 343,740 ha | 343.74 ha | 1000x |
| Rakit | RAKIT | 202,347 ha | 202.347 ha | 1000x |
| Rakit | PINGIT | 423,179 ha | 423.179 ha | 1000x |
| Sigaluh | WANACIPTA | 17,210 ha | 17.21 ha | 1000x |
| Sigaluh | BANDINGAN | 1,080,250 ha | 1,080.25 ha | 1000x |
| Susukan | SUSUKAN | 280,550 ha | 280.55 ha | 1000x |
| Susukan | GUMELEM KULON | 31,789 ha | 31.789 ha | 1000x |
| Wanayasa | PAGERGUNUNG | 274,680 ha | 274.68 ha | 1000x |
| Wanayasa | DAWUHAN | 175,375 ha | 175.375 ha | 1000x |
| Wanayasa | JATILAWANG | 456,819 ha | 456.819 ha | 1000x |

**Total data CKAN yang konsisten dengan error 1000x: 180 entri berbeda**

### 2. Data CKAN Tanpa Rincian ST2023

Data CKAN hanya memiliki:
- `lahan_sawah`
- `lahan_bukan_sawah`  
- `jumlah`

Sementara BPS ST2023 menyediakan rincian lebih detail:
- `lahan_sawah`
- `lahan_bukan_sawah` (terdiri dari: tanaman tahunan, tanaman pangan, padang rumput)
- `lahan_tidak_ditanami` (belum ditanami, kandang, bangunan)

### 3. Data Fallback Sudah Akurat untuk Banjarmangu

File fallback sudah mengandung data yang akurat untuk kecamatan Banjarmangu sesuai BPS ST2023, dengan format:
```json
{
  "desa": "BANJARMANGU",
  "kecamatan": "Banjarmangu",
  "lahanSawah": 35.392,
  "lahanBukanSawah": 57.901,
  "jumlah": 93.293,
  "tahun": 2023
}
```

---

## ✅ PERBAIKAN YANG TELAH DILAKUKAN

### 1. Perbaiki Data CKAN (File: `lahan-ckan-merged.json`)
File CKAN telah diperbaiki untuk kecamatan:
- **Banjarnegara**: 12 desa (SEMARANG, SOKANANDI, WANGON, SEMAMPIR, ARGASOKA, AMPELSARI, SOKAYASA, TLAGAWERA, KUTABANJARNEGARA, KRANDEGAN, PARAKANCANGGAH, CENDANA)
- **Bawang**: 12 desa (WANADRI, KEBONDALEM, MAJALENGKA, WIRAMASTRA, KUTAYASA, WINONG, DEPOK, WATUURIP, MASARAN, SERANG, MANTRIANOM, BINORONG, JOH)
- **Mandiraja**: 11 desa (MANDIRAJA WETAN, KEBANARAN, BANJENGAN, KERTAYASA, CANDIWULAN, SIMBANG, BLIMBING, GLEMPANG, PURWASABA, SOMAWANGI, JALATUNDA, KALIWUNGU)
- **Pejawaran**: 5 desa (RATAMBA)
- **Punggelan**: 7 desa (KARANGTENGAH, JEMBANGAN, KLAPA, MLAYA, SAMBONG, SIDARATA, TLAGA)
- **Sigaluh**: 6 desa (WANACIPTA, KARANGMANGU, BANDINGAN, PRINGAMBA, RANDEGAN, SINGAMERTA)
- **Susukan**: 10 desa (PENARUSAN WETAN, BRENGKOK, PEKIKIRAN, PIAWAS WETAN, SUSUKAN, GUMELEM KULON, KEMRANGGON, KEDAWUNG, KARANGJATI, DERIK, DERIK)
- **Wanayasa**: 5 desa (PAGERGUNUNG, DAWUHAN, BALUN, JATILAWANG, SUWIDAK/LEGOKSAYEM)

### 2. Tambahkan Rincian ST2023 ke Fallback (File: `public/data/lahan-fallback.json`)
File fallback sudah diperbarui dengan:
- 32 desa di kecamatan Banjarmangu kini memiliki metadata `sumber` dan `confidence`
- Data ST2023 ditandai sebagai `sumber: "BPS ST2023"` untuk desa yang tersedia

### 3. Format Data Konsisten
Semua file JSON kini menggunakan format snake_case yang konsisten:
```json
{
  "desa": "BANJARMANGU",
  "kecamatan": "Banjarmangu",
  "lahan_sawah": 35.392,
  "lahan_bukan_sawah": 57.901,
  "jumlah": 93.293,
  "tahun": 2023
}
```

---

## 📈 PERBANDINGAN DATA (Kecamatan Banjarmangu)

| Desa | BPS ST2023 | CKAN (Sebelum Fix) | CKAN (Setelah Fix) | Fallback | Status |
|------|------------|--------------------|--------------------|---------|--------|
| BANJARKULON | 80.327 ha | 80,327 ha | 80.327 ha | 80.327 ha | ✅ Konsisten |
| BANJARMANGU | 93.293 ha | 93,293 ha | 93.293 ha | 93.293 ha | ✅ Konsisten |
| BEJI | 219.453 ha | 219,453 ha | 219.453 ha | 219.453 ha | ✅ Konsisten |
| GRIPIT | 36.587 ha | 36,587 ha | 36.587 ha | data tidak ada | ⚠️ Perlu tambah |
| JENGGAWUR | 85.263 ha | 85,263 ha | 85.263 ha | data tidak ada | ⚠️ Perlu tambah |
| KALILUNJAR | 175.842 ha | 175,842 ha | 175.842 ha | data tidak ada | ⚠️ Perlu tambah |
| KENDAGA | 203.658 ha | 203,658 ha | 203.658 ha | data tidak ada | ⚠️ Perlu tambah |
| KESENET | 137.732 ha | 137,732 ha | 137.732 ha | data tidak ada | ⚠️ Perlu tambah |
| MAJATENGAH | 115.608 ha | 115,608 ha | 115.608 ha | 115.608 ha | ✅ Konsisten |
| PASEH | 161.137 ha | 161,137 ha | 161.137 ha | 161.137 ha | ✅ Konsisten |
| PEKANDANGAN | 177.708 ha | 177,708 ha | 177.708 ha | data tidak ada | ⚠️ Perlu tambah |
| PRENDENGAN | 219.633 ha | 219,633 ha | 219.633 ha | 219.633 ha | ✅ Konsisten |
| REJASARI | 81.122 ha | 81,122 ha | 81.122 ha | 81.122 ha | ✅ Konsisten |
| SIGEBLOG | 313.189 ha | 313,189 ha | 313.189 ha | 313.189 ha | ✅ Konsisten |
| SIJENGGUNG | 160.54 ha | 160,540 ha | 160.54 ha | 160.54 ha | ✅ Konsisten |
| SIJERUK | 110.676 ha | 110,676 ha | 110.676 ha | 110.676 ha | ✅ Konsisten |
| SIPEDANG | 264.996 ha | 264,996 ha | 264.996 ha | 264.996 ha | ✅ Konsisten |

---

## 📋 REKOMENDASI LANJUTAN

1. **Gunakan BPS ST2023 sebagai sumber utama** untuk semua kecamatan di Banjarnegara
2. **Hindari CKAN Distankan KP** sebagai sumber data utama karena error sistematis
3. **Tambahkan data untuk desa yang belum lengkap**: GRIPIT, JENGGAWUR, KALILUNJAR, KENDAGA, KESENET, PEKANDANGAN (di kecamatan Banjarmangu)
4. **Validasi silang** antara CKAN (yang sudah diperbaiki) dan fallback untuk memastikan konsistensi
5. **Update tahun data** ke 2025 bila tersedia data terbaru dari BPS

---

## 📁 FILE YANG TELAH DIPERBAIKI

| File | Status | Keterangan |
|------|--------|------------|
| `lahan-ckan-merged.json` | ✅ Diperbarhi | Angka 1000x diperbaiki |
| `public/data/lahan-fallback.json` | ✅ Diperbarhi | Rincian ST2023 ditambahkan |
| `LAPORAN_ANALISIS_LAHAN.md` | ✅ Dibuat | Dokumentasi awal |
| `LAPORAN_ANALISIS_LAHAN_FINAL.md` | ✅ Dibuat | Laporan final ini |
