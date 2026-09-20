"""
Extractor CSV Distankan Banjarnegara (final, robust).

Tipe dataset:
  A. BPS Banjarnegara per Kecamatan (33 folder) -> row = kecamatan, col = metric
  B. Penggunaan Lahan (1 folder) -> row = kategori lahan
  C. Luas Panen Tanaman Pangan (511, 511b..511e) -> per kecamatan, multi-group header

Output per folder:
  1. [Folder].csv (wide, replace existing) - dipakai frontend api.ts
  2. tidy/[Folder] tidy.csv (long format) - untuk analitik
"""
from __future__ import annotations
import re, csv, json, openpyxl
from pathlib import Path
from collections import defaultdict
from datetime import datetime
import traceback

BASE_DIR = Path(r"I:\pertanian\pertanian-2\public\14. Distankan KP")
OUT_DIR_TIDY = BASE_DIR / "tidy"
OUT_DIR_INDEX = Path(r"I:\pertanian\pertanian-2\public\distankan-index.json")
LOG_FILE = Path(r"I:\pertanian\pertanian-2\extract_log.txt")

KECAMATAN_RESMI = [
    "Banjarmangu", "Banjarnegara", "Bawang", "Kalibening", "Karangkobar",
    "Madukara", "Mandiraja", "Pagedongan", "Pagentan", "Pandanarum",
    "Pejawaran", "Punggelan", "Purwonegoro", "Purworejo Klampok", "Rakit",
    "Sigaluh", "Susukan", "Wanadadi", "Wanayasa", "Batur",
]

# === Normalisasi nama kecamatan BPS Banjarnegara ===
KEC_NORMALIZE = {k: k for k in KECAMATAN_RESMI}
for k in KECAMATAN_RESMI:
    if k == "Purworejo Klampok":
        KEC_NORMALIZE["Purworejo Klp"] = k
        KEC_NORMALIZE["Purwareja Klampok"] = k
    KEC_NORMALIZE[k.replace(" ", "")] = k
    spaced = " ".join(k.replace(" ", ""))
    KEC_NORMALIZE[spaced] = k
KEC_NORMALIZE["Pagedongan "] = "Pagedongan"
KEC_NORMALIZE["Purwanegara"] = "Purwonegoro"

# === Kata-kata English umum di BPS Banjarnegara ===
EN_WORDS = {
    "number", "capacity", "land area", "harvested area", "production",
    "yield rate", "kind", "subdistrict", "district",
    # Multi-word English phrases (lebih reliable daripada single-word)
    "land area", "harvested area", "yield rate", "kind of livestock",
    # Animal English full names
    "cow", "buffalo", "buffalow", "goat", "sheep", "pig", "horse", "rabbit",
    "milking cow", "swamp buffalo", "draft horse",
    # Plant English
    "paddy field", "paddy", "maize", "soybean", "groundnut",
    "cassava", "sweet potato", "mungbean",
    # Generic English
    "total", "area",
}
# Single-word English yang JANGAN dipakai sebagai standalone trigger
# (karena bisa match kata ID pendek)
EN_SINGLE_BLACKLIST = {"layer", "kind", "sub", "rate", "number"}

# Override mode per folder (setelah cek struktur manual)
FOLDER_MODE_OVERRIDE = {
    "Luas Penggunaan Lahan menurut Jenis Penggunaan (Ha)": "B",
    "Luas  Panen,  Produksi dan Rata-rata Produksi": "C",
    # Tipe E: per Jenis Tanaman (bukan per kecamatan)
    "Luas Panen Tanaman Biofarmaka Menurut Jenis Tanaman (m2)": "E",
    "Luas Panen Tanaman Hias Menurut Jenis Tanaman (m2)": "E",
    "Luas Panen Tanaman Sayuran dan Buah\u2013Buahan Semusim Menurut Jenis Tanaman (ha)": "E",
    "Produksi Buah\u2013Buahan dan Sayuran Tahunan Menurut Jenis Tanaman (ton)": "E",
    "Produksi Tanaman Biofarmaka Menurut Jenis Tanaman (Tangkai)": "E",
    "Produksi Tanaman Hias Menurut Jenis Tanaman (tangkai)": "E",
    "Produksi Tanaman Sayuran dan Buah\u2013Buahan Semusim Menurut Jenis Tanaman (Ton)": "E",
}

# Dictionary label metric BPS Banjarnegara (Indonesia).
# Untuk cleaning double-language: jika cell mengandung salah satu kata ini,
# prioritaskan kata Indonesia. Jika ada pasangan ID/EN, pilih ID.
INDO_METRIC_WORDS = {
    # Hewan ternak
    "sapi", "sapi perah", "kerbau", "kuda", "babi", "kambing", "domba",
    "kelinci", "ayam kampung", "ayam", "itik", "itik biasa", "ras layer", "broiler",
    "manila", "itik manila", "itik alabio", "kampung", "biasa",
    # Tanaman
    "padi", "padi sawah", "padi ladang", "jagung", "ubi kayu", "ubi jalar",
    "kacang tanah", "kacang hijau", "kedelai",
    # Produk
    "kulit", "kulit sapi", "kulit kerbau", "susu", "daging", "telur",
    "telur ayam", "telur itik", "telur ayam kampung", "telur ayam ras",
    # Tempat
    "lumbung", "gudang",
    # Peternakan
    "ternak besar", "ternak kecil", "unggas", "ternak",
    # Bidang
    "pertanian", "perikanan", "perkebunan", "peternakan",
    # Pengukuran
    "luas", "produksi", "luas panen", "rendemen", "rendemen tebu",
    # Minapadi
    "benih", "bibit", "benur",
    # Lain
    "jumlah", "kapasitas", "total", "nilai", "bibit", "benih",
    "kecamatan", "kabupaten", "pemotong", "pemasukan", "pengeluaran",
    "obyek", "kolam", "sawah", "rawa", "sungai", "waduk", "danau", "muara",
    "minapadi", "ikan", "udang", "bandeng", "nila", "lele", "mas", "gurameh",
    "karper",
    # 511 metrics
    "luas panen", "rata-rata produksi",
}


def clean_metric_label(raw_label):
    """
    Cleaning label metric BPS Banjarnegara:
    1. Hapus spasi antar huruf BPS: "A y a m" -> "Ayam"
    2. Hapus double-language: "Sapi Cow" -> "Sapi" (kata Indonesia prioritas)
    3. Capitalize kata pertama
    """
    if not raw_label:
        return raw_label
    # Step 0: reject Excel error markers & BPS garbled text
    s = str(raw_label).strip()
    if not s or s.startswith("#") or s in ("-", "–", "—", "n/a"):
        return raw_label if raw_label else None
    # Step 1: hapus spasi internal pattern "X y z" (single char + space)
    # Pattern: (spasi + 1 char + spasi) diulang -> kemungkinan BPS Banjarnegara
    cleaned = re.sub(r"(?<=\b.) (?=\S) ", "", raw_label)  # risky
    # Lebih aman: hapus jika ada sequence single-char-space-single-char
    # Pattern "(?<=\b\w)(?: \w)+(?=\W|$)" -> "A y a m" -> "Ayam"
    cleaned = re.sub(r"\b(\w)(?: (\w))+\b",
                     lambda m: m.group(0).replace(" ", ""),
                     cleaned)
    # Kalau gagal, pakai pattern lebih permissive: spasi antar huruf yang semuanya 1-char
    cleaned = re.sub(r"(\w) (\w)( \w)+", lambda m: m.group(0).replace(" ", ""), cleaned)
    # Step 2: double-language cleanup
    # Cari kata-kata ID/EN. Mis "Sapi Cow" -> cek apakah salah satu kata ada di dict
    words = cleaned.split()
    if len(words) >= 2:
        # Cari pasangan 2 kata consecutive yang salah satu ID
        result_words = []
        i = 0
        while i < len(words):
            # Coba ambil 1, 2, 3 kata consecutive
            consumed = 1
            best_word = words[i]
            best_id_score = 0
            for n in [3, 2, 1]:
                if i + n > len(words):
                    continue
                phrase = " ".join(words[i:i+n])
                # Cek apakah phrase ID
                if phrase.lower() in INDO_METRIC_WORDS:
                    best_word = phrase
                    best_id_score = n
                    consumed = n
                    break
                # Cek apakah phrase adalah unit
                if re.fullmatch(r"\(.+\)", f"[{phrase}]") or re.fullmatch(r"\d+\w*/\w+", phrase):
                    best_word = phrase
                    consumed = n
                    break
            # Drop trailing EN words setelah ID match (e.g. "Kambing Goat" -> "Kambing")
            extra_skip = 0
            if best_id_score > 0 and i + consumed < len(words):
                while i + consumed + extra_skip < len(words):
                    w = words[i + consumed + extra_skip]
                    if (re.fullmatch(r"[a-z]+", w.lower()) and
                        w.lower() in EN_WORDS and
                        w.lower() not in INDO_METRIC_WORDS):
                        extra_skip += 1
                    else:
                        break
            result_words.append(best_word)
            i += consumed + extra_skip
        cleaned = " ".join(result_words)
    # Step 3: capitalize first letter
    cleaned = cleaned.strip()
    if cleaned and cleaned[0].islower():
        cleaned = cleaned[0].upper() + cleaned[1:]
    return cleaned


def normalize_kec_name(raw):
    if raw is None: return None
    s = str(raw).strip()
    if not s: return None
    # Strip leading row number like "01.", "1.", "(1)", "01 "
    s = re.sub(r"^[\(\d\.\)\s]+", "", s).strip()
    if not s: return None
    if s in KEC_NORMALIZE: return KEC_NORMALIZE[s]
    collapsed = re.sub(r"\s+", "", s)
    if collapsed in KEC_NORMALIZE: return KEC_NORMALIZE[collapsed]
    return s


def extract_year_from_filename(fname):
    name = fname.rsplit(".", 1)[0]
    tokens = re.split(r"[\s,_\-\(\)]+", name)
    for tok in tokens:
        if tok.isdigit() and len(tok) == 4 and 1900 < int(tok) < 2100:
            return int(tok)
    return None


def extract_year_from_excel(ws, max_scan_row=10):
    """Scan row 1-N, cari teks 'Tahun YYYY' atau 'Banjarnegara YYYY' atau cell numerik tahun."""
    # First: scan for text patterns
    for r in range(1, max_scan_row + 1):
        for c in range(1, ws.max_column + 1):
            v = ws.cell(row=r, column=c).value
            if v is None: continue
            s = str(v)
            m = re.search(r"(?:Tahun|Tabel|TABLE)\s+(\d{4})", s, re.IGNORECASE)
            if m: return int(m.group(1))
            # Pattern khusus untuk Penggunaan Lahan
            m = re.search(r"(?:jenis\s+penggunaan)\s*\(?ha\)?[\s,]*(\d{4})", s, re.IGNORECASE)
            if m: return int(m.group(1))
            # Last resort: ambil 4-digit year pertama yang valid
            for m in re.finditer(r"\b((?:19|20)\d{2})\b", s):
                year = int(m.group(1))
                if 1900 < year < 2100:
                    return year
    # Fallback: cari cell numerik tahun di header rows (untuk Perkebunan)
    for r in range(1, min(max_scan_row + 1, 8)):
        for c in range(2, ws.max_column + 1):
            v = ws.cell(row=r, column=c).value
            if isinstance(v, int) and 1900 < v < 2100:
                return v
    return None


def read_header_rows(ws, end_row):
    rows = []
    for r in range(1, end_row + 1):
        row = []
        for c in range(1, ws.max_column + 1):
            v = ws.cell(row=r, column=c).value
            row.append("" if v is None else str(v).strip())
        rows.append(row)
    return rows


def _is_row_english_only(header_row, max_col):
    """Cek apakah row ini EN translation baris (untuk skip).

    Return True hanya jika semua non-empty cells adalah pure English phrase
    (e.g. "Harvested Area", "Production", "Yield Rate") TANPA ada ID metric word.

    Baris bilingual "Kambing Goat" BUKAN EN-only karena 'kambing' adalah ID."""
    nonempty = 0
    eng = 0
    has_id = False
    for c in range(max_col):
        v = header_row[c] if c < len(header_row) else ""
        if v is None: v = ""
        v_low = v.lower().replace("\n", " ").strip()
        if not v_low:
            continue
        nonempty += 1
        # cek ID word
        words_in_cell = re.findall(r"[a-z]+", v_low)
        if any(w in INDO_METRIC_WORDS for w in words_in_cell):
            has_id = True
            continue  # ID cells are NOT considered EN
        # cek multi-word phrase dulu
        has_en = False
        for phrase in EN_WORDS:
            if " " in phrase and phrase in v_low:
                has_en = True
                break
        if not has_en:
            for w in words_in_cell:
                if w in EN_WORDS and w not in EN_SINGLE_BLACKLIST:
                    has_en = True
                    break
        if has_en:
            eng += 1
    if nonempty < 2:
        return False
    if has_id:
        return False  # Ada ID word -> row bilingual, bukan EN-only
    return eng / nonempty >= 0.7


def collapse_header(header_rows):
    """
    Cari baris header metric di file BPS Banjarnegara.

    Strategi umum:
    - Scan rows dari bawah ke atas (skip row 0-3 = metadata judul/tahun).
    - label_row = row PALING BAWAH yang punya >=2 non-numeric non-empty cells.
    - parent_row = row di atasnya dengan >=1 non-numeric cell (kategori).
    - Generic parent ('Jenis Ternak', 'Obyek Yang Diusahakan') di-skip.
    - Format double-language 'Sapi  Cow' (spasi ganda) -> 'Sapi' saja.
    - Hapus trailing '(N)' atau '(end)'.
    - Multiline cell 'Sapi\\nCow' -> 'Sapi'.

    Fallback Perkebunan:
    - Jika tidak ketemu label_row, scan R3 untuk kata-kata tanaman umum.
    """
    max_col = max(len(r) for r in header_rows)
    n_rows = len(header_rows)
    GENERIC_PARENT = {
        "jenis ternak", "jenis unggas", "obyek yang diusahakan",
        "obyek pembenihan ikan", "obyek penangkapan",
        "jenis produksi", "komoditas", "komoditi", "jenis",
        "obyek yang diusahakan dari pembenihan",
        "kecamatan", "subdistrict", "district",
    }
    # Deteksi khusus Perkebunan: jika R3 (idx 2) punya ≥3 cells berisi nama tanaman
    PLANT_WORDS = {"kelapa", "karet", "kopi", "kakao", "tebu", "teh", "tembakau",
                   "cengkeh", "pala", "lada", "vanili", "panili", "kemiri", "sagu",
                   "jagung", "padi", "ubi", "kacang", "kedelai", "bawang", "cabe",
                   "cabai", "tomat", "wortel", "kentang", "sayur", "sayuran",
                   "buah", "mangga", "jeruk", "apel", "pisang", "pepaya"}
    perk_label_row = None
    if n_rows >= 3:
        cnt_plant = 0
        for c in range(2, max_col):
            v = header_rows[2][c] if c < len(header_rows[2]) else ""
            v_low = v.lower().strip()
            if any(pw in v_low for pw in PLANT_WORDS) and v_low:
                cnt_plant += 1
        if cnt_plant >= 3:
            perk_label_row = 2  # R3

    label_row_idx = None
    for r in range(n_rows - 1, 3, -1):
        cnt = 0
        for c in range(max_col):
            v = header_rows[r][c] if c < len(header_rows[r]) else ""
            v = v.replace("\n", " ").strip()
            # Exclude unit pattern: "(2)", "(Unit)", "(M2)" - parens with text/digits only
            is_unit_pure = bool(re.fullmatch(r"\([\w\s/]+\)", v))
            # Exclude pure numeric/paren tanpa huruf
            is_pure_numeric = bool(re.fullmatch(r"[\s\d().,/\-]+", v))
            # Exclude Excel error markers like "#REF!", "#N/A"
            is_xl_err = bool(re.fullmatch(r"#\w+[!?]", v)) or v in ("#REF!", "#N/A", "#VALUE!", "#DIV/0!", "#NAME?", "#NUM!", "#NULL!")
            if v and not is_pure_numeric and not is_unit_pure and not is_xl_err:
                cnt += 1
        if cnt >= 2:
            # Skip baris EN-only (terjemahan BPS Banjarnegara yang redundant)
            if _is_row_english_only(header_rows[r], max_col):
                continue
            label_row_idx = r
            break
    parent_row_idx = None
    if label_row_idx is not None:
        for r in range(label_row_idx - 1, 3, -1):
            cnt = 0
            for c in range(max_col):
                v = header_rows[r][c] if c < len(header_rows[r]) else ""
                v = v.replace("\n", " ").strip()
                if v and not re.fullmatch(r"[\s\d().,/\-]+", v):
                    cnt += 1
            if cnt >= 1:
                parent_row_idx = r
                break

    label_row = header_rows[label_row_idx] if label_row_idx is not None else []
    parent_row = header_rows[parent_row_idx] if parent_row_idx is not None else []

    # Super parent row: row di atas parent_row, kalau punya kategori utama (non-numeric, non-merged)
    super_parent_row = []
    if parent_row_idx is not None:
        for r in range(parent_row_idx - 1, 3, -1):
            cnt = 0
            for c in range(max_col):
                v = header_rows[r][c] if c < len(header_rows[r]) else ""
                v = v.replace("\n", " ").strip()
                if v and not re.fullmatch(r"[\s\d().,/\-]+", v):
                    cnt += 1
            if cnt >= 1:
                # Skip baris kecamatan
                if any("subdistrict" in (header_rows[r][c].lower() if c < len(header_rows[r]) else "")
                       for c in range(max_col)):
                    break
                super_parent_row = header_rows[r]
                break

    # Unit row: row setelah label_row jika pure unit pattern "(Unit)", "(Ton)", dst
    unit_row = []
    if label_row_idx is not None and label_row_idx + 1 < n_rows:
        # Cek apakah row ini pure unit
        ur = header_rows[label_row_idx + 1]
        is_unit_row = True
        cnt = 0
        for c in range(max_col):
            v = ur[c] if c < len(ur) else ""
            if not v:
                continue
            if re.fullmatch(r"\(.+\)", v):
                cnt += 1
            elif re.fullmatch(r"\(\d+\)", v):
                cnt += 1
            else:
                is_unit_row = False
                break
        if is_unit_row and cnt >= 1:
            unit_row = ur

    col_labels = {}
    for c in range(max_col):
        parts = []
        v_super_raw = super_parent_row[c] if c < len(super_parent_row) else ""
        v_par_raw = parent_row[c] if c < len(parent_row) else ""
        v_lab_raw = label_row[c] if c < len(label_row) else ""
        v_unit_raw = unit_row[c] if c < len(unit_row) else ""
        v_super = v_super_raw.replace("\n", " ").strip()
        v_par = v_par_raw.replace("\n", " ").strip()
        v_lab = v_lab_raw.replace("\n", " ").strip()
        v_unit = v_unit_raw.replace("\n", " ").strip()

        # Skip Excel error cells (e.g. "#REF!", "#N/A")
        if v_lab.startswith("#") and (v_lab.endswith("!") or v_lab.endswith("?")):
            continue
        if v_par.startswith("#") and (v_par.endswith("!") or v_par.endswith("?")):
            continue

        parent_has_unit = bool(re.search(r"\(.+\)", v_par))
        label_is_english = bool(re.fullmatch(r"[A-Za-z /]+", v_lab))
        skip_label = False

        # 1. Label utama: dari label_row (Indonesia prioritized)
        #    - Skip label English jika parent sudah punya ID dengan unit atau ID words
        use_label = True
        append_parent_first = False  # parent kategori (mis. Ayam) di-append dulu sebelum label
        # Fallback: parent kosong (merged cell) - cari sibling non-empty ke kiri
        if (not v_par) and v_lab and v_lab.strip():
            for cc in range(c - 1, -1, -1):
                if cc < len(parent_row):
                    sib = parent_row[cc].replace("\n", " ").strip()
                    if sib and sib.lower() not in GENERIC_PARENT:
                        sib_clean = re.sub(r"\s*\(.+\)\s*", "", sib).strip()
                        sib_compact = re.sub(r"\s+", "", sib_clean).lower()
                        if sib_clean.lower() in INDO_METRIC_WORDS or sib_compact in INDO_METRIC_WORDS:
                            v_par = sib
                            break
        if v_lab and v_par:
            # Cek apakah label mengandung English phrase
            lab_low = v_lab.lower().strip()
            # Cek phrase multi-word dulu
            lab_has_english = False
            for phrase in EN_WORDS:
                if " " in phrase and phrase in lab_low:
                    lab_has_english = True
                    break
            if not lab_has_english:
                # Cek single-word yang bukan blacklist
                lab_words = re.findall(r"[A-Za-z]+", lab_low)
                for w in lab_words:
                    if w in EN_WORDS and w not in EN_SINGLE_BLACKLIST:
                        lab_has_english = True
                        break
            if lab_has_english and v_par.lower() not in GENERIC_PARENT:
                par_clean = re.sub(r"\s*\(.+\)\s*", "", v_par).strip()
                par_clean_compact = re.sub(r"\s+", "", par_clean).lower()
                if parent_has_unit or par_clean.lower() in INDO_METRIC_WORDS or par_clean_compact in INDO_METRIC_WORDS:
                    use_label = False
            elif not lab_has_english and v_par and v_par.lower() not in GENERIC_PARENT:
                # Parent mengandung kata Indonesia (kategori utama) dan label spesifik
                # -> gabung: parent + label
                par_clean = re.sub(r"\s*\(.+\)\s*", "", v_par).strip()
                par_clean_compact = re.sub(r"\s+", "", par_clean).lower()
                if par_clean.lower() in INDO_METRIC_WORDS or par_clean_compact in INDO_METRIC_WORDS:
                    append_parent_first = True

        if append_parent_first and v_par:
            parts.append(v_par.split("\n")[0].strip())
        if v_lab and use_label:
            parts.append(v_lab)
        elif (not use_label) and v_par and v_par.lower() not in GENERIC_PARENT and not append_parent_first:
            parts.append(v_par.split("\n")[0].strip())

        # 2. Super parent sebagai prefix (jika ada)
        if v_super and v_super.lower() not in GENERIC_PARENT:
            v_super_first = v_super.split("\n")[0].strip()
            # Hanya tambahkan jika belum ada di parts (case-insensitive)
            if not any(v_super_first.lower() in p.lower() for p in parts):
                parts.insert(0, v_super_first)

        # 3. Append unit_row jika belum ada
        if v_unit and not any(v_unit in p for p in parts):
            # Cek apakah label sudah punya unit
            if not any(re.search(r"\(.+\)", p) for p in parts):
                parts.append(v_unit)

        label = re.sub(r"\s+", " ", " ".join(parts).strip())
        # Double-language detection: "Sapi                Cow" atau "Sapi\nCow" -> "Sapi"
        # atau "Sapi Perah\nMilking Cow" -> "Sapi Perah"
        # raw newline ("\n") sudah di-replace jadi space, tapi cek double-space
        if "  " in v_lab_raw or "  " in v_par_raw or "\n" in v_lab_raw or "\n" in v_par_raw:
            # Ambil sebelum newline / spasi ganda, cari prefix ID terpanjang
            # Coba split di newline atau spasi ganda
            for splitter in [r"\n", r"\s{2,}"]:
                split = re.split(splitter, v_lab_raw.replace(" ", " ") if splitter == r"\n" else v_lab_raw)
                # split[0] = bagian pertama, jika multi-kata ID
                first_parts = split[0].strip().split() if split else []
                # Cari prefix terpanjang yang ada di dict INDO_METRIC_WORDS
                best = ""
                for i in range(len(first_parts), 0, -1):
                    phrase = " ".join(first_parts[:i]).lower()
                    if phrase in INDO_METRIC_WORDS or phrase.replace(" ", "") in INDO_METRIC_WORDS:
                        best = " ".join(first_parts[:i])
                        break
                if best:
                    label = best
                    break
                elif split and split[0].strip() and len(split[0].strip()) >= 3:
                    label = split[0].strip()
                    break
        # Trailing (N) atau (end)
        label = re.sub(r"\s*\((?:\d+|[a-zA-Z]{2,8})\)\s*$", "", label).strip()
        # Apply cleaning final (BPS space + ID/EN)
        label = clean_metric_label(label)
        col_labels[c + 1] = label
    # Fallback Perkebunan: gunakan R3 sebagai label_row langsung (nama tanaman)
    if perk_label_row is not None and all(not v for v in col_labels.values()):
        for c in range(2, max_col):
            v = header_rows[perk_label_row][c] if c < len(header_rows[perk_label_row]) else ""
            v = v.replace("\n", " ").strip()
            if v:
                col_labels[c + 1] = clean_metric_label(v)
    # Fallback: jika semua label kosong, generate dari numeric year cells
    if all(not v for v in col_labels.values()):
        col_labels = _generate_label_from_numeric_header(header_rows, max_col)
    return col_labels


def _generate_label_from_numeric_header(header_rows, max_col):
    """Fallback: generate label seperti 'Luas 2017' dari numeric year header cells."""
    labels = {}
    year_row_idx = None
    for r in range(len(header_rows)):
        cnt_year = 0
        for c in range(max_col):
            v = header_rows[r][c] if c < len(header_rows[r]) else ""
            if isinstance(v, str) and v.isdigit() and len(v) == 4:
                cnt_year += 1
            elif isinstance(v, int) and 1900 < v < 2100:
                cnt_year += 1
        if cnt_year >= 3:
            year_row_idx = r
            break
    if year_row_idx is None:
        return labels
    metric_name = "Luas"
    for r in range(len(header_rows)):
        for c in range(max_col):
            v = header_rows[r][c] if c < len(header_rows[r]) else ""
            if (v and not re.fullmatch(r"\d+", v) and len(v) > 3
                    and not any(k in v.lower() for k in ("kecamatan", "subdistrict", "nomor"))):
                metric_name = v
                break
        if metric_name != "Luas":
            break
    for c in range(max_col):
        if c >= len(header_rows[year_row_idx]):
            continue
        v = header_rows[year_row_idx][c]
        year = None
        if isinstance(v, str) and v.isdigit() and len(v) == 4:
            year = int(v)
        elif isinstance(v, int) and 1900 < v < 2100:
            year = v
        if year:
            labels[c + 1] = f"{metric_name} {year}"
    return labels


def extract_tipe(folder, log, mode='A'):
    """mode A: per kecamatan; mode B: per kategori; mode C: 511 sub-tabel."""
    out = {'col_labels': [], 'data': defaultdict(lambda: defaultdict(dict)), 'all_years': []}
    xlsx_files = sorted([f for f in folder.glob("*.xlsx") if not f.name.startswith("~")])
    if not xlsx_files:
        return None

    for xlsx in xlsx_files:
        try:
            wb = openpyxl.load_workbook(xlsx, data_only=True)
        except Exception as e:
            log(f"  [ERR] {xlsx.name}: {e}")
            continue
        for sheet in wb.sheetnames:
            ws = wb[sheet]
            year_file = extract_year_from_filename(xlsx.name)
            year_xls = extract_year_from_excel(ws)
            year = year_xls or year_file
            if not year:
                log(f"  [WARN] no year: {xlsx.name}")
                continue
            log(f"  file={xlsx.name[:55]!r} sheet={sheet} year={year} (file={year_file}, xls={year_xls})")

            header_rows = read_header_rows(ws, end_row=10)
            col_labels = collapse_header(header_rows)

            if mode in ('A', 'C'):
                metric_cols = {}
                for c, lab in col_labels.items():
                    if c <= 2: continue
                    if not lab: continue
                    if re.fullmatch(r"\(?\d{4}\)?", lab): continue
                    if lab.lower() in ("jumlah", "total", "tahun"): continue
                    if re.fullmatch(r"[\s\d().,/\-]+", lab): continue  # pure numeric/paren
                    metric_cols[c] = lab
                    if lab not in out['col_labels']:
                        out['col_labels'].append(lab)

                # Detect start_row: scan from row 4 until find row with kecamatan pattern
                start_row = 8
                for r in range(4, 15):
                    col1 = ws.cell(row=r, column=2).value
                    if col1 and normalize_kec_name(str(col1).strip()) in KECAMATAN_RESMI:
                        start_row = r
                        break

                for r in range(start_row, min(ws.max_row, 60) + 1):
                    col0 = ws.cell(row=r, column=1).value
                    col1 = ws.cell(row=r, column=2).value
                    if col0 is None and col1 is None: continue
                    # BPS Banjarnegara kadang taruh "J u m l a h" di merge col A+B+C (cell value hanya di col A), atau hanya di col B
                    col0_s = str(col0 or "").strip()
                    col1_s = str(col1 or "").strip()
                    col2_s = str(ws.cell(row=r, column=3).value or "").strip()
                    # Normalize BPS spasi: "J u m l a h" -> "Jumlah"
                    combined = f"{col0_s} {col1_s} {col2_s}".strip()
                    combined_normalized = re.sub(r"\s+", "", combined).lower()
                    # Juga cek per-kolom untuk merged cell yang value ada di tengah
                    col1_normalized = re.sub(r"\s+", "", col1_s).lower()
                    col2_normalized = re.sub(r"\s+", "", col2_s).lower()
                    if combined_normalized.startswith(("catatan", "sumber", "keterangan", "note", "tahun")):
                        continue
                    if combined_normalized in ("jumlah", "total") or col1_normalized in ("jumlah", "total") or col2_normalized in ("jumlah", "total"):
                        kec_label = "Jumlah"
                    elif col1_s.lower().startswith(("catatan", "sumber", "keterangan", "note", "tahun ")):
                        continue
                    else:
                        # Cari di col1 dulu (standar), fallback ke col0 (untuk kasus khusus)
                        kec_label = normalize_kec_name(col1_s) or normalize_kec_name(col0_s)
                        if not kec_label: continue

                    for c, label in metric_cols.items():
                        v = ws.cell(row=r, column=c).value
                        if v is None: continue
                        if _is_empty_marker(v): continue  # skip "-" / blank cells
                        if isinstance(v, str):
                            v_s = v.strip()
                            try:
                                v_clean = v_s.replace(",", "").replace(" ", "")
                                v_num = float(v_clean) if "." in v_clean else int(v_clean)
                                if isinstance(v_num, float) and v_num.is_integer():
                                    v_num = int(v_num)
                                out['data'][kec_label][year][label] = v_num
                            except:
                                out['data'][kec_label][year][label] = v_s
                        else:
                            if isinstance(v, float) and v.is_integer():
                                v = int(v)
                            out['data'][kec_label][year][label] = v

            elif mode == 'B':
                # Penggunaan Lahan: col C = luas (Ha), col B = kategori, col A = kode
                for r in range(5, min(ws.max_row, 30) + 1):
                    col0 = ws.cell(row=r, column=1).value
                    col1 = ws.cell(row=r, column=2).value
                    col2 = ws.cell(row=r, column=3).value
                    if col1 is None and col2 is None: continue
                    if col2 is None: continue
                    cat = str(col1 or "").strip()
                    if not cat: continue
                    if cat.lower().startswith(("catatan", "sumber")): continue
                    # Rename footnote suffix:
                    # "Lahan bukan pertanian2" -> "Lahan bukan pertanian lainnya"
                    # "lainnya1" -> "lainnya" (footnote 1 sudah di sub-bagian 'e.')
                    if cat == "Lahan bukan pertanian2":
                        cat = "Lahan bukan pertanian lainnya"
                    elif cat == "lainnya1":
                        cat = "lainnya"
                    v = col2
                    if isinstance(v, str):
                        try: v = float(v.replace(",", ""))
                        except: pass
                    if isinstance(v, float) and v.is_integer(): v = int(v)
                    code = str(col0 or "").strip()
                    full_label = f"{code} {cat}".strip() if code and code.endswith('.') else cat
                    # Clean footnote suffix dari full_label jika masih ada
                    full_label = full_label.replace("lainnya1", "lainnya")
                    out['data'][full_label][year]["Luas (Ha)"] = v
                    if "Luas (Ha)" not in out['col_labels']:
                        out['col_labels'].append("Luas (Ha)")

            elif mode == 'E':
                # Per Jenis Tanaman (bukan per kecamatan)
                # Struktur: R3 = "Jenis tanaman" | tahun numeric
                #           R4 = column number (1), (2), dst
                #           R5+ = data: col A=nomor, col B=jenis tanaman, col C+=metric
                # Cari row data mulai (dimulai dengan row berisi numeric di col A)
                start_row = 5
                for r in range(4, 15):
                    col0 = ws.cell(row=r, column=1).value
                    col1 = ws.cell(row=r, column=2).value
                    if isinstance(col0, (int, float)) and col1 and str(col1).strip():
                        # Numeric col0 + non-empty col1 = data row
                        start_row = r
                        break

                # Detect metric columns dari R3 (numeric year) atau R4 (column number)
                # Tahun ada di R3 col C+, atau langsung di R3 numeric
                # Untuk mode E, kita pakai hanya 1 kolom "Luas (m2)" / "Produksi (Ton)"
                # Label metric berdasarkan judul di R1
                metric_label = "Nilai"
                for c in range(1, min(ws.max_column + 1, 6)):
                    v = ws.cell(row=1, column=c).value
                    if v and ("Luas" in str(v) or "Produksi" in str(v) or "Nilai" in str(v)):
                        metric_label = str(v)
                        break
                # Fallback ke "Luas (m2)" / "Produksi (ton)"
                if metric_label == "Nilai":
                    if "Luas" in str(ws.cell(row=1, column=1).value or "") or "Luas" in str(ws.cell(row=1, column=3).value or ""):
                        metric_label = "Luas (m2)"
                    elif "Produksi" in str(ws.cell(row=1, column=1).value or "") or "Produksi" in str(ws.cell(row=1, column=3).value or ""):
                        metric_label = "Produksi (ton)"

                # Clean metric label - ambil hanya kata pertama/bagian penting
                m = re.search(r"(Luas Panen|Produksi|Nilai)[^,]*\(([^)]+)\)", metric_label)
                if m:
                    metric_label = f"{m.group(1)} ({m.group(2)})"
                else:
                    m2 = re.search(r"(Luas Panen|Produksi|Nilai)", metric_label)
                    if m2:
                        metric_label = m2.group(1)

                if metric_label not in out['col_labels']:
                    out['col_labels'].append(metric_label)

                for r in range(start_row, min(ws.max_row, 60) + 1):
                    col0 = ws.cell(row=r, column=1).value
                    col1 = ws.cell(row=r, column=2).value
                    col2 = ws.cell(row=r, column=3).value
                    if col1 is None or col2 is None: continue
                    nama = str(col1).strip()
                    if not nama: continue
                    if nama.lower().startswith(("catatan", "sumber", "keterangan", "note", "tahun")):
                        continue
                    # Clean nama: hapus trailing english (e.g. "Jahe/Ginger" -> "Jahe")
                    # Pattern: ID/EN, ambil ID
                    clean_nama = re.split(r"\s*/\s*", nama)[0].strip()
                    clean_nama = re.sub(r"\s*\*+\)", "", clean_nama).strip()
                    v = col2
                    if isinstance(v, str):
                        try: v = float(v.replace(",", ""))
                        except: pass
                    if isinstance(v, float) and v.is_integer(): v = int(v)
                    out['data'][clean_nama][year][metric_label] = v

            elif mode == 'F':
                # Tipe F: per Kecamatan, kolom = (nama_tanaman x tahun)
                # Struktur Excel:
                #   R1 = title + "Tabel 5.x.y" (merged atau di col C)
                #   R3 = nama tanaman per col (Jahe, Laos/Lengkuas, ...) -- LEWATI row kosong di col A/B
                #   R4 = tahun per col (2019, 2019, ...)
                #   R5 = nomor col (1), None, (2), (5), ...
                #   R6+ = data: col A = nomor urut, col B = kecamatan, col C+ = nilai
                #
                # Output kolom: "{Tanaman} {Tahun}" untuk setiap (tanaman, tahun) pair.
                # Misal: "Jahe (m2) 2019", "Laos/Lengkuas (m2) 2019"

                # Detect unit dari R1 atau folder name
                unit = ""
                m_unit = re.search(r"\(([^)]+)\)\s*$", folder.name)
                if m_unit:
                    unit = m_unit.group(1).strip()
                if not unit:
                    # Fallback ke R1
                    for c in range(1, min(ws.max_column + 1, 6)):
                        v = ws.cell(row=1, column=c).value
                        if v:
                            m2 = re.search(r"\(([^)]+)\)", str(v))
                            if m2:
                                unit = m2.group(1).strip()
                                break

                # R3 = tanaman row, R4 = tahun row
                # Scan rows 2-10 untuk menemukan tanaman row (ada string non-numeric di col C+)
                tanaman_row_idx = None
                tahun_row_idx = None
                for r in range(2, 12):
                    cnt_str = 0
                    for c in range(3, min(ws.max_column + 1, 12)):
                        v = ws.cell(row=r, column=c).value
                        if v and isinstance(v, str) and v.strip():
                            cnt_str += 1
                    if cnt_str >= 2 and tanaman_row_idx is None:
                        tanaman_row_idx = r
                    elif tanaman_row_idx is not None and cnt_str == 0:
                        # Next row: cek apakah numeric (tahun)
                        v3 = ws.cell(row=r, column=3).value
                        if isinstance(v3, (int, float)) and 1900 < v3 < 2100:
                            tahun_row_idx = r
                            break

                if tahun_row_idx is None:
                    # Fallback: tahun_row_idx = tanaman_row_idx + 1
                    if tanaman_row_idx is not None:
                        tahun_row_idx = tanaman_row_idx + 1

                # Build col_labels per (tanaman, tahun)
                col_labels_map = {}  # col_idx -> label
                if tanaman_row_idx and tahun_row_idx:
                    for c in range(3, min(ws.max_column + 1, 20)):
                        nama_tan = ws.cell(row=tanaman_row_idx, column=c).value
                        thn = ws.cell(row=tahun_row_idx, column=c).value
                        if not nama_tan and not thn: continue
                        nama_tan = str(nama_tan or "").strip()
                        if isinstance(thn, (int, float)) and 1900 < thn < 2100:
                            thn_str = str(int(thn))
                        elif isinstance(thn, str):
                            # extract year dari string
                            m3 = re.search(r"(19|20)\d{2}", thn)
                            thn_str = m3.group(0) if m3 else thn
                        else:
                            thn_str = ""
                        if not nama_tan:
                            # Fallback pakai thn_str as label
                            label = f"{thn_str}".strip()
                        else:
                            # Hapus trailing footnote/EN suffix (e.g. "Jahe1)" -> "Jahe", "Laos/Lengkuas" -> ok)
                            clean_tan = re.split(r"\s*/\s*", nama_tan)[0].strip()
                            clean_tan = re.sub(r"\s*\*?[\d\)]+$", "", clean_tan).strip()
                            unit_part = f" ({unit})" if unit else ""
                            label = f"{clean_tan}{unit_part} {thn_str}".strip()
                        col_labels_map[c] = label
                        if label and label not in out['col_labels']:
                            out['col_labels'].append(label)

                # Start data row: tahun_row_idx + 2 (lewat nomor col row)
                start_row = (tahun_row_idx or 3) + 2

                for r in range(start_row, min(ws.max_row, 60) + 1):
                    col0 = ws.cell(row=r, column=1).value
                    col1 = ws.cell(row=r, column=2).value
                    if col0 is None and col1 is None: continue
                    # Skip rows with no kecamatan
                    nama_raw = str(col1 or "").strip()
                    if not nama_raw: continue
                    # Handle merged Jumlah row (A:C merged)
                    col0_s = str(col0 or "").strip()
                    col1_s = nama_raw
                    combined = f"{col0_s} {col1_s}".strip()
                    combined_normalized = re.sub(r"\s+", "", combined).lower()
                    if combined_normalized in ("jumlah", "total") or col0_s.replace(" ", "").lower() in ("jumlah", "total"):
                        kec_label = "Jumlah"
                    else:
                        kec_label = normalize_kec_name(col1_s) or normalize_kec_name(col0_s)
                        if not kec_label: continue
                    for c, label in col_labels_map.items():
                        v = ws.cell(row=r, column=c).value
                        if v is None: continue
                        if isinstance(v, str):
                            v_s = v.strip()
                            try:
                                v_clean = v_s.replace(",", "").replace(" ", "")
                                v_num = float(v_clean) if "." in v_clean else int(v_clean)
                                if isinstance(v_num, float) and v_num.is_integer():
                                    v_num = int(v_num)
                                out['data'][kec_label][year][label] = v_num
                            except:
                                out['data'][kec_label][year][label] = v_s
                        else:
                            if isinstance(v, float) and v.is_integer():
                                v = int(v)
                            out['data'][kec_label][year][label] = v

    if not out['data']:
        return None
    out['all_years'] = sorted({y for k, yd in out['data'].items() for y in yd})
    return out


def detect_mode(folder):
    sample = None
    for f in folder.glob("*.xlsx"):
        if not f.name.startswith("~"):
            sample = f
            break
    if not sample: return 'A'
    try:
        wb = openpyxl.load_workbook(sample, data_only=True)
        ws = wb.active
    except: return 'A'
    # Tipe B: Penggunaan Lahan (kategori I., II.)
    for r in range(5, 12):
        for c in range(1, 3):
            v = ws.cell(row=r, column=c).value
            if v and re.match(r"^[IV]+\.?$", str(v).strip()):
                return 'B'
    # Tipe E: per Jenis Tanaman (folder name contains "Menurut Jenis Tanaman")
    if "Menurut Jenis Tanaman" in folder.name and "Kecamatan" not in folder.name:
        return 'E'
    # Tipe F: per Kecamatan dengan kolom nama tanaman per tahun
    # Misal "Luas Panen Tanaman Biofarmaka Menurut Kecamatan dan Jenis Tanaman (m2)"
    if "Menurut Kecamatan dan Jenis Tanaman" in folder.name:
        return 'F'
    return 'A'


def _is_empty_marker(v):
    """BPS Banjarnegara pakai '-' atau sel kosong untuk 'data tidak ada'.
    Excel error: #REF!, #N/A, #VALUE!, #DIV/0!, #NAME?, #NUM!, #NULL! juga diperlakukan kosong.
    Return True jika v adalah marker kosong."""
    if v is None: return True
    if not isinstance(v, str): return False
    s = v.strip()
    if not s: return True
    # Excel error markers
    if s.startswith("#") and s.endswith(("!", "?")):
        return True
    # Strip trailing footnote: "-1", "-2"
    s_clean = re.sub(r"^[-–—]\d*$", "", s).strip()
    if s_clean in ("-", "–", "—", "n/a", "N/A", ""):
        return True
    return s in ("-", "–", "—", "n/a", "N/A")


def _clean_num(v):
    """Round float untuk hilangkan presisi error dari Excel rumus (e.g. 95.82600000000001 -> 95.83).
    Return int jika is_integer, else float rounded ke 2 desimal (standar BPS produksi)."""
    if isinstance(v, float):
        # round ke 2 desimal
        rounded = round(v, 2)
        if rounded == int(rounded):
            return int(rounded)
        return rounded
    return v


def write_wide_csv(folder, extracted, log):
    if not extracted: return None
    col_labels = extracted['col_labels']
    out_file = folder / f"{folder.name} CSV.csv"
    rows = []
    for key, year_data in extracted['data'].items():
        for year, vals in year_data.items():
            row = {"__KEY__": key, "Tahun": year}
            for lbl in col_labels:
                v = vals.get(lbl, "")
                if _is_empty_marker(v):
                    row[lbl] = ""
                elif v != "":
                    row[lbl] = _clean_num(v)
                else:
                    row[lbl] = ""
            rows.append(row)
    is_b = len(col_labels) == 1 and col_labels[0] == "Luas (Ha)"
    is_e = "Menurut Jenis" in folder.name
    if is_e:
        first_col = "Jenis Tanaman"
    elif is_b:
        first_col = "Kategori"
    else:
        first_col = "Kecamatan"
    fieldnames = [first_col] + col_labels + ["Tahun"]
    rows = [{first_col: r.pop("__KEY__"), **r} for r in rows]
    with open(out_file, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        def sk(r):
            k = r.get(first_col)
            try: ki = KECAMATAN_RESMI.index(k)
            except: ki = 999
            return (ki, r["Tahun"])
        rows.sort(key=sk)
        for row in rows:
            w.writerow(row)
    log(f"  -> WIDE  {out_file.relative_to(BASE_DIR)}  ({len(rows)} rows, first_col={first_col})")
    return out_file


def write_tidy_csv(folder, extracted, log):
    if not extracted: return None
    col_labels = extracted['col_labels']
    tidy_dir = OUT_DIR_TIDY / folder.name
    tidy_dir.mkdir(parents=True, exist_ok=True)
    out_file = tidy_dir / f"{folder.name} tidy.csv"
    is_b = len(col_labels) == 1 and col_labels[0] == "Luas (Ha)"
    is_e = "Menurut Jenis" in folder.name
    if is_e:
        first_col = "jenis_tanaman"
    elif is_b:
        first_col = "kategori"
    else:
        first_col = "kecamatan"
    with open(out_file, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow([first_col, "tahun", "metric", "value"])
        for key, year_data in extracted['data'].items():
            for year, vals in sorted(year_data.items()):
                for lbl in col_labels:
                    v = vals.get(lbl, "")
                    if _is_empty_marker(v):
                        continue  # skip baris kosong
                    w.writerow([key, year, lbl, _clean_num(v)])
    log(f"  -> TIDY  {out_file.relative_to(BASE_DIR)} (first_col={first_col})")
    return out_file


def process_folder(folder, log, mode_override=None):
    log(f"\n=== {folder.name} ===")
    mode = mode_override or detect_mode(folder)
    log(f"  mode={mode}")
    result = extract_tipe(folder, log, mode=mode)
    if not result:
        return {'folder': folder.name, 'status': 'EMPTY', 'mode': mode}
    wide = write_wide_csv(folder, result, log)
    tidy = write_tidy_csv(folder, result, log)
    return {
        'folder': folder.name,
        'status': 'OK',
        'mode': mode,
        'years': result['all_years'],
        'row_count': sum(len(y_vals) for yd in result['data'].values() for y_vals in [yd]),
        'col_labels': result['col_labels'],
        'wide_csv': str(wide.relative_to(BASE_DIR)) if wide else None,
        'tidy_csv': str(tidy.relative_to(BASE_DIR)) if tidy else None,
    }


def main():
    log_lines = []
    def log(msg):
        print(msg)
        log_lines.append(msg)
    log(f"Extractor started: {datetime.now()}")
    log(f"BASE: {BASE_DIR}")
    OUT_DIR_TIDY.mkdir(parents=True, exist_ok=True)
    folders = sorted([p for p in BASE_DIR.iterdir() if p.is_dir() and p.name != 'tidy'])
    log(f"Total folders: {len(folders)}")
    index = []
    for folder in folders:
        try:
            mode = FOLDER_MODE_OVERRIDE.get(folder.name)
            r = process_folder(folder, log, mode_override=mode)
            index.append(r)
        except Exception as e:
            log(f"  [ERR] {folder.name}: {e}")
            log(traceback.format_exc())
            index.append({'folder': folder.name, 'status': 'ERROR', 'error': str(e)})
    with open(OUT_DIR_INDEX, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    log(f"\nIndex: {OUT_DIR_INDEX}")
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines))
    log(f"Log: {LOG_FILE}")
    print(f"\n=== Summary ===")
    for r in index:
        print(f"  {r.get('status','ERR'):6s} {r.get('mode','?'):1s} {r['folder']}")


if __name__ == "__main__":
    main()