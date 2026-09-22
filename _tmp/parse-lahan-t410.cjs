/**
 * parse-lahan-t410.cjs — Parse ulang Tabel 4.10 ST2023 (12 kolom) dari dump
 * PDF per-kecamatan di _tmp/st2023-lahan/*.txt
 *
 * Struktur per kecamatan (buku kecamatan BPS):
 *   Judul: "4.10 | 2. LUAS LAHAN (M2) YANG DIKUASAI ..."
 *   Blok 1 : header (1)|(2)|(3)|(4)|(5)     -> sawah, bukan_sawah, padang_sementara, padang_permanen
 *   Blok 2 : header (1)|(6)|(7)|(8)         -> fallow, tanaman_tahunan, kandang_ternak
 *   Blok 3 : header (1)|(9)|(10)|(11)|(12)  -> kehutanan, perikanan, non_pertanian, jumlah
 *   Tiap blok diakhiri baris "Kecamatan <nama>" (baris kontrol sigma).
 *
 * Jebakan yang ditangani:
 *   - Judul 4.10 muncul 2x (daftar isi + tabel asli) -> mulai dari yang TERAKHIR
 *   - Sisipan URL watermark di tengah baris -> kolom jadi null; jika hanya 1 kolom
 *     null dan kolom 12 (jumlah) ada -> rekonstruksi = jumlah - sigma lainnya
 *   - Typo BPS (duplikat nama): Wanayasa#2=TEMPURAN, Kalibening#2=BEDANA, Winong#2=KUTAYASA
 *   - Split " | " tanpa filter string kosong (agar kolom kosong terdeteksi, tidak menggeser)
 *
 * Output: _tmp/lahan-t410.json + ringkasan 1 baris per kecamatan (TANPA print dump).
 */
const fs = require('fs');
const path = require('path');

const DIR = 'I:/pertanian/pertanian-2/_tmp/st2023-lahan';
const OUT = 'I:/pertanian/pertanian-2/_tmp/lahan-t410.json';

// Typo BPS: nama duplikat kemunculan ke-2 di kecamatan tsb -> nama benar (verified sesi regen)
const TYPO_FIXES = {
  Wanayasa: { WANAYASA: { 2: 'TEMPURAN' } },
  Kalibening: { KALIBENING: { 2: 'BEDANA' } },
  Bawang: { WINONG: { 2: 'KUTAYASA' } },
};

const COLS = [
  'sawah', 'bukan_sawah', 'padang_sementara', 'padang_permanen', 'fallow',
  'tanaman_tahunan', 'kandang_ternak', 'kehutanan', 'perikanan', 'non_pertanian',
]; // kolom 2..11; kolom 12 = 'jumlah'
const TOTAL = 'jumlah';

function parseNum(tok) {
  if (tok === '-' || tok === '–' || tok === '') return 0;
  const s = String(tok).replace(/\s/g, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(s)) return null;
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

function headerCols(t) {
  const m = t.match(/^\(\s*1\s*\)\s*\|(.+)$/);
  if (!m) return null;
  const nums = [];
  for (const part of m[1].split('|')) {
    const mm = part.trim().match(/^\((\d+)\)$/);
    if (!mm) return null;
    nums.push(parseInt(mm[1], 10));
  }
  return [1, ...nums];
}
const sameArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const H1 = [1, 2, 3, 4, 5], H2 = [1, 6, 7, 8], H3 = [1, 9, 10, 11, 12];

function parseRow(t) {
  const parts = t.split('|').map((s) => s.trim()); // kolom kosong TETAP (jangan filter)
  if (parts.length < 2) return null;
  const name = parts[0];
  if (!name || /^DESA\/?KELURAHAN/i.test(name)) return null;
  const toks = parts.slice(1);
  const vals = [];
  let bad = 0, urls = 0;
  for (const tok of toks) {
    // URL watermark BPS menyisip sebagai token EKSTRA (nilai asli utuh) -> buang saja
    if (/^https?:\/\//i.test(tok) || /^www\./i.test(tok)) { urls++; continue; }
    if (tok === '') { vals.push(null); bad++; continue; }
    const n = parseNum(tok);
    if (n === null) { bad++; vals.push(NaN); continue; }
    vals.push(n);
  }
  const isKec = /^Kecamatan\s+/i.test(name);
  return { name, vals, bad, urls, isKec };
}

function parseKecFile(file) {
  const kecRaw = file.replace(/\.txt$/i, '');
  const kec = kecRaw.split(/[\s-]+/).map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  const text = fs.readFileSync(path.join(DIR, file), 'utf8');
  const lines = text.split(/\r?\n/);

  // 1) Judul asli tabel 4.10 = baris marker "4.10 | 2" (nomor tabel + seri 2).
  //    Jebakan: daftar isi juga memuat baris "4.10 | Luas Lahan ..." yang panjang
  //    (tidak match marker), dan judul asli dipecah multi-baris.
  let titleIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^\s*4\.10\s*\|\s*2\s*$/.test(lines[i])) { titleIdx = i; break; }
  }
  if (titleIdx < 0) return { kec, error: 'marker judul "4.10 | 2" tidak ditemukan' };

  // 2) State machine dari titleIdx
  const blocks = { 1: [], 2: [], 3: [] };
  const kecRows = {};
  const warnings = [];
  let state = 'waitHeader'; // waitHeader -> data1 -> (kecRow) -> data2 -> data3 -> done
  for (let i = titleIdx + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (state === 'done') break;
    const cols = headerCols(t);
    if (cols) {
      if (sameArr(cols, H1)) { state = 'data1'; continue; }
      if (sameArr(cols, H2)) { state = 'data2'; continue; }
      if (sameArr(cols, H3)) { state = 'data3'; continue; }
      // header tabel lain di tengah -> salah ambil
      warnings.push(`header tak terduga @${i}: ${t.slice(0, 40)}`);
      continue;
    }
    if (state === 'waitHeader') continue;
    if (/^4\.\d+\s*\|/.test(t) && state === 'data3') { state = 'done'; break; } // tabel berikutnya
    const row = parseRow(t);
    if (!row) continue;
    if (row.bad > 0 && !row.isKec) {
      // token tak dikenal -> kemungkinan bukan baris data; skip dengan warning
      warnings.push(`baris dilewati @${i}: ${t.slice(0, 60)}`);
      continue;
    }
    if (row.isKec) {
      kecRows[state] = row;
      if (state === 'data1') state = 'waitHeader';
      else if (state === 'data2') state = 'waitHeader';
      else if (state === 'data3') state = 'done';
      continue;
    }
    const exp = state === 'data1' ? 4 : state === 'data2' ? 3 : 4;
    if (row.urls === 0 && row.vals.length !== exp) {
      warnings.push(`jumlah kolom ${row.vals.length} != ${exp} @${i}: ${t.slice(0, 60)}`);
      continue;
    }
    if (row.urls > 0 && row.vals.length !== exp) {
      warnings.push(`URL+kolom ${row.vals.length} != ${exp} @${i}: ${t.slice(0, 60)}`);
      continue;
    }
    blocks[+state.slice(4)].push(row);
  }

  const n1 = blocks[1].length, n2 = blocks[2].length, n3 = blocks[3].length;
  if (n1 === 0) return { kec, error: 'blok 1 kosong', warnings };
  if (!(n1 === n2 && n2 === n3)) {
    return { kec, error: `jumlah desa antar blok beda: ${n1}/${n2}/${n3}`, warnings };
  }

  // 3) Verifikasi nama antar blok by index
  const nameMismatch = [];
  for (let i = 0; i < n1; i++) {
    const a = blocks[1][i].name.trim().toUpperCase();
    const b = blocks[2][i].name.trim().toUpperCase();
    const c = blocks[3][i].name.trim().toUpperCase();
    if (a !== b || a !== c) nameMismatch.push(`#${i + 1} [${a}|${b}|${c}]`);
  }

  // 4) Gabung 12 kolom + typo fix occurrence
  const fixes = TYPO_FIXES[kec] || {};
  const seen = {};
  const desas = [];
  for (let i = 0; i < n1; i++) {
    let name = blocks[1][i].name.trim().toUpperCase();
    seen[name] = (seen[name] || 0) + 1;
    const fix = fixes[name] && fixes[name][seen[name]];
    const typoFixed = !!fix;
    if (fix) name = fix;
    const v = [
      ...blocks[1][i].vals, // c2..c5
      ...blocks[2][i].vals, // c6..c8
      ...blocks[3][i].vals.slice(0, 3), // c9..c11
    ];
    const total = blocks[3][i].vals[3]; // c12
    const obj = { name, typoFixed, m2: {}, reconstructed: {}, nullCols: 0 };
    COLS.forEach((c, j) => { obj.m2[c] = v[j]; if (v[j] === null) obj.nullCols++; });
    obj.m2[TOTAL] = total;

    // 5) Rekonstruksi kolom null (hanya jika tepat 1 null & total ada)
    if (obj.nullCols === 1 && total !== null && total !== undefined) {
      const missing = COLS.find((c) => obj.m2[c] === null);
      const others = COLS.reduce((s, c) => (obj.m2[c] === null ? s : s + obj.m2[c]), 0);
      const rec = total - others;
      if (rec >= 0) { obj.m2[missing] = rec; obj.reconstructed[missing] = rec; obj.nullCols = 0; }
      else warnings.push(`${name}: rekonstruksi ${missing} negatif (${rec})`);
    }
    desas.push(obj);
  }

  // 6) Validasi aritmetika per desa (m2 exact)
  let okDesa = 0, unchecked = 0, badDesa = [];
  for (const d of desas) {
    if (d.nullCols > 0 || d.m2[TOTAL] === null) { unchecked++; continue; }
    const s = COLS.reduce((acc, c) => acc + d.m2[c], 0);
    if (Math.abs(s - d.m2[TOTAL]) <= 2) okDesa++;
    else badDesa.push(`${d.name} (Σ=${s} vs tot=${d.m2[TOTAL]})`);
  }

  // 7) Validasi sigma per kolom vs baris Kecamatan
  const kecCheck = {};
  if (kecRows.data1 && kecRows.data2 && kecRows.data3) {
    const kecVals = [
      ...kecRows.data1.vals, ...kecRows.data2.vals, ...kecRows.data3.vals.slice(0, 3),
    ];
    const kecTotal = kecRows.data3.vals[3];
    const all = [...COLS, TOTAL];
    const kecAll = [...kecVals, kecTotal];
    all.forEach((c, j) => {
      const sum = desas.reduce((acc, d) => (d.m2[c] === null ? acc : acc + d.m2[c]), 0);
      kecCheck[c] = { sum, kec: kecAll[j] === null ? null : kecAll[j], match: kecAll[j] !== null && Math.abs(sum - kecAll[j]) <= 5 };
    });
  } else {
    warnings.push('baris kontrol Kecamatan tidak lengkap: ' + Object.keys(kecRows).join(','));
  }

  return {
    kec, desas, warnings, nameMismatch,
    stats: { n: desas.length, okDesa, unchecked, badDesa, kecCheck },
  };
}

// ===== MAIN =====
const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.txt') && !f.startsWith('_')).sort();
const results = [];
let globalWarnings = 0;
for (const f of files) {
  const r = parseKecFile(f);
  results.push(r);
  globalWarnings += r.warnings ? r.warnings.length : 0;
}

// Ringkasan kompak (1 baris per kecamatan)
let totDesa = 0, totOk = 0, totUnchecked = 0, totRecon = 0, totTypo = 0, totNullLeft = 0;
const allHa = [];
for (const r of results) {
  if (r.error) { console.log(`${r.kec.toUpperCase().padEnd(16)} ERROR: ${r.error}`); continue; }
  const s = r.stats;
  const kecOk = Object.values(s.kecCheck).filter((k) => k.match).length;
  const kecN = Object.keys(s.kecCheck).length;
  const kecTotal = s.kecCheck[TOTAL];
  totDesa += s.n; totOk += s.okDesa; totUnchecked += s.unchecked;
  totRecon += r.desas.reduce((a, d) => a + Object.keys(d.reconstructed).length, 0);
  totTypo += r.desas.filter((d) => d.typoFixed).length;
  totNullLeft += r.desas.reduce((a, d) => a + d.nullCols, 0);
  for (const d of r.desas) {
    if (d.m2[TOTAL] !== null && d.nullCols === 0) allHa.push(d.m2[TOTAL] / 10000);
  }
  const flag = kecOk === kecN && s.badDesa.length === 0 ? 'OK' : 'CHECK';
  console.log(
    `${r.kec.toUpperCase().padEnd(16)} ${String(s.n).padStart(2)} desa | desa-check ${String(s.okDesa).padStart(2)}/${s.n}` +
    ` | Σtot ${(kecTotal ? kecTotal.sum : 0).toLocaleString('id-ID')} m2 vs kec ${(kecTotal ? kecTotal.kec : 0).toLocaleString('id-ID')} | kolom ${kecOk}/${kecN} ${flag}` +
    (s.badDesa.length ? ` | BAD: ${s.badDesa.slice(0, 3).join('; ')}` : '') +
    (r.nameMismatch.length ? ` | NAMA!= ${r.nameMismatch.length}` : '')
  );
  if (r.warnings && r.warnings.length) {
    console.log(`   warnings(${r.warnings.length}): ${r.warnings.slice(0, 4).join(' ;; ').slice(0, 200)}`);
  }
}

allHa.sort((a, b) => a - b);
const q = (p) => allHa[Math.min(allHa.length - 1, Math.floor(allHa.length * p))] ?? null;
console.log('---');
console.log(`TOTAL: ${totDesa} desa | aritmetika OK ${totOk} | unchecked ${totUnchecked} | typo-fix ${totTypo} | rekonstruksi ${totRecon} | null tersisa ${totNullLeft} | warnings ${globalWarnings}`);
console.log(`Distribusi total_dikuasai (Ha): min=${q(0).toFixed(1)} p10=${q(0.1).toFixed(1)} p25=${q(0.25).toFixed(1)} median=${q(0.5).toFixed(1)} p75=${q(0.75).toFixed(1)} p90=${q(0.9).toFixed(1)} max=${q(1).toFixed(1)} | n=${allHa.length}`);

fs.writeFileSync(OUT, JSON.stringify(results.map((r) => ({
  kecamatan: r.kec,
  desas: r.desas.map((d) => ({
    name: d.name, typoFixed: d.typoFixed,
    m2: d.m2, reconstructed: d.reconstructed, nullCols: d.nullCols,
  })),
})), null, 1), 'utf8');
console.log(`JSON tertulis: ${OUT}`);
