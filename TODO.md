# Checklist Pengembangan SISPERTANI — Status 22 Sep 2026 (commit HEAD = 4d82412)

> **Source of truth**: `public/pengembangan.md` (roadmap P1-P4, 17 item). Cross-check tiap item dengan kode (`git log`) + memory. Auto-update tiap ada perubahan commit.

Legenda: ✅ selesai · 🟡 sebagian · ❌ belum mulai · 🔴 blocker

---

## P1 — Quick wins (data ada di MySQL, tinggal endpoint + UI)
| # | Item | Est | Status | Evidence / File |
|---|------|-----|--------|-----------------|
| P1-1 | **Susu & kulit ternak** | S | ✅ **DONE** | `backend/src/routes/peternakan.js:118-130` (Σ=121.087); `src/pages/peternakan-susu-kulit.tsx`; route + menu di `App.tsx`/`config/site.ts`; commit `9ef39ab` |
| P1-2 | **Audit log admin** | S | ✅ | `backend/src/routes/admin.js` `/admin/sync-log` (requireAdmin); panel tabel di `src/pages/admin.tsx` |
| P1-3 | **Profil kelompok tani (detail)** | M | ❌ | Butuh `kth_detail` JSON + SIMLUH; route/fetcher belum ada |
| P1-4 | **Rasionalisasi telur & unggas** | S | ❌ | Butuh integrasi `st2023_desa.ternak` JSON; belum ada fetcher |
| P1-5 | **Peta kolam per desa** | M | 🟡 | `fisheries` ada, tapi layer kolam per-desa (`ikan_kolam`) belum |

## P2 — Data publik BPS/CKAN
| # | Item | Est | Status | Evidence |
|---|------|-----|--------|----------|
| P2-1 | Breakdown perikanan per jenis ikan | M | 🟢 | SELESAI 22 Sep: kategori "Jenis Ikan" di `/fisheries` — katalog 5 ikan air tawar (lokal; estimasi pangsa × volume BPS) + 4 ikan laut (pasar, tanpa volume) + harga referensi indikatif di `src/data/produk-ikan.ts`; BPS tidak publish per jenis (39 folder: hanya per tempat pemeliharaan/alat tangkap) → rincian per jenis = estimasi komposisi, bukan angka resmi |
| P2-2 | Nilai ekonomi multi-bidang | L | ❌ | Hanya perikanan di `/economic-value`; butuh pangan/hortikul/perkebunan |
| P2-3 | Komoditas unggulan per bidang | M | ❌ | Butuh data varietas padi/jagung |
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
| P4-1 | **Deploy API + MySQL ke produksi** | L | 🔴 **BLOCKER** | Backend :4100 dev; prod belum. MariaDB belum terpasang. |
| P4-2 | RBAC multi-admin | M | 🟡 | `requireAdmin` ada, tapi belum users/roles table |
| P4-3 | Master data petani/lahan digital | L | ❌ | `/master-*` semua ComingSoon |
| P4-4 | Monitoring & early-warning | L | ❌ | Butuh integrasi lapangan |

---

## Prioritas Selanjutnya (urut roadmap pengembangan.md)
> 1. **P1-1 → P1-2 → P1-4** → ✅ selesai (P1-1/P1-2 sudah commit `9ef39ab`)
> 2. **P4-1 deploy produksi** → 🔴 **SASEGOR — blocker utama seluruh roadmap**
> 3. P1-3, P1-5, lalu P2 sesuai ketersediaan data
> 4. P3/P4 sisanya mengikuti ketersediaan data dinas

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
| 1.TanamanPangan.NilaiEkonomi | Nilai ekonomi (triwulan/TP) | ❌ | Hanya produksi; butuh rilis kwaran BPS |
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
| 9.AdminUpload.Template | Template Excel/CSV per bidang | Butuh generate 5 template + import mapping |
| 9.AdminUpload.FormUpload | Form upload file interactive | Butuh validasi + schema mapping |

---

### Ringkasan (cross-check kode HEAD `4d82412` + `9ef39ab`):
- **Bidang sudah ada (≥70%)**: Tanaman Pangan, Livestock (data populasi — minus hilirisasi)
- **Bidang sebagian ada (20-60%)**: Hortikultura, Perkebunan, Perikanan, Ketahanan, Kelembagaan
- **Bidang minim/belum**: Bantuan & Sarpras, Admin & Upload (RBAC/template)
- **Yang baru selesai hari ini**: P1-1 Susu & Kulit Ternak ✅, P1-2 Audit Log ✅ (commit `9ef39ab`)
