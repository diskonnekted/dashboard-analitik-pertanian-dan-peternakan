// Inspeksi struktur + sampel ternak_susu_kulit & sync_log (kredensial internal, tidak dicetak)
import { readFileSync } from "node:fs";
import mysql from "file:///I:/pertanian/pertanian-2/backend/node_modules/mysql2/promise.js";
const env = {};
for (const line of readFileSync("I:/pertanian/pertanian-2/backend/.env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const conn = await mysql.createConnection({ host: env.DB_HOST || "127.0.0.1", port: Number(env.DB_PORT || 3306), user: env.DB_USER || "root", password: env.DB_PASS || "", database: env.DB_NAME || "sispertani" });
for (const t of ["ternak_susu_kulit", "sync_log"]) {
  console.log(`\n===== DESC ${t} =====`);
  const [cols] = await conn.query(`DESCRIBE ${t}`);
  for (const c of cols) console.log(`${c.Field}\t${c.Type}\t${c.Null}\t${c.Key}\tdefault=${c.Default}`);
}
console.log("\n===== sampel ternak_susu_kulit (8 baris) =====");
const [rows] = await conn.query("SELECT * FROM ternak_susu_kulit ORDER BY id LIMIT 8");
console.table(rows);
console.log("\n===== distinct jenis + tahun =====");
const [jd] = await conn.query("SELECT jenis, COUNT(*) n, MIN(tahun) mn, MAX(tahun) mx FROM ternak_susu_kulit GROUP BY jenis ORDER BY jenis");
console.table(jd);
const [td] = await conn.query("SELECT tahun, COUNT(*) n FROM ternak_susu_kulit GROUP BY tahun ORDER BY tahun");
console.table(td);
console.log("\n===== sampel sync_log (3 terbaru) =====");
const [sl] = await conn.query("SELECT * FROM sync_log ORDER BY id DESC LIMIT 3");
console.table(sl.map(r => ({ ...r, detail: String(r.detail || "").slice(0, 60) })));
await conn.end();
