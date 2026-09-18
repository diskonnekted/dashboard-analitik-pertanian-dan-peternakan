# Pindai PDF "Kabupaten Banjarnegara Dalam Angka" untuk tabel lahan.
# pakai: python scripts/scraping/pdf-scan.py public/kabupaten-banjarnegara-dalam-angka-2026.pdf [kata_kunci]
import re
import sys

from pypdf import PdfReader

path = sys.argv[1] if len(sys.argv) > 1 else "public/kabupaten-banjarnegara-dalam-angka-2026.pdf"
keyword = (sys.argv[2] if len(sys.argv) > 2 else "lahan").lower()

reader = PdfReader(path)
print(f"total halaman: {len(reader.pages)}")

# Pass 1: temukan halaman yang mengandung kata kunci lahan/sawah
hits = []
for i, page in enumerate(reader.pages):
    try:
        text = page.extract_text() or ""
    except Exception:
        continue
    low = text.lower()
    if keyword in low or "sawah" in low:
        # tangkap judul tabel bila ada (baris yg mengandung 'Tabel'/'Table')
        titles = [ln.strip() for ln in text.splitlines() if re.search(r"(?i)tabel|table", ln)]
        hits.append((i + 1, titles[:2]))

print(f"halaman dgn kata '{keyword}'/'sawah': {len(hits)}")
for p, titles in hits[:60]:
    print(f"  hal {p}: {titles}")
