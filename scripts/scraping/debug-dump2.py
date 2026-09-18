import re, sys, os
from pypdf import PdfReader
SRC = r'I:\pertanian\pertanian-2\data-source'
os.makedirs(r'I:\pertanian\pertanian-2\data-source\_debug', exist_ok=True)

def dump(pdf, pattern_str, label):
    reader = PdfReader(pdf)
    pages = [p.extract_text() or '' for p in reader.pages]
    pat = re.compile(pattern_str, re.I)
    hits = []
    for i, tx in enumerate(pages):
        if pat.search(tx):
            hits.append((i, tx))
    # write all hits
    for j, (i, tx) in enumerate(hits):
        with open(rf'I:\pertanian\pertanian-2\data-source\_debug\{label}-p{i}.txt', 'w', encoding='utf-8') as f:
            f.write(tx)
    print(label, 'pages', [i for i,_ in hits])

for kec in ['pagentan', 'pagedongan', 'madukara', 'wanayasa', 'bawang', 'karangkobar']:
    pdf = os.path.join(SRC, f'hasil-sensus-pertanian-2023-kecamatan-{kec}.pdf')
    dump(pdf, r'Rumah Tangga Petani dan Petani Menurut Desa', kec)
