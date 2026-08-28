<div align="center">

# SISPERTANI

### Sistem Informasi Pertanian Kabupaten Banjarnegara

**Dashboard analitik pertanian terintegrasi untuk Dinas Pertanian, Perikanan dan Ketahanan Pangan Kabupaten Banjarnegara, Provinsi Jawa Tengah**

Version 1.2.0

</div>

---

## Tentang SISPERTANI

SISPERTANI adalah platform dashboard analitik pertanian berbasis web yang menyajikan data komprehensif sektor pertanian Kabupaten Banjarnegara dalam bentuk visualisasi interaktif. Aplikasi ini dirancang untuk mendukung pengambilan keputusan berbasis data bagi pemangku kepentingan di Dinas Pertanian, Perikanan dan Ketahanan Pangan.

Aplikasi bersifat **read-only** (tanpa autentikasi) dengan strategi **offline-first** — jika portal Open Data Banjarnegara tidak dapat diakses, aplikasi otomatis beralih ke data CSV/JSON lokal dengan caching stale-while-revalidate.

---

## Sektor Cakupan

| Sektor | Komoditas | Modul |
|--------|-----------|-------|
| Tanaman Pangan | Padi, Palawija | Prediksi Panen, Ketahanan Pangan |
| Hortikultura | Bawang Merah/Putih, Cabai Besar/Rawit, Kentang, Kubis, Petsai, Tomat, Buah | Hortikultura, Kesesuaian Lahan |
| Perkebunan | Kopi, Teh, Karet, Kakao, Tebu, Kelapa, Cengkeh, Kapulaga, Panili | Perkebunan |
| Peternakan | Sapi, Kerbau, Kuda, Kambing, Domba, Ayam, Itik | Peternakan |
| Perikanan | Budidaya (Kolam, Karamba, Mina Padi), Tangkap, Pembenihan | Perikanan, Nilai Ekonomi |

---

## Fitur Utama

### Dashboard Utama
Statistik agregat (dataset, luas sawah/bukan sawah, cakupan desa), peta choropleth interaktif, Top 15 desa berdasarkan luas lahan, dan tabel lahan kritis.

### Prediksi Panen
Bar chart luas vs produksi padi per kecamatan, simulator ekspansi lahan (input Ha → proyeksi produksi), dan ranking produktivitas.

### Kesesuaian Lahan
Radar chart 8 komoditas sayuran, matriks kesesuaian (Sangat Sesuai / Cukup / Rendah / Tidak), KPI cards, dan rekomendasi pengembangan per komoditas.

### Volatilitas Harga
Line chart inflasi multi-region (Banjarnegara / Jateng / Nasional), kalkulasi standar deviasi, dan 3 level volatilitas harga pangan.

### Ketahanan Pangan
Kombinasi produksi padi dan kapasitas lumbung desa, rasio simpanan, serta status Aman / Waspada / Rentan per kecamatan.

### Rantai Pasok
Pemetaan simpul pasar, koridor logistik antar-kecamatan, dan kapasitas distribusi hasil pertanian.

### Peternakan & Perikanan
Data ternak besar/kecil/unggas dan perikanan budidaya/tangkap/pembenihan dengan filter tahun & kecamatan, tren historis, proyeksi regresi linear, deteksi anomali YoY, dan CAGR.

### Perkebunan & Hortikultura
9 komoditas perkebunan dan 8 sayuran + 7 buah dengan metrik luas/produksi/produktivitas, ranking BPS, dan proyeksi tren.

### Kelembagaan Tani
Data 20 kecamatan: Poktan, Pokkan, Gapoktan, KTH dari SIMLUH Kementan dengan tingkatan Pemula/Madya/Utama.

### Rekomendasi Strategis
Dokumen rekomendasi per sektor (masalah, aksi, dampak, prioritas) dengan dukungan cetak PDF.

### Bantuan Pemerintah & Evaluasi Renstra
Alokasi APBD/APBN dan evaluasi capaian indikator Renstra 2019-2022 (target vs aktual) dengan cetak PDF.

### Chatbot Si Pertani
Asisten AI berbasis model deepseek-v4-pro yang dapat menjelaskan data pertanian dan memberikan analisis agronomis kontekstual Banjarnegara. Tersedia di halaman Rekomendasi Strategis.

---

## Stack Teknologi

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | React 19 + TypeScript 5.6 |
| Build Tool | Vite 8.0 |
| UI Library | HeroUI v3 + Tailwind CSS 4.3 |
| Routing | React Router DOM 6.23 |
| Visualisasi Data | Recharts 3.9 (Bar, Line, Radar) |
| Peta Interaktif | Leaflet 1.9 + OpenStreetMap / ESRI |
| Parsing Data | PapaParse 5.5 (CSV) |
| Ikon | Lucide React |
| Chatbot AI | DeepSeek v4 Pro (OpenAI-compatible API) |
| Sumber Data | CKAN OpenData Banjarnegara + CSV/JSON lokal + BPS |
| Deployment | CloudPanel (hosting statis + Nginx proxy) |

---

## Arsitektur

```
Browser
  └── main.tsx
       └── App.tsx (React.lazy code-splitting per halaman)
            └── layouts/default.tsx (sidebar grouped + header)
                 └── pages/*.tsx
                      └── services/api.ts
                           ├── CKAN API (opendata.banjarnegarakab.go.id)
                           ├── CSV lokal (public/14. Distankan KP/)
                           ├── JSON fallback (public/data/)
                           └── Cache localStorage (stale 15min, max 24h)
```

**Strategi data: Offline-first dengan fallback bertingkat.**
Tidak ada backend atau database — aplikasi murni client-side dengan caching localStorage.

---

## Struktur Sidebar

Sidebar dikelompokkan sesuai struktur organisasi Dinas Pertanian, Perikanan dan Ketahanan Pangan Banjarnegara:

| Grup | Menu |
|------|------|
| — | Dashboard |
| Bidang Tanaman Pangan | Prediksi Panen, Ketahanan Pangan |
| Bidang Hortikultura & Perkebunan | Hortikultura, Perkebunan, Kesesuaian Lahan |
| Bidang Peternakan | Peternakan |
| Bidang Perikanan | Perikanan, Nilai Ekonomi |
| Sekretariat & Ketahanan Pangan | Rantai Pasok, Fluktuasi Harga, Kelembagaan Tani, Rekomendasi, Analisis Bantuan, Analisis Renstra, Manual, Info SISPERTANI |

---

## Instalasi

### Prasyarat

- Node.js >= 18
- npm >= 9

### Langkah Instalasi

```bash
# Clone repository
git clone https://github.com/diskonnekted/dashboard-analitik-pertanian-dan-peternakan.git

# Masuk ke direktori
cd dashboard-analitik-pertanian-dan-peternakan

# Install dependencies
npm install

# Salin file environment
cp .env.example .env
# Edit .env dan isi VITE_CHATBOT_API_KEY dengan API key Anda

# Jalankan development server
npm run dev
```

Aplikasi tersedia di `http://localhost:5173`

### Build Produksi

```bash
npm run build    # Compile TypeScript + build Vite
npm run preview  # Preview build produksi secara lokal
```

---

## Konfigurasi Environment

Buat file `.env` di root project berdasarkan `.env.example`:

```env
VITE_CHATBOT_API_KEY=your_api_key_here
VITE_CHATBOT_API_URL=https://9inference.cloud/v1/package/chat/completions
VITE_CHATBOT_MODEL=deepseek-v4-pro-0813
```

| Variabel | Deskripsi |
|----------|-----------|
| `VITE_CHATBOT_API_KEY` | API key untuk chatbot Si Pertani |
| `VITE_CHATBOT_API_URL` | Endpoint API chatbot (OpenAI-compatible) |
| `VITE_CHATBOT_MODEL` | Model AI yang digunakan |

---

## Sumber Data

| Sumber | Tipe | URL |
|--------|------|-----|
| Open Data Banjarnegara | CKAN API | `opendata.banjarnegarakab.go.id` |
| Data CSV Lokal | Excel/CSV | `public/14. Distankan KP/` |
| Data Fallback | JSON | `public/data/` |
| Badan Pusat Statistik | Publikasi | BPS Kabupaten Banjarnegara |
| SIMLUH Kementan | API/CSV | Sistem Informasi Luas Usaha Tani |

---

## Optimasi Performa

- **Code-splitting**: Setiap halaman dimuat on-demand via `React.lazy` + `Suspense` (bundle awal 225 KB, bukan 990 KB)
- **Caching stale-while-revalidate**: 16 fetch function dengan cache localStorage (fresh 15 menit, stale hingga 24 jam)
- **Parallel fetch**: Halaman dengan multiple API call menggunakan `Promise.all`
- **Timeout adaptif**: 5 detik per fetch sebelum fallback ke data lokal

---

## Deployment

Aplikasi ini di-deploy sebagai static site di CloudPanel dengan Nginx reverse proxy.

### Deploy ke hosting statis

```bash
npm run build
# Upload folder dist/ ke web root server
```

### Konfigurasi Nginx (SPA routing)

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Domain produksi: `https://pertanian.sistemdata.id`

---

## Lisensi

Licensed under the [MIT license](LICENSE).

---

<div align="center">

**SISPERTANI** — Dinas Pertanian, Perikanan dan Ketahanan Pangan Kabupaten Banjarnegara

</div>
