/**
 * regen-fallback-lahan.cjs — Regen public/data/lahan-fallback.json dari MySQL
 * (query & mapping identik backend/src/routes/lahan.js) supaya fallback lokal
 * konsisten dengan API. Field baru: tanamanTahunan, totalDikuasai, jumlah=total_dikuasai.
 */
const fs = require('fs');
let mysql;
try { mysql = require('mysql2/promise'); }
catch { mysql = require('I:/pertanian/pertanian-2/backend/node_modules/mysql2/promise'); }

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: '', database: 'sispertani',
  });
  const [rows] = await conn.query(
    `SELECT x.desa, x.kecamatan, x.sawah_ha, x.bukan_sawah_ha, x.tanaman_tahunan_ha, x.total_dikuasai_ha, x.total_ha, x.tahun
     FROM (
       SELECT l.desa, k.nama AS kecamatan, l.sawah_ha, l.bukan_sawah_ha, l.tanaman_tahunan_ha, l.total_dikuasai_ha, l.total_ha, l.tahun,
              ROW_NUMBER() OVER (
                PARTITION BY l.kecamatan_id, l.desa_norm
                ORDER BY (l.sawah_ha + l.bukan_sawah_ha) = 0, l.tahun DESC
              ) AS rn
       FROM lahan_desa l
       JOIN kecamatan k ON k.id = l.kecamatan_id
     ) x
     WHERE x.rn = 1
     ORDER BY x.kecamatan, x.desa`
  );
  const data = rows.map((r) => ({
    desa: r.desa,
    kecamatan: r.kecamatan,
    lahanSawah: Number(r.sawah_ha),
    lahanBukanSawah: Number(r.bukan_sawah_ha),
    tanamanTahunan: r.tanaman_tahunan_ha === null ? null : Number(r.tanaman_tahunan_ha),
    totalDikuasai: r.total_dikuasai_ha === null ? null : Number(r.total_dikuasai_ha),
    jumlah:
      r.total_dikuasai_ha !== null ? Number(r.total_dikuasai_ha)
      : r.total_ha !== null ? Number(r.total_ha)
      : Number(r.sawah_ha) + Number(r.bukan_sawah_ha),
    tahun: String(r.tahun),
  }));
  const out = 'I:/pertanian/pertanian-2/public/data/lahan-fallback.json';
  fs.writeFileSync(out, JSON.stringify(data), 'utf8');
  const sum = data.reduce((s, d) => s + d.jumlah, 0);
  const tt = data.filter((d) => d.tanamanTahunan !== null).length;
  console.log(`Fallback: n=${data.length} | Σjumlah=${Math.round(sum * 10) / 10} Ha | tanamanTahunan ada: ${tt} | tahun unik: ${[...new Set(data.map((d) => d.tahun))].join(',')}`);
  const c = data.find((d) => d.desa === 'Clapar');
  console.log(`SPOT Clapar: sawah=${c.lahanSawah} tanamanTahunan=${c.tanamanTahunan} totalDikuasai=${c.totalDikuasai} jumlah=${c.jumlah}`);
  await conn.end();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
