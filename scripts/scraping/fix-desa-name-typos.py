"""Correct known desa-name typos across data files so they match geojson:
  - PUCUNGBEDUG  -> PUCUNGBEDUK  (Purwanegara)  [geojson: Desa Pucungbeduk]
  - KARANTENGAH  -> KARANGTENGAH (Batur)        [geojson: Desa Karangtengah]
  - messy PARAKANCANGGAH full-address string   -> PARAKANCANGGAH (Banjarnegara kel)
"""
import json

BASE = r'I:\pertanian\pertanian-2\public\data'

RENAMES = {
    'PUCUNGBEDUG': 'PUCUNGBEDUK',
    'KARANTENGAH': 'KARANGTENGAH',
}

places = {
    'lahan-fallback.json': ['desa'],
    'kelompok-tani-fallback.json': ['desa'],
    'kelompok-tani-hutan.json': ['desa'],
}

for fn, fields in places.items():
    p = BASE + '\\' + fn
    with open(p, encoding='utf-8') as f:
        data = json.load(f)
    changed = 0
    for row in data:
        for field in fields:
            v = row.get(field)
            if isinstance(v, str):
                # clean the PARAKANCANGGAH full-address mess in hutan file
                if fn == 'kelompok-tani-hutan.json' and 'PARAKANCANGGAH' in v:
                    row[field] = 'PARAKANCANGGAH'
                    changed += 1
                elif v in RENAMES:
                    row[field] = RENAMES[v]
                    changed += 1
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{fn}: {changed} field(s) corrected')
