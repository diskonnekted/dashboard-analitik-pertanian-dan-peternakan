# -*- coding: utf-8 -*-
"""Dump Jumlah resmi + Sigma data per xlsx per tahun (tangkap & budidaya nilai & benih).
Output dipakai sebagai tabel pembanding SAHIH untuk verify-perikanan.cjs."""
import glob
import os
import re
import openpyxl

BASE = r"I:\pertanian\pertanian-2\public\14. Distankan KP"

KEC_VARIANTS = {
    "Purworejo Klampok": "Purwareja Klampok",
    "Purworejo Klp.": "Purwareja Klampok",
    "Purwonegoro": "Purwanegara",
}

def norm_kec(raw):
    s = re.sub(r"^\d+\.\s*", "", str(raw or "")).strip()
    toks = s.split()
    if len(toks) > 1 and all(len(t) == 1 for t in toks):
        s = "".join(toks)
    return KEC_VARIANTS.get(s, s)

def cell_num(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if not s or s in {"-", "\u2013"}:
        return None
    try:
        return float(s.replace(",", ""))
    except ValueError:
        return None

def extract(path, npairs):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    rows = [list(r) for r in ws.iter_rows(max_col=13, values_only=True)]
    wb.close()
    tahun = None
    for r in rows[:5]:
        for v in r:
            if v:
                m = re.search(r"Tahun\s*(\d{4})", str(v))
                if m:
                    tahun = m.group(1)
    unit_row = None
    for i, r in enumerate(rows[:12]):
        d = r[3] if len(r) > 3 else None
        if d and str(d).strip().startswith("Produksi"):
            unit_row = i
            break
    data, jumlah = [], None
    started = False
    for r in rows[unit_row + 1:]:
        a = str(r[0]).strip() if r[0] is not None else ""
        b = r[1] if len(r) > 1 else None
        if not a and not b:
            continue
        if a and set(a) <= {"."}:
            continue
        name = norm_kec(b)
        if not name:
            continue
        is_j = name.lower() == "jumlah"
        pairs = []
        for c in range(3, 3 + 2 * npairs, 2):
            prod = cell_num(r[c]) if len(r) > c else None
            nilai = cell_num(r[c + 1]) if len(r) > c + 1 else None
            if prod is not None and nilai is not None and prod > 0 and nilai / prod > 500:
                nilai = nilai / 1000.0  # samakan dengan regenerasi (unit-fix)
            pairs.append((prod, nilai))
        if is_j:
            jumlah = pairs
            break
        if not re.match(r"^\d+\.?$", a):
            if started:
                break
            continue
        started = True
        data.append((name, pairs))
    return tahun, data, jumlah

def report(folder, npairs, tag):
    print(f"### {tag}")
    for path in sorted(glob.glob(os.path.join(BASE, folder, "_tmp", "*.xlsx"))):
        tahun, data, jumlah = extract(path, npairs)
        if not data:
            continue
        sums = [0.0] * (2 * npairs)
        for _, pairs in data:
            for k, (p, n) in enumerate(pairs):
                sums[2 * k] += p or 0
                sums[2 * k + 1] += n or 0
        jstr = "-"
        verdict = []
        if jumlah:
            jstr = ";".join(f"{(p or 0):.2f}/{(n or 0):.2f}" for p, n in jumlah)
            for k in range(npairs):
                sp, sn = sums[2 * k], sums[2 * k + 1]
                jp = (jumlah[k][0] or 0) if jumlah[k] else 0
                jn = (jumlah[k][1] or 0) if jumlah[k] else 0
                tol = max(abs(jp), abs(jn), 1) * 0.005
                vp = "OK" if abs(sp - jp) <= tol else f"BEDA({sp:.2f}vs{jp:.2f})"
                vn = "OK" if abs(sn - jn) <= tol else f"BEDA({sn:.2f}vs{jn:.2f})"
                verdict.append(f"pair{k}:{vp}/{vn}")
        print(f"{tahun}: n={len(data)} SUM=[{';'.join(f'{v:.2f}' for v in sums)}] JUMLAH=[{jstr}] VERDICT=[{', '.join(verdict)}]")

report(r"Produksi dan Nilai Produksi Perikanan Tangkap Menurut Kecamatan dan Jenis Penangkapan", 4, "TANGKAP")
report(r"Produksi dan Nilai Produksi Perikanan Budidaya Menurut Kecamatan dan Jenis Budidaya", 3, "BUDIDAYA NILAI")
report(r"Distribusi Produksi Perikanan Hasil Obyek Pembenihan Ikan", 2, "BENIH")
