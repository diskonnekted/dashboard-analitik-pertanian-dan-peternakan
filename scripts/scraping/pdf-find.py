# Cari kemunculan frasa di seluruh PDF, tampilkan halaman + konteks baris
# pakai: python scripts/scraping/pdf-find.py <pdf> "frasa1" "frasa2" ...
import sys

from pypdf import PdfReader

path = sys.argv[1]
phrases = [p.lower() for p in sys.argv[2:]]
reader = PdfReader(path)
for i, page in enumerate(reader.pages):
    try:
        text = page.extract_text() or ""
    except Exception:
        continue
    low = text.lower()
    for ph in phrases:
        if ph in low:
            lines = [ln.strip() for ln in text.splitlines() if ph in ln.lower()]
            print(f"hal {i+1:4d} [{ph}]:")
            for ln in lines[:3]:
                print("    ", ln[:150])
