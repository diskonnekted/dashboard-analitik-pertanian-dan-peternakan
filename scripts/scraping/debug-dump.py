import re, sys, glob, os
sys.path.insert(0, r'I:\pertanian\pertanian-2\scripts\scraping')
from importlib import util
spec = util.spec_from_file_location('ex', r'I:\pertanian\pertanian-2\scripts\scraping\extract-st2023-extra.py')
# just import utility pieces by exec-ing top part is messy; replicate minimal
from pypdf import PdfReader

SRC = r'I:\pertanian\pertanian-2\data-source'

def dump(pdf, pattern_str, expected, label):
    reader = PdfReader(pdf)
    pages = [p.extract_text() or '' for p in reader.pages]
    pat = re.compile(pattern_str, re.I)
    for i, tx in enumerate(pages):
        if pat.search(tx):
            print(f'==== {label} page {i} ====')
            print(tx)
            print()
            return
    print(f'==== {label} NOT FOUND ====')

for kec in ['pagentan', 'pagedongan', 'madukara', 'wanayasa', 'bawang', 'karangkobar']:
    pdf = os.path.join(SRC, f'hasil-sensus-pertanian-2023-kecamatan-{kec}.pdf')
    print(f'\n################ {kec.upper()} ################')
    dump(pdf, r'Rumah Tangga Petani dan Petani Menurut Desa', 2, kec+'-petani')
