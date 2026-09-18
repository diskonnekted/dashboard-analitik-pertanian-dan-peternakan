#!/usr/bin/env python3
"""Hitung luas poligon desa dari geojson (aproksimasi planar pada lintang setempat)."""
import json
import math
import re
import sys

with open("public/peta_desa_v3.geojson", encoding="utf-8") as f:
    g = json.load(f)

KM_PER_DEG_LAT = 110.574


def ring_area_km2(ring, lat0):
    kx = 111.320 * math.cos(math.radians(lat0))
    ky = KM_PER_DEG_LAT
    area = 0.0
    n = len(ring)
    for i in range(n - 1):
        x1, y1 = ring[i][0] * kx, ring[i][1] * ky
        x2, y2 = ring[i + 1][0] * kx, ring[i + 1][1] * ky
        area += x1 * y2 - x2 * y1
    return abs(area) / 2


def feature_area_ha(feat):
    geom = feat.get("geometry")
    if not geom or "coordinates" not in geom:
        return 0.0
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    total = 0.0
    for poly in polys:
        lats = [pt[1] for ring in poly for pt in ring]
        lat0 = sum(lats) / len(lats)
        outer = ring_area_km2(poly[0], lat0)
        holes = sum(ring_area_km2(r, lat0) for r in poly[1:])
        total += outer - holes
    return total * 100  # km2 -> Ha


names = sys.argv[1:] or None
out = {}
for feat in g["features"]:
    p = feat["properties"]
    label = f"{p.get('Nama_Desa_','?')} ({p.get('Kecamatan','?')})"
    area = feature_area_ha(feat)
    if names and not any(n.upper() in label.upper() for n in names):
        continue
    if not names:
        desa = p.get("Nama_Desa_", "").upper()
        desa = re.sub(r"^(DESA|KELURAHAN|KEL)\.?\s*", "", desa)
        kec = re.sub(r"^KEC\.?\s*", "", p.get("Kecamatan", "").upper())
        key = re.sub(r"[^A-Z0-9]", "", kec) + "|" + re.sub(r"[^A-Z0-9]", "", desa)
        out[key] = round(area, 1)
        continue
    print(f"{label:45s} {area:10,.1f} Ha")

if not names:
    with open("data-source/desa-area.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=0, sort_keys=True)
    print(f"{len(out)} desa -> data-source/desa-area.json")
