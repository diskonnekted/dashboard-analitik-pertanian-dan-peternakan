# -*- coding: utf-8 -*-
p = r'C:\Users\diskonekted\AppData\Roaming\aionrs\projects\I--pertanian-pertanian-2\memory\project-sispertani.md'
t = open(p, encoding='utf-8').read()

# 1. Koverage now complete
t = t.replace(
    "saat ini 41 desa: Kalibening 16 + Banjarmangu 17 + Purwareja Klampok 8).",
    "LENGKAP 20/20 kecamatan (278 desa) — semua cocok geojson/desa-area.json)."
)

# 2. Resolve pending Madukara+Karangkobar note
t = t.replace(
    "- Opsional tersisa: Madukara+Karangkobar ST2023 untuk menggantikan fallback lama tak terverifikasi.",
    "- SELESAI 2026-09: semua 20 kecamatan ST2023 extra sudah terekstrak (lihat bagian bawah)."
)

# 3. Append new section
add = """

## Perolehan PDF ST2023 kecamatan via API BPS (2026-09)
- Situs banjarnegarakab.bps.go.id = Next.js App Router, daftar publikasi dimuat client-side lewat Server Action `getListPublication` (ID `60cd2ef6d9f1f17b0b90c6c292a1a9d55d7d508ae2`).
- Cara panggil (urllib, tanpa browser): POST ke `https://banjarnegarakab.bps.go.id/id/publication` dengan header `Next-Action: <ID>`, `Content-Type: text/plain;charset=UTF-8`, `Accept: text/x-component`, `Origin`+`Referer`; body React-Flight `["id",{"page":N,"keyword":"sensus pertanian 2023","onlyTitle":true}]` (JSON, tanpa prefix baris). Respon flight: baris `1:{status,response{data:[meta, list]}}`; tiap item punya `title`, `rl_date`, `pub_id`, `pdf` (url download `web-api.bps.go.id/download.php?f=<base64>`).
- Script jadi: `scripts/scraping/fetch-pub-list.py` (list), `download-st2023-all.py` (unduh 20 PDF ~13MB @ ke `data-source/hasil-sensus-pertanian-2023-kecamatan-<k>.pdf`), `run-extract-all.py` (loop extractor + rename). Python harus `D:\\Users\\diskonekted\\miniforge3\\python.exe` (punya pypdf+cryptography); `python` bawaan shell = Inkscape (tanpa pypdf).
- Catatan: JS chunks situs butuh header Referer untuk diunduh (kalau tidak 403 F5/TSPD).

## Fix extractor `extract-st2023-extra.py` (2026-09)
1. **Bug `page` di SKIP_NAME**: kata `page` (untuk skip footer "Page") ikut menolak nama desa berawalan "Pag" → hilang PAGENTAN, PAGEDONGAN, PAGELAK, PAGERPELAH, PAGERGUNUNG. Dihapus (redundan, header tidak lolos pola desa).
2. **Bug parser `--rename`**: versi lama break di flag `--rename` ke-2, jadi hanya rename pertama yang terpasang per kecamatan. Ditulis ulang loop while agar semua `--rename OLD=NEW` diproses.
3. **Tabel ternak 9.9 multi-blok**: halaman terakhir (mis. Karangkobar hal.312) mencetak ulang blok grup sebelumnya setelah footer "Lanjutan Tabel/Continued Table". Fix: `text = re.split(r"(?i)Lanjutan\\s*Tabel|Continued\\s*Table", text)[0]` sebelum deteksi grup — potong blok sisipan, hanya blok pertama halaman diekstrak.
- Errata/typo BPS vs nama geojson (diatasi `--rename`, arah PDF→app): BAWANG `WINONG#2=KUTAYASA`; WANAYASA `WANAYASA#2=TEMPURAN`, `PAGERGUNUNG=PEGERGUNUNG`; KARANGKOBAR `PURWODADI=PURWADADI`; PEJAWARAN `PEGUNDUNGAN=PAGUNDUNGAN`, `SARWODADI=SARWADADI`; PURWANEGARA `PUCUNGBEDUG=PUCUNGBEDUK`; SIGALUH `SINGAMERTA=SINGOMERTO`, `TUNGGARA=TUNGGORO`; SUSUKAN `PEKIKIRAN=PAKIKIRAN`, `PANERUSANKULON=PANARUSANKULON`, `PANERUSANWETAN=PANARUSANWETAN`.
- Verifikasi cakupan: `scripts/scraping/check-coverage.py` bandingkan desa st2023 vs `data-source/desa-area.json` — hasil 20/20 OK, 0 missing/extra/dup.
"""

t += add
open(p, 'w', encoding='utf-8').write(t)
print('done, new len', len(t))
