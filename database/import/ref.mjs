/**
 * ref.mjs — tabel referensi: kecamatan + desa (dari peta_desa_v3.geojson)
 *                    dan dataset_sumber (dari distankan-index.json)
 *
 * Urutan kecamatan di-sort alfabetis agar id deterministik di setiap import.
 */
import {
  readJson, stripKecPrefix, stripDesaPrefix, normDesa, normStr, kecBaku,
  upsert, logSync,
} from './lib.mjs';

const KEC_VARIAN = {
  'Purwanegara': ['Purwonegoro', 'Purwonegara', 'Purwongoro', 'Purwonegero'],
  'Purwareja Klampok': ['Purworejo Klampok', 'Klampok', 'Purwarejaklampok'],
  'Wanadadi': ['Wonodadi', 'Wanodadi'],
};

export async function importRef(ctx) {
  const geo = readJson(ctx, 'peta_desa_v3.geojson');
  const features = geo.features ?? [];
  if (features.length === 0) throw new Error('peta_desa_v3.geojson tanpa features');

  // --- kecamatan (distinct, sorted, DIKANONALKAN — geojson menulis
  //     "Purwarejaklampok" satu kata; nama baku: "Purwareja Klampok") ---
  const kecNames = [
    ...new Set(
      features
        .map((f) => kecBaku(stripKecPrefix(f.properties.Kecamatan)))
        .filter(Boolean)
    ),
  ].sort();

  const kecRows = kecNames.map((nama) => ({
    nama,
    nama_norm: normDesa(nama),
    varian: KEC_VARIAN[nama] ? JSON.stringify(KEC_VARIAN[nama]) : null,
  }));

  if (!ctx.dryRun) {
    // id harus stabil: kosongkan tabel anak dulu baru reseed terurut
    await ctx.db.query('SET FOREIGN_KEY_CHECKS=0');
    await ctx.db.query('TRUNCATE TABLE kecamatan');
    await ctx.db.query('TRUNCATE TABLE desa');
    await ctx.db.query('SET FOREIGN_KEY_CHECKS=1');
  }
  const nKec = await upsert(ctx, 'kecamatan', kecRows, ['nama_norm', 'varian']);

  // peta nama -> id (deterministik: index+1 di dry-run)
  const kecId = new Map();
  if (ctx.dryRun) {
    kecNames.forEach((n, i) => kecId.set(n, i + 1));
  } else {
    const [rows] = await ctx.db.query('SELECT id, nama FROM kecamatan');
    rows.forEach((r) => kecId.set(r.nama, r.id));
  }

  // --- desa ---
  const desaRows = [];
  const seen = new Set();
  for (const f of features) {
    const p = f.properties ?? {};
    const kecNama = kecBaku(stripKecPrefix(p.Kecamatan));
    const nama = stripDesaPrefix(p.Nama_Desa_ ?? p.Nama_Desa ?? '');
    if (!kecNama || !nama) continue;
    const kid = kecId.get(kecNama);
    if (!kid) {
      ctx.warnings.push(`desa "${nama}" kecamatan tak dikenal "${p.Kecamatan}"`);
      continue;
    }
    const key = `${kid}|${normDesa(nama)}`;
    if (seen.has(key)) continue; // duplikat geometri
    seen.add(key);
    desaRows.push({ kecamatan_id: kid, nama, nama_norm: normDesa(nama) });
  }
  desaRows.sort((a, b) => a.kecamatan_id - b.kecamatan_id || a.nama_norm.localeCompare(b.nama_norm));
  const nDesa = await upsert(ctx, 'desa', desaRows, ['nama']);

  // --- dataset_sumber dari distankan-index.json ---
  let nIdx = 0;
  try {
    const idx = readJson(ctx, 'distankan-index.json');
    const idxRows = (Array.isArray(idx) ? idx : []).map((d) => ({
      folder: normStr(d.folder),
      mode: normStr(d.mode) || null,
      tahun_min: Array.isArray(d.years) ? Math.min(...d.years) : null,
      tahun_max: Array.isArray(d.years) ? Math.max(...d.years) : null,
      row_count: d.row_count ?? null,
      file_csv: normStr(d.wide_csv) || null,
    }));
    nIdx = await upsert(ctx, 'dataset_sumber', idxRows, ['mode', 'tahun_min', 'tahun_max', 'row_count', 'file_csv']);
  } catch (e) {
    ctx.warnings.push(`distankan-index.json dilewati: ${e.message}`);
  }

  if (kecNames.length !== 20) {
    ctx.warnings.push(`JUMLAH KECAMATAN = ${kecNames.length} (seharusnya 20) — periksa geojson`);
  }

  await logSync(ctx, 'kecamatan', 'geojson', nKec);
  await logSync(ctx, 'desa', 'geojson', nDesa);
  await logSync(ctx, 'dataset_sumber', 'json', nIdx);

  return {
    kecamatan: kecNames.length,
    desa: desaRows.length,
    dataset_sumber: nIdx,
  };
}
