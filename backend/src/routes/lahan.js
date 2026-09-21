// Lahan — /api/v1/lahan/*
// Replika bentuk return fetchLahanBanjarnegara & fetchLahanResmiKabupaten (api.ts).
import { Router } from "express";
import { q } from "../db.js";
import { route } from "../lib/helpers.js";

export const lahanRouter = Router();

/**
 * GET /api/v1/lahan/desa -> LahanDesa[]
 * Satu baris per desa — meniru isi lahan-fallback.json yang dipakai frontend:
 * baris dengan rincian sawah/bukan sawah diprioritaskan di atas entri parsial
 * (total saja) dari file koreksi manual; tie-break tahun terbaru.
 */
lahanRouter.get(
  "/desa",
  route(async () => {
    const rows = await q(
      `SELECT x.desa, x.kecamatan, x.sawah_ha, x.bukan_sawah_ha, x.total_ha, x.tahun
       FROM (
         SELECT l.desa, k.nama AS kecamatan, l.sawah_ha, l.bukan_sawah_ha, l.total_ha, l.tahun,
                ROW_NUMBER() OVER (
                  PARTITION BY l.kecamatan_id, l.desa_norm
                  ORDER BY (l.sawah_ha + l.bukan_sawah_ha) = 0, l.tahun DESC, l.id DESC
                ) AS rn
         FROM lahan_desa l
         JOIN kecamatan k ON k.id = l.kecamatan_id
       ) x
       WHERE x.rn = 1
       ORDER BY x.kecamatan, x.desa`,
    );
    return rows.map((r) => ({
      desa: r.desa,
      kecamatan: r.kecamatan,
      lahanSawah: Number(r.sawah_ha),
      lahanBukanSawah: Number(r.bukan_sawah_ha),
      jumlah: Number(r.total_ha),
      tahun: String(r.tahun),
    }));
  }),
);

/**
 * GET /api/v1/lahan/kabupaten -> LahanResmiKabupaten | null
 * Tahun terbaru dari tidy "Luas Penggunaan Lahan"; kategori I. Lahan sawah & II. Bukan lahan sawah.
 */
lahanRouter.get(
  "/kabupaten",
  route(async () => {
    const rows = await q(
      `SELECT kategori, luas_ha FROM lahan_penggunaan
       WHERE tahun = (SELECT MAX(tahun) FROM lahan_penggunaan)
         AND kategori IN ('I. Lahan sawah', 'II. Bukan lahan sawah')`,
    );
    if (!rows.length) return null;
    const sawah = rows.find((r) => r.kategori === "I. Lahan sawah");
    const bukan = rows.find((r) => r.kategori === "II. Bukan lahan sawah");
    const [{ maks }] = await q("SELECT MAX(tahun) AS maks FROM lahan_penggunaan");
    return {
      tahun: Number(maks),
      sawah: sawah ? Number(sawah.luas_ha) : 0,
      bukanSawah: bukan ? Number(bukan.luas_ha) : 0,
    };
  }),
);
