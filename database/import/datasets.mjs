/**
 * datasets.mjs — importer untuk semua dataset SISPERTANI.
 *
 * Setiap importer menerima (ctx, kecMap) dan mengembalikan jumlah baris.
 * Prinsip:
 *  - JUJUR pada sumber: nilai disimpan mentah (setelah bersih-bersih angka),
 *    header ambigu dipetakan posisional dan diberi catatan di skema/README.
 *  - Baris "Jumlah" (total kabupaten) dilewati — agregat dihitung via SUM.
 *  - Idempoten: semua tabel fakta pakai upsert berdasarkan UNIQUE key alami.
 *  - KTH (snapshot) pakai full-reload.
 */
import {
  readCsv, readJson, cleanNum, cleanTahun, normStr, normDesa,
  isAggregateRow, meltFixedColumns, meltWideYear, meltPairs,
  upsert, logSync, kecIdOrWarn,
} from './lib.mjs';

// ===========================================================================
// Helper bersama
// ===========================================================================

/** Iterasi baris CSV: skip agregat/kosong, resolve kecamatan, validasi tahun. */
function* iterKecRows(ctx, kecMap, rows, asal, kecCol = 'Kecamatan', tahunCol = 'Tahun') {
  for (const row of rows) {
    const kecRaw = row[kecCol];
    if (isAggregateRow(kecRaw)) continue;
    if (!normStr(kecRaw)) continue;
    const kecamatan_id = kecIdOrWarn(ctx, kecMap, kecRaw, asal);
    if (!kecamatan_id) continue;
    const tahun = cleanTahun(row[tahunCol], ctx, asal);
    if (tahun === null) continue;
    yield { row, kecamatan_id, tahun };
  }
}

const JENIS_NORM = { DOMBA: 'Domba' };
const normJenis = (j) => JENIS_NORM[j] ?? j;

/** Melt kolom tetap -> baris DB standar dengan resolver kecamatan. */
function meltToRows(ctx, kecMap, rows, colMap, asal) {
  const melted = meltFixedColumns(rows, { colMap });
  const out = [];
  for (const m of melted) {
    if (isAggregateRow(m.kecamatan) || !normStr(m.kecamatan)) continue;
    const kecamatan_id = kecIdOrWarn(ctx, kecMap, m.kecamatan, asal);
    if (!kecamatan_id) continue;
    const tahun = cleanTahun(m.tahun, ctx, asal);
    if (tahun === null) continue;
    out.push({ ...m, kecamatan_id, tahun, jenis: normJenis(normStr(m.jenis)) });
  }
  return out;
}

// ===========================================================================
// 1. TANAMAN PANGAN
// ===========================================================================

export async function importPadi(ctx, kecMap) {
  const F = 'Luas Panen, Produksi dan Rata-rata Produksi Padi Sawah Dan Padi Ladang CSV.csv';
  const { rows } = readCsv(ctx, F);
  const COLS = [
    { jenis: 'sawah', luas: 'Padi Sawah (Ha)', prod: 'Produksi Padi Sawah (Ton)', rata: 'Rata-rata Produksi Padi Sawah(Kw/Ha)' },
    { jenis: 'ladang', luas: 'Padi Ladang (Ha)', prod: 'Produksi Padi Ladang(Ton)', rata: 'Rata-rata Produksi Padi Ladang(Ku/Ha)' },
  ];
  const out = [];
  for (const { row, kecamatan_id, tahun } of iterKecRows(ctx, kecMap, rows, F)) {
    for (const c of COLS) {
      const luas = cleanNum(row[c.luas]);
      const prod = cleanNum(row[c.prod]);
      const rata = cleanNum(row[c.rata]);
      if (luas === null && prod === null && rata === null) continue;
      out.push({ kecamatan_id, tahun, jenis: c.jenis, luas_panen_ha: luas, produksi_ton: prod, rata_ku_ha: rata });
    }
  }
  const n = await upsert(ctx, 'padi_produksi', out, ['luas_panen_ha', 'produksi_ton', 'rata_ku_ha']);
  await logSync(ctx, 'padi_produksi', 'csv', out.length);
  return n;
}

export async function importPalawija(ctx, kecMap) {
  const FILES = [
    {
      f: 'Luas Panen, Produksi dan Rata-rata Produksi Tanaman Pangan (Jagung dan Ubi Kayu) CSV.csv',
      cols: [
        { kom: 'Jagung', luas: 'Luas Panen Jagung', prod: 'Produksi Jagung', rata: 'Produksi Rata Rata Jagung' },
        { kom: 'Ubi Kayu', luas: 'Luas Panen Ubi Kayu', prod: 'Produksi Ubi Kayu', rata: 'Produksi Rata Rata Ubi Kayu' },
      ],
    },
    {
      f: 'Luas Panen, Produksi dan Rata-rata Produksi Tanaman Pangan (Kacang Tanah dan Kedelai) CSV.csv',
      cols: [
        { kom: 'Kacang Tanah', luas: 'Luas Panen Kacang Tanah (Ha)', prod: 'Produksi Kacang Tanah (Ton)', rata: 'Rata-rata Produksi Kacang Tanah (Ku/Ha)' },
        { kom: 'Kedelai', luas: 'Luas Panen Kedelai (Ha)', prod: 'Produksi Kedelai (Ton)', rata: 'Rata-rata Produksi Kedelai (Ku/Ha)' },
      ],
    },
    {
      f: 'Luas Panen, Produksi dan Rata-rata Produksi Tanaman Pangan (Ubi Jalar dan Kacang Hijau) CSV.csv',
      cols: [
        { kom: 'Ubi Jalar', luas: 'Luas Panen Ubi Jalar (Ha)', prod: 'Produksi Ubi Jalar (Ton)', rata: 'Rata-rata Produksi Ubi Jalar (Ku/Ha)' },
        { kom: 'Kacang Hijau', luas: 'Luas Panen Kacang Hijau (Ha)', prod: 'Produksi Kacang Hijau (Ton)', rata: 'Rata-rata Produksi Kacang Hijau (Ku/Ha)' },
      ],
    },
  ];
  let total = 0;
  for (const { f, cols } of FILES) {
    const { rows } = readCsv(ctx, f);
    const out = [];
    for (const { row, kecamatan_id, tahun } of iterKecRows(ctx, kecMap, rows, f)) {
      for (const c of cols) {
        const luas = cleanNum(row[c.luas]);
        const prod = cleanNum(row[c.prod]);
        const rata = cleanNum(row[c.rata]);
        if (luas === null && prod === null && rata === null) continue;
        out.push({ kecamatan_id, tahun, komoditas: c.kom, luas_panen_ha: luas, produksi_ton: prod, rata_ku_ha: rata });
      }
    }
    const n = await upsert(ctx, 'palawija_produksi', out, ['luas_panen_ha', 'produksi_ton', 'rata_ku_ha']);
    await logSync(ctx, 'palawija_produksi', 'csv', out.length, 'ok', f);
    total += n;
  }
  return total;
}

// ===========================================================================
// 2. HORTIKULTURA
// ===========================================================================

const HORTI_KEC = [
  // [file, tabel, kelompok, satuanDefault]
  ['Luas Panen Tanaman Sayuran Menurut Kecamatan dan Jenis Tanaman (ha) CSV.csv', 'horti_luas', 'sayuran', 'ha'],
  ['Luas Panen Tanaman Hias Menurut Kecamatan dan Jenis Tanaman (m2) CSV.csv', 'horti_luas', 'tanaman_hias', 'm2'],
  ['Luas Panen Tanaman Biofarmaka Menurut Kecamatan dan Jenis Tanaman (m2) CSV.csv', 'horti_luas', 'biofarmaka', 'm2'],
  ['Produksi Tanaman Sayuran Menurut Kecamatan dan Jenis Tanaman (ton) CSV.csv', 'horti_produksi', 'sayuran', 'ton'],
  ['Produksi Buah-buahan Menurut Kecamatan dan Jenis Tanaman (ton) CSV.csv', 'horti_produksi', 'buah_tahunan', 'ton'],
  ['Produksi Tanaman Hias Menurut Kecamatan dan Jenis Tanaman (tangkai) CSV.csv', 'horti_produksi', 'tanaman_hias', 'tangkai'],
  ['Produksi Tanaman Biofarmaka Menurut Kecamatan dan Jenis Tanaman (Tangkai) CSV.csv', 'horti_produksi', 'biofarmaka', 'tangkai'],
];

export async function importHortiKecamatan(ctx, kecMap) {
  let total = 0;
  for (const [file, table, kelompok, satuanDef] of HORTI_KEC) {
    const { rows, fields } = readCsv(ctx, file);
    const melted = meltWideYear(rows, fields);
    const out = [];
    for (const m of melted) {
      if (isAggregateRow(m.kecamatan) || !normStr(m.kecamatan)) continue;
      const kecamatan_id = kecIdOrWarn(ctx, kecMap, m.kecamatan, file);
      if (!kecamatan_id) continue;
      out.push({
        kecamatan_id, kelompok, komoditas: m.komoditas, tahun: m.tahun,
        nilai: m.nilai, satuan: m.satuan || satuanDef,
      });
    }
    const n = await upsert(ctx, table, out, ['nilai', 'satuan']);
    await logSync(ctx, table, 'csv', out.length, 'ok', file);
    total += n;
  }
  return total;
}

const HORTI_KAB = [
  // [file, tabel, kelompok, satuan]
  ['Luas Panen Tanaman Sayuran dan Buah\u2013Buahan Semusim Menurut Jenis Tanaman (ha) CSV.csv', 'horti_luas_kabupaten', 'sayuran_buah_semusim', 'ha'],
  ['Luas Panen Tanaman Hias Menurut Jenis Tanaman (m2) CSV.csv', 'horti_luas_kabupaten', 'tanaman_hias', 'm2'],
  ['Luas Panen Tanaman Biofarmaka Menurut Jenis Tanaman (m2) CSV.csv', 'horti_luas_kabupaten', 'biofarmaka', 'm2'],
  ['Produksi Tanaman Sayuran dan Buah\u2013Buahan Semusim Menurut Jenis Tanaman (Ton) CSV.csv', 'horti_produksi_kabupaten', 'sayuran_buah_semusim', 'ton'],
  ['Produksi Buah-buahan dan Sayuran Tahunan Menurut Jenis Tanaman (ton) CSV.csv', 'horti_produksi_kabupaten', 'buah_sayuran_tahunan', 'ton'],
  ['Produksi Tanaman Hias Menurut Jenis Tanaman (tangkai) CSV.csv', 'horti_produksi_kabupaten', 'tanaman_hias', 'tangkai'],
  ['Produksi Tanaman Biofarmaka Menurut Jenis Tanaman (Tangkai) CSV.csv', 'horti_produksi_kabupaten', 'biofarmaka', 'tangkai'],
];

export async function importHortiKabupaten(ctx) {
  let total = 0;
  for (const [file, table, kelompok, satuan] of HORTI_KAB) {
    const { rows, fields } = readCsv(ctx, file);
    const jenisCol = fields[0];              // "Jenis Tanaman"
    const metricCol = fields[1];             // "Luas Panen (Ha)" / "Produksi (ton)" / dst
    const tahunCol = fields.find((f) => /^tahun$/i.test(f)) ?? 'Tahun';
    const out = [];
    for (const row of rows) {
      const komoditas = normStr(row[jenisCol]);
      if (!komoditas || isAggregateRow(komoditas)) continue;
      const tahun = cleanTahun(row[tahunCol], ctx, file);
      if (tahun === null) continue;
      const nilai = cleanNum(row[metricCol]);
      if (nilai === null) continue;
      out.push({ kelompok, komoditas, tahun, nilai, satuan });
    }
    const n = await upsert(ctx, table, out, ['nilai', 'satuan']);
    await logSync(ctx, table, 'csv', out.length, 'ok', file);
    total += n;
  }
  return total;
}

// ===========================================================================
// 3. PERKEBUNAN
// ===========================================================================

export async function importPerkebunan(ctx, kecMap) {
  // Struktur file (dikonfirmasi via inspeksi baris):
  //  - AREAL  : 160 baris kecamatan (20 x 8 tahun), TANPA blok ringkasan.
  //  - PRODUKSI: blok kecamatan + blok ringkasan kabupaten per tahun berupa
  //    baris "JENIS" (penanda, kolom grup berisi label tahun) diikuti baris
  //    per tanaman dengan NILAI DI KOLOM PERTAMA GRUP TAHUN (kolom "Kelapa
  //    Sawit (ton) TTTT"), bukan diagonal. Total resmi BPS — BUKAN SUM.
  const FILES = [
    ['Luas Areal Tanaman Perkebunan Menurut Kecamatan dan Jenis Tanaman (ha) CSV.csv',
      'perkebunan_areal', null, 'luas_ha'],
    ['Produksi Perkebunan Menurut Kecamatan dan Jenis Tanaman (ton) CSV.csv',
      'perkebunan_produksi', 'perkebunan_produksi_kabupaten', 'produksi_ton'],
  ];
  let total = 0;
  for (const [file, tableKec, tableKab, valueCol] of FILES) {
    const { rows, fields } = readCsv(ctx, file);
    const melted = meltWideYear(rows, fields);
    const outKec = [];
    const kabFirst = new Map(); // "tanaman|tahun" -> nilai pertama non-null
    for (const m of melted) {
      const namaKolom = normStr(m.kecamatan);
      if (!namaKolom || isAggregateRow(namaKolom)) continue;
      if (namaKolom.toUpperCase() === 'JENIS') continue; // penanda blok ringkasan
      const kecamatan_id = kecIdOrWarn(ctx, kecMap, namaKolom, null); // senyap dulu
      if (kecamatan_id) {
        outKec.push({ kecamatan_id, tanaman: m.komoditas, tahun: m.tahun, [valueCol]: m.nilai });
      } else if (tableKab) {
        // Baris ringkasan: kolom-0 = nama tanaman; ambil nilai pertama non-null
        const key = `${namaKolom}|${m.tahun}`;
        if (!kabFirst.has(key)) kabFirst.set(key, { tanaman: namaKolom, tahun: m.tahun, [valueCol]: m.nilai });
      } else {
        ctx.warnings.push(`baris tak dikenali "${namaKolom}" di ${file}`);
      }
    }
    const n1 = await upsert(ctx, tableKec, outKec, [valueCol]);
    await logSync(ctx, tableKec, 'csv', outKec.length, 'ok', file);
    total += n1;
    if (tableKab) {
      const outKab = [...kabFirst.values()];
      const n2 = await upsert(ctx, tableKab, outKab, [valueCol]);
      await logSync(ctx, tableKab, 'csv', outKab.length, 'ok', `${file} (blok JENIS)`);
      total += n2;
    }
  }
  return total;
}

// ===========================================================================
// 4. PETERNAKAN
// ===========================================================================

export async function importTernakPopulasi(ctx, kecMap) {
  const FILES = [
    ['Jumlah Ternak Besar Menurut Kecamatan dan Jenis Ternak CSV.csv', 'besar', ['Sapi Perah', 'Sapi', 'Kerbau', 'Kuda']],
    ['Jumlah  Ternak Kecil Menurut Kecamatan dan Jenis Ternak CSV.csv', 'kecil', ['Kambing', 'Domba', 'Babi', 'Kelinci']],
    ['Jumlah Unggas Menurut Kecamatan dan Jenis Ternak CSV.csv', 'unggas', ['Ayam Kampung', 'Ayam Ras Layer', 'Ayam Broiler', 'Itik Biasa', 'Itik Manila']],
  ];
  let total = 0;
  for (const [file, kelompok, jenisList] of FILES) {
    const { rows } = readCsv(ctx, file);
    const colMap = jenisList.map((j) => ({ col: j, jenis: j }));
    const melted = meltToRows(ctx, kecMap, rows, colMap, file);
    const out = melted.map((m) => ({
      kecamatan_id: m.kecamatan_id, kelompok, jenis: m.jenis, tahun: m.tahun, jumlah_ekor: m.nilai,
    }));
    const n = await upsert(ctx, 'ternak_populasi', out, ['jumlah_ekor']);
    await logSync(ctx, 'ternak_populasi', 'csv', out.length, 'ok', file);
    total += n;
  }
  return total;
}

export async function importTernakProduk(ctx, kecMap) {
  let total = 0;

  // --- daging ternak & unggas ---
  const DAGING = [
    ['Produksi Daging  Ternak Menurut Kecamatan dan Jenis Ternak CSV.csv', 'ternak', ['Sapi', 'Kerbau', 'Babi', 'Kambing', 'Domba']],
    ['Produksi Daging Unggas Menurut Kecamatan dan Jenis Unggas CSV.csv', 'unggas', ['Ayam Ras Layer', 'Ayam Kampung']],
  ];
  for (const [file, kelompok, jenisList] of DAGING) {
    const { rows } = readCsv(ctx, file);
    const melted = meltToRows(ctx, kecMap, rows, jenisList.map((j) => ({ col: j, jenis: j })), file);
    const out = melted.map((m) => ({
      kecamatan_id: m.kecamatan_id, kelompok, jenis: m.jenis, tahun: m.tahun, produksi_kg: m.nilai,
    }));
    total += await upsert(ctx, 'ternak_daging', out, ['produksi_kg']);
    await logSync(ctx, 'ternak_daging', 'csv', out.length, 'ok', file);
  }

  // --- telur (nama kolom sumber singkat -> dinormalisasi ke nama unggas baku) ---
  {
    const F = 'Produksi Telur Menurut Kecamatan dan Jenis Unggas CSV.csv';
    const { rows } = readCsv(ctx, F);
    const melted = meltToRows(ctx, kecMap, rows, [
      { col: 'Ras Layer', jenis: 'Ayam Ras Layer' },
      { col: 'Kampung', jenis: 'Ayam Kampung' },
    ], F);
    const out = melted.map((m) => ({
      kecamatan_id: m.kecamatan_id, jenis: m.jenis, tahun: m.tahun, produksi_kg: m.nilai,
    }));
    total += await upsert(ctx, 'ternak_telur', out, ['produksi_kg']);
    await logSync(ctx, 'ternak_telur', 'csv', out.length, 'ok', F);
  }

  // --- kulit & susu (SUMBER AMBIGU: 1 kolom per grup ternak) ---
  {
    const F = 'Jumlah Produksi Kulit dan Susu Menurut Kecamatan CSV.csv';
    const { rows } = readCsv(ctx, F);
    const melted = meltToRows(ctx, kecMap, rows, [
      { col: 'Sapi/Kerbau Cow/Buffalo', jenis: 'Sapi/Kerbau' },
      { col: 'Kambing/Domba Goat/Sheep', jenis: 'Kambing/Domba' },
    ], F);
    const out = melted.map((m) => ({
      kecamatan_id: m.kecamatan_id, jenis: m.jenis, tahun: m.tahun, nilai: m.nilai,
      catatan: 'Sumber tidak memisahkan kulit (lembar) vs susu (liter)',
    }));
    total += await upsert(ctx, 'ternak_susu_kulit', out, ['nilai', 'catatan']);
    await logSync(ctx, 'ternak_susu_kulit', 'csv', out.length, 'warn', 'header sumber ambigu');
  }

  // --- pemotongan RPH & luar RPH ---
  const POTONG = [
    ['Jumlah Ternak yang Dipotong di RPH Pemerintah CSV.csv', 'rph_pemerintah', ['Sapi', 'Kerbau', 'Kuda', 'Babi', 'Kambing', 'Domba']],
    ['Jumlah (Perkiraan) Ternak yang Dipotong di Luar RPH CSV.csv', 'luar_rph', ['Sapi', 'Kerbau', 'Babi', 'Kambing', 'Domba']],
  ];
  for (const [file, lokasi, jenisList] of POTONG) {
    const { rows } = readCsv(ctx, file);
    const melted = meltToRows(ctx, kecMap, rows, jenisList.map((j) => ({ col: j, jenis: j })), file);
    const out = melted.map((m) => ({
      kecamatan_id: m.kecamatan_id, lokasi, jenis: m.jenis, tahun: m.tahun, jumlah_ekor: m.nilai,
    }));
    total += await upsert(ctx, 'ternak_pemotongan', out, ['jumlah_ekor']);
    await logSync(ctx, 'ternak_pemotongan', 'csv', out.length, 'ok', file);
  }

  return total;
}

export async function importTernakFlow(ctx, kecMap) {
  const FILES = [
    ['Banyaknya Pemasukan Ternak Ke Kabupaten Banjarnegara CSV.csv', 'pemasukan', ['Sapi', 'Sapi Perah', 'Kerbau', 'Kuda', 'Babi', 'Kambing', 'DOMBA']],
    ['Banyaknya Pengeluaran Ternak Potong ke Kabupaten Banjarnegara CSV.csv', 'pengeluaran', ['Sapi', 'Kerbau', 'Babi', 'Kambing', 'Domba']],
  ];
  let total = 0;
  for (const [file, arah, jenisList] of FILES) {
    const { rows } = readCsv(ctx, file);
    const melted = meltToRows(ctx, kecMap, rows, jenisList.map((j) => ({ col: j, jenis: j })), file);
    const out = melted.map((m) => ({
      kecamatan_id: m.kecamatan_id, arah, jenis: m.jenis, tahun: m.tahun, jumlah_ekor: m.nilai,
    }));
    total += await upsert(ctx, 'ternak_flow', out, ['jumlah_ekor']);
    await logSync(ctx, 'ternak_flow', 'csv', out.length, 'ok', file);
  }
  return total;
}

// ===========================================================================
// 5. PERIKANAN
// ===========================================================================

export async function importPerikananNilai(ctx, kecMap) {
  let total = 0;

  // budidaya & tangkap per jenis alat: pola pasangan "<Jenis> Produksi (Kg)" / "<Jenis> Nilai (Ribu Rupiah)"
  const PAIRS = [
    ['Produksi dan Nilai Produksi Perikanan Budidaya Menurut Kecamatan dan Jenis Budidaya CSV.csv', 'ikan_budidaya', 'jenis_budidaya'],
    ['Produksi dan Nilai Produksi Perikanan Tangkap Menurut Kecamatan dan Jenis Penangkapan CSV.csv', 'ikan_tangkap', 'jenis_alat'],
  ];
  for (const [file, table, jenisCol] of PAIRS) {
    const { rows, fields } = readCsv(ctx, file);
    const melted = meltPairs(rows, fields);
    const out = [];
    for (const m of melted) {
      if (isAggregateRow(m.kecamatan) || !normStr(m.kecamatan)) continue;
      const kecamatan_id = kecIdOrWarn(ctx, kecMap, m.kecamatan, file);
      if (!kecamatan_id) continue;
      out.push({
        kecamatan_id, [jenisCol]: m.prefix, tahun: m.tahun,
        produksi_kg: m.produksi_kg ?? null, nilai_ribu_rp: m.nilai_ribu_rp ?? null,
      });
    }
    total += await upsert(ctx, table, out, ['produksi_kg', 'nilai_ribu_rp']);
    await logSync(ctx, table, 'csv', out.length, 'ok', file);
  }

  // tangkap perairan umum: kolom polos "Produksi","Nilai"
  {
    const F = 'Produksi dan Nilai Produksi Perikanan Tangkap Perairan Umum CSV.csv';
    const { rows } = readCsv(ctx, F);
    const out = [];
    for (const { row, kecamatan_id, tahun } of iterKecRows(ctx, kecMap, rows, F)) {
      const produksi = cleanNum(row['Produksi']);
      const nilai = cleanNum(row['Nilai']);
      if (produksi === null && nilai === null) continue;
      out.push({ kecamatan_id, tahun, produksi_kg: produksi, nilai_ribu_rp: nilai });
    }
    total += await upsert(ctx, 'ikan_tangkap_perairan_umum', out, ['produksi_kg', 'nilai_ribu_rp']);
    await logSync(ctx, 'ikan_tangkap_perairan_umum', 'csv', out.length, 'ok', F);
  }

  return total;
}

export async function importPerikananObyek(ctx, kecMap) {
  // Header hasil flatten BPS -> dipetakan POSISIONAL (lihat README):
  // [1] Sungai total | [2] Sendiri (sungai) | [3] Lain daerah (sungai) | [4] Waduk total
  const F = 'Banyaknya Produksi Perikanan Hasil Obyek Penangkapan CSV.csv';
  const { rows, fields } = readCsv(ctx, F);
  const f1 = fields[1], f2 = fields[2], f3 = fields[3], f4 = fields[4];
  if (!f1?.includes('Sungai') || !f4?.includes('Waduk')) {
    ctx.warnings.push(`struktur kolom ${F} berubah — pemetaan posisional perlu dicek ulang`);
  }
  const out = [];
  for (const { row, kecamatan_id, tahun } of iterKecRows(ctx, kecMap, rows, F)) {
    const push = (obyek, arah, v) => {
      const n = cleanNum(v);
      if (n !== null) out.push({ kecamatan_id, obyek, arah, tahun, produksi_kg: n });
    };
    push('Perairan Umum Sungai', 'total', row[f1]);
    push('Perairan Umum Sungai', 'sendiri', row[f2]);
    push('Perairan Umum Sungai', 'lain_daerah', row[f3]);
    push('Perairan Umum Waduk', 'total', row[f4]);
  }
  const n = await upsert(ctx, 'ikan_obyek_penangkapan', out, ['produksi_kg']);
  await logSync(ctx, 'ikan_obyek_penangkapan', 'csv', out.length, 'warn', 'pemetaan posisional');
  return n;
}

export async function importPerikananBenih(ctx, kecMap) {
  const F = 'Distribusi Produksi Perikanan Hasil Obyek Pembenihan Ikan CSV.csv';
  const { rows } = readCsv(ctx, F);
  const out = [];
  for (const { row, kecamatan_id, tahun } of iterKecRows(ctx, kecMap, rows, F)) {
    const sendiri = cleanNum(row['Sendiri']);
    const lain = cleanNum(row['Lain Daerah']);
    if (sendiri !== null) out.push({ kecamatan_id, arah: 'sendiri', tahun, jumlah_ekor: sendiri });
    if (lain !== null) out.push({ kecamatan_id, arah: 'lain_daerah', tahun, jumlah_ekor: lain });
  }
  const n = await upsert(ctx, 'ikan_benih', out, ['jumlah_ekor']);
  await logSync(ctx, 'ikan_benih', 'csv', out.length);
  return n;
}

export async function importPerikananMinapadi(ctx, kecMap) {
  // Header flatten BPS -> dipetakan eksplisit per nama kolom (lihat README).
  const F = 'Distribusi Produksi Perikanan Hasil Obyek Perikanan Sawah (Minapadi) CSV.csv';
  const { rows } = readCsv(ctx, F);
  const out = [];
  for (const { row, kecamatan_id, tahun } of iterKecRows(ctx, kecMap, rows, F)) {
    const metrik = {
      produksi_kg: cleanNum(row['Hasil Obyek Perikanan Sawah (Minapadi) Produksi']),
      dipelihara_sendiri_kg: cleanNum(row['Di pelihara Sendiri']),
      dijual_lain_daerah_kg: cleanNum(row['Dijual ke Lain Daerah']),
      produksi_tambahan_kg: cleanNum(row['Produksi']),
      bbi_produksi_kg: cleanNum(row['Hasil Obyek Balai Benih Ikan (BBI) Produksi']),
      bbi_dipelihara_sendiri: cleanNum(row['Dipelihara Sendiri']),
    };
    if (Object.values(metrik).every((v) => v === null)) continue;
    out.push({ kecamatan_id, tahun, ...metrik });
  }
  const n = await upsert(ctx, 'ikan_minapadi', out, [
    'produksi_kg', 'dipelihara_sendiri_kg', 'dijual_lain_daerah_kg',
    'produksi_tambahan_kg', 'bbi_produksi_kg', 'bbi_dipelihara_sendiri',
  ]);
  await logSync(ctx, 'ikan_minapadi', 'csv', out.length, 'warn', 'kolom "Produksi" kedua ambigu');
  return n;
}

export async function importPerikananSarana(ctx, kecMap) {
  let total = 0;

  // waduk: bersih (Luas, Produksi)
  {
    const F = 'Luas dan Produksi Ikan Perairan Umum Waduk CSV.csv';
    const { rows } = readCsv(ctx, F);
    const out = [];
    for (const { row, kecamatan_id, tahun } of iterKecRows(ctx, kecMap, rows, F)) {
      const luas = cleanNum(row['Luas']);
      const prod = cleanNum(row['Produksi']);
      if (luas === null && prod === null) continue;
      out.push({ kecamatan_id, tahun, luas_ha: luas, produksi_kg: prod });
    }
    total += await upsert(ctx, 'ikan_waduk', out, ['luas_ha', 'produksi_kg']);
    await logSync(ctx, 'ikan_waduk', 'csv', out.length, 'ok', F);
  }

  // kolam: header ambigu ("Jenis Kolam Luas" / "Produksi" / "Luas")
  {
    const F = 'Luas dan Produksi Kolam Ikan Menurut Kecamatan CSV.csv';
    const { rows, fields } = readCsv(ctx, F);
    const fLuas2 = fields.find((f) => f === 'Luas');
    const out = [];
    for (const { row, kecamatan_id, tahun } of iterKecRows(ctx, kecMap, rows, F)) {
      const luas = cleanNum(row['Jenis Kolam Luas']);
      const prod = cleanNum(row['Produksi']);
      const luas2 = fLuas2 ? cleanNum(row[fLuas2]) : null;
      if (luas === null && prod === null && luas2 === null) continue;
      out.push({ kecamatan_id, tahun, luas_ha: luas, produksi_kg: prod, luas_tambahan: luas2 });
    }
    total += await upsert(ctx, 'ikan_kolam', out, ['luas_ha', 'produksi_kg', 'luas_tambahan']);
    await logSync(ctx, 'ikan_kolam', 'csv', out.length, 'warn', 'kolom "Luas" kedua ambigu');
  }

  // pemeliharaan (file header bersih "...Jenis Tempat Pemeliharaan")
  {
    const F = 'Luas dan Produksi Ikan Menurut Kecamatan dan Jenis Tempat Pemeliharaan CSV.csv';
    const { rows, fields } = readCsv(ctx, F);
    const melted = meltPairs(rows, fields);
    const out = [];
    for (const m of melted) {
      if (isAggregateRow(m.kecamatan) || !normStr(m.kecamatan)) continue;
      const kecamatan_id = kecIdOrWarn(ctx, kecMap, m.kecamatan, F);
      if (!kecamatan_id) continue;
      out.push({
        kecamatan_id, tempat: m.prefix, tahun: m.tahun,
        luas_ha: m.luas_ha ?? null, produksi_kg: m.produksi_kg ?? null,
      });
    }
    total += await upsert(ctx, 'ikan_pemeliharaan', out, ['luas_ha', 'produksi_kg']);
    await logSync(ctx, 'ikan_pemeliharaan', 'csv', out.length, 'ok', F);
  }

  return total;
}

// ===========================================================================
// 6. LAHAN & LUMBUNG
// ===========================================================================

export async function importLahanPenggunaan(ctx) {
  const F = 'Luas Penggunaan Lahan menurut Jenis Penggunaan (Ha) CSV.csv';
  const { rows } = readCsv(ctx, F);
  const out = [];
  for (const row of rows) {
    const kategori = normStr(row['Kategori']);
    if (!kategori || isAggregateRow(kategori)) continue;
    const tahun = cleanTahun(row['Tahun'], ctx, F);
    if (tahun === null) continue;
    const luas = cleanNum(row['Luas (Ha)']);
    if (luas === null) continue;
    out.push({ kategori, tahun, luas_ha: luas });
  }
  const n = await upsert(ctx, 'lahan_penggunaan', out, ['luas_ha']);
  await logSync(ctx, 'lahan_penggunaan', 'csv', out.length);
  return n;
}

export async function importLahanDesa(ctx, kecMap) {
  // fallback lama dulu, lalu "-updated" MENIMPA via upsert (key kecamatan+desa+tahun)
  const FILES = ['lahan-fallback.json', 'lahan-fallback-updated.json'];
  let total = 0;
  for (const f of FILES) {
    let data;
    try {
      data = readJson(ctx, f);
    } catch {
      continue; // file opsional
    }
    if (!Array.isArray(data)) continue;
    const out = [];
    for (const r of data) {
      const kecamatan_id = kecIdOrWarn(ctx, kecMap, r.kecamatan, f);
      if (!kecamatan_id) continue;
      const tahun = cleanTahun(r.tahun, ctx, f);
      if (tahun === null) continue;
      const desa = normStr(r.desa);
      if (!desa) continue;
      out.push({
        kecamatan_id, desa, desa_norm: normDesa(desa), tahun,
        sawah_ha: cleanNum(r.lahanSawah),
        bukan_sawah_ha: cleanNum(r.lahanBukanSawah),
        total_ha: cleanNum(r.jumlah),
        sumber_json: r.sumber ?? null,
        confidence: r.confidence ?? null,
      });
    }
    total += await upsert(ctx, 'lahan_desa', out, [
      'desa', 'sawah_ha', 'bukan_sawah_ha', 'total_ha', 'sumber_json', 'confidence'
    ]);
    await logSync(ctx, 'lahan_desa', 'json_fallback', out.length, 'ok', f);
  }
  return total;
}

export async function importLumbung(ctx, kecMap) {
  const F = 'Banyaknya Lumbung dan Gudang Pangan CSV.csv';
  const { rows } = readCsv(ctx, F);
  const out = [];
  for (const { row, kecamatan_id, tahun } of iterKecRows(ctx, kecMap, rows, F)) {
    out.push({
      kecamatan_id, tahun,
      lumbung_unit: cleanNum(row['Lumbung Jumlah']),
      lumbung_kapasitas_ton: cleanNum(row['Lumbung Kapasitas']),
      gudang_luas_m2: cleanNum(row['Luas (M2)']),
      gudang_kapasitas_ton_bulan: cleanNum(row['Lumbung Kapasitas/Bulan']),
    });
  }
  const n = await upsert(ctx, 'lumbung_pangan', out, [
    'lumbung_unit', 'lumbung_kapasitas_ton', 'gudang_luas_m2', 'gudang_kapasitas_ton_bulan'
  ]);
  await logSync(ctx, 'lumbung_pangan', 'csv', out.length);
  return n;
}

// ===========================================================================
// 7. EKONOMI (snapshot CKAN/BPS, delimiter titik-koma)
// ===========================================================================

export async function importEkonomi(ctx) {
  let total = 0;

  const jobs = [
    ['pasar-2016-2025.csv', async ({ rows }, F) => {
      // header: "Jenis Pasar;Jumlah Pasar;Tahun" — jenis polos: Umum/Hewan/Buah/Ikan
      const out = [];
      for (const row of rows) {
        const jenis = normStr(row['Jenis Pasar']);
        const tahun = cleanTahun(row['Tahun'], ctx, F);
        const jumlah = cleanNum(row['Jumlah Pasar']);
        if (!jenis || tahun === null || jumlah === null) continue;
        out.push({ jenis, tahun, jumlah });
      }
      return ['pasar', out, ['jumlah']];
    }],
    ['inflasi-2018-2024.csv', async ({ rows }, F) => {
      // header: "Pembanding;Inflasi;Tahun" — pembanding = wilayah (Banjarnegara,
      // Cilacap, Purbalingga, Jawa Tengah, Nasional, ...)
      const out = [];
      for (const row of rows) {
        const wilayah = normStr(row['Pembanding']);
        const tahun = cleanTahun(row['Tahun'], ctx, F);
        const pct = cleanNum(row['Inflasi']);
        if (!wilayah || tahun === null || pct === null) continue;
        out.push({ wilayah, tahun, inflasi_pct: pct });
      }
      return ['inflasi', out, ['inflasi_pct']];
    }],
  ];

  for (const [file, build] of jobs) {
    try {
      const parsed = readCsv(ctx, file);
      const [table, out, updateCols] = await build(parsed, file);
      total += await upsert(ctx, table, out, updateCols);
      await logSync(ctx, table, 'csv', out.length, 'ok', file);
    } catch (e) {
      ctx.warnings.push(`ekonomi: ${file} dilewati (${e.message})`);
      await logSync(ctx, file, 'csv', 0, 'warn', e.message);
    }
  }

  return total;
}

// ===========================================================================
// 8. KELEMBAGAAN & SENSUS (JSON fallback)
// ===========================================================================

export async function importKelompokTani(ctx, kecMap) {
  const toRow = (r, f) => {
    const kecamatan_id = kecIdOrWarn(ctx, kecMap, r.kecamatan, f);
    if (!kecamatan_id) return null;
    const tahun = cleanTahun(r.tahun, ctx, f);
    if (tahun === null) return null;
    const desa = normStr(r.desa);
    if (!desa || isAggregateRow(desa)) return null;
    return {
      kecamatan_id, desa, desa_norm: normDesa(desa), tahun,
      kelompok_tani: cleanNum(r.kelompokTani),
      anggota_tani: cleanNum(r.anggotaTani),
      kelompok_perikanan: cleanNum(r.kelompokPerikanan),
      anggota_perikanan: cleanNum(r.anggotaPerikanan),
      gapoktan: cleanNum(r.gapoktan),
      anggota_gapoktan: cleanNum(r.anggotaGapoktan),
    };
  };

  let total = 0;
  // fallback tahunan (2022-2024)
  {
    const F = 'kelompok-tani-fallback.json';
    const data = readJson(ctx, F);
    const out = (Array.isArray(data) ? data : []).map((r) => toRow(r, F)).filter(Boolean);
    total += await upsert(ctx, 'kelompok_tani', out, [
      'desa', 'kelompok_tani', 'anggota_tani', 'kelompok_perikanan',
      'anggota_perikanan', 'gapoktan', 'anggota_gapoktan'
    ]);
    await logSync(ctx, 'kelompok_tani', 'json_fallback', out.length, 'ok', F);
  }
  // baris dasar dari snapshot SIMLUH KTH (tahun 2026) — snapshot terpisah, tidak dicampur ke seri
  {
    const F = 'kelompok-tani-hutan.json';
    const data = readJson(ctx, F);
    const out = (Array.isArray(data) ? data : []).map((r) => toRow(r, F)).filter(Boolean);
    total += await upsert(ctx, 'kelompok_tani', out, [
      'desa', 'kelompok_tani', 'anggota_tani', 'kelompok_perikanan',
      'anggota_perikanan', 'gapoktan', 'anggota_gapoktan'
    ]);
    await logSync(ctx, 'kelompok_tani', 'json_fallback', out.length, 'ok', `${F} (snapshot)`);
  }
  return total;
}

export async function importKelompokTaniHutan(ctx, kecMap) {
  const F = 'kelompok-tani-hutan.json';
  const data = readJson(ctx, F);
  if (!Array.isArray(data)) return 0;

  // KTH adalah snapshot -> full reload (parent + detail)
  if (!ctx.dryRun) {
    await ctx.db.query('SET FOREIGN_KEY_CHECKS=0');
    await ctx.db.query('TRUNCATE TABLE kth_detail');
    await ctx.db.query('TRUNCATE TABLE kelompok_tani_hutan');
    await ctx.db.query('SET FOREIGN_KEY_CHECKS=1');
  }

  let nParent = 0;
  let nDetail = 0;
  for (const r of data) {
    const kecamatan_id = kecIdOrWarn(ctx, kecMap, r.kecamatan, F);
    if (!kecamatan_id) continue;
    const tahun = cleanTahun(r.tahun, ctx, F);
    if (tahun === null) continue;
    const desa = normStr(r.desa);
    if (!desa) continue;

    const parent = {
      kecamatan_id, desa, desa_norm: normDesa(desa), tahun,
      kth: cleanNum(r.kelompokTaniHutan),
      kth_pemula: cleanNum(r.kthPemula),
      kth_madya: cleanNum(r.kthMadya),
      kth_utama: cleanNum(r.kthUtama),
    };

    if (ctx.dryRun) {
      nParent++;
      nDetail += Array.isArray(r.kelompokTaniHutanList) ? r.kelompokTaniHutanList.length : 0;
      continue;
    }

    const [res] = await ctx.db.query(
      `INSERT INTO kelompok_tani_hutan
         (kecamatan_id, desa, desa_norm, tahun, kth, kth_pemula, kth_madya, kth_utama)
       VALUES (?,?,?,?,?,?,?,?)`,
      [parent.kecamatan_id, parent.desa, parent.desa_norm, parent.tahun,
       parent.kth, parent.kth_pemula, parent.kth_madya, parent.kth_utama]
    );
    nParent++;
    const pid = res.insertId;
    const list = Array.isArray(r.kelompokTaniHutanList) ? r.kelompokTaniHutanList : [];
    for (const k of list) {
      await ctx.db.query(
        `INSERT INTO kth_detail
           (kelompok_tani_hutan_id, nama_kelompok, no_register, tanggal_berdiri, kelas, alamat, ketua)
         VALUES (?,?,?,?,?,?,?)`,
        [pid, normStr(k.namaKelompok), k.noRegister ?? null, k.tanggalBerdiri ?? null,
         k.kelas ?? null, k.alamat ?? null, k.ketua ?? null]
      );
      nDetail++;
    }
  }
  await logSync(ctx, 'kelompok_tani_hutan', 'json_fallback', nParent);
  await logSync(ctx, 'kth_detail', 'json_fallback', nDetail);
  return nParent + nDetail;
}

export async function importSt2023(ctx, kecMap) {
  const F = 'st2023-desa-fallback.json';
  const data = readJson(ctx, F);
  if (!Array.isArray(data)) return 0;
  const out = [];
  for (const r of data) {
    const kecamatan_id = kecIdOrWarn(ctx, kecMap, r.kecamatan, F);
    if (!kecamatan_id) continue;
    const desa = normStr(r.desa);
    if (!desa) continue;
    out.push({
      kecamatan_id, desa, desa_norm: normDesa(desa),
      rumah_tangga_petani: cleanNum(r.rumahTanggaPetani),
      petani: cleanNum(r.petani),
      rt_anggota_kelompok: cleanNum(r.rtAnggotaKelompok),
      rt_bukan_anggota_kelompok: cleanNum(r.rtBukanAnggotaKelompok),
      rtup: cleanNum(r.rtup),
      rt_perikanan: cleanNum(r.rtPerikanan),
      rt_perikanan_budidaya: cleanNum(r.rtPerikananBudidaya),
      rt_perikanan_tangkap: cleanNum(r.rtPerikananTangkap),
      ternak: r.ternak ? JSON.stringify(r.ternak) : null,
      sumber_teks: r.sumber ?? null,
    });
  }
  const n = await upsert(ctx, 'st2023_desa', out, [
    'desa', 'rumah_tangga_petani', 'petani', 'rt_anggota_kelompok', 'rt_bukan_anggota_kelompok',
    'rtup', 'rt_perikanan', 'rt_perikanan_budidaya', 'rt_perikanan_tangkap', 'ternak', 'sumber_teks'
  ]);
  await logSync(ctx, 'st2023_desa', 'json_fallback', out.length);
  return n;
}
