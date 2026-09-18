import json

d = json.load(open('public/data/lahan-fallback.json', encoding='utf-8'))
s = sorted(d, key=lambda r: r['jumlah'])

print("=== 8 desa dengan lahan terkecil ===")
for r in s[:8]:
    print(f"{r['jumlah']:>10.3f}  {r['desa']:<18} {r['kecamatan']:<16} tahun {r['tahun']}")

print()
print("=== duplikat nama desa (sama nama beda kecamatan) ===")
seen = {}
for r in d:
    seen.setdefault(r['desa'], []).append((r['kecamatan'], r['jumlah'], r['tahun']))
for nama, lst in seen.items():
    if len(lst) > 1:
        for k, j, t in lst:
            print(f"  {nama:<18} {k:<16} {j:>8.3f}  tahun {t}")
        print()
