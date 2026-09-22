/**
 * _tmp/st2023-t410.cjs — parser Tabel 4.10 ST2023 (Luas Lahan yang Dikuasai
 * UPS Perorangan Menurut LOKASI dan Jenis Lahan, m², 2023) dari dump teks PDF.
 *
 * Bentuk tabel (bagian 1, kolom (1)-(5)): NamaDesa | sawah | bukan-sawah | pr.smt | pr.perm
 * Angka format ID: "276.520,00"; '-' = nol. URL bps nyempil sesekali → difilter.
 *
 * Usage:
 *   node _tmp/st2023-t410.cjs parse <dump.txt> <kecamatan>        → JSON ke stdout
 *   node _tmp/st2023-t410.cjs all                                 → parse semua PDF ke _tmp/st2023-lahan/*.json
 */
const fs = require('fs');
const path = require('path');

const NUM = /^[\d.]*\d(?:,\d+)?$/; // "276.520,00" / "61" / "0,5"
const isNum = (s) => NUM.test(s);
const toNum = (s) => (s === '-' || s === '' ? 0 : Number(s.replace(/\./g, '').replace(',', '.')));
const clean = (s) => s.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();

function parseT410(lines, kecamatan) {
  // 1) Cari blok tabel: baris judul "Luas Lahan yang Dikuasai" + "Menurut Lokasi"
  //    lalu baris kolom "(1) | (2) | (3) | (4) | (5)" pertama SETELAH judul 4.10.
  let tIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/Luas Lahan yang Dikuasai/i.test(l) && i + 1 < lines.length && /Menurut Lokasi|Tabel/i.test(lines[i + 1])) {
      // pastikan ini judul 4.10 (bukan 4.3 domisili): cari "4.10" dalam 5 baris
      const ctx = lines.slice(Math.max(0, i - 3), i + 4).join(' ');
      if (/4\.10/.test(ctx) || /Menurut Lokasi/i.test(ctx)) { tIdx = i; break; }
    }
  }
  if (tIdx < 0) return { error: 'judul 4.10 tidak ditemukan' };

  // 2) Dari tIdx, cari baris header kolom "(1) | (2) | (3) | (4) | (5)"
  let hIdx = -1;
  for (let i = tIdx; i < Math.min(tIdx + 40, lines.length); i++) {
    if (/^\(1\) \| \(2\) \| \(3\) \| \(4\) \| \(5\)$/.test(lines[i].trim())) { hIdx = i; break; }
  }
  if (hIdx < 0) return { error: 'header kolom (1)-(5) tidak ditemukan setelah judul 4.10' };

  // 3) Baca baris desa sampai baris agregat "Kecamatan <nama>"
  const rows = [];
  let kecRow = null;
  for (let i = hIdx + 1; i < Math.min(hIdx + 60, lines.length); i++) {
    const cells = lines[i].split('|').map(clean).filter((c) => c !== '');
    if (cells.length === 0) continue;
    // buang token noise
    const noise = cells.filter((c) => /https?:|^\(?\d+\)?$|Villa|ge\/Subdistrict|Individual|Agricultural/i.test(c));
    const vals = cells.filter((c) => isNum(c) || c === '-');
    const names = cells.filter((c) => !isNum(c) && c !== '-' && !/https?:|^\(?\d+\)?$/.test(c));
    const name = names.join(' ');
    if (/Kecamatan/i.test(name)) {
      kecRow = { name: clean(name.replace(/Kecamatan/i, '').replace(/District.*/i, '')), vals: vals.map(toNum) };
      break;
    }
    // baris desa valid: ada nama + tepat 4 angka (kol 2-5)
    if (name && !/Desa\/Kelurahan|Village/i.test(name) && vals.length >= 2 && vals.length <= 5) {
      rows.push({ name, sawah_m2: toNum(vals[0]), bukan_m2: toNum(vals[1]), raw: vals });
    }
  }
  if (!rows.length) return { error: 'tidak ada baris desa terbaca' };

  // 4) Kontrol: Σ desa vs baris "Kecamatan X"
  const sumSawah = rows.reduce((a, r) => a + r.sawah_m2, 0);
  const sumBukan = rows.reduce((a, r) => a + r.bukan_m2, 0);
  const kecSawah = kecRow?.vals?.[0] ?? null;
  const kecBukan = kecRow?.vals?.[1] ?? null;
  const kontrol =
    kecSawah !== null
      ? { sumSawah, kecSawah, selisihSawah: +(sumSawah - kecSawah).toFixed(2), sumBukan, kecBukan, selisihBukan: +(sumBukan - kecBukan).toFixed(2) }
      : null;
  return { kecamatan, tabel: '4.10 (lokasi, m², 2023)', desa: rows, kontrol };
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'parse') {
    const txt = fs.readFileSync(process.argv[3], 'utf8');
    const kec = process.argv[4];
    console.log(JSON.stringify(parseT410(txt.split(/\r?\n/), kec), null, 2));
    return;
  }
  if (mode === 'all') {
    const srcDir = path.resolve(__dirname, '..', 'data-source');
    const outDir = path.join(__dirname, 'st2023-lahan');
    fs.mkdirSync(outDir, { recursive: true });
    const pdfs = fs.readdirSync(srcDir).filter((f) => /hasil-sensus-pertanian-2023-kecamatan-.+\.pdf$/.test(f));
    const dump = require('./st2023-dump.cjs'); // tidak dipakai langsung; dump via spawn
    const { execFileSync } = require('child_process');
    const hasil = [];
    for (const f of pdfs) {
      const kec = f.replace('hasil-sensus-pertanian-2023-kecamatan-', '').replace('.pdf', '');
      const dumpTxt = path.join(outDir, `${kec}.txt`);
      if (!fs.existsSync(dumpTxt)) {
        execFileSync('node', [path.join(__dirname, 'st2023-dump.cjs'), path.join(srcDir, f), dumpTxt], { stdio: 'pipe' });
      }
      const parsed = parseT410(fs.readFileSync(dumpTxt, 'utf8').split(/\r?\n/), kec);
      fs.writeFileSync(path.join(outDir, `${kec}.json`), JSON.stringify(parsed, null, 2));
      const ok = parsed.error ? 'ERR' : parsed.kontrol && (parsed.kontrol.selisihSawah !== 0 || parsed.kontrol.selisihBukan !== 0) ? 'CHECK' : 'OK';
      hasil.push(`${ok}  ${kec}: ${parsed.error ?? `${parsed.desa.length} desa, Σsawah=${parsed.kontrol?.sumSawah} vs kec=${parsed.kontrol?.kecSawah}`}`);
      console.log(hasil[hasil.length - 1]);
    }
    fs.writeFileSync(path.join(outDir, '_summary.txt'), hasil.join('\n'));
    return;
  }
  console.log('mode: parse <txt> <kecamatan> | all');
}
main().catch((e) => { console.error(e); process.exit(1); });
