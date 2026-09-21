// Ekonomi — /api/v1/ekonomi/*  & Lumbung — /api/v1/lumbung
// Replika fetchInflationData, fetchMarketData, fetchLumbungPangan.
import { Router } from "express";
import { q } from "../db.js";
import { route } from "../lib/helpers.js";

export const ekonomiRouter = Router();
export const lumbungRouter = Router();

const num0 = (v) => (v === null || v === undefined ? 0 : Number(v));

/** GET /api/v1/ekonomi/inflasi -> InflationData[] */
ekonomiRouter.get(
  "/inflasi",
  route(async () => {
    const rows = await q("SELECT wilayah, inflasi_pct, tahun FROM inflasi ORDER BY wilayah, tahun");
    return rows.map((r) => ({
      pembanding: r.wilayah,
      inflasi: num0(r.inflasi_pct),
      tahun: String(r.tahun),
    }));
  }),
);

/** GET /api/v1/ekonomi/pasar -> MarketData[] */
ekonomiRouter.get(
  "/pasar",
  route(async () => {
    const rows = await q("SELECT jenis, jumlah, tahun FROM pasar ORDER BY jenis, tahun");
    return rows.map((r) => ({
      jenis: r.jenis,
      jumlah: Number(r.jumlah),
      tahun: String(r.tahun),
    }));
  }),
);

/** GET /api/v1/lumbung -> LumbungPangan[] (data tahun TERBARU per kecamatan) */
lumbungRouter.get(
  "/",
  route(async () => {
    const rows = await q(
      `SELECT x.kecamatan, x.tahun, x.lumbung_unit, x.lumbung_kapasitas_ton, x.gudang_luas_m2, x.gudang_kapasitas_ton_bulan
       FROM (
         SELECT k.nama AS kecamatan, l.tahun, l.lumbung_unit, l.lumbung_kapasitas_ton,
                l.gudang_luas_m2, l.gudang_kapasitas_ton_bulan,
                ROW_NUMBER() OVER (PARTITION BY l.kecamatan_id ORDER BY l.tahun DESC, l.id DESC) AS rn
         FROM lumbung_pangan l JOIN kecamatan k ON k.id = l.kecamatan_id
       ) x
       WHERE x.rn = 1
       ORDER BY x.kecamatan`,
    );
    return rows.map((r) => ({
      kecamatan: r.kecamatan,
      lumbungPangan: Number(r.lumbung_unit),
      kapasitasLumbung: num0(r.lumbung_kapasitas_ton),
      luasGudang: num0(r.gudang_luas_m2),
      kapasitasGudang: num0(r.gudang_kapasitas_ton_bulan),
      tahun: Number(r.tahun),
    }));
  }),
);
