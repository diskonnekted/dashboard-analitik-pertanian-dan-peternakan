# Audit Frontend SISPERTANI — 22 September 2026

Audit menyeluruh frontend `I:\pertanian\pertanian-2` (AUDIT SAJA — tidak ada kode yang diubah).
Metode: pembacaan langsung seluruh file `src/` (Read + PowerShell Select-String sebagai ground truth, karena Grep tool dikenal false-negative), `npx tsc --noEmit` lolos **0 error**.

---

## 1. Ringkasan

- **Stack**: React 19 + Vite 8.0.16 + TypeScript 5.6.3 + Recharts 3.9 + MapLibre GL 6.10 (peta desa) + Leaflet 1.9 (peta dashboard) + Tailwind CSS 4 + HeroUI 3.2.1 + react-router-dom 6.23.
- **23 route aktif** + 1 placeholder (`/coming-soon` untuk 20 menu nav yang di-disabled), 1 halaman admin.
- **Arsitektur data 3 lapis** (Fase B): `apiFirst` → backend MySQL Express (`/sispertani-api`, proxy dev → 127.0.0.1:4100, health-check 1×/sesi) → fallback jalur lama (CKAN opendata.banjarnegarakab.go.id / CSV lokal `public/` / snapshot) → `withCache` stale-while-revalidate di localStorage.
- **34 fetcher** di `src/services/api.ts` (2.507 baris): 32 bertipe `apiFirst` (endpoint `/v1/statistik/*`), sisanya jalur CKAN/CSV murni; + `services/bantuan.ts` (endpoint `/v1/bantuan`) dan `services/desa.ts` (detail desa, CSV+geojson lokal).
- **Kualitas**: pola baku proyek (tooltip nama seri, tfoot dinamis sinkron agregat chart, EmptyBlock, rata-rata tertimbang, banner fallback) sudah diterapkan di halaman-halaman yang sudah melalui siklus perbaikan. `tsc` bersih.
- **Temuan utama** (detail di §4): dua stack peta paralel (Leaflet vs MapLibre), konten koridor `/supply-chain` masih hardcoded, hint kredensial admin tampil di UI publik, cache `api_*` tanpa versi (data import admin baru terlihat setelah window stale), ChatBot hanya muncul di `/recommendations`.

---

## 2. Daftar Halaman & Fitur

Nav (`src/config/site.ts`): **21 menu aktif** + **20 menu disabled "Dalam Pengembangan"** (→ `/coming-soon`; roadmap di `public/pengembangan.md`). Footer versi **v2.2.0 · 22 Sept 2026**.

| Route | File (baris) | Judul | Fitur utama |
|---|---|---|---|
| `/` | `index.tsx` (121) | Dashboard | `StatWidget`×4 (dataset CKAN, luas sawah, bukan sawah, jumlah desa), `MapWidget` (Leaflet: raster OSM + boundary kabupaten + polygon desa), `LandAreaChart` (bar custom, non-recharts), `WarningTable`. Fetch: `fetchDatasetsCkan`, `fetchLahanBanjarnegara` (cache `lahan-banjarnegara-v3`), `fetchDesaPolygons` (`desa-polygons-v2`) |
| `/food-crops` | `food-crops.tsx` (600) | Produksi Tanaman Pangan | Bar+Line; kelompok Padi Sawah & Ladang (`padi-sawah-ladang-v5`) + 3 palawija via `apiFirst` (`/v1/statistik/palawija-jagung-ubi-kayu`, `-kacang-kedelai`, `-ubi-kacang-hijau`; fallback CSV v2); filter tahun, tfoot dinamis, rata-rata tertimbang (Ku/Ha), bar rata tidak di-stack |
| `/horticulture` | `horticulture.tsx` (700) | Data Hortikultura | Bar+Line; `fetchHorticultureData` (`horticulture-v3`, snapshot CKAN 2025 + badge "Agregat kabupaten · tidak mengikuti filter"), `fetchHorticultureAnnualData` (`horticulture-annual-v3`, CSV tipe F 20 kec × 8 th × 8 tanaman), `fetchVegetableProduction` (`apiFirst /v1/statistik/hortikultura-produksi`, fallback `veget-production-v2`); filter kecamatan+tahun, tfoot sinkron |
| `/plantation` | `plantation.tsx` (542) | Perkebunan | Bar+Line; `fetchPlantationData` (`plantation-v2`, CKAN — belum `apiFirst`); agregasi tertimbang Σprod/Σluas (T/Ha), trendData 2-pass, tfoot 8/8 sinkron resmi BPS, % komposisi basis tonase, filter tahun |
| `/livestock` | `livestock.tsx` (638) | Peternakan | Bar+Line; `fetchLivestockData` (`livestock-v2`, CKAN — belum `apiFirst`); stackId untuk populasi, filter tahun, tfoot dinamis |
| `/livestock-flow` | `livestock-flow.tsx` (521) | Pergerakan Ternak | Bar+Line; 4 kelompok (pemasukan, pengeluaran, luar RPH, daging unggas) semuanya `apiFirst /v1/statistik/*` + fallback CSV v2; footer label satuan dinamis |
| `/fisheries` | `fisheries.tsx` (493) | Perikanan | Bar+Line; `fetchFisheriesProduction` (`fisheries-v2`), `fetchFisheriesByAlat` (`by-alat-v2`), `fetchFisheriesPemeliharaan` (`pemeliharaan-v2`) — jalur CSV/CKAN, belum `apiFirst`; tooltip nama seri, topVal 0, reset kecamatan |
| `/economic-value` | `economic-value.tsx` (395) | Analisis Nilai Produksi Perikanan | Bar+Pie; `fetchNilaiTangkap` + `fetchNilaiBudidaya` (`apiFirst /v1/statistik/nilai-tangkap` / `nilai-budidaya`, fallback v3); catatan halaman soal 4 sel koreksi 2022 |
| `/food-security` | `food-security.tsx` (424) | Ketahanan Pangan | BarChart (FSI per kecamatan); `fetchFoodSecurityIndex` (`fsi-v2`), `fetchLumbungPangan` (`lumbung-pangan-v3`, CSV lokal-first 2024) |
| `/farmers` | `farmers.tsx` (794) | Kelompok Tani, Gapoktan & KTH | Bar+Line; `fetchFarmersData` (`farmers-data-v6`), `fetchKthSimluh` (`kth-simluh-v1`), strip konteks ST2023 via `apiFirst /v1/statistik/st2023-desa`; tahun parsial 2022 dikecualikan dari tren |
| `/sensus` | `sensus.tsx` (582) | Sensus Pertanian 2023 (UUPKS) | BarChart demografi; `fetchSensusDemografi` (`sensus-demografi-v2`), `fetchKecamatanDemografi` (`kecamatan-demografi-v2`); fallback `st2023-desa-fallback.json` |
| `/prediction` | `prediction.tsx` (563) | Analisis & Proyeksi Produksi Padi | LineChart tren (CSV Sawah+Ladang asli `_tmp`, `padi-sawah-ladang-v5`) + `fetchPadiHistory` (`padi-history-v2`) + palawija `apiFirst`; filter tahun; proyeksi tahun berikutnya dihitung, bukan hardcode |
| `/price-volatility` | `price-volatility.tsx` (419) | Volatilitas Harga & Inflasi | LineChart; `fetchMarketData` (`pasar-rakyat-v1`) + `fetchInflationData` (`apiFirst /v1/statistik/inflasi`, fallback `inflasi-v3`); tfoot |
| `/supply-chain` | `supply-chain.tsx` (422) | Rantai Pasok | BarChart jumlah pasar per kecamatan (`fetchMarketData`, CKAN Disperindag — snapshot byte-identik, terverifikasi 25 unit 2025); **koridor rantai pasok + narasi risiko masih HARDCODED di komponen**; geojson `pasar-banjarnegara` (36 titik) belum dimanfaatkan |
| `/government-assistance` | `government-assistance.tsx` (296) | Bantuan Pemerintah | Bar+Line; `fetchBantuanPemerintah` dari `services/bantuan.ts` (endpoint backend `${API_BASE}/v1/bantuan`, cache module-level + `clearBantuanCache`); data mulai kosong, diisi via dasbor admin |
| `/recommendations` | `recommendations.tsx` (486) | Rekomendasi | Kartu metrik + tabel tren dinamis (tanpa recharts); menggabungkan ±9 fetcher (padi, ternak, perikanan, pasar, FSI, demografi); **ChatBot "Si Pertani" hanya di-mount di halaman ini** (floating) |
| `/renstra` | `renstra.tsx` (378) | Evaluasi Target Renstra | 4 target vs realisasi dari dataset terverifikasi (progress custom, non-recharts); tombol "Lihat Dokumen Sumber" → `/renstra.pdf`; baris sumber di catatan evaluasi |
| `/desa/:kec/:nama` | `desa/[kec]-[nama].tsx` (625) | Detail Desa (dinamis) | `DesaHero` (statistik ringkas + accent strip), **`DesaMapMini` (MapLibre + OpenFreeMap)**, `DesaLahan` (mini progress bar CSS), `DesaDemografi`, `DesaTernak`, `DesaKelembagaan`, daftar desa tetangga; `fetchDesaDetail` dari `services/desa.ts` (CSV + geojson lokal, `invalidateDesaIndexCache`); banner agregat-down saat fallback |
| `/admin` | `admin.tsx` (1023) | Panel Admin | Dasbor "Excel" 15 domain: template/export/import XLSX → backend 4100 (`POST /v1/admin/login` → Bearer token, `sessionStorage`); `clearBantuanCache` untuk refresh data bantuan |
| `/manual` | `manual.tsx` (363) | Panduan Penggunaan | Statis (belum diaudit isi per fitur) |
| `/info` | `info.tsx` (205) | Sistem Informasi Pertanian (SISPERTANI) | Statis |
| `/coming-soon` | `coming-soon.tsx` (30) | Dalam Pengembangan | Placeholder menu disabled |

**Peta status modul** (terhadap daftar lingkup tugas): dashboard ✅ · food-crops ✅ (diperbaiki 20 Sep) · horticulture ✅ (dropdown tahun fixed 21 Sep) · plantation ✅ · livestock ✅ · livestock-flow ✅ · fisheries ✅ (UI ikut pola baku) · economic-value ✅ (deploy live terverifikasi) · food-security ✅ · farmers ✅ (deploy live) · recommendations ✅ (dinamis 21 Sep) · supply-chain ⚠️ (data pasar benar, koridor hardcoded) · renstra ✅ · prediction ✅ · detail desa ✅ (MapLibre) · chatbot ✅ (9inference kimi-k3, rilis v2.1.0) · government-assistance ✅ (baru, backend-driven) · admin ✅ (dasbor Fase B).

---

## 3. Infrastruktur Bersama

### 3.1 `src/services/api.ts` (2.507 baris) — lapisan data
- **`API_BASE`** = `import.meta.env.VITE_API_BASE || "/sispertani-api"`; `vite.config.ts` proxy `/sispertani-api` → `http://127.0.0.1:4100` (dev) dan `/api`+`/dataset` → `https://opendata.banjarnegarakab.go.id` (CKAN).
- **`apiFirst(path, fallbackFn)`**: health-check `${API_BASE}/health` **sekali per sesi browser** (promise singleton, 4 dtk timeout) → bila OK, `GET ${API_BASE}/v1/statistik/...`; bila gagal/down → fallback jalur lama. **32 endpoint** statistik lewat pola ini (palawija ×3, ternak-flow ×4, nilai perikanan ×2, inflasi, hortikultura-produksi, st2023-desa, padi-sawah-prod, padi-ladang-prod, dll).
- **`withCache(key, fetchFn)`** = stale-while-revalidate: return cache localStorage segera; bila umur > `CACHE_STALE_AGE` (15 mnt) refresh di background (non-blocking); tanpa cache → await fetch. Cache **tidak pernah dibuang karena umur** (stale-if-error, darurat saat server down). Komentar header menjelaskan skema 3 lapis ini.
- **Versi cache aktif** (bump wajib tiap perubahan sumber data): `lahan-banjarnegara-v3`, `lahan-kesesuaian-v4`, `desa-polygons-v2`, `horticulture-v3`, `horticulture-annual-v3`, `plantation-v2`, `padi-sawah-ladang-v5`, `padi-history-v2`, `padi-sawah-prod-v1`, `padi-ladang-prod-v1`, `sensus-demografi-v2`, `kecamatan-demografi-v2`, `farmers-data-v6`, `kth-simluh-v1`, `livestock-v2`, `fsi-v2`, `lumbung-pangan-v3`, `fisheries-v2`, `fisheries-by-alat-v2`, `fisheries-pemeliharaan-v2`, `pasar-rakyat-v1`, `inflasi-v3`, `vegetable-production-v2`, `renstra-v1`, `ternak-pemasukan/pengeluaran/luar-rph-v2`, `daging-unggas-v2`, `palawija-jagung-ubi-kayu/kacang-kedelai/ubi-kacang-hijau-v2`. Cache key `apiFirst` = **`api_<path>` dinamis (TANPA nomor versi)**.
- Helper domain: `cleanFloat`/`cleanInt` (validasi angka BPS), `normalisasiNamaKecamatan` + `variants` (prefix "Kec.", varian ejaan: Purwonegoro→Purwanegara, Purworejo Klampok→Purwareja Klampok, dll — dipakai `filterByDesa`).
- `clearLocalStorageByPattern(pattern)` tersedia (dipakai halaman admin untuk bantuan).

### 3.2 Peta
- **`DesaMapMini.tsx`** (`components/desa/`, ~250 baris): MapLibre GL JS 6 + **OpenFreeMap style liberty** (tiles.openfreemap.org, PMTiles via custom protocol `pmtiles://` didaftarkan sekali — singleton flag); polygon desa `fill` + `line` dari `public/geojson/desa-banjarnegara.geojson` (prefix "Kec." dicocokkan lewat normalisasi); popup HTML saat klik desa; cleanup `map.remove()`; label desa. Sesuai aturan proyek (tidak kembali ke Leaflet) — **hanya untuk halaman detail desa**.
- **`MapWidget.tsx`** (dashboard): **MASIH Leaflet/react-leaflet** (raster tiles OSM + marker default) — lihat Temuan #1.

### 3.3 Komponen bersama lainnya
- **`EmptyBlock`** (`components/desa/EmptyBlock.tsx`): empty state baku (ikon + judul + deskripsi + catatan teknis) — dipakai semua panel desa & halaman yang sudah dipoles.
- **Breadcrumb**: di halaman detail desa (Beranda / Kecamatan / Desa) — bersih tanpa jejak query.
- **`ui.tsx`**: UI kit — `PageHeader` (eyebrow+judul+subjudul), `SectionCard`, `Select` (dropdown filter), `Table`/`Th`/`Td`, `TableSkeleton`, `StatTile`, `Badge`.
- **`StatWidget`** (dashboard): kartu statistik + delta; **`LandAreaChart`**: bar CSS murni (tanpa recharts); **`WarningTable`**: tabel peringatan data.
- **`ChatBot.tsx`** (415 baris): "Si Pertani" — API 9inference kimi-k3 via env `VITE_CHATBOT_*`; system prompt expert B. Indonesia; `renderMarkdown` sendiri (tabel, list, bold); riwayat `localStorage`; hanya di-mount di `/recommendations`.
- **`ErrorBoundary`** (`components/ErrorBoundary.tsx`): global, membatasi `src/App` di `main.tsx`.
- **`layouts/default.tsx`**: nav + footer; nav aktif/disabled dari `src/config/site.ts`.
- **`services/bantuan.ts`**: `${API_BASE}/v1/bantuan` + cache module-level + `clearBantuanCache` (dipanggil halaman admin setelah import).
- **`services/desa.ts`**: `fetchDesaDetail` (CSV `public/data/` + geojson, tanpa CKAN), `invalidateDesaIndexCache`.

---

## 4. Temuan & Catatan

### Bug / risiko (urut prioritas)
1. **Dua stack peta paralel** — `MapWidget` (dashboard `/`) masih **Leaflet + raster OSM**, sementara `DesaMapMini` sudah **MapLibre + OpenFreeMap**. Konsekuensi: dua pustaka peta di bundle (bundle ganda), dua gaya visual peta, dan duplikasi pemeliharaan. Migrasi `MapWidget` ke MapLibre (atau komponen peta bersama) belum ada — kandidat PR berikutnya. Catatan: aturan proyek "jangan kembali ke Leaflet" selama ini dipenuhi untuk peta desa, tapi dashboard belum digarap.
2. **`/supply-chain`: konten koridor hardcoded** — narasi koridor ("Pasar Desa Selatan", "Koridor selatan", risiko kabut/longsor, dsb.) ditulis langsung di komponen, bukan dari dataset; melanggar semangat disiplin "jangan hardcode data di komponen". Geojson `public/geojson/pasar-banjarnegara` (36 titik) tersedia tapi belum dirender di halaman mana pun.
3. **Hint kredensial admin di UI publik** — `admin.tsx` menampilkan "Masuk sebagai Admin / admin / sispertani2026" di halaman login. Auth-nya sendiri sudah benar (token Bearer dari `POST /v1/admin/login`, kredensial asli di `backend/.env`), tapi jika password `.env` memang `sispertani2026` maka kredensial produksi bocor lewat teks UI. Perlu verifikasi & menghapus hint.
4. **Cache `api_*` tanpa versi + tanpa tombol invalidate** — cache key `apiFirst` = `api_<path>` (tanpa `-vN`). Dengan pola SWR (stale 15 mnt + refresh background), data MySQL yang baru di-import via dasbor admin baru terlihat ke pengunjung lain setelah window stale + satu re-render. Hanya data bantuan yang punya `clearBantuanCache` (dipanggil di admin). Domain statistik lain tidak punya mekanisme invalidate. Saat menambah endpoint/merubah bentuk data MySQL, cache lama bentuk-lama bisa terlanjur menempel (dulu diatasi dengan bump `-vN`; pola `api_*` tidak bisa dibump tanpa mengubah path).
5. **Health-check backend 1×/sesi** — `apiAvailable()` memoize hasil health-check per sesi browser. Bila backend down saat halaman pertama dimuat, seluruh sesi berjalan di fallback CKAN/CSV walaupun backend sudah pulih — butuh reload halaman untuk coba lagi. Trade-off yang disengaja (menghindari timeout per-fetch), tapi patut dicatat sebagai perilaku.
6. **ChatBot "Si Pertani" hanya di `/recommendations`** — tidak ada di halaman lain maupun layout global, dan tidak ada item nav khusus; user harus ke halaman Rekomendasi untuk menemukan asisten. Pertimbangkan mount global (floating) bila ingin lebih mudah diakses.
7. **Pertumbuhan localStorage tanpa evict** — 25+ key cache JSON (termasuk polygon desa & snapshot besar) disimpan tanpa LRU/kuota; bila penuh hanya `console.warn` dan cache gagal ditulis (fitur tetap jalan via network, jadi dampak rendah, tapi stale-if-error melemah untuk key tersebut).
8. **`@types/leaflet` di `dependencies`** (bukan devDependencies) — minor hygiene; ikut ter-install sebagai dep produksi di `npm install --production` (tidak memengaruhi bundle karena types).

### Hal modul yang SUDAH benar (diverifikasi scan ini)
- Tooltip chart menampilkan **nama seri** (pola `name="..."` pada Bar/Line) di semua halaman recharts yang discan.
- `tfoot` dinamis sinkron agregat chart: food-crops, plantation, livestock, horticulture, price-volatility, livestock-flow (label satuan dinamis).
- Rata-rata **tertimbang** (Σnilai/Σluas) di food-crops, plantation, economic-value.
- Banner/badge fallback: halaman desa (agregat-down), horticulture (badge agregat CKAN), suitability (peringatan fallback tahun).
- `EmptyBlock` dipakai di panel desa & halaman yang sudah dipoles (tidak ada empty state teks polos yang terdeteksi).
- `tsc --noEmit` **0 error** (dijalankan ulang saat audit ini).

### Dependensi utama (`package.json` v1.0.0)
| Paket | Versi | Keterangan |
|---|---|---|
| react / react-dom | ^19.0.0 | UI core |
| react-router-dom | 6.23.0 | routing (bukan react-router 7) |
| recharts | ^3.9.0 | semua chart |
| maplibre-gl | ^6.10.0 | peta detail desa (OpenFreeMap) |
| pmtiles | ^4.5.0 | protocol PMTiles untuk OpenFreeMap |
| leaflet / react-leaflet | ^1.9.4 / ^5.0.0 | peta dashboard (MapWidget) — lihat Temuan #1 |
| @turf/area, @turf/centroid, @turf/helpers | ^7.4.0 | hitung luas/centroid polygon |
| papaparse | ^5.5.4 | parser CSV |
| @heroui/react + @heroui/styles | 3.2.1 | komponen UI |
| lucide-react | ^1.21.0 | ikon |
| clsx | 2.1.1 | util classname |
| vite / @vitejs/plugin-react | 8.0.16 / 6.0.2 | build |
| typescript | 5.6.3 | typecheck (lolos) |
| tailwindcss + @tailwindcss/vite + @tailwindcss/postcss | 4.3.1 | styling |
| eslint 9 stack + prettier 3.5.3 | — | lint/format |
| pdf-parse ^2.4.5, playwright-core ^1.63.0 | — | devDep (tooling ekstraksi PDF / testing) |

### Catatan akhir
- Audit ini **read-only** — tidak ada satu baris kode pun yang diubah.
- Beberapa halaman (`/manual`, `/info`) statis dan belum diaudit isinya per fitur; tidak ada indikasi masalah.
- Data vertikal BPS (populasi ternak, perikanan, perkebunan, sensus, lahan) masih lewat jalur CKAN/CSV (belum `apiFirst`) — bukan bug, tapi peta migrasi Fase B berikutnya bila ingin semua domain dari MySQL.
