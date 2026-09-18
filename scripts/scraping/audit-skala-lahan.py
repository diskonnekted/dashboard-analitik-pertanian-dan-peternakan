#!/usr/bin/env python3
"""Audit skala nilai lahan per kecamatan: tandai desa yang nilainya janggal
dibanding tetangganya (indikasi salah ribuan/desimal dari sumber CKAN)."""
import json
import statistics

with open("public/data/lahan-fallback.json", encoding="utf-8") as f:
    rows = json.load(f)

by_kec = {}
for r in rows:
    by_kec.setdefault(r["kecamatan"], []).append(r)

print(f"{'desa':22} {'kecamatan':22} {'sawah':>10} {'bukanSawah':>11} {'jumlah':>10}  catatan")
n_flag = 0
for kec, rs in sorted(by_kec.items()):
    for field in ("lahanSawah", "lahanBukanSawah"):
        vals = sorted(float(r[field]) for r in rs)
        med = statistics.median(vals)
        if med <= 0:
            continue
        for r in rs:
            v = float(r[field])
            # janggal: >= 8x median DAN >= 500 (hindari false positive kecamatan kecil)
            if v >= 8 * med and v >= 500:
                print(f"{r['desa']:22} {kec:22} {r['lahanSawah']:>10} {r['lahanBukanSawah']:>11} {r['jumlah']:>10}  {field}={v} vs median {med}")
                n_flag += 1
print(f"\ntotal flag: {n_flag}")
