/**
 * audit-sync.mjs — AUDIT READ-ONLY sinkronisasi template Excel ↔ database SQL.
 * Tanggal: 2026-09-23. Tidak menulis apa pun ke templates/ / exports/.
 *
 * Yang diperiksa per domain (15 dasbor + referensi):
 *   1. Header template xlsx  == spec.cols (domains.js) == header export xlsx
 *   2. Kolom spec ada di DB (information_schema) & kolom DB non-internal tercakup spec
 *   3. Row count snapshot export == COUNT(*) DB live
 *   4. Aktivitas tulis DB pasca-snapshot (created_at/updated_at > ambang)
 *   5. Inventaris tabel DB tanpa cakupan template (termasuk 4 tabel baru f4e9d64)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ExcelJS from "exceljs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const BACKEND = path.join(ROOT, "backend");
const DIR_TPL = path.join(__dirname, "templates");
const DIR_EXP = path.join(__dirname, "exports");
const REPORT = path.join(ROOT, "_tmp", "audit-template-sync-2026-09-23.md");
const SNAP = "2026-09-22 14:17:00"; // snapshot dibuat 22 Sep 14:16:29

// --- muat backend/.env ke process.env SEBELUM import modul backend ---
const ENV_PATH = path.join(BACKEND, ".env");
if (!fs.existsSync(ENV_PATH)) { console.error("FATAL: backend/.env tidak ada"); process.exit(1); }
for (const raw of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(raw);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { loadDomain } = await import(pathToFileURL(path.join(BACKEND, "src", "lib", "domains.js")).href);
const { q, getPool } = await import(pathToFileURL(path.join(BACKEND, "src", "db.js")).href);

const DOMAIN_KEYS = [
  "padi", "palawija", "hortikultura", "perkebunan", "peternakan", "perikanan",
  "lahan", "lumbung", "ekonomi", "kelembagaan", "st2023", "renstra",
  "bantuan-program", "bantuan-alokasi", "bantuan-korelasi",
];
const INTERNAL = new Set(["id", "kecamatan_id", "desa_norm", "nama_norm", "sumber", "sumber_json", "created_at", "updated_at", "confidence"]);

// --- util baca workbook ---
function getHeader(ws) {
  const out = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (c, col) => { out[col - 1] = String(c.value ?? "").trim(); });
  while (out.length && out[out.length - 1] === "") out.pop();
  return out;
}
function dataRows(ws) {
  let n = 0;
  ws.eachRow({ includeEmpty: false }, (row, rn) => {
    if (rn === 1) return;
    let nonEmpty = false;
    row.eachCell({ includeEmpty: false }, (c) => {
      const v = c.value;
      if (v !== null && v !== undefined && String(v).trim() !== "") nonEmpty = true;
    });
    if (nonEmpty) n++;
  });
  return n;
}
function findExport(key) {
  const hit = fs.readdirSync(DIR_EXP).filter((f) => new RegExp(`^export-${key}-.*\\.xlsx$`).test(f));
  return hit.length ? path.join(DIR_EXP, hit[0]) : null;
}
const kolomCache = new Map();
async function kolomDb(tabel) {
  if (kolomCache.has(tabel)) return kolomCache.get(tabel);
  const rows = await q(
    `SELECT column_name AS kolom, data_type AS tipe
       FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ?
      ORDER BY ordinal_position`, [tabel]);
  kolomCache.set(tabel, rows);
  return rows;
}

const L = [];
const A = (s) => L.push(s);
let nErr = 0, nWarn = 0, nSheetOk = 0;
const covered = new Set(["kecamatan", "desa"]);
const sheetRows = []; // {domain, sheet, table, db, exp, ok}

A("# Audit Sinkronisasi Template Excel ↔ Database SQL");
A("");
A(`- Tanggal audit : 2026-09-23 (skrip read-only \`audit-sync.mjs\`)`);
A(`- Snapshot      : 2026-09-22 14:16 (commit d2e1a67)`);
A(`- DB live       : MySQL/MariaDB via backend/.env (port 4100 aktif)`);
A(`- Ambang aktivitas pasca-snapshot : \`${SNAP}\``);
A("");
A("## 1. Domain dasbor (15) — header, kolom DB, jumlah baris");
A("");
A("| Domain | Sheet | Tabel | Header tpl/spec/exp | Kolom DB | Baris DB | Baris snapshot | Data |");
A("|---|---|---|---|---|---:|---:|---|");

for (const key of DOMAIN_KEYS) {
  const domain = await loadDomain(key);
  if (!domain) { A(`| ${key} | ❌ domain tak dikenal | | | | | | ERROR |`); nErr++; continue; }
  const tplFile = path.join(DIR_TPL, `template-${key}.xlsx`);
  const expFile = findExport(key);
  const tplWb = fs.existsSync(tplFile) ? await new ExcelJS.Workbook().xlsx.readFile(tplFile) : null;
  const expWb = expFile ? await new ExcelJS.Workbook().xlsx.readFile(expFile) : null;
  if (!tplWb) { A(`| ${key} | FILE template-${key}.xlsx TIDAK ADA | | | | | | ERROR |`); nErr++; continue; }
  if (!expWb) { A(`| ${key} | FILE export-${key}-*.xlsx TIDAK ADA | | | | | | ERROR |`); nErr++; continue; }

  for (const spec of domain.sheets) {
    covered.add(spec.table);
    const expected = spec.cols.map((c) => c.header);
    const wsTpl = tplWb.getWorksheet(spec.name);
    const wsExp = expWb.getWorksheet(spec.name);
    let hStat = "OK", dStat = "—";
    let dbCount = -1, expCount = -1;
    const notes = [];

    if (!wsTpl) { hStat = "SHEET TPL HILANG"; nErr++; }
    if (!wsExp) { hStat = hStat === "OK" ? "SHEET EXP HILANG" : hStat + " + EXP"; nErr++; }

    // --- header template vs spec ---
    if (wsTpl) {
      const h = getHeader(wsTpl);
      if (h.length !== expected.length || h.some((x, i) => x !== expected[i])) {
        hStat = "TPL≠SPEC"; nErr++;
        notes.push(`tpl=[${h.join("|")}] spec=[${expected.join("|")}]`);
      }
    }
    // --- header export vs spec ---
    if (wsExp) {
      const h = getHeader(wsExp);
      if (h.length !== expected.length || h.some((x, i) => x !== expected[i])) {
        hStat = hStat === "OK" ? "EXP≠SPEC" : hStat + "+EXP≠SPEC"; nErr++;
        notes.push(`exp=[${h.join("|")}] spec=[${expected.join("|")}]`);
      }
    }

    // --- kolom DB vs spec ---
    const cols = await kolomDb(spec.table);
    let cStat = "OK";
    if (!cols.length) { cStat = "TABEL TIDAK ADA"; nErr++; }
    else {
      const dbNames = new Set(cols.map((c) => c.kolom));
      const specFields = spec.cols.filter((c) => c.type !== "kecamatan").map((c) => c.field);
      const hilang = specFields.filter((f) => !dbNames.has(f));
      if (hilang.length) { cStat = `SPEC≠DB (−${hilang.join(",")})`; nErr++; }
      if (spec.kecamatan && !dbNames.has("kecamatan_id")) { cStat += " kecamatan_id?"; nErr++; }
      const takTercakup = cols.map((c) => c.kolom).filter((k) => !INTERNAL.has(k) && !specFields.includes(k));
      if (takTercakup.length) { cStat += ` ⚠DB+${takTercakup.join(",")}`; nWarn++; }
    }

    // --- row count DB vs snapshot ---
    if (cols.length) {
      const rc = await q(`SELECT COUNT(*) AS n FROM \`${spec.table}\``);
      dbCount = Number(rc[0].n);
      if (wsExp) {
        expCount = dataRows(wsExp);
        dStat = dbCount === expCount ? "OK" : "BEDA";
        if (dStat !== "OK") nErr++;
      }
      // aktivitas pasca-snapshot
      const names = cols.map((c) => c.kolom);
      let akt = 0;
      if (names.includes("created_at")) {
        akt += Number((await q(`SELECT COUNT(*) AS n FROM \`${spec.table}\` WHERE created_at > ?`, [SNAP]))[0].n);
      }
      if (names.includes("updated_at")) {
        akt += Number((await q(`SELECT COUNT(*) AS n FROM \`${spec.table}\` WHERE updated_at > ? AND (created_at IS NULL OR created_at <= ?)`, [SNAP, SNAP]))[0].n);
      }
      if (akt > 0) { dStat += ` ⚠${akt} baris ditulis pasca-snapshot`; nWarn++; }
    }
    if (hStat === "OK" && cStat === "OK" && dStat === "OK") nSheetOk++;
    sheetRows.push({ domain: key, sheet: spec.name, table: spec.table, db: dbCount, exp: expCount });
    A(`| ${key} | ${spec.name} | ${spec.table} | ${hStat} | ${cStat} | ${dbCount} | ${expCount} | ${dStat} |${notes.length ? " <br>" + notes.join(" <br>") : ""}`);
  }
}

// --- domain referensi (kecamatan + desa) ---
A("");
A("## 2. Domain referensi (di luar dasbor, by design)");
A("");
const SKIP_KOLOM = new Set(["id", "kecamatan_id", "desa_norm", "nama_norm", "sumber", "sumber_json", "created_at", "updated_at", "confidence"]);
const LABEL_OVERRIDE = { kode_bps: "Kode BPS", nama: "Nama", desa: "Nama Desa" };
const titleCase = (s) => String(s).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
{
  const tplWb = await new ExcelJS.Workbook().xlsx.readFile(path.join(DIR_TPL, "template-referensi.xlsx"));
  const expFile = findExport("referensi");
  const expWb = expFile ? await new ExcelJS.Workbook().xlsx.readFile(expFile) : null;
  A("| Sheet | Tabel | Header tpl vs DB | Baris DB | Baris snapshot | Data |");
  A("|---|---|---|---:|---:|---|");
  for (const tabel of ["kecamatan", "desa"]) {
    const cols = (await kolomDb(tabel)).filter((c) => !SKIP_KOLOM.has(c.kolom) && !["json", "longtext"].includes(c.tipe));
    const expected = tabel === "desa" ? ["Kecamatan", ...cols.map((c) => LABEL_OVERRIDE[c.kolom] || titleCase(c.kolom))] : cols.map((c) => LABEL_OVERRIDE[c.kolom] || titleCase(c.kolom));
    const wsTpl = tplWb.getWorksheet(tabel === "desa" ? "Desa" : "Kecamatan");
    const wsExp = expWb?.getWorksheet(tabel === "desa" ? "Desa" : "Kecamatan");
    let hStat = "OK";
    if (!wsTpl) { hStat = "SHEET TPL HILANG"; nErr++; }
    else {
      const h = getHeader(wsTpl);
      if (h.length !== expected.length || h.some((x, i) => x !== expected[i])) { hStat = "TPL≠DB"; nErr++; }
    }
    const rc = await q(`SELECT COUNT(*) AS n FROM \`${tabel}\``);
    const dbCount = Number(rc[0].n);
    let dStat = "—", expCount = -1;
    if (wsExp) {
      expCount = dataRows(wsExp);
      dStat = dbCount === expCount ? "OK" : "BEDA";
      if (dStat !== "OK") nErr++; else nSheetOk++;
    }
    sheetRows.push({ domain: "referensi", sheet: tabel, table: tabel, db: dbCount, exp: expCount });
    A(`| ${tabel} | ${tabel} | ${hStat} | ${dbCount} | ${expCount} | ${dStat} |`);
  }
}

// --- inventaris tabel DB vs cakupan template ---
A("");
A("## 3. Inventaris tabel database vs cakupan template");
A("");
const tables = await q(
  `SELECT table_name AS t, table_type AS ty FROM information_schema.tables
    WHERE table_schema = DATABASE() ORDER BY table_name`);
const BARU = ["kwt_kelompok_wanita_tani", "komoditas_unggulan", "nilai_ekonomi_tahunan", "ltt_katam", "v_lahan_pertahanan"];
const BY_DESIGN = new Set(["lahan_desa", "sync_log", ...BARU]);
A(`Total objek DB: ${tables.length} (${tables.filter((t) => t.ty === "VIEW").length} view)`);
A("");
A("| Objek DB | Tipe | Dicakup template? | Keterangan |");
A("|---|---|---|---|");
for (const t of tables) {
  const isView = t.ty === "VIEW";
  const isCovered = covered.has(t.t);
  let ket = "";
  if (isCovered) ket = "ada di workbook domain";
  else if (isView) ket = "view gabungan (bukan tabel data)";
  else if (BARU.includes(t.t)) ket = "TABEL BARU (schema f4e9d64, pasca-template)";
  else if (BY_DESIGN.has(t.t)) ket = "tanpa template by design";
  else ket = "⚠ TIDAK TERCAKUP — perlu ditinjau";
  if (!isCovered && !BY_DESIGN.has(t.t) && !isView) nWarn++;
  A(`| ${t.t} | ${isView ? "VIEW" : "tabel"} | ${isCovered ? "✅ ya" : "—"} | ${ket} |`);
}
A("");

// --- status 4 tabel baru ---
A("## 4. Tabel baru pasca-template (f4e9d64) — status di DB live");
A("");
A("| Tabel | Ada di DB? | Baris |");
A("|---|---|---:|");
for (const t of BARU) {
  const ex = tables.find((x) => x.t === t);
  if (!ex) { A(`| ${t} | ❌ belum dibuat | — |`); continue; }
  if (ex.ty === "VIEW") { A(`| ${t} | ✅ (view) | — |`); continue; }
  const rc = await q(`SELECT COUNT(*) AS n FROM \`${t}\``);
  A(`| ${t} | ✅ | ${Number(rc[0].n)} |`);
}

// --- verdict ---
A("## 5. Verdict");
A("");
const totalSheet = sheetRows.length;
A(`- Sheet data diperiksa : ${totalSheet} (15 domain + referensi)`);
A(`- Sheet 100% sinkron   : ${nSheetOk}`);
A(`- Ketidaksesuaian fatal: ${nErr}`);
A(`- Peringatan           : ${nWarn}`);
A("");
if (nErr === 0 && nWarn === 0) {
  A("**VERDICT: SINKRON PENUH** — struktur header, kolom DB, dan jumlah baris snapshot export identik dengan DB live; tidak ada aktivitas tulis pasca-snapshot.");
} else if (nErr === 0) {
  A(`**VERDICT: SINKRON (dengan catatan)** — tidak ada ketidaksesuaian fatal; ${nWarn} peringatan (lihat baris ⚠).`);
} else {
  A(`**VERDICT: TIDAK SINKRON** — ${nErr} ketidaksesuaian fatal. Lihat tabel di atas.`);
}
A("");
A("_Skrip: database/template-import-export/audit-sync.mjs — read-only, tidak mengubah template/exports/DB._");

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, L.join("\r\n") + "\r\n", "utf8");
console.log(`\n=== AUDIT SELESAI ===`);
console.log(`Sheet diperiksa: ${totalSheet} | sinkron: ${nSheetOk} | fatal: ${nErr} | warning: ${nWarn}`);
console.log(`Laporan: ${REPORT}`);
await getPool().end();
