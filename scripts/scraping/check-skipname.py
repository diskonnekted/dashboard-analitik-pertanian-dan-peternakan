import re, json
SKIP_NAME = re.compile(
    r"(?i)district|kecamatan|village|subdistrict|desa|census|hasil|results|number|jumlah|tabel|table|able|http|catatan|note|lanjutan|continued|menurut|rumah|tangga|household|orang|person|pertanian|agricultur|livestock|fishery|petani|farmer|sensus|halaman|page|catatan|kelompok|group|ternak|perikanan|pupuk|fertilizer|anggota|member|pengelola|holder|usaha|holding"
)
area = json.load(open(r'I:\pertanian\pertanian-2\data-source\desa-area.json', encoding='utf-8'))
desas = set()
for k in area:
    desas.add(k.split('|')[1])
bad = [d for d in sorted(desas) if SKIP_NAME.search(d)]
print('FALSE POSITIVES (desa names that would be skipped):')
for d in bad:
    print('  ', d)
print('\nTotal skipped of', len(desas), 'desa:', len(bad))

# also find WHICH word matches for each
print('\n--- which word matches ---')
for d in bad:
    words = SKIP_NAME.pattern.split('|')
    hits = [w for w in words if re.search(w, d, re.I)]
    print(d, '->', hits)
