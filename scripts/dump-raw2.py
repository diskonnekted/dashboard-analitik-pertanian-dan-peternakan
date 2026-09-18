import json
d = json.load(open(r'I:\pertanian\pertanian-2\data-source\ckan-raw-mandiraja.json', encoding='utf-16'))
# This file may contain the raw dump + stdout text. Find JSON array
if isinstance(d, list):
    recs = d
else:
    # wrapped
    recs = d.get('result', {}).get('records') if isinstance(d, dict) else None
    if recs is None:
        # it's the table text output; just print
        print(d)
        raise SystemExit
print("records:", len(recs))
# group by desa
from collections import defaultdict
g = defaultdict(list)
for r in recs:
    desa = r.get('Desa/Kelurahan') or r.get('desa') or r.get('DESA')
    g[desa].append(r)
for desa in sorted(g):
    for r in g[desa]:
        print(desa, '| ', 'sawah=', r.get('Lahan Sawah'), 'bsawah=', r.get('Lahan Bukan Sawah'), 'jumlah=', r.get('Jumlah'), 'thn=', r.get('Tahun'))
