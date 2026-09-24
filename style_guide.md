# Panduan Gaya Frontend — SISPERTANI

Dashboard pertanian Kabupaten Banjarnegara. Gaya antarmuka resmi mengikuti **"government style / clean formal"** — meniru portal data pemerintah seperti BPS dan opendata.banjarnegarakab.go.id.

> **Catatan riwayat:** versi awal memakai gaya "neo-brutalist / CoreUI ramai" (border tebal, gradient, font mono/serif dekoratif, shadow tebal, emoji). Arah itu **ditolak** dan digantikan sepenuhnya oleh gaya di bawah ini. Aturan "yang dilarang" ada di bagian terakhir.

---

## 1. Prinsip inti

1. **Aksen tunggal biru pemerintahan** — satu warna merek (`#1d4ed8`), bukan pelangi siklik (lihat §7 "yang dilarang").
2. **Kartu bersih** — latar putih, border tipis 1px, sudut `rounded-lg`, bayangan `shadow-sm`. Tanpa gradient dan tanpa shadow tebal.
3. **Sans-serif + font-semibold** — tidak ada font mono/serif dekoratif sebagai aksen tipografi.
4. **Warna hanya untuk makna** — emerald = positif/tersedia, amber = peringatan/terbatas, red = negatif/kurang. Warna kategori *arbitrer* (jenis lembaga, bidang) tidak boleh diberi warna berbeda-beda.

---

## 2. Tipografi

| Elemen | Spesifikasi |
|---|---|
| Font utama | Inter (sans-serif) — default `font-sans` |
| Font mono | JetBrains Mono — hanya untuk angka/data yang butuh perataan kolom; **bukan** untuk judul/label |
| Judul halaman (H1) | `text-2xl font-semibold text-slate-900` |
| Judul seksi | `text-base font-semibold text-slate-900` |
| Subjudul | `text-sm text-slate-700` |
| Label kecil (eyebrow) | `text-xs font-semibold uppercase tracking-wide text-blue-800` |
| Angka statistik besar | `text-3xl font-semibold tabular-nums` |
| Bobot maksimum | `font-semibold` (600). `font-bold` boleh untuk tombol/penekanan; **dilarang** `font-black` (900) / `font-extrabold` (800) |

Kontras minimum untuk teks: `slate-700` di atas putih untuk isi; hindari `slate-400`/`slate-500` untuk teks penting.

---

## 3. Warna

### Primary (merek) — biru
```
primary-700  #1d4ed8   ← aksen utama (CTA, border aksen, teks tautan)
primary-600  #2563eb
primary-800  #1e40af   ← sidebar aktif
```
Skala penuh tersedia: `primary-50 … primary-900`.

### Netral
`slate-50 … slate-900` — untuk latar, border, dan teks.

### Semantik (hanya untuk status/arti)
| Warna | Arti | Token |
|---|---|---|
| Emerald | positif / tersedia / tercapai | `accent-emerald-*` |
| Amber | peringatan / terbatas / hati-hati | `accent-amber-*` |
| Red | negatif / kurang / tidak ada | `accent-red-*` |

**Aturan emas:** warna semantik dipakai *hanya* saat membawa arti nyata (mis. `BENIH_TONE`: Tersedia=emerald, Terbatas=amber, Kurang=red). Jangan beri warna pada kategori yang tidak punya arti (jenis lembaga, nama bidang) — pakai satu warna netral + teks.

### Seri grafik (khusus)
Grafik multi-seri boleh memakai palet terbatas untuk membedakan seri, mis. `["#1d4ed8","#0d9488","#b45309","#e11d48","#6d28d9","#4d7c0f"]`. Ini **pengecualian** dari "aksen tunggal" karena kebutuhan diferensiasi seri, bukan dekorasi.

---

## 4. Komponen & layout

| Komponen | Spesifikasi |
|---|---|
| Kartu / panel | `bg-white border border-slate-200 rounded-lg shadow-sm p-4` |
| Header halaman | eyebrow kecil + H1 + subjudul; tanpa dekorasi mubazir |
| KPI card | `border-l-4 border-l-blue-800` + ikon kecil + label uppercase kecil + angka besar |
| Tabel | header `bg-slate-50 text-xs uppercase`, footer `border-t-2`, angka rata kanan `tabular-nums` |
| Badge | `bg-{color}-50 text-{color}-700`; tone: `blue`/`emerald`/`amber`/`red`/`slate` |
| Tombol | primer `bg-blue-800 text-white`; sekunder `border border-slate-200` — `font-medium` |
| Sudut | `rounded-lg` (panel/kartu), `rounded-full` **hanya** avatar/status dot |
| Bayangan | `shadow-sm` (lunak, standar); **dilarang** `shadow-md/lg/xl/2xl` |

---

## 5. Bahasa & copy

- Bahasa Indonesia formal, informatif, spesifik (hindari istilah asing bila ada padanan).
- Angka pakai pemisah ribuan (`.`), desimal (`,`), satuan jelas (ton, Ha, butir, kg).
- Data wajib dari backend/CSV resmi — **tanpa** placeholder/lorem/data palsu.

---

## 6. Aksesibilitas (wajib)

- Tombol ikon wajib `aria-label` (mis. `aria-label="Buka menu navigasi"`).
- Fokus keyboard kasatmata (`focus-visible` ring) pada semua interaktif.
- Makna tidak pernah hanya lewat warna — selalu ada teks/ikon pendamping.
- Kontras teks memenuhi minimum (§2).

---

## 7. YANG DILARANG (anti-pattern, pernah ditolak)

- ❌ Gradient (`bg-gradient-to-*`, `from-… via-… to-…`) pada UI chrome.
- ❌ Shadow tebal `shadow-md/lg/xl/2xl` & `drop-shadow` dekoratif.
- ❌ Border tebal `border-4`/`border-8` (kecuali aksen KPI `border-l-4`).
- ❌ Font dekoratif: `font-mono`/`font-serif` untuk judul/label; `font-black`/`font-extrabold`.
- ❌ Warna "invented" (mis. ungu/violet/fuchsia) sebagai aksen UI.
- ❌ **Round-robin tone** — memberi warna berbeda-beda ke kategori arbitrer (jenis lembaga, bidang) agar "terlihat dirancang"; ini encoding-makna-semua yang keliru.
- ❌ Emoji sebagai ikon fungsional; ikon pakai `lucide-react`.

> **Pengecualian sah:** gradient/accent-strip pada hero halaman detail desa/kecamatan (hasil redesign tersendiri), dan palet seri grafik (§3).
