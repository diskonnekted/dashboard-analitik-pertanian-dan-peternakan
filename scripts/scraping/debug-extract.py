import re, importlib.util
from pypdf import PdfReader

spec = importlib.util.spec_from_file_location('ex', r'I:\pertanian\pertanian-2\scripts\scraping\extract-st2023-extra.py')
ex = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ex)

pdf = r'I:\pertanian\pertanian-2\data-source\hasil-sensus-pertanian-2023-kecamatan-pagentan.pdf'
reader = PdfReader(pdf)
pat = re.compile(r'Rumah Tangga Petani dan Petani Menurut Desa', re.I)
for i, p in enumerate(reader.pages):
    tx = p.extract_text() or ''
    if pat.search(tx) and 'Desa/Kelurahan' in tx and not ex.TOC_MARK.search(tx):
        print('PAGE', i)
        rows = ex.extract_rows(tx, 2, {})
        for r in rows:
            print(r)
        print('total', ex.total_row(tx, 2))
        # find raw line for Pagentan
        for line in tx.splitlines():
            if 'gentan' in line.lower():
                print('RAW LINE:', repr(line))
        break
