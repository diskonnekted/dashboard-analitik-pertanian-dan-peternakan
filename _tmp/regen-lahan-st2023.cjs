// REGEN lahan_desa dari baseline ST2023 Tabel 4.10 (luas lahan yang dikuasai per desa, m2).
// Input : _tmp/lahan-mapping.json  (278 baris, hasil _tmp/map-lahan.cjs — sudah tervalidasi
//         278/278 mapped, semua kecamatan bebas 0, kontrol agregat PDF 0 selisih)
//         _tmp/desa-dump.json      (tabel desa: id, kecamatan_id, nama, nama_norm)
// Langkah:
//   1) backup isi lahan_desa lama -> _tmp/lahan_desa-backup-<ts>.json
//   2) TRANSACTION: DELETE + INSERT 278 baris (tahun 2023, sumber 'manual',
//      sumber_json 'bps-st2023-t410', confidence 'bps')
//      CATATAN aturan sumber: DB saat ini SELURUHNYA sumber='json_fallback' (tidak ada
//      baris manual), jadi replace penuh tidak menimpa nilai manual apa pun; baris baru
//      ditandai 'manual' supaya kolom sumber tidak diubah oleh import ulang datasets.mjs.
//   3) verify in-transaction (count, Sigma per kecamatan, spot-check) -> COMMIT / ROLLBACK
//   4) regenerate public/data/lahan-fallback.json (frontend, fetch-first no-cache)
//      + hapus public/data/lahan-fallback-updated.json (agar import ulang ETL tidak
//      membawa data datastore Pemkab lama yang campuran satuan)
//   5) verify baca-balik fallback JSON
const fs = require('fs');
const path = require('path');
const mysql = require(require.resolve('mysql2/promise', {
  paths: [path.join(__dirname, '..', 'backend', 'node_modules')],
}));

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const stripPrefix = (s) =>
  String(s).trim().replace(/^(Kelurahan|Kel|Desa)\.?\s*/i, '').trim();

async function main() {
  const mapping = JSON.parse(fs.readFileSync('_tmp/lahan-mapping.json', 'utf8'));
  const desaDump = JSON.parse(fs.readFileSync('_tmp/desa-dump.json', 'utf8'));
  const desaById = new Map(desaDump.map((d) => [d.id, d]));

  if (mapping.length !== 278) throw new Error(`mapping harus 278 baris, dapat ${mapping.length}`);

  // ---- siapkan rows -------------------------------------------------------
  // Konvensi DB lahan_desa (mengikuti importer datasets.mjs importLahanDesa):
  // desa/desa_norm UPPERCASE BERSIH tanpa prefix (seperti file fallback lama
  // "KUTAYASA"), bukan bentuk tabel desa ("Kel. Argasoka"/"KEL. ARGASOKA") —
  // supaya unique key (kecamatan_id, desa_norm, tahun) konsisten & import ulang
  // dari fallback baru idempoten. Frontend desa.ts stripPrefix cocok dgn bentuk ini.
  const rows = mapping.map((m) => {
    const d = desaById.get(m.desaId);
    if (!d) throw new Error(`desaId ${m.desaId} tidak ada di dump (${m.desaDb})`);
    const desaBersih = stripPrefix(d.nama).toUpperCase();
    if (!desaBersih || /^(KEL|DESA)/.test(desaBersih)) {
      throw new Error(`stripPrefix gagal: "${d.nama}" -> "${desaBersih}"`);
    }
    const sawah = Math.round((m.sawahM2 / 1e4) * 1000) / 1000;
    const bukan = Math.round((m.bukanSawahM2 / 1e4) * 1000) / 1000;
    return {
      kecamatan_id: d.kecamatan_id, kecamatan: m.kecamatan,
      desa: desaBersih, desa_norm: desaBersih,
      tahun: 2023, sawah_ha: sawah, bukan_sawah_ha: bukan,
      total_ha: Math.round((m.jumlahM2 / 1e4) * 1000) / 1000,
      sawahM2: m.sawahM2, bukanM2: m.bukanSawahM2,
    };
  });
  const seen = new Set();
  for (const r of rows) {
    const k = `${r.kecamatan_id}|${r.desa_norm}`;
    if (seen.has(k)) throw new Error(`duplikat unique key: ${r.kecamatan} ${r.desa_norm}`);
    seen.add(k);
  }

  // Sigma referensi per kecamatan (Ha, dari m2 asli)
  const sigmaRef = {};
  for (const r of rows) sigmaRef[r.kecamatan] = (sigmaRef[r.kecamatan] || 0) + r.sawahM2 / 1e4;

  const conn = await mysql.createConnection({
    host: '127.0.0.1', user: 'sispertani', password: 'sispertani', database: 'sispertani',
  });

  // ---- 1) backup ----------------------------------------------------------
  const [old] = await conn.query('SELECT * FROM lahan_desa ORDER BY id');
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
  const backupPath = `_tmp/lahan_desa-backup-${ts}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(old, null, 1));
  console.log(`backup ${old.length} baris lama -> ${backupPath}`);

  // ---- 2) replace dalam transaction ---------------------------------------
  await conn.beginTransaction();
  try {
    await conn.query('DELETE FROM lahan_desa');
    await conn.query(
      `INSERT INTO lahan_desa
         (kecamatan_id, desa, desa_norm, tahun, sawah_ha, bukan_sawah_ha, total_ha, sumber_json, confidence, sumber)
       VALUES ?`,
      [rows.map((r) => [r.kecamatan_id, r.desa, r.desa_norm, r.tahun, r.sawah_ha,
        r.bukan_sawah_ha, r.total_ha, 'bps-st2023-t410', 'bps', 'manual'])],
    );

    // ---- 3) verify in-transaction -----------------------------------------
    const [cnt] = await conn.query('SELECT COUNT(*) AS n FROM lahan_desa');
    if (cnt[0].n !== 278) throw new Error(`count != 278 (${cnt[0].n})`);

    const [agg] = await conn.query(`
      SELECT k.nama AS kecamatan, SUM(l.sawah_ha) AS sawah, COUNT(*) AS n
      FROM lahan_desa l JOIN kecamatan k ON k.id = l.kecamatan_id
      GROUP BY k.nama`);
    for (const a of agg) {
      const ref = sigmaRef[a.kecamatan];
      if (ref == null) throw new Error(`kecamatan tak terduga di DB: ${a.kecamatan}`);
      const diff = Math.abs(Number(a.sawah) - ref);
      if (diff > 0.05) throw new Error(`Sigma ${a.kecamatan}: DB ${a.sawah} vs ref ${ref.toFixed(3)} (diff ${diff.toFixed(3)})`);
    }
    if (agg.length !== 20) throw new Error(`kecamatan terdata != 20 (${agg.length})`);

    const spot = { ARGASOKA: 34.592, TEMPURAN: 0.103, BEDANA: 91.177, KUTAYASA: 60.082, PEGERGUNUNG: 4.996 };
    for (const [dn, expected] of Object.entries(spot)) {
      const [s] = await conn.query(
        'SELECT desa, sawah_ha FROM lahan_desa WHERE desa_norm = ? AND tahun = 2023', [dn]);
      if (!s.length) throw new Error(`spot-check ${dn}: baris tidak ada`);
      if (Math.abs(Number(s[0].sawah_ha) - expected) > 0.002) {
        throw new Error(`spot-check ${dn}: ${s[0].sawah_ha} != ${expected}`);
      }
      console.log(`  spot ${dn} (${s[0].desa}): sawah ${s[0].sawah_ha} Ha OK`);
    }

    await conn.commit();
    console.log('COMMIT: lahan_desa = 278 baris ST2023 (Sigma 20 kecamatan OK, toleransi 0.05 Ha)');
  } catch (e) {
    await conn.rollback();
    console.error('ROLLBACK — DB tidak berubah:', e.message);
    await conn.end();
    process.exit(1);
  }

  // ---- 4) regenerate fallback publik --------------------------------------
  const fallback = rows.map((r) => ({
    desa: r.desa,
    kecamatan: r.kecamatan,
    lahanSawah: Math.round((r.sawahM2 / 1e4) * 1e4) / 1e4,
    lahanBukanSawah: Math.round((r.bukanM2 / 1e4) * 1e4) / 1e4,
    jumlah: Math.round(((r.sawahM2 + r.bukanM2) / 1e4) * 1e4) / 1e4,
    tahun: '2023',
  }));
  if (fallback.some((f) => !f.desa || /^(KEL|DESA)/.test(f.desa))) {
    throw new Error('ada nama desa fallback yang masih berprefix/kosong');
  }
  fs.writeFileSync('public/data/lahan-fallback.json', JSON.stringify(fallback, null, 1));
  const upd = 'public/data/lahan-fallback-updated.json';
  if (fs.existsSync(upd)) { fs.unlinkSync(upd); console.log(`hapus ${upd}`); }
  console.log(`public/data/lahan-fallback.json ditulis ulang: ${fallback.length} baris (2023, ST2023 T4.10)`);

  // ---- 5) verify baca-balik ----------------------------------------------
  const back = JSON.parse(fs.readFileSync('public/data/lahan-fallback.json', 'utf8'));
  if (back.length !== 278) throw new Error(`fallback baca-balik != 278 (${back.length})`);
  const sigJ = {};
  for (const b of back) sigJ[b.kecamatan] = (sigJ[b.kecamatan] || 0) + b.lahanSawah;
  let maxDiff = 0;
  for (const [kec, ref] of Object.entries(sigmaRef)) {
    const diff = Math.abs(sigJ[kec] - ref);
    if (diff > 0.05) throw new Error(`Sigma fallback ${kec}: ${sigJ[kec].toFixed(3)} vs ${ref.toFixed(3)}`);
    if (diff > maxDiff) maxDiff = diff;
  }
  if (!back.every((b) => b.tahun === '2023')) throw new Error('fallback ada baris bukan 2023');
  console.log(`fallback baca-balik OK: 278 baris, Sigma 20 kec match (maxDiff ${maxDiff.toFixed(4)} Ha)`);
  console.log(`Sigma sawah kabupaten: ${(Object.values(sigJ).reduce((a, b) => a + b, 0)).toFixed(2)} Ha`);

  await conn.end();
  console.log('REGEN SELESAI.');
}
main().catch((e) => { console.error(e); process.exit(1); });
