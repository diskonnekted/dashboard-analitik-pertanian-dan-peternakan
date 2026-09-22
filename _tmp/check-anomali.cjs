// Investigasi anomali baseline ST2023 vs DB: duplikat nama PDF, nama==kecamatan,
// dan pembanding nilai datastore Pemkab (lahan_desa dump) untuk menentukan pemasangan.
const fs = require('fs');

const SLUGS = ['banjarmangu','banjarnegara','batur','bawang','kalibening','karangkobar',
  'madukara','mandiraja','pagedongan','pagentan','pandanarum','pejawaran','punggelan',
  'purwanegara','purwareja-klampok','rakit','sigaluh','susukan','wanadadi','wanayasa'];
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

const desaDb = JSON.parse(fs.readFileSync('_tmp/desa-dump.json', 'utf8'));
const lahan = JSON.parse(fs.readFileSync('_tmp/lahan_desa-dump.json', 'utf8'));

function showKec(slug, focus) {
  const pdf = JSON.parse(fs.readFileSync(`_tmp/st2023-lahan/${slug}.json`, 'utf8'));
  const db = desaDb.filter((d) => norm(d.kecamatan) === norm(slug));
  const pem = lahan.filter((l) => norm(l.kecamatan) === norm(slug));
  console.log(`\n===== ${slug.toUpperCase()} =====`);
  console.log('PDF rows (urut file):');
  pdf.desa.forEach((r, i) => {
    const mark = focus && norm(r.name).includes(focus) ? ' <<<' : '';
    console.log(`  [${i + 1}] ${r.name}: sawah ${r.sawah_m2} m2${mark}`);
  });
  console.log('DB desa:', db.map((d) => d.nama).join(', '));
  const byDesa = {};
  for (const p of pem) {
    const k = norm(p.desa);
    (byDesa[k] = byDesa[k] || []).push(p);
  }
  console.log('Datastore Pemkab (lahan_desa lama) per desa:');
  for (const d of db) {
    const rows = byDesa[norm(d.nama)] || [];
    const s = rows.map((r) => `${r.tahun}: sawah=${r.sawah_ha} bukan=${r.bukan_sawah_ha}`).join(' | ');
    console.log(`  ${d.nama} -> ${s || 'TIDAK ADA BARIS'}`);
  }
  // scan: nama PDF == nama kecamatan
  pdf.desa.forEach((r) => {
    if (norm(r.name) === norm(slug)) console.log(`  !! baris PDF bernama sama dgn kecamatan: "${r.name}" sawah ${r.sawah_m2}`);
  });
}

showKec('kalibening', 'kalibening');
showKec('bawang', 'winong');
showKec('wanayasa', 'wanayasa');

console.log('\n===== SCAN GLOBAL: baris PDF bernama sama dengan kecamatan =====');
for (const slug of SLUGS) {
  const pdf = JSON.parse(fs.readFileSync(`_tmp/st2023-lahan/${slug}.json`, 'utf8'));
  pdf.desa.forEach((r) => {
    if (norm(r.name) === norm(slug)) console.log(`${slug}: "${r.name}" sawah=${r.sawah_m2} bukan=${r.bukan_m2}`);
  });
}
