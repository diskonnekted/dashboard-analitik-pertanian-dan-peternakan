"""Bagian 2: koordinat geojson, cakupan lintas-sumber, duplikat."""
import json
import os
import collections
import math

BASE = r'I:\pertanian\pertanian-2\public'
def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)

geo = load(os.path.join(BASE, 'peta_desa_v3.geojson'))
feats = geo['features']
print(f"desa features: {len(feats)}")

def iter_points(f):
    g = f.get('geometry') or {}
    t = g.get('type')
    c = g.get('coordinates')
    if t == 'Polygon':
        for ring in c:
            for p in ring:
                yield p
    elif t == 'MultiPolygon':
        for poly in c:
            for ring in poly:
                for p in ring:
                    yield p

lats, lngs, bad = [], [], 0
for f in feats:
    for p in iter_points(f):
        lon, lat = p[0], p[1]
        lats.append(lat); lngs.append(lon)
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            bad += 1
print(f"koord lat: {min(lats):.4f}..{max(lats):.4f}  lng: {min(lngs):.4f}..{max(lngs):.4f}  invalid={bad}")

# duplikat nama desa per kecamatan di geojson
pairs = collections.Counter((f['properties'].get('Kecamatan',''), f['properties'].get('Nama_Desa_','')) for f in feats)
dup = [k for k,v in pairs.items() if v>1]
print(f"duplikat (kecamatan,desa) di geojson: {len(dup)} {dup[:10]}")

# ===== cakupan =====
lahan = load(os.path.join(BASE, 'data', 'lahan-fallback.json'))
st = load(os.path.join(BASE, 'data', 'st2023-desa-fallback.json'))
if isinstance(st, dict): st = st.get('data') or []

def clean_kec(s):
    return (s or '').lower().replace('kecamatan','').replace('kec.','').replace('kec','').replace('.','').replace(' ','').replace('-','')
def sanitize(s):
    return s.replace(' ','').replace('-','').replace('A','').replace('E','').replace('I','').replace('O','').replace('U','')
def geo_name(f):
    n = (f['properties'].get('Nama_Desa_') or f['properties'].get('Name') or '')
    return n.upper().replace('DESA ','').replace('KELURAHAN ','').strip()
def geo_kec(f):
    return f['properties'].get('Kecamatan','') or ''
def match(gk, gn, dk, dn):
    if not (clean_kec(gk)==clean_kec(dk) or clean_kec(gk) in clean_kec(dk) or clean_kec(dk) in clean_kec(gk)):
        return False
    dn2 = dn.upper().strip()
    if dn2 in gn and len(dn2)>2: return True
    gs, ds = sanitize(gn), sanitize(dn2)
    return len(ds)>3 and (ds in gs or gs in ds)

def find(dataset, gk, gn):
    return [x for x in dataset if match(gk, gn, x.get('kecamatan',''), x.get('desa',''))]

miss_lahan, miss_st, empty_lahan = [], [], []
# satu desa geojson -> satu entri lahan? cek multiple
multi_lahan = []
for f in feats:
    gk, gn = geo_kec(f), geo_name(f)
    ld = find(lahan, gk, gn); sd = find(st, gk, gn)
    if not ld: miss_lahan.append(f"{gk}|{gn}")
    else:
        if all(x['lahanSawah']==0 and x['lahanBukanSawah']==0 for x in ld): empty_lahan.append(f"{gk}|{gn}")
        if len(ld)>1: multi_lahan.append((f"{gk}|{gn}", len(ld)))
    if not sd: miss_st.append(f"{gk}|{gn}")

print(f"\nTANPA data lahan  : {len(miss_lahan)} {miss_lahan[:20]}")
print(f"lahan kosong semua: {len(empty_lahan)} {empty_lahan[:20]}")
print(f"TANPA data st2023 : {len(miss_st)} {miss_st[:20]}")
print(f"lahan >1 baris    : {len(multi_lahan)} {multi_lahan[:10]}")

# dua arah: data yg TIDAK cocok geojson (typo/data asing)
bad_lahan = [x for x in lahan if not any(match(geo_kec(f), geo_name(f), x['kecamatan'], x['desa']) for f in feats)]
bad_st = [x for x in st if not any(match(geo_kec(f), geo_name(f), x['kecamatan'], x['desa']) for f in feats)]
print(f"\ndata lahan tanpa padanan geojson : {len(bad_lahan)} {[(x['kecamatan'],x['desa']) for x in bad_lahan][:15]}")
print(f"data st2023 tanpa padanan geojson: {len(bad_st)} {[(x['kecamatan'],x['desa']) for x in bad_st][:15]}")
