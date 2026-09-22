/**
 * upsert-lahan-t410.cjs — Perluas lahan_desa dengan 9 kolom Tabel 4.10 ST2023:
 *   padang_sementara_ha, padang_permanen_ha, fallow_ha, tanaman_tahunan_ha,
 *   kandang_ternak_ha, kehutanan_ha, perikanan_ha, non_pertanian_ha, total_dikuasai_ha
 *
 * Aturan:
 *   - Hanya UPDATE baris tahun=2023 sumber_json='bps-st2023-t410' (hasil regen, bukan entri manual)
 *   - TIDAK menyentuh sawah_ha / bukan_sawah_ha / total_ha (data lama sudah benar)
 *   - Idempoten: ALTER hanya menambah kolom yang belum ada (information_schema)
 *   - Match key: (kecamatan_id, desa_norm) dari tabel kecamatan + lahan_desa existing
 */
const fs = require('fs');
let mysql;
try { mysql = require('mysql2/promise'); }
catch { mysql = require('I:/pertanian/pertanian-2/backend/node_modules/mysql2/promise'); }

const DATA = JSON.parse(fs.readFileSync('I:/pertanian/pertanian-2/_tmp/lahan-t410.json', 'utf8'));
const NEW_COLS = [
  ['padang_sementara_ha', 'Padang Penggembalaan Sementara (kol 4)'],
  ['padang_permanen_ha', 'Padang Penggembalaan Permanen (kol 5)'],
  ['fallow_ha', 'Sementara Belum Ditanami/Fallow (kol 6)'],
  ['tanaman_tahunan_ha', 'Tanaman Tahunan (kol 7)'],
  ['kandang_ternak_ha', 'Kandang Ternak & Bangunan Pertanian Lainnya (kol 8)'],
  ['kehutanan_ha', 'Lahan Kegiatan Kehutanan (kol 9)'],
  ['perikanan_ha', 'Lahan Budi Daya Perikanan (kol 10)'],
  ['non_pertanian_ha', 'Bukan Lahan Pertanian & Bukan Tempat Tinggal (kol 11)'],
  ['total_dikuasai_ha', 'Total Lahan Dikuasai (kol 12)'],
];
const COL_KEYS = [
  'padang_sementara', 'padang_permanen', 'fallow', 'tanaman_tahunan',
  'kandang_ternak', 'kehutanan', 'perikanan', 'non_pertanian',
];
const HA = (m2) => (m2 === null ? null : Math.round((m2 / 10000) * 1000) / 1000);

// Varian ejaan: nama dump PDF BPS -> desa_norm di DB (basis geojson, verified via HEX)
const VARIAN_DB = {
  Batur: { 'DIENG KULON': 'DIENGKULON' },
  Kalibening: { 'KALISAT KIDUL': 'KALISATKIDUL', KARANGANYAR: 'KARANGANYAR.' },
  Karangkobar: { PURWODADI: 'PURWADADI' },
  Mandiraja: { 'MANDIRAJA KULON': 'MANDIRAJAKULON', 'MANDIRAJA WETAN': 'MANDIRAJAWETAN' },
  Pejawaran: { PEGUNDUNGAN: 'PAGUNDUNGAN', SARWODADI: 'SARWADADI' },
  Purwanegara: { PUCUNGBEDUG: 'PUCUNGBEDUK' },
  Sigaluh: { SINGAMERTA: 'SINGOMERTO', TUNGGARA: 'TUNGGORO' },
  Susukan: {
    'GUMELEM KULON': 'GUMELEMKULON', 'GUMELEM WETAN': 'GUMELEMWETAN',
    PEKIKIRAN: 'PAKIKIRAN', 'PANERUSAN KULON': 'PANARUSANKULON',
    'PANERUSAN WETAN': 'PANARUSANWETAN', 'PIASA WETAN': 'PIASAWETAN',
  },
  Wanadadi: { GUMINGSIR: 'GUMINGSIR.' },
  Wanayasa: { PAGERGUNUNG: 'PEGERGUNUNG' },
};

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: '', database: 'sispertani',
  });

  // 1) ALTER idempoten
  const [existing] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA='sispertani' AND TABLE_NAME='lahan_desa'`
  );
  const have = new Set(existing.map((r) => r.COLUMN_NAME));
  for (const [col] of NEW_COLS) {
    if (!have.has(col)) {
      await conn.query(`ALTER TABLE lahan_desa ADD COLUMN ${col} DECIMAL(10,3) NULL`);
      console.log(`ALTER: + ${col}`);
    }
  }
  console.log('Skema OK (9 kolom baru tersedia)');

  // 2) Map kecamatan + desa_norm existing
  const [kecs] = await conn.query('SELECT id, nama FROM kecamatan');
  const kecMap = {};
  for (const k of kecs) kecMap[k.nama.trim().toLowerCase()] = k.id;
  const [rows] = await conn.query(
    `SELECT id, kecamatan_id, desa_norm FROM lahan_desa WHERE tahun=2023 AND sumber_json='bps-st2023-t410'`
  );
  const desaMap = new Map(rows.map((r) => [`${r.kecamatan_id}|${r.desa_norm}`, r.id]));
  console.log(`Baris target 2023: ${rows.length} | kecamatan: ${kecs.length}`);

  // 3) UPDATE per desa
  let ok = 0, missKec = [], missDesa = [], mismatchSum = 0;
  const seen = new Set();
  for (const kec of DATA) {
    const kecId = kecMap[kec.kecamatan.toLowerCase()];
    if (!kecId) { missKec.push(kec.kecamatan); continue; }
    for (const d of kec.desas) {
      const dbNorm = (VARIAN_DB[kec.kecamatan] && VARIAN_DB[kec.kecamatan][d.name]) || d.name;
      const key = `${kecId}|${dbNorm}`;
      const id = desaMap.get(key);
      if (!id) { missDesa.push(`${kec.kecamatan}/${d.name}`); continue; }
      if (seen.has(id)) { missDesa.push(`DUP ${kec.kecamatan}/${d.name}`); continue; }
      seen.add(id);
      const sets = COL_KEYS.map((c) => HA(d.m2[c]));
      const tot = HA(d.m2.jumlah);
      // sanity: Ha kolom harus identik dgn m2/10000 yang dibulatkan; jumlah desa dicek parser
      await conn.execute(
        `UPDATE lahan_desa SET
           padang_sementara_ha=?, padang_permanen_ha=?, fallow_ha=?, tanaman_tahunan_ha=?,
           kandang_ternak_ha=?, kehutanan_ha=?, perikanan_ha=?, non_pertanian_ha=?,
           total_dikuasai_ha=?
         WHERE id=? AND tahun=2023 AND sumber_json='bps-st2023-t410'`,
        [...sets, tot, id]
      );
      ok++;
    }
  }
  console.log(`UPDATE OK: ${ok}/278`);
  if (missKec.length) console.log('MISS kecamatan:', missKec.join(', '));
  if (missDesa.length) console.log('MISS desa:', missDesa.slice(0, 20).join(' | '), `(total ${missDesa.length})`);

  // 4) Verifikasi post: sigma per kolom vs parse + spot-check
  const [v] = await conn.query(
    `SELECT COUNT(*) n, SUM(total_dikuasai_ha) tot FROM lahan_desa WHERE tahun=2023 AND total_dikuasai_ha IS NOT NULL`
  );
  const parseTot = DATA.reduce((s, k) => s + k.desas.reduce((a, d) => a + d.m2.jumlah, 0), 0);
  console.log(`DB: n=${v[0].n} Σtotal_dikuasai=${Number(v[0].tot).toLocaleString('id-ID')} Ha | parse Σm2=${parseTot.toLocaleString('id-ID')} m2 (= ${(parseTot / 10000).toLocaleString('id-ID')} Ha)`);

  const [spot] = await conn.query(
    `SELECT d.desa_norm, d.kecamatan_id, d.sawah_ha, d.bukan_sawah_ha, d.tanaman_tahunan_ha, d.total_dikuasai_ha
     FROM lahan_desa d WHERE d.tahun=2023 AND d.desa_norm IN ('JENGGAWUR','CLAPAR')
     ORDER BY d.desa_norm`
  );
  for (const s of spot) console.log(`SPOT ${s.desa_norm} (kec ${s.kecamatan_id}): sawah=${s.sawah_ha} bukan_sawah=${s.bukan_sawah_ha} tanaman_tahunan=${s.tanaman_tahunan_ha} total_dikuasai=${s.total_dikuasai_ha}`);

  // bottom-5 untuk sanity ranking frontend
  const [bot] = await conn.query(
    `SELECT desa_norm, kecamatan_id, total_dikuasai_ha FROM lahan_desa
     WHERE tahun=2023 AND total_dikuasai_ha IS NOT NULL ORDER BY total_dikuasai_ha ASC LIMIT 5`
  );
  console.log('BOTTOM-5:', bot.map((b) => `${b.desa_norm}(kec${b.kecamatan_id})=${b.total_dikuasai_ha}`).join(', '));

  await conn.end();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
