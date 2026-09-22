const fs = require('fs');
const DATA = JSON.parse(fs.readFileSync('I:/pertanian/pertanian-2/_tmp/lahan-t410.json', 'utf8'));
for (const kec of DATA) {
  for (const d of kec.desas) {
    if (/SARWODADI|GUMINGSIR|PAGERGUNUNG|PEGUNDUNGAN/i.test(d.name)) {
      console.log(`${kec.kecamatan} | ${JSON.stringify(d.name)} | total m2=${d.m2.jumlah}`);
    }
  }
}
