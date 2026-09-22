// Test terintegrasi P1-1 (/peternakan/susu-kulit) & P1-2 (/admin/sync-log) pada instance uji PORT 4101.
// Kredensial dibaca internal dari backend/.env; token/password TIDAK dicetak.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import mysql from "file:///I:/pertanian/pertanian-2/backend/node_modules/mysql2/promise.js";

const env = {};
for (const line of readFileSync("I:/pertanian/pertanian-2/backend/.env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const child = spawn(process.execPath, ["--env-file=.env", "src/server.js"], {
  cwd: "I:/pertanian/pertanian-2/backend",
  env: { ...process.env, PORT: "4101" },
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
child.stdout.on("data", (d) => (log += d));
child.stderr.on("data", (d) => (log += d));

const BASE = "http://127.0.0.1:4101";
const assert = (cond, msg) => { if (!cond) throw new Error("ASSERT GAGAL: " + msg); console.log("  OK " + msg); };

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${BASE}/api/health`); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("server 4101 tidak siap:\n" + log);
}

const conn = await mysql.createConnection({
  host: env.DB_HOST || "127.0.0.1", port: Number(env.DB_PORT || 3306),
  user: env.DB_USER || "root", password: env.DB_PASS || "", database: env.DB_NAME || "sispertani",
});

try {
  await waitReady();
  console.log("== instance uji :4101 siap ==");

  // 1. index endpoints memuat rute baru
  const idx = await (await fetch(`${BASE}/api/v1`)).json();
  assert(idx.endpoints.includes("/api/v1/peternakan/susu-kulit"), "index memuat /api/v1/peternakan/susu-kulit");
  assert(idx.endpoints.includes("/api/v1/admin/sync-log"), "index memuat /api/v1/admin/sync-log");
  console.log(`  total endpoints diiklankan: ${idx.endpoints.length}`);

  // 2. P1-1 susu-kulit: bentuk + jumlah baris
  const sk = await (await fetch(`${BASE}/api/v1/peternakan/susu-kulit`)).json();
  assert(Array.isArray(sk) && sk.length === 120, `susu-kulit 200: ${sk.length} baris (ekspektasi 120 = 20 kec x 6 tahun)`);
  const first = sk[0];
  console.log(`  sampel[0]: ${first.kecamatan} ${first.tahun} unit="${first.unit}"`);
  console.log(`  items: ${JSON.stringify(first.items)}`);
  assert(first.items.length === 2 && first.items[0].jenis === "Sapi/Kerbau" && first.items[1].jenis === "Kambing/Domba", "items = [Sapi/Kerbau, Kambing/Domba]");
  const kecSet = new Set(sk.map((r) => r.kecamatan));
  const thSet = new Set(sk.map((r) => r.tahun));
  assert(kecSet.size === 20, `20 kecamatan terwakili (${kecSet.size})`);
  console.log(`  tahun: ${[...thSet].sort().join(", ")}`);
  // cross-check sampel pertama vs DB
  const [dbRows] = await conn.query(
    "SELECT t.jenis, t.nilai FROM ternak_susu_kulit t JOIN kecamatan k ON k.id = t.kecamatan_id WHERE k.nama = ? AND t.tahun = ?",
    [first.kecamatan, Number(first.tahun)],
  );
  const byJenis = Object.fromEntries(dbRows.map((r) => [r.jenis, Number(r.nilai)]));
  assert(first.items.every((it) => it.jumlah === byJenis[it.jenis]), `nilai sampel ${first.kecamatan} ${first.tahun} cocok DB`);
  // cross-check total seluruh nilai vs DB
  const sumApi = sk.reduce((a, r) => a + r.items.reduce((b, it) => b + it.jumlah, 0), 0);
  const [[{ s }]] = await conn.query("SELECT SUM(nilai) AS s FROM ternak_susu_kulit");
  assert(sumApi === Number(s), `Sigma nilai endpoint (${sumApi}) == SUM(nilai) DB (${Number(s)})`);

  // 3. P1-2 sync-log tanpa token -> 401
  const noAuth = await fetch(`${BASE}/api/v1/admin/sync-log`);
  assert(noAuth.status === 401, `sync-log tanpa token -> 401 (${noAuth.status})`);

  // 4. login (kredensial .env; token tidak dicetak)
  const login = await fetch(`${BASE}/api/v1/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ user: env.ADMIN_USER, pass: env.ADMIN_PASS }),
  });
  assert(login.status === 200, "login admin 200 (kredensial dari backend/.env)");
  const { token } = await login.json();
  console.log(`  token diterima (panjang ${token.length} char - nilai tidak dicetak)`);
  const auth = { authorization: `Bearer ${token}` };

  // 5. sync-log dengan token
  const r5 = await fetch(`${BASE}/api/v1/admin/sync-log`, { headers: auth });
  assert(r5.status === 200, "sync-log dengan token -> 200");
  const j5 = await r5.json();
  const [[{ totalDB }]] = await conn.query("SELECT COUNT(*) AS totalDB FROM sync_log");
  assert(j5.total === totalDB, `total=${j5.total} == COUNT DB (${totalDB})`);
  assert(Array.isArray(j5.data) && j5.data.length <= 50, `data <= limit default 50 (dapat ${j5.data.length})`);
  console.log(`  terbaru: id=${j5.data[0].id} dataset=${j5.data[0].dataset} aksi=${j5.data[0].aksi} status=${j5.data[0].status} created_at=${j5.data[0].created_at}`);
  assert(j5.data[0].id > j5.data[j5.data.length - 1].id, "urutan terbaru-dulu (id DESC)");

  // 6. limit param
  const r6 = await fetch(`${BASE}/api/v1/admin/sync-log?limit=5`, { headers: auth });
  const j6 = await r6.json();
  assert(r6.status === 200 && j6.data.length === 5 && j6.limit === 5, "?limit=5 -> 5 baris + field limit");

  // 7. clamp limit
  const r7 = await fetch(`${BASE}/api/v1/admin/sync-log?limit=999`, { headers: auth });
  const j7 = await r7.json();
  assert(r7.status === 200 && j7.limit === 200, "limit=999 di-clamp ke 200");

  console.log("\nSEMUA TEST P1-1 & P1-2 LULUS");
} finally {
  child.kill();
  await conn.end().catch(() => {});
  await new Promise((r) => setTimeout(r, 400));
  process.exit(0);
}
