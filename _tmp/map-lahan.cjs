// Analisis mapping desa PDF ST2023 Tabel 4.10 <-> desa resmi DB (tabel desa).
// READ-ONLY: tidak menyentuh DB. Output: _tmp/lahan-mapping.json + laporan stdout.
//
// Fix bug sesi lalu: DB resmen menulis "Kel. Argasoka" / "Kel.Karangtengah" (prefix Kel.),
// PDF ST2023 menulis "Argasoka" tanpa prefix. Kandidat key DB & PDF = {norm penuh, norm tanpa
// prefix desa/kel/kelurahan/kp} sehingga match dua arah. Varian ejaan eksplisit + laporan fuzzy.
const fs = require('fs');
const path = require('path');

const SLUGS = ['banjarmangu','banjarnegara','batur','bawang','kalibening','karangkobar',
  'madukara','mandiraja','pagedongan','pagentan','pandanarum','pejawaran','punggelan',
  'purwanegara','purwareja-klampok','rakit','sigaluh','susukan','wanadadi','wanayasa'];

// varian ejaan: key `${norm(namaKecDB)}|${normPdf}` -> norm nama DB tujuan
const VARIAN = {
  'wanayasa|pagergunung': 'pegergunung',
  'mandiraja|purwonegoro': 'purwanegara',
  'purwarejaklampok|purworejoklampok': 'purwarejaklampok',
  'karangkobar|purwodadi': 'purwadadi',
  'pejawaran|pegundungan': 'pagundungan',
  'pejawaran|sarwodadi': 'sarwadadi',
  'purwanegara|pucungbedug': 'pucungbeduk',
  'sigaluh|singamerta': 'singomerto',
  'sigaluh|tunggara': 'tunggoro',
  'susukan|pekikiran': 'pakikiran',
  'susukan|panerusankulon': 'panarusankulon',
  'susukan|panerusanwetan': 'panarusanwetan',
};

// assignment khusus baris duplikat/typo BPS (PDF menulis nama desa 2x, satu desa
// lain tak pernah muncul). Key: `${norm(namaKecDB)}|${normPdfDuplikat}` -> norm nama DB.
// Dasar: Kalibening#2(911.766 m2=91,18 Ha) -> Bedana (Pemkab 2023: 88,768 Ha; desa
// Kalibening sendiri 22,575 Ha ~= baris #1 23,03 Ha). Wanayasa#2(1.029 m2) -> Tempuran
// (keputusan QC sesi sebelumnya; Pemkab Tempuran sawah 0). Winong#2(600.821 m2) ->
// Kutayasa (bijection terpaksa, Bawang tak ada pembanding 2023; Sigma kec tetap benar).
const ASSIGN_KHUSUS = {
  'wanayasa|wanayasa': 'tempuran',
  'kalibening|kalibening': 'bedana',
  'bawang|winong': 'kutayasa',
};

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const PREFIXES = ['kelurahan', 'kel', 'desa', 'kp'];
function keys(nama) {
  const k = norm(nama);
  const out = new Set([k]);
  for (const p of PREFIXES) {
    if (k.startsWith(p) && k.length - p.length >= 3) out.add(k.slice(p.length));
  }
  return out;
}
function lev(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

function main() {
  const desaDb = JSON.parse(fs.readFileSync('_tmp/desa-dump.json', 'utf8'));
  const byKec = {};
  for (const d of desaDb) (byKec[d.kecamatan] = byKec[d.kecamatan] || []).push(d);
  // slug file -> nama kecamatan proper DB (join via norm)
  const kecBySlug = {};
  for (const nama of Object.keys(byKec)) kecBySlug[norm(nama)] = nama;

  const outRows = [];
  let totalPdf = 0, totalMapped = 0, totalSigmaM2 = 0;
  const problems = [];
  const sigmaPerKec = {};

  for (const slug of SLUGS) {
    const pdf = JSON.parse(fs.readFileSync(`_tmp/st2023-lahan/${slug}.json`, 'utf8'));
    const kecNama = kecBySlug[norm(slug)];
    const dbDesa = kecNama ? byKec[kecNama] : null;
    if (!dbDesa) { problems.push(`${slug}: kecamatan DB tidak ditemukan`); continue; }
    if (pdf.kontrol && (pdf.kontrol.selisihSawah !== 0 || pdf.kontrol.selisihBukan !== 0)) {
      problems.push(`${kecNama}: kontrol baseline BPS tidak 0 (sawah ${pdf.kontrol.selisihSawah}, bukan ${pdf.kontrol.selisihBukan})`);
    }

    const dbFree = new Map(); // norm-key -> desa (multi-key per desa)
    for (const d of dbDesa) {
      for (const k of keys(d.nama)) if (!dbFree.has(k)) dbFree.set(k, d);
    }
    const paired = new Set(); // desa id
    const rows = [];
    const dupQueue = []; // baris PDF duplikat nama (kandidat typo BPS)
    let sigmaM2 = 0;

    for (const r of pdf.desa) {
      const kSet = keys(r.name);
      let hit = null;
      for (const k of kSet) {
        const c = dbFree.get(k);
        if (c && !paired.has(c.id)) { hit = c; break; }
      }
      if (!hit) {
        for (const k of kSet) {
          const vKey = `${norm(kecNama)}|${k}`;
          if (VARIAN[vKey]) {
            const c = dbFree.get(VARIAN[vKey]);
            if (c && !paired.has(c.id)) { hit = c; break; }
          }
        }
      }
      if (hit) {
        paired.add(hit.id);
        rows.push({ kecamatan: kecNama, desaId: hit.id, desaDb: hit.nama, pdfNama: r.name,
          sawahM2: r.sawah_m2, bukanSawahM2: r.bukan_m2, jumlahM2: r.sawah_m2 + r.bukan_m2 });
        sigmaM2 += r.sawah_m2;
      } else {
        dupQueue.push(r); // nama sama persis dgn yang sudah paired, atau tak dikenal
      }
    }

    // Baris duplikat/typo BPS -> assignment khusus eksplisit (bukan alpha-sort kebetulan)
    if (dupQueue.length > 0) {
      const assigned = [];
      for (const r of dupQueue) {
        const key = `${norm(kecNama)}|${[...keys(r.name)][0]}`;
        const target = ASSIGN_KHUSUS[key];
        if (!target) {
          problems.push(`${kecNama}: baris duplikat/tak dikenal tanpa ASSIGN_KHUSUS: "${r.name}" (sawah ${r.sawah_m2} m2)`);
          continue;
        }
        const hit = dbFree.get(target);
        if (!hit || paired.has(hit.id)) {
          problems.push(`${kecNama}: ASSIGN_KHUSUS ${key} -> "${target}" tidak bebas/tidak ada`);
          continue;
        }
        paired.add(hit.id);
        rows.push({ kecamatan: kecNama, desaId: hit.id, desaDb: hit.nama,
          pdfNama: `${r.name} (typoBPS->assign khusus)`,
          sawahM2: r.sawah_m2, bukanSawahM2: r.bukan_m2, jumlahM2: r.sawah_m2 + r.bukan_m2 });
        sigmaM2 += r.sawah_m2;
        assigned.push(`"${r.name}" (sawah ${r.sawah_m2}) -> ${hit.nama}`);
      }
      if (assigned.length) console.log(`  ASSIGN-KHUSUS ${kecNama}: ${assigned.join('; ')}`);
    }

    const freeDesa = dbDesa.filter((d) => !paired.has(d.id));

    for (const d of freeDesa) {
      // fuzzy report (bukan auto-map)
      let best = null;
      for (const r of pdf.desa) {
        const dist = lev(norm(r.name), norm(d.nama));
        if (dist <= 2 && (!best || dist < best.dist)) best = { pdf: r.name, dist };
      }
      problems.push(`${kecNama}: desa DB tanpa pasangan: "${d.nama}"` +
        (best ? ` (fuzzy~"${best.pdf}" dist=${best.dist})` : ''));
    }

    totalPdf += pdf.desa.length;
    totalMapped += rows.length;
    totalSigmaM2 += sigmaM2;
    sigmaPerKec[kecNama] = sigmaM2;
    outRows.push(...rows);
    console.log(`${kecNama}: PDF ${pdf.desa.length} baris, mapped ${rows.length}, ` +
      `bebas ${freeDesa.length}, Σsawah ${sigmaM2.toLocaleString('id-ID')} m2`);
  }

  console.log(`\nTOTAL: PDF ${totalPdf} baris | mapped ${totalMapped} | Σsawah ${totalSigmaM2.toLocaleString('id-ID')} m2 ` +
    `(${(totalSigmaM2 / 1e4).toFixed(2)} Ha)`);
  console.log('Σ sawah per kecamatan (m2):', JSON.stringify(sigmaPerKec));

  if (problems.length) {
    console.log('\n=== MASALAH ===');
    for (const p of problems) console.log('!', p);
    process.exitCode = 1;
  } else {
    fs.writeFileSync('_tmp/lahan-mapping.json', JSON.stringify(outRows, null, 1));
    console.log(`\nOK 278/278 -> _tmp/lahan-mapping.json (${outRows.length} baris)`);
  }
}
main();
