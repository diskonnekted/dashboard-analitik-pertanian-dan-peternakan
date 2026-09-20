# -*- coding: utf-8 -*-
"""
Regenerasi CSV perikanan Kab. Banjarnegara dari xlsx mentah BPS di _tmp.

Sumber (folder `public/14. Distankan KP`):
1. Produksi dan Nilai Produksi Perikanan Tangkap Menurut Kecamatan dan Jenis Penangkapan/_tmp/*.xlsx
   (Tabel 5.5.1/5.6.1, 2019-2024, 4 alat: Jala Tebar, Pancing, Jaring Ingsang, Lainnya;
   tiap alat = pasangan Produksi (kg) + Nilai Produksi (ribu rupiah)).
   -> menimpa CSV root (merge lama salah: 2021/2023/2024 kosong, tanpa rincian alat).

2. Produksi dan Nilai Produksi Perikanan Budidaya Menurut Kecamatan dan Jenis Budidaya/_tmp/*.xlsx
   (Tabel 5.5.3/5.6.3, 2019-2024, 3 jenis: Pembesaran, Karamba Jaring Apung, Minapadi Tumpang sari).
   -> menimpa CSV root (merge lama rusak: data geser + error unit xlsx tersalin apa adanya).

3. Luas dan Produksi Ikan Menurut Kecamatan dan Tempat Pemeliharaan/_tmp/
   "Luas dan Produksi Ikan Menurut Kecamatan dan Jenis Tempat Pemeliharaan CSV.csv"
   (sudah benar, 20 kec x 7 tahun) -> disalin ke root karena fetch URL meminta di root.

Koreksi yang diterapkan (dicatat lalu dilaporkan):
- Error unit BPS: jika nilai(ribu Rp)/produksi(kg) > 500 (harga > 500 ribu/kg mustahil),
  nilai dibagi 1000 (sel rupiah salah dimasukkan sebagai ribu rupiah).
- Nama kecamatan dinormalisasi: "B a w a n g" -> "Bawang", "Purworejo Klampok" -> "Purwareja
  Klampok", "Purwonegoro" -> "Purwanegara".
- Nilai "-" / kosong -> sel kosong (parser membaca 0).

Verifikasi otomatis: Sigma 20 kecamatan vs baris "Jumlah" resmi BPS per tahun per kolom.

Pemakaian:  D:/Users/diskonekted/miniforge3/python.exe scripts/regenerate-perikanan.py
"""
import csv
import glob
import os
import re
import shutil

import openpyxl

BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "14. Distankan KP")

TANGKAP_DIR = os.path.join(BASE, "Produksi dan Nilai Produksi Perikanan Tangkap Menurut Kecamatan dan Jenis Penangkapan")
BUDIDAYA_NILAI_DIR = os.path.join(BASE, "Produksi dan Nilai Produksi Perikanan Budidaya Menurut Kecamatan dan Jenis Budidaya")
TEMPAT_DIR = os.path.join(BASE, "Luas dan Produksi Ikan Menurut Kecamatan dan Tempat Pemeliharaan")
BENIH_DIR = os.path.join(BASE, "Distribusi Perikanan Hasil Obyek Pembenihan Ikan")  # fallback nama lama
BENIH_DIR2 = os.path.join(BASE, "Distribusi Produksi Perikanan Hasil Obyek Pembenihan Ikan")

KEC_VARIANTS = {
    "Purworejo Klampok": "Purwareja Klampok",
    "Purworejo Klp.": "Purwareja Klampok",
    "Purwonegoro": "Purwanegara",
}
ORDER_KEC = [
    "Susukan", "Purwareja Klampok", "Mandiraja", "Purwanegara", "Bawang",
    "Banjarnegara", "Pagedongan", "Sigaluh", "Madukara", "Banjarmangu",
    "Wanadadi", "Rakit", "Punggelan", "Karangkobar", "Pagentan",
    "Pejawaran", "Batur", "Wanayasa", "Kalibening", "Pandanarum",
]

fix_log = []   # catatan koreksi error unit
quirk_log = [] # catatan keanehan yang dibiarkan apa adanya


def norm_kec(raw):
    s = re.sub(r"^\d+\.\s*", "", str(raw or "")).strip()
    toks = s.split()
    if len(toks) > 1 and all(len(t) == 1 for t in toks):
        s = "".join(toks)
    return KEC_VARIANTS.get(s, s)


def cell_num(v):
    """Angka float dari sel xlsx; None/'-' -> None."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if not s or s in {"-", "–"}:
        return None
    s = s.replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


def round2(v):
    return None if v is None else round(v, 2)


def extract_sheet(path):
    """Ekstraksi satu file xlsx tahunan. Layout adaptif: cari baris 'Produksi (kg)'
    di kolom D; baris label = satu di atasnya; data = setelah baris (2)/(3).
    Return: (tahun, [ (kec_norm, is_jumlah, [(prod,nilai)x4]) ], label4, jumlah_row)."""
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
                    break
        if tahun:
            break
    if not tahun:
        raise RuntimeError(f"Tahun tidak ketemu di {path}")

    unit_row = None
    for i, r in enumerate(rows[:12]):
        d = r[3] if len(r) > 3 else None
        if d and str(d).strip().startswith("Produksi"):
            unit_row = i
            break
    if unit_row is None:
        raise RuntimeError(f"Baris header 'Produksi' tidak ketemu di {path}")

    label_row = rows[unit_row - 1]
    labels = [str(label_row[c]).strip() if label_row[c] else "" for c in (3, 5, 7, 9)]  # D,F,H,J

    data = []
    jumlah = None
    started = False
    for r in rows[unit_row + 1 :]:
        a = str(r[0]).strip() if r[0] is not None else ""
        b = r[1] if len(r) > 1 else None
        if not a and not b:
            continue  # baris kosong bisa jadi pemisah visual sebelum baris Jumlah
        if a and set(a) <= {"."}:
            continue  # baris pemisah "....." di dalam tabel (sebelum Jumlah)
        name = norm_kec(b)
        if not name:
            continue
        is_jumlah = name.lower() == "jumlah"
        pairs = []
        for c in (3, 5, 7, 9):  # D..K: (prod, nilai) x4
            prod = cell_num(r[c]) if len(r) > c else None
            nilai = cell_num(r[c + 1]) if len(r) > c + 1 else None
            if prod is not None and nilai is not None and prod > 0:
                ratio = nilai / prod
                if ratio > 500:  # error unit: rupiah masuk sebagai ribu rupiah
                    fixed = nilai / 1000.0
                    fix_log.append(
                        f"  [UNIT-FIX] {os.path.basename(path)} :: {name} :: {labels[(c - 3) // 2]} :: "
                        f"prod={prod:g} nilai={nilai:g} -> {fixed:g} (rasio {ratio:.0f}x)"
                    )
                    nilai = fixed
                elif ratio < 5:
                    quirk_log.append(
                        f"  [QUIRK murah?] {os.path.basename(path)} :: {name} :: {labels[(c - 3) // 2]} :: "
                        f"prod={prod:g} nilai={nilai:g} rasio={ratio:.2f} (dibiarkan)"
                    )
            if prod is not None and prod < 0:
                quirk_log.append(f"  [QUIRK negatif] {path} :: {name} :: prod={prod}")
            if nilai is not None and nilai < 0:
                quirk_log.append(f"  [QUIRK negatif] {path} :: {name} :: nilai={nilai}")
            pairs.append((prod, nilai))
        if is_jumlah:
            jumlah = (name, pairs)
            break
        if not re.match(r"^\d+\.?$", a):
            if started:
                break  # baris "Sumber Data" / footer tanpa nomor urut -> akhir tabel
            continue
        started = True
        data.append((name, pairs))

    return tahun, data, labels, jumlah


def sanitize_pairs(pairs):
    out = []
    for prod, nilai in pairs:
        p = round2(prod)
        n = round2(nilai)
        fmt = lambda x: "" if x is None else f"{x:.2f}".rstrip("0").rstrip(".")
        out.append(("", "") if p is None else (fmt(p), "" if n is None else fmt(n)))
    return out


def main():
    # ---------- 1. TANGKAP ----------
    print("=" * 90)
    print("TANGKAP — ekstraksi per alat (Tabel 5.5.1/5.6.1)")
    tangkap_rows = []
    for path in sorted(glob.glob(os.path.join(TANGKAP_DIR, "_tmp", "*.xlsx"))):
        tahun, data, labels, jumlah = extract_sheet(path)
        print(f"  {os.path.basename(path)} -> tahun {tahun}, {len(data)} kecamatan, label={labels}")
        if len(data) != 20:
            print(f"    !! PERINGATAN: {len(data)} baris kecamatan (harusnya 20)")
        # verifikasi Sigma vs Jumlah
        if jumlah:
            for k in range(4):
                sp = sum((d[1][k][0] or 0) for d in data)
                sn = sum((d[1][k][1] or 0) for d in data)
                jp = jumlah[1][k][0] or 0
                jn = jumlah[1][k][1] or 0
                tol = max(abs(jp), abs(jn), 1) * 0.005
                okp = "OK" if abs(sp - jp) <= tol else f"BEDA (sigma={sp:g} vs jumlah={jp:g})"
                okn = "OK" if abs(sn - jn) <= tol else f"BEDA (sigma={sn:g} vs jumlah={jn:g})"
                if okp != "OK" or okn != "OK":
                    print(f"    VERIF {tahun} {labels[k]}: prod {okp} | nilai {okn}")
                else:
                    print(f"    VERIF {tahun} {labels[k]}: prod & nilai OK")
        else:
            print(f"    (baris Jumlah tidak ditemukan — verifikasi dilewati)")
        for name, pairs in data:
            sp = sanitize_pairs(pairs)
            tangkap_rows.append(
                [name, sp[0][0], sp[0][1], sp[1][0], sp[1][1], sp[2][0], sp[2][1], sp[3][0], sp[3][1], tahun]
            )

    tangkap_csv = os.path.join(TANGKAP_DIR, "Produksi dan Nilai Produksi Perikanan Tangkap Menurut Kecamatan dan Jenis Penangkapan CSV.csv")
    header_t = [
        "Kecamatan",
        "Jala Tebar Produksi (Kg)", "Jala Tebar Nilai (Ribu Rupiah)",
        "Pancing Produksi (Kg)", "Pancing Nilai (Ribu Rupiah)",
        "Jaring Ingsang Produksi (Kg)", "Jaring Ingsang Nilai (Ribu Rupiah)",
        "Lainnya Produksi (Kg)", "Lainnya Nilai (Ribu Rupiah)",
        "Tahun",
    ]
    tangkap_rows.sort(key=lambda r: (r[9], ORDER_KEC.index(r[0]) if r[0] in ORDER_KEC else 99))
    with open(tangkap_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header_t)
        w.writerows(tangkap_rows)
    print(f"  TULIS: {tangkap_csv} ({len(tangkap_rows)} baris)")

    # ---------- 2. BUDIDAYA NILAI ----------
    print("=" * 90)
    print("BUDIDAYA NILAI — ekstraksi per jenis (Tabel 5.5.3/5.6.3)")
    budi_rows = []
    for path in sorted(glob.glob(os.path.join(BUDIDAYA_NILAI_DIR, "_tmp", "*.xlsx"))):
        tahun, data, labels, jumlah = extract_sheet(path)
        print(f"  {os.path.basename(path)} -> tahun {tahun}, {len(data)} kecamatan, label={labels}")
        if len(data) != 20:
            print(f"    !! PERINGATAN: {len(data)} baris kecamatan (harusnya 20)")
        if jumlah:
            for k in range(3):
                sp = sum((d[1][k][0] or 0) for d in data)
                sn = sum((d[1][k][1] or 0) for d in data)
                jp = jumlah[1][k][0] or 0
                jn = jumlah[1][k][1] or 0
                tol = max(abs(jp), abs(jn), 1) * 0.005
                okp = "OK" if abs(sp - jp) <= tol else f"BEDA (sigma={sp:g} vs jumlah={jp:g})"
                okn = "OK" if abs(sn - jn) <= tol else f"BEDA (sigma={sn:g} vs jumlah={jn:g})"
                if okp != "OK" or okn != "OK":
                    print(f"    VERIF {tahun} {labels[k]}: prod {okp} | nilai {okn}")
                else:
                    print(f"    VERIF {tahun} {labels[k]}: prod & nilai OK")
        else:
            print(f"    (baris Jumlah tidak ditemukan — verifikasi dilewati)")
        for name, pairs in data:
            # pasangan ke-4 (J:K) kosong pada tabel budidaya -> abaikan
            sp = sanitize_pairs(pairs[:3])
            budi_rows.append(
                [name, sp[0][0], sp[0][1], sp[1][0], sp[1][1], sp[2][0], sp[2][1], tahun]
            )

    budi_csv = os.path.join(BUDIDAYA_NILAI_DIR, "Produksi dan Nilai Produksi Perikanan Budidaya Menurut Kecamatan dan Jenis Budidaya CSV.csv")
    header_b = [
        "Kecamatan",
        "Pembesaran Produksi (Kg)", "Pembesaran Nilai (Ribu Rupiah)",
        "Karamba Jaring Apung Produksi (Kg)", "Karamba Jaring Apung Nilai (Ribu Rupiah)",
        "Minapadi Tumpang Sari Produksi (Kg)", "Minapadi Tumpang Sari Nilai (Ribu Rupiah)",
        "Tahun",
    ]
    budi_rows.sort(key=lambda r: (r[7], ORDER_KEC.index(r[0]) if r[0] in ORDER_KEC else 99))
    with open(budi_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header_b)
        w.writerows(budi_rows)
    print(f"  TULIS: {budi_csv} ({len(budi_rows)} baris)")

    # ---------- 3. SALIN CSV TEMPAT PEMELIHARAAN (_tmp -> root) ----------
    print("=" * 90)
    src = os.path.join(TEMPAT_DIR, "_tmp", "Luas dan Produksi Ikan Menurut Kecamatan dan Jenis Tempat Pemeliharaan CSV.csv")
    dst = os.path.join(TEMPAT_DIR, "Luas dan Produksi Ikan Menurut Kecamatan dan Jenis Tempat Pemeliharaan CSV.csv")
    if os.path.exists(src):
        shutil.copyfile(src, dst)
        print(f"  SALIN: _tmp\\{os.path.basename(src)} -> root ({os.path.getsize(dst)} B)")
    else:
        print(f"  !! SUMBER TIDAK ADA: {src}")

    # ---------- 4. BENIH: cek unit di xlsx (readonly, tidak menulis ulang CSV) ----------
    print("=" * 90)
    print("BENIH — cek header/unit xlsx (CSV root sudah benar)")
    benih_dir = BENIH_DIR2 if os.path.isdir(BENIH_DIR2) else BENIH_DIR
    sample = sorted(glob.glob(os.path.join(benih_dir, "_tmp", "*.xlsx")))
    if sample:
        wb = openpyxl.load_workbook(sample[-1], read_only=True, data_only=True)
        ws = wb.worksheets[0]
        for i, r in enumerate(ws.iter_rows(max_row=9, max_col=8, values_only=True), start=1):
            vals = ["" if v is None else str(v).replace("\n", " / ")[:60] for v in r]
            if any(vals):
                print(f"  {os.path.basename(sample[-1])} r{i}: " + " | ".join(vals))
        wb.close()
    else:
        print("  (tidak ada xlsx benih)")

    # ---------- 5. CROSS-CHECK budidaya kolam (CSV tempat) vs Pembesaran (nilai xlsx) ----------
    print("=" * 90)
    print("CROSS-CHECK: kolam produksi (CSV Tempat Pemeliharaan) vs Pembesaran (CSV Nilai Budidaya)")
    if os.path.exists(dst):
        tempat = {}
        with open(dst, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                r = { (k or "").strip(): (v or "").strip() for k, v in r.items() }
                key = (r["Tahun"], norm_kec(r["Kecamatan"]))
                tempat[key] = cell_num(r.get("Kolam Pembesaran Ikan Produksi (Kg)", "")) or 0
        mismatch = 0
        checked = 0
        with open(budi_csv, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                key = (r["Tahun"].strip(), norm_kec(r["Kecamatan"]))
                pemb = cell_num(r.get("Pembesaran Produksi (Kg)", "")) or 0
                if key in tempat and (tempat[key] or pemb):
                    checked += 1
                    if abs((tempat[key] or 0) - pemb) > max(tempat[key], pemb, 1) * 0.01:
                        mismatch += 1
                        if mismatch <= 10:
                            print(f"  BEDA {key}: kolam={tempat[key]:g} vs pembesaran={pemb:g}")
        print(f"  {checked} pasangan dicek, {mismatch} beda >1%")

    # ---------- laporan ----------
    print("=" * 90)
    print(f"KORESI UNIT (nilai/1000): {len(fix_log)} sel")
    print("\n".join(fix_log))
    print(f"QUIRK (dibiarkan): {len(quirk_log)} catatan")
    print("\n".join(quirk_log[:20]))
    print("SELESAI.")


if __name__ == "__main__":
    main()
