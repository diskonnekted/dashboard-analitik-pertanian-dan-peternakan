// Skrip audit sementara: hitung baris per tabel MariaDB (kredensial dibaca internal dari backend/.env, TIDAK dicetak).
import { readFileSync } from "node:fs";
import mysql from "file:///I:/pertanian/pertanian-2/backend/node_modules/mysql2/promise.js";

const env = {};
for (const line of readFileSync("I:/pertanian/pertanian-2/backend/.env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !m[1].startsWith("#")) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = env.DB_NAME || "sispertani";
const conn = await mysql.createConnection({
  host: env.DB_HOST || "127.0.0.1",
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER || "root",
  password: env.DB_PASS || "",
  database: db,
});
const [[{ v }]] = await conn.query("SELECT VERSION() AS v");
console.log(`VERSION\t${v}`);
const [tables] = await conn.query(
  "SELECT table_name AS tn FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name",
  [db],
);
for (const t of tables) {
  const [[{ c }]] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t.tn}\``);
  console.log(`${t.tn}\t${c}`);
}
await conn.end();
