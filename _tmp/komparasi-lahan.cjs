/**
 * _tmp/komparasi-lahan.cjs — komparasi per desa (kolom LAHAN SAWAH):
 *   A. ST2023 Tabel 4.10 by-location (m² → Ha)  = baseline resmi BPS
 *   B. Datastore Pemkab opendata.banjarnegarakab.go.id (raw string)
 *   C. Data yang tampil sekarang (public/data/lahan-fallback.json)
 * Usage: node _tmp/komparasi-lahan.cjs <kecamatan>   (cth: Banjarnegara)
 */
const fs = require('fs');
const path = require('path');

const CKAN = 'https://opendata.banjarnegarakab.go.id';

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

async function j(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}

async function main() {
  const kec = process.argv[2];
  const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'st2023-lahan', `${kec.toLowerCase()}.json`), 'utf8'));
  if (baseline.error) throw new Error('baseline error: ' + baseline.error);

  // --- B. datastore Pemkab
  const orgId = 'kecamatan-' + kec.toLowerCase();
  let recs = [];
  try {
    const org = await j(`${CKAN}/api/3/action/organization_show?id=${orgId}&include_datasets=true`);
    const pkg = org.result.packages.find((p) => /luas-lahan-pertanian/.test(p.name));
    if (pkg) {
      const ps = await j(`${CKAN}/api/3/action/package_show?id=${pkg.name}`);
      const res = ps.result.resources.find((r) => String(r.datastore_active) === 'true');
      if (res) {
        const ds = await j(`${CKAN}/api/3/action/datastore_search?resource_id=${res.id}&limit=1000`);
        recs = ds.result.records;
      }
    }
  } catch (e) {
    console.error('  (datastore Pemkab gagal: ' + e.message + ')');
  }
  const byDesaPemkab = new Map();
  for (const r of recs) {
    const desa = r['Desa/Kelurahan'] ?? r.desa ?? r.Desa;
    const key = norm(desa);
    if (!key) continue;
    if (!byDesaPemkab.has(key)) byDesaPemkab.set(key, []);
    byDesaPemkab.get(key).push(r);
  }

  // --- C. fallback.json (data halaman sekarang)
  const fb = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'lahan-fallback.json'), 'utf8'));
  const byDesaFb = new Map();
  for (const e of fb) if (norm(e.kecamatan) === norm(kec)) byDesaFb.set(norm(e.desa), e);

  console.log(`\nKecamatan ${kec} — LAHAN SAWAH (Ha) — baseline ST2023 Tabel 4.10 by-location`);
  console.log('desa'.padEnd(20) + 'ST2023'.padStart(10) + '  Pemkab(raw)'.padEnd(18) + 'fb-sekarang'.padStart(12) + '  rasio fb/ST'.padEnd(12) + ' verdict');
  console.log('-'.repeat(105));
  let match = 0, scaleErr = 0, mismatch = 0, noData = 0;
  for (const d of baseline.desa) {
    const stHa = d.sawah_m2 / 10000;
    const key = norm(d.name);
    // pemkab: baris terbaru
    const pm = (byDesaPemkab.get(key) ?? []).slice(-1)[0];
    let pmRaw = '-';
    let pmVerdict = '';
    if (pm) {
      const rawS = String(pm['Lahan Sawah'] ?? '-');
      pmRaw = rawS;
      const v = Number(String(rawS).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
      if (Number.isFinite(v) && v > 0) {
        if (Math.abs(v - d.sawah_m2) / d.sawah_m2 < 0.01) { pmVerdict = 'm2=ST✓'; match++; }
        else if (Math.abs(v / 10000 - stHa) / stHa < 0.01) { pmVerdict = 'Ha=ST✓'; match++; }
        else { pmVerdict = `beda x${(v / d.sawah_m2).toFixed(1)}`; mismatch++; }
      } else { pmVerdict = 'kosong?'; noData++; }
    } else { pmVerdict = 'tidak ada'; noData++; }
    // fallback sekarang
    const fbe = byDesaFb.get(key);
    const fbHa = fbe ? Number(fbe.lahanSawah) : null;
    const rasio = fbHa !== null && stHa > 0 ? (fbHa / stHa).toFixed(2) : '—';
    console.log(
      d.name.padEnd(20) +
      stHa.toFixed(3).padStart(10) +
      `  ${pmRaw.padEnd(10)}${pmVerdict.padEnd(8)}` +
      (fbHa === null ? '—'.padStart(12) : fbHa.toFixed(3).padStart(12)) +
      `  ${rasio.padEnd(12)}` +
      (fbe ? ` s=${fbe.sumber ?? ''}/${fbe.confidence ?? ''}` : ' (tidak di fallback)')
    );
    if (pmVerdict.startsWith('beda')) scaleErr++;
  }
  const k = baseline.kontrol;
  console.log('-'.repeat(105));
  console.log(`KONTROL BPS: Σsawah desa=${k.sumSawah} m² vs baris Kecamatan=${k.kecSawah} m² (selisih ${k.selisihSawah})`);
  console.log(`Pemkab: ${match} match-ST, ${mismatch} beda, ${noData} kosong/tidak ada`);
}

main().catch((e) => { console.error(e); process.exit(1); });
