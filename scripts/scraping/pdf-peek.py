# Cek apakah PDF punya text layer + tampilkan teks beberapa halaman
import sys

from pypdf import PdfReader

path = sys.argv[1]
reader = PdfReader(path)
print(f"pages: {len(reader.pages)}")
for p in [0, 5, 50, 150, 300]:
    if p >= len(reader.pages):
        continue
    try:
        text = reader.pages[p].extract_text() or ""
    except Exception as e:
        text = f"<error: {e}>"
    print(f"\n===== hal {p+1} ({len(text)} chars) =====")
    print(text[:600])
    # cek resources gambar
    try:
        res = reader.pages[p].get("/Resources")
        xobjs = res.get("/XObject") if res else None
        imgs = [k for k, v in (xobjs or {}).items() if v.get("/Subtype") == "/Image"]
        print(f"[gambar di hal: {len(imgs)}]")
    except Exception:
        pass
