# Audit Backend & Database SISPERTANI

**Tanggal:** 22 September 2026 · **Auditor:** Sispertani Backend Deploy (tim sispertani)
**Lingkup:** backend Express :4100, MariaDB XAMPP, ETL `database/import/`, status deploy, temuan & risiko.
**Sifat:** audit baca-saja — tidak ada kode/konfigurasi yang diubah.
**Kredensial:** tidak dicantumkan di laporan ini; kredensial DB & admin tersimpan di `backend/.env` (tidak ter-commit), kredensial ETL di `database/import/.env` (tidak ter-commit). Lihat "Temuan #2" untuk masalah `deploy.ps1`.

---

## 1. Ringkasan

| Aspek | Status |
|---|---|
| Backend Express (dev, port 4100) | ✅ Hidup — `/api/health` 200 `{"ok":true,"db":"up"}` |
| MariaDB XAMPP lokal | ✅ Hidup — 10.4.32-MariaDB, database `sispertani`, **41 tabel, ±19.233 baris** |
| Endpoint publik `/api/v1/*` | ✅ **38 diiklankan** (33 data + 5 admin) — uji otomatis: **33/33 endpoint data 200 OK**; 5 route admin menolak akses tanpa token/POST sesuai desain (401/404) |
| Dasbor admin Excel | ✅ 15 domain × 30 sheet (template/export/import/upsert); jejak E2E di `sync_log` (uji 22 Sep 01:28) |
| Importer ETL `database/import/` | ✅ Node ESM: 20 fungsi import, dry-run & baseline idempoten; import massal terakhir 21 Sep 20:21–22:04 |
| Frontend produksi | ✅ Live `https://pertanian.sistemdata.id` (statis `dist/` via pscp) — **masih memakai fallback CSV, belum memakai API** |
| API + MySQL di produksi | ❌ **BELUM deploy** (gap **P4-1, kritis**) — `/api/health` di domain live gagal |
| Git | Working tree bersih (hanya untracked: file kerja `_*.sql`, `_tmp/`, 2 dokumen `public/*.md` baru) |

---

## 2. Arsitektur

```
public/ (CSV/JSON/geojson statis) ──► database/import/ (ETL Node: ESM, upsert proteksi-manual)
                                          │  run.mjs [--dry|--only|--skip|--force]
                                          ▼
                                   MariaDB `sispertani` (41 tabel)
                                          │  pool mysql2 (prepared statements)
                                          ▼
                                   backend/ Express :4100 ──► /api/v1/* (33 data + 5 admin)
                                          │                        ▲
                                          │                        │ Bearer token (dasbor admin)
                                          ▼                        │
              dist/ (React build) ── pscp ──► pertanian.sistemdata.id (produksi, statis)
```

- **Stack backend:** Express 4 + mysql2/promise (pool, `decimalNumbers:true`, `dateStrings:true`), ExcelJS, Multer (upload .xlsx ≤ 15 MB), helmet, compression (gzip), express-rate-limit.
- **Konfigurasi:** semua via `backend/.env` (`DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME`, `ADMIN_USER`, `ADMIN_PASS`, `PORT`, `PUBLIC_DIR`; template `backend/.env.example` ter-commit tanpa nilai).
- **Versioning cache:** setiap endpoint data membaca tabel `cache_version` → response field `version`; UI memakai `?v=` untuk cache-busting (pola `withCache` 32 endpoint statistik).
- **Keamanan (dev):** CORS allowlist 5 origin (semua `localhost` — lihat Temuan #6), rate limit global 300 req/15 mnt/IP, token admin in-memory TTL 12 jam, login dibandingkan `timingSafeEqual`, semua SQL memakai placeholder `?`.

---

## 3. Endpoint `/api/v1/*`

Indeks: `GET /api/v1` (metadata self-describing), `GET /api/health` (di luar `/v1`). Uji otomatis semua 38 endpoint yang diiklankan indeks (22 Sep 2026):

### 3.1 Endpoint data — 33/33 ✅ 200 OK

| Domain | Endpoint | Uji baris |
|---|---|---|
| Lahan | `/lahan/desa`, `/lahan/kabupaten` | 278 desa (lahan kritis T4.10 + total_dikuasai) |
| Padi | `/padi/production`, `/padi/history`, `/padi/sawah-ladang` | 19 kec (snapshot 2025 via `PUBLIC_DIR`) |
| Palawija | `/palawija/jagung-ubi-kayu`, `/palawija/kacang-kedelai`, `/palawija/ubi-kacang-hijau` | OK |
| Hortikultura | `/hortikultura/sayuran-produksi`, `/sayuran-luas`, `/buah-produksi`, `/produksi-tahunan` | OK |
| Perkebunan | `/perkebunan/areal`, `/perkebunan/produksi` | OK |
| Peternakan | `/peternakan/kecil`, `/besar`, `/unggas`, `/pemasukan`, `/pengeluaran`, `/luar-rph`, `/daging-unggas` | 140 kec×jenis (kecil) |
| Perikanan | `/perikanan/budidaya`, `/tangkap`, `/benih`, `/nilai-budidaya`, `/nilai-tangkap` | 120 (tangkap) |
| Ekonomi | `/ekonomi/inflasi`, `/ekonomi/pasar` | OK |
| Lumbung | `/lumbung` | 20 kec |
| Kelembagaan | `/kelembagaan/kelompok-tani`, `/kelembagaan/kth` | 120 |
| Sensus | `/st2023/desa` | 278 |
| Bantuan | `/bantuan` (agregat: `{program, alokasi, korelasi, updatedAt}`) | 0 (tabel by-design kosong) |

### 3.2 Endpoint admin — 5 route (verifikasi 401/404 sesuai desain tanpa token)

| Route | Fungsi | Perilaku tanpa token/POST |
|---|---|---|
| `POST /api/v1/admin/login` | `{user, pass}` → token | 404 saat GET (POST-only) ✅ |
| `GET /api/v1/admin/domains` | daftar 15 domain × sheet/kolom/kunci | 401 ✅ |
| `GET /api/v1/admin/template/:domain` | .xlsx template (sheet PETUNJUK + kosong + CONTOH) | 401 ✅ |
| `GET /api/v1/admin/export/:domain` | .xlsx berisi data DB saat ini | 401 ✅ |
| `POST /api/v1/admin/import/:domain` | unggah .xlsx → upsert per sheet | 404 saat GET (POST-only) ✅ |

**Mekanisme autentikasi admin:** kredensial di `backend/.env` (tidak ter-commit); login dengan `timingSafeEqual`; token acak in-memory (TTL 12 jam); **rate limit khusus login 5 kegagalan/15 mnt per IP (lockout)**; semua route admin wajib `Authorization: Bearer <token>`.

**Mekanisme dasbor Excel (lib/excel.js + lib/domains.js):**
- 15 domain × 30 sheet: bantuan-program/alokasi/korelasi (3), padi, palawija, hortikultura (4 sheet), perkebunan (3), peternakan (6), perikanan (9), lahan, lumbung, ekonomi (inflasi+pasar), kelembagaan (poktan+KTH), st2023, renstra.
- Template: sheet **PETUNJUK** (cara pakai, kolom kunci, aturan tipe, daftar 20 kecamatan resmi), sheet data kosong dengan **dropdown validasi enum**, sheet **CONTOH** (2 baris terakhir DB / sintetis).
- Import: header dipetakan (kolom tak dikenal diabaikan + dilaporkan), validasi kecamatan (alias dikenali), tahun 2000–2030, angka (koma ribuan BPS ditoleransi), enum; **kunci natural (kecamatan+jenis+tahun dst.) → upsert: kolom kosong TIDAK mengubah nilai lama**, baris baru `sumber='manual'`; batas 10.000 baris/sheet; laporan `{inserted, updated, skipped, errors[row,message]}`; setiap import dicatat ke `sync_log` (siapa/kapan/file/hasil).

**Endpoint yang DIKETAHUI BELUM ADA** (sesuai roadmap `public/pengembangan.md` P1):
- `GET /v1/peternakan/susu-kulit` → **404** — padahal tabel `ternak_susu_kulit` berisi 240 baris (P1-1, estimasi S).
- `GET /v1/admin/sync-log` → **404** — padahal tabel `sync_log` berisi 64 baris (P1-2, estimasi S).

---

## 4. Tabel Database (MariaDB `sispertani`, XAMPP 10.4.32)

`database/schema.sql`: **41 tabel** (+ dump referensi `schema-dump.sql`; baseline di `database/README.md`). Hitungan baris aktual 22 Sep 2026 (total **±19.233**):

| Kelompok | Tabel (baris) |
|---|---|
| Referensi (4) | `kecamatan` (20), `desa` (278), `dataset_sumber` (39), `sync_log` (64) |
| Tanaman pangan (2) | `padi_produksi` (164), `palawija_produksi` (442) |
| Hortikultura (4) | `horti_luas` (2.147), `horti_produksi` (3.297), `horti_luas_kabupaten` (389), `horti_produksi_kabupaten` (552) |
| Perkebunan (3) | `perkebunan_areal` (1.300), `perkebunan_produksi` (1.218), `perkebunan_produksi_kabupaten` (39) |
| Peternakan (6) | `ternak_populasi` (1.716), `ternak_daging` (859), `ternak_telur` (240), **`ternak_susu_kulit` (240)**, `ternak_flow` (1.058), `ternak_pemotongan` (572) |
| Perikanan (9) | `ikan_tangkap` (462), `ikan_tangkap_perairan_umum` (120), `ikan_budidaya` (324), `ikan_benih` (278), `ikan_kolam` (138), `ikan_waduk` (140), `ikan_minapadi` (129), `ikan_pemeliharaan` (185), `ikan_obyek_penangkapan` (538) |
| Lahan (2) | `lahan_penggunaan` (121), `lahan_desa` (278 — **12 kolom lahan kritis T4.10 + `total_dikuasai`**, commit 231273e, Σ kabupaten 51.632,3 Ha terverifikasi) |
| Lumbung & ekonomi (3) | `lumbung_pangan` (140), `pasar` (40), `inflasi` (49) |
| Kelembagaan (3) | `kelompok_tani` (834), `kelompok_tani_hutan` (188), `kth_detail` (357) |
| Sensus & renstra (2) | `st2023_desa` (278), `renstra_target` (**0 — belum diimpor**) |
| Bantuan (3) | `bantuan_program` (0), `bantuan_alokasi` (0), `bantuan_korelasi` (0) — **by design**, diisi via dasbor admin |

Catatan: 3 tabel bantuan + `renstra_target` masih kosong; `renstra_target` disiapkan di schema & DOMAIN dasbor tetapi baseline belum diimpor (frontend Renstra masih hardcoded terverifikasi).

---

## 5. Importer ETL — `database/import/`

(Node ESM; konfigurasi `database/import/.env` tersendiri — tidak ter-commit.)

| Berkas | Peran |
|---|---|
| `run.mjs` | CLI orchestrator: `--dry` (default ON), `--only=<dataset>`, `--skip=`, `--force`, `--force-baseline`; tampilan 4 fase (ref → dataset → bantuan → wrap-up) + laporan baris/waktu. |
| `lib.mjs` | Mesin inti: koneksi pool, `upsert()` (**kolom null/kosong diabaikan → edit manual tidak tertimpa**; baris `sumber='manual'` dijaga), `readCsv/readJson`, `stripKecPrefix/stripDesaPrefix/normDesa/normStr`, `cleanNum` (koma ribuan BPS, strip "–"/"—"), `isAggregateRow` (baris "Jumlah" dikecualikan dari agregat), `meltWideYear` (wide→long per tahun), resolver kecamatan, `logSync()` → `sync_log`. |
| `ref.mjs` | Tabel referensi: `kecamatan` + `desa` (dari `peta_desa_v3.geojson`, urutan deterministik) + `dataset_sumber` (dari `distankan-index.json`, 39 sumber). |
| `datasets.mjs` | 20 fungsi import domain (padi → st2023) dari CSV/JSON di `public/` + fallback JSON. |
| `inspect.mjs` | Diagnostik struktur sumber (bukan jalur import). |

- **Baseline terakhir:** import massal 21 Sep 2026 20:21–22:04 — konsisten dengan baseline README (dry-run 0 error; verifikasi sel-level vs BPS: padi 4/40 sel, horti 80/80, ternak 90/90, ternak_flow 113/114 + 1 quirk resmi BPS, ikan tangkap 48/48, budidaya 36/36, nilai 45/46 + 1 quirk, lahan T4.10 278/278 aritmetika OK).
- **`sync_log` (64 baris):** 38 kelompok log — 34 dataset import massal + 4 status `warn` (`ikan_kolam`, `ikan_minapadi`, `ikan_obyek_penangkapan`, `ternak_susu_kulit`) + 9 log E2E dasbor admin 22 Sep 01:28–01:34 (`uji-padi.xlsx` → ok; `uji-bantuan.xlsx` → partial by-design, uji baris ditolak).
- **Catatan risiko data (dari README):** `ikan_minapadi` belum diverifikasi baris-demi-baris vs PDF sumber.

---

## 6. Status Deploy

| Komponen | Produksi | Mekanisme |
|---|---|---|
| Frontend | ✅ Live `pertanian.sistemdata.id` (HTTP 200) | `deploy.ps1`: build `npm run build` → `pscp` (port 64001, non-standar) kirim `dist/` + `public/` ke host shared → verifikasi MD5 bundle → catat rollback ke `rollback-last.txt`. Semua path transfer ASCII (pelajaran en-dash sudah diterapkan). |
| API `/api/v1` | ❌ Tidak ada — `https://pertanian.sistemdata.id/api/health` **gagal** (shared hosting hanya menerima statis) | Backend hanya jalan di dev `localhost:4100`. |
| MariaDB | ❌ Hanya XAMPP lokal | `database/schema-dump.sql` manual; tidak ada replikasi/backup terjadwal. |

**Konsekuensi P4-1 (kritis, sudah tercantum di `public/pengembangan.md`):** seluruh hasil Fase A/B (41 tabel, 38 endpoint, dasbor admin) hanya bisa diakses dari mesin dev; pengunjung produksi masih dilayani `dist/` + fallback CSV statis. Butuh host yang mendukung Node+MySQL (VPS/panel), penyesuaian CORS (allowlist masih localhost-only), HTTPS, dan migrasi frontend dari fallback CSV ke API (fallback tetap disimpan).

---

## 7. Temuan

### Risiko tinggi
1. **P4-1 — API + MySQL belum deploy ke produksi.** Semua 38 endpoint hanya dev. Frontend produksi masih statis; kerja Fase A/B belum dinikmati pengguna. (Roadmap: jangan ditunda; hardening: CORS, token admin, HTTPS.)
2. **Password SSH produksi hardcode di `deploy.ps1`, dan `deploy.ps1` TERLACAK git** — berbeda dengan kebijakan proyek "kredensial hanya di `backend/.env`" (nilai password TIDAK ditampilkan di laporan ini). Rekomendasi: pindahkan ke `.env` yang tidak terlacak / ganti password jika repo pernah dibagikan, dan tambahkan `deploy.ps1` versi template tanpa kredensial.

### Gap fungsional (sudah ada di roadmap — dikonfirmasi utuh oleh audit)
3. `GET /v1/peternakan/susu-kulit` belum ada padahal tabel berisi 240 baris (P1-1, S).
4. `GET /v1/admin/sync-log` belum ada padahal tabel 64 baris (P1-2, S) — tab "Riwayat Import" di dasbor.
5. `renstra_target` 0 baris: schema + DOMAIN dasbor siap, baseline belum diimpor; belum ada endpoint renstra.
6. CORS allowlist 5 origin semuanya `localhost`/`127.0.0.1` — wajib ditambah origin produksi saat P4-1.

### Risiko menengah/rendah
7. Token admin in-memory (restart backend = semua sesi admin terputus) + admin tunggal, belum RBAC multi-admin (P4-2).
8. 4 dataset impor terakhir berstatus `warn` + `ikan_minapadi` belum verifikasi baris-demi-baris (catatan README).
9. Tidak ada backup/dump MariaDB terjadwal (dump manual saja).
10. Kebersihan repo: 13 file kerja `_*.sql/_*.txt` untracked di `database/import/`, `_tmp/` untracked, `public/gap-analysis.md` + `public/pengembangan.md` untracked (belum di-commit), `*.tsbuildinfo` untracked — layak dirapikan/di-gitignore.

### Positif (dipertahankan)
- Prepared statements di seluruh query; `timingSafeEqual` + rate limit + lockout login; helmet & gzip; indeks API self-describing; validasi import ketat dengan laporan per baris; **upsert tidak menimpa edit manual** (di ETL dan dasbor); path transfer deploy ASCII-only; protokol rollback tercatat; working tree bersih terhadap HEAD (660050f).
- Jejak audit lengkap: setiap import tercatat di `sync_log` — kapan (21/22 Sep), dari sumber apa (csv/json/geojson/xlsx), status (ok/warn/partial).

---

*Lampiran: skrip uji audit di `_tmp/test-endpoints.mjs` (uji 38 endpoint) dan `_tmp/count-rows.mjs` + `_tmp/synclog.mjs` (hitung baris & rekap sync_log).*
