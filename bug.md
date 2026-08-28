# LAPORAN BUG & MASALAH — Dashboard Analitik Pertanian Banjarnegara

> **Tanggal:** 22 Juli 2026
> **Aplikasi:** SISPERTANI — Dashboard Analitik Pertanian dan Peternakan Kab. Banjarnegara
> **Analis:** Code Review

---

## 🔴 KRITIS (Bisa menyebabkan crash / data salah total)

### 1. `vite.config.ts` — Konfigurasi `resolve.tsconfigPaths` tidak valid

- **File:** `vite.config.ts` baris 8
- **Kode bermasalah:**
  ```ts
  resolve: {
    tsconfigPaths: true,
  },
  ```
- **Bug:** Properti `resolve.tsconfigPaths` adalah **INVALID** untuk Vite. Plugin `vite-tsconfig-paths` tidak terdaftar di `package.json` maupun di daftar plugin.
- **Dampak:** Path alias `@/` seperti `@/services/api`, `@/layouts/default`, `@/components/MapWidget` kemungkinan besar tidak berfungsi di build production. Build akan gagal dengan `MODULE_NOT_FOUND`.
- **Fix:** Install `vite-tsconfig-paths` dan daftarkan sebagai plugin di `vite.config.ts`:
  ```ts
  import tsconfigPaths from "vite-tsconfig-paths";
  export default defineConfig({
    plugins: [react(), tailwindcss(), tsconfigPaths()],
    // hapus resolve: { tsconfigPaths: true }
  });
  ```

---

### 2. `fetchLahanBanjarnegara` — Stale cache tidak pernah di-refresh (stale-while-revalidate rusak)

- **File:** `src/services/api.ts` baris 125-148
- **Kode bermasalah:**
  ```ts
  export const fetchLahanBanjarnegara = async (): Promise<LahanDesa[]> => {
    const cacheKey = "banjarnegara_lahan_cache_v2";
    const cached = getCachedData<LahanDesa[]>(cacheKey);
    // ... loadFallback ...
    if (cached) {
      return cached.data; // LANGSUNG RETURN tanpa cek stale
    }
  };
  ```
- **Bug:** Fungsi ini hanya membaca cache. Jika ada cached data, langsung return **tanpa pernah melakukan background refresh**. Berbeda dengan `fetchOpenDataPertanian` dan `fetchKelompokTani` yang punya mekanisme stale refresh (silent update).
- **Dampak:** Data lahan pertanian **TIDAK PERNAH di-refresh** sampai cache 24 jam expired. User melihat data basi tanpa notifikasi.
- **Fix:** Tambahkan pengecekan `cached.isStale` seperti fungsi lainnya:
  ```ts
  if (cached) {
    if (cached.isStale) {
      console.log("Cache lahan stale. Memicu silent update...");
      loadFallback().catch((err) => console.warn("Gagal update background:", err));
    }
    return cached.data;
  }
  ```

---

### 3. Path file lokal (`/14. Distankan KP/...`) tidak tersedia di production

- **File:** `src/services/api.ts` — Semua fungsi yang fetch dari `/14. Distankan KP/...`
- **Fungsi terdampak:**
  - `fetchPadiProduction` — baris 171
  - `fetchVegetableProduction` — baris 300
  - `fetchLumbungPangan` — baris 448
  - `fetchTernakKecil` — baris 625
  - `fetchTernakBesar` — baris 650
  - `fetchUnggas` — baris 675
  - `fetchPerikananBudidaya` — baris 739
  - `fetchPerikananTangkap` — baris 871
  - `fetchPerikananBenih` — baris 906
  - `fetchPlantationArea` — baris 967
  - `fetchPlantationProduction` — baris 1006
  - `fetchVegetableArea` — baris 1069
  - `fetchFruitProduction` — baris 1107
  - `fetchNilaiProduksiBudidaya` — baris 857
  - `fetchNilaiProduksiTangkap` — baris 864
- **Bug:** File-file CSV disimpan di `/public/14. Distankan KP/` yang hanya bisa diakses oleh browser saat di dev server. Saat di-deploy ke production (Vercel/Netlify), path seperti `/14.%20Distankan%20KP/Jumlah%20Ternak%20Kecil%20Menurut%20Kecamatan%20dan%20Jenis%20Ternak/...csv` akan menghasilkan **404 Not Found** karena:
  1. Folder tersembunyi (diawali angka) mungkin tidak ter-copy
  2. Spasi dalam path tidak di-handle dengan benar
  3. File-file ini besar dan tidak optimal untuk di-serve sebagai static assets
- **Dampak:** Semua halaman yang menggunakan data offline lokal akan **gagal load data di production**.
- **Fix:** Pindahkan file CSV ke folder yang lebih sederhana seperti `/public/data/csv/`, update path di semua fungsi API, dan pastikan path tidak mengandung spasi.

---

### 4. `MapWidget.tsx` — Penggunaan `ReactDOMServer.renderToString` untuk popup Leaflet

- **File:** `src/components/MapWidget.tsx` baris 376-378
- **Kode bermasalah:**
  ```tsx
  const htmlContent = ReactDOMServer.renderToString(
    <PopupContent desaName={desaName} kecName={kecName} data={desaData} taniData={desaTaniData} />
  );
  layer.bindPopup(htmlContent, { className: 'custom-popup-neobrutalism' });
  ```
- **Bug:** Menggunakan `ReactDOMServer.renderToString()` (SSR API) di browser untuk render konten popup. Ini:
  1. **Sangat berat secara performa** — renderToString tidak dioptimalkan untuk client-side
  2. Popup di-render ulang setiap kali komponen di-mount
  3. Event handler React TIDAK berfungsi di popup karena hanya HTML string
  4. Dapat menyebabkan **memory leak** pada map dengan banyak desa (~267 desa)
- **Dampak:** Map dengan banyak desa akan menyebabkan performance degradation signifikan. Semakin banyak desa yang di-hover/klik, semakin berat.
- **Fix:** Gunakan `L.popup().setContent()` dengan string HTML biasa, atau gunakan library `react-leaflet-popup` yang terintegrasi dengan React.

---

## 🟡 SEDANG (Potensi error atau data tidak akurat)

### 5. `LivestockPage` — Dependency array `useEffect` untuk `selectedYear` tidak konsisten

- **File:** `src/pages/livestock.tsx` baris 44-48
- **Kode bermasalah:**
  ```tsx
  useEffect(() => {
    if (yearsList.length > 0 && !yearsList.includes(selectedYear)) {
      setSelectedYear(yearsList[0]);
    }
  }, [category, yearsList]); // selectedYear tidak di dependency
  ```
- **Bug:** Saat user mengganti kategori, `selectedYear` di-reset ke tahun pertama. Dependency array tidak konsisten — menggunakan `selectedYear` di dalam kode tapi tidak di dependency array. Juga tidak menyertakan `selectedYear` sehingga perubahan tahun oleh user bisa tiba-tiba di-reset.
- **Dampak:** User memilih tahun 2022 lalu ganti kategori, tahun berubah ke tahun pertama secara tiba-tiba.
- **Fix:** Tambahkan `selectedYear` ke dependency array, dan jangan reset selectedYear jika sudah ada di yearsList:
  ```tsx
  useEffect(() => {
    if (yearsList.length > 0 && !yearsList.includes(selectedYear)) {
      setSelectedYear(yearsList[0]);
    }
  }, [category, yearsList, selectedYear]);
  ```

---

### 6. `fetchPadiProduction` — Parsing angka kompleks bisa menghasilkan `NaN`

- **File:** `src/services/api.ts` baris 193-203
- **Kode bermasalah:**
  ```ts
  const parseNum = (val: string) => {
    let cleaned = val.toString().trim().replace(/ /g, "");
    if (cleaned.includes(",") && !cleaned.includes(".")) {
      cleaned = cleaned.replace(/,/g, ""); // format ribuan Inggris "12,971"
    } else {
      // Format Indonesia "12.971,5" -> hapus titik, ubah koma ke titik
      cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    }
    return parseFloat(cleaned) || 0;
  };
  ```
- **Bug:** Logika parsing ini bisa gagal untuk format angka seperti:
  - `12,971.5` (format Inggris: koma ribuan + titik desimal) — akan masuk ke `if` dan jadi `12971.5` (OK)
  - `12.971,50` (format Indonesia) — akan masuk ke `else` dan jadi `12971.50` (OK)
  - Tapi untuk nilai seperti `-` (strip) atau `...` atau format tak terduga, hasilnya `NaN` yang dikonversi ke `0`
  - Juga `(0)` atau nilai dengan tanda kurung untuk negatif tidak tertangani
- **Dampak:** Beberapa nilai produksi padi bisa menjadi `0` tanpa disadari, merusak agregasi data.
- **Fix:** Tambahkan validasi tambahan dan handle edge cases:
  ```ts
  const cleaned = val.toString().trim().replace(/ /g, "");
  if (!cleaned || cleaned === "-" || cleaned === "...") return 0;
  // Handle parenthesized negatives: (1234) -> -1234
  const negative = cleaned.startsWith("(") && cleaned.endsWith(")");
  let numeric = cleaned.replace(/^\(/, "").replace(/\)$/, "");
  // ... parsing logic ...
  ```

---

### 7. `fetchKelompokTani` — Query pencarian CKAN mungkin gagal

- **File:** `src/services/api.ts` baris 1186
- **Kode bermasalah:**
  ```ts
  const searchResponse = await fetchWithTimeout(
    `/api/3/action/package_search?q=title:"Banyaknya kelompok tani" OR title:"Kelompok Tani"&rows=50`
  );
  ```
- **Bug:** Search query menggunakan `title:"Banyaknya kelompok tani" OR title:"Kelompok Tani"`. Jika judul dataset di CKAN berbeda (misal: "Data Kelompok Tani Per Kecamatan" atau "Banyaknya Kelompok Tani Menurut Desa"), query ini tidak akan menemukan dataset apapun.
- **Dampak:** Jika CKAN tidak mengembalikan hasil, `csvUrls` akan kosong, fungsi fallback ke `/data/kelompok-tani-fallback.json` yang mungkin juga tidak tersedia. Halaman Kelembagaan Tani akan kosong.
- **Fix:** Gunakan query yang lebih umum atau multiple search strategies:
  ```ts
  const queries = [
    `q=title:"Banyaknya kelompok tani"&rows=50`,
    `q=kelompok+tani&rows=50&sort=metadata_modified+desc`,
  ];
  // Loop through queries until results found
  ```

---

### 8. `PlantationArea` type — Kolom `kopiArabica` tidak konsisten dengan `PlantationProduction`

- **File:** `src/services/api.ts`
- **Kode:**
  ```ts
  // PlantationArea (baris 950)
  export interface PlantationArea {
    // ...
    kopiArabica: number;  // ADA
  }

  // PlantationProduction (baris 952-962)
  export interface PlantationProduction {
    // ...
    // kopiArabica TIDAK ADA
  }
  ```
- **Bug:** Interface `PlantationProduction` tidak memiliki field `kopiArabica` sementara `PlantationArea` memilikinya. Jika file CSV produksi perkebunan memiliki kolom Kopi Arabica, data tersebut akan diabaikan secara diam-diam.
- **Dampak:** Data produksi Kopi Arabica tidak akan pernah tampil di grafik/statistik produksi perkebunan.
- **Fix:** Tambahkan `kopiArabica` ke `PlantationProduction`:
  ```ts
  export interface PlantationProduction {
    // ...
    kopiArabica: number;
    tahun: string;
  }
  ```

---

## 🔵 RINGAN (Masalah UX / maintainability / konsistensi)

### 9. Inkosistensi kapitalisasi kolom header CSV

- **File:** Semua fungsi fetch API yang menggunakan `transformHeader: normalizeHeader`
- **Kode:**
  ```ts
  const normalizeHeader = (h: string) => h.trim().replace(/\s+/g, " ");
  ```
- **Bug:** Transformasi hanya menghapus spasi berlebih, **TIDAK menormalisasi kapitalisasi**. Kolom `Tahun` vs `tahun` vs `TAHUN` bisa berbeda antar file CSV.
- **Dampak:** Beberapa data mungkin tidak terbaca karena nama kolom tidak cocok dengan yang diharapkan kode (misal: `row["Tahun"]` vs `row["tahun"]`).
- **Fix:** Normalisasi kapitalisasi juga:
  ```ts
  const normalizeHeader = (h: string) => h.trim().replace(/\s+/g, " ").toLowerCase();
  // lalu gunakan lookup case-insensitive di kode
  const getValue = (row: any, ...keys: string[]) => {
    const lcRow = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));
    return keys.find(k => lcRow[k.toLowerCase()] !== undefined) || "";
  };
  ```

---

### 10. `WarningTable.tsx` — Threshold analisis lahan kritis terlalu rendah

- **File:** `src/components/WarningTable.tsx` baris 15-20
- **Kode bermasalah:**
  ```ts
  if (row.jumlah < 50) {
    status = "Bahaya";
    isu = "Total lahan pertanian sangat minim";
  } else if (row.jumlah < 150) {
    status = "Waspada";
    isu = "Potensi penyempitan lahan";
  }
  ```
- **Bug:** Ambang batas total lahan < 50 Ha dianggap "Bahaya" dan < 150 Ha "Waspada". Untuk desa dengan luas wilayah yang secara geografis kecil (misal: Desa Petarangan yang berbukit), total lahan pertanian < 50 Ha adalah hal yang wajar dan bukan indikasi kritis.
- **Dampak:** Banyak desa mungkin salah terlabel "Bahaya" atau "Waspada" secara tidak akurat, menurunkan kredibilitas dashboard.
- **Fix:** Gunakan persentase terhadap luas desa jika data luas wilayah tersedia, atau sesuaikan threshold berdasarkan analisis statistik (misal: percentile 10 terbawah).

---

### 11. `LandAreaChart.tsx` — Label desa terpotong dan tidak unik

- **File:** `src/components/LandAreaChart.tsx` baris 24
- **Kode bermasalah:**
  ```ts
  desa: item.desa.split(" ")[0].substring(0, 12).toUpperCase(),
  ```
- **Bug:** Nama desa dipotong secara kasar:
  1. `split(" ")[0]` mengambil kata pertama saja — "Desa Karanganyar" menjadi "DESA"
  2. Banyak desa bisa memiliki label yang sama ("DESA" untuk semua yang diawali "Desa")
  3. Tidak ada tooltip yang menampilkan nama lengkap
- **Dampak:** Label sumbu X di chart tidak informatif dan menyesatkan.
- **Fix:** Gunakan singkatan yang lebih baik:
  ```ts
  desa: item.desa.replace(/^desa\s+/i, "").substring(0, 12).toUpperCase(),
  ```

---

### 12. Tidak ada loading state untuk data GeoJSON di MapWidget

- **File:** `src/components/MapWidget.tsx` baris 133-136
- **Kode bermasalah:**
  ```tsx
  useEffect(() => {
    fetch("/peta_desa_v3.geojson").then((res) => res.json()).then(setDesaGeoData).catch(console.error);
    fetch("/peta_kecamatan.geojson").then((res) => res.json()).then(setKecGeoData).catch(console.error);
    fetchKelompokTani().then(setTaniData).catch((err) => console.error("Gagal memuat data kelompok tani:", err));
  }, []);
  ```
- **Bug:** Tidak ada state `loading` atau indikator visual untuk proses fetching GeoJSON. Jika file GeoJSON besar atau koneksi lambat, map akan tampak kosong tanpa feedback ke user.
- **Dampak:** User melihat peta kosong dan tidak tahu apakah data sedang dimuat atau terjadi error.
- **Fix:** Tambahkan loading spinner yang muncul sebelum GeoJSON selesai dimuat.

---

### 13. `fetchOpenDataPertanian` — Tidak ada indikasi stale cache untuk user

- **File:** `src/services/api.ts` baris 87-93
- **Kode bermasalah:**
  ```ts
  if (cached) {
    if (cached.isStale) {
      console.log("Cache open data pertanian stale. Memicu silent update...");
      fetchFresh().catch((err) => console.warn("Gagal update background:", err));
    }
    return cached.data; // Langsung return tanpa info stale
  }
  ```
- **Bug:** Data stale dikembalikan ke user tanpa indikasi apapun di UI. User tidak sadar bahwa data yang dilihat sudah tidak terbarui.
- **Dampak:** User mungkin mengambil keputusan berdasarkan data yang sudah basi.
- **Fix:** Return juga `isStale` ke komponen, atau tampilkan banner kecil "Data mungkin tidak terbarui" di halaman utama.

---

### 14. `package.json` — Potensi inkompatibilitas HeroUI dengan Tailwind v4

- **File:** `package.json` & `postcss.config.js`
- **Bug:**
  - `@heroui/react` v3.2.1 menggunakan konfigurasi Tailwind plugin-based (traditional)
  - `@tailwindcss/vite` v4.3.1 menggunakan pendekatan CSS-first (baru)
  - HeroUI membutuhkan `@heroui/theme` dan konfigurasi `tailwind.config.js` yang mungkin tidak kompatibel dengan Tailwind v4
  - `postcss.config.js` ada tapi mungkin tidak diperlukan untuk Tailwind v4
- **Dampak:** Komponen UI dari HeroUI (seperti `Card` di `ProductionChart.tsx`) mungkin tidak ter-style dengan benar.
- **Fix:** Verifikasi kompatibilitas atau hapus dependensi HeroUI jika tidak digunakan secara luas (hanya `ProductionChart.tsx` yang menggunakannya).

---

### 15. Gambar hero di halaman detail tidak ditemukan

- **Bug:** Beberapa halaman menggunakan gambar hero dengan path yang hanya ada di development:
  - `/img/prediction.png` — `src/pages/prediction.tsx` baris 60
  - `/img/horticulture.png` — `src/pages/horticulture.tsx` baris 488
  - `/img/farmers.png` — `src/pages/farmers.tsx` baris 221
  - `/img/livestock.png` — `src/pages/livestock.tsx` baris 354
  - `/img/fisheries.png` — `src/pages/fisheries.tsx` baris 368
  - `/img/economic-value.png` — `src/pages/economic-value.tsx` baris 188
- **Bukti:** Dari file listing direktori, hanya `dashboard.png` dan `logo.png` yang terlihat di `/public/`. Folder `/public/img/` **tidak tercantum** di direktori.
- **Dampak:** Semua gambar hero di halaman detail akan **404 broken image** saat diakses.
- **Fix:** Hapus tag `<img>` yang tidak diperlukan, atau buat/unduh aset gambar yang sesuai, atau gunakan placeholder SVG/icon.

---

### 16. Navigasi sidebar tidak memiliki route untuk beberapa halaman yang terdaftar di App.tsx

- **File:** `src/config/site.ts` (tidak sempat dibaca) vs `src/App.tsx`
- **Bug:** Dari `App.tsx`, ada route untuk:
  - `/prediction` ✅ ada di sidebar
  - `/suitability` ❓ perlu cek site.ts
  - `/price-volatility` ❓
  - `/food-security` ❓
  - `/supply-chain` ❓
  - `/livestock` ❓
  - `/fisheries` ❓
  - `/economic-value` ❓
  - `/plantation` ❓
  - `/horticulture` ❓
  - `/farmers` ❓
  - `/recommendations` ❓
  - `/government-assistance` ❓
  - `/renstra` ❓
  - `/info` ❓
- **Dampak:** Jika ada route di App.tsx tapi tidak ada di `siteConfig.navItems`, halaman tersebut tidak bisa diakses via navigasi sidebar (hanya via URL langsung).

---

## RINGKASAN PRIORITAS REKOMENDASI

| Prioritas | # | Issue | Dampak |
|-----------|---|-------|--------|
| 🔴 **P1** | 1 | `tsconfigPaths` tidak valid | **Build gagal total** |
| 🔴 **P1** | 2 | Stale cache lahan tidak di-refresh | Data basi permanen |
| 🔴 **P1** | 3 | File CSV 404 di production | **Data tidak termuat** di production |
| 🔴 **P2** | 4 | `renderToString` popup | Performance buruk di map |
| 🟡 **P3** | 5 | Dependency array useEffect | UX membingungkan |
| 🟡 **P3** | 6 | Parsing angka NaN | Data produksi tidak akurat |
| 🟡 **P3** | 7 | Query CKAN mungkin gagal | Data kosong |
| 🟡 **P3** | 8 | kopiArabica tidak ada di Production type | Data hilang |
| 🔵 **P4** | 9-16 | UX & maintainability | Kualitas kode & UX |

### Tindakan yang Direkomendasikan:

1. **Segera:** Fix #1, #2, #3 agar aplikasi bisa di-build dan berjalan di production
2. **Segera:** Fix #15 (gambar broken) agar UX tidak terganggu
3. **Mendesak:** Fix #4 untuk performa map
4. **Sedang:** Fix #5-8 untuk akurasi data
5. **Perbaiki:** Fix #9-16 setelah masalah kritis tertangani