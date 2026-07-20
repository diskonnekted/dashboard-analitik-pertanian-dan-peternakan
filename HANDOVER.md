# Dokumen Handover — Dashboard Analitik Pertanian & Peternakan

**Proyek:** Sistem Informasi Manajemen Pertanian Kab. Banjarnegara (JDN)
**Repo:** https://github.com/diskonnekted/dashboard-analitik-pertanian-dan-peternakan
**Domain produksi:** https://pertanian.sistemdata.id
**Commit terakhir sesi ini:** `7cdfe32` (branch `main`)

---

## 1. Ringkasan Aplikasi

Aplikasi web statis (React + Vite + TypeScript, UI HeroUI + Tailwind, gaya neo-brutalist) yang menampilkan analitik data pertanian, peternakan, dan perikanan Kab. Banjarnegara. Data bersumber dari file CSV lokal (di `public/14. Distankan KP/`) dan sebagian dari portal Open Data Banjarnegara (CKAN) via proxy.

### Halaman utama
| Menu | Route | Sumber Data |
|---|---|---|
| Dashboard | `/` | Lahan per-desa (CKAN online) + GeoJSON peta |
| Prediksi Panen | `/harvest-prediction` | CSV padi lokal |
| Kesesuaian Lahan | `/land-suitability` | CKAN `/api` |
| Fluktuasi Harga | `/price-fluctuation` | CKAN `/dataset` |
| Ketahanan Pangan | `/food-security` | CSV lumbung lokal |
| Rantai Pasok | `/supply-chain` | CSV lokal |
| Perikanan | `/fisheries` | CSV lokal |
| Nilai Ekonomi | `/economic-value` | CSV lokal |
| **Rekomendasi** (baru) | `/recommendations` | Statis (konten dokumen) |
| Info JDN | `/info` | Statis |

---

## 2. Yang Dikerjakan di Sesi Ini

1. **Halaman Rekomendasi baru** (`src/pages/recommendations.tsx`)
   - Dokumen strategis printable: rekomendasi per sektor (Pertanian, Peternakan, Perikanan) + rekomendasi strategis untuk Dinas dan Bupati.
   - Tombol "Cetak / Simpan PDF" (`window.print()`).
   - Blok penutup ber-atribusi **Jaga Data Nusantara (JDN)**.
   - Didaftarkan di `src/App.tsx`, menu di `src/config/site.ts`, ikon di `src/layouts/default.tsx`.

2. **Print styles** (`src/styles/globals.css`)
   - `@media print` menyembunyikan chrome aplikasi (class `.no-print`), membuka container overflow (`.print-root`, `.print-main`), dan mencegah kartu terpotong antar halaman (`.print-block`).
   - Layout `src/layouts/default.tsx` diberi penanda class terkait (sidebar/header/footer `no-print`).

3. **Update Info JDN** (`src/pages/info.tsx`)
   - Menghapus kata "secara sukarela".
   - Menambah 6 card roadmap baru (Neraca Pangan Wilayah, Integrasi Data Iklim, Dasbor Nilai Ekonomi, Rekomendasi Strategis, Portal Data Terbuka).

---

## 3. Cara Menjalankan (Lokal)

```powershell
npm install
npm run dev        # dev server di http://localhost:5173
npm run build      # output ke folder dist/
npm run preview    # uji hasil build di http://localhost:4173
```

---

## 4. Cara Deploy / Update ke Server

Metode: **build lokal + upload** (server hanya menyajikan file statis, tidak perlu Node.js).

1. `npm run build` di lokal → hasil di `dist/`.
2. Zip **isi** folder `dist/` (bukan foldernya).
3. Di **CloudPanel → File Manager**, masuk ke `~/htdocs/pertanian.sistemdata.id/`.
4. Hapus `index.html` lama + folder `assets/` lama (nama file ber-hash, agar tidak menumpuk).
5. Upload zip → extract di document root.
6. Buka https://pertanian.sistemdata.id/ lalu hard refresh (`Ctrl+Shift+R`).

Struktur akhir di server:
```
htdocs/pertanian.sistemdata.id/
├── index.html
├── assets/
├── favicon.ico
└── 14. Distankan KP/   (folder CSV)
```

### Konfigurasi Nginx (vhost) — sudah terpasang, tidak perlu diubah
- `location / { try_files $uri $uri/ /index.html; }` → SPA fallback (cegah 404 saat refresh di rute non-root).
- `location /api/` & `location /dataset/` → proxy ke `https://opendata.banjarnegarakab.go.id` (menggantikan proxy `vite.config.ts` yang hanya aktif saat dev).

---

## 5. Isu Terbuka / Catatan untuk Sesi Berikutnya

1. **Peta: 4 kecamatan kosong data lahan per-desa**
   - Kecamatan **Banjarmangu, Kalibening, Purwanegara, Klampok** tampil abu-abu di choropleth peta Dashboard.
   - Penyebab: peta mewarnai poligon **per-desa** dari `fetchLahanBanjarnegara()` (sumber CKAN online). Data lahan per-desa untuk 4 kecamatan itu belum tersedia di CKAN.
   - Sudah dicross-check ke `I:\analiotik\master data\...` — hanya ada data lahan **agregat kabupaten** (bukan per-desa), jadi tidak bisa mengisi peta.
   - Status: **sengaja dibiarkan** atas keputusan sesi ini. Opsi solusi jika mau dilanjutkan:
     - (a) Beri keterangan legenda "data per-desa belum tersedia".
     - (b) Ganti sumber warna peta ke level kecamatan (mis. produksi padi dari CSV lokal) agar tidak bolong.
     - (c) Sediakan file lahan per-desa untuk 4 kecamatan tsb.

2. **Ketergantungan proxy CKAN**
   - Halaman Kesesuaian Lahan, Fluktuasi Harga, Info dataset, dan choropleth peta bergantung pada portal Open Data online (via proxy Nginx). Jika portal down, halaman itu kosong.
   - Opsi mitigasi (belum dikerjakan): unduh dataset online menjadi CSV lokal di `public/` + beri fallback, seperti pola padi/sayuran/lumbung, agar app 100% statis.

3. **Bundle size** — build memunculkan warning chunk > 500 kB (JS ~990 kB). Tidak menghalangi jalan, tapi bisa dioptimasi dengan code-splitting bila perlu.

4. **Warning CSS `@import`** saat build — pra-eksisting (`@import` font harus sebelum rule lain). Tidak berpengaruh ke hasil.

---

## 6. Struktur Data Penting

- **CSV lokal:** `public/14. Distankan KP/` (nama folder mengandung spasi & koma — gunakan zip saat upload).
- **GeoJSON peta:** `public/*.geojson` (`peta_desa_v3.geojson`, `peta_kecamatan.geojson`, `sawah.geojson`, dll).
- **Layanan data:** `src/services/api.ts` (semua fungsi `fetch*`).

---

*Dokumen ini dihasilkan untuk mengakhiri sesi pengembangan. Perbaikan terbaru sudah di-push ke `main` dan `dist/` sudah ter-build untuk presentasi ke Dinas Pertanian.*
