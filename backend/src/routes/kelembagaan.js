// Kelembagaan — /api/v1/kelembagaan/*
// Replika fetchKelompokTani (poktan Dinas 2022-2025 MERGE data KTH SIMLUH per desa)
// dan fetchKelompokTaniHutanSnapshot (snapshot KTH murni, tahun 2026).
import { Router } from "express";
import { q } from "../db.js";
import { route } from "../lib/helpers.js";

export const kelembagaanRouter = Router();

const num0 = (v) => (v === null || v === undefined ? 0 : Number(v));

/** Bentuk baris KTH + daftar kelompoknya (meniru kelompok-tani-hutan.json). */
async function kthByDesa() {
  const rows = await q(
    `SELECT h.id, h.desa, h.desa_norm, h.kecamatan_id, k.nama AS kecamatan, h.tahun,
            h.kth, h.kth_pemula, h.kth_madya, h.kth_utama
     FROM kelompok_tani_hutan h JOIN kecamatan k ON k.id = h.kecamatan_id
     ORDER BY k.nama, h.desa`,
  );
  const details = await q(
    `SELECT d.kelompok_tani_hutan_id, d.nama_kelompok, d.no_register, d.tanggal_berdiri,
            d.kelas, d.alamat, d.ketua
     FROM kth_detail d ORDER BY d.id`,
  );
  const lists = new Map();
  for (const d of details) {
    if (!lists.has(d.kelompok_tani_hutan_id)) lists.set(d.kelompok_tani_hutan_id, []);
    lists.get(d.kelompok_tani_hutan_id).push({
      namaKelompok: d.nama_kelompok,
      noRegister: d.no_register,
      tanggalBerdiri: d.tanggal_berdiri ? String(d.tanggal_berdiri) : d.tanggal_berdiri,
      kelas: d.kelas,
      alamat: d.alamat,
      ketua: d.ketua,
    });
  }
  const map = new Map();
  for (const h of rows) {
    map.set(`${h.desa_norm}|${h.kecamatan_id}`, {
      desa: h.desa,
      kecamatan: h.kecamatan,
      kelompokTaniHutan: Number(h.kth),
      kthPemula: Number(h.kth_pemula),
      kthMadya: Number(h.kth_madya),
      kthUtama: Number(h.kth_utama),
      kelompokTaniHutanList: lists.get(h.id) ?? [],
    });
  }
  return map;
}

/**
 * GET /api/v1/kelembagaan/kth -> KelompokTaniRow[]
 * Snapshot KTH SIMLUH (188 desa, tahun 2026) — bentuk meniru fetchKelompokTaniHutanSnapshot.
 */
kelembagaanRouter.get(
  "/kth",
  route(async () => {
    const map = await kthByDesa();
    return [...map.values()].map((h) => ({
      desa: h.desa,
      kecamatan: h.kecamatan,
      kelompokTani: 0,
      anggotaTani: 0,
      kelompokPerikanan: 0,
      anggotaPerikanan: 0,
      gapoktan: 0,
      anggotaGapoktan: 0,
      tahun: "2026",
      kelompokTaniHutan: h.kelompokTaniHutan,
      kthPemula: h.kthPemula,
      kthMadya: h.kthMadya,
      kthUtama: h.kthUtama,
      kelompokTaniHutanList: h.kelompokTaniHutanList,
    }));
  }),
);

/**
 * GET /api/v1/kelembagaan/kelompok-tani -> KelompokTaniRow[]
 * Poktan Dinas (2022-2025; baris dasar 2026 milik snapshot KTH, dikecualikan)
 * lalu data KTH di-merge per desa — meniru mergeKelompokTaniHutan di api.ts.
 */
kelembagaanRouter.get(
  "/kelompok-tani",
  route(async () => {
    const [rows, kth] = await Promise.all([
      q(
        `SELECT k.nama AS kecamatan, t.desa, t.desa_norm, t.kecamatan_id, t.tahun,
                t.kelompok_tani, t.anggota_tani, t.kelompok_perikanan, t.anggota_perikanan,
                t.gapoktan, t.anggota_gapoktan
         FROM kelompok_tani t JOIN kecamatan k ON k.id = t.kecamatan_id
         WHERE t.tahun <= 2025
         ORDER BY t.tahun, k.nama, t.desa`,
      ),
      kthByDesa(),
    ]);
    return rows.map((r) => {
      const h = kth.get(`${r.desa_norm}|${r.kecamatan_id}`);
      return {
        desa: r.desa,
        kecamatan: r.kecamatan,
        kelompokTani: num0(r.kelompok_tani),
        anggotaTani: num0(r.anggota_tani),
        kelompokPerikanan: num0(r.kelompok_perikanan),
        anggotaPerikanan: num0(r.anggota_perikanan),
        gapoktan: num0(r.gapoktan),
        anggotaGapoktan: num0(r.anggota_gapoktan),
        tahun: String(r.tahun),
        ...(h
          ? {
              kelompokTaniHutan: h.kelompokTaniHutan,
              kthPemula: h.kthPemula,
              kthMadya: h.kthMadya,
              kthUtama: h.kthUtama,
              kelompokTaniHutanList: h.kelompokTaniHutanList,
            }
          : {}),
      };
    });
  }),
);
