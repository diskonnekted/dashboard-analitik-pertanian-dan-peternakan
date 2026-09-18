#!/usr/bin/env python3
"""Simulasi logika matching MapWidget (getDesaData/getDesaSt2023) terhadap
geojson + fallback JSON — memastikan semua desa Kalibening/Banjarmangu ketemu."""
import json
import re

with open("public/peta_desa_v3.geojson", encoding="utf-8") as f:
    geo = json.load(f)
with open("public/data/lahan-fallback.json", encoding="utf-8") as f:
    lahan = json.load(f)
with open("public/data/st2023-desa-fallback.json", encoding="utf-8") as f:
    extra = json.load(f)


def norm_geo_desa(s):
    return s.upper().replace("DESA ", "").replace("KELURAHAN ", "").strip()


def sanitize(s):
    return re.sub(r"[AEIOU\s-]", "", s.upper())


def kec_match(geo_kec, data_kec):
    # meniru isKecamatanMatch di MapWidget.tsx persis
    def clean(s):
        return re.sub(r"kecamatan|kec|\.|\s|-", "", s.lower())
    g, d = clean(geo_kec), clean(data_kec)
    return g == d or d in g or g in d


def match(geo_name, geo_kec, rows):
    g = norm_geo_desa(geo_name)
    for d in rows:
        if d["desa"] and len(d["desa"]) > 2 and d["desa"].upper().strip() in g and kec_match(geo_kec, d["kecamatan"]):
            return d
    gs = sanitize(g)
    for d in rows:
        ds = sanitize(d["desa"])
        if len(ds) > 3 and kec_match(geo_kec, d["kecamatan"]) and (ds in gs or gs in ds):
            return d
    return None


for kec in ["Kalibening", "Banjarmangu", "Purwareja"]:
    feats = [f for f in geo["features"] if kec.upper() in f["properties"].get("Kecamatan", "").upper()]
    print(f"--- {kec}: {len(feats)} desa di geojson ---")
    miss_lahan, miss_extra = [], []
    for f in feats:
        p = f["properties"]
        nm = p.get("Nama_Desa_", p.get("Name", ""))
        if not match(nm, p.get("Kecamatan", ""), lahan):
            miss_lahan.append(nm)
        if not match(nm, p.get("Kecamatan", ""), extra):
            miss_extra.append(nm)
    print(f"  lahan tidak match : {miss_lahan or 'SEMUA OK'}")
    print(f"  extra tidak match : {miss_extra or 'SEMUA OK'}")
