import re, sys
from pypdf import PdfReader
pdf = r'I:\pertanian\pertanian-2\data-source\hasil-sensus-pertanian-2023-kecamatan-pagentan.pdf'
reader = PdfReader(pdf)
print('pages', len(reader.pages))
pat = re.compile(r'Rumah Tangga Petani dan Petani Menurut Desa', re.I)
for i, p in enumerate(reader.pages):
    tx = p.extract_text() or ''
    if pat.search(tx):
        print(f'==== PAGE {i} ====')
        print(tx)
