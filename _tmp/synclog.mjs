import { readFileSync } from "node:fs";
import mysql from "file:///I:/pertanian/pertanian-2/backend/node_modules/mysql2/promise.js";
const env = {};
for (const line of readFileSync("I:/pertanian/pertanian-2/backend/.env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const conn = await mysql.createConnection({ host: env.DB_HOST || "127.0.0.1", port: Number(env.DB_PORT || 3306), user: env.DB_USER || "root", password: env.DB_PASS || "", database: env.DB_NAME || "sispertani" });
const [rows] = await conn.query("SELECT dataset, sumber, aksi, status, COUNT(*) AS n, MIN(created_at) AS pertama, MAX(created_at) AS terakhir FROM sync_log GROUP BY dataset, sumber, aksi, status ORDER BY terakhir DESC");
console.table(rows.map(r => ({ dataset: r.dataset, sumber: r.sumber, aksi: r.aksi, status: r.status, n: r.n, pertama: String(r.pertama), terakhir: String(r.terakhir) })));
await conn.end();
