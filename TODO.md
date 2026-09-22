# TODO Pengembangan SISPERTANI — Pantauan Sistematik
> Last update: 2026-09-22 — Ground truth: `git show HEAD` = commit `4d82412` (security). Kode P1-1/P1-2 sudah ada tapi belum di-commit (3 files modified).

Legenda status: ✅ selesai · 🔄 progres · 🟡 terlaploskan/belum mulai · 🔴 blocker

---

## P1 — Backend & Deploy (API live ke produksi)  **Prioritas utama**

### P1-1 🔄 Endpoint `ternak_susu_kulit` (selesai backend, belum UI)
| No | Task | Status | Catatan |
|----|------|--------|---------|
| 1.1 | Endpoint `GET /api/v1/peternakan/susu-kulit` | ✅ | Backend (peternakan.js:118-130) — Σ121.087 == DB |
| 1.2 | Commit 3 file modified | 🟡 | `peternakan.js`, `admin.js`, `server.js` — belum di-commit |
| 1.3 | Route fetcher di api.ts | 🟡 | Frontend `services/` belum ada fetcher peternakan |
| 1.4 | Halaman UI React (susu-kulit.tsx) | 🟡 | Ikut pola livestock.tsx (chart line, tooltip) |
| 1.5 | Route di App.tsx (`/peternakan/susu-kulit`) | 🟡 | Lazy import + Route baru |
| 1.6 | Deploy pscp + verifikasi MD5 | 🔴 | Tergantung commit 1.2 + build dist |

### P1-2 🔄 Endpoint `sync_log` (selesai backend, belum UI)
| No | Task | Status | Catatan |
|----|------|--------|---------|
| 2.1 | Endpoint `GET /api/v1/admin/sync-log` | ✅ | Backend (admin.js) — limit clamp 1-200, requireAdmin |
| 2.2 | Commit 3 file modified (gabungan 1.2) | 🟡 | Belum di-commit |
| 2.3 | Panel di halaman admin.tsx | 🟡 | Tabel sync-log di dasbor admin |
| 2.4 | Deploy + verifikasi | 🔴 | Tergantung commit |

### P1-3 🔴 Deploy API + MySQL ke produksi (KRITIS — P4-1 gap-analysis)
| No | Task | Status | Catat |
|----|------|--------|-------|
| 3.1 | Install XAMPP MariaDB di dev machine | 🔴 | Belum terpasang di mesin (Fase A catatan) |
| 3.2 | `database/schema.sql` (37 tabel) di produksi | 🔴 | Belum deploy DB ke server |
| 3.3 | Backend Express 4100 di produksi | 🔴 | Backend dev 4100 hidup, produksi belum |
| 3.4 | Kredensial di backend/.env (untracked) | ✅ | Sudah di-.gitignore:45 |
| 3.5 | deploy.ps1 baca env (bukan hardcode) | ✅ | commit `4d82412` fixed |
| 3.6 | `tsc` lolos + build dist/ bersih | 🔴 | Release build |
| 3.7 | deploy.ps1 (pscp) + bump bundle | 🔴 | ASCII-only path (jebakan en-dash dilarang) |
| 3.8 | Verifikasi MD5 local == live + curl endpoint | 🔴 | Pastikan bundle baru dimuat |
| 3.9 | Rollback plan (bundle lama masih ada) | 🔴 | Catat nama bundle sebelum ganti |

---

## P2 — Frontend & UX (React 19 + Vite 8)

### P2-1 🔄 Dasbor admin Excel 15 domain
| No | Task | Status | Catatan |
|----|------|--------|---------|
| 4.1 | Template Excel export (15 domain) | ✅ | Sudah jalan |
| 4.2 | Import → upsert (tidak timpa manual) | ✅ | Pola dipertahankan |
| 4.3 | Sync-log panel di UI | 🟡 | Tergantung P1-2 |

### P2-2 🟡 Map & visual desa
| No | Task | Status | Catatan |
|----|------|--------|---------|
| 5.1 | MapLibre OpenFreeMap (selesai) | ✅ | Bundle `BDT6zcw-` live |
| 5.2 | /desa/:kec/:nama polish | ✅ | 20 Sep 2026 |
| 5.3 | /desa/:kec/:nama map widget | 🟡 | MapWidget dashboard masih Leaflet (vs MapLibre) |

### P2-3 🟡 Endpoint statistik hilang
| No | Task | Status |
|----|------|--------|
| 6.1 | Endpoint `/peternakan/susu-kulit` UI | 🟡 | P1-1 |
| 6.2 | Endpoint `/admin/sync-log` UI | 🟡 | P1-2 |

---

## P3 — Data & ETL (Node import/, 37 tabel schema)

### P3-1 🔄 Fase A migrasi MySQL
| No | Task | Status |
|----|------|--------|
| 7.1 | `schema.sql` (37 tabel) — selesai | ✅ |
| 7.2 | ETL Node di `database/import/` | ✅ | Dry-run 0 warning ~19.500 baris |
| 7.3 | Installer `ternak_susu_kulit` di ETL | ✅ | Tabel ada di schema (git show HEAD) |
| 7.4 | Importer upsert tidak timpa manual | ✅ | Aturan kolom sumber |
| 7.5 | `lahan_desa` ST2023 regen (278 desa) | ✅ | commit `0bc1775` (belum di-main, tapi verified) |
| 7.6 | Analisa lahan kritis T4.10 | ✅ | commit `231273e` |
| 7.7 | MySQL belum terpasang di mesin dev | 🔴 | Blocker Fase A/Fase B |

### P3-2 🟡 Kualitas data
| No | Task | Status | Catatan |
|----|------|--------|---------|
| 8.1 | perumahan/sentra pasar (geojson 36 titik) | ✅ | supply-chain sudah benar |
| 8.2 | supply-chain koridor hardcoded | 🟡 | TAPI data sudah benar (CKAN byte-identik) |

---

## P4 — Produksi & Keamanan (roadmap P4-1 prioritas tertinggi)

### P4-1 🔴 **Deploy API + MySQL ke produksi (KRITIS)**
→ Duplikat dari P1-3 di atas. Ini adalah **prio-1** dari keseluruhan roadmap.

### P4-2 🟡 Keamanan
| No | Task | Status |
|----|------|--------|
| 10.1 | Password SSH tidak hardcode di git | ✅ | commit `4d82412` |
| 10.2 | Rotasi password oleh user | 🟡 | PENDING |
| 10.3 | Restore WinDefend / pasang AV | 🔴 | Setelah malware cleanup 21 Sep |
| 10.4 | Full scan + ganti password semua | 🔴 |  |

### P4-3 🟡 Dokumen & gap
| No | Task | Status |
|----|------|--------|
| 11.1 | gap-analysis v4.0 sinkron kode | ✅ | 13 selesai / 7 parsial / 20 gap |
| 11.2 | `public/pengembangan.md` roadmap P1-P4 | ✅ | Updated 22 Sep |
| 11.3 | Sinkronkan TODO.md ↔ gap-analysis 2 arah | 🔄 | Ini file ini |

---

## Ringkasan Eksekutif (2026-09-22)
- **Status kode**: 32 endpoint statistik + backend p1-1/p1-2 **selesai tapi belum commit**; frontend belum ada UI peternakan/susu-kulit & sync-log.
- **Blocker utama**: deploy API+MySQL ke produksi (P4-1) — **prioritas #1 seluruh roadmap**.
- **Bug terbaru**: pscp en-dash folder (horticulture dropdown) sudah diperbaiki via rename ASCII (commit e765d99).
- **Catatan penting**: frontend `src/`, bukan `frontend/src/`; MapWidget dashboard masih Leaflet.

<!-- Generated 2026-09-22 — auto-update oleh assistant -->
