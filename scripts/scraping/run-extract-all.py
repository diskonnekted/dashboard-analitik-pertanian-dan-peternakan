import subprocess, os

PY = r'D:\Users\diskonekted\miniforge3\python.exe'
SRC = r'I:\pertanian\pertanian-2\data-source'
EXT = r'I:\pertanian\pertanian-2\scripts\scraping\extract-st2023-extra.py'

# kecamatan -> list of "--rename OLD=NEW" (PDF spelling/dup -> app canonical)
KECS = {
    'Batur': [],
    'Madukara': [],
    'Pagentan': [],
    'Pandanarum': [],
    'Wanadadi': [],
    'Karangkobar': ['PURWODADI=PURWADADI'],
    'Bawang': ['WINONG#2=KUTAYASA'],
    'Mandiraja': [],
    'Purwanegara': ['PUCUNGBEDUG=PUCUNGBEDUK'],
    'Banjarnegara': [],
    'Wanayasa': ['WANAYASA#2=TEMPURAN', 'PAGERGUNUNG=PEGERGUNUNG'],
    'Pagedongan': [],
    'Punggelan': [],
    'Sigaluh': ['SINGAMERTA=SINGOMERTO', 'TUNGGARA=TUNGGORO'],
    'Rakit': [],
    'Pejawaran': ['PEGUNDUNGAN=PAGUNDUNGAN', 'SARWODADI=SARWADADI'],
    'Susukan': ['PEKIKIRAN=PAKIKIRAN', 'PANERUSANKULON=PANARUSANKULON', 'PANERUSANWETAN=PANARUSANWETAN'],
}

failed = []
for kec, renames in KECS.items():
    nospace = kec.lower().replace(' ', '')
    pdf = os.path.join(SRC, f'hasil-sensus-pertanian-2023-kecamatan-{nospace}.pdf')
    out = os.path.join(SRC, f'st2023-extra-{nospace}.json')
    cmd = [PY, EXT, pdf, kec, out]
    for r in renames:
        cmd += ['--rename', r]
    r = subprocess.run(cmd, capture_output=True, text=True)
    err = r.stderr.strip()
    lines = [l for l in err.splitlines() if ('SELISIH' in l or 'PERINGATAN' in l or 'OK:' in l)]
    print(f'==== {kec} ====')
    for l in lines:
        print('   ', l)
    if 'SELISIH' in err or 'tidak menemukan' in err:
        failed.append(kec)
    print()

print('FAILED/REVIEW:', failed if failed else 'none')
