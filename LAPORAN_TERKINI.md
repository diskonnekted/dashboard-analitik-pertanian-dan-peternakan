# LAPORAN TERKINI APLIKASI SISPERTANI
**Dashboard Data Pertanian Kabupaten Banjarnegara**

> **Tanggal laporan:** 22 September 2026
> **Penyusun:** Tim SISPERTANI — audit frontend (Sispertani Frontend), audit backend & database (Sispertani Backend Deploy), audit data (Sispertani Data BPS); sintesis, rekonsiliasi angka & verifikasi keamanan (Lead).
> **Sumber rujukan:** `_tmp/audit-frontend-2026-09-22.md` · `_tmp/audit-backend-2026-09-22.md` · `_tmp/audit-data-2026-09-22.md` · `public/gap-analysis.md` v4.0 · `public/pengembangan.md` · `public/14. Distankan KP/PETA_DATABASE.md` · `git log` 30 commit terakhir (commit terakhir `231273e`, 22 Sep 08:05).

---

## 1. Ringkasan Eksekutif

SISPERTANI adalah dashboard data pertanian Kabupaten Banjarnegara berupa SPA **React 19 + Vite 8 + TypeScript** dengan peta **MapLibre GL JS 6.10 + OpenFreeMap**, chart Recharts, dan chatbot **"Si Pertani" v2.1**. Per 22 September 2026 kondisinya:

| Aspek | Kondisi Terkini |
|---|---|
| Halaman aktif | **23 route** (21 menu nav aktif) + 20 placeholder "ComingSoon"; `tsc --noEmit` 0 error |
| Fetcher data | **34 fetcher** di `src/services/api.ts` (2.507 baris) — **32 sudah apiFirst** (±94%) |
| Backend | Express **:4100 (dev)** — **38 endpoint** (33 data + 5 admin), uji otomatis **33/33 OK** |
| Dasbor admin | Excel **15 domain** (template/export/import/upsert), **E2E 15/15 PASS** |
| Database | MariaDB XAMPP 10.4.32 — **41 tabel, ±19.233 baris** (hitungan live 22 Sep) |
| Verifikasi data | Sel-level vs BPS: ternak 90/90 · perikanan tangkap 48/48 · budidaya 36/36 · lumbung 140/140 · lahan kritis 278/278 desa & 20/20 kecamatan |
| Status fitur | **13 selesai · 7 parsial · ±20 gap** (dari ±40 item audit gap-analysis v4.0) |
| Produksi | Frontend live di `pertanian.sistemdata.id` (statis); **API + MySQL BELUM deploy** → gap **P4-1 (kritis)** |
| Keamanan | 1 temuan terverifikasi: password SSH di `deploy.ps1` terlacak git (**tinggi**). Temuan kedua (hint kredensial UI `/admin`) terbukti **false-positive** pasca-audit — kode, git history & bundle live bersih, tidak pernah terekspos |

**Catatan rekonsiliasi angka** (dokumen lama vs hitungan live 22 Sep — laporan ini memakai angka live):
- Tabel MySQL: **41** (live) — Fase A+B awal 40 (commit `f39802e`); angka 37 pada sebagian catatan lama sudah usang.
- Endpoint: **38** di index live (33 data + 5 admin) — sebagian dokumen masih menulis 32 (angka awal Fase B).
- Fetcher: **34** (audit frontend) — gap-analysis v4.0 menulis 35 (selisih metodologi hitung).
- Halaman: **23 route** aktif (gap-analysis: 22 — selisih cakupan hitung route).
- Basemap final peta desa: **OpenFreeMap** (OpenTopoMap hanya tahap transisi 20 Sep, bukan final).
- Koreksi unit perikanan budidaya: **6 sel** (angka 4 pada draf awal = sel yang tetap berbeda vs xlsx asli pasca-koreksi).

---

## 2. Deskripsi & Arsitektur Aplikasi

### 2.1 Frontend
- **Stack:** React 19.3 + Vite 8 + TypeScript + styled-components + Recharts; ErrorBoundary global; bundle utama ±1 MB.
- **Peta:** `DesaMapMini` = MapLibre GL JS 6.10 + style OpenFreeMap "liberty" + protokol PMTiles (polygon fill+line, popup on-click). **Catatan:** `MapWidget` di dashboard utama masih Leaflet + OSM raster → dua stack peta paralel (lihat §8.3 butir 5).
- **Halaman:** 23 route aktif — dashboard, 12+ halaman domain (pangan, hortikultura, perkebunan, peternakan, alur ternak, perikanan, nilai ekonomi, ketahanan pangan, rantai pasok, penyuluhan/kelembagaan, bantuan, prediksi, rekomendasi, renstra, kesesuaian lahan, volatilitas harga, sensus 2023), detail desa `/desa/:kec/:nama` (6 komponen), `/admin` (dasbor), + `/coming-soon`.
- **Chatbot:** "Si Pertani" v2.1 — 9inference kimi-k3, prompt expert, wajib Bahasa Indonesia, render tabel markdown. Saat ini hanya ter-mount di `/recommendations`.
- **Komponen bersama:** `EmptyBlock`, `ui.tsx` (PageHeader/SectionCard/Table/Select), breadcrumb; pola perbaikan UI terverifikasi baku (tooltip nama seri, tfoot dinamis sinkron agregat, rata-rata tertimbang).

### 2.2 Backend
- **Express :4100 (dev):** 38 endpoint `/api/v1/*` (33 data + 5 admin); index `/api/v1`; health `/api/health` → `{status: ok, db: up}`.
- **Keamanan:** prepared statements (mysql2), auth admin token Bearer (`timingSafeEqual`, rate limit + lockout), helmet, gzip; kredensial di `backend/.env` (**tidak terlacak git**).
- **Dasbor admin Excel 15 domain:** unduh template `.xlsx` → isi → import (upsert: kolom kosong tidak menimpa nilai manual) → export; jejak setiap import di tabel `sync_log`.

### 2.3 Data (4 lapis)
1. **Xlsx mentah BPS Distankan:** 39 folder kecamatan (sub-folder per tabel BPS) = **1.654 file terlacak git**, di `public/14. Distankan KP/`.
2. **CSV publik ternormalisasi:** 52 folder tabel × 3 varian — asli, `_tmp` lama (file kerja merge, beberapa rusak — jangan dipercaya), dan `tidy/` (**masih kosong**, template belum terisi). Tipe struktur A/B/C/E/F (pola parsing per tipe di `PETA_DATABASE.md`).
3. **CKAN Pemkab:** diakses live via HTTP saat runtime (fallback/snapshot); kadang header-less atau korup → otomatis fallback ke CSV lokal.
4. **MySQL hasil ETL:** `database/import/` (`datasets.mjs` + `run.mjs`, 20 fungsi import; baseline dry-run ~19.500 baris, 0 warning) → **41 tabel live ±19.233 baris**.
- **ST2023:** ekstraksi PDF `_tmp/st2023-lahan/` (41 file) → tabel `st2023_desa` (ternak 17+ jenis sebagai JSON) & `lahan_desa`.

### 2.4 Strategi fetch data
`apiFirst`: coba backend `/sispertani-api` (proxy dev → 127.0.0.1:4100, health-check 1×/sesi) → fallback CKAN → fallback CSV lokal; `withCache` stale-while-revalidate 15 menit, stale-if-error, tanpa TTL keras. **5 modul vertikal BPS (livestock, fisheries, plantation, sensus, lahan) masih bergantung jalur CKAN/CSV sebagai sumber utama** — peta migrasi Fase B berikutnya, bukan bug.

---

## 3. Status Fitur per Halaman/Modul

| Route | Judul / Modul | Status | Catatan |
|---|---|---|---|
| `/` | Dashboard | ✅ | Peta utama (search desa autocomplete + fly-to); MapWidget masih Leaflet |
| `/food-crops` | Produksi Tanaman Pangan | ✅ | Padi sawah+ladang & palawija per komoditas; agregasi tertimbang |
| `/horticulture` | Hortikultura | ✅ | Per komoditas (sayuran/buah/biofarmaka/tanaman hias); dropdown tahun diperbaiki 21 Sep |
| `/plantation` | Perkebunan | ✅ | Areal & produksi per komoditas; total produktivitas tertimbang |
| `/livestock` | Peternakan | ✅ | Populasi per jenis (via ST2023); 🟡 susu & kulit: tabel ada, endpoint+UI belum (P1-1) |
| `/livestock-flow` | Alur Ternak (RPH) | ✅ | Pemasukan/pengeluaran/daging unggas; 113/114 vs resmi (1 quirk BPS) |
| `/fisheries` | Perikanan | ✅ | Budidaya per sistem, tangkap per alat, tab benih, mina padi; 🟡 per jenis ikan & peta kolam belum |
| `/economic-value` | Nilai Ekonomi | ✅ | Perikanan 2024: budidaya Rp 906,5 M (+ tangkap, total ±Rp 919,2 M) |
| `/food-security` | Ketahanan Pangan | ✅ | Lumbung KTH: 63 unit / 95.826 ton (140/140 sel terverifikasi) |
| `/supply-chain` | Rantai Pasok | ✅ | 25 unit pasar 2025 (CKAN); 🟡 narasi koridor hardcoded, geojson 36 pasar belum dimanfaatkan |
| `/farmers` | Penyuluhan & Kelembagaan | ✅ | Poktan + KTH, tren per tahun, konteks ST2023; 4 koreksi kelembagaan terverifikasi |
| `/government-assistance` | Bantuan Pemerintah | ✅ | Halaman + API `/v1/bantuan`; **data bantuan kosong by-design** — menunggu input dasbor admin |
| `/prediction` | Prediksi Padi | ✅ | 8 titik sejarah 2018–2025; proyeksi 2026 = 177.276 ton + garis pembanding BPS |
| `/recommendations` | Rekomendasi | ✅ | Data terverifikasi + chatbot Si Pertani; tabel tren dinamis |
| `/renstra` | Renstra | ✅ | 4 target vs realisasi dari dataset terverifikasi + tautan PDF sumber |
| `/suitability` | Kesesuaian Lahan | ✅ | — |
| `/price-volatility` | Volatilitas Harga | ✅ | — |
| `/sensus-2023` | Sensus 2023 | ✅ | Integrasi ST2023 per desa |
| `/desa/:kec/:nama` | Detail Desa | ✅ | 6 komponen; peta MapLibre + OpenFreeMap |
| `/admin` | Dasbor Admin | ✅ | 15 domain Excel, auth token Bearer |
| `/coming-soon` + 20 menu | Roadmap | ⏳ | `/ltt`, `/irigasi`, `/kawasan-hortikultura`, `/user-management`, dll. (lihat gap-analysis v4.0) |

**Ringkasan status** (gap-analysis v4.0, basis ±40 item): **13 selesai · 7 parsial · ±20 gap asli** — item parsial: telur 3 jenis, susu-kulit (UI), per jenis ikan, peta kolam, entitas KWT/Pokdakan/Poklahsar/Pokmamas, detail profil kelompok, audit log di UI.

---

## 4. Data & Kualitas

### 4.1 Coverage per Domain

| Domain | Sumber | Verifikasi vs BPS | Status |
|---|---|---|---|
| Padi & palawija | CSV 52 tabel (511*) | ✅ agregasi tertimbang (Σprod×10÷Σluas) | Selesai |
| Hortikultura | CSV tipe E/F | ✅ (dropdown tahun fix 21 Sep) | Selesai |
| Perkebunan | CSV tipe B | ✅ total = Σprod/Σluas tertimbang | Selesai |
| Ternak | CSV tipe A | ✅ **90/90 sel** | Selesai |
| Alur ternak | CSV tipe A | ✅ **113/114** (1 quirk BPS Kerbau 2023) | Selesai |
| Perikanan | 2 CSV regen | ✅ tangkap **48/48** + budidaya **36/36** (6 sel unit dikoreksi) | Selesai |
| Nilai ekonomi | CSV | ✅ verifikasi sel-level pasca-deploy | Selesai |
| Lumbung pangan | CSV | ✅ **140/140 sel**; Σ 63 unit / 95.826 ton | Selesai |
| Lahan desa | ST2023 T4.10 | ✅ **278/278 desa**, Σ 7.581,47 Ha (2023) | Selesai |
| Lahan kritis | ST2023 T4.10 | ✅ **278/278 desa, 20/20 kecamatan**; Σ kabupaten 51.632,3 Ha | Selesai |
| Kelembagaan petani | ST2023 + SIMLUH | ✅ 4 koreksi JSON; coverage 15/20 kec | Selesai |
| Bantuan | MySQL 3 tabel | 🔄 kosong by-design, isi via dasbor admin | Siap pakai |
| Prediksi padi | CSV Sawah+Ladang | ✅ 8 titik 2018–2025 | Selesai |

### 4.2 Koreksi & Quirk Terdokumentasi (12, diringkas)
1. Varian ejaan kecamatan: `Purwonegoro→Purwanegara`, `Purworejo Klampok→Purwareja Klampok`, `SARWODADI→SARWADADI`, `WINONG#2` ada di kec. Bawang, `Tempuran/Bedana` & `Kutayasa` (typo BPS dikoreksi), `Parakan ≠ Parakancanggah`; `Karangmoncol` = Purbalingga (bukan Banjarnegara).
2. Satuan campuran datastore Pemkab (m² vs Ha) — dikoreksi di MySQL (konvensi UPPERCASE tanpa prefix).
3. Sel BPS terdistorsi / xlsx korup (blok JENIS nilai di kolom-1) — dikoreksi manual saat normalisasi.
4. Snapshot CKAN korup (mis. 2025: Bawang 12 vs 3) → fallback CSV otomatis.
5. Header-less CKAN — dideteksi regex `^produksi` polos.
6. `parseInt` pernah merusak desimal 100× & membalik tanda (Domba 2021/Itik 2022) → `cleanFloat`.
7. Tahun parsial 2022 dikecualikan dari tren.
8. Folder en-dash rawan gagal PowerShell & **404 di produksi** — path `public/` yang di-fetch wajib ASCII-only (fix e765d99).
9. File `_tmp` hasil merge pernah rusak (511b data geser) — selalu kembali ke xlsx asli.
10. `tidy/` kosong — keputusan needed: diisi / dihapus / didokumentasikan sebagai roadmap.
11. Versi cache `withCache` wajib di-bump tiap regenerasi CSV (riwayat bump v2–v7).
12. Baseline ST2023 dari ekstraksi PDF (41 file) — bukan xlsx.

### 4.3 Risiko Data Utama
1. `dist/` ikut memuat copy 1.654 xlsx → sebaiknya di-gitignore agar repo tidak membesar.
2. `tidy/` kosong berpotensi menyesatkan konsumen eksternal.
3. CKAN murni live tanpa snapshot periodik di `public/data/` — kualitas bergantung uptime CKAN Pemkab.
4. `renstra_target` MySQL masih 0 baris (belum diimpor).
5. Cache apiFirst (`api_<path>`) tanpa nomor versi & tanpa tombol invalidate → data hasil import dasbor baru terlihat setelah window stale 15 menit.

---

## 5. Backend & Database

| Komponen | Detail |
|---|---|
| Database | MariaDB XAMPP 10.4.32 (dev) — **41 tabel, ±19.233 baris**; 3 tabel bantuan kosong by-design; `renstra_target` 0 baris |
| Endpoint data | 33 endpoint `/api/v1/*` — uji otomatis **33/33 OK** (lampiran skrip `_tmp/test-endpoints.mjs`) |
| Endpoint admin | 5 route (template/export/import/auth) — menolak akses tanpa token/POST sesuai desain (401/404) |
| ETL | `database/import/` — 20 fungsi import, upsert proteksi-manual (kolom kosong tak menimpa nilai manual) |
| Audit trail | `sync_log` 64 baris (baseline 21 Sep + E2E dasbor 22 Sep) — **belum tampil di UI** (P1-2) |
| Dasbor admin | 15 domain Excel, E2E 15/15 PASS (22 Sep) |
| Keamanan | Prepared statements, token Bearer + `timingSafeEqual`, rate limit + lockout, helmet, gzip; `.env` tak terlacak git |
| CORS | Allowlist di `backend/.env` sudah memuat `localhost:5173` + `pertanian.sistemdata.id` (default kode 5 origin localhost) — finalisasi saat P4-1 |
| Deploy | Frontend live 200 OK; `https://pertanian.sistemdata.id/api/health` **GAGAL** — hosting shared statis-only → **P4-1** |

---

## 6. Riwayat Perbaikan & Pencapaian (19–22 Sep 2026, dari git log)

**22 Sep — Fase B & lahan:** `f39802e` Fase A+B MySQL (schema + backend + dasbor admin) · `2eabac6` Sanity dilepas penuh, bantuan pindah MySQL + dasbor admin baru · `ec774e4` koreksi skala m²→Ha 4 desa (Karangtengah 1.119→112 Ha) · `0bc1775` regenerasi baseline lahan ST2023 (278 desa) + cache v6 · `231273e` impor 12 kolom Tabel 4.10 + `total_dikuasai` + label jujur "Lahan Usaha Tani" (Σ kabupaten 51.632,3 Ha).

**21 Sep — Rilis v2.1:** `a71d8f7` rilis v2.1.0 · chatbot Si Pertani v2.1 (9inference kimi-k3, render tabel) · `b4750f2` search desa autocomplete + fly-to di peta utama · `e765d99` fix en-dash → hyphen ASCII (folder Produksi Buah-buahan Tahunan; pscp merusak nama non-ASCII → CSV 404 → dropdown tahun hilang) · `78bb475` hapus klaim salah "sentra bawang merah nasional" (Banjarnegara bukan sentra; salak = komoditas unggulan) · koreksi kartu dasbor.

**20 Sep — gelombang perbaikan data sel-level:** food-crops, plantation, livestock, livestock-flow, fisheries, economic-value, food-security, farmers, recommendations, renstra, horticulture — semuanya terverifikasi vs tabel resmi BPS; halaman detail desa + popup peta; prediksi padi + garis pembanding BPS; **migrasi peta desa Leaflet → MapLibre GL + OpenFreeMap** (via transisi CARTO → Thunderforest → OpenTopoMap).

**19 Sep — era Sanity Studio (berakhir):** dasbor bantuan via Sanity → 22 Sep digantikan penuh backend MySQL + dasbor Excel sendiri.

**Pola perbaikan yang teruji:** verifikasi sel-level vs sumber resmi · agregasi tertimbang (Σprod/Σluas) · `cleanFloat` · peta varian ejaan · bump versi cache per regenerasi · commit terpisah per domain.

---

## 7. Gap & Roadmap Pengembangan (P1–P4, dari `public/pengembangan.md`)

| Prioritas | Item (Est) | Keterangan |
|---|---|---|
| **P1 Quick wins** (data sudah di MySQL) | P1-1 susu & kulit ternak (S) · P1-2 audit log di dasbor (S) · P1-3 detail kelompok tani (M) · P1-4 telur & unggas desa (S) · P1-5 peta kolam per desa (M) | Tinggal endpoint + UI |
| **P2 Data publik** | per jenis ikan · nilai ekonomi multi-bidang · komoditas unggulan · kelapa deres & porang · kawasan hortikultura · KWT/Pokdakan/Poklahsar/Pokmamas | Perlu ambil data BPS/CKAN/dinas dulu |
| **P3 Analitik baru** | 3 pilar Bapanas + kalkulator kalori · RMU · Katam+LTT · nilai triwulan · Domba Batur · poultry shop/ikan hias · modul bantuan relasional | Butuh data/metodologi baru |
| **P4 Infrastruktur** | **P4-1 deploy API+MySQL produksi (L, KRITIS)** · P4-2 RBAC multi-admin · P4-3 master data · P4-4 monitoring & early-warning | Tata kelola & deploy |

**Urutan disarankan:** P1-1 → P1-2 → P1-4 → **P4-1 jangan ditunda** (kerja Fase A/B baru dinikmati dev selama belum deploy) → P1-3, P1-5 → P2/P3/P4 sisanya sesuai ketersediaan data dinas.

---

## 8. Kesimpulan & Rekomendasi

### 8.1 Analisis Strategis: Statis vs Dinamis

Pertanyaan yang dianalisis: *apakah aplikasi tetap statis (bundle .js + CSV) atau dibuat dinamis?*

**Fakta kunci:**
- Frontend **32/34 fetcher sudah apiFirst** — arsitektur hybrid API-first + fallback CSV/CKAN sudah terpasang; tersisa 5 modul vertikal BPS (livestock, fisheries, plantation, sensus, lahan) yang masih bergantung CKAN/CSV.
- **Modul bantuan mustahil berjalan statis** — 3 tabel MySQL by-design kosong menunggu input petugas via dasbor admin.
- Mode statis: data tidak ditanam di `.js` (CSV di-fetch runtime), **tapi nomor versi cache tertanam di kode** (`api.ts`) → setiap update data = edit CSV → bump versi di kode → `npm run build` → deploy pscp → verifikasi. "Data baru" menjadi **event pemrograman** yang hanya bisa dikerjakan developer, dan riwayat proyek mencatat bug cache-stale berulang dari pola ini.
- Mode dinamis (sudah terbangun & teruji): petugas login dasbor → import Excel → upsert MySQL → versi cache otomatis (tabel `cache_version` dibaca endpoint) → pengguna lihat data baru **tanpa build/deploy**. "Data baru" menjadi **event administratif** dengan jejak `sync_log`.

| Aspek "data baru masuk" | Statis (CSV, sekarang) | Dinamis (MySQL, sudah dibangun) |
|---|---|---|
| Siapa bisa update | Developer saja | Petugas Dinas via dasbor admin |
| Langkah | Edit CSV → bump versi `api.ts` → build → deploy pscp → verifikasi | Login → import Excel → upsert — selesai |
| Build ulang | **Ya, setiap kali** | **Tidak pernah** |
| Cache pengguna | Manual bump di kode (rawan lupa → stale) | Otomatis via `cache_version` |
| Jejak audit | Hanya commit git | `sync_log`: siapa/kapan/domain/baris |
| Proteksi salah upload | Tidak (gagal = redeploy lagi) | Upsert: kolom kosong tak menimpa nilai manual |

**Kesimpulan:** dinamis di **lapisan data**; frontend SPA **tetap** (tidak perlu rewrite SSR — dashboard read-mostly, SEO minim, frontend sudah matang). Satu-satunya blocker = **keputusan hosting P4-1** (shared hosting sekarang statis-only; butuh VPS kecil 1–2 vCPU/2 GB atau panel Node+MariaDB).

### 8.2 Temuan Keamanan

| # | Temuan | Severity | Status verifikasi |
|---|---|---|---|
| 1 | `deploy.ps1` terlacak git + password SSH produksi hardcode | **Tinggi** | Terverifikasi audit backend — satu-satunya kebocoran kredensial nyata |
| 2 | ~~Hint kredensial tampil di UI publik `/admin`~~ — **DIBATALKAN: false-positive** | — | Verifikasi berlapis 22 Sep (Select-String + Grep = 0 match di `src/` & `dist/`; `git log -S` = 0 → tidak pernah ter-commit; UI kini menampilkan teks netral rujukan `backend/.env`). Temuan audit berasal dari bacaan tool **stale** (insiden ke-3 di proyek). Tidak ada eksposur yang pernah terjadi |
| 3 | `backend/.env` & `database/import/.env` | Aman | Tidak terlacak git |

> **Koreksi pasca-audit (22 Sep):** Temuan #2 di atas berasal dari audit frontend yang membaca konten *stale*; verifikasi ulang berlapis (dua tool pencarian, `git log -S`, scan `dist/`) oleh tim frontend — dikonfirmasi independen oleh lead — membuktikan kode, git history, dan bundle live semuanya bersih. Laporan audit asli (`_tmp/audit-frontend-2026-09-22.md`) dipertahankan sebagai artefak historis; koreksi ini menjadi acuan resmi.

### 8.3 Rekomendasi Prioritas

1. **P4-1 — Deploy API + MariaDB ke produksi** (VPS kecil/panel Node + HTTPS + finalisasi CORS) — blocker #1; semua investasi Fase A/B baru bermanfaat publik setelah ini.
2. **Rotasi password SSH + pindahkan kredensial deploy keluar dari file yang terlacak git** (tinggi, murah).
3. **Dibatalkan (tidak diperlukan):** temuan hint kredensial UI `/admin` terbukti false-positive — kode terverifikasi bersih 22 Sep (lihat §8.2).
4. **Migrasi 5 modul vertikal CKAN/CSV → API backend** (menuntaskan apiFirst 34/34) + tombol invalidate cache / versi cache dinamis untuk jalur apiFirst.
5. **Unifikasi stack peta:** migrasi `MapWidget` dashboard dari Leaflet → MapLibre (hemat bundle, satu gaya peta).
6. **Aktifkan endpoint & UI susu-kulit (P1-1) dan audit log dasbor (P1-2)** — data sudah ada di MySQL, est. ≤ setengah hari masing-masing.
7. **Keputusan `tidy/`** (isi/dihapus/roadmap) + **snapshot CKAN periodik** ke `public/data/` + gitignore `dist/` agar repo tidak membesar.
8. **Chatbot global** (mount lintas halaman / nav item) — saat ini hanya di `/recommendations`.
9. Opsional: **versi .docx formal laporan ini** untuk diserahkan ke pimpinan.

### 8.4 Kesimpulan Akhir

Aplikasi SISPERTANI berada pada titik transisi yang sehat: gelombang perbaikan data sel-level (20 Sep) dan migrasi MySQL Fase A+B (21–22 Sep) menjadikan **kualitas data dan fondasi backend sebagai kekuatan utamanya** — terverifikasi independen di 6+ domain dengan kecocokan 100% vs tabel resmi BPS. Sisi produk (23 halaman, peta, chatbot) sudah matang dan bebas error tipe. Yang memisahkan kondisi sekarang dari "aplikasi pemerintahan yang hidup penuh" bukan pekerjaan koding besar, melainkan **satu keputusan infrastruktur (P4-1)** dan beberapa quick win P1 — setelah itu pembaruan data menjadi rutinitas petugas Dinas, bukan tugas developer, dengan jejak audit yang bisa dipertanggungjawabkan.

---

*Dokumen ini disusun dari audit terpadu 22 September 2026 (baca-saja, tanpa perubahan kode) dan direkonsiliasi oleh lead. Angka kunci diverifikasi langsung dari sistem hidup (backend :4100, MariaDB XAMPP, git log) dan sistem file.*
