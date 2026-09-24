/**
 * routes/admin.js — dasbor admin data (import/export/template Excel) + auth.
 *
 * POST /api/v1/admin/login        { user, pass } → { token, expiresAt, user, role, label }
 * GET  /api/v1/admin/domains      → daftar domain + sheet + kunci upsert (difilter per peran)
 * GET  /api/v1/admin/template/:domain → .xlsx template (PETUNJUK + DATA + CONTOH)
 * GET  /api/v1/admin/export/:domain   → .xlsx isi data MySQL (bisa diedit & re-import)
 * POST /api/v1/admin/import/:domain   → multipart "file" → laporan upsert per sheet
 *
 * GET  /api/v1/admin/paket              -> indeks berkas paket template/export (Excel+CSV) [admin saja]
 * GET  /api/v1/admin/paket/:tipe/:file  -> unduh berkas paket (template/export, xlsx/csv) [admin saja]
 * Auth: Bearer token in-memory (masa berlaku 12 jam). Akun & peran (RBAC) di
 * lib/users.js, kata sandi dari .env (ADMIN_PASS, PASS_TANAMAN_PANGAN, dst).
 * Setiap bidang hanya berhak atas domain bidangnya; admin atas semua + sinkronisasi.
 * Login dibatasi 5 kegagalan / 15 menit per IP.
 */
import express from "express";
import crypto from "node:crypto";
import multer from "multer";
import { listDomains } from "../lib/domains.js";
import { USERS, roleAllowsDomain, roleLabel } from "../lib/users.js";
import { buildWorkbook, importWorkbook } from "../lib/excel.js";
import { q } from "../db.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function logSync(dataset, sumber, baris, status, pesan) {
  try {
    await q("INSERT INTO sync_log (dataset, sumber, aksi, baris, status, pesan) VALUES (?, ?, 'import', ?, ?, ?)",
      [dataset, sumber, baris, status, pesan]);
  } catch { /* audit log tidak boleh menggagalkan import */ }
}

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const TOKEN_TTL = 12 * 60 * 60 * 1000; // 12 jam

const tokens = new Map(); // token → { user, role, exp }
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
  // cocokkan nama pengguna & password terhadap daftar akun terdaftar (RBAC)
  const match = pass && USERS.find(
    (u) => timingSafeEq(user, u.user) && timingSafeEq(pass, process.env[u.passEnv] ?? ""),
  );
  if (!match) {
    const cur = { n: (f?.n ?? 0) + 1, until: 0 };
    if (cur.n >= 5) { cur.until = now + 15 * 60 * 1000; cur.n = 0; }
    fails.set(ip, cur);
    await new Promise((r) => setTimeout(r, 400)); // tarik pencerobohan
    return res.status(401).json({ error: "Username atau password salah." });
  }
  fails.delete(ip);
  const token = crypto.randomBytes(24).toString("hex");
  const exp = now + TOKEN_TTL;
  tokens.set(token, { user: match.user, role: match.role, exp });
  res.json({
    token,
    expiresAt: new Date(exp).toISOString(),
    user: match.user,
    role: match.role,
    label: roleLabel(match.role),
  });
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
  req.adminRole = t.role ?? "admin";
  next();
}

/** Guard: hanya administrator (melihat semua + sinkronisasi data). */
function requireAdminRole(req, res, next) {
  if (req.adminRole !== "admin") {
    return res.status(403).json({ error: "Akses terbatas untuk administrator." });
  }
  next();
}

/** Guard domain: peran harus berhak atas domain yang diminta. */
function requireDomainAccess(req, res, next) {
  if (!roleAllowsDomain(req.adminRole, req.params.domain)) {
    return res.status(403).json({ error: "Anda tidak berhak mengelola domain ini." });
  }
  next();
}

router.get("/domains", requireAdmin, async (req, res) => {
  try {
    const all = await listDomains();
    if (req.adminRole === "admin") return res.json(all);
    res.json(all.filter((d) => roleAllowsDomain(req.adminRole, d.domain)));
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

/** GET /api/v1/admin/sync-log -> riwayat import/ETL (terbaru dulu).
 *  ?limit=N (default 50, jangkau 1-200). Untuk tab "Riwayat Import" dasbor admin. */
router.get("/sync-log", requireAdmin, requireAdminRole, async (req, res) => {
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

router.get("/template/:domain", requireAdmin, requireDomainAccess, async (req, res) => {
  try { await sendWorkbook(res, req.params.domain, "template"); }
  catch (e) { res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) }); }
});

router.get("/export/:domain", requireAdmin, requireDomainAccess, async (req, res) => {
  try { await sendWorkbook(res, req.params.domain, "export"); }
  catch (e) { res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) }); }
});

router.post("/import/:domain", requireAdmin, requireDomainAccess, upload.single("file"), async (req, res) => {
  const domain = req.params.domain;
  try {
    if (!req.file) return res.status(400).json({ error: "File tidak diterima — pilih file .xlsx (field \u201cfile\u201d)." });
    const report = await importWorkbook(domain, req.file.buffer);
    const total = report.inserted + report.updated;
    await logSync(`${req.adminRole ?? "admin"}:${domain}`, req.file.originalname ?? "upload.xlsx", total, report.errors.length ? "partial" : "ok",
      `${report.inserted} tambah, ${report.updated} perbarui, ${report.errors.length} baris ditolak`);
    res.json(report);
  } catch (e) {
    res.status(e?.status ?? 500).json({ error: String(e?.message ?? e) });
  }
});

// ---------------------------------------------------------------------------
// Paket template & export statis (database/template-import-export) - hasil
// generator `npm run generate`: 16 domain xlsx + 37 tabel csv, template & snapshot.
// ---------------------------------------------------------------------------
const PAKET_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "database", "template-import-export");
const PAKET_TIPE = {
  "template-xlsx": "templates",
  "template-csv": "templates/csv",
  "export-xlsx": "exports",
  "export-csv": "exports/csv",
};

/** GET /paket -> indeks berkas per grup. Dibaca dari disk saat request, jadi
 *  selalu sinkron dengan hasil regenerate terbaru. `snapshot` = tanggal export
 *  terbaru (dari nama file export-*-YYYY-MM-DD.xlsx). */
router.get("/paket", requireAdmin, requireAdminRole, (_req, res) => {
  const groups = [];
  let snapshot = null;
  for (const [id, dir] of Object.entries(PAKET_TIPE)) {
    const abs = path.join(PAKET_ROOT, dir);
    let files = [];
    try {
      files = fs
        .readdirSync(abs)
        .filter((f) => /\.(xlsx|csv)$/i.test(f))
        .map((f) => ({ file: f, bytes: fs.statSync(path.join(abs, f)).size }))
        .sort((a, b) => a.file.localeCompare(b.file));
    } catch {
      /* folder belum ada -> grup kosong */
    }
    if (id === "export-xlsx") {
      for (const f of files) {
        const m = /-(\d{4}-\d{2}-\d{2})\.xlsx$/i.exec(f.file);
        if (m && (!snapshot || m[1] > snapshot)) snapshot = m[1];
      }
    }
    groups.push({ id, dir, files });
  }
  res.json({ snapshot, groups });
});

/** GET /paket/:tipe/:file -> unduh berkas. Tipe di-whitelist, nama berkas
 *  divalidasi regex + basename (anti path-traversal), path final harus berada
 *  di dalam PAKET_ROOT. */
router.get("/paket/:tipe/:file", requireAdmin, requireAdminRole, (req, res) => {
  const dir = PAKET_TIPE[req.params.tipe];
  const file = req.params.file;
  const namaAman = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(xlsx|csv)$/i.test(file) && path.basename(file) === file;
  if (!dir || !namaAman) return res.status(400).json({ error: "Permintaan tidak valid." });
  const abs = path.join(PAKET_ROOT, dir, file);
  let st = null;
  try { st = fs.statSync(abs); } catch { /* berkas tidak ada */ }
  if (!st || !st.isFile() || !abs.startsWith(PAKET_ROOT + path.sep)) {
    return res.status(404).json({ error: "Berkas tidak ditemukan." });
  }
  res
    .set("Content-Type", /\.xlsx$/i.test(file)
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "text/csv; charset=utf-8")
    .set("Content-Disposition", `attachment; filename="${file}"`)
    .set("Content-Length", st.size);
  fs.createReadStream(abs).pipe(res);
});

export default router;
