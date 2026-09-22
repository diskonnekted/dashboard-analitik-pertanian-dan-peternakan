const fs = require('fs');
const path = require('path');
const DIR = 'I:/pertanian/pertanian-2/_tmp/st2023-lahan';
const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.txt')).sort();

// 1) Marker judul asli '4.10 | 2' di tiap file
for (const f of files) {
  if (f.startsWith('_')) continue;
  const lines = fs.readFileSync(path.join(DIR, f), 'utf8').split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*4\.10\s*\|\s*2\s*$/.test(lines[i])) hits.push(i + 1);
  }
  // TOC juga? baris 4.10 panjang
  const toc = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*4\.10\s*\|/.test(lines[i]) && !/^\s*4\.10\s*\|\s*2\s*$/.test(lines[i])) toc.push(i + 1);
  }
  console.log(`${f.padEnd(22)} marker '4.10 | 2': ${hits.join(',') || 'TIDAK ADA'} | 4.10-lain: ${toc.join(',') || '-'}`);
}

// 2) Label kolom blok 3 banjarmangu (area 5926-5960)
console.log('=== banjarmangu 5927-5960 ===');
const bm = fs.readFileSync(path.join(DIR, 'banjarmangu.txt'), 'utf8').split(/\r?\n/);
for (let i = 5926; i < 5960; i++) console.log(`${i + 1}\t${JSON.stringify(bm[i].slice(0, 80))}`);
