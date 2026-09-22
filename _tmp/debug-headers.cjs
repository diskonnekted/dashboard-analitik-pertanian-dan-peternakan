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

// Semua kemunculan header kolom berformat tabel (1)|(n)... di seluruh file
const hits = [];
for (let i = 0; i < lines.length; i++) {
  const c = headerCols(lines[i].trim());
  if (c) hits.push({ line: i + 1, cols: c.join('-'), raw: lines[i].trim().slice(0, 60) });
}
console.log(`Total header-kolom terdeteksi: ${hits.length}`);
// Kelompokkan: berapa yang persis H1/H2/H3
const H1 = '1-2-3-4-5', H2 = '1-6-7-8', H3 = '1-9-10-11-12';
console.log('H1(1-2-3-4-5):', hits.filter((h) => h.cols === H1).length, '| H2(1-6-7-8):', hits.filter((h) => h.cols === H2).length, '| H3:', hits.filter((h) => h.cols === H3).length);
console.log('--- semua hit (line, cols):');
for (const h of hits) console.log(`${h.line}\t${h.cols}\t${h.raw}`);
