const fs = require('fs');
const lines = fs.readFileSync('I:/pertanian/pertanian-2/_tmp/st2023-lahan/banjarmangu.txt', 'utf8').split(/\r?\n/);

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

// Cari semua kemunculan judul (bukan hanya terakhir)
const titleHits = [];
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (/^4\.10\s*\|/.test(t) && /LUAS LAHAN/i.test(t)) titleHits.push(i);
}
console.log('Judul 4.10 ditemukan di line (1-based):', titleHits.map((i) => i + 1).join(', '));

let titleIdx = titleHits[titleHits.length - 1];
console.log('titleIdx (0-based):', titleIdx, '=>', JSON.stringify(lines[titleIdx].slice(0, 60)));

let state = 'waitHeader';
const counts = { 1: 0, 2: 0, 3: 0 };
const transitions = [];
for (let i = titleIdx + 1; i < lines.length; i++) {
  const t = lines[i].trim();
  if (!t) continue;
  if (state === 'done') break;
  const cols = headerCols(t);
  if (cols) {
    if (sameArr(cols, H1)) { state = 'data1'; transitions.push(`${i + 1} -> data1`); continue; }
    if (sameArr(cols, H2)) { state = 'data2'; transitions.push(`${i + 1} -> data2`); continue; }
    if (sameArr(cols, H3)) { state = 'data3'; transitions.push(`${i + 1} -> data3`); continue; }
    transitions.push(`${i + 1} ?? header lain ${cols.join('-')}`);
    continue;
  }
  if (state === 'waitHeader') continue;
  if (/^Kecamatan\s+/i.test(t.split('|')[0].trim())) {
    transitions.push(`${i + 1} KECROW di state ${state}`);
    if (state === 'data3') { state = 'done'; break; }
    state = 'waitHeader';
    continue;
  }
  if (state === 'data1' || state === 'data2' || state === 'data3') {
    const parts = t.split('|').map((s) => s.trim());
    if (parts.length >= 2 && !/^DESA\/?KELURAHAN/i.test(parts[0])) counts[+state.slice(4)]++;
  }
}
console.log('Transitions:', transitions.join(' | '));
console.log('Push-per-blok (perkiraan):', JSON.stringify(counts));
