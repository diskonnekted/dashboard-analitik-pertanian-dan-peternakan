# Tampilkan baris mentah yang mengandung kata tertentu pada rentang halaman
# pakai: python scripts/scraping/pdf-grep.py <pdf> <start> <end> <kata>
import sys

from pypdf import PdfReader

path, start, end, needle = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4].lower()
reader = PdfReader(path)
for p in range(start - 1, min(end, len(reader.pages))):
    text = reader.pages[p].extract_text() or ""
    for ln in text.splitlines():
        if needle in ln.lower():
            print(f"hal {p+1}: {repr(ln)}")
