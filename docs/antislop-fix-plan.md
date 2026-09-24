# Daftar Perbaikan Frontend — Antislop (untuk eksekusi sesi berikutnya)

> Sumber: audit antislop 2026-09-24 (memori `antislop-audit-frontend-2026-09-24.md`).
> Status: **ANALISA SAJA — belum ada perubahan kode.** Semua patch di bawah siap ditinjau & diterapkan.
> Peringatan tool: Grep false-negative di drive I: → pakai `Select-String`; Read full-file bisa terdistorsi → pakai `(Get-Content file)[a..b]`; konsol PowerShell menampilkan em-dash sebagai `â€"` (file asli tetap `—`).

---

## Ringkasan prioritas

| # | Perbaikan | Rule | Risiko | Biaya |
|---|---|---|---|---|
| P1 | Fix `text-slate-850` (class invalid) | bug | nol | 1 baris |
| P2 | Selaraskan `style_guide.md` vs kode | — | nol | docs |
| P3 | Buang aksen ungu/violet UI | R-13 | rendah | sedang |
| P4 | Hapus tone-map round-robin → ikon+label | R-17/R-15 | sedang | sedang |
| P5 | Standarkan radius & shadow | R-06/07/08 | sedang | besar |
| P6 | Audit a11y (aria-label, kontras, fokus) | R-14 | rendah | sedang |

**CATATAN PENTING (jangan over-reach):** palet multi-seri CHART (`["#1d4ed8","#0d9488","#b45309","#be185d","#6d28d9","#4d7c0f"]` dkk.) yang dipilih USER sah — seri chart butuh warna beda-beda. **JANGAN ubah** warna chart. Target P3 = aksen UI *chrome* (badge, border, background pastel, chip KPI), bukan warna seri grafik.

---

## P1 — Bug `text-slate-850` (siap diterapkan)

Tailwind v4 tidak punya `slate-850` (skala: 50…900, 950) → class secara senyap tidak berefek, warna "Guest" jatuh ke warisan.

**File:** `src/layouts/default.tsx:271`

```diff
- <p className="text-xs font-semibold text-slate-850">Guest</p>
+ <p className="text-xs font-semibold text-slate-900">Guest</p>
```

Verifikasi: `Select-String -Path src\layouts\default.tsx -Pattern 'slate-850'` → 0 hasil; `npm run build` hijau.

---

## P2 — Rekonsiliasi `style_guide.md` (docs)

`style_guide.md` mendokumentasikan "neo-brutalist / retro-industrial" (rounded-none, hard shadow offset, border `#141414`) yang **tidak** dipakai kode, dan Bagian 8 merujuk `i:/edu-ai/src/...` (proyek lain).

Dua opsi (pilih satu di awal sesi, tanyakan user bila perlu):

- **Opsi A (disarankan):** tulis ulang `style_guide.md` agar mendokumentasikan gaya aktual = **"government (opsi B)"** — kartu putih, border `border-slate-200` 1px, rounded-lg, aksen tunggal `#1d4ed8`/`blue-800`, sans-serif + angka `tabular-nums`, palet chart tenang (lihat `project-sispertani.md` "Desain dasbor: gaya pemerintahan"). Hapus referensi `edu-ai`, samakan contoh kode dengan `src/components/ui.tsx`.
- **Opsi B:** arsipkan `style_guide.md` (rename → `style_guide.arkib.md` atau hapus) dan jadikan kode + `project-sispertani.md` sebagai satu-satunya referensi gaya.

Tidak ada patch kode di sini — murni dokumen.

---

## P3 — Buang aksen ungu/violet pada UI chrome (R-13)

### P3.1 Hapus tone `violet` dari komponen generik

**File:** `src/components/ui.tsx` (badgeTones, ~baris 160-167)

```diff
   red: "bg-red-50 text-red-700",
-  violet: "bg-violet-50 text-violet-700",
};
```

Konsekuensi: semua `tone="violet"` / `Badge tone="violet"` caller harus disesuaikan (lihat P3.2). Cari caller: `Select-String -Path (Get-ChildItem src -Recurse -Filter *.tsx).FullName -Pattern 'tone="violet"|"violet"'`.

### P3.2 Inventaris aksen ungu/violet (28 lokasi) + pemetaan

Inventaris lengkap (hasil audit) → arah per kelompok:

**Kelompok A — aksen dekoratif → ganti `blue`** (atau status semantik bila relevan):

| File:baris | Saat ini | Arah |
|---|---|---|
| `economic-value.tsx:319,324` | `bg-violet-50 …` + `text-violet-600` | `bg-blue-50` / `text-blue-600` |
| `fisheries.tsx:704,1074` | `bg-violet-50 …` | `bg-blue-50` |
| `recommendations.tsx:840` | `border-l-purple-700` | `border-l-blue-700` |
| `sensus.tsx:356-357` | `border-l-purple-700` + `text-purple-700` | `border-l-blue-700` / `text-blue-700` |
| `suitability.tsx:424-425` | `border-l-purple-700` + `text-purple-700` | `border-l-blue-700` / `text-blue-700` |
| `supply-chain.tsx:275` | `text-purple-600` | `text-blue-600` |
| `government-assistance.tsx:137-138,211` | `bg-purple-50 … text-purple-800`, `text-purple-700` | `bg-blue-50` / `text-blue-800` / `text-blue-700` |
| `index.tsx:108` | `color="bg-purple-300"` | `color="bg-blue-300"` |
| `nilai-ekonomi.tsx:623,904` | `color="bg-violet-50 text-violet-600"` | `color="bg-blue-50 text-blue-600"` |
| `admin.tsx:131,553` | `bg-violet-50 text-violet-700` | `bg-blue-50 text-blue-700` |
| `info.tsx:122` | `bg-violet-100 text-violet-700` | `bg-blue-50 text-blue-700` |
| `manual.tsx:117,322` | `bg-purple-100 text-purple-700`, `text-purple-600` | `bg-blue-50 text-blue-700`, `text-blue-600` |

**Kelompok B — `badgeStyle` di supply-chain:149** (`bg-violet-100 text-violet-800 border-violet-600`) → `bg-blue-50 text-blue-700 border-blue-600`.

**Kelompok C — tone-map round-robin (lihat P4, jangan cuma recolor):** `kewirausahaan-kwt.tsx:52,55`, `komoditas-unggulan.tsx:64,67`, `ltt-katam.tsx:59`. Warna ungu di `CHART_COLORS` (`#7c3aed`) **dibiarkan** (seri chart).

> Catatan: sebelum ganti massal, baca tiap file dengan `(Get-Content file)[a..b]` untuk dapat old_string akurat (em-dash `—` di beberapa file).

---

## P4 — Hapus tone-map round-robin (R-17 + R-15)

Pola masalah: warna diberikan ke kategori **arbitrer** tanpa makna → tampak "designed" tapi menyesatkan & bocor ungu.

**Yang HARUS dipertahankan** (semantik sah):
- `BENIH_TONE` (`komoditas-unggulan.tsx:68`): Tersedia=emerald / Terbatas=amber / Kurang=red / "Tidak ada"=slate — **ini semantik status, JANGAN diubah.**
- TrendPill naik/turun, status emerald/amber/red — semantik, dipertahankan.

**Yang HARUS diubah** (kategori arbitrer):

1. `kewirausahaan-kwt.tsx:52-55` — `JENIS_TONE` (KWT/Pokdakan/Poklahsar/Pokmamas):
   Ganti warna-per-jenis → **satu tone netral + ikon/teks** (mis. semua `blue`, bedakan lewat ikon lucide per jenis; atau tanpa warna sama sekali, label + ikon).

2. `komoditas-unggulan.tsx:64-67` — `BIDANG_TONE` (5 bidang, `Perkebunan: "violet"`):
   Sama — satu tone + ikon bidang (bukan 5 warna siklik).

3. `ltt-katam.tsx:59` — `JENIS_TONE` (LTT=blue, Katam=violet):
   Satu tone + label; hapus `violet`.

**Keputusan yang perlu diambil (tanyakan user atau pilih default):** pakai **ikon+label** (antislop R-15 — paling aman, aksesibel) atau **satu aksen netral** untuk semua kategori (paling cepat). Rekomendasi default: ikon+label, tone netral/blue seragam.

Patch arah (contoh `ltt-katam.tsx:59`):
```diff
- const JENIS_TONE: Record<string, "blue" | "violet"> = { LTT: "blue", Katam: "violet" };
+ const JENIS_TONE: Record<string, "blue"> = { LTT: "blue", Katam: "blue" };
```
(dan pastikan ikon/teks sudah membedakan LTT vs Katam — kalau belum, tambahkan).

---

## P5 — Standarkan radius & shadow (R-06/07/08)

Setelah P2 memastikan arah desain (government), tetapkan aturan tunggal lalu rapikan:
- **Radius:** satu skala — kartu/panel `rounded-lg` (8px) seragam; `rounded-full` HANYA avatar/status dot. Hapus `rounded-xl`/`rounded-full` yang tidak perlu.
- **Shadow:** kartu = `shadow-sm` (sudah konsisten, 217×) — TERIMA sebagai standar; buang `shadow-md/lg/xl` (78×) yang memberi kedalaman berlebihan/bertumpuk.
- Ini pekerjaan volume besar → kerjakan bertahap per-halaman, verifikasi `tsc` tiap batch.

---

## P6 — Audit aksesibilitas (R-14)

Checklist (perlu cek manual / baca file, bukan patch serentak):
1. **Tombol ikon tanpa label** → tambah `aria-label` (header `default.tsx`: tombol search, toggle tema, dll).
2. **Teks mikro** `font-mono` 9-10px (mis. `government-assistance.tsx:138`) → naikkan min `text-[11px]` atau beri kontras cukup (jangan `slate-400/500` di atas putih).
3. **focus-visible** → pastikan ring fokus kasatmata pada semua interaktif (sekarang `shadow-sm` + border tipis bisa membuat fokus tak kelihatan).
4. **Color-only meaning** → sudah diakomodasi P4; pastikan status selalu punya teks/ikon pendamping.

---

## Urutan eksekusi yang disarankan (1 commit per langkah agar mudah rollback)

1. **P1** (bug, 1 baris) → commit, verifikasi build.
2. **P2** (style_guide.md) → commit docs.
3. **P3.1 + P3.2** (hapus violet UI) → satu commit, `tsc` + `npm run build` hijau.
4. **P4** (tone-map, setelah putuskan ikon+label vs satu-tone) → commit.
5. **P6** (aria-label klein) → commit.
6. **P5** (radius/shadow, terakhir — paling berisiko visual) → bertahap.

## Verifikasi akhir (wajib)
- `npm run build` (tsc clean).
- `Select-String` residu: `slate-850`, `violet`, `purple`, `accent-purple`, `rounded-xl`, `shadow-md`, `shadow-xl` → harus 0 (kecuali yang sah: `CHART_COLORS` seri chart).
- Jangan menyentuh `import`/`color` chart series.
