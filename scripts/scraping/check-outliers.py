#!/usr/bin/env python3
"""Cari nilai luas lahan yang mencurigakan (kemungkinan masih m2 / salah skala)."""
import json

files = [
    "data-source/lahan-st2023-kalibening.json",
    "data-source/lahan-st2023-banjarmangu.json",
    "data-source/lahan-st2023-purwarejaklampok.json",
    "public/data/lahan-fallback.json",
]
for path in files:
    with open(path, encoding="utf-8") as f:
        j = json.load(f)
    rows = j["data"] if isinstance(j, dict) else j
    big = [r for r in rows if (r.get("jumlah") or r.get("luasLahan") or 0) > 2000]
    neg = [r for r in rows if (r.get("lahanSawah") or 0) < 0 or (r.get("lahanBukanSawah") or 0) < 0]
    print(f"--- {path}: {len(rows)} baris; jumlah>2000Ha: {len(big)}; negatif: {len(neg)}")
    for r in big[:10]:
        print(f"    BESAR: {r.get('desa')} / {r.get('kecamatan')}: sawah={r.get('lahanSawah')} bukan={r.get('lahanBukanSawah')} jumlah={r.get('jumlah') or r.get('luasLahan')}")
