#!/usr/bin/env python3
"""Tampilkan baris lahan-fallback.json untuk satu kecamatan.
pakai: python show-fallback.py [namaKecamatan]"""
import json
import sys

kec = sys.argv[1] if len(sys.argv) > 1 else None
with open("public/data/lahan-fallback.json", encoding="utf-8") as f:
    rows = json.load(f)
for r in rows:
    if kec is None or r["kecamatan"].lower() == kec.lower():
        print("{:<22} sawah={:>12} bukan={:>12} jumlah={:>12} tahun={}".format(
            r["desa"], r["lahanSawah"], r["lahanBukanSawah"], r["jumlah"], r.get("tahun")))
