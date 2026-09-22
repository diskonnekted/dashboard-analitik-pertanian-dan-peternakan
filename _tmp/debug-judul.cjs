const fs = require('fs');
const lines = fs.readFileSync('I:/pertanian/pertanian-2/_tmp/st2023-lahan/banjarmangu.txt', 'utf8').split(/\r?\n/);
// Semua baris mengandung '4.10' atau '4,10'
console.log('=== Baris berisi 4.10 ===');
for (let i = 0; i < lines.length; i++) {
  if (/4\.10/.test(lines[i])) console.log(`${i + 1}\t${lines[i].slice(0, 90)}`);
}
console.log('=== Area 5840-5890 (judul asli?) ===');
for (let i = 5839; i < 5890; i++) console.log(`${i + 1}\t${JSON.stringify(lines[i].slice(0, 90))}`);
