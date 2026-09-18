import re, importlib.util
from pypdf import PdfReader
spec = importlib.util.spec_from_file_location('ex', r'I:\pertanian\pertanian-2\scripts\scraping\extract-st2023-extra.py')
ex = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ex)

pdf = r'I:\pertanian\pertanian-2\data-source\hasil-sensus-pertanian-2023-kecamatan-karangkobar.pdf'
reader = PdfReader(pdf)
m99 = re.compile(r"Jumlah T\s*ernak pada Rumah Tangga Usaha Peternakan", re.I)
cont99 = re.compile(r"Continued\s+T\s*able\s+9\.9", re.I)

pages = [p.extract_text() or '' for p in reader.pages]
pi = -1
for i, tx in enumerate(pages):
    if m99.search(tx) and not ex.TOC_MARK.search(tx):
        pi = i
        break
print('first 9.9 page', pi)
pages_to_dump = [pi]
j = pi + 1
while j < len(pages) and cont99.search(pages[j]) and len(pages_to_dump) < 6:
    pages_to_dump.append(j)
    j += 1
print('ternak pages', pages_to_dump)

for pidx in pages_to_dump:
    tx = pages[pidx]
    # determine group
    group = None
    for keyword, cols in ex.TERNAK_COL_GROUPS:
        if keyword.lower() in tx.lower():
            group = cols
            break
    print(f'\n===== PAGE {pidx} group={group[0] if group else None} + ({len(group) if group else 0} cols) =====')
    for line in tx.splitlines():
        l = line.strip()
        if re.search(r'[A-Za-z]', l) and len(re.findall(ex.TOK, l)) >= 2:
            print('  ', l)
