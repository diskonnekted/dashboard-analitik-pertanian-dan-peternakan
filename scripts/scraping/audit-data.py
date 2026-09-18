"""Audit reliabilitas data peta SISPERTANI.
Cek: struktur, nilai kosong/null/negatif, NaN, duplikat, koordinat valid, dan
cakupan (setiap desa geojson harus punya data di lahan & st2023).
"""
import json
import os
import collections
import math

BASE = r'I:\pertanian\pertanian-2\public'
BOLD = lambda s: f"\n===== {s} ====="

def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def nan_or_empty(v):
    if v is None:
        return 'null'
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return 'nan/inf'
    return None

def report_numeric(rows, fields, label):
    """For each field, count null/empty/negative."""
    print(f"  [{label}] {len(rows)} baris")
    for f in fields:
        empty = sum(1 for r in rows if nan_or_empty(r.get(f)) is not None)
        neg = sum(1 for r in rows if isinstance(r.get(f), (int, float)) and r[f] < 0)
        zero = sum(1 for r in rows if r.get(f) == 0)
        flag = ''
        if empty: flag += f' EMPTY={empty}'
        if neg: flag += f' NEG={neg}'
        print(f"    {f:22s} zero={zero:4d}{flag}")

print(BOLD("1) LAHAN (lahan-fallback.json)"))
lahan = load(os.path.join(BASE, 'data', 'lahan-fallback.json'))
print(f"  total baris: {len(lahan)}")
report_numeric(lahan, ['lahanSawah', 'lahanBukanSawah', 'jumlah'], 'lahan')
# desa with sawah=0 AND nonSawah=0 AND jumlah>0 (pola "rincian tak tersedia")
anom = [x for x in lahan if x['lahanSawah'] == 0 and x['lahanBukanSawah'] == 0 and x['jumlah'] > 0]
print(f"  pola sawah=0 && nonSawah=0 && jumlah>0: {len(anom)}", [f"{x['kecamatan']}/{x['desa']}" for x in anom][:10])
print(f"  desa sama sekali 0 (jumlah=0): {sum(1 for x in lahan if x['jumlah']==0)}")

print(BOLD("2) ST2023 DESA (st2023-desa-fallback.json)"))
st = load(os.path.join(BASE, 'data', 'st2023-desa-fallback.json'))
if isinstance(st, dict):
    st = st.get('data') or []
print(f"  total baris: {len(st)}")
keys = list(st[0].keys())
print(f"  keys: {keys}")
# numeric fields detection
numfields = [k for k in keys if isinstance(st[0].get(k), (int, float))]
report_numeric(st, numfields, 'st2023')

print(BOLD("3) KELOMPOK TANI (kelompok-tani-fallback.json)"))
kt = load(os.path.join(BASE, 'data', 'kelompok-tani-fallback.json'))
print(f"  total baris: {len(kt)}")
if kt:
    ktk = list(kt[0].keys())
    print(f"  keys: {ktk}")
    numfields = [k for k in ktk if isinstance(kt[0].get(k), (int, float))]
    report_numeric(kt, numfields, 'kelompok-tani')
    # tahun coverage
    print(f"  tahun:", collections.Counter(str(x.get('tahun')) for x in kt))

print(BOLD("4) KELOMPOK TANI HUTAN (kelompok-tani-hutan.json)"))
kh = load(os.path.join(BASE, 'data', 'kelompok-tani-hutan.json'))
print(f"  total baris: {len(kh)}")
if kh:
    khk = list(kh[0].keys())
    print(f"  keys: {khk}")
    numfields = [k for k in khk if isinstance(kh[0].get(k), (int, float))]
    report_numeric(kh, numfields, 'kth')

print(BOLD("5) GEOJSON UTAMA"))
geo = load(os.path.join(BASE, 'peta_desa_v3.geojson'))
feats = geo['features']
print(f"  desa features: {len(feats)}")
badcoord = []
latall = []; lngall = []
for f in feats:
    g = f.get('geometry')
    if not g:
        badcoord.append('no-geom'); continue
    coords = g.get('coordinates')
    if g['type'] == 'Polygon':
        pts = coords[0]
    elif g['type'] == 'MultiPolygon':
        pts = [p for poly in coords for p in poly[0]]
    else:
        pts = []
    for lon, lat in pts:
        latall.append(lat); lngall.append(lon)
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            badcoord.append('out-of-range')
if latall:
    print(f"  koord lat range: {min(latall):.4f} .. {max(latall):.4f}")
    print(f"  koord lng range: {min(lngall):.4f} .. {max(lngall):.4f}")
print(f"  koord invalid: {len(badcoord)}")

print(BOLD("6) GEOJSON AUX (kec, sawah, kebun, ladang, danau, bangunan, tonggak, pasar, sungai, air, jalan)"))
aux_files = {
    'peta_kecamatan': 'peta_kecamatan.geojson',
    'sawah': 'sawah.geojson',
    'kebun': 'kebun.geojson',
    'ladang': 'ladang.geojson',
    'danau': 'danau.geojson',
    'bangunan_area': 'bangunan_area.geojson',
    'tonggak': 'tonggak-kilometer.geojson',
    'pasar': 'data/pasar-banjarnegara.geojson',
    'sungai': 'sungai.geojson',
    'air-permukaan': 'banjarnegara-air-permukaan.geojson',
    'jalan': 'jalan.geojson',
}
for k, fn in aux_files.items():
    p = os.path.join(BASE, fn)
    try:
        g = load(p)
        n = len(g.get('features', []))
        gt = collections.Counter(f['geometry']['type'] for f in g.get('features', []))
        print(f"  {k:14s} {n:6d} fitur  geom={dict(gt)}")
    except Exception as e:
        print(f"  {k:14s} ERROR {e}")

print(BOLD("7) CAKUPAN: setiap desa geojson punya data lahan & st2023?"))
def clean_kec(s):
    return (s or '').lower().replace('kecamatan','').replace('kec.','').replace('kec','').replace('.','').replace(' ','').replace('-','')
def sanitize(s):
    return s.replace(' ','').replace('-','').replace('A','').replace('E','').replace('I','').replace('O','').replace('U','')
def geo_name(f):
    n = (f['properties'].get('Nama_Desa_') or f['properties'].get('Name') or '')
    return n.upper().replace('DESA ','').replace('KELURAHAN ','').strip()
def geo_kec(f):
    return f['properties'].get('Kecamatan','') or ''
def match_name(gkec, gname, dkec, dname):
    if not (clean_kec(gkec) == clean_kec(dkec) or clean_kec(gkec) in clean_kec(dkec) or clean_kec(dkec) in clean_kec(gkec)):
        return False
    dn = dname.upper().strip()
    if dn in gname and len(dn) > 2:
        return True
    gs, ds = sanitize(gname), sanitize(dn)
    return len(ds) > 3 and (ds in gs or gs in ds)

missing_lahan = []
missing_st = []
empty_lahan_val = []
for f in feats:
    gk, gn = geo_kec(f), geo_name(f)
    ld = [x for x in lahan if match_name(gk, gn, x.get('kecamatan',''), x.get('desa',''))]
    sd = [x for x in st if match_name(gk, gn, x.get('kecamatan',''), x.get('desa',''))]
    if not ld:
        missing_lahan.append(f"{gk}|{gn}")
    elif all((x['lahanSawah'] == 0 and x['lahanBukanSawah'] == 0) for x in ld):
        empty_lahan_val.append(f"{gk}|{gn}")
    if not sd:
        missing_st.append(f"{gk}|{gn}")
print(f"  desa geojson: {len(feats)}")
print(f"  TANPA data lahan: {len(missing_lahan)} {missing_lahan[:20]}")
print(f"  lahan 0 semua:    {len(empty_lahan_val)} {empty_lahan_val[:20]}")
print(f"  TANPA data st2023:{len(missing_st)} {missing_st[:20]}")
