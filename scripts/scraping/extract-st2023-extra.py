#!/usr/bin/env python3
"""Ekstrak data per-desa tambahan dari PDF ST2023 kecamatan (BPS), selain luas lahan:
  Tabel 2.9  - Rumah Tangga Petani & Petani (orang)
  Tabel 5.1  - RTUP menurut keanggotaan kelompok tani/peternak/nelayan
  Tabel 9.9  - Jumlah ternak (ekor) per jenis — 5 halaman grup kolom
  Tabel 10.1 - Rumah Tangga Usaha Perikanan per kegiatan
Hasil: 1 objek per desa digabung lintas tabel.

pakai:
  python scripts/scraping/extract-st2023-extra.py <pdf> <NamaKecamatan> <out.json> [--rename KUNCI#2=NAMA ...]

Errata BPS: nama desa bisa muncul 2x (mis. "Kalibening" 2x; baris ke-2 = BEDANA).
Duplikat dinamai "NAMA#2" dst., perbaiki lewat --rename.
"""
import json
import os
import re
import sys

import unicodedata

from pypdf import PdfReader  # noqa: E402


def norm(s: str) -> str:
    """Selaras dengan norm() di extract-st2023-lahan.py (tanpa spasi/non-alfanumerik)."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"^(desa|kelurahan)\s+", "", s, flags=re.I)
    return re.sub(r"[^A-Z0-9]", "", s.upper())

# integer atau ribuan-titik atau desimal-koma; "-" = 0
TOK = r"[\d.]+,\d+|\d{1,3}(?:\.\d{3})+|\d+|-"
SKIP_NAME = re.compile(
    r"(?i)district|kecamatan|village|subdistrict|desa|census|hasil|results|number|jumlah|"
    r"tabel|table|able|http|catatan|note|lanjutan|continued|menurut|rumah|tangga|"
    r"household|orang|person|pertanian|agricultur|livestock|fishery|petani|farmer|"
    r"sensus|halaman|catatan|kelompok|group|ternak|perikanan|pupuk|fertilizer|"
    r"anggota|member|pengelola|holder|usaha|holding"
)


def parse_num(tok: str) -> float:
    if tok == "-":
        return 0.0
    if "," in tok:
        return float(tok.replace(".", "").replace(",", "."))
    return float(tok.replace(".", ""))


def extract_rows(text: str, expected: int, seen: dict):
    """Ambil baris (nama, [angka]) dengan penamaan duplikat NAMA#2 dst."""
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("("):
            continue
        toks = re.findall(TOK, line)
        if len(toks) < expected:
            continue
        m = re.match(r"^(.*?)\s+[\d-]", line)
        if not m:
            continue
        name = m.group(1).strip()
        if not name or not re.search(r"[A-Za-z]", name):
            continue
        if SKIP_NAME.search(name):
            continue
        key = norm(name)
        n = seen.get(key, 0) + 1
        seen[key] = n
        if n > 1:
            key = f"{key}#{n}"
        rows.append((key, [parse_num(t) for t in toks[:expected]]))
    return rows


def total_row(text: str, expected: int):
    """Baris total 'Kecamatan X / X District <angka>' (angka bisa di baris berikutnya)."""
    m = re.search(rf"Kecamatan(?:[^\n]*\n){{1,3}}[^\n]*District[ \t]*\n?[ \t]*((?:(?:{TOK})[ \t]*)+)", text)
    if not m:
        return None
    vals = [parse_num(t) for t in re.findall(TOK, m.group(1))]
    return vals[:expected] if len(vals) >= expected else None


# --- konfigurasi tabel -------------------------------------------------------
SIMPLE_TABLES = [
    {
        "id": "petani",
        "find": re.compile(r"Rumah Tangga Petani dan Petani Menurut Desa", re.I),
        "expected": 2,
        "keys": ["rumahTanggaPetani", "petani"],
    },
    {
        "id": "kelompok",
        # versi "rumah tangga" (bukan "Usaha Pertanian Perorangan"/unit)
        "find": re.compile(
            r"Rumah Tangga Usaha Pertanian Menurut[\s\S]{0,120}?Keanggotaan[\s\S]{0,60}?Kelompok Tani",
            re.I,
        ),
        "expected": 3,
        "keys": ["rtAnggotaKelompok", "rtBukanAnggotaKelompok", "rtup"],
    },
    {
        "id": "perikanan",
        "find": re.compile(r"Rumah Tangga Usaha Perikanan Menurut\s*\n?Desa/Kelurahan dan Kegiatan", re.I),
        "expected": 3,
        "keys": ["rtPerikanan", "rtPerikananBudidaya", "rtPerikananTangkap"],
    },
]

# Tabel 9.9 ternak: grup kolom -> kata kunci header halaman + nama kolom ST2023
TERNAK_COL_GROUPS = [
    ("Sapi Potong", ["sapiPotong", "sapiPerah", "kerbauPotong", "kerbauPerah", "kuda", "kambingPotong"]),
    ("Kambing Perah", ["kambingPerah", "dombaPotong", "dombaPerah", "babi", "kelinci", "ayamRasPedaging"]),
    ("Ayam Ras Petelur", ["ayamRasPetelur", "ayamKampungBiasa", "ayamKampungPedaging", "ayamKampungPetelur", "itikPetelur"]),
    ("Itik Pedaging", ["itikPedaging", "itikManila", "angsa", "merpati", "puyuhPetelur"]),
    ("Puyuh Pedaging", ["puyuhPedaging", "kalkun", "walet", "ayamLokalLainnya", "unggasNonPangan"]),
]
# agregasi ke kunci ramah-aplikasi (jumlahkan grup ST2023)
TERNAK_AGGREGATE = {
    "kerbau": ["kerbauPotong", "kerbauPerah"],
    "kambing": ["kambingPotong", "kambingPerah"],
    "domba": ["dombaPotong", "dombaPerah"],
    "ayamKampung": ["ayamKampungBiasa", "ayamKampungPedaging", "ayamKampungPetelur"],
    "itik": ["itikPetelur", "itikPedaging", "itikManila"],
    "puyuh": ["puyuhPetelur", "puyuhPedaging"],
    "unggasLainnya": ["ayamLokalLainnya", "unggasNonPangan"],
}
TERNAK_DROP = {"kerbauPotong", "kerbauPerah", "kambingPotong", "kambingPerah",
               "dombaPotong", "dombaPerah", "ayamKampungBiasa", "ayamKampungPedaging",
               "ayamKampungPetelur", "itikPetelur", "itikPedaging", "itikManila",
               "puyuhPetelur", "puyuhPedaging", "ayamLokalLainnya", "unggasNonPangan"}


TOC_MARK = re.compile(r"Daftar Tabel|List of\s*\n?\s*Table|\.{8,}")


def find_table_page(pages, pattern, expected, start=0, min_rows=5):
    """Cari halaman yang cocok pattern DAN punya >= min_rows baris desa
    (menghindari kecocokan palsu pada halaman daftar isi)."""
    for i in range(start, len(pages)):
        if not pattern.search(pages[i]):
            continue
        if TOC_MARK.search(pages[i]):
            continue
        if len(extract_rows(pages[i], expected, {})) >= min_rows:
            return i
    return None


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
    pdf_path, kec, out = args[0], args[1], args[2]

    reader = PdfReader(pdf_path)
    pages = [p.extract_text() or "" for p in reader.pages]

    data = {}  # key -> dict field -> angka
    dup_warnings = set()

    def put(key, fields: dict):
        data.setdefault(key, {}).update(fields)

    # --- tabel sederhana (2.9, 5.1, 10.1) ---
    for cfg in SIMPLE_TABLES:
        pi = find_table_page(pages, cfg["find"], cfg["expected"])
        if pi is None:
            print(f"PERINGATAN: tabel {cfg['id']} tidak ditemukan", file=sys.stderr)
            continue
        seen = {}
        rows = extract_rows(pages[pi], cfg["expected"], seen)
        tot = total_row(pages[pi], cfg["expected"])
        for key, vals in rows:
            put(key, dict(zip(cfg["keys"], vals)))
        for k, n in seen.items():
            if n > 1:
                dup_warnings.add(k)
        # validasi total kolom pertama
        if tot:
            sums = [sum(v) for v in zip(*[list(r[1]) for r in rows])] if rows else []
            ok = all(abs(s - t) < 0.5 for s, t in zip(sums, tot))
            print(f"[{cfg['id']}] {len(rows)} baris; total desa {sums} vs tabel {tot} "
                  f"-> {'OK' if ok else 'SELISIH!'}", file=sys.stderr)

    # --- tabel 9.9 ternak (multi halaman) ---
    m99 = re.compile(r"Jumlah T\s*ernak pada Rumah Tangga Usaha Peternakan", re.I)
    cont99 = re.compile(r"Continued\s+T\s*able\s+9\.9", re.I)
    pi = find_table_page(pages, m99, 6)
    if pi is None:
        print("PERINGATAN: tabel ternak 9.9 tidak ditemukan", file=sys.stderr)
    else:
        ternak_pages = [pi]
        j = pi + 1
        while j < len(pages) and cont99.search(pages[j]) and len(ternak_pages) < 6:
            ternak_pages.append(j)
            j += 1
        for page_idx in ternak_pages:
            text = pages[page_idx]
            # Beberapa halaman (mis. terakhir) mencetak ulang blok tabel sebelumnya
            # setelah footer "Lanjutan Tabel/Continued Table". Potong di marker itu
            # agar hanya blok pertama (grup kolom halaman ini) yang diekstrak.
            text = re.split(r"(?i)Lanjutan\s*Tabel|Continued\s*Table", text)[0]
            group = None
            for keyword, cols in TERNAK_COL_GROUPS:
                if keyword.lower() in text.lower():
                    group = cols
                    break
            if group is None:
                print(f"PERINGATAN: halaman {page_idx} ternak tanpa grup kolom dikenal", file=sys.stderr)
                continue
            # `seen` sengaja baru per halaman: tiap halaman mengulang semua desa,
            # sehingga duplikat (mis. KALIBENING#2) konsisten lintas halaman
            seen = {}
            rows = extract_rows(text, len(group), seen)
            tot = total_row(text, len(group))
            for key, vals in rows:
                cur = data.setdefault(key, {}).setdefault("ternak", {})
                cur.update(dict(zip(group, vals)))
            for k, n in seen.items():
                if n > 1:
                    dup_warnings.add(k)
            if tot:
                sums = [sum(v) for v in zip(*[list(r[1]) for r in rows])] if rows else []
                ok = all(abs(s - t) < 0.5 for s, t in zip(sums, tot))
                print(f"[ternak:{group[0]}] {len(rows)} baris; total {sums} vs {tot} "
                      f"-> {'OK' if ok else 'SELISIH!'}", file=sys.stderr)

    # --- rename duplikat ---
    for old, new in renames.items():
        if old in data:
            data[new] = data.pop(old)
            print(f"rename: {old} -> {new}", file=sys.stderr)
        else:
            print(f"PERINGATAN: rename {old} tidak menemukan baris", file=sys.stderr)
    for k in data:
        if "#" in k:
            print(f"PERINGATAN: baris duplikat belum di-rename: {k} (--rename {k}=NAMA)", file=sys.stderr)

    # --- rakit output ---
    entries = []
    for key in sorted(data):
        fields = data[key]
        ternak_raw = fields.pop("ternak", {})
        ternak = {k: v for k, v in ternak_raw.items() if k not in TERNAK_DROP}
        for agg, parts in TERNAK_AGGREGATE.items():
            val = sum(ternak_raw.get(p, 0) for p in parts)
            if val:
                ternak[agg] = val
        entry = {
            "desa": key,
            "kecamatan": kec.upper(),
            **{k: (int(v) if float(v).is_integer() else v) for k, v in fields.items()},
            "ternak": {k: (int(v) if float(v).is_integer() else v) for k, v in ternak.items() if v},
            "sumber": f"BPS Hasil Sensus Pertanian 2023 Kecamatan {kec.title()}",
        }
        entries.append(entry)

    result = {
        "sumber": f"Badan Pusat Statistik - Hasil Sensus Pertanian 2023 Kecamatan {kec.title()}",
        "tahun": "2023",
        "catatan": "Diekstrak dari PDF ST2023 (tabel 2.9, 5.1, 9.9, 10.1). "
                   "rtAnggotaKelompok = RTUP anggota kelompok tani/peternak/nelayan; "
                   "ternak dalam ekor per 1 Mei 2023.",
        "data": entries,
    }
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"OK: {len(entries)} desa -> {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
