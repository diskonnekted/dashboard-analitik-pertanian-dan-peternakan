import openpyxl, glob, os, csv, re

BASE = r"I:\pertanian\pertanian-2\public\14. Distankan KP\Produksi dan Nilai Produksi Perikanan Tangkap Menurut Kecamatan dan Jenis Penangkapan"
TMP = os.path.join(BASE, "_tmp")
OUT = os.path.join(TMP, "Produksi Tangkap per Alat Penangkapan CSV.csv")

ALAT = [
    ("Jala Tebar", 3, 4),
    ("Pancing", 5, 6),
    ("Jaring Ingsang", 7, 8),
    ("Lainnya", 9, 10),
]

def norm_name(raw):
    if raw is None:
        return ""
    s = str(raw).strip()
    words = s.split()
    if not words:
        return ""
    if all(len(w) == 1 for w in words):
        return "".join(words).lower() if "".join(words).lower() == "jumlah" else "".join(words)
    return re.sub(r"\s+", " ", s)

def fnum(v):
    if v is None or str(v).strip() in ("", "-"):
        return ""
    try:
        return round(float(str(v).replace(",", "")), 2)
    except ValueError:
        return ""

rows_out = []
sanity = []  # (tahun, alat, sum_ekstraksi, jumlah_resmi)

for f in sorted(glob.glob(os.path.join(TMP, "*.xlsx"))):
    m = re.search(r"(\d{4})\.xlsx$", os.path.basename(f))
    if not m:
        continue
    yr = m.group(1)
    wb = openpyxl.load_workbook(f, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    sums = {a[0]: [0.0, 0.0] for a in ALAT}
    jumlah_resmi = {a[0]: [None, None] for a in ALAT}
    for row in ws.iter_rows(values_only=True):
        c0 = "" if row[0] is None else str(row[0]).strip()
        name = norm_name(row[1] if len(row) > 1 else None)
        if re.match(r"^\d{1,2}\.$", c0) and name:
            vals = {}
            for alat, ip, in_ in ALAT:
                p = fnum(row[ip] if len(row) > ip else None)
                n = fnum(row[in_] if len(row) > in_ else None)
                vals[alat] = (p, n)
                if p != "":
                    sums[alat][0] += float(p)
                if n != "":
                    sums[alat][1] += float(n)
            rows_out.append([name] + [x for a in ALAT for x in vals[a[0]]] + [yr])
        elif name.lower() == "jumlah":
            for alat, ip, in_ in ALAT:
                jumlah_resmi[alat] = (fnum(row[ip] if len(row) > ip else None), fnum(row[in_] if len(row) > in_ else None))
    wb.close()
    for alat, _, _ in ALAT:
        jp, jn = jumlah_resmi[alat]
        okp = jp is not None and abs(sums[alat][0] - jp) < 1
        okn = jn is not None and abs(sums[alat][1] - jn) < 1
        sanity.append((yr, alat, sums[alat][0], jp, okp, sums[alat][1], jn, okn))

header = ["Kecamatan"]
for alat, _, _ in ALAT:
    header += [f"{alat} Produksi (Kg)", f"{alat} Nilai Produksi (Ribu Rp)"]
header.append("Tahun")

with open(OUT, "w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    w.writerow(header)
    for r in rows_out:
        w.writerow([r[0]] + [("" if v == "" else v) for v in r[1:9]] + [r[9]])

print(f"CSV ditulis: {OUT}")
print(f"Total baris data: {len(rows_out)} (harap 120 = 20 kec x 6 tahun)")
kec = sorted(set(r[0] for r in rows_out))
print(f"Kecamatan unik ({len(kec)}): {', '.join(kec)}")
tahun = sorted(set(r[9] for r in rows_out))
print(f"Tahun: {', '.join(tahun)}")
print("\n--- Sanity vs baris 'Jumlah' resmi xlsx ---")
bad = 0
for yr, alat, sp, jp, okp, sn, jn, okn in sanity:
    status = "OK" if (okp and okn) else "BEDA"
    if status == "BEDA":
        bad += 1
    print(f"{status} {yr} {alat}: SumProd={sp:.2f} vs {jp} | SumNilai={sn:.2f} vs {jn}")
print(f"\nSelisih: {bad}/24" + (" - SEMUA SINKRON" if bad == 0 else " - PERIKSA!"))
