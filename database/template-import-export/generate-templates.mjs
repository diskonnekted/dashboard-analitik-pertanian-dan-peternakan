/**
 * generate-templates.mjs — Generator template & export Excel/CSV SISPERTANI.
 *
 * Prinsip: JANGAN menulis format sendiri. Template 15 domain dasbor dibuat oleh
 * engine aplikasi yang sama (backend/src/lib/excel.js → buildWorkbook) supaya
 * 100% identik dengan yang diunduh dari Dasbor Admin dan pasti bisa diimpor
 * balik via POST /api/v1/admin/import/:domain.
 *
 * Tambahan di luar dasbor (by design): domain REFERENSI (kecamatan + desa)
 * sebagai workbook khusus dokumentasi/audit.
 *
 * Output:
 *   templates/  → template-{domain}.xlsx (siap isi) + templates/csv/{tabel}.csv
 *   exports/    → export-{domain}-{tanggal}.xlsx (snapshot data live) + exports/csv/{tabel}.csv
 *
 * Jalankan (butuh MySQL hidup + backend/.env):
 *   node generate-templates.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ExcelJS from "exceljs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const BACKEND = path.join(ROOT, "backend");
const STAMP = new Date().toISOString().slice(0, 10); // 2026-09-22 — ASCII aman utk nama file

// ---------------------------------------------------------------------------
// 1. Muat backend/.env ke process.env SEBELUM import modul backend (db.js baca env)
// ---------------------------------------------------------------------------
const ENV_PATH = path.join(BACKEND, ".env");
if (!fs.existsSync(ENV_PATH)) {
  console.error(`FATAL: ${ENV_PATH} tidak ditemukan — generator butuh kredensial DB backend.`);
  process.exit(1);
}
for (const raw of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(raw);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

// ---------------------------------------------------------------------------
// 2. Import modul backend via file:// URL (wajib di Windows)
// ---------------------------------------------------------------------------
const { buildWorkbook } = await import(pathToFileURL(path.join(BACKEND, "src", "lib", "excel.js")).href);
const { q, getPool } = await import(pathToFileURL(path.join(BACKEND, "src", "db.js")).href);

// 15 domain yang dikelola Dasbor Admin (sinkron dengan backend/src/lib/domains.js)
const DOMAIN_KEYS = [
  "padi", "palawija", "hortikultura", "perkebunan", "peternakan", "perikanan",
  "lahan", "lumbung", "ekonomi", "kelembagaan", "st2023", "renstra",
  "bantuan-program", "bantuan-alokasi", "bantuan-korelasi",
];
const DOMAIN_LABELS = {
  padi: "Padi", palawija: "Palawija", hortikultura: "Hortikultura",
  perkebunan: "Perkebunan", peternakan: "Peternakan", perikanan: "Perikanan",
  lahan: "Lahan", lumbung: "Lumbung Pangan", ekonomi: "Ekonomi",
  kelembagaan: "Kelembagaan", st2023: "Sensus Pertanian 2023", renstra: "Renstra",
  "bantuan-program": "Bantuan - Program", "bantuan-alokasi": "Bantuan - Alokasi",
  "bantuan-korelasi": "Bantuan - Korelasi",
};

const DIR_TPL = path.join(__dirname, "templates");
const DIR_TPL_CSV = path.join(DIR_TPL, "csv");
const DIR_EXP = path.join(__dirname, "exports");
const DIR_EXP_CSV = path.join(DIR_EXP, "csv");
for (const d of [DIR_TPL, DIR_TPL_CSV, DIR_EXP, DIR_EXP_CSV]) fs.mkdirSync(d, { recursive: true });
// Bersihkan sisa CSV run sebelumnya agar tidak ada file basi / nama lama nyangkut
for (const d of [DIR_TPL_CSV, DIR_EXP_CSV]) for (const f of fs.readdirSync(d)) fs.unlinkSync(path.join(d, f));

// ---------------------------------------------------------------------------
// Util CSV
// ---------------------------------------------------------------------------
function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function writeCsv(file, rows) {
  const text = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  fs.writeFileSync(file, "\uFEFF" + text + "\r\n", "utf8"); // BOM agar Excel baca UTF-8 benar
}
function slug(name) {
  return name.toString().trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/_{2,}/g, "_");
}
/** Baris contoh generik untuk CSV template (inferensi dari label header). */
function contohCsv(label, kecPertama) {
  const l = String(label);
  if (/kecamatan/i.test(l)) return kecPertama || "Banjarnegara";
  if (/^tahun|tahun/i.test(l)) return 2025;
  if (/desa/i.test(l)) return "Contoh Desa";
  if (/kode/i.test(l)) return "3101xxxxx";
  if (/\d|\b(jumlah|luas|produksi|nilai|kapasitas|target|persen|pct|poin)\b|(\(.*(kg|ton|ha|m2|m²|ekor|unit|rp|%|liter|miliar|qu).*\))/i.test(l)) return 0;
  return "Contoh nilai";
}

// ---------------------------------------------------------------------------
// 3. Baca-balik workbook xlsx → daftar {sheetName, header, rows} untuk CSV.
//    Hanya sheet data (skip PETUNJUK & sheet CONTOH *) — konsisten dgn engine dasbor.
// ---------------------------------------------------------------------------
function parseSheet(ws) {
  const header = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (c, col) => { header[col] = String(c.value ?? ""); });
  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, rn) => {
    if (rn === 1) return;
    const vals = [];
    row.eachCell({ includeEmpty: true }, (c, col) => {
      let v = c.value;
      if (v && typeof v === "object") {
        if (v.richText) v = v.richText.map((t) => t.text).join("");
        else if (v.text) v = v.text;
        else if (v.result !== undefined) v = v.result;
        else v = String(v);
      }
      vals[col] = v;
    });
    // baris benar-benar kosong → skip (ExcelJS kadang kasih baris hantu)
    if (vals.filter((x) => x !== undefined && x !== null && x !== "").length === 0) return;
    rows.push(vals.slice(1, header.length + 1).map((x) => (x === undefined ? "" : x)));
  });
  return { header: header.slice(1).map((h) => (h === undefined ? "" : h)), rows };
}

/** Baca-balik workbook: sheet data + baris contoh pertama dari sheet "CONTOH {nama}". */
async function sheetsFromXlsx(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheets = [];
  const contoh = new Map();
  for (const ws of wb.worksheets) {
    if (!ws.name || ws.name === "PETUNJUK") continue;
    const parsed = parseSheet(ws);
    if (/^CONTOH/i.test(ws.name)) {
      const target = ws.name.replace(/^CONTOH\s*/i, "").trim();
      if (parsed.rows.length && !contoh.has(target)) contoh.set(target, parsed.rows[0]);
    } else {
      sheets.push({ name: ws.name, ...parsed });
    }
  }
  return { sheets, contoh };
}

// ---------------------------------------------------------------------------
// 4. Generate 15 domain dasbor (engine aplikasi → format identik & importable)
// ---------------------------------------------------------------------------
console.log(`\n=== SISPERTANI — Generator Template & Export (${STAMP}) ===\n`);
const usedTpl = new Set(); // guard nama file CSV template bentrok antar domain
const usedExp = new Set(); // guard nama file CSV export bentrok antar domain
const ringkasan = [];

for (const key of DOMAIN_KEYS) {
  const label = DOMAIN_LABELS[key] || key;

  const tplBuf = await buildWorkbook(key, "template");
  const tplFile = path.join(DIR_TPL, `template-${key}.xlsx`);
  fs.writeFileSync(tplFile, tplBuf);

  const expBuf = await buildWorkbook(key, "export");
  const expFile = path.join(DIR_EXP, `export-${key}-${STAMP}.xlsx`);
  fs.writeFileSync(expFile, expBuf);

  // CSV template: header + 1 baris contoh; CSV export: data penuh (dibaca dari xlsx)
  const kec = await q("SELECT nama FROM kecamatan ORDER BY id LIMIT 1");
  const kecPertama = kec.length ? kec[0].nama : null;

  const tplParsed = await sheetsFromXlsx(tplFile);
  const tplSheets = tplParsed.sheets;
  const contohMap = tplParsed.contoh;
  const expSheets = (await sheetsFromXlsx(expFile)).sheets;

  const csvNames = [];
  for (const sh of tplSheets) {
    let base = slug(sh.name) || key;
    if (usedTpl.has(base)) base = `${slug(key)}_${base}`;
    usedTpl.add(base);
    const contohRow = contohMap.get(sh.name) || sh.header.map((h) => contohCsv(h, kecPertama));
    writeCsv(path.join(DIR_TPL_CSV, `${base}.csv`), [sh.header, contohRow]);
    csvNames.push(`${base}.csv`);
  }
  for (const sh of expSheets) {
    let base = slug(sh.name) || key;
    if (usedExp.has(base)) base = `${slug(key)}_${base}`;
    usedExp.add(base);
    writeCsv(path.join(DIR_EXP_CSV, `${base}.csv`), [sh.header, ...sh.rows]);
  }

  const totalBaris = expSheets.reduce((a, s) => a + s.rows.length, 0);
  ringkasan.push({ key, label, sheets: tplSheets.map((s) => s.name), baris: totalBaris });
  console.log(`[OK] ${label.padEnd(24)} template + export xlsx | ${tplSheets.length} sheet | ${totalBaris} baris data live | CSV: ${csvNames.join(", ")}`);
}

// ---------------------------------------------------------------------------
// 5. Domain REFERENSI (kecamatan + desa) — di luar dasbor by design.
//    Template untuk dokumentasi/audit; mutasi referensi tetap via import/ref.mjs.
// ---------------------------------------------------------------------------
const SKIP_KOLOM = new Set(["id", "kecamatan_id", "desa_norm", "nama_norm", "sumber", "sumber_json", "created_at", "updated_at", "confidence"]);
const LABEL_OVERRIDE = { kode_bps: "Kode BPS", nama: "Nama", desa: "Nama Desa" };

async function kolomTabel(tabel) {
  const rows = await q(
    `SELECT column_name AS kolom, data_type AS tipe
       FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ?
      ORDER BY ordinal_position`, [tabel]);
  return rows.filter((r) => !SKIP_KOLOM.has(r.kolom) && !["json", "longtext"].includes(r.tipe));
}
function titleCase(s) {
  return String(s).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const kecKolom = await kolomTabel("kecamatan");
const desaKolom = await kolomTabel("desa");

const kecRows = await q("SELECT * FROM kecamatan ORDER BY id");
const desaRows = await q(
  `SELECT d.*, k.nama AS _kecamatan
     FROM desa d JOIN kecamatan k ON k.id = d.kecamatan_id
    ORDER BY k.id, d.id`);

function styleHeader(ws) {
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
  ws.getRow(1).border = { bottom: { style: "thin" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.columns.forEach((c) => { c.width = 26; });
}
function headerLabels(cols, withKecamatan) {
  const labels = cols.map((c) => LABEL_OVERRIDE[c.kolom] || titleCase(c.kolom));
  return withKecamatan ? ["Kecamatan", ...labels] : labels;
}

// -- Workbook template referensi --
{
  const wb = new ExcelJS.Workbook();
  const pj = wb.addWorksheet("PETUNJUK");
  pj.getColumn(1).width = 110;
  const baris = [
    ["TEMPLATE REFERENSI — KECAMATAN & DESA SISPERTANI"],
    [""],
    ["Domain ini TIDAK dikelola lewat Dasbor Admin (by design)."],
    ["Mutasi data referensi dilakukan lewat importer GeoJSON: database/import/ref.mjs"],
    ["Workbook ini untuk dokumentasi, audit, dan pemetaan nama → kode BPS."],
    [""],
    ["Aturan umum:"],
    ["1. Nama kecamatan/desa ditulis apa adanya (huruf besar-kecil diabaikan oleh sistem)."],
    ["2. Kode BPS mengikuti klasifikasi resmi (contoh Banjarnegara: 3101xxxxx)."],
    ["3. Jangan mengganti urutan atau judul kolom header."],
  ];
  baris.forEach((r, i) => {
    const cell = pj.getRow(i + 1).getCell(1);
    cell.value = r[0];
    if (i === 0) cell.font = { bold: true, size: 13 };
    if (/^Domain ini|^Mutasi|^Workbook ini/.test(r[0])) cell.font = { bold: true };
  });

  const wsK = wb.addWorksheet("Kecamatan");
  wsK.addRow(headerLabels(kecKolom, false));
  styleHeader(wsK);

  const wsD = wb.addWorksheet("Desa");
  wsD.addRow(headerLabels(desaKolom, true));
  styleHeader(wsD);

  await wb.xlsx.writeFile(path.join(DIR_TPL, "template-referensi.xlsx"));
}

// -- Workbook export referensi (data penuh) --
{
  const wb = new ExcelJS.Workbook();
  const wsK = wb.addWorksheet("Kecamatan");
  const hK = headerLabels(kecKolom, false);
  wsK.addRow(hK);
  styleHeader(wsK);
  for (const r of kecRows) wsK.addRow(kecKolom.map((c) => r[c.kolom] ?? ""));

  const wsD = wb.addWorksheet("Desa");
  const hD = headerLabels(desaKolom, true);
  wsD.addRow(hD);
  styleHeader(wsD);
  for (const r of desaRows) wsD.addRow([r._kecamatan, ...desaKolom.map((c) => r[c.kolom] ?? "")]);

  await wb.xlsx.writeFile(path.join(DIR_EXP, `export-referensi-${STAMP}.xlsx`));
}

// -- CSV referensi (template + export) --
{
  const hK = headerLabels(kecKolom, false);
  writeCsv(path.join(DIR_TPL_CSV, "kecamatan.csv"), [hK, hK.map(() => "")]);
  writeCsv(path.join(DIR_EXP_CSV, "kecamatan.csv"), [hK, ...kecRows.map((r) => kecKolom.map((c) => r[c.kolom] ?? ""))]);

  const hD = headerLabels(desaKolom, true);
  writeCsv(path.join(DIR_TPL_CSV, "desa.csv"), [hD, hD.map(() => "")]);
  writeCsv(path.join(DIR_EXP_CSV, "desa.csv"), [hD, ...desaRows.map((r) => [r._kecamatan, ...desaKolom.map((c) => r[c.kolom] ?? "")])]);
}
console.log(`[OK] Referensi              template + export xlsx + CSV | ${kecRows.length} kecamatan, ${desaRows.length} desa`);

// ---------------------------------------------------------------------------
// 6. Ringkasan akhir
// ---------------------------------------------------------------------------
const nTplX = fs.readdirSync(DIR_TPL).filter((f) => f.endsWith(".xlsx")).length;
const nTplC = fs.readdirSync(DIR_TPL_CSV).filter((f) => f.endsWith(".csv")).length;
const nExpX = fs.readdirSync(DIR_EXP).filter((f) => f.endsWith(".xlsx")).length;
const nExpC = fs.readdirSync(DIR_EXP_CSV).filter((f) => f.endsWith(".csv")).length;
const totalBarisLive = ringkasan.reduce((a, r) => a + r.baris, 0);

console.log(`\n=== SELESAI ===`);
console.log(`templates/  : ${nTplX} xlsx + ${nTplC} csv (header + baris contoh)`);
console.log(`exports/    : ${nExpX} xlsx + ${nExpC} csv (snapshot data ${STAMP})`);
console.log(`Total baris data live di export: ${totalBarisLive + kecRows.length + desaRows.length}`);

await getPool().end();
