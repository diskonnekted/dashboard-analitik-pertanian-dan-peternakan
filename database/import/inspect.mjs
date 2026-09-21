/** inspect.mjs — diagnostik struktur baris sumber (bukan bagian dari import) */
import { makeCtx, readCsv, cleanNum, normStr, isAggregateRow, meltWideYear, initKecamatanResolver, stripKecPrefix, readJson } from './lib.mjs';

const ctx = makeCtx({ dryRun: true });
const geo = readJson(ctx, 'peta_desa_v3.geojson');
const names = [...new Set(geo.features.map((f) => stripKecPrefix(f.properties.Kecamatan)))].sort();
initKecamatanResolver(ctx, names);
console.log('GEOJSON kecamatan:', JSON.stringify(names));

function inspect(file, label) {
  const { rows, fields } = readCsv(ctx, file);
  const tahunDist = {};
  let agg = 0, noKec = [], noTahun = 0, ok = 0;
  for (const r of rows) {
    const kec = normStr(r['Kecamatan']);
    const th = cleanNum(r['Tahun']);
    if (isAggregateRow(kec)) { agg++; continue; }
    if (!ctx.kecResolver(kec, null)) { noKec.push(kec); continue; }
    if (th === null) { noTahun++; continue; }
    ok++;
    tahunDist[th] = (tahunDist[th] || 0) + 1;
  }
  console.log(`\n### ${label}`);
  console.log(`baris total=${rows.length} ok=${ok} agregat=${agg} non-kec=${noKec.length} tanpa-tahun=${noTahun}`);
  console.log(`distribusi tahun: ${JSON.stringify(tahunDist)}`);
  if (noKec.length) console.log(`non-kec unik: ${JSON.stringify([...new Set(noKec)])}`);
}

inspect('Luas Panen, Produksi dan Rata-rata Produksi Padi Sawah Dan Padi Ladang CSV.csv', 'PADI');
inspect('Luas Panen, Produksi dan Rata-rata Produksi Tanaman Pangan (Jagung dan Ubi Kayu) CSV.csv', 'PALAWIJA-1');
inspect('Luas Panen, Produksi dan Rata-rata Produksi Tanaman Pangan (Kacang Tanah dan Kedelai) CSV.csv', 'PALAWIJA-2');
inspect('Luas Panen, Produksi dan Rata-rata Produksi Tanaman Pangan (Ubi Jalar dan Kacang Hijau) CSV.csv', 'PALAWIJA-3');

// Perkebunan: klasifikasi baris & cek blok ringkasan
for (const f of ['Luas Areal Tanaman Perkebunan Menurut Kecamatan dan Jenis Tanaman (ha) CSV.csv',
                 'Produksi Perkebunan Menurut Kecamatan dan Jenis Tanaman (ton) CSV.csv']) {
  const { rows, fields } = readCsv(ctx, f);
  const melted = meltWideYear(rows, fields);
  const perRow = new Map();
  rows.forEach((r, i) => perRow.set(i, { kec: normStr(r['Kecamatan']), tahun: cleanNum(r['Tahun']) }));
  const summaryRows = new Map(); // "nama|tahun" -> count melted
  let kecMelt = 0;
  // rekonstruksi: kelompokkan melted per baris sumber
  // (meltWideYear tak mengembalikan indeks baris -> deteksi via pola)
  const byKey = new Map();
  for (const m of melted) {
    const isKec = !!ctx.kecResolver(m.kecamatan, null);
    if (isKec) { kecMelt++; continue; }
    const key = `${m.kecamatan}|${m.tahun}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(`${m.komoditas}=${m.nilai}`);
  }
  console.log(`\n### ${f}`);
  console.log(`melted kecamatan=${kecMelt}, baris ringkasan unik=${byKey.size}`);
  let shown = 0;
  for (const [k, v] of byKey) {
    if (shown++ < 12) console.log(`  ${k} -> ${v.join(', ')}`);
  }
}
