# perbaikan.md — Metode Perbaikan Halaman Data (Referensi)

> Dokumen hasil sesi perbaikan halaman **/food-crops** (20 Sep 2026).
> Metode di bawah dimaksudkan untuk direplikasi saat memperbaiki halaman data lain
> (hortikultura, peternakan, perikanan, perkebunan, dsb.) yang memakai sumber CSV
> dari `public/14. Distankan KP/`.

---

## 1. Alur kerja perbaikan (urutan wajib)

```
1. Peta sumber data      → baca PETA_DATABASE.md sebagai INDEX, jangan sebagai kebenaran
2. Verifikasi file asli  → bandingkan dengan xlsx asli di public/14. Distankan KP/<folder>/_tmp/
3. Audit parser          → pastikan mapping kolom/posisi & normalisasi nama kecamatan benar
4. Audit agregasi        → METRIK INTENSITAS (Ku/Ha, %, kg/ekor) TIDAK BOLEH DIJUMLAH
5. Audit presentasi      → tooltip, stack bar, footer tabel, label kartu, unit
6. Verifikasi            → tsc → build → sanity check angka vs baris "Jumlah" BPS → dev server
7. Dokumentasi           → koreksi PETA_DATABASE.md bila pemetaan sumber salah
```

**Prinsip inti:** PETA_DATABASE.md pernah salah memetakan file ↔ komoditas
(mis. `511c` dicatat "Ubi Jalar, Kacang Hijau, Kacang Tunggak" padahal isinya
Tabel 5.1.2 Jagung & Ubi Kayu). Selalu buka xlsx asli di `_tmp/` untuk memastikan.

---

## 2. Koreksi agregasi: rata-rata TERTIMBANG (bug paling umum & paling berbahaya)

### Gejala
Kartu "Total Rata-rata Produksi" menampilkan nilai mustahil, mis. **1.233 Ku/Ha**
(seharusnya ~60–69 Ku/Ha untuk padi Banjarnegara), karena nilai produktivitas
tiap kecamatan/komoditas **dijumlahkan**. Produktivitas (Ku/Ha) adalah metrik
intensitas — menjumlahnya antar kecamatan/komoditas tidak bermakna statistik.

### Rumus benar
```
rata_kabupaten = (Σ produksi_dalam_kuintal) ÷ (Σ luas_panen)
               = (Σ produksi_ton × 10) ÷ (Σ luas_ha)
```
(1 ton = 10 kuintal; rata BPS dalam Ku/Ha)

### Implementasi (pola yang sudah terbukti di food-crops.tsx)

Helper agregasi generik — dipakai untuk total, breakdown per komoditas,
top-kecamatan, footer tabel:

```ts
const agg = (rows: Row[], komoditas?: string): number => {
  let luas = 0, prod = 0, sum = 0;
  rows.forEach((d) => d.items.forEach((it) => {
    if (komoditas && it.komoditas !== komoditas) return;
    luas += it.luasPanen;
    prod += it.produksi;
    sum += metric === "luas" ? it.luasPanen
         : metric === "produksi" ? it.produksi
         : it.rataRata;
  }));
  if (metric === "rata") return luas > 0 ? (prod * 10) / luas : 0; // tertimbang
  return sum;                                                        // luas/prod boleh dijumlah
};
```

Tren per tahun → **akumulasi 2-pass** (kumpulkan Σluas & Σprod per tahun per
komoditas dulu, baru konversi ke metrik aktif), jangan menjumlah `getVal` langsung:

```ts
// pass 1: acc.set(tahun, { luas, prod, luasK: {komoditas: Σluas}, prodK: {...} })
// pass 2: obj[k] = metric==="rata" ? (prodK[k]*10)/luasK[k] : (luasK[k] atau prodK[k])
```

Ranking kecamatan kumulatif ( lintas tahun ) → sama: akumulasi Σluas/Σprod per
kecamatan, lalu rata = Σprod×10÷Σluas.

### Pembanding untuk validasi
Baris **"Jumlah"** di xlsx asli BPS (baris terakhir tiap tabel) = angka resmi
kabupaten. Contoh padi: rata resmi ~63–67 Ku/Ha; hasil tertimbang kita 60–69 ✓,
hasil penjumlahan lama 1.233–1.521 ✗.

---

## 3. Perbaikan presentasi (Recharts) — checklist

| Masalah | Perbaikan |
|---|---|
| Tooltip menampilkan nilai tanpa nama seri (`formatter` return `[""]` di elemen nama) | `formatter={(value: any, name: any) => [formatNum(Number(value)), String(name ?? "")]}` |
| Bar chart produktivitas di-stack (menjumlah rata secara visual) | `stackId={metric === "rata" ? undefined : "a"}` — metrik intensitas tampil side-by-side |
| Kartu "Total X" ambigu saat metrik intensitas | Label kondisional: "Rata-rata Produksi Tertimbang" + keterangan "Σ produksi ÷ Σ luas panen" |
| Komposisi/persentase komoditas saat metrik intensitas | Basis persentase = **tonase produksi** (fisik), bukan jumlah nilai intensitas |
| Footer tabel agregat | Pakai `agg(filteredData, k)` per kolom + `agg(filteredData)` total; label dinamis "Kabupaten …" vs "Kecamatan X" sesuai filter |
| Nilai kosong → `-1` | Mulai `topVal = 0`, fallback nama `"-"` |

---

## 4. Pola parser & data yang sudah terbukti

- **Struktur row**: `FoodCropRow { kecamatan, tahun, items: FoodCropItem[] }` —
  `items` per komoditas `{komoditas, luasPanen, produksi, rataRata}`
  (lihat `src/services/api.ts`). Pola ini memudahkan agregasi tertimbang.
- **CSV posisi kolom** (palawija/Padi): `[kec, luasA, prodA, rataA, luasB, prodB, rataB, tahun]`,
  header di baris 1 → parser mulai `i = 1`, skip baris mengandung `jumlah`/`total`.
- **CSV header-based** (Padi): cocokkan nama header persis termasuk spasi
  (`"Padi Sawah (Ha)"`, `"Produksi Padi Ladang(Ton)"` — tanpa spasi sebelum kurung!).
- **Nilai BPS**: `" 2,165 "` (koma ribuan + spasi, kadang ter-quote) → `cleanFloat`
  (`replace(/,/g,"")` + trim); `"-"` → 0.
- **Nama kecamatan** dengan huruf terpisah (`B a w a n g`) → `normalizeKecamatanName()`.
- **Bump cache key** setiap ganti logika parser (`_v1` → `_v2` …) agar user lama
  tidak kena data basi dari localStorage.
- **File jangan dipakai**: `511b` (= Total Padi, baris bergeser) dan CSV merged lama —
  sumber CSV Padi saat ini adalah hasil regenerate dari xlsx asli
  (`scripts/regenerate-merged-padi.cjs`).

---

## 5. Verifikasi wajib sebelum dianggap selesai

```powershell
npx tsc --noEmit                                  # EXIT 0
npm run build                                     # sukses tanpa error baru
# dev server: cek HTTP 200 halaman + CSV path (encode spasi %20, folder ada spasi ganda!)
Invoke-WebRequest "http://localhost:5176/<csv path>" -UseBasicParsing
```

**Sanity check angka** — script node sekali-pakai (baca CSV via papaparse,
replikasi parser + agregasi, bandingkan dengan baris "Jumlah" xlsx asli):

```
140 baris / 20 kecamatan / 2018–2024  ✓ struktur
rata tertimbang per tahun: 60–69 Ku/Ha ✓ vs resmi 63–67
total padi 2024 = 176.200 ton ✓ (konsisten lintas halaman /prediction)
```

---

## 6. Quirk tooling di mesin ini (hemat waktu debugging)

- **Python + openpyxl** → pakai `D:\Users\diskonekted\miniforge3\python.exe`.
  (`python` di PATH = Inkscape 3.12.9, TIDAK punya openpyxl; ada juga `py` 3.14 & uv 3.11.)
- **Grep tool AI sering false-negative** di repo ini (api.ts, food-crops.tsx,
  PETA_DATABASE.md) → fallback: `Select-String -Path ... -Pattern ...`.
- **xlsx BPS punya trailing empty rows** — `max_row` bisa 995 padahal konten
  berhenti di ~r30–45. Jangan asumsikan baris kosong = data.
- **Nama folder ada spasi ganda** ("Luas  Panen,  Produksi ...") — harus persis
  di path fetch; spasi → `%20` saat test HTTP.
- PowerShell here-string `python -c @'...'@` **mengacaukan quoting** → tulis
  file `.py` sementara lalu eksekusi; hapus lagi setelah selesai.

---

## 7. Pemetaan file asli vs PETA_DATABASE.md (hasil verifikasi 20 Sep 2026)

Folder `Luas  Panen,  Produksi dan Rata-rata Produksi` (Tipe C):

| Seri xlsx `_tmp` | Tabel | Komoditas | CSV terpakai |
|---|---|---|---|
| `511 ...` | 5.1.1 | Padi Sawah & Padi Ladang | `... Padi Sawah Dan Padi Ladang CSV.csv` |
| `511b lanjutan` | 5.1.1 lanjutan | Total Padi — **jangan dipakai** | — |
| `511c lanjutan` | 5.1.2 | Jagung & Ubi Kayu | `... (Jagung dan Ubi Kayu) CSV.csv` |
| `511d lanjutan` | 5.1.3 | Kacang Tanah & Kedelai | `... (Kacang Tanah dan Kedelai) CSV.csv` |
| `511e lanjutan` | 5.1.4 | Ubi Jalar & Kacang Hijau | `... (Ubi Jalar dan Kacang Hijau) CSV.csv` |

- **Kacang Tunggak tidak ada di data mana pun** (klaim lama PETA_DATABASE.md salah).
- Seluruh 8 komoditas tanaman pangan sudah tampil di `/food-crops`.
- Koreksi sudah ditulis ke `public/14. Distankan KP/PETA_DATABASE.md` (blockquote
  "Koreksi 20 Sep 2026").

---

## 8. Catatan perbaikan /food-crops (hasil akhir)

- 4 kategori: **Padi Sawah & Padi Ladang (default)**, Jagung & Ubi Kayu,
  Kacang Tanah & Kedelai, Ubi Jalar & Kacang Hijau.
- `agg()` tertimbang dipakai di: `stats` (total/breakdown/topDistrict),
  `chartData.total`, `trendData` (2-pass), `kecamatanRanking`, footer Tabel Rincian.
- Nav: `src/config/site.ts` → "Tanaman Pangan (Padi & Palawija)".
- Semua perubahan di working tree; verifikasi: tsc 0, build 5.15s, dev 200 OK.
