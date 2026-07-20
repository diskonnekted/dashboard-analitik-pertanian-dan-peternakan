# Panduan Style — Neo-Brutalist / Retro-Industrial

Panduan ini merangkum sistem desain aplikasi ini agar dapat diterapkan ulang di aplikasi lain (React + Tailwind CSS v4). Salin bagian yang relevan ke proyek baru.

## 1. Filosofi Desain

Gaya "hard-edge / neo-brutalist": sudut tegas (tanpa border-radius), border tebal hitam, dan bayangan padat tanpa blur (offset shadow) yang memberi kesan cetak/retro. Tipografi monospace dominan dengan huruf kapital dan tracking lebar untuk label, angka, dan heading.

Prinsip inti:
- Sudut kotak: `rounded-none` di hampir semua elemen.
- Border tegas hitam: `#141414`.
- Bayangan keras tanpa blur (bukan `shadow-md/lg` bawaan Tailwind).
- Mono + UPPERCASE + tracking lebar untuk label & metadata.
- Warna dasar netral (hitam/off-white), aksen fungsional (biru = aktif, merah = alert).

## 2. Dependensi

- **Tailwind CSS v4** via plugin Vite `@tailwindcss/vite`.
- Font di-load dari Google Fonts: `Inter`, `JetBrains Mono`, `Playfair Display`.
- Ikon: `lucide-react`.
- Animasi (opsional): `motion`.

## 3. Setup CSS

Impor Tailwind, definisikan token font via `@theme`, dan daftarkan utilities kustom. Salin ke file CSS utama proyek baru:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:ital,wght@0,400;1,400;1,600&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Playfair Display", Georgia, Cambria, "Times New Roman", Times, serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}

/* Utilities inti gaya hard-edge / brutalist */
@layer utilities {
  .border-hd {
    border: 1px solid #141414;
  }
  .border-hd-subtle {
    border: 1px solid rgba(20, 20, 20, 0.12);
  }
  .shadow-hd {
    box-shadow: 2px 2px 0px 0px #141414;
  }
  .shadow-hd-lg {
    box-shadow: 4px 4px 0px 0px #141414;
  }
}
```

## 4. Tipografi

| Token | Font | Penggunaan |
|-------|------|-----------|
| `font-sans` | Inter | Teks isi / paragraf |
| `font-mono` | JetBrains Mono | Label, heading, angka, badge (dominan) |
| `font-serif` | Playfair Display | Aksen editorial (jarang) |

Pola label khas:
- `text-[9px]` / `text-[10px]` / `text-[11px]` — ukuran mikro untuk label mono.
- `font-mono font-extrabold uppercase tracking-wide` (atau `tracking-widest`).
- Heading angka besar: `font-mono font-black tracking-tighter`.

## 5. Palet Warna

| Peran | Nilai |
|-------|-------|
| Hitam utama (border/teks/bg gelap) | `#141414` |
| Background kanvas terang | `#f1f1ef` |
| Panel gelap / terminal | `#141414`, `#1a1a1a`, `#1c1c1a` |
| Teks di atas gelap | `#E4E3E0` (terang), `#949494` / `#747474` (muted) |
| Aksen aktif / angka penting | `blue-500`, `blue-600`, `blue-700` |
| Alert / krisis | `red-*` (mis. `text-red-600`, `bg-red-50`, `border-red-200`) |
| Peringatan | `amber-*` (mis. `bg-amber-100`, `border-amber-400`, `text-amber-800`) |
| Aksen AI | `indigo-*` (mis. `bg-indigo-50`, `text-indigo-600`) |

## 6. Pola Komponen

### Kartu / Panel
```html
<div class="bg-white p-5 rounded-none border border-[#141414] shadow-hd space-y-3">...</div>
```

### Tombol primer
```html
<button class="bg-[#141414] hover:bg-slate-800 text-white border border-slate-900 font-mono font-bold text-[11px] uppercase px-4 py-2 rounded-none shadow-hd transition">Aksi</button>
```

### Tombol sekunder
```html
<button class="bg-[#f1f1ef] hover:bg-slate-200 text-slate-800 border border-slate-900 font-mono font-bold text-[11px] uppercase px-4 py-2 rounded-none transition">Batal</button>
```

### Input / Select / Textarea
```html
<input class="w-full border border-slate-900 rounded-none p-2 text-xs outline-none focus:border-black font-sans font-medium" />
```

### Label field
```html
<label class="text-[10px] font-mono font-extrabold text-[#747474] uppercase tracking-wide block">Nama Field</label>
```

### Header modal (dark)
```html
<div class="bg-[#141414] p-4 text-white flex items-center justify-between border-b border-black">...</div>
```

### Overlay modal
```html
<div class="fixed inset-0 bg-slate-950/75 flex items-center justify-center z-50 p-4 animate-fade-in">
  <div class="bg-white rounded-none max-w-md w-full shadow-hd-lg overflow-hidden border-2 border-slate-900 flex flex-col">...</div>
</div>
```

### Badge status
```html
<!-- Alert -->
<span class="text-[9px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">Peringatan</span>
<!-- Warning -->
<span class="text-[9px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-400 px-2 py-0.5 animate-pulse">Status</span>
```

### Header aplikasi (sticky)
```html
<header class="bg-white border-b-2 border-[#141414] py-4 px-6 sticky top-0 z-40 flex items-center justify-between">...</header>
```

## 7. Aturan Penerapan

1. Selalu pakai `rounded-none` — hindari `rounded-md/lg/xl` (kecuali badge kecil `rounded`/`rounded-full` untuk indikator).
2. Gunakan `shadow-hd` / `shadow-hd-lg`, hindari shadow blur bawaan (`shadow-md`, `shadow-lg`).
3. Border tebal untuk hierarki: `border-2 border-[#141414]` (utama), `border border-[#141414]` (kartu), `border-hd-subtle` (pemisah halus).
4. Semua label & tombol: `font-mono uppercase` + tracking lebar.
5. Warna aksen bersifat fungsional: biru = aktif/highlight, merah = alert, amber = peringatan, indigo = AI.
6. Animasi hemat: `animate-pulse` (alert), `animate-ping` (indikator titik), `animate-bounce` (ikon perhatian).

## 8. Referensi di Codebase

- Definisi utilities & font: [index.css](file:///i:/edu-ai/src/index.css)
- Contoh kartu/tombol/hero: [LandingPage.tsx](file:///i:/edu-ai/src/components/LandingPage.tsx)
- Contoh form/modal: [Modals.tsx](file:///i:/edu-ai/src/components/Modals.tsx)
- Contoh panel gelap/terminal: [DemoPanel.tsx](file:///i:/edu-ai/src/components/DemoPanel.tsx)
- Contoh badge/status/dashboard: [Dashboards.tsx](file:///i:/edu-ai/src/components/Dashboards.tsx)
