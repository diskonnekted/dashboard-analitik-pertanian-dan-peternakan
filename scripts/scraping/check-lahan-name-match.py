"""Find lahan (lahan-fallback.json) entries whose desa name does not match any
geojson feature, replicating the app's getDesaData matching logic (direct + sanitize)."""
import json

BASE = r'I:\pertanian\pertanian-2'
lahan = json.load(open(BASE + r'\public\data\lahan-fallback.json', encoding='utf-8'))
geo = json.load(open(BASE + r'\public\peta_desa_v3.geojson', encoding='utf-8'))

feats = list(geo['features'])

def clean_kec(s):
    return s.lower().replace('kecamatan', '').replace('kec', '').replace('.', '').replace(' ', '').replace('-', '')

def sanitize(s):
    return s.replace(' ', '').replace('-', '').replace('A', '').replace('E', '').replace('I', '').replace('O', '').replace('U', '')

def geo_kec(f):
    return f['properties'].get('Kecamatan', '') or ''

def geo_nama(f):
    n = (f['properties'].get('Nama_Desa_') or f['properties'].get('Name') or '')
    return n.upper().replace('DESA ', '').replace('KELURAHAN ', '').strip()

def match(d, f):
    gk = geo_kec(f)
    ck = clean_kec(gk)
    dkc = clean_kec(d['kecamatan'])
    if gk and dkc:
        g, c = ck, d['kecamatan'].lower().replace('kecamatan', '').replace('kec', '').replace('.', '').replace(' ', '').replace('-', '')
        if not (g == c or g in c or c in g):
            return False
    gn = geo_nama(f)
    dn = d['desa'].upper().strip()
    if dn in gn and len(dn) > 2:
        return True
    gs = sanitize(gn)
    ds = sanitize(dn)
    if len(ds) > 3 and (ds in gs or gs in ds):
        return True
    return False

mismatched = []
for d in lahan:
    if not any(match(d, f) for f in feats):
        mismatched.append(d)

print('Total lahan entries:', len(lahan))
print('Unmatched (no geojson feature):', len(mismatched))
for d in mismatched:
    print(' ', d['kecamatan'], '|', d['desa'], '| sawah', d['lahanSawah'], '| nonSawah', d['lahanBukanSawah'], '| tahun', d['tahun'])
