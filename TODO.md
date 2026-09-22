# Checklist Pengembangan SISPERTANI — Status 22 Sep 2026 (commit HEAD = beaf52b)

> **Source of truth**: `public/pengembangan.md` (roadmap P1-P4, 17 item). Cross-check tiap item dengan kode (`git log`) + memory. Auto-update tiap ada perubahan commit.

Legenda: ✅ selesai · 🟡 sebagian · ❌ belum mulai · 🔴 blocker

---

## P1 — Quick wins (data ada di MySQL, tinggal endpoint + UI)
| # | Item | Est | Status | Evidence / File |
|---|------|-----|--------|-----------------|
| P1-1 | **Susu & kulit ternak** | S | ✅ **DONE** | `backend/src/routes/peternakan.js:118-130` (Σ=121.087); `src/pages/peternakan-susu-kulit.tsx`; route + menu di `App.tsx`/`config/site.ts`; commit `9ef39ab` |
| P1-2 | **Audit log admin** | S | ✅ | `backend/src/routes/admin.js` `/admin/sync-log` (requireAdmin); panel tabel di `src/pages/admin.tsx` |
| P1-3 | **Profil kelompok tani (detail)** | M | 🟢 | SELESAI 22 Sep: detail KTH per desa kini tampil di panel Kelembagaan detail desa (DesaKelembagaan + seksi KTH SIMLUH: nama, kelas badge Pemula/Madya/Utama, ketua, SK/noRegister, tanggal berdiri, alamat; dedupe lintas tahun) — data sudah mengalir via `/v1/kelembagaan/kelompok-tani` (`kelompokTaniHutanList`), tinggal ditampilkan |
| P1-4 | **Rasionalisasi telur & unggas** | S | 🟢 | SELESAI 22 Sep: unggas via panel Populasi Ternak (DesaTernak) + blok baru **Estimasi Produksi Telur** per desa — populasi ST2023 × faktor konversi indikatif (250/60/250 butir/ekor/thn; 60/45/12 g) × harga `harga-referensi.ts` (ras layer Rp 28rb/kg, kampung Rp 45rb/kg, puyuh Rp 30rb/kg indikatif); data telur resmi 3 jenis menyusul dari Distankan KP (master §3.3) |
| P1-5 | **Peta kolam per desa** | M | 🟡 | 22 Sep: panel **DesaPerikanan** baru di detail desa — konteks BPS kecamatan (budidaya kolam/karamba/minapadi + tangkap per alat, tahun terbaru; susuk 2024 = 164.285 kg ✓) + RT desa tetap di Demografi. **Data kolam per-DESA belum ada** (ST2023 hanya hitung RT) & tabel `ikan_kolam` BPS ANOMALI (luas beku 68,93 Ha semua tahun, 2019 korup Σ1,72 Mkg, produksi hanya Bawang ≠ 0) → tidak ditampilkan sampai diverifikasi; layer peta kolam menunggu geo-data dinas |

## P2 — Data publik BPS/CKAN
| # | Item | Est | Status | Evidence |
|---|------|-----|--------|----------|
| P2-1 | Breakdown perikanan per jenis ikan | M | 🟢 | SELESAI 22 Sep: kategori "Jenis Ikan" di `/fisheries` — katalog 5 ikan air tawar (lokal; estimasi pangsa × volume BPS) + 4 ikan laut (pasar, tanpa volume) + harga referensi indikatif di `src/data/produk-ikan.ts`; **selaras master §3.2** (7 jenis wajib + Gabus & Belut, sentra kecamatan per jenis, minapadi Singomerto/Bawang/Madukara); BPS tidak publish per jenis (39 folder: hanya per tempat pemeliharaan/alat tangkap) → rincian per jenis = estimasi komposisi, bukan angka resmi |
| P2-2 | Nilai ekonomi multi-bidang | L | 🟡 | Halaman `/nilai-ekonomi/:bidang` LIVE (7540f50: estimasi volume BPS × harga referensi; perikanan konsolidasi ke /economic-value 181e4ec); verifikasi sumber harga resmi masih jalan di sesi lain (artefak _tmp: bapanas/bappebti/SE) |
| P2-3 | Komoditas unggulan per bidang | M | 🟡 | Halaman `/komoditas-unggulan` utuh + placeholder auto-upgrade (9c37e6c); menunggu data varietas → endpoint `/v1/komoditas-unggulan` (data dijadwalkan 23 Sep) |
| P2-4 | Restructure perkebunan | M | 🟡 | `/plantation` ada, belum kelapa deres/porang terpisah |
| P2-5 | Kawasan hortikultura | M | ❌ | `/kawasan-hortikultura` masih ComingSoon |
| P2-6 | KWT, Pokdakan, dll | M | ❌ | Butuh data DKPP dinas (blokir); hanya Poktan+KTH |

## P3 — Analitik baru
| # | Item | Est | Status | Evidence |
|---|------|-----|--------|----------|
| P3-1 | Ketahanan pangan 3 pilar Bapanas | L | ❌ | Butuh populasi+kalori |
| P3-2 | RMU (rice milling unit) | M | ❌ | Butuh data perizinan |
| P3-3 | Katam + LTT bulanan | L | ❌ | `/ltt` masih ComingSoon |
| P3-4 | Nilai ekonomi triwulan | L | ❌ | Butuh rilis kwaran BPS |
| P3-5 | Domba Batur vs lokal | M | ❌ | Butuh DPKet/Disetnakvan |
| P3-6 | Poultry shop, ikan hias | M | ❌ | Butuh direktori |
| P3-7 | Modul bantuan level detail | L | 🟡 | 3 tabel bantuan ada, level detail belum |

## P4 — Infrastruktur & tata kelola
| # | Item | Est | Status | Evidence |
|---|------|-----|--------|----------|
| P4-1 | **Deploy API + MySQL ke produksi** | L | 🔴 **BLOCKER** | Backend :4100 + MariaDB LIVE di dev; produksi masih statik dist/ + CSV. Blocker = keputusan hosting (VPS/panel) + hardening — butuh keputusan user |
| P4-2 | RBAC multi-admin | M | 🟡 | `requireAdmin` ada, tapi belum users/roles table |
| P4-3 | Master data petani/lahan digital | L | ❌ | `/master-*` semua ComingSoon |
| P4-4 | Monitoring & early-warning | L | ❌ | Butuh integrasi lapangan |

---

## Prioritas Selanjutnya (urut roadmap pengembangan.md)
> 1. **P2-5 kawasan hortikultura** (M; data horti_produksi + polygon desa tersedia) — P1-3 ✅ & P1-5 panel ✅ selesai 22 Sep
> 2. **P4-1 deploy produksi** → 🔴 **blocker utama seluruh roadmap — menunggu keputusan hosting user**
> 3. **P2-4 restrukturisasi kelapa deres/porang** (M; data BPS perkebunan ada) → lalu P3 sesuai data dinas
> 4. **P2-6 rules kelayakan & BAST bantuan** (menunggu data sospol/detail dinas)
> 5. P2-2/P2-3 sedang berjalan di sesi lain (nilai-ekonomi harga + data varietas 23 Sep); P3/P4 sisanya mengikuti ketersediaan data dinas

<!-- AUTO-SYNC dari public/gap-analysis-master.md + pengembangan.md (22 Sep 2026) -->

---

## Gap Analysis Master Checklist (dari `gap-analysis-master.md`)
> Matrix 5 Bidang pertanian × 4 Submenu — cross-check kode (`git log`) + tsc.

### ✅ Selesai (prioritas selanjutnya setelah P1-1/P1-2)
| Bidang.Submenu | Fitur | Status | File |
|----------------|-------|--------|------|
| 4.Peternakan.SusuKulit | Produksi susu & kulit per kelompok ternak | ✅ **DONE** | `peternakan.js:118`, `peternakan-susu-kulit.tsx`, route di `App.tsx`, menu di `site.ts` (commit `9ef39ab`) |
| 4.Peternakan.AuditLog | Endpoint `/admin/sync-log` + panel admin | ✅ **DONE** | `admin.js` + `admin.tsx` |
| 4.Peternakan.ArusTernak | `/livestock-flow` (lalu lintas + pemotongan) | ✅ | `livestock-flow.tsx` |

### 🟡 Sebagian (ada data dasar, butuh hilirisasi)
| Bidang.Submenu | Fitur | Status | Catatan |
|----------------|-------|--------|---------|
| 1.TanamanPangan.Komoditas | Komoditas unggulan (varietas padi/jagung) | 🟡 | Butuh data varietas — belum ada fetcher |
| 1.TanamanPangan.NilaiEkonomi | Nilai ekonomi (triwulan/TP) | 🟡 | Estimasi via `/nilai-ekonomi/:bidang` (7540f50, harga referensi indikatif); rilis kwaran BPS belum |
| 1.TanamanPangan.Kalender | Kalender tanam (Katam/LTT) | 🟡 | Katam data belum; LTT masih ComingSoon |
| 3.Perkebunan.KelapaDeres | Kelapa sawit & kelapa deres | 🟡 | `/plantation` ada, belum dipisah deres/porang |
| 5.Perikanan.BreakdownIkan | Lele/Nila/Bandeng/Mujair/Tongkol | 🟢 | SELESAI 22 Sep via kategori "Jenis Ikan" `/fisheries` + `src/data/produk-ikan.ts` (air tawar: estimasi pangsa; laut: katalog pasar) |
| 6.KetahananPangan.TigaPilar | Ketersediaan, akses, nutriensi (Bapanas) | ❌ | Hanya neraca beras + lumbung |
| 8.BantuanSarpras.Detail | Detail barang (merk/tipe/harga/APBD) | 🟡 | 3 tabel bantuan ada, detail relasional belum |
| 9.AdminUpload.RBAC | Multi-role users/admin | 🟡 | `requireAdmin` ada, belum users/roles table |

### ❌ Belum mulai (butuh data dinas/BPS)
| Bidang.Submenu | Fitur | Blocker |
|----------------|-------|---------|
| 2.Hortikultura.Dieng | 8 komoditas sayur Dieng (kentang/kubis/wortel/tomat/cabai) | Butuh data BPS folder Hortikultura |
| 5.Perikanan.MinaPadi | Kolam + lahan pertanian | Butuh layer geojson `ikan_kolam` + data |
| 5.Perikanan.IkanHias | Pemetaan kolam ikan hias dinamis | Butuh direktori/layer khusus |
| 6.KetahananPangan.FSVA | Fluktuasi harga, Supply/Volume/Area | Butuh data harian BPS |
| 7.Penyuluhan.KWT | Kelompok Wanita Tani | Butuh data DKPP dinas |
| 9.AdminUpload.Template | Template Excel/CSV per bidang | ✅ **DONE** | `database/template-import-export/` 16 domain/37 tabel + generator reuse engine dasbor; round-trip import 15/15 PASS (d2e1a67) |
| 9.AdminUpload.FormUpload | Form upload file interactive | ✅ **DONE** | Dasbor admin Excel 15 domain (template/export/import/upsert, E2E 15/15 PASS) — f39802e + 2eabac6 |

---

### Ringkasan (cross-check kode HEAD `beaf52b`):
- **Bidang sudah ada (≥70%)**: Tanaman Pangan, Livestock (data populasi — minus hilirisasi)
- **Bidang sebagian ada (20-60%)**: Hortikultura, Perkebunan, Perikanan, Ketahanan, Kelembagaan
- **Bidang minim/belum**: Bantuan & Sarpras, Admin & Upload (RBAC/template)
- **Yang baru selesai 22 Sep**: P1-1 Susu & Kulit Ternak ✅ P1-2 Audit Log ✅ (`9ef39ab`) · Template Excel 16 domain ✅ (`d2e1a67`) · Komoditas-unggulan UI ✅ (`9c37e6c`) · Nilai-ekonomi per bidang ✅ (`7540f50` + `181e4ec`) · **P2-1 Jenis Ikan /fisheries ✅ (`beaf52b`)** · **P1-4 Estimasi Telur desa ✅ + P2-1 selaras master §3.2 ✅**
