/**
 * _tmp/qc-st2023-lahan.cjs — QC baseline ST2023 4.10 vs daftar desa resmi (DB).
 * Output: desa resmi yang TIDAK ada di baseline (perlu cek PDF) &
 *         baris baseline yang tidak match desa resmi (salah parse nama?).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

const dir = path.join(__dirname, 'st2023-lahan');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

// daftar resmi dari DB
const raw = execSync(`"D:\\xampp\\mysql\\bin\\mysql.exe" -u root sispertani -N -e "SELECT k.nama, d.nama FROM desa d JOIN kecamatan k ON k.id=d.kecamatan_id ORDER BY k.nama, d.nama"`, { encoding: 'utf8' });
const resmi = new Map(); // kecNorm -> Set(desaNorm)
for (const line of raw.split(/\r?\n/)) {
  const [kec, desa] = line.split('\t');
  if (!kec || !desa) continue;
  const k = norm(kec);
  if (!resmi.has(k)) resmi.set(k, new Map());
  resmi.get(k).set(norm(desa), desa);
}

let totalParsed = 0, totalResmi = 0, missResmi = [], missParsed = [];
for (const f of files) {
  const kec = f.replace('.json', '');
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (data.error) { console.log(`ERR ${kec}: ${data.error}`); continue; }
  const resmiKec = resmi.get(norm(kec)) ?? new Map();
  const parsedNorms = new Set(data.desa.map((d) => norm(d.name)));
  totalParsed += data.desa.length;
  totalResmi += resmiKec.size;
  for (const [dn, dname] of resmiKec) {
    if (!parsedNorms.has(dn)) missResmi.push(`${kec}/${dname}`);
  }
  for (const d of data.desa) {
    if (!resmiKec.has(norm(d.name))) missParsed.push(`${kec}/${d.name} (sawah ${d.sawah_m2})`);
  }
}
console.log(`parsed: ${totalParsed} baris | resmi: ${totalResmi} desa/kel`);
console.log(`\n=== RESMI TIDAK ADA DI BASELINE (${missResmi.length}) ===`);
missResmi.forEach((x) => console.log('  ' + x));
console.log(`\n=== PARSED TIDAK MATCH RESMI (${missParsed.length}) ===`);
missParsed.forEach((x) => console.log('  ' + x));
