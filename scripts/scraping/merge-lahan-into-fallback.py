"""Merge ST2023 lahan data into lahan-fallback.json.

Targeted merge: replaces only the kecamatan listed in ST2023_FILES (which have
empty/incomplete lahan rows in the current fallback) with freshly extracted
ST2023 (Tabel 4.3) values. All other kecamatan are preserved verbatim.

Each incoming kecamatan is re-inserted at its correct alphabetical position so
the overall kecamatan ordering stays intact.
"""
import json
import os

BASE = r"I:\pertanian\pertanian-2"
FALLBACK = os.path.join(BASE, "public", "data", "lahan-fallback.json")
ST2023_FILES = {
    "Karangkobar": os.path.join(BASE, "data-source", "lahan-st2023-karangkobar.json"),
    "Madukara": os.path.join(BASE, "data-source", "lahan-st2023-madukara.json"),
    "Sigaluh": os.path.join(BASE, "data-source", "lahan-st2023-sigaluh.json"),
}

with open(FALLBACK, encoding="utf-8") as f:
    fallback = json.load(f)

incoming = {}
for kec, path in ST2023_FILES.items():
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    mapped = []
    for r in rows:
        mapped.append({
            "desa": r["desa"],
            "kecamatan": kec,
            "lahanSawah": r["lahanSawah"],
            "lahanBukanSawah": r["lahanBukanSawah"],
            "jumlah": r["jumlah"],
            "tahun": int(r["tahun"]),
        })
    # sanity: unique desa per kecamatan
    names = [r["desa"] for r in mapped]
    assert len(names) == len(set(names)), f"duplicate desa in {kec}: {names}"
    incoming[kec] = mapped

# remove existing entries for the target kecamatan, keep everything else
rest = [e for e in fallback if e["kecamatan"] not in ST2023_FILES]

# re-insert each incoming kecamatan at its correct alphabetical position
merged = list(rest)
for kec in sorted(ST2023_FILES):
    insert_at = next(
        (i for i, e in enumerate(merged) if e["kecamatan"] > kec),
        len(merged),
    )
    merged = merged[:insert_at] + incoming[kec] + merged[insert_at:]

with open(FALLBACK, "w", encoding="utf-8") as f:
    json.dump(merged, f, ensure_ascii=False, indent=2)
    f.write("\n")

# report
before = {K: sum(1 for e in fallback if e["kecamatan"] == K) for K in ST2023_FILES}
after = {K: sum(1 for e in merged if e["kecamatan"] == K) for K in ST2023_FILES}
print("total before:", len(fallback), "-> after:", len(merged))
print("per-kecamatan before:", before)
print("per-kecamatan after:", after)
nonzero = {
    K: sum(1 for e in merged if e["kecamatan"] == K and (e["lahanSawah"] > 0 or e["lahanBukanSawah"] > 0))
    for K in ST2023_FILES
}
print("desa with nonzero sawah/nonSawah:", nonzero)
# verify kecamatan order still alphabetical
kecs = []
for e in merged:
    if e["kecamatan"] not in kecs:
        kecs.append(e["kecamatan"])
print("kecamatan order alphabetical:", kecs == sorted(kecs))
