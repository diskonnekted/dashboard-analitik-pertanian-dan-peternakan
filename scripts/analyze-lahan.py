import json, re

lahan = json.load(open(r'I:\pertanian\pertanian-2\public\data\lahan-fallback.json', encoding='utf-8-sig'))
area = json.load(open(r'I:\pertanian\pertanian-2\data-source\desa-area.json', encoding='utf-8-sig'))

def normkey(kec, desa):
    k = re.sub(r'[^A-Za-z]', '', kec).upper()
    d = re.sub(r'[^A-Za-z]', '', desa).upper()
    return f"{k}|{d}"

print("total desa:", len(lahan))
flagged = 0
nomatch = 0
rows = []
for d in lahan:
    key = normkey(d['kecamatan'], d['desa'])
    phys = area.get(key)
    jumlah = float(d['jumlah'])
    if phys is None:
        nomatch += 1
        rows.append((d['kecamatan'], d['desa'], jumlah, None, None))
        continue
    ratio = jumlah / phys if phys > 0 else 0
    if jumlah > phys * 1.2:
        flagged += 1
        rows.append((d['kecamatan'], d['desa'], jumlah, phys, ratio))

print("flagged (jumlah > 1.2x fisik):", flagged)
print("no match:", nomatch)
print()
print(f"{'KEC':16} {'DESA':24} {'JUMLAH':>12} {'FISIK':>10} {'RASIO':>7}")
for kec, desa, jumlah, phys, ratio in rows:
    if phys is None:
        print(f"{kec:16} {desa:24} {jumlah:12.1f} {'-':>10} {'-':>7}")
    else:
        print(f"{kec:16} {desa:24} {jumlah:12.1f} {phys:10.1f} {ratio:6.2f}x")
