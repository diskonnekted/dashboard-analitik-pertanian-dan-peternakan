const fs = require('fs');
const lines = fs.readFileSync('I:/pertanian/pertanian-2/_tmp/st2023-lahan/banjarmangu.txt', 'utf8').split(/\r?\n/);
// Print baris 5893-5925 (area akhir blok 1 + awal blok 2) dengan repr token
for (let i = 5892; i < 5926; i++) {
  console.log(`${i + 1}\t${JSON.stringify(lines[i])}`);
}
