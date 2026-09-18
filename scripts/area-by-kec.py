import json, re
area = json.load(open(r'I:\pertanian\pertanian-2\data-source\desa-area.json', encoding='utf-8-sig'))
for kec in ['BAWANG','MANDIRAJA','BANJARNEGARA','WANAYASA','PUNGGELAN','WANADADI']:
    print(f"=== {kec} ===")
    for k, v in sorted(area.items()):
        if k.startswith(kec + '|'):
            print(f"  {k.split('|')[1]:22} {v}")
