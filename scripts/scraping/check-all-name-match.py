"""Detect typo name mismatches: for each data file, find entries whose (kecamatan, desa)
does not map to any geojson feature using the app's direct+sanitize matching."""
import json

BASE = r'I:\pertanian\pertanian-2'
geo = json.load(open(BASE + r'\public\peta_desa_v3.geojson', encoding='utf-8'))
feats = list(geo['features'])

FILES = [
    'lahan-fallback.json',
    'kelompok-tani-fallback.json',
    'kelompok-tani-hutan.json',
    'st2023-desa-fallback.json',
]

def clean_kec(s):
    return s.lower().replace('kecamatan', '').replace('kec.', '').replace('kec', '').replace('.', '').replace(' ', '').replace('-', '')

def sanitize(s):
    return s.replace(' ', '').replace('-', '').replace('A', '').replace('E', '').replace('I', '').replace('O', '').replace('U', '')

def geo_kec(f):
    return f['properties'].get('Kecamatan', '') or ''

def geo_nama(f):
    n = (f['properties'].get('Nama_Desa_') or f['properties'].get('Name') or '')
    return n.upper().replace('DESA ', '').replace('KELURAHAN ', '').strip()

def match(dkec, ddesa, f):
    gk = geo_kec(f)
    if gk:
        g = clean_kec(gk)
        c = clean_kec(dkec)
        if g and c and not (g == c or g in c or c in g):
            return False
    gn = geo_nama(f)
    dn = ddesa.upper().strip()
    if dn in gn and len(dn) > 2:
        return True
    gs = sanitize(gn)
    ds = sanitize(dn)
    if len(ds) > 3 and (ds in gs or gs in ds):
        return True
    return False

for fn in FILES:
    try:
        data = json.load(open(BASE + r'\public\data' + '\\' + fn, encoding='utf-8'))
    except FileNotFoundError:
        print(fn, 'MISSING'); continue
    if isinstance(data, dict):
        data = data.get('data') or []
    bad = []
    for d in data:
        desa = d.get('desa') or d.get('nama_desa') or d.get('name') or ''
        kec = d.get('kecamatan') or ''
        if not desa:
            continue
        if not any(match(kec, desa, f) for f in feats):
            bad.append((kec, desa))
    print(f'{fn}: {len(data)} rows, {len(bad)} UNMATCHED')
    for k, d in bad:
        print('   ', k, '|', d)
