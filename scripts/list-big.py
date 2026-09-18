import json, re

lahan = json.load(open(r'I:\pertanian\pertanian-2\public\data\lahan-fallback.json', encoding='utf-8-sig'))
area = json.load(open(r'I:\pertanian\pertanian-2\data-source\desa-area.json', encoding='utf-8-sig'))

def normkey(kec, desa):
    k = re.sub(r'[^A-Za-z]', '', kec).upper()
    d = re.sub(r'[^A-Za-z]', '', desa).upper()
    return f"{k}|{d}"

print("=== desa dengan lahanSawah atau lahanBukanSawah >= 500 ===")
for d in lahan:
    s = float(d['lahanSawah'])
    b = float(d['lahanBukanSawah'])
    if s >= 500 or b >= 500:
        key = normkey(d['kecamatan'], d['desa'])
        p = area.get(key)
        print(f"{d['kecamatan']:16} {d['desa']:22} sawah={s:10.2f} bsawah={b:10.2f} jumlah={float(d['jumlah']):10.2f} fisik={p}")

print()
print("=== desa dengan jumlah >= 500 (semua) ===")
for d in lahan:
    j = float(d['jumlah'])
    if j >= 500:
        key = normkey(d['kecamatan'], d['desa'])
        p = area.get(key)
        print(f"{d['kecamatan']:16} {d['desa']:22} jumlah={j:10.2f} fisik={p}")
