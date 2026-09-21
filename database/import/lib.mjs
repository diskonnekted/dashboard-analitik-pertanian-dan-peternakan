/**
 * lib.mjs — utilitas inti ETL SISPERTANI → MySQL
 *
 * Berisi: koneksi DB (lazy), pembaca CSV/JSON/GeoJSON, pembersih angka gaya BPS,
 * resolver nama kecamatan (cermin normalizeKecamatan di src/services/api.ts),
 * mesin melt untuk 3 pola CSV, dan upsert batch.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Konteks global import
// ---------------------------------------------------------------------------

export function makeCtx({ dryRun = false } = {}) {
  const publicDir =
    process.env.PUBLIC_DIR || path.resolve(__dirname, '..', '..', 'public');
  if (!fs.existsSync(publicDir)) {
    throw new Error(`PUBLIC_DIR tidak ditemukan: ${publicDir}`);
  }
  const ctx = {
    dryRun,
    publicDir,
    db: null,
    fileIndex: null,      // Map<normalizedName, absolutePath> untuk CSV
    warnings: [],         // string[] — dikumpulkan, dicetak di akhir
    kecResolver: null,    // (namaMentah) => { id, nama } | null
  };
  ctx.fileIndex = buildFileIndex(publicDir);
  return ctx;
}

export async function connectDb(ctx) {
  if (ctx.dryRun) return;
  const mysql = await import('mysql2/promise');
  ctx.db = await mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'sispertani',
    waitForConnections: true,
    connectionLimit: 4,
    namedPlaceholders: false,
  });
}

// ---------------------------------------------------------------------------
// Indeks file: nama file -> path absolut (folder boleh berubah, nama unik)
// Normalisasi: lowercase, en/em dash -> '-', spasi ganda -> satu.
// ---------------------------------------------------------------------------

function normFileName(name) {
  return name
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFileIndex(publicDir) {
  const map = new Map();
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === '_tmp' || ent.name === 'tidy') continue; // _tmp = file kerja rusak; tidy = turunan
        walk(full);
      } else if (/\.(csv|json|geojson)$/i.test(ent.name)) {
        map.set(normFileName(ent.name), full);
      }
    }
  };
  walk(publicDir);
  return map;
}

/** Cari file berdasarkan nama (toleran dash/spasi). Throw jika tidak ada. */
export function locateFile(ctx, fileName) {
  const key = normFileName(fileName);
  const found = ctx.fileIndex.get(key);
  if (!found) {
    throw new Error(`File tidak ditemukan di public/: "${fileName}" (key: ${key})`);
  }
  return found;
}

// ---------------------------------------------------------------------------
// Pembaca CSV / JSON
// ---------------------------------------------------------------------------

/** Parse CSV dengan header. Header di-trim & spasi ganda dirapatkan. */
export function readCsv(ctx, fileName) {
  const full = locateFile(ctx, fileName);
  const text = fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, ''); // strip BOM
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.replace(/\s+/g, ' ').trim(),
  });
  if (parsed.errors?.length) {
    const fatal = parsed.errors.filter((e) => e.type === 'Delimiter');
    if (fatal.length) throw new Error(`Gagal parse ${fileName}: ${fatal[0].message}`);
  }
  return { rows: parsed.data, fields: parsed.meta.fields, file: full };
}

export function readJson(ctx, fileName) {
  const full = locateFile(ctx, fileName);
  return JSON.parse(fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, ''));
}

// ---------------------------------------------------------------------------
// Pembersih nilai gaya BPS
//   " 2,165 " -> 2165 | "491,592" -> 491592 | "4080.72" -> 4080.72
//   "-" / "—" / "" -> null | "60.7" -> 60.7
//   Koma = pemisah ribuan, titik = desimal (terverifikasi di seluruh CSV).
// ---------------------------------------------------------------------------

export function cleanNum(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (s === '' || s === '-' || s === '—' || s === '--') return null;
  s = s.replace(/,/g, '').replace(/\s+/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Tahun valid 4 digit 2000..2030; selain itu null + warning. */
export function cleanTahun(v, ctx, asal) {
  const n = cleanNum(v);
  if (n === null) return null;
  if (!Number.isInteger(n) || n < 2000 || n > 2030) {
    ctx.warnings.push(`tahun aneh "${v}" di ${asal}`);
    return null;
  }
  return n;
}

export const normStr = (v) =>
  v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim();

/** Kunci normal: huruf kecil alfanumerik saja (cermin normalizeKecamatan api.ts) */
export const normKey = (v) => normStr(v).toLowerCase().replace(/[^a-z0-9]/g, '');

/** Uppercase untuk join desa */
export const normDesa = (v) => normStr(v).toUpperCase();

/** Baris agregat BPS ("Jumlah" / "J u m l a h" / "TOTAL") — TIDAK diimpor, dihitung via SUM */
export function isAggregateRow(kecamatanNama) {
  const s = normStr(kecamatanNama);
  if (/^(jumlah|total|kabupaten\b)/i.test(s)) return true;
  return /^j\s*u\s*m\s*l\s*a\s*h$/i.test(s); // varian spasi-per-huruf di beberapa file BPS
}

// ---------------------------------------------------------------------------
// Resolver kecamatan — cermin normalizeKecamatan() di src/services/api.ts
// Urutan alias penting: yang spesifik (Klampok, Purwo*) dicek lebih dulu.
// ---------------------------------------------------------------------------

const KEC_ALIASES = [
  // [namaBaku, [alias...]]  — semua alias sudah di-normKey
  ['Purwareja Klampok', ['purwarejaklampok', 'purworejoklampok', 'purworejoklp', 'klampok']],
  ['Purwanegara', ['purwanegara', 'purwonegoro', 'purwonegara', 'purwongoro', 'purwonegero']],
  ['Wanadadi', ['wanadadi', 'wonodadi', 'wanodadi']],
];

/**
 * Kanonikal alias-only (tanpa daftar baku): untuk menormalkan nama yang sudah
 * "hampir benar" dari sumber referensi (mis. GeoJSON "Purwarejaklampok").
 * Mengembalikan nama baku, atau input (di-normStr) bila tak ada alias cocok.
 */
export function kecBaku(raw) {
  const key = normKey(raw);
  if (!key) return normStr(raw);
  for (const [baku, aliases] of KEC_ALIASES) {
    for (const a of aliases) if (key.includes(a)) return baku;
  }
  return normStr(raw);
}

export function initKecamatanResolver(ctx, canonicalNames) {
  // canonicalNames: string[] nama baku (20 kecamatan)
  const canonKeys = canonicalNames.map((n) => [n, normKey(n)]);
  const aliasEntries = [];
  for (const [baku, aliases] of KEC_ALIASES) {
    for (const a of aliases) aliasEntries.push([baku, a]);
  }

  const resolveName = (raw) => {
    const key = normKey(raw);
    if (!key) return null;
    for (const [baku, alias] of aliasEntries) {
      if (key.includes(alias)) return baku;
    }
    for (const [baku, ckey] of canonKeys) {
      if (key.includes(ckey)) return baku;
    }
    return null;
  };

  // Mode DB: map nama baku -> id. Mode dry-run: id = null (hanya validasi nama).
  // Konvensi: asal === null => mode senyap (tanpa warning), untuk deteksi
  // baris non-kecamatan (mis. blok ringkasan kabupaten di file perkebunan).
  ctx.kecResolver = (raw, asal = '?') => {
    const nama = resolveName(raw);
    if (!nama) {
      if (asal !== null) ctx.warnings.push(`kecamatan tak dikenal "${normStr(raw)}" di ${asal}`);
      return null;
    }
    return nama;
  };
}

/** Muat resolver dari DB (setelah ref diimpor) atau dari GeoJSON (dry-run). */
export async function loadKecamatanResolver(ctx) {
  if (ctx.dryRun) {
    const geo = readJson(ctx, 'peta_desa_v3.geojson');
    const names = [
      ...new Set(geo.features.map((f) => kecBaku(stripKecPrefix(f.properties.Kecamatan)))),
    ].sort();
    initKecamatanResolver(ctx, names);
    return new Map(names.map((n, i) => [n, i + 1])); // id semu utk laporan
  }
  const [rows] = await ctx.db.query('SELECT id, nama FROM kecamatan');
  if (rows.length === 0) throw new Error('Tabel kecamatan kosong — jalankan import "ref" dulu');
  const names = rows.map((r) => r.nama);
  initKecamatanResolver(ctx, names);
  return new Map(rows.map((r) => [r.nama, r.id]));
}

export const stripKecPrefix = (s) => normStr(String(s ?? '').replace(/^kec\.?\s*/i, ''));
export const stripDesaPrefix = (s) => normStr(String(s ?? '').replace(/^(desa|kelurahan)\s+/i, ''));

// ---------------------------------------------------------------------------
// Mesin melt — 3 pola CSV Distankan
// ---------------------------------------------------------------------------

/**
 * POLA A: kolom tetap per jenis, 1 baris = kecamatan x tahun.
 * colMap: [{ col, jenis, meta? }] — jenis disimpan apa adanya (trim).
 * hasil: [{ kecamatan, tahun, jenis, nilai, meta }]
 */
export function meltFixedColumns(rows, { colMap, tahunCol = 'Tahun', kecCol = 'Kecamatan' }) {
  const out = [];
  for (const row of rows) {
    const kec = normStr(row[kecCol]);
    const tahun = cleanNum(row[tahunCol]);
    for (const { col, jenis, meta } of colMap) {
      const nilai = cleanNum(row[col]);
      if (nilai === null) continue;
      out.push({ kecamatan: kec, tahun, jenis, nilai, meta });
    }
  }
  return out;
}

/**
 * POLA B: format lebar "Komoditas (satuan) TTTT" — baris punya kolom Tahun,
 * hanya grup kolom tahun tsb yang terisi. Hasil: [{ kecamatan, tahun, komoditas, nilai }]
 */
export function meltWideYear(rows, fields, { tahunCol = 'Tahun', kecCol = 'Kecamatan' } = {}) {
  const re = /^(.+?)\s*\((ha|m2|ton|tangkai)\)\s*(\d{4})$/i;
  const cols = [];
  for (const f of fields) {
    const m = f.match(re);
    if (m) cols.push({ field: f, komoditas: normStr(m[1]), satuan: m[2].toLowerCase(), tahun: Number(m[3]) });
  }
  const out = [];
  for (const row of rows) {
    const kec = normStr(row[kecCol]);
    const tahun = cleanNum(row[tahunCol]);
    if (tahun === null) continue;
    for (const c of cols) {
      if (c.tahun !== tahun) continue;
      const nilai = cleanNum(row[c.field]);
      if (nilai === null) continue;
      out.push({ kecamatan: kec, tahun, komoditas: c.komoditas, nilai, satuan: c.satuan });
    }
  }
  return out;
}

/**
 * POLA C: pasangan kolom "<Prefix> <Metrik> (<Satuan>)" per kecamatan x tahun.
 * Metrik: Produksi|Nilai|Luas. Hasil: Map prefix -> { produksi_kg, nilai_ribu_rp, luas_ha, ... }
 * Cocok untuk perikanan tangkap/budidaya/pemeliharaan.
 */
export function meltPairs(rows, fields, { tahunCol = 'Tahun', kecCol = 'Kecamatan' } = {}) {
  const re = /^(.+?)\s+(Produksi|Nilai|Luas)\s*\((Kg|Ribu Rupiah|Ha|M2)\)$/i;
  const cols = [];
  for (const f of fields) {
    const m = f.match(re);
    if (!m) continue;
    const metric = m[2].toLowerCase(); // produksi|nilai|luas
    const unit = m[3].toLowerCase();   // kg|ribu rupiah|ha|m2
    const target =
      metric === 'produksi' ? 'produksi_kg'
      : metric === 'nilai' ? 'nilai_ribu_rp'
      : unit === 'ha' ? 'luas_ha' : 'luas_m2';
    cols.push({ field: f, prefix: normStr(m[1]), target });
  }
  const out = [];
  for (const row of rows) {
    const kec = normStr(row[kecCol]);
    const tahun = cleanNum(row[tahunCol]);
    if (tahun === null) continue;
    const byPrefix = new Map();
    for (const c of cols) {
      const nilai = cleanNum(row[c.field]);
      if (nilai === null) continue;
      if (!byPrefix.has(c.prefix)) byPrefix.set(c.prefix, { kecamatan: kec, tahun, prefix: c.prefix });
      byPrefix.get(c.prefix)[c.target] = nilai;
    }
    out.push(...byPrefix.values());
  }
  return out;
}

// ---------------------------------------------------------------------------
// Upsert batch — INSERT ... ON DUPLICATE KEY UPDATE ... VALUES(col)
// (bentuk klasik: kompatibel MariaDB 10.x DAN MySQL 5.7/8.x; warning
//  deprecation VALUES() di MySQL 8.0.20+ aman diabaikan)
// ---------------------------------------------------------------------------

export async function upsert(ctx, table, rows, updateCols) {
  if (rows.length === 0) return 0;
  if (ctx.dryRun) return rows.length;
  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `\`${c}\``).join(', ');
  const updates = updateCols.map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');
  const CHUNK = 500;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const placeholders = slice.map(() => `(${cols.map(() => '?').join(', ')})`).join(', ');
    const values = slice.flatMap((r) => cols.map((c) => r[c]));
    const sql = `INSERT INTO \`${table}\` (${colList}) VALUES ${placeholders}
                 ON DUPLICATE KEY UPDATE ${updates}`;
    const [res] = await ctx.db.query(sql, values);
    total += res.affectedRows;
  }
  return total;
}

export async function logSync(ctx, dataset, sumber, baris, status = 'ok', pesan = null) {
  if (ctx.dryRun) return;
  await ctx.db.query(
    'INSERT INTO sync_log (dataset, sumber, aksi, baris, status, pesan) VALUES (?,?,?,?,?,?)',
    [dataset, sumber, 'import', baris, status, pesan]
  );
}

// ---------------------------------------------------------------------------
// Helper tingkat dataset: resolve kecamatan -> id, skip baris agregat
// ---------------------------------------------------------------------------

export function kecIdOrWarn(ctx, kecMap, raw, asal) {
  const nama = ctx.kecResolver(raw, asal);
  if (!nama) return null;
  const id = kecMap.get(nama);
  if (!id) {
    ctx.warnings.push(`kecamatan "${nama}" tidak ada di tabel kecamatan (${asal})`);
    return null;
  }
  return id;
}
