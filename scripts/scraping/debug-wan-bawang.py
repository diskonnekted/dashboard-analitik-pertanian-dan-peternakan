import re, importlib.util
from pypdf import PdfReader

spec = importlib.util.spec_from_file_location('ex', r'I:\pertanian\pertanian-2\scripts\scraping\extract-st2023-extra.py')
ex = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ex)

def show(kec, pattern, label):
    pdf = rf'I:\pertanian\pertanian-2\data-source\hasil-sensus-pertanian-2023-kecamatan-{kec}.pdf'
    reader = PdfReader(pdf)
    pat = re.compile(pattern, re.I)
    for i, p in enumerate(reader.pages):
        tx = p.extract_text() or ''
        if pat.search(tx) and not ex.TOC_MARK.search(tx):
            print(f'\n======== {kec.upper()} :: {label} (page {i}) ========')
            # print desa-ish lines only
            for line in tx.splitlines():
                l = line.strip()
                if re.search(r'[A-Za-z]', l) and len(re.findall(ex.TOK, l)) >= 2:
                    print('   ', l)
            # also print Wanayasa/Tempuran/Pegergunung/Kutayasa/Winong raw lines
            for kw in ['Tempuran','Peger','Kutayasa','Winong','Wanayasa','Pelah']:
                for line in tx.splitlines():
                    if kw.lower() in line.lower():
                        print('   RAW>>', repr(line))
            break

show('wanayasa', r'Rumah Tangga Petani dan Petani Menurut Desa', 'petani')
show('bawang', r'Rumah Tangga Petani dan Petani Menurut Desa', 'petani')
