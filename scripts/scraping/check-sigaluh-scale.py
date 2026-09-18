import json
lh = json.load(open(r'I:\pertanian\pertanian-2\data-source\lahan-st2023-sigaluh.json', encoding='utf-8'))
ar = json.load(open(r'I:\pertanian\pertanian-2\data-source\desa-area.json', encoding='utf-8'))
print('desa | jumlah(Ha) | fisik(Ha) | rasio')
for x in lh:
    key = 'SIGALUH|' + x['desa']
    fisik = ar.get(key)
    rat = x['jumlah'] / fisik if fisik else None
    flag = '  <-- OVER' if (fisik and x['jumlah'] > fisik * 1.15) else ('  <-- no-area' if not fisik else '')
    print(x['desa'].ljust(16), str(x['jumlah']).ljust(9), str(fisik).ljust(9), (('%.2f' % rat) if rat else '-') + flag)
