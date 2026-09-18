import json, re

area = json.load(open(r'I:\pertanian\pertanian-2\data-source\desa-area.json', encoding='utf-8'))

for f in ['karangkobar', 'madukara']:
    lah = json.load(open(rf'I:\pertanian\pertanian-2\data-source\lahan-st2023-{f}.json', encoding='utf-8'))
    print('==', f.upper(), '==')
    over = 0
    for e in lah:
        k = re.sub(r'[^A-Za-z]', '', e['kecamatan']).upper()
        d = re.sub(r'[^A-Za-z]', '', e['desa']).upper()
        fisik = area.get(f'{k}|{d}')
        flag = ''
        if fisik is not None and e['jumlah'] > fisik * 1.15:
            flag = '  <<< MELEBIHI fisik (perlu /10)'
            over += 1
        print(f"  {e['desa']:16} jumlah={e['jumlah']:9.2f} Ha  fisik={fisik}{flag}")
    print('  -> desa melebihi fisik:', over)
