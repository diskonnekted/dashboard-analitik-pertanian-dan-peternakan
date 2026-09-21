# SISPERTANI Backend — Read-Only API (Fase B)

Backend Express + mysql2 yang menyajikan database MySQL/MariaDB `sispertani`
(hasil Fase A, lihat `database/README.md`) sebagai JSON untuk SPA.
**Read-only**: tidak ada endpoint yang mengubah data.

## Menjalankan

```powershell
cd backend
npm install          # sekali saja
npm start            # membaca .env -> http://127.0.0.1:4100
```

`.env` (salin dari `.env.example`):

| Variabel    | Default        | Keterangan |
|-------------|----------------|------------|
| `PORT`      | `4100`         | Port listen |
| `DB_HOST/PORT/USER/PASS/NAME` | XAMPP lokal | MariaDB 10.4 (XAMPP `D:\xampp`), user root tanpa password |
| `CORS_ORIGIN` | `http://localhost:5173,https://pertanian.sistemdata.id` | Allowlist origin, pisahkan koma |
| `PUBLIC_DIR`  | `../public`    | Untuk membaca snapshot CKAN yang sengaja tidak diimpor (padi-2025.csv) |

## Arsitektur Fase B (frontend)

`src/services/api.ts` sekarang memakai pola **API-first dengan fallback tetap hidup**:

1. `apiAvailable()` — health check `/health` **sekali per sesi browser** (4 detik timeout).
   Bila backend down, semua fetcher langsung memakai jalur lama (CKAN/CSV/snapshot)
   tanpa menunggu timeout per-fetch.
2. `apiFirst(path, fetchXxxCsv)` — 32 fetcher publik dibungkus:
   - Backend hidup → data MySQL, di-cache SWR dengan prefix `api_`.
   - Backend down → `fetchXxxCsv` (implementasi lama, di-rename dari export) —
     cache SWR lamanya tetap hidup sebagai lapis kedua.
3. `fetchOpenDataPertanian` / `fetchOpenDataCatalog` **tidak** dibungkus —
   katalog CKAN live, bukan data numerik yang dimigrasi.
4. Array kosong dari backend dibaca sebagai kegagalan → fallback dijalankan.

Prefix dev: **`/sispertani-api`** (proxy Vite di `vite.config.ts`, di-rewrite ke `/api`
di sisi backend; `/api` sudah dipakai proxy CKAN Banjarnegara).
Produksi: build dengan `VITE_API_BASE=https://api.pertanian.sistemdata.id/api`
(tanpa itu, frontend otomatis fallback ke CSV — deploy frontend tetap aman).

## Endpoint (31 + health + index)

Semua GET, di bawah `/api/v1`. Kembalian bentuk JSON **identik** dengan bentuk
return fetcher frontend (paritas per bidang, termasuk label "Sapi Potong" untuk
kolom sumber "Sapi", "Jaring Insang" untuk "Jaring Ingsang", dll.):

- `GET /api/health` — `{ok, db:"up", time}`
- `/api/v1` — daftar endpoint
- Lahan: `/lahan/desa` (1 baris/desa; baris ber-rincian diprioritaskan atas entri parsial file koreksi), `/lahan/kabupaten` (tahun terbaru, kategori I/II)
- Padi: `/padi/production` (tahun terbaru per kec, sawah+ladang, rata=sawah), `/padi/history` (agregat/tahun, prune <10 pelapor, + titik 2025 dari snapshot `public/data/snapshots/padi-2025.csv` yang sengaja tidak diimpor), `/padi/sawah-ladang` (FoodCropRow)
- Palawija: `/palawija/jagung-ubi-kayu`, `/palawija/kacang-kedelai`, `/palawija/ubi-kacang-hijau`
- Hortikultura: `/hortikultura/sayuran-produksi`, `/hortikultura/sayuran-luas`, `/hortikultura/buah-produksi`, `/hortikultura/produksi-tahunan` (+ array 2025 hardcoded BPS, identik api.ts)
- Perkebunan: `/perkebunan/areal` (9 tanaman incl kopiArabica), `/perkebunan/produksi` (8, tanpa kopiArabica — blok agregat kabupaten memang di tabel terpisah dan tidak dilayani, sama seperti filter AGG_ROWS frontend)
- Peternakan: `/peternakan/kecil|besar|unggas` (pivot populasi), `/peternakan/pemasukan|pengeluaran` (6 label; "Sapi Potong"=kolom "Sapi"; jenis tanpa data dilayani 0), `/peternakan/luar-rph` (5 label, ekor), `/peternakan/daging-unggas` (2 label, kg)
- Perikanan: `/perikanan/budidaya` (tempat pemeliharaan), `/perikanan/tangkap` (per alat), `/perikanan/benih` (sendiri/lain daerah), `/perikanan/nilai-budidaya` (3 jenis; label "Kolam Pembesaran"=jenis_budidaya "Pembesaran"), `/perikanan/nilai-tangkap` (4 jenis; "Jaring Insang"="Jaring Ingsang")
- Ekonomi: `/ekonomi/inflasi` (7 pembanding), `/ekonomi/pasar` (4 jenis × tahun)
- `/lumbung` (tahun terbaru per kec)
- Kelembagaan: `/kelembagaan/kelompok-tani` (646 baris poktan 2022-2025 **merge** KTH per desa — replika `mergeKelompokTaniHutan`; baris dasar 2026 dikecualikan), `/kelembagaan/kth` (188 desa + `kth_detail` 357)
- `/st2023/desa` (278 desa, ternak JSON di-parse ke objek)

## Paritas terverifikasi (`node scripts/sim-backend-parity.cjs`)

- padi 2024: Σ produksi 176.200,3 ton / Σ luas 25.576 ha (19 kec — **Batur memang tidak ada di CSV sumber**); 2022 = 171.560
- padi/history: 8 titik 2018-2025 (2025 = 178.610 ton dari snapshot)
- lumbung 2024: 63 unit / 95,826 ton (baseline resmi BPS)
- nilai budidaya 2024: Σ 906.467.386 ribu Rp ≈ Rp 906,47 M
- pasar 2025: 25 unit; poktan 646 + KTH 188/357; ST2023 278 desa
- lahan/desa vs `lahan-fallback.json`: 266 match identik, 12 diff = baris 2025
  rincian-lengkap dari `lahan-fallback-updated.json` (data lebih baru — diterima
  sebagai perbaikan), 3 ekstra = varian nama desa; UI sudah menangani baris
  parsial (indikator "rincian belum tersedia").

## Catatan penting

- `vite.config.js` + `vite.config.d.ts` (artifak tsc lama) **dihapus** — Vite
  memprioritaskan `.js` dan selama ini membaca versi basi; `vite.config.ts`
  kini satu-satunya sumber konfigurasi.
- MariaDB 10.4: pool mysql2 memakai `decimalNumbers: true` agar DECIMAL
  kembali sebagai number (paritas JSON).
- Pengeluaran ternak 2024 memang 0 untuk hampir semua kec di sumber BPS
  (hanya Madukara terisi) — bukan bug.
- Angka di dokumentasi memakai titik desimal (95,826 ton = 95.826).

## Roadmap

- **Fase C** — cron sinkron CKAN → upsert hanya baris `sumber='ckan'`
  (jangan menimpa `csv`/`manual`), menambah endpoint `POST` internal + job terjadwal.
- **Fase D** — isi `renstra_target` dari data terverifikasi renstra.pdf Tabel 4.1,
  endpoint `/renstra/target`.
- Deploy: host backend di VPS (mis. `api.pertanian.sistemdata.id`, reverse proxy
  nginx ke 127.0.0.1:4100), lalu build frontend dengan `VITE_API_BASE`.
