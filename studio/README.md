# SISPERTANI Studio — Dasbor Admin Data Bantuan Pemerintah

Sanity Studio untuk input manual data bantuan pemerintah (Dinas Pertanian
Kabupaten Banjarnegara). Tiga jenis dokumen:

1. **Program Bantuan** — daftar program kerja + nominal anggaran
2. **Alokasi Anggaran Tahunan** — APBD vs APBN per tahun (Miliar Rp)
3. **Korelasi Bantuan per Sektor** — bantuan (Miliar Rp) vs kenaikan produksi (%)

Data yang di-publish di sini otomatis muncul di halaman publik:
`https://pertanian.sistemdata.id/government-assistance`

## Setup Sekali Saja

```bash
cd studio
npm install
npx sanity login     # login dengan akun Sanity milik Distan
```

## Menjalankan Lokal (development)

```bash
npm run dev          # buka http://localhost:3333
```

## Deploy Studio (publish perubahan UI/schema)

```bash
npx sanity deploy   # pilih hostname, mis: sispertani → https://sispertani.sanity.studio
```

Admin Distan cukup membuka URL hasil deploy tersebut, login dengan akun
yang sudah diundang ke project, lalu mengisi data.

## Konfigurasi Penting di manage.sanity.io (sekali saja)

1. **CORS** (Settings → API → CORS origins) — tambahkan:
   - `https://pertanian.sistemdata.id` (produksi — *tanpa* "Allow credentials")
   - `http://localhost:5174` (development lokal)
2. **Dataset public** — dataset `datasispertani` harus ber-status public
   agar halaman publik dapat membaca tanpa token (sudah diverifikasi public
   per 2026-09-19).
3. **Menambah admin baru** (masa depan, admin per bidang) — Manage →
   Members → Invite (role: Editor). Tanpa perubahan kode.

## Referensi

- Project ID: `spukl1fj`
- Dataset: `datasispertani`
- Organization: `oHoFhQZhG`
- Query publik dipakai aplikasi: `src/services/bantuan.ts` (repo utama)
