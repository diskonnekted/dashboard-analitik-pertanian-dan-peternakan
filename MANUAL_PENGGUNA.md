# Manual Penggunaan Aplikasi Dasbor Analitik Pertanian Kabupaten Banjarnegara

## 1. Identitas Aplikasi

**Nama aplikasi:** SISPERTANI — Sistem Informasi Pertanian Kabupaten Banjarnegara  
**Jenis aplikasi:** Dasbor analitik berbasis web  
**Alamat produksi:** https://pertanian.sistemdata.id  
**Pengguna utama:** Dinas Pertanian, Perikanan dan Ketahanan Pangan Kabupaten Banjarnegara, pengambil kebijakan, analis data, dan operator data.

SISPERTANI menyajikan ringkasan, peta, grafik, tabel, simulasi, dan rekomendasi berbasis data sektor pertanian, peternakan, perikanan, perkebunan, hortikultura, kelembagaan tani, ketahanan pangan, rantai pasok, nilai ekonomi, bantuan pemerintah, dan evaluasi Renstra.

---

## 2. Kebutuhan Penggunaan

### 2.1 Untuk Pengguna Umum

- Peramban modern: Google Chrome, Microsoft Edge, Firefox, atau Safari.
- Koneksi internet untuk membuka aplikasi produksi.
- Resolusi layar disarankan minimal laptop/tablet; aplikasi tetap dapat dibuka melalui ponsel.

### 2.2 Untuk Operator/Pengembang Lokal

- Node.js dan npm.
- Source code aplikasi.
- Data CSV/GeoJSON di folder `public/`.

Perintah lokal:

```bash
npm install
npm run dev
npm run build
npm run preview
```

---

## 3. Cara Membuka Aplikasi

1. Buka browser.
2. Masuk ke alamat:

   ```txt
   https://pertanian.sistemdata.id
   ```

3. Tunggu hingga halaman dasbor tampil.
4. Gunakan menu di sidebar kiri untuk berpindah halaman.

Pada layar kecil, tekan tombol menu di kiri atas untuk membuka navigasi.

---

## 4. Struktur Navigasi Utama

| Menu | Route | Fungsi Utama |
|---|---|---|
| Dashboard | `/` | Ringkasan data, statistik lahan, peta sebaran lahan, grafik, dan tabel peringatan. |
| Prediksi Panen | `/prediction` | Analisis produktivitas padi dan simulasi tambahan hasil panen. |
| Kesesuaian Lahan | `/suitability` | Analisis kesesuaian komoditas berdasarkan data produksi sayuran. |
| Fluktuasi Harga | `/price-volatility` | Analisis inflasi sebagai proksi fluktuasi harga. |
| Ketahanan Pangan | `/food-security` | Analisis produksi padi dan infrastruktur lumbung/gudang pangan. |
| Rantai Pasok | `/supply-chain` | Ringkasan pasar dan kesiapan distribusi/logistik. |
| Peternakan | `/livestock` | Analisis ternak kecil, ternak besar, dan unggas. |
| Perkebunan | `/plantation` | Analisis luas, produksi, produktivitas, dan proyeksi perkebunan. |
| Hortikultura | `/horticulture` | Analisis luas panen, produksi sayuran, buah, dan proyeksi hortikultura. |
| Kelembagaan Tani | `/farmers` | Analisis kelompok tani, anggota tani, perikanan, dan gapoktan. |
| Perikanan | `/fisheries` | Analisis budidaya, tangkap, dan pembenihan ikan. |
| Nilai Ekonomi | `/economic-value` | Analisis produksi dan nilai produksi perikanan. |
| Rekomendasi | `/recommendations` | Rekomendasi strategis berbasis analisis data. |
| Analisis Bantuan | `/government-assistance` | Analisis dan rekomendasi alokasi bantuan pemerintah. |
| Analisis Renstra | `/renstra` | Evaluasi capaian indikator Renstra dan laporan cetak. |
| Info SISPERTANI | `/info` | Informasi sistem, tujuan, roadmap, dan konsep analitik. |

---

## 5. Panduan Penggunaan Per Halaman

### 5.1 Dashboard

Halaman Dashboard adalah halaman awal aplikasi.

Fitur utama:

- Melihat jumlah dataset Open Data.
- Melihat total lahan sawah.
- Melihat total lahan bukan sawah.
- Melihat cakupan wilayah/desa.
- Menampilkan peta sebaran lahan pertanian.
- Menampilkan grafik luas lahan.
- Menampilkan tabel peringatan wilayah.

Cara menggunakan peta:

1. Pilih layer metrik di bagian kiri atas peta:
   - Lahan Sawah.
   - Lahan Bukan Sawah.
   - Total Keseluruhan.
2. Gunakan kolom pencarian untuk mencari nama desa.
3. Klik legenda untuk menyaring kategori luasan tertentu.
4. Klik area desa pada peta untuk melihat detail:
   - Nama desa dan kecamatan.
   - Luas sawah.
   - Luas lahan bukan sawah/ladang.
   - Total luas.
   - Data kelembagaan tani bila tersedia.
5. Gunakan kontrol layer peta untuk mengganti basemap atau menampilkan/menyembunyikan layer.

Catatan: beberapa wilayah dapat tampil abu-abu apabila data per-desa belum tersedia.

---

### 5.2 Prediksi Panen

Halaman ini digunakan untuk melihat analisis produktivitas padi.

Fitur utama:

- Grafik produksi dan produktivitas padi per kecamatan.
- Ringkasan kecamatan dengan produksi tinggi.
- Simulator tambahan luas tanam untuk memperkirakan tambahan produksi.

Cara menggunakan:

1. Buka menu **Prediksi Panen**.
2. Perhatikan grafik produksi padi.
3. Gunakan simulator/masukan luas tambahan jika tersedia.
4. Baca hasil estimasi tambahan produksi sebagai bahan awal perencanaan.

Catatan: hasil prediksi bersifat analitik/simulatif dan perlu divalidasi dengan kondisi lapangan.

---

### 5.3 Kesesuaian Lahan

Halaman ini membantu melihat potensi komoditas berdasarkan data produksi.

Cara menggunakan:

1. Buka menu **Kesesuaian Lahan**.
2. Pilih/filter komoditas atau kecamatan jika tersedia.
3. Amati visualisasi peringkat/potensi.
4. Gunakan hasil sebagai indikasi awal, bukan sebagai keputusan final teknis budidaya.

---

### 5.4 Fluktuasi Harga

Halaman ini menampilkan analisis inflasi/pergerakan ekonomi sebagai proksi fluktuasi harga.

Cara menggunakan:

1. Buka menu **Fluktuasi Harga**.
2. Lihat grafik tren inflasi per tahun.
3. Bandingkan Banjarnegara dengan wilayah pembanding.
4. Baca ringkasan analisis di bagian bawah halaman.

---

### 5.5 Ketahanan Pangan

Halaman ini menilai aspek produksi pangan dan infrastruktur cadangan pangan.

Fitur utama:

- Produksi padi.
- Lumbung pangan.
- Gudang pangan.
- Ringkasan kecamatan prioritas.

Cara menggunakan:

1. Buka menu **Ketahanan Pangan**.
2. Lihat statistik utama.
3. Bandingkan produksi dengan kapasitas lumbung/gudang.
4. Gunakan informasi untuk menentukan daerah prioritas penguatan cadangan pangan.

---

### 5.6 Rantai Pasok

Halaman ini berfokus pada kesiapan pasar dan distribusi.

Cara menggunakan:

1. Buka menu **Rantai Pasok**.
2. Amati jumlah dan jenis pasar.
3. Baca analisis kesiapan koridor logistik.
4. Gunakan sebagai bahan identifikasi simpul distribusi hasil pertanian.

---

### 5.7 Peternakan

Halaman Peternakan menganalisis populasi ternak.

Data utama:

- Ternak kecil: kambing, domba, babi, kelinci.
- Ternak besar: sapi, sapi perah, kerbau, kuda.
- Unggas: ayam kampung, ayam ras layer, ayam broiler, itik, itik manila.

Cara menggunakan:

1. Buka menu **Peternakan**.
2. Pilih kategori/jenis ternak jika tersedia.
3. Lihat total populasi dan kecamatan dominan.
4. Bandingkan tren atau sebaran antar kecamatan.

---

### 5.8 Perkebunan

Halaman ini menyajikan luas areal, produksi, produktivitas, dan proyeksi perkebunan.

Cara menggunakan:

1. Buka menu **Perkebunan**.
2. Pilih metrik analisis:
   - Luas.
   - Produksi.
   - Produktivitas.
3. Pilih komoditas jika tersedia.
4. Lihat grafik, tabel, dan proyeksi tahun berikutnya.

---

### 5.9 Hortikultura

Halaman Hortikultura menyajikan analisis tanaman sayuran dan buah-buahan.

Cara menggunakan:

1. Buka menu **Hortikultura**.
2. Pilih metrik analisis seperti luas atau produksi.
3. Pilih komoditas/kecamatan jika tersedia.
4. Gunakan grafik dan proyeksi sebagai bahan pengamatan tren.

---

### 5.10 Kelembagaan Tani

Halaman ini menampilkan kondisi kelompok tani dan kelembagaan pendukung.

Data utama:

- Jumlah kelompok tani.
- Jumlah anggota tani.
- Kelompok perikanan.
- Anggota kelompok perikanan.
- Gapoktan.
- Anggota gapoktan.

Cara menggunakan:

1. Buka menu **Kelembagaan Tani**.
2. Amati ringkasan total kelembagaan.
3. Lihat grafik atau daftar kecamatan/desa.
4. Gunakan data untuk melihat kekuatan kelembagaan dan kebutuhan pembinaan.

---

### 5.11 Perikanan

Halaman Perikanan menganalisis sektor budidaya, tangkap, dan pembenihan.

Cara menggunakan:

1. Buka menu **Perikanan**.
2. Pilih atau amati kategori:
   - Budidaya.
   - Tangkap.
   - Pembenihan.
3. Bandingkan produksi antar kecamatan atau jenis usaha.
4. Gunakan informasi untuk melihat sentra produksi dan peluang pengembangan.

---

### 5.12 Nilai Ekonomi

Halaman ini menampilkan nilai ekonomi produksi perikanan.

Cara menggunakan:

1. Buka menu **Nilai Ekonomi**.
2. Lihat produksi dan nilai produksi.
3. Bandingkan subsektor budidaya dan tangkap.
4. Gunakan rasio nilai terhadap produksi sebagai indikasi efisiensi/nilai tambah.

---

### 5.13 Rekomendasi

Halaman ini menyediakan rekomendasi strategis berbasis data.

Fitur utama:

- Rekomendasi sektor pertanian.
- Rekomendasi peternakan.
- Rekomendasi perikanan.
- Rekomendasi untuk Dinas terkait.
- Rekomendasi untuk Bupati.
- Tombol cetak/simpan PDF.

Cara mencetak:

1. Buka menu **Rekomendasi**.
2. Tekan tombol **Cetak / Simpan PDF**.
3. Pilih printer atau opsi **Save as PDF**.
4. Simpan dokumen.

---

### 5.14 Analisis Bantuan

Halaman ini menyajikan analisis bantuan pemerintah.

Cara menggunakan:

1. Buka menu **Analisis Bantuan**.
2. Lihat ringkasan nilai bantuan, jumlah penerima, dan tren.
3. Baca catatan rekomendasi alokasi bantuan.
4. Gunakan sebagai bahan diskusi perencanaan dan prioritas intervensi.

---

### 5.15 Analisis Renstra

Halaman ini digunakan untuk evaluasi capaian indikator Renstra.

Fitur utama:

- Target dan realisasi indikator.
- Status tercapai/mendekati/di bawah target.
- Tingkat keselarasan capaian.
- Laporan siap cetak.

Cara mencetak laporan:

1. Buka menu **Analisis Renstra**.
2. Periksa ringkasan capaian.
3. Tekan tombol **Cetak Laporan**.
4. Pilih printer atau **Save as PDF**.

---

### 5.16 Info SISPERTANI

Halaman ini berisi informasi tentang tujuan, manfaat, roadmap, dan arah pengembangan sistem.

Gunakan halaman ini untuk:

- Mengenalkan aplikasi kepada pengguna baru.
- Menjelaskan fungsi analitik.
- Melihat roadmap pengembangan data dan fitur.

---

## 6. Sumber Data

Aplikasi menggunakan kombinasi data lokal dan data daring.

### 6.1 Data Lokal

Data lokal berada di folder:

```txt
public/14. Distankan KP/
public/data/
public/*.geojson
```

Contoh data lokal:

- CSV produksi padi.
- CSV ternak kecil, ternak besar, dan unggas.
- CSV perikanan.
- CSV perkebunan.
- CSV hortikultura.
- JSON fallback lahan.
- JSON fallback kelompok tani.
- GeoJSON batas desa dan kecamatan.

### 6.2 Data Daring

Beberapa fitur mengambil data dari Open Data Banjarnegara/CKAN melalui endpoint proxy:

```txt
/api/
/dataset/
```

Jika koneksi atau portal data bermasalah, sebagian halaman dapat menampilkan data fallback atau kosong sesuai ketersediaan data lokal.

---

## 7. Arti Warna dan Status Umum

Pada grafik/peta/kartu:

- **Hijau:** kondisi baik, tinggi, atau prioritas positif.
- **Kuning/amber:** perhatian sedang atau potensi berkembang.
- **Merah:** perhatian tinggi, risiko, atau perlu intervensi.
- **Abu-abu:** data tidak tersedia atau belum cocok dengan peta/data sumber.

---

## 8. Cara Membaca Data

1. Periksa tahun data sebelum membuat kesimpulan.
2. Bandingkan antar kecamatan untuk melihat wilayah sentra atau wilayah lemah.
3. Gunakan grafik untuk membaca tren dan pola umum.
4. Gunakan tabel/kartu ringkasan untuk melihat angka utama.
5. Gunakan rekomendasi sebagai bahan awal, bukan pengganti verifikasi lapangan.

---

## 9. Troubleshooting Pengguna

### 9.1 Halaman kosong atau grafik tidak muncul

Langkah pengecekan:

1. Refresh halaman.
2. Pastikan koneksi internet aktif.
3. Coba buka ulang dengan `Ctrl + Shift + R`.
4. Coba browser lain.
5. Laporkan ke admin jika tetap kosong.

### 9.2 Peta tidak tampil

Kemungkinan penyebab:

- File GeoJSON belum termuat.
- Koneksi internet lambat untuk basemap.
- Browser memblokir resource eksternal.

Solusi:

- Refresh halaman.
- Tunggu beberapa detik.
- Cek koneksi internet.

### 9.3 Sebagian wilayah peta abu-abu

Artinya data lahan per-desa belum tersedia atau nama wilayah belum cocok antara data tabular dan data peta.

### 9.4 Tombol cetak tidak menghasilkan PDF

Gunakan fitur cetak browser:

- Windows/Linux: `Ctrl + P`.
- Mac: `Cmd + P`.
- Pilih **Save as PDF**.

---

## 10. Panduan Admin/Pengelola Data

### 10.1 Lokasi File Penting

```txt
src/App.tsx                 # Daftar route aplikasi
src/config/site.ts          # Daftar menu sidebar
src/layouts/default.tsx     # Layout utama aplikasi
src/services/api.ts         # Fungsi pengambilan dan parsing data
src/pages/                  # Halaman aplikasi
public/14. Distankan KP/    # Dataset CSV/XLSX lokal
public/data/                # Data fallback JSON
public/*.geojson            # Data peta
```

### 10.2 Menambah Menu Baru

1. Buat file halaman baru di `src/pages/`.
2. Daftarkan route di `src/App.tsx`.
3. Tambahkan item menu di `src/config/site.ts`.
4. Jika perlu, tambahkan ikon di `src/layouts/default.tsx`.
5. Jalankan build untuk memastikan tidak ada error.

### 10.3 Mengganti Data CSV

1. Siapkan file CSV dengan header yang sesuai dengan fungsi parser di `src/services/api.ts`.
2. Letakkan file di folder publik yang sesuai.
3. Pastikan nama file dan path sama dengan yang dipanggil di `api.ts`.
4. Jalankan aplikasi lokal dan cek halaman terkait.
5. Build ulang sebelum deploy.

### 10.4 Mengganti Data Peta

1. Siapkan file GeoJSON baru.
2. Simpan di `public/`.
3. Pastikan properti nama desa/kecamatan sesuai dengan logika pencocokan di `src/components/MapWidget.tsx`.
4. Uji peta di halaman Dashboard.

---

## 11. Deploy Aplikasi

Metode deploy saat ini adalah aplikasi statis.

Langkah umum:

1. Jalankan build:

   ```bash
   npm run build
   ```

2. Hasil build tersedia di folder:

   ```txt
   dist/
   ```

3. Upload isi folder `dist/` ke document root server.
4. Pastikan file dan folder publik ikut tersedia di server.
5. Lakukan hard refresh pada browser.

Catatan server:

- SPA perlu konfigurasi fallback ke `index.html`.
- Proxy `/api/` dan `/dataset/` diperlukan untuk akses Open Data saat produksi.

---

## 12. Batasan dan Catatan

- Data analitik bergantung pada kualitas dan kelengkapan data sumber.
- Sebagian data menggunakan fallback lokal agar aplikasi tetap dapat dibuka.
- Beberapa angka adalah hasil agregasi/parsing otomatis dari CSV.
- Rekomendasi sistem harus divalidasi dengan pengetahuan lapangan dan kebijakan dinas.
- Untuk pengambilan keputusan resmi, gunakan aplikasi ini sebagai alat bantu analisis, bukan satu-satunya dasar keputusan.

---

## 13. Kontak/Penanggung Jawab

Isi bagian ini sesuai kebutuhan instansi:

```txt
Nama Admin      : ........................................
Unit/Bidang     : ........................................
Email/Telepon   : ........................................
Tanggal Update  : ........................................
```
