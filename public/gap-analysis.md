# Gap Analysis Fitur SISPERTANI — v4.1

> **Update: 30 September 2026** (sebelumnya v4.0, 22 September 2026)
> Basis audit: kode aktual per 30 Sep 2026 — 23 halaman aktif (bertambah `/ketahanan-pangan`), backend Express :4100, MySQL (XAMPP MariaDB dev), 20 route placeholder "ComingSoon", 6 komponen detail desa.
> Lokasi kanonik dokumen: `public/gap-analysis.md` (v3.2 menyebut `.docs/` — tidak pernah ada; dikoreksi di v4.0).
> Rencana lanjutan: lihat **`public/pengembangan.md`**.

**Legenda:** ✅ ada & terverifikasi · 🟡 parsial (data atau UI sebagian) · ❌ belum ada

---

## Changelog v4.0 → v4.1 (30 Sep 2026)

**Ketahanan Pangan direstrukturisasi ke kerangka 3 Pilar Bapanas/FAO** — halaman baru `/ketahanan-pangan`:

1. **Kerangka pemersatu 3 pilar.** Data ketahanan pangan sebelumnya tersebar di empat halaman
   (`/food-security`, `/fsva`, `/price-volatility`, `/supply-chain`) tanpa kerangka pemersatu.
   Kini definisi & cakupan FAO/Bapanas (ketersediaan, keterjangkauan, pemanfaatan) dipetakan
   eksplisit ke data riil, lengkap dengan tautan ke halaman sumbernya.
2. **Neraca kalori 2.100 kkal/kapita/hari** (permintaan `gap-analysis-master.md` baris 6).
   17 komoditas dari 9 fetcher resmi; faktor konversi TKPI (Kemenkes) + rendemen/BDD NBM (Bapanas)
   dipusatkan di `src/services/ketahananPangan.ts` agar dapat diaudit. Status per kecamatan:
   Swasembada (≥125%) / Surplus (100–125%) / Defisit (75–100%) / Kurang (<75%).
   **Tervalidasi silang independen** terhadap API: 1.998 vs 1.995 kkal/kap/hari (selisih 0,15%,
   karena halaman hanya menghitung 19 kecamatan yang punya data padi).
3. **FSVA diagregasi per kecamatan & per pilar** (278 desa, 2021–2024) — sebelumnya hanya per desa.
   Indikator `rasioMiskin` & `tanpaAkses` → pilar keterjangkauan; `tanpaAirBersih` & `rasioNakes` →
   pilar pemanfaatan; `rasioLahan` & `rasioSarana` → pilar ketersediaan.
4. **Cadangan pangan direposisi** ke halaman ketahanan pangan (lumbung & gudang) sebagai komponen
   pilar ketersediaan — sebelumnya hanya tampil di detail kecamatan.
5. **Celah data dinyatakan terbuka, bukan diisi perkiraan** (`CELAH_DATA_PILAR`, 9 item):
   Skor PPH, PoU, stunting, keamanan pangan, produksi bulanan, RMU, arus impor antar wilayah,
   pendapatan per kapita, kondisi jalan — masing-masing disertai sumber data yang dibutuhkan.
6. **Koreksi temuan v4.0 yang stale**: baris "FSVA ❌ 0 hit" sudah tidak berlaku (FSVA implemented
   24 Sep). Yang benar-benar belum ada: PPH, PoU, stunting, RMU, produksi bulanan.
7. **Keterbatasan data yang ditemukan & dinyatakan jujur**: susu tidak dapat dihitung karena sumber
   "Jumlah Produksi Kulit dan Susu" mencampur kulit (lembar) dan susu (liter) dalam satu kolom;
   Kecamatan Batur tidak punya data produksi padi sehingga tidak ikut neraca.

**Skor sinkronisasi:** dari ~40 item gap → **16 selesai**, **7 parsial**, **~17 masih gap asli**.

---

## Changelog v3.2 → v4.0 (22 Sep 2026)

Sejak v3.2 ditulis, terjadi perubahan besar yang membuat banyak item 🔴 "BELUM ADA" menjadi **sudah ada**:

1. **Fase A+B migrasi MySQL** (21–22 Sep): schema 40 tabel + ETL ~19.500 baris + backend 32 endpoint + **dasbor admin import/export Excel 15 domain** (template `.xlsx`, upsert, E2E 15/15 PASS).
2. **Integrasi ST2023 per desa**: tabel `st2023_desa` (RTUP, petani, RT perikanan budidaya/tangkap, ternak 17+ jenis sebagai JSON) → menghidupkan `/sensus-2023`, breakdown `/livestock` per jenis, peta desa, `DesaTernak`.
3. **Modul bantuan**: halaman `/government-assistance` + 3 tabel `bantuan_*` + endpoint `/v1/bantuan` (sanity dilepas, commit 2eabac6).
4. **Hortikultura per komoditas**: tabel `horti_produksi`/`horti_luas` (kelompok × komoditas × kecamatan × tahun) + 4 endpoint hortikultura.
5. **Perikanan**: tab Benih (`ikan_benih`, `fetchPerikananBenih`) + mina padi (`ikan_minapadi`, tampil di economic-value/recommendations/renstra).
6. **Baseline lahan ST2023 Tabel 4.10**: `lahan_desa` 278 desa (sawah + bukan sawah, commit 0bc1775), lalu **perluasan 12 kolom + `total_dikuasai` SELESAI hari ini** (commit 231273e, terverifikasi independen 22 Sep: 278/278 aritmetika OK, Σ 20/20 kec match PDF, Σ kabupaten 51.632,3 Ha). Widget "Analisa Lahan Kritis" kini jujur: label "Lahan Usaha Tani (ST2023)", threshold <60 Bahaya / 60–100 Waspada.
7. Audit v3.2 juga menemukan item yang **keliru sejak awal**: palawija per komoditas sebenarnya sudah ada sejak 20 Sep (fix `/food-crops`).

**Skor sinkronisasi:** dari ~40 item gap → **13 selesai**, **7 parsial**, **~20 masih gap asli**.

---

## 1. Tanaman Pangan (`/food-crops` — "Produksi Tanaman Pangan")

| Fitur | Status | Bukti / Catatan |
|---|---|---|
| Padi sawah + ladang, palawija **per komoditas** (jagung, ubi kayu, kedelai, kacang hijau, ubi jalar) | ✅ | `fetchPadiSawahLadang`, `fetchJagungUbiKayu`, `fetchKacangKedelai`, `fetchUbiKacangHijau`; tabel MySQL padi/palawija |
| Submenu komoditas unggulan (varietas padi, jagung hibrida) | ❌ | "varietas" 0 hit di src |
| Nilai ekonomi triwulan/semester | ❌ | Semua nilai masih tahunan |
| LTT (luas tanam/panen bulanan) | ❌ | `/ltt` = ComingSoon (disabled di nav) |
| Katam (kalender tanam) | ❌ | 0 hit |

## 2. Hortikultura (`/horticulture`)

| Fitur | Status | Bukti / Catatan |
|---|---|---|
| Breakdown komoditas sayuran & buah per kecamatan per tahun | ✅ **(baru sejak v3.2)** | `horti_produksi` (kelompok: sayuran/buah_tahunan/tanaman_hias/biofarmaka; satuan ton/tangkai) + endpoint `/sayuran-produksi`, `/sayuran-luas`, `/buah-produksi`, `/produksi-tahunan` + 4 fetcher api.ts |
| Submenu unggulan sayuran Dieng | ❌ | Nav "Komoditas Unggulan" hanya link ke `/plantation` |
| Nilai ekonomi hortikultura | ❌ | `/economic-value` masih perikanan saja |
| Sebaran sentra spasial per desa | ❌ | `/kawasan-hortikultura` = ComingSoon |

## 3. Perkebunan (`/plantation`)

| Fitur | Status | Bukti / Catatan |
|---|---|---|
| Areal & produksi komoditas umum per kecamatan | ✅ | `fetchPlantationArea/Production`; tabel perkebunan |
| Restrukturisasi (alihkan komoditas umum ke pangan) | ❌ | Masih daftar komoditas standar |
| Unggulan kelapa deres & porang | ❌ | "deres/porang/gula semut" 0 hit |
| Nilai ekonomi perkebunan | ❌ | — |
| Sebaran sentra spasial | ❌ | — |

## 4. Peternakan (`/livestock`, `/livestock-flow`)

| Fitur | Status | Bukti / Catatan |
|---|---|---|
| Populasi **per jenis** — sapi perah vs potong, kerbau, kuda, kambing, domba, babi, kelinci, ayam ras pedaging/petelur, ayam kampung, itik, **puyuh**, kalkun, walet, dll. | ✅ **(baru sejak v3.2, via ST2023 per desa)** | `st2023_desa.ternak` (JSON fleksibel) → breakdown `/livestock`, `MapWidget`, `DesaTernak` |
| RPH vs non-RPH (pemasukan, pengeluaran, daging unggas) | ✅ | `/livestock-flow` + `ternak_pemotongan` + endpoint `/luar-rph` |
| Domba lokal vs **Domba Batur** | ❌ | Domba masih satu angka agregat |
| Produksi telur 3 jenis | 🟡 | Jejak telur di sensus/peta desa (ST2023); belum fitur produksi tahunan |
| Hilirisasi susu & kulit | 🟡 | **Tabel `ternak_susu_kulit` sudah ada** (catatan: BPS tak memisahkan susu vs kulit) — **belum ada endpoint & UI** |
| Direktori poultry shop | ❌ | 0 hit |
| Nilai ekonomi peternakan | ❌ | Hanya teks rekomendasi |

## 5. Perikanan (`/fisheries`)

| Fitur | Status | Bukti / Catatan |
|---|---|---|
| Budidaya per sistem (kolam, KJA, minapadi, dll.) + tangkap per alat + **tab pembenihan** | ✅ **(benih & minapadi baru sejak v3.2)** | `fetchPerikananBudidaya/Tangkap/Benih`; tabel `ikan_benih` (sendiri vs luar daerah, ekor), `ikan_minapadi`, `ikan_kolam`, `ikan_waduk` |
| Nilai ekonomi perikanan | ✅ | `/economic-value` (Budidaya Rp 906,5 M + Tangkap, 2024) |
| Mina padi di renstra & rekomendasi | ✅ | `renstra.tsx`, `recommendations.tsx` |
| Breakdown **per jenis ikan** (lele, nila, gurame,…) | 🟡 | Per sistem/alat sudah; per komoditas belum |
| Sebaran kolam per desa | 🟡 | Tabel ada + peta desa; visualisasi khusus belum |
| Pokdakan (kelompok perikanan) | ❌ | 0 hit |
| Ikan hias dinamis | ❌ | 0 hit (jangan tertukar: `tanaman_hias` di horti = tanaman) |

## 6. Ketahanan Pangan (`/ketahanan-pangan`, `/food-security`, `/supply-chain`)

| Fitur | Status | Bukti / Catatan |
|---|---|---|
| 3 pilar Bapanas (kerangka pemersatu) | ✅ | `/ketahanan-pangan` — definisi & cakupan FAO/Bapanas dipetakan ke data riil, `PILAR` + `FSVA_INDICATORS.pilar` di `services/ketahananPangan.ts` |
| Neraca kalori 2.100 kkal/jiwa per kecamatan | ✅ | `/ketahanan-pangan` — 17 komoditas, faktor TKPI/NBM terpusat, status Swasembada/Surplus/Defisit/Kurang; tervalidasi silang 1.998 vs 1.995 kkal/kap/hari (2024) |
| FSVA Bapanas 2021-2024 (278 desa) | ✅ | `/fsva` + `data/fsva.ts`; diagregasi per kecamatan & per pilar di `/ketahanan-pangan` |
| Lumbung pangan KTH per desa (63 unit / 95.826 ton) | ✅ | `fetchLumbungPangan` + tabel `lumbung_pangan`; kini juga tampil di `/ketahanan-pangan` sebagai komponen cadangan pilar 1 |
| Pangan utama (padi) + pasar + inflasi | ✅ | `/food-security`, `/supply-chain` + `fetchInflationData`, `fetchMarketData` |
| Skor PPH (Pola Pangan Harapan) | ❌ | Butuh survei konsumsi Bapanas/DKP Provinsi — dinyatakan terbuka di `CELAH_DATA_PILAR` |
| PoU (Prevalence of Undernourishment) | ❌ | Butuh survei konsumsi rumah tangga Bapanas — dinyatakan terbuka |
| Prevalensi stunting | ❌ | Butuh Dinkes / e-PPGBM / SSGI — dinyatakan terbuka |
| Keamanan pangan (uji kontaminasi) | ❌ | `/sertifikasi-mutu` masih ComingSoon |
| RMU (penggilingan) | ❌ | Butuh inventarisasi Distankan KP |
| Data tanam bulanan | ❌ | Terkait LTT (ComingSoon); data produksi masih tahunan |
| Pendapatan/daya beli per kapita & kondisi jalan | ❌ | Butuh BPS (PDRB/pengeluaran) & DPUPR |

> Catatan: Kecamatan **Batur** tidak ikut neraca kalori karena tidak memiliki data produksi padi
> (API `/v1/padi/production` 2024 hanya 19 kecamatan). Hal ini dinyatakan eksplisit di halaman,
> bukan disembunyikan.

## 7. Penyuluhan & Kelembagaan (`/farmers`)

| Fitur | Status | Bukti / Catatan |
|---|---|---|
| Poktan + KTH, tren per tahun, konteks BPS ST2023 | ✅ | `fetchKelompokTani`, `fetchKelompokTaniHutanSnapshot`; `kelompok_tani`, `kth_detail` |
| 5 entitas: Poktan, KWT, Pokdakan, Poklahsar, Pokmamas | 🟡 (baru 2: Poktan, KTH) | KWT/Pokdakan/Poklahsar/Pokmamas 0 hit |
| Detail profil kelompok (SK, ketua, kelas) | 🟡 | Gapok/anggota/tahun ada; SK & kelas belum |

## 8. Bantuan & Sarpras (`/government-assistance`)

| Fitur | Status | Bukti / Catatan |
|---|---|---|
| Halaman analisis agregat (penerima, APBN/APBD, program, dampak) + API | ✅ **(baru sejak v3.2, tidak tercatat di v3.2)** | 3 tabel `bantuan_program/alokasi/korelasi` + `/v1/bantuan`; data diisi via dasbor admin |
| Katalog barang detail + rules kelayakan + BAST | ❌ | 0 hit (BAST 0 hit) |
| List penerima relasional ke `/farmers` | ❌ | `penerima_jumlah` agregat saja |

## 9. Admin & Upload (`/admin`)

| Fitur | Status | Bukti / Catatan |
|---|---|---|
| Dasbor admin: 15 domain MySQL, template `.xlsx` unduh, export, import + upsert | ✅ **(baru sejak v3.2)** | backend `/template/:domain`, `/import/:domain`, `/export/:domain`; E2E 15/15 PASS |
| Audit log | 🟡 | Tabel `sync_log` ada di DB; belum tampil di UI |
| Multi-role RBAC (super admin + 6–7 admin bidang) | ❌ | Login single-admin (`backend/.env`); `/user-management` = ComingSoon |

---

## Fitur aktif lain yang tidak tercakup di v3.2
Chatbot Si Pertani v2.1 (9inference kimi-k3) · `/prediction` (proyeksi padi) · `/suitability` (kesesuaian lahan) · `/price-volatility` · `/renstra` (target vs realisasi + PDF sumber) · `/recommendations` (data terverifikasi) · detail desa `/desa/:kec/:nama` (6 komponen) · `/sensus-2023` · sanity check dilepas penuh (commit 2eabac6).

## Placeholder roadmap (ComingSoon, disabled di nav)
`/early-warning` · `/master-petani` · `/master-lahan` · `/master-alsintan` · `/ltt` · `/opt` · `/irigasi` · `/kawasan-hortikultura` · `/sertifikasi-mutu` · `/kemitraan` · `/kesehatan-hewan` · `/pakan-ternak` · `/kesehatan-ikan` · `/cpd` · `/penyuluhan` · `/kinerja-penyuluh` · `/monev` · `/user-management` · `/settings`

---

## Protokol pembaruan dokumen ini
1. Versi + tanggal di header **wajib** dinaikkan setiap perubahan; tambahkan baris changelog.
2. Audit dilakukan dengan bukti eksplisit (nama fetcher / endpoint / tabel / route), bukan asumsi.
3. Hati-hati false-negative tool pencarian: verifikasi "0 hit" dengan `Select-String` (PowerShell) sebelum menyatakan ❌.
4. Bedakan dua jenis gap: **gap data** (perlu sumber baru) vs **gap fitur** (data sudah ada, tinggal endpoint/UI) — dasar prioritas di `pengembangan.md`.
