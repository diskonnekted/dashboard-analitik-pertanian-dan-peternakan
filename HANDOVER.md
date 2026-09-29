# HANDOVER — Sistem Data Pertanian (SISPERTANI)

> Kabupaten Banjarnegara · Dinas Pertanian dan Ketahanan Pangan
> Dokumen serah terima pengembangan. Diperbarui: **29 September 2026**.

---

## 1. Ringkasan Proyek

**SISPERTANI** adalah dashboard data pertanian Kabupaten Banjarnegara yang menyajikan statistik 5 bidang (Tanaman Pangan, Hortikultura, Perkebunan, Peternakan, Perikanan) plus analisis lintas bidang, peta sebaran, harga pangan, dan ketahanan pangan. Data bersumber dari BPS, Dinas Pertanian, CKAN, dan ST2023.

Aplikasi terdiri dari **dua bagian** yang di-deploy sebagai satu situs:

| Bagian | Teknologi | Lokasi kode | Peran |
|---|---|---|---|
| Frontend (SPA) | React 19 + Vite 8 (Rolldown) + Tailwind v4 + TypeScript strict | `src/`, `public/`, `index.html` | UI dashboard |
| Backend (API + admin) | Node.js + Express + MariaDB | `backend/src/` | 45 endpoint data, dasbor admin Excel, RBAC |

Di produksi, **satu proses Express** menyajikan SPA statis (dari `dist/`) sekaligus API. Nginx CloudPanel mem-proxy semua trafik ke Express.

- **URL produksi:** https://pertanian.sistemdata.id
- **API base:** `https://pertanian.sistemdata.id/sispertani-api`
- **Health check:** `https://pertanian.sistemdata.id/sispertani-api/health`

---

## 2. Prasyarat

- **Node.js ≥ 22** (backend memakai `node --env-file`)
- **MariaDB/MySQL** (dev: XAMPP MariaDB 10.4, db `sispertani`)
- **Git**
- Windows + PowerShell (untuk `deploy.ps1`) + **PuTTY** (`pscp.exe`, `plink.exe` di PATH)

---

## 3. Menjalankan di Lokal (Development)

### 3.1 Frontend
```powershell
cd I:\pertanian\pertanian-2
npm install
npm run dev          # vite di http://localhost:5173
```
- Proxy di `vite.config.ts`: `/api/*` → CKAN, `/sispertani-api/*` → `http://localhost:4100`.
- `npm run build` = `tsc && vite build` → output `dist/`. `tsc` **wajib 0 error** sebelum commit.

### 3.2 Backend
```powershell
cd backend
npm install
node --env-file=.env src/server.js   # API di http://localhost:4100
```
- `backend/.env` (dev) minimal: `PORT=4100`, `DB_HOST=127.0.0.1`, `DB_USER=root`, `DB_PASS=`, `DB_NAME=sispertani`, `JWT_SECRET=<panjang-acak>`.
- **PENTING:** jangan commit `backend/.env`. Contoh ada di `backend/.env.example`.
- Restart dev cepat: lihat memory `dev-env-restart-vite-backend`.

### 3.3 Database dev
- Skema penuh: `database/schema.sql` (41 tabel + 2 view).
- Importer CSV/XLSX: `database/import/` (`npm run migrate` di `backend/`, lalu `node import/run-all.mjs --apply`).
- Template/export Excel admin: `database/template-import-export/` (16 domain, 37 tabel).

---

## 4. Arsitektur Backend

### 4.1 Titik masuk
`backend/src/server.js`:
- Baca env → `express()` → `trust proxy` → CORS → `express.json` (10mb).
- **API** dipasang di **dua prefix** (kompatibilitas): `/api` dan `/sispertani-api` → keduanya ke `routes/index.js`.
- **Dasbor admin** (Bearer per-domain) → `/sispertani-api/admin` + `/api/admin` → `routes/admin.js`.
- **Static SPA** dari `DIST_DIR` (default `./dist`): `index.html`, `assets/*`, `favicon.ico`, `logo.png`, `logo.svg`, `peta_desa_v3.geojson`. Fallback SPA (`app.get("*")`) — harus didaftarkan **setelah** route API.
- `/health`, `/meta`, `/ping`, handler 404, error handler 500 (tanpa bocor stack).

### 4.2 Koneksi DB
`backend/src/db.js` → `mysql2/promise` pool (`DB_HOST/PORT/USER/PASS/NAME`, `connectionLimit:10`, `timezone:'Z'`). Helper `q(sql, params)` mengembalikan `rows`.

### 4.3 Route domain (45 endpoint)
`backend/src/routes/`: `padi.js`, `hortikultura.js`, `perkebunan.js`, `peternakan.js`, `perikanan.js`, `ekonomi.js`, `st2023.js`, `lahan.js`, `bantuan.js`, `kelembagaan.js`, `index.js` (agregator).

### 4.4 Dasbor admin Excel
- `lib/excel.js` — mesin template/export/import (kolom dibaca dinamis dari `information_schema` agar selalu sinkron skema).
- `lib/domains.js` — konfigurasi 16 domain; `kecamatan_id` FK → kolom "Kecamatan"; kolom teknis (`id`, `kecamatan_id`, `desa_norm`, `created_at/updated_at`, `sumber`) & tipe `json/longtext` di-skip.
- `lib/auth.js` — JWT. `lib/users.js` — RBAC: 1 admin (semua 15 domain + sync-log/paket) + 4 akun bidang (hanya domain bidangnya). Guard `requireDomainAccess` / `requireAdminRole`.

### 4.5 Kontrak auth admin
Bearer token **per-DOMAIN** (bukan Basic). Lihat memory `refactor-admin-logo-2026-09-23`.

---

## 5. Arsitektur Frontend

- **Entry:** `src/main.tsx` (tanpa import global `maplibre-gl.css` — MapLibre di-lazy-load per-rute peta agar tidak membebani entry).
- **Router:** `src/App.tsx` (HashRouter-less, `BrowserRouter`) — ±30 rute: 5 bidang, analisis lintas bidang (`/komoditas-unggulan`, `/nilai-ekonomi/:bidang`, `/sebaran/:bidang`, `/economic-value`), profil wilayah (`/kecamatan/:kec`, `/desa/:kec/:nama`), ketahanan pangan (`/food-security`, `/fsva`, `/prediction`, `/ltt-katam`), harga (`/price-volatility`, `/recommendations`), kelembagaan, `/admin`, `/info`, `/manual-book`.
- **Layout:** `src/layouts/default.tsx` (sidebar + topbar; logo `/logo.svg`; menu dari `src/config/site.ts`).
- **Data fetching:** fetcher di `src/services/api.ts` (pola `apiFirst`: coba API → fallback CSV/snapshot lokal). Cache key di-bump saat logika berubah.
- **Peta:** MapLibre GL JS (OpenFreeMap liberty) untuk 4 rute peta; Leaflet masih dipakai di beberapa mini-map.
- **Style:** Tailwind v4 (`src/index.css`); panduan di `docs/style_guide.md`.

Menu & submenu diatur di `src/config/site.ts` (grup SOTK Distankan: 4 bidang teknis + Analisis Lintas Bidang + Ketahanan Pangan + Kelembagaan). `NavItem` ber-flag `hidden` auto-skip grup kosong tapi rute tetap hidup via URL.

---

## 6. Deployment ke Produksi (CloudPanel)

### 6.1 Topologi produksi
- Site CloudPanel tipe **Node.js** (`pertanian.sistemdata.id`), site user **`sistnian`**.
- **Backend berada di APP ROOT** (bukan subdir `backend/`): `backend/src/*` → `$APP_ROOT/src`, `backend/package.json` → `$APP_ROOT/package.json`.
- **Frontend** `dist/*` → `$APP_ROOT/dist`.
- Express listen `127.0.0.1:5173` (`BIND_HOST`); nginx proxy semua ke Express. `DIST_DIR=./dist`.
- Proses dikelola **PM2** app `sispertani-api` (via nvm); `crontab @reboot` menjalankan `start-sispertani.sh`.

### 6.2 Kredensial & konfigurasi deploy
- **`deploy.env`** (UNTRACKED, gitignored) — berisi SSH, app root, kredensial DB. Jangan pernah commit. Salin dari `deploy.env.example`.
- Nilai produksi saat ini: host `103.255.133.227`, port SSH `64001`, user `sistnian`, app root `/home/sistnian/htdocs/pertanian.sistemdata.id`.
- `.env` produksi di server (`$APP_ROOT/.env`) **tidak** ditimpa kecuali diminta (`-NoEnvUpload` = default aman).

### 6.3 Menjalankan deploy
```powershell
cd I:\pertanian\pertanian-2
.\deploy.ps1                 # full: build + upload frontend & backend + npm install + pm2 restart + verify
```
Flag penting:
| Flag | Efek |
|---|---|
| `-SkipBuild` | pakai `dist/` yang ada (deploy cepat, tanpa rebuild) |
| `-SkipBackend` | hanya upload frontend `dist/` |
| `-NoEnvUpload` | JANGAN upload/timpa `.env` server (aman; default untuk update rutin) |
| `-ImportDb` | dump DB lokal → import ke DB produksi (via `mysql < file`) |
| `-NoVerify` | lewati polling `/health` |

Deploy penuh ±41 MB (dist termasuk geojson & logo). Deploy cepat harian: `.\deploy.ps1 -SkipBuild -SkipBackend -NoEnvUpload` bila hanya ganti 1–2 file frontend (atau pscp file tunggal — lihat memory `deploy-pscp-prod-2026-09-20`).

### 6.4 Verifikasi pasca-deploy
```powershell
curl.exe -s -o NUL -w "%{http_code}" https://pertanian.sistemdata.id/sispertani-api/health   # 200
```
Cek bundle aktif: buka `https://pertanian.sistemdata.id/` → lihat nama `assets/index-*.js`.

---

## 7. Migrasi Database

- Skema kanonik: `database/schema.sql`.
- Migrasi idempotent per-tanggal: `database/migrations/` (contoh `2026-09-29_4-tabel-baru.sql` — `CREATE TABLE IF NOT EXISTS`, tanpa `USE`; DB dipilih saat invoke).
- Jalankan ke produksi via plink + `mysql < file` (plink menghapus kutip-ganda → gunakan file .sql/.sh, bukan query inline). Lihat memory `fase-a-mysql-schema-import` & `audit-lahan-kritis-t410`.

---

## 8. Struktur Direktori Penting

```
pertanian-2/
├─ src/                     Frontend React (pages, layouts, components, services, config, data)
├─ public/                  Aset statis: logo.svg, logo.png, peta_desa_v3.geojson, pengembangan.md
├─ index.html               Favicon = /logo.svg
├─ backend/
│  ├─ src/server.js         Entry Express (API + static SPA)
│  ├─ src/db.js             Pool mysql2
│  ├─ src/routes/           11 file route (45 endpoint) + admin.js
│  └─ src/lib/              excel.js, domains.js, auth.js, users.js, helpers.js, importer.js
├─ database/
│  ├─ schema.sql            41 tabel + 2 view (kanonik)
│  ├─ migrations/           Migrasi idempotent per-tanggal
│  ├─ import/               ETL CSV/XLSX → MySQL
│  └─ template-import-export/  Generator template & export Excel admin
├─ docs/                    style_guide, audit frontend/backend, laporan terkini, antislop
├─ deploy.ps1               Skrip deploy CloudPanel (tracked)
├─ deploy.env               Kredensial deploy (UNTRACKED — jangan commit)
├─ HANDOVER.md              Dokumen ini
└─ README.md                Ringkasan publik
```

---

## 9. Kebiasaan & Jebakan Pengembangan (WAJIB dibaca)

Ringkasan dari memori proyek; detail lengkap ada di file memory terpisah.

- **`tsc` wajib 0 error** sebelum commit/deploy. `npm run build` = `tsc && vite build`.
- **Verifikasi ground truth dari git**, bukan asumsi: `git show HEAD:<path>` bila ragu (working tree bisa beda).
- **plink menghapus kutip-ganda** → jangan tulis query/perintah kompleks inline; tulis file `.sh`/`.sql` (LF, UTF-8 no-BOM), `pscp` upload, jalankan `bash ~/x.sh`.
- **Grep bisa false-negative** pada file besar → gunakan `Select-String` PowerShell sebagai pembanding.
- **Path `public/` wajib ASCII-only** (folder en-dash merusak pscp).
- **Jangan tarik file prod → repo** untuk "menyamakan": perbedaan yang tampak sering hanya **mojibake kosmetik** (em-dash/panah/× ter-double-encode di komentar), bukan beda kode. Arah yang benar = upload file repo bersih ke prod.
- **Rolldown `manualChunks` manual RUSAK** (react-dom bisa masuk chunk leaflet-map) → andalkan auto-split default Vite.
- **Cache key fetcher** harus di-bump saat logika/URL berubah, jika tidak data jadi stale.
- **CSV** untuk importer wajib **BOM**; sheet Excel yang bentrok nama wajib prefix domain.
- **Jangan commit** `backend/.env`, `deploy.env`, `_tmp/`.
- **Malware/residu:** server dev pernah kena DNS-C2 (sudah dibersihkan 21 Sep) — pastikan AV aktif & password ter-rotasi. Lihat memory `malware-svcrestart-dns-c2`.

---

## 10. Status & Riwayat Singkat

- **Live produksi:** CloudPanel `pertanian.sistemdata.id` — Express PM2 + MariaDB (41 tabel) + SSL. Deploy penuh terakhir 29 Sep 2026 (bundle `index-DbyBRUa0.js`, health 200 OK, logo aplikasi = `logo.svg`).
- **45 endpoint** API, **±30 rute** frontend, **41 tabel** DB.
- Fitur selesai: FSVA ketahanan pangan multi-year, rasio ketersediaan pangan, harga pangan Jateng + anomali Bapanas, rekomendasi/pasar, peta choropleth desa/kecamatan, profil kecamatan & desa, dasbor admin Excel + RBAC per-bidang, katalog jenis ikan, template import/export 16 domain.
- Commit kunci terbaru: `45558a6` (dropdown 20 kecamatan + migrasi 4 tabel + domains/excel.js), `9c0c36a` (logo.svg), `9b820e3` (regen template/export Excel + site config).

---

## 11. Checklist Serah Terima

- [ ] Akses repo Git + branch utama.
- [ ] `deploy.env` diisi (SSH, app root, DB) — file UNTRACKED, transfer lewat jalur aman.
- [ ] `backend/.env` produksi di server sudah benar (`JWT_SECRET`, DB, `DIST_DIR=./dist`, `BIND_HOST=127.0.0.1`, `PORT=5173`).
- [ ] Kredensial CloudPanel (site user `sistnian`) & akses PM2/nvm.
- [ ] Akses DB produksi (menu Databases CloudPanel).
- [ ] Uji `npm run dev` (frontend) + `node --env-file=.env src/server.js` (backend) di lokal.
- [ ] Uji `.\deploy.ps1 -SkipBuild -NoEnvUpload` (deploy aman) lalu cek `/health` = 200.
- [ ] Verifikasi login admin + 4 akun bidang (RBAC) di `/admin`.
- [ ] Rotasi password SSH/DB bila perlu (keamanan).

---

## 12. Kontak & Referensi Internal

- Dokumentasi audit & laporan: `docs/` (`audit-backend-db`, `audit-frontend`, `laporan-terkini-audit-terpadu`, `style_guide`).
- Roadmap & gap analysis: `gap-analysis-master.md` (arbiter kebutuhan klien), `docs/pengembangan.md` / `public/pengembangan.md`.
- Memori proyek (konteks lengkap per-topik): direktori memory AionUi — lihat `MEMORY.md` indeks.
