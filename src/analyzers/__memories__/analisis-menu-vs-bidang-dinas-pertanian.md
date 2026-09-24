# Memory: Analisis Menu vs. Bidang Dinas Pertanian Banjarnegara
# Status: Draft Analisis

## Konteks
Tanggal analisis: 2026-09-23
Sumber banding: konfigurasi navigasi aplikasi (`src/config/site.ts`) vs. struktur organisasi Dinas Pertanian Banjarnegara.

## Struktur Referensi resmi Dinas Pertanian Banjarnegara
1. **Sekretariat** — perencanaan, keuangan, umum, dan kepegawaian.
2. **Bidang Tanaman Pangan** — produksi serta usaha tanaman pangan.
3. **Bidang Hortikultura dan Perkebunan** — produksi, pengembangan, dan usaha komoditas hortikultura serta perkebunan.
4. **Bidang Peternakan** — produksi, pengembangan usaha peternakan, kesehatan hewan, serta kesehatan masyarakat veteriner.
5. **Bidang Perikanan** — perikanan tangkap maupun perikanan budidaya.
6. **Bidang Ketahanan Pangan** — ketersediaan, distribusi, cadangan, dan penganekaragaman konsumsi pangan.

## Struktur navigasi aplikasi (`siteConfig.navGroups`)
1. **""** — Dashboard (`/`).
2. **Data Master & Spasial** — /lahan, /suitability, /sensus-2023, /kecamatan.
3. **Bidang Tanaman Pangan** — /prediction, /food-crops, /komoditas-unggulan/pangan, /nilai-ekonomi/pangan, /sebaran/pangan.
4. **Bidang Hortikultura** — /horticulture, /komoditas-unggulan/hortikultura, /nilai-ekonomi/hortikultura, /sebaran/hortikultura.
5. **Bidang Perkebunan** — /plantation, /komoditas-unggulan/perkebunan, /ltt-katam, /nilai-ekonomi/perkebunan, /sebaran/perkebunan.
6. **Bidang Peternakan** — /livestock, /peternakan/susu-kulit, /komoditas-unggulan/peternakan, /nilai-ekonomi/peternakan, /livestock-flow, /sebaran/peternakan.
7. **Bidang Perikanan** — /fisheries, /komoditas-unggulan/perikanan, /economic-value, /sebaran/perikanan.
8. **Ketahanan Pangan & Distribusi** — /food-security, /supply-chain, /price-volatility.
9. **Penyuluhan & Kelembagaan** — /farmers, /kewirausahaan/kwt.
10. **Analisis & Perencanaan Strategis** — /government-assistance, /renstra, /recommendations.
11. **Pengaturan & Bantuan** — /info, /manual.
12. **Pengembangan** — semua item `hidden: true` (modul dalam pengembangan).

## Analisis Keselarasan

### PSESUAI (On Target)
- **Bidang Tanaman Pangan** — grup navigasi "Bidang Tanaman Pangan" sudah sesuai, meliputi prediksi, produksi padi & palawija, komoditas unggulan, nilai ekonomi, dan sebaran.
- **Bidang Hortikultura** — grup "Bidang Hortikultura" sudah sesuai dengan fokus hortikultura.
- **Bidang Perkebunan** — grup "Bidang Perkebunan" sudah sesuai, termasuk LTT & Kalender Tanam.
- **Bidang Peternakan** — grup sudah mencakup populasi/produksi ternak, susu & kulit, lalu-lintas & pemotongan, komoditas unggulan, nilai ekonomi, sebaran.
- **Bidang Perikanan** — grup sudah mencakup produksi perikanan, komoditas unggulan, nilai ekonomi, sebaran.
- **Bidang Ketahanan Pangan** — grup "Ketahanan Pangan & Distribusi" mencakup neraca komoditas, rantai pasok/distribusi, dan fluktuasi harga/inflasi.

### POLESAN / DISAMAKAN (Merger yang Wajar)
- **Hortikultura + Perkebunan Digabung di Referensi Resmi**, namun aplikasi memisahkannya menjadi dua grup tersendiri ("Bidang Hortikultura" & "Bidang Perkebunan").
  - Ini sebenarnya **bisa diterima** karena perkebunan (misalnya kelapa sawit, kopi, teh) dan hortikultura (sayur, buah) adalah sub-sektor yang cukup berbeda dalam praktik.
  - Namun, jika ingin **sejalan persis dengan struktur organisasi resmi**, sebaiknya kedua grup ini digabung menjadi satu grup "Bidang Hortikultura dan Perkebunan".
  - **Rekomendasi**: Pertimbangkan untuk **menggabungkan** kedua grup ini agar lebih selaras dengan struktur organisasi resmi Dinas Pertanian Banjarnegara.

### KETERUNGSANAN (On-Track)
- **Sekretariat** — tidak ada grup navigasi khusus yang mewakili fungsi Sekretariat (perencanaan, keuangan, umum, kepegawaian).
  - Di aplikasi, fungsi-fungsi ini kemungkin besar ditangani oleh grup "Analisis & Perencanaan Strategis" (misalnya /renstra) dan "Pengaturan & Bantuan".
  - **Rekomendasi**: Pertimbangkan untuk menambahkan keterangan atau grup khusus jika ada modul perencanaan/anggaran/kepegawaian yang ingin ditampilkan di masa depan.

### LAIN-LAIN (Out of Scope / Penyulihan)
- **Penyuluhan & Kelembagaan**, **Analisis & Perencanaan Strategis**, **Pengaturan & Bantuan** — ini adalah grup tambahan di aplikasi yang tidak termasuk dalam 6 bidang utama Dinas Pertanian Banjarnegara, tetapi sangat relevan dan penting untuk sebuah sistem informasi pertanian modern.

## Kesimpulan Umum
Navigasi aplikasi sudah **sangat sesuai** dengan bidang-bidang Dinas Pertanian Banjarnegara, terutama pada grup-grup Bidang Tanaman Pangan, Hortikultura, Perkebunan, Peternakan, Perikanan, dan Ketahanan Pangan.

Satu-satunya poenya adalah **pemisahan Hortikultura dan Perkebunan** yang dijadikan satu dalam struktur resmi namun dipisahkan di navigasi aplikasi.

Untuk **kesesuaian maksimal dengan struktur organisasi resmi**, sebaiknya:
1. **Gabungkan grup "Bidang Hortikultura" dan "Bidang Perkebunan"** menjadi satu grup "Bidang Hortikultura dan Perkebunan".
2. **Pertimbangkan penambahan grup atau sub-item** untuk menangani fungsi Sekretariat (perencanaan/keuangan/UMUM) jika modul tersebut akan dikembangkan di masa depan.

---
# Status: Draft selesai — siap untuk divalidasi dengan klien/stakeholder.
# Saran: Gabungan Hortikultura+Perkebunan bisa dibahas dalam sesi refine berikutnya.