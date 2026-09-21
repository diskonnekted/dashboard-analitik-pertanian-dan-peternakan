/**
 * _tmp/test-admin.mjs — uji end-to-end dasbor admin (login/template/export/import).
 * Jalankan: node _tmp/test-admin.mjs  (backend harus jalan di 127.0.0.1:4100)
 */
import ExcelJS from "../backend/node_modules/exceljs/lib/exceljs.nodejs.js";
import { execSync } from "node:child_process";

const BASE = "http://127.0.0.1:4100/api";
const R = { ok: 0, fail: 0 };
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);
  cond ? R.ok++ : R.fail++;
};

// 1) login salah → 401
let r = await fetch(`${BASE}/v1/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: "admin", pass: "salah" }) });
check("login salah ditolak 401", r.status === 401);

// 2) login benar → token
r = await fetch(`${BASE}/v1/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: "admin", pass: "distanbanjarnegara2026" }) });
const login = await r.json();
check("login benar → token", r.status === 200 && login.token?.length > 40);
const AUTH = { Authorization: `Bearer ${login.token}` };

// 3) domains tanpa token → 401; dengan token → 15 domain
r = await fetch(`${BASE}/v1/admin/domains`);
check("domains tanpa token → 401", r.status === 401);
r = await fetch(`${BASE}/v1/admin/domains`, { headers: AUTH });
const domains = await r.json();
check("domains → 15 domain", r.status === 200 && Array.isArray(domains) && domains.length === 15, `terima ${domains.length}`);

// 4) template bantuan-program → xlsx valid (PK header) + sheet PETUNJUK
r = await fetch(`${BASE}/v1/admin/template/bantuan-program`, { headers: AUTH });
const tplBuf = Buffer.from(await r.arrayBuffer());
check("template bantuan-program → xlsx", r.status === 200 && tplBuf[0] === 0x50 && tplBuf[1] === 0x4b, `${tplBuf.length} byte`);
const tplWb = new ExcelJS.Workbook();
await tplWb.xlsx.load(tplBuf);
const tplSheet = tplWb.getWorksheet("Program");
check("template punya sheet Program + PETUNJUK + CONTOH", !!tplSheet && !!tplWb.getWorksheet("PETUNJUK") && !!tplWb.getWorksheet("CONTOH Program"));
const tplHeaders = tplSheet.getRow(1).values.slice(1);
console.log("      header template:", tplHeaders.join(" | "));

// 5) export perikanan → xlsx dengan data + kolom Kecamatan terisi
r = await fetch(`${BASE}/v1/admin/export/perikanan`, { headers: AUTH });
const expBuf = Buffer.from(await r.arrayBuffer());
check("export perikanan → xlsx", r.status === 200 && expBuf.length > 5000, `${expBuf.length} byte`);
const expWb = new ExcelJS.Workbook();
await expWb.xlsx.load(expBuf);
const expSheet = expWb.getWorksheet("Tangkap per Alat");
const expRow2 = expSheet?.getRow(2).values.slice(1) ?? [];
check("export perikanan sheet 'Tangkap per Alat' ada baris data", expSheet && expSheet.rowCount > 1, `rowCount=${expSheet?.rowCount}, baris2=${JSON.stringify(expRow2).slice(0, 120)}`);

// 6) import bantuan-program: 1 baris valid + 1 baris enum salah
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Program");
ws.addRow(tplHeaders);
ws.addRow(["Bantuan Bibit Padi (UJI OTOMATIS)", "APBD", 2026, 1500000000, "Tanaman Pangan", 1200, "Petani", "Tinggi", "Baris uji end-to-end — boleh dihapus"]);
ws.addRow(["Bantuan Uji Enum Salah", "APBN", 2026, 500000000, "Tanaman Pangan", 10, "Petani", "Super", "dampak_level tidak valid"]);
const buf = await wb.xlsx.writeBuffer();
let form = new FormData();
form.append("file", new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "uji-bantuan.xlsx");
r = await fetch(`${BASE}/v1/admin/import/bantuan-program`, { method: "POST", headers: AUTH, body: form });
const rep = await r.json();
check("import: 1 inserted + 1 error enum", r.status === 200 && rep.inserted === 1 && rep.errors.length === 1, `inserted=${rep.inserted} errors=${JSON.stringify(rep.errors)}`);

// 7) re-import baris valid sama → updated (upsert)
form = new FormData();
form.append("file", new Blob([buf], { type: "application/octet-stream" }), "uji-bantuan.xlsx");
r = await fetch(`${BASE}/v1/admin/import/bantuan-program`, { method: "POST", headers: AUTH, body: form });
const rep2 = await r.json();
check("re-import sama → 1 updated 0 inserted", r.status === 200 && rep2.updated === 1 && rep2.inserted === 0, `updated=${rep2.updated} inserted=${rep2.inserted}`);

// 8) import padi: alias kecamatan Purwonegoro → harus resolve ke Purwanegara
//    Baris uji dibangun dari header template (tahan terhadap perubahan urutan kolom)
execSync(`"D:\\xampp\\mysql\\bin\\mysql.exe" -u root sispertani -e "DELETE FROM padi_produksi WHERE tahun=2026"`); // pre-clean run sebelumnya
const wbP = new ExcelJS.Workbook();
const wsP = wbP.addWorksheet("Padi");
const tplPadi = await (await fetch(`${BASE}/v1/admin/template/padi`, { headers: AUTH })).arrayBuffer();
const wbT = new ExcelJS.Workbook();
await wbT.xlsx.load(tplPadi);
const headersPadi = wbT.getWorksheet("Padi").getRow(1).values.slice(1);
const rowPadi = headersPadi.map((h) =>
  /kecamatan/i.test(h) ? "Purwonegoro" :
  /tahun/i.test(h) ? 2026 :
  /jenis/i.test(h) ? "Sawah" :
  /produksi/i.test(h) ? 111.5 : ""
);
wsP.addRow(headersPadi);
wsP.addRow(rowPadi);
form = new FormData();
form.append("file", new Blob([await wbP.xlsx.writeBuffer()], { type: "application/octet-stream" }), "uji-padi.xlsx");
r = await fetch(`${BASE}/v1/admin/import/padi`, { method: "POST", headers: AUTH, body: form });
const repP = await r.json();
check("import padi alias 'Purwonegoro' → inserted", r.status === 200 && repP.inserted === 1, JSON.stringify(repP.errors ?? ""));

// 8b) export padi → jumlah baris == COUNT(*) DB
r = await fetch(`${BASE}/v1/admin/export/padi`, { headers: AUTH });
const expPadiBuf = Buffer.from(await r.arrayBuffer());
const expPadiWb = new ExcelJS.Workbook();
await expPadiWb.xlsx.load(expPadiBuf);
const dbCount = execSync(`"D:\\xampp\\mysql\\bin\\mysql.exe" -u root sispertani -N -e "SELECT COUNT(*) FROM padi_produksi"`, { encoding: "utf8" }).trim();
const expRows = expPadiWb.getWorksheet("Padi").rowCount - 1;
check("export padi baris == COUNT(*) DB", String(expRows) === dbCount, `excel=${expRows} db=${dbCount}`);

// 9) GET /api/v1/bantuan → bentuk BantuanData benar
r = await fetch(`${BASE}/v1/bantuan`);
const bantuan = await r.json();
const p0 = bantuan.program?.[0];
check("GET /v1/bantuan bentuk program benar",
  r.status === 200 && bantuan.program?.length >= 1 && p0._id && p0.nama === "Bantuan Bibit Padi (UJI OTOMATIS)" && p0.sumber === "APBD" && p0.tahunAnggaran === 2026 && p0.nilaiRupiah === 1500000000 && p0.dampakLevel === "Tinggi" && typeof p0._updatedAt === "string" && !!bantuan.updatedAt,
  `program=${bantuan.program?.length} alokasi=${bantuan.alokasi?.length} korelasi=${bantuan.korelasi?.length}`);

// 10) verifikasi DB: kecamatan_id padi uji == Purwanegara (jenis ENUM DB lowercase 'sawah')
const sql = execSync(`"D:\\xampp\\mysql\\bin\\mysql.exe" -u root sispertani -N -e "SELECT k.nama, p.produksi_ton FROM padi_produksi p JOIN kecamatan k ON k.id=p.kecamatan_id WHERE p.tahun=2026 AND p.produksi_ton=111.5"`, { encoding: "utf8" }).trim();
check("padi uji tersimpan di Purwanegara, produksi_ton=111.5", sql.startsWith("Purwanegara") && /111\.5/.test(sql), `db: '${sql}'`);

// 11) bersihkan data uji (termasuk baris uji lama dari run sebelumnya)
execSync(`"D:\\xampp\\mysql\\bin\\mysql.exe" -u root sispertani -e "DELETE FROM bantuan_program WHERE nama LIKE 'Bantuan%(UJI OTOMATIS)%' OR nama='Bantuan Uji Enum Salah'; DELETE FROM padi_produksi WHERE tahun=2026"`);
const sisa = execSync(`"D:\\xampp\\mysql\\bin\\mysql.exe" -u root sispertani -N -e "SELECT (SELECT COUNT(*) FROM bantuan_program)+(SELECT COUNT(*) FROM padi_produksi WHERE tahun=2026)"`, { encoding: "utf8" }).trim();
check("data uji dibersihkan", sisa === "0");

console.log(`\n=== ${R.ok} PASS, ${R.fail} FAIL ===`);
process.exit(R.fail ? 1 : 0);
