# Ekstrak Tabel 4.3 "Luas Lahan yang Dikuasai Usaha Pertanian Perorangan Menurut
# Desa/Kelurahan ... dan Jenis Lahan" dari PDF Hasil Sensus Pertanian 2023 (ST2023)
# tingkat kecamatan, lalu tulis entri LahanDesa (Ha) ke JSON.
#
# pakai:
#   python scripts/scraping/extract-st2023-lahan.py <pdf> <NamaKecamatan> [out.json] [--rename KUNCI#2=NAMABENAR ...]
#
# Errata BPS: beberapa PDF ST2023 punya baris desa ganda bernama sama (mis. Kalibening
# muncul 2x — baris ke-2 sebenarnya Desa BEDANA sesuai urutan kode desa). Baris duplikat
# diberi kunci "NAMA#2", "NAMA#3", dst. lalu bisa diganti namanya via --rename.
#
# Struktur tabel ST2023 (bilingual, angka format Indonesia: 717.553,00 atau '-'):
#   halaman A : Desa | Sawah | Bukan Sawah | Padang Rumput Sementara | Padang Rumput Permanen
#   halaman B : Desa | Sementara Belum Ditanami | Tanaman Tahunan | Kandang/Bangunan
# Nilai lahanBukanSawah = jumlah semua kolom non-sawah (selaras definisi "bukan sawah"
# pada dataset CKAN Distan yang dipakai aplikasi). Satuan sumber m2 -> dibagi 10000 -> Ha.
import json
import re
import sys
import unicodedata

from pypdf import PdfReader

NUM = r"[\d.]+,\d{2}"          # 717.553,00
TOK = rf"(?:{NUM}|-)"          # angka atau strip


def parse_num(tok: str) -> float:
    if tok == "-" or not tok:
        return 0.0
    return float(tok.replace(".", "").replace(",", "."))


def norm(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    s = re.sub(r"^(desa|kelurahan)\s+", "", s, flags=re.I)
    return re.sub(r"[^A-Z0-9]", "", s.upper())


def extract_rows(text: str, expected: int, seen: dict | None = None):
    """Kembalikan list (nama_desa, [angka...]) dari satu halaman.
    `seen` (opsional) menghitung kemunculan nama ternormalisasi lintas pemanggilan;
    nama duplikat dinormalisasi menjadi 'NAMA#2', 'NAMA#3', dst."""
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith(("(", "Tabel", "T able", "http")):
            continue
        toks = re.findall(TOK, line)
        if len(toks) < expected:
            continue
        # nama = bagian sebelum token angka pertama
        m = re.match(rf"^(.*?)\s+({'|'.join([NUM, '-'])})", line)
        if not m:
            continue
        name = m.group(1).strip()
        if not name or re.search(r"(?i)district|kecamatan|village|subdistrict", name):
            continue
        if not re.search(r"[A-Za-z]", name):
            continue
        key = norm(name)
        if seen is not None:
            n = seen.get(key, 0) + 1
            seen[key] = n
            if n > 1:
                key = f"{key}#{n}"
        rows.append((key, [parse_num(t) for t in toks[:expected]]))
    return rows


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    renames = {}
    i = 0
    while i < len(sys.argv):
        if sys.argv[i] == "--rename" and i + 1 < len(sys.argv):
            pair = sys.argv[i + 1]
            if "=" in pair:
                k, _, v = pair.partition("=")
                renames[k.upper()] = norm(v)
            i += 2
        else:
            i += 1
    pdf_path, kec = args[0], args[1]
    out = args[2] if len(args) > 2 else None

    reader = PdfReader(pdf_path)
    pages_text = []
    for p in reader.pages:
        try:
            pages_text.append(p.extract_text() or "")
        except Exception:
            pages_text.append("")

    # cari halaman awal tabel 4.3: penanda = header kolom "Padang Rumput Sementara"
    # (hanya ada di halaman tabel asli, bukan di daftar isi)
    start = None
    for i, t in enumerate(pages_text):
        if re.search(r"Padang Rumput", t) and re.search(r"Sawah", t) and re.search(r"Luas Lahan yang Dikuasai Usaha Pertanian Perorangan", t):
            start = i
            break
    if start is None:
        print("TABEL 4.3 TIDAK DITEMUKAN di PDF ini", file=sys.stderr)
        sys.exit(2)

    print(f"tabel 4.3 ditemukan di halaman PDF {start+1}", file=sys.stderr)

    # halaman A: 4 angka (Sawah, BukanSawah, PR Sementara, PR Permanen)
    # halaman B: 3 angka (Belum Ditanami, Tanaman Tahunan, Kandang/Bangunan)
    # BERHENTI tepat setelah baris total kecamatan di halaman B — halaman berikutnya
    # adalah tabel 4.4 dgn struktur kolom identik (jangan sampai terkontaminasi).
    sawah_map, non_map = {}, {}
    detail_a, detail_b = {}, {}  # rincian sub-kolom per desa
    seen_a, seen_b = {}, {}
    total_a, total_b = None, None
    # baris total: "Kecamatan X" / "X District" / " <angka...>" -> bisa 2-3 baris
    total_re = re.compile(rf"District\s*\n\s*((?:{TOK}\s*)+)")

    for off in range(0, 6):
        t = pages_text[start + off]
        is_a = "Padang Rumput" in t and "Sawah" in t
        if off == 0 and not is_a:
            print("halaman awal bukan halaman A", file=sys.stderr)
            sys.exit(2)
        if is_a and total_a is None:
            for key, vals in extract_rows(t, 4, seen_a):
                sawah_map[key] = vals[0]
                non_map[key] = sum(vals[1:])
                detail_a[key] = vals[1:]  # [bukanSawah, padangRumputSementara, padangRumputPermanen]
            m = total_re.search(t)
            if m:
                total_a = [parse_num(x) for x in re.findall(TOK, m.group(1))]
            continue
        # halaman lanjutan B: ambil baris 3 angka; setelah baris total -> selesai
        if "Rata-Rata" in t or re.search(r"\n4\.[4-9]\s", t):
            break
        for key, vals in extract_rows(t, 3, seen_b):
            if key in non_map:
                non_map[key] += sum(vals)
                detail_b[key] = vals  # [belumDitanami, tanamanTahunan, kandangBangunan]
        m = total_re.search(t)
        if m:
            total_b = [parse_num(x) for x in re.findall(TOK, m.group(1))]
            break

    # terapkan rename (mis. KALIBENING#2=BEDANA) untuk baris duplikat salah label
    for old, new in renames.items():
        if old in sawah_map:
            sawah_map[new] = sawah_map.pop(old)
            non_map[new] = non_map.pop(old)
            if old in detail_a:
                detail_a[new] = detail_a.pop(old)
            if old in detail_b:
                detail_b[new] = detail_b.pop(old)
            print(f"rename: {old} -> {new}", file=sys.stderr)
        else:
            print(f"PERINGATAN: rename {old} tidak menemukan baris", file=sys.stderr)

    # validasi: jumlah per-desa vs baris total kecamatan
    sum_sawah = sum(sawah_map.values())
    sum_non = sum(non_map.values())
    if total_a:
        exp = total_a[0]
        delta = abs(sum_sawah - exp)
        print(f"validasi sawah: desa={sum_sawah:,.2f} m2 vs total kecamatan={exp:,.2f} m2 (selisih {delta:,.2f})", file=sys.stderr)
    if total_a and len(total_a) > 1 and total_b:
        exp_non = sum(total_a[1:]) + sum(total_b)
        delta = abs(sum_non - exp_non)
        print(f"validasi non-sawah: desa={sum_non:,.2f} m2 vs total={exp_non:,.2f} m2 (selisih {delta:,.2f})", file=sys.stderr)

    entries = []
    for k, sawah_m2 in sawah_map.items():
        if "#" in k:
            print(f"PERINGATAN: baris duplikat belum di-rename: {k} "
                  f"(tambahkan --rename {k}=NAMAASLI)", file=sys.stderr)
        total_m2 = sawah_m2 + non_map.get(k, 0.0)
        if total_m2 <= 0:
            continue
        a = detail_a.get(k, [0.0, 0.0, 0.0])
        b = detail_b.get(k, [0.0, 0.0, 0.0])
        entries.append({
            "desa": k,
            "kecamatan": kec,
            "lahanSawah": round(sawah_m2 / 10000, 3),
            "lahanBukanSawah": round(non_map.get(k, 0.0) / 10000, 3),
            "jumlah": round(total_m2 / 10000, 3),
            "tahun": 2023,
            "rincian": {
                "bukanSawah": round(a[0] / 10000, 3),
                "padangRumputSementara": round(a[1] / 10000, 3),
                "padangRumputPermanen": round(a[2] / 10000, 3),
                "belumDitanami": round(b[0] / 10000, 3),
                "tanamanTahunan": round(b[1] / 10000, 3),
                "kandangBangunan": round(b[2] / 10000, 3),
            },
        })
    entries.sort(key=lambda e: e["desa"])

    print(f"terekstrak {len(entries)} desa; total sawah={sum(e['lahanSawah'] for e in entries):.2f} Ha, "
          f"bukan sawah={sum(e['lahanBukanSawah'] for e in entries):.2f} Ha", file=sys.stderr)

    data = json.dumps(entries, ensure_ascii=False, indent=2)
    if out:
        with open(out, "w", encoding="utf-8") as f:
            f.write(data)
        print(f"ditulis -> {out}", file=sys.stderr)
    else:
        print(data)


if __name__ == "__main__":
    main()
