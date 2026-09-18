import json, glob, os, re

area = json.load(open(r'I:\pertanian\pertanian-2\data-source\desa-area.json', encoding='utf-8'))
# area keys: "KEC|DESA"
kec_desa = {}
for k in area:
    kec, desa = k.split('|')
    kec_desa.setdefault(kec, set()).add(desa)

SRC = r'I:\pertanian\pertanian-2\data-source'
for f in sorted(glob.glob(os.path.join(SRC, 'st2023-extra-*.json'))):
    d = json.load(open(f, encoding='utf-8'))
    kec = d['data'][0]['kecamatan'] if d['data'] else f
    # normalize kec for comparison (remove spaces/non-alpha)
    kec_norm = re.sub(r'[^A-Z]', '', kec.upper())
    keys = set(e['desa'] for e in d['data'])
    keys_norm = set(k.split('#')[0] for k in keys)
    ref = set()
    for kk, ds in kec_desa.items():
        if re.sub(r'[^A-Z]', '', kk) == kec_norm:
            ref = ds
    missing = sorted(ref - keys_norm)
    extra = sorted(keys_norm - ref)
    dup = sorted(k for k in keys if '#' in k)
    status = 'OK' if not missing and not extra and not dup else 'ISSUE'
    print(f'{status:5} {kec:20} n={len(d["data"]):3} ref={len(ref):3} '
          f'missing={missing} extra={extra} dup={dup}')
