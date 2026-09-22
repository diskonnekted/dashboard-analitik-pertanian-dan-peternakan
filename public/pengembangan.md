# Rencana Pengembangan SISPERTANI

> **Update: 22 September 2026** (dokumen pertama kali dibuat; baseline: `gap-analysis.md` v4.0)
> Prinsip urutan: **(1) murah dulu** — data sudah ada di MySQL, tinggal endpoint + UI; **(2) data publik** — sumber BPS/CKAN bisa diambil sendiri; **(3) data dinas** — butuh kiriman/konfirmasi Dinas; **(4) infrastruktur** — tata kelola & deploy.
> Estimasi: S = ≤ setengah hari · M = 1–2 hari · L = > 2 hari / lintas pihak.

---

## Riwayat pencapaian (konteks, ringkas)

| Tanggal | Pencapaian |
|---|---|
| 20 Sep 2026 | Gelombang perbaikan data: food-crops, plantation, livestock, livestock-flow, fisheries, economic-value, food-security, farmers, recommendations, horticulture (rename folder en-dash), renstra — semua terverifikasi sel-level |
| 21 Sep 2026 | Fase A migrasi MySQL (schema 40 tabel, ETL dry-run ~19.500 baris); chatbot Si Pertani v2.1; rilis GitHub v2.1.0 |
| 22 Sep 2026 | Fase B: backend 32 endpoint (:4100) + dasbor admin Excel 15 domain (E2E PASS); sanity dilepas penuh + modul bantuan; baseline lahan ST2023 278 desa (0bc1775); **perluasan Tabel 4.10 12 kolom + total_dikuasai SELESAI** (231273e, terverifikasi independen: widget Lahan Kritis kini jujur, Σ kabupaten 51.632,3 Ha); gap-analysis v4.0 + pengembangan.md |

---

## P1 — Quick wins: data SUDAH ada di MySQL, tinggal endpoint + UI

| # | Item | Deliverable | Basis data | Est |
|---|---|---|---|---|
| P1-1 | **Susu & kulit ternak** | Endpoint `GET /v1/peternakan/susu-kulit` + panel di `/livestock` (tampilkan apa adanya: BPS tidak memisahkan susu liter vs kulit lembar — tampilkan catatan) | Tabel `ternak_susu_kulit` (kecamatan × jenis × tahun) | S |
| P1-2 | **Audit log di dasbor admin** | Endpoint `GET /v1/admin/sync-log` + tab "Riwayat Import" (siapa/kapan/domain/baris sukses-gagal) | Tabel `sync_log` | S |
| P1-3 | **Detail profil kelompok tani** | Panel detail per kelompok di `/farmers` (nama ketua, tahun berdiri, kelas); SK jika tersedia | Data kelembagaan JSON/SIMLUH + `kth_detail` | M |
| P1-4 | **Rasionalisasi telur & unggas desa** | Di detail desa: tampilkan telur/unggas ST2023 secara konsisten (kini hanya jejak di peta/sensus) | `st2023_desa.ternak` (JSON) | S |
| P1-5 | **Sebaran kolam per desa (peta)** | Layer peta "kolam/perikanan" di detail desa / `/fisheries` | `ikan_kolam`, `ikan_pemeliharaan`, `ikan_waduk` + geojson desa | M |

## P2 — Fitur dengan data publik (BPS/CKAN) yang perlu diambil dulu

| # | Item | Deliverable | Kebutuhan data | Est |
|---|---|---|---|---|
| P2-1 | Breakdown perikanan **per jenis ikan** (lele, nila, mujair, gurame, mas, tawes, patin) | Tab/bar chart per komoditas di `/fisheries` | Tabel BPS produksi budidaya per jenis (cek 39 folder Distkanan / CKAN; bila tidak ada → catat sebagai butuh data dinas) | M |
| P2-2 | **Nilai ekonomi multi-bidang** | `/economic-value` diperluas: sub-sektor pangan, hortikultura, perkebunan, peternakan (kini hanya perikanan) | Nilai produksi per bidang (BPS Distkan: nilai produksi tanaman hortikultura/perkebunan ada di rilis tahunan) | L |
| P2-3 | Komoditas unggulan per bidang (varietas padi, jagung hibrida, sayuran Dieng) | Submenu "Unggulan" per bidang dengan data varietas/luas | Data varietas (dinas/CKAN — cek ketersediaan) | M |
| P2-4 | Unggulan perkebunan: **kelapa deres, porang** | Restrukturisasi `/plantation`: komoditas umum → pangan, unggulan khas Banjarnegara | Data luas/produksi kelapa dalam (deres) & porang per kecamatan | M |
| P2-5 | Sebaran sentra spasial (kawasan hortikultura) | Aktifkan `/kawasan-hortikultura` dari ComingSoon → peta sentra per komoditas | Geojson/daftar sentra (susun sendiri dari `horti_produksi` top-kecamatan + polygon desa) | M |
| P2-6 | KWT, Pokdakan, Poklahsar, Pokmamas | Tambah 4 entitas di `/farmers` (5 total dengan Poktan; KTH tetap terpisah) | Data DKPP per kecamatan (butuh kiriman dinas — **blokir data**) | M |

## P3 — Analitik baru (butuh data baru / metodologi)

| # | Item | Deliverable | Kebutuhan | Est |
|---|---|---|---|---|
| P3-1 | Ketahanan pangan 3 pilar Bapanas: kalkulator kalori 2.100 kkal/jiwa, status per kecamatan | Tab baru `/food-security`: skor ketersediaan-akses-pemanfaatan | Populasi per kecamatan + produksi + harga (kalori bisa dihitung dari data sendiri); FSVA/PPH/PoU butuh rilis BPS/Bapanas | L |
| P3-2 | RMU (rice milling unit) | Peta/daftar penggilingan | Data dinas (perizinan) | M |
| P3-3 | Katam + LTT bulanan | Aktifkan `/ltt` | Data rencana tanam dinas per musim | L |
| P3-4 | Nilai ekonomi triwulan/semester | Switch granularitas waktu di economic-value | Rilis kwaran BPS (cek ketersediaan; biasanya hanya tahunan untuk kabupaten) | L |
| P3-5 | Domba lokal vs **Domba Batur** | Pemisahan populasi domba di `/livestock` | Data dinas/Disetnakvan (BPS tidak memisahkan) | M |
| P3-6 | Poultry shop, ikan hias | Direktori + tren | Data dinas/asosiasi | M |
| P3-7 | Katalog barang + rules kelayakan + BAST + **list penerima relasional** | Modul bantuan level detail, relasi ke `/farmers` | Data DPA/realisasi dinas per penerima | L |

## P4 — Infrastruktur & tata kelola

| # | Item | Deliverable | Catatan | Est |
|---|---|---|---|---|
| P4-1 | **Deploy API + MySQL ke produksi** | Backend & DB live di pertanian.sistemdata.id; frontend beralih dari fallback CSV ke API (dengan fallback tetap) | **Kritis**: saat ini 32 endpoint hanya jalan di dev localhost; produksi masih statik dist/ + CSV. Butuh host (VPS/panel) + hardening (CORS, token admin, HTTPS) | L |
| P4-2 | RBAC multi-admin | Tabel users/roles + middleware; admin bidang hanya boleh import domainnya | Setelah P4-1 | M |
| P4-3 | Master data: petani NPP, lahan digital, alsintan | Aktifkan `/master-*` dari ComingSoon | Butuh data dinas (blokir data) | L |
| P4-4 | Monitoring & early-warning (OPT, kesehatan hewan/ikan, CPD) | ComingSoon → bertahap | Jangka panjang, sebagian butuh integrasi lapangan | L |

---

## Urutan yang disarankan berikutnya
1. **P1-1 → P1-2 → P1-4** (semua S; langsung terasa, tanpa risiko data)
2. **P4-1 deploy produksi** — jangan menunda: semua kerja Fase A/B baru dinikmati dev
3. P1-3, P1-5, lalu P2 sesuai ketersediaan data
4. P3/P4 sisanya mengikuti ketersediaan data dinas

## Aturan main pengembangan (pelajaran terverifikasi)
- Setiap perubahan data wajib: **verifikasi sel-level vs sumber resmi** + tulis hasil ke memory proyek + commit terpisah per domain.
- Jalur data selalu: **CSV/CKAN → MySQL (sumber='csv'/'manual', upsert tak menimpa manual) → endpoint → UI dengan fallback**.
- 1 tugas besar = 1 chat/session baru; handoff via memory + `aioncore conversation create` + `session send-message` (pola terverifikasi 22 Sep).
- Jaga konteks session: data besar diproses via script yang mencetak ringkasan, bukan dump mentah ke chat (preseden context overflow 198.683 > 197.000 token).
- Path di `public/` yang di-fetch WAJIB ASCII-only (kasus en-dash 0x96).
- Tool: `node -e` panjang dilarang (tulis file `.cjs`); verifikasi "0 hit"/edit via `Select-String`/`Contains()`.

## Protokol update dokumen ini
- Naikkan tanggal update di header setiap ada perubahan status item (✅/🟡/❌), tambahkan 1 baris di changelog bawah:
  - *22 Sep 2026 — dokumen dibuat (baseline gap-analysis v4.0).*
- Saat item selesai: pindahkan ke tabel Riwayat pencapaian dengan tanggal + commit/hash bukti.
- Sinkronkan dua arah dengan `gap-analysis.md` (status item harus sama di kedua dokumen).
