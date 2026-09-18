import json, re, statistics

lahan = json.load(open(r'I:\pertanian\pertanian-2\public\data\lahan-fallback.json', encoding='utf-8-sig'))
area = json.load(open(r'I:\pertanian\pertanian-2\data-source\desa-area.json', encoding='utf-8-sig'))

def normkey(kec, desa):
    k = re.sub(r'[^A-Za-z]', '', kec).upper()
    d = re.sub(r'[^A-Za-z]', '', desa).upper()
    return f"{k}|{d}"

phys = [v for v in area.values() if isinstance(v,(int,float)) and v>0]
print("physical areas: min %.1f max %.1f median %.1f" % (min(phys), max(phys), statistics.median(phys)))

# distribution of jumlah and sawah/bsawah for desa where jumlah <= physical (i.e., presumably correct)
j_ok = []
j_bad = []
for d in lahan:
    key = normkey(d['kecamatan'], d['desa'])
    p = area.get(key)
    j = float(d['jumlah'])
    if p and p > 0 and j <= p*1.2:
        j_ok.append(j)
    else:
        j_bad.append((d['kecamatan'], d['desa'], j, p))

print("plausible jumlah: count %d min %.2f max %.1f median %.1f" % (len(j_ok), min(j_ok), max(j_ok), statistics.median(j_ok)))
print()
print("-- distribution of ALL lahanSawah & lahanBukanSawah values --")
sawah = [float(d['lahanSawah']) for d in lahan]
bsawah = [float(d['lahanBukanSawah']) for d in lahan]
svals = sawah + bsawah
svals.sort()
print("sawah/bsawah min %.2f max %.1f" % (min(svals), max(svals)))
import collections
buckets = collections.Counter()
for v in svals:
    if v < 10: buckets['<10']+=1
    elif v < 50: buckets['10-50']+=1
    elif v < 100: buckets['50-100']+=1
    elif v < 200: buckets['100-200']+=1
    elif v < 500: buckets['200-500']+=1
    elif v < 1000: buckets['500-1000']+=1
    else: buckets['>=1000']+=1
for k in ['<10','10-50','50-100','100-200','200-500','500-1000','>=1000']:
    print("  %-10s %d" % (k, buckets[k]))
