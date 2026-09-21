// SISPERTANI backend — API di atas MySQL/MariaDB `sispertani`.
// Read: seluruh domain statistik + bantuan pemerintah. Write: dasbor admin
// (login token, import/export/template Excel) — routes/admin.js.
// Jalankan: npm start (membaca .env via --env-file) atau node --env-file=.env src/server.js
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

// Health check — dipakai frontend untuk mendeteksi ketersediaan API.
app.get("/api/health", async (_req, res) => {
  try {
    const rows = await getPool().query("SELECT 1 AS ok");
    const ok = Array.isArray(rows) ? rows[0]?.[0]?.ok : rows?.ok;
    res.json({ ok: true, db: ok === 1 ? "up" : "down", time: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ ok: false, db: "down", message: String(e?.message || e) });
  }
});

app.use(express.json({ limit: "256kb" })); // body JSON login dasbor admin

app.get("/api/v1", (_req, res) => {
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
      "/api/v1/perikanan/budidaya", "/api/v1/perikanan/tangkap", "/api/v1/perikanan/benih",
      "/api/v1/perikanan/nilai-budidaya", "/api/v1/perikanan/nilai-tangkap",
      "/api/v1/ekonomi/inflasi", "/api/v1/ekonomi/pasar", "/api/v1/lumbung",
      "/api/v1/kelembagaan/kelompok-tani", "/api/v1/kelembagaan/kth",
      "/api/v1/st2023/desa",
      "/api/v1/bantuan",
      "/api/v1/admin/login", "/api/v1/admin/domains",
      "/api/v1/admin/template/:domain", "/api/v1/admin/export/:domain",
      "/api/v1/admin/import/:domain",
    ],
  });
});

app.use("/api/v1/lahan", lahanRouter);
app.use("/api/v1/padi", padiRouter);
app.use("/api/v1/palawija", palawijaRouter);
app.use("/api/v1/hortikultura", hortikulturaRouter);
app.use("/api/v1/perkebunan", perkebunanRouter);
app.use("/api/v1/peternakan", peternakanRouter);
app.use("/api/v1/perikanan", perikananRouter);
app.use("/api/v1/ekonomi", ekonomiRouter);
app.use("/api/v1/lumbung", lumbungRouter);
app.use("/api/v1/kelembagaan", kelembagaanRouter);
app.use("/api/v1/st2023", st2023Router);
app.use("/api/v1/bantuan", bantuanRouter);
app.use("/api/v1/admin", adminRouter);

app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));
app.use((_req, res) => res.status(404).json({ error: "not_found" }));

const port = Number(process.env.PORT || 4100);
app.listen(port, () => {
  console.log(`[sispertani-api] API listening on http://127.0.0.1:${port} (statistik+bantuan read, admin write)`);
});
