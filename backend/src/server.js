// SISPERTANI backend — API di atas MySQL/MariaDB `sispertani`.
// Read: seluruh domain statistik + bantuan pemerintah. Write: dasbor admin
// (login token, import/export/template Excel) — routes/admin.js.
// Jalankan: npm start (membaca .env via --env-file) atau node --env-file=.env src/server.js
import path from "node:path";
import express from "express";
import { getPool } from "./db.js";
import { lahanRouter } from "./routes/lahan.js";
import { padiRouter, palawijaRouter } from "./routes/padi.js";
import { hortikulturaRouter } from "./routes/hortikultura.js";
import { perkebunanRouter } from "./routes/perkebunan.js";
import { peternakanRouter } from "./routes/peternakan.js";
import { perikananRouter } from "./routes/perikanan.js";
import { ekonomiRouter, lumbungRouter } from "./routes/ekonomi.js";
import { kelembagaanRouter } from "./routes/kelembagaan.js";
import { st2023Router } from "./routes/st2023.js";
import bantuanRouter from "./routes/bantuan.js";
import adminRouter from "./routes/admin.js";

const app = express();
app.disable("x-powered-by");

// CORS sederhana berbasis allowlist (tanpa dependensi tambahan).
const allowed = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowed.includes("*") || (origin && allowed.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// === Produksi (1 × Node.js Site CloudPanel) ==============================
// Semua endpoint API didaftarkan pada SATU Router yang di-mount dua kali:
// /api/* (path internal) dan /sispertani-api/* (prefix frontend). Mount ganda
// dipilih karena rewrite req.url di middleware tidak andal antar versi Express.
const api = express.Router();

// Proxy CKAN (GET /api/3/* & /sispertani-api/3/* → opendata.banjarnegarakab.go.id)
// supaya katalog online ikut hidup dari origin aplikasi sendiri. Matikan CKAN_PROXY=0.
const CKAN_ORIGIN = process.env.CKAN_ORIGIN || "https://opendata.banjarnegarakab.go.id";
const CKAN_PROXY = (process.env.CKAN_PROXY ?? "1") !== "0";
api.use("/3", async (req, res) => {
  if (!CKAN_PROXY) return res.status(501).json({ error: "ckan_proxy_disabled" });
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  try {
    const upstream = await fetch(CKAN_ORIGIN + req.originalUrl, {
      headers: { accept: req.headers.accept || "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    const body = await upstream.text();
    res.status(upstream.status);
    const ct = upstream.headers.get("content-type");
    if (ct) res.set("content-type", ct);
    res.set("cache-control", "public, max-age=300");
    res.send(body);
  } catch {
    res.status(502).json({ error: "ckan_unreachable" });
  }
});

// Health check — dipakai frontend untuk mendeteksi ketersediaan API.
api.get("/health", async (_req, res) => {
  try {
    const rows = await getPool().query("SELECT 1 AS ok");
    const ok = Array.isArray(rows) ? rows[0]?.[0]?.ok : rows?.ok;
    res.json({ ok: true, db: ok === 1 ? "up" : "down", time: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ ok: false, db: "down", message: String(e?.message || e) });
  }
});

app.use(express.json({ limit: "256kb" })); // body JSON login dasbor admin

api.get("/v1", (_req, res) => {
  res.json({
    name: "SISPERTANI API",
    version: 1,
    readonly: false,
    write: "admin-only (Bearer token — routes/admin.js)",
    endpoints: [
      "/api/v1/lahan/desa", "/api/v1/lahan/kabupaten",
      "/api/v1/padi/production", "/api/v1/padi/history", "/api/v1/padi/sawah-ladang",
      "/api/v1/palawija/jagung-ubi-kayu", "/api/v1/palawija/kacang-kedelai", "/api/v1/palawija/ubi-kacang-hijau",
      "/api/v1/hortikultura/sayuran-produksi", "/api/v1/hortikultura/sayuran-luas",
      "/api/v1/hortikultura/buah-produksi", "/api/v1/hortikultura/produksi-tahunan",
      "/api/v1/perkebunan/areal", "/api/v1/perkebunan/produksi",
      "/api/v1/peternakan/kecil", "/api/v1/peternakan/besar", "/api/v1/peternakan/unggas",
      "/api/v1/peternakan/pemasukan", "/api/v1/peternakan/pengeluaran",
      "/api/v1/peternakan/luar-rph", "/api/v1/peternakan/daging-unggas",
      "/api/v1/peternakan/susu-kulit",
      "/api/v1/perikanan/budidaya", "/api/v1/perikanan/tangkap", "/api/v1/perikanan/benih",
      "/api/v1/perikanan/nilai-budidaya", "/api/v1/perikanan/nilai-tangkap",
      "/api/v1/ekonomi/inflasi", "/api/v1/ekonomi/pasar", "/api/v1/lumbung",
      "/api/v1/kelembagaan/kelompok-tani", "/api/v1/kelembagaan/kth",
      "/api/v1/st2023/desa",
      "/api/v1/bantuan",
      "/api/v1/admin/login", "/api/v1/admin/domains", "/api/v1/admin/sync-log",
      "/api/v1/admin/template/:domain", "/api/v1/admin/export/:domain",
      "/api/v1/admin/import/:domain",
      "/api/v1/admin/paket", "/api/v1/admin/paket/:tipe/:file",
    ],
  });
});

api.use("/v1/lahan", lahanRouter);
api.use("/v1/padi", padiRouter);
api.use("/v1/palawija", palawijaRouter);
api.use("/v1/hortikultura", hortikulturaRouter);
api.use("/v1/perkebunan", perkebunanRouter);
api.use("/v1/peternakan", peternakanRouter);
api.use("/v1/perikanan", perikananRouter);
api.use("/v1/ekonomi", ekonomiRouter);
api.use("/v1/lumbung", lumbungRouter);
api.use("/v1/kelembagaan", kelembagaanRouter);
api.use("/v1/st2023", st2023Router);
api.use("/v1/bantuan", bantuanRouter);
api.use("/v1/admin", adminRouter);

// Catch-all 404 di dalam router — berlaku untuk kedua prefix (/api & /sispertani-api).
api.use((_req, res) => res.status(404).json({ error: "not_found" }));

// Mount ganda: /api (path internal) + /sispertani-api (prefix yang dipanggil frontend).
app.use("/api", api);
app.use("/sispertani-api", api);

// === Frontend: dist/ hasil build Vite dilayani dari sini ==================
// DIST_DIR relatif Application Root (default ./dist, sejajar package.json).
// Di dev (tanpa dist/) bagian ini tidak mengganggu — frontend tetap via Vite.
const DIST_DIR = process.env.DIST_DIR || "./dist";
const distRoot = path.isAbsolute(DIST_DIR) ? DIST_DIR : path.join(process.cwd(), DIST_DIR);
app.use(
  express.static(distRoot, {
    maxAge: "1h",
    setHeaders: (res, filePath) => {
      // index.html selalu divalidasi ulang agar deploy baru langsung terlihat
      if (filePath.endsWith(".html")) res.setHeader("cache-control", "no-cache");
    },
  })
);

// SPA fallback: route frontend (GET tanpa ekstensi) → index.html supaya
// refresh di URL dalam (mis. /desa/susukan/brengkok) tidak 404. Path API tak
// dikenal tetap 404 JSON; file statis yang hilang tetap 404.
app.use((req, res, next) => {
  if (
    req.method !== "GET" ||
    req.path.startsWith("/api") ||
    req.path.startsWith("/sispertani-api") ||
    path.extname(req.path)
  ) {
    return next();
  }
  res.sendFile(path.join(distRoot, "index.html"));
});

app.use((_req, res) => res.status(404).json({ error: "not_found" }));

const port = Number(process.env.PORT || 4100);
app.listen(port, () => {
  console.log(`[sispertani-api] API listening on http://127.0.0.1:${port} (statistik+bantuan read, admin write; dist=${DIST_DIR})`);
});
