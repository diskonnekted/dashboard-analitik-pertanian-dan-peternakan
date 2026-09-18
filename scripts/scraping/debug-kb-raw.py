import re
from pypdf import PdfReader
pdf = r'I:\pertanian\pertanian-2\data-source\hasil-sensus-pertanian-2023-kecamatan-karangkobar.pdf'
reader = PdfReader(pdf)
pages = [p.extract_text() or '' for p in reader.pages]
for i in [311, 312]:
    print(f'\n############ RAW PAGE {i} ############')
    print(pages[i])
