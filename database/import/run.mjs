/**
 * run.mjs — orkestrator import SISPERTANI → MySQL
 *
 * Pemakaian:
 *   node run.mjs --dry-run                  # parse semua sumber, TANPA tulis DB (validasi)
 *   node --env-file=.env run.mjs            # import penuh
 *   node --env-file=.env run.mjs --only=padi,perikanan   # subset
 *
 * Urutan penting: "ref" selalu pertama (kecamatan/desa adalah FK).
 */
import { makeCtx, connectDb, loadKecamatanResolver } from './lib.mjs';
import { importRef } from './ref.mjs';
import * as ds from './datasets.mjs';

const REGISTRY = [
  { id: 'ref',          label: 'Referensi kecamatan/desa/dataset',   run: (ctx) => importRef(ctx), needDb: true },
  { id: 'padi',         label: 'Padi sawah & ladang',                run: (ctx, k) => ds.importPadi(ctx, k) },
  { id: 'palawija',     label: 'Palawija (6 komoditas)',             run: (ctx, k) => ds.importPalawija(ctx, k) },
  { id: 'horti',        label: 'Hortikultura per kecamatan',         run: (ctx, k) => ds.importHortiKecamatan(ctx, k) },
  { id: 'horti-kab',    label: 'Hortikultura kabupaten (per jenis)', run: (ctx) => ds.importHortiKabupaten(ctx) },
  { id: 'perkebunan',   label: 'Perkebunan (areal & produksi)',      run: (ctx, k) => ds.importPerkebunan(ctx, k) },
  { id: 'ternak',       label: 'Peternakan (populasi & produk)',     run: (ctx, k) => ds.importTernakPopulasi(ctx, k).then(async (n) => n + await ds.importTernakProduk(ctx, k)) },
  { id: 'ternak-flow',  label: 'Peternakan (pemasukan/pengeluaran)', run: (ctx, k) => ds.importTernakFlow(ctx, k) },
  { id: 'perikanan',    label: 'Perikanan (nilai, obyek, benih, minapadi, sarana)', run: (ctx, k) =>
      ds.importPerikananNilai(ctx, k)
        .then(async (a) => a + await ds.importPerikananObyek(ctx, k))
        .then(async (a) => a + await ds.importPerikananBenih(ctx, k))
        .then(async (a) => a + await ds.importPerikananMinapadi(ctx, k))
        .then(async (a) => a + await ds.importPerikananSarana(ctx, k)) },
  { id: 'lahan',        label: 'Penggunaan lahan kabupaten',         run: (ctx) => ds.importLahanPenggunaan(ctx) },
  { id: 'lahan-desa',   label: 'Lahan sawah per desa (JSON)',        run: (ctx, k) => ds.importLahanDesa(ctx, k) },
  { id: 'lumbung',      label: 'Lumbung & gudang pangan',            run: (ctx, k) => ds.importLumbung(ctx, k) },
  { id: 'ekonomi',      label: 'Pasar & inflasi (snapshot)',         run: (ctx) => ds.importEkonomi(ctx) },
  { id: 'kelembagaan',  label: 'Kelompok tani & KTH (JSON)',         run: (ctx, k) =>
      ds.importKelompokTani(ctx, k).then(async (n) => n + await ds.importKelompokTaniHutan(ctx, k)) },
  { id: 'st2023',       label: 'Sensus Pertanian 2023 per desa',     run: (ctx, k) => ds.importSt2023(ctx, k) },
];

// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyArg = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const only = onlyArg ? new Set(onlyArg.split(',').map((s) => s.trim())) : null;

const pad = (s, n) => String(s).padEnd(n);

async function main() {
  console.log(`\n=== SISPERTANI import ${dryRun ? '(DRY-RUN — tidak menulis DB)' : ''} ===\n`);

  const ctx = makeCtx({ dryRun });
  await connectDb(ctx);

  // 'ref' selalu jalan pertama; kalau --only dipakai tanpa ref, resolver tetap butuh tabel kecamatan
  const plan = only
    ? REGISTRY.filter((r) => only.has(r.id))
    : REGISTRY;

  if (!plan.length) {
    console.error(`Tidak ada dataset cocok. Pilihan: ${REGISTRY.map((r) => r.id).join(', ')}`);
    process.exit(1);
  }

  // Seed referensi dulu bila diminta eksplisit ATAU impor penuh
  const results = [];
  let kecMap = null;

  for (const item of plan) {
    const t0 = Date.now();
    try {
      if (item.id === 'ref') {
        const r = await item.run(ctx);
        results.push([item.id, item.label, r.kecamatan + r.desa + (r.dataset_sumber ?? 0), Date.now() - t0]);
      } else {
        if (!kecMap) kecMap = await loadKecamatanResolver(ctx);
        const n = await item.run(ctx, kecMap);
        results.push([item.id, item.label, n, Date.now() - t0]);
      }
    } catch (e) {
      results.push([item.id, item.label, `ERROR: ${e.message}`, Date.now() - t0]);
      if (!dryRun) {
        try {
          await ctx.db.query(
            'INSERT INTO sync_log (dataset, sumber, aksi, baris, status, pesan) VALUES (?,?,?,?,?,?)',
            [item.id, 'csv', 'import', 0, 'error', e.message]
          );
        } catch { /* abaikan kegagalan logging */ }
      }
    }
  }

  // --- ringkasan ---
  console.log('------------------------------------------------------------');
  console.log(`${pad('DATASET', 14)} ${pad('KETERANGAN', 52)} ${pad('BARIS', 10)} MS`);
  console.log('------------------------------------------------------------');
  for (const [id, label, n, ms] of results) {
    console.log(`${pad(id, 14)} ${pad(label.slice(0, 50), 52)} ${pad(n, 10)} ${ms}`);
  }
  console.log('------------------------------------------------------------');

  if (ctx.warnings.length) {
    const uniq = [...new Set(ctx.warnings)];
    console.log(`\nPERINGATAN (${uniq.length} unik dari ${ctx.warnings.length}):`);
    uniq.slice(0, 50).forEach((w) => console.log(`  - ${w}`));
    if (uniq.length > 50) console.log(`  ... +${uniq.length - 50} lainnya`);
  } else {
    console.log('\nTanpa peringatan.');
  }

  if (ctx.db) await ctx.db.end();
  console.log('\nSelesai.\n');
}

main().catch((e) => {
  console.error(`\nFATAL: ${e.message}\n`);
  process.exit(1);
});
