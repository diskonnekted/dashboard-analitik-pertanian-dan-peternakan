// ST2023 — /api/v1/st2023/*
// Replika fetchSt2023DesaExtra (data desa Sensus Pertanian 2023, termasuk ternak JSON).
import { Router } from "express";
import { q } from "../db.js";
import { route } from "../lib/helpers.js";

export const st2023Router = Router();

const num0 = (v) => (v === null || v === undefined ? 0 : Number(v));

// Kolom JSON (st2023_desa.ternak) bentuknya tergantung server:
// - MariaDB 10.x (lokal XAMPP)  -> string JSON, harus di-parse manual
// - MariaDB 11.x (CloudPanel)   -> mysql2 SUDAH mengembalikan object ter-parse,
//   sehingga JSON.parse(object) throws dan ternak selalu jatuh ke {} (bug
//   "Populasi Ternak belum tersedia" di produksi 22 Sep 2026)
// - bentuk lain yang mungkin    -> Buffer
const parseJsonField = (v) => {
  if (!v) return {};
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return {}; }
  }
  if (Buffer.isBuffer(v)) {
    try { return JSON.parse(v.toString("utf8")); } catch { return {}; }
  }
  if (typeof v === "object") return Array.isArray(v) ? {} : v;
  return {};
};

/** GET /api/v1/st2023/desa -> St2023DesaExtra[] */
st2023Router.get(
  "/desa",
  route(async () => {
    const rows = await q(
      `SELECT t.desa, k.nama AS kecamatan,
              t.rumah_tangga_petani, t.petani, t.rt_anggota_kelompok, t.rt_bukan_anggota_kelompok,
              t.rtup, t.rt_perikanan, t.rt_perikanan_budidaya, t.rt_perikanan_tangkap,
              t.ternak, t.sumber_teks
       FROM st2023_desa t JOIN kecamatan k ON k.id = t.kecamatan_id
       ORDER BY k.nama, t.desa`,
    );
    return rows.map((r) => {
      const ternak = parseJsonField(r.ternak);
      return {
        desa: r.desa,
        kecamatan: r.kecamatan,
        rumahTanggaPetani: num0(r.rumah_tangga_petani),
        petani: num0(r.petani),
        rtAnggotaKelompok: num0(r.rt_anggota_kelompok),
        rtBukanAnggotaKelompok: num0(r.rt_bukan_anggota_kelompok),
        rtup: num0(r.rtup),
        rtPerikanan: num0(r.rt_perikanan),
        rtPerikananBudidaya: num0(r.rt_perikanan_budidaya),
        rtPerikananTangkap: num0(r.rt_perikanan_tangkap),
        ternak,
        sumber: r.sumber_teks,
      };
    });
  }),
);
