# Dump teks rentang halaman PDF
# pakai: python scripts/scraping/pdf-pages.py <pdf> <start> <end>
import sys

from pypdf import PdfReader

path = sys.argv[1]
start, end = int(sys.argv[2]), int(sys.argv[3])
reader = PdfReader(path)
for p in range(start - 1, min(end, len(reader.pages))):
    try:
        text = reader.pages[p].extract_text() or ""
    except Exception as e:
        text = f"<error: {e}>"
    print(f"\n========== HAL {p+1} ==========")
    print(text)
