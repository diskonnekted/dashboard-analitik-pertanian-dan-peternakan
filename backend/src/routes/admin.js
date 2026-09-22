/**
 * routes/admin.js — dasbor admin data (import/export/template Excel) + auth.
 *
 * POST /api/v1/admin/login        { user, pass } → { token, expiresAt }
 * GET  /api/v1/admin/domains      → daftar domain + sheet + kunci upsert
 * GET  /api/v1/admin/template/:domain → .xlsx template (PETUNJUK + DATA + CONTOH)
 * GET  /api/v1/admin/export/:domain   → .xlsx isi data MySQL (bisa diedit & re-import)
 * POST /api/v1/admin/import/:domain   → multipart "file" → laporan upsert per sheet
 *
 * Auth: Bearer token in-memory (masa berlaku 12 jam). Kredensial dari .env
 * (ADMIN_USER / ADMIN_PASS). Login dibatasi 5 kegagalan / 15 menit per IP.
 */
import express from "express";
import crypto from "node:crypto";
import multer from "multer";
import { listDomains } from "../lib/domains.js";
import { buildWorkbook, importWorkbook } from "../lib/excel.js";
import { q } from "../db.js";

async function logSync(dataset, sumber, baris, status, pesan) {
  try {
    await q("INSERT INTO sync_log (dataset, sumber, aksi, baris, status, pesan) VALUES (?, ?, 'import', ?, ?, ?)",
      [dataset, sumber, baris, status, pesan]);
  } catch { /* audit log tidak boleh menggagalkan import */ }
}

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "";
const TOKEN_TTL = 12 * 60 * 60 * 1000; // 12 jam

const tokens = new Map(); // token → { user, exp }
const fails = new Map(); // ip → { n, until }

const timingSafeEq = (a, b) => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

router.post("/login", async (req, res) => {
  const ip = req.ip ?? "unknown";
  const now = Date.now();
  const f = fails.get(ip);
  if (f && f.until > now) {
    return res.status(429).json({ error: `Terlalu banyak percobaan gagal. Coba lagi ${Math.ceil((f.until - now) / 60000)} menit lagi.` });
  }
  const { user, pass } = req.body ?? {};
  if (!ADMIN_PASS || !user || !pass || !timingSafeEq(user, ADMIN_USER) || !timingSafeEq(pass, ADMIN_PASS)) {
    const cur = { n: (f?.n ?? 0) + 1, until: 0 };
    if (cur.n >= 5) { cur.until = now + 15 * 60 * 1000; cur.n = 0; }
    fails.set(ip, cur);
    await new Promise((r) => setTimeout(r, 400)); // tarik pencerobohan
    return res.status(401).json({ error: "Username atau password salah." });
  }
  fails.delete(ip);
  const token = crypto.randomBytes(24).toString("hex");
  const exp = now + TOKEN_TTL;
  tokens.set(token, { user: ADMIN_USER, exp });
  res.json({ token, expiresAt: new Date(exp).toISOString() });
});

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  const t = m ? tokens.get(m[1]) : null;
  if (!t || t.exp < Date.now()) {
    if (m) tokens.delete(m[1]);
    return res.status(401).json({ error: "Token tidak valid atau kedaluwarsa — silakan login ulang." });
  }
  req.adminUser = t.user;
  next();
}

router.get("/domains", requireAdmin, async (_req, res) => {
  try {
    res.json(await listDomains());
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

/** GET /api/v1/admin/sync-log -> riwayat import/ETL (terbaru dulu).
 *  ?limit=N (default 50, jangkau 1-200). Untuk tab "Riwayat Import" dasbor admin. */
router.get("/sync-log", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const data = await q(
      `SELECT id, dataset, sumber, aksi, baris, status, pesan, created_at
       FROM sync_log ORDER BY id DESC LIMIT ${limit}`,
    );
    const [{ total }] = await q("SELECT COUNT(*) AS total FROM sync_log");
    res.json({ total, limit, data });
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

async function sendWorkbook(res, domain, mode) {
  const buffer = await buildWorkbook(domain, mode);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${mode === "template" ? "template" : "export"}-${domain}-${stamp}.xlsx`;
  res
    .set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    .set("Content-Disposition", `attachment; filename="${filename}"`)
    .set("Content-Length", buffer.length)
    .end(buffer);
}

router.get("/template/:domain", requireAdmin, async (req, res) => {
  try { await sendWorkbook(res, req.params.domain, "template"); }
  catch (e) { res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) }); }
});

router.get("/export/:domain", requireAdmin, async (req, res) => {
  try { await sendWorkbook(res, req.params.domain, "export"); }
  catch (e) { res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) }); }
});

router.post("/import/:domain", requireAdmin, upload.single("file"), async (req, res) => {
  const domain = req.params.domain;
  try {
    if (!req.file) return res.status(400).json({ error: "File tidak diterima — pilih file .xlsx (field \u201cfile\u201d)." });
    const report = await importWorkbook(domain, req.file.buffer);
    const total = report.inserted + report.updated;
    await logSync(`admin:${domain}`, req.file.originalname ?? "upload.xlsx", total, report.errors.length ? "partial" : "ok",
      `${report.inserted} tambah, ${report.updated} perbarui, ${report.errors.length} baris ditolak`);
    res.json(report);
  } catch (e) {
    res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
  }
});

export default router;
