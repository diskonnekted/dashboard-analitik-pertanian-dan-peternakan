const fs = require('fs');
const lines = fs.readFileSync('I:/pertanian/pertanian-2/_tmp/st2023-lahan/banjarmangu.txt', 'utf8').split(/\r?\n/);

function parseNum(tok) {
  if (tok === '-' || tok === '–' || tok === '') return 0;
  const s = String(tok).replace(/\s/g, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(s)) return null;
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}
function parseRow(t) {
  const parts = t.split('|').map((s) => s.trim());
  if (parts.length < 2) return null;
  const name = parts[0];
  if (!name || /^DESA\/?KELURAHAN/i.test(name)) return null;
  const toks = parts.slice(1);
  const vals = [];
  let bad = 0, urls = 0;
  for (const tok of toks) {
    if (/^https?:\/\//i.test(tok) || /^www\./i.test(tok)) { vals.push(null); urls++; continue; }
    if (tok === '') { vals.push(null); bad++; continue; }
    const n = parseNum(tok);
    if (n === null) { bad++; vals.push(NaN); continue; }
    vals.push(n);
  }
  const isKec = /^Kecamatan\s+/i.test(name);
  return { name, vals, bad, urls, isKec };
}

// area tabel 4.10: marker 5866 -> sampai 5990
for (let i = 5879; i < 5995; i++) {
  const t = lines[i].trim();
  if (!t) continue;
  const row = parseRow(t);
  const nm = t.split('|')[0].trim();
  const kecLike = /^Kecamatan\s+/i.test(nm);
  const desc = row
    ? `name=${row.name} vals=[${row.vals}] bad=${row.bad} urls=${row.urls} isKec=${row.isKec}`
    : `parseRow=NULL`;
  console.log(`${i + 1}\t${kecLike ? 'KECROW?' : ''}${desc}`);
}
