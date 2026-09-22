// Dump kondisi lahan_desa + desa dari MySQL untuk analisis mapping regen ST2023.
// Output: _tmp/lahan_desa-dump.json, _tmp/desa-dump.json (+ ringkasan stdout)
const path = require('path');
const fs = require('fs');
// mysql2 hanya terinstal di backend/node_modules
const mysql = require(require.resolve('mysql2/promise', {
  paths: [path.join(__dirname, '..', 'backend', 'node_modules')],
}));

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', user: 'sispertani', password: 'sispertani', database: 'sispertani',
  });

  const [agg] = await conn.query(`
    SELECT k.nama AS kecamatan, l.tahun, l.sumber, COUNT(*) AS n,
           SUM(l.sawah_ha) AS sawah_ha
    FROM lahan_desa l JOIN kecamatan k ON k.id = l.kecamatan_id
    GROUP BY k.nama, l.tahun, l.sumber
    ORDER BY k.nama, l.tahun, l.sumber`);
  console.log('=== agregat lahan_desa (kec, tahun, sumber, n, Σsawah_ha) ===');
  for (const r of agg) {
    console.log(`${r.kecamatan} | ${r.tahun} | ${r.sumber} | n=${r.n} | Σsawah=${Number(r.sawah_ha).toFixed(2)}`);
  }

  const [rows] = await conn.query(`
    SELECT l.id, k.nama AS kecamatan, l.desa, l.desa_norm, l.tahun,
           l.sawah_ha, l.bukan_sawah_ha, l.total_ha, l.sumber, l.sumber_json, l.confidence
    FROM lahan_desa l JOIN kecamatan k ON k.id = l.kecamatan_id
    ORDER BY k.nama, l.tahun, l.desa`);
  fs.writeFileSync('_tmp/lahan_desa-dump.json', JSON.stringify(rows, null, 1));
  console.log(`\nlahan_desa total = ${rows.length} baris -> _tmp/lahan_desa-dump.json`);

  const [desa] = await conn.query(`
    SELECT d.id, d.kecamatan_id, k.nama AS kecamatan, d.nama, d.nama_norm
    FROM desa d JOIN kecamatan k ON k.id = d.kecamatan_id
    ORDER BY k.nama, d.nama`);
  fs.writeFileSync('_tmp/desa-dump.json', JSON.stringify(desa, null, 1));
  const perKec = {};
  for (const d of desa) perKec[d.kecamatan] = (perKec[d.kecamatan] || 0) + 1;
  console.log(`desa total = ${desa.length} -> _tmp/desa-dump.json`);
  console.log('desa per kecamatan:', JSON.stringify(perKec));

  await conn.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
