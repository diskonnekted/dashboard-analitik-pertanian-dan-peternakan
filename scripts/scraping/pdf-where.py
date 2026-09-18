#!/usr/bin/env python3
"""Cari halaman PDF yang mengandung SEMUA pola regex yang diberikan.
pakai: python pdf-where.py <pdf> <pola1> [pola2] ... [--show N]"""
import re
import sys

from pypdf import PdfReader

pdf = sys.argv[1]
show = 600
if "--show" in sys.argv:
    i = sys.argv.index("--show")
    show = int(sys.argv[i + 1])
    del sys.argv[i:i + 2]
patterns = [a for a in sys.argv[2:] if not a.startswith("--")]

pages = [(p.extract_text() or "") for p in PdfReader(pdf).pages]
for i, t in enumerate(pages):
    if all(re.search(pat, t, re.I) for pat in patterns):
        print(f"===== hal {i} =====")
        print(t[:show] if show else "(match)")
