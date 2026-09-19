# CHANGELOG

## 2026-09-20 — Corrected Economic Value Estimates & Data Fixes

### Bug Fixes
- **Livestock**: Sapi/Kambing calculated from all 7 years × 20 kecamatan (140× inflation). Now uses only 2024 data.
  - Sapi 2024: 21,052 ekor × Rp 18 jt = Rp 379 M (was Rp 3.35 T)
  - Kambing 2024: 205,618 ekor × Rp 3 jt = Rp 617 M (was Rp 4.25 T)
- **Fishery**: Replaced `ton × Rp 35,000` with actual production value from Distankan KP 2024 (Rp 919.2 M).
- **CSV Corrections**: 6 cells fixed in 2 CSV files:
  - 4 budidaya 2022 cells recorded in rupiah instead of thousand rupiah (÷1000)
  - 2 tangkap 2021 cells missing trailing zero digit (×10)
- **Horticulture**: Added badge "Agregat kabupaten · tidak mengikuti filter" to static county-level panel.

### Results
- Total economic estimate now realistic: ~Rp 1.5–2 T range (was Rp 9.59 T inflation)
- All values consistent with BPS KDA 2026 reference prices

### Files Changed
- `src/pages/recommendations.tsx`
- `src/pages/economic-value.tsx`
- `src/pages/horticulture.tsx`
- `src/utils/analysis.ts`
- `public/14. Distankan KP/*Perikanan*CSV.csv` (x2)
- `.gitignore`
