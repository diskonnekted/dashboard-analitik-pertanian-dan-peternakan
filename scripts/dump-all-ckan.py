import json, urllib.request, re, sys, ssl

BASE = "https://opendata.banjarnegarakab.go.id"
_ctx = ssl._create_unverified_context()

pkgs = {
  'Pandanarum':   '5-1-luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-pandanarum',
  'Batur':        '5-1-luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-batur',
  'Punggelan':    'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-punggelan',
  'Pagedongan':   'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-pagedongan',
  'Wanayasa':     'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kecamatan-wanayasa',
  'Bawang':       'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-bawang',
  'Banjarnegara': 'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-banjarnegara',
  'Mandiraja':    'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-mandiraja',
  'Susukan':      'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kec-susukan',
  'Pagentan':     'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-kecamatan-pagentan',
  'Pejawaran':    'luas-lahan-pertanian-menurut-jenis-tanah-dan-desa-di-pejawaran-th-2023-2025',
  'Wanadadi':     'luas-lahan-sawah-menurut-jenis-tanah-dan-desa-kelurahan-di-kecamatan-wanadadi',
  'Purwanegara':  'data-luas-lahan-pertanian-di-kecamatan-purwanegara',
}

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
    return json.load(urllib.request.urlopen(req, timeout=60, context=_ctx))

def fetch_records(pkg):
    p = get(f"{BASE}/api/3/action/package_show?id={pkg}")
    res = None
    for r in p['result']['resources']:
        if str(r.get('datastore_active')) == 'True':
            res = r; break
    if not res:
        # fallback first resource
        res = p['result']['resources'][0]
    d = get(f"{BASE}/api/3/action/datastore_search?resource_id={res['id']}&limit=1000")
    return d['result']['records']

def parse(s):
    if s is None: return None
    if isinstance(s,(int,float)): return float(s)
    s = str(s).strip()
    if s in ('','-'): return None
    hasdot = '.' in s; hascomma = ',' in s
    if hasdot and hascomma:
        s = s.replace('.','').replace(',','.')
    elif hascomma:
        s = s.replace(',','.')
    elif hasdot:
        if re.match(r'^\d{1,3}(\.\d{3})+$', s):
            s = s.replace('.','')
    try:
        return float(s)
    except:
        return None

def field(r, names):
    for n in names:
        if n in r and r[n] not in (None,''):
            return r[n]
    for n in names:
        for k in r:
            if k.lower() == n.lower():
                return r[k]
    return None

for kec, pkg in pkgs.items():
    try:
        recs = fetch_records(pkg)
    except Exception as e:
        print(f"### {kec}: FETCH ERROR {e}")
        continue
    # latest year per desa
    latest = {}
    for r in recs:
        desa = field(r, ['Desa/Kelurahan','Desa','Nama Desa','Kelurahan'])
        if not desa: continue
        desa = str(desa).strip().upper()
        th = parse(field(r, ['Tahun','Thn','TAHUN']))
        if th is None: th = 0
        sawah = field(r, ['Lahan Sawah','Lahan sawah','Sawah'])
        bsawah = field(r, ['Lahan Bukan Sawah','Lahan bukan sawah','Bukan Sawah'])
        if desa not in latest or th > latest[desa]['th']:
            latest[desa] = {'th': th, 'sawah': sawah, 'bsawah': bsawah}
    print(f"\n===== {kec} ({len(latest)} desa) =====")
    for desa in sorted(latest):
        e = latest[desa]
        sv = parse(e['sawah']); bv = parse(e['bsawah'])
        print(f"  {desa:20} sawah_raw={str(e['sawah']):>14} bsawah_raw={str(e['bsawah']):>14} | parsed s={sv} b={bv}")
