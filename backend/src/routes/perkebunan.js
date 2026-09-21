// Perkebunan — /api/v1/perkebunan/*
// Replika fetchPlantationArea & fetchPlantationProduction.
// Catatan: blok agregat kabupaten CSV (baris JENIS) tersimpan di tabel terpisah
// perkebunan_produksi_kabupaten dan TIDAK dilayani endpoint ini — sama seperti
// frontend yang memfilter AGG_ROWS. Kopi Arabica hanya ada di data areal.
import { Router } from "express";
import { q } from "../db.js";
import { route, pivotLong } from "../lib/helpers.js";

export const perkebunanRouter = Router();

const TANAMAN_FIELDS = [
  ["Kelapa Sawit", "kelapaSawit"],
  ["Kelapa Dalam", "kelapaDalam"],
  ["Karet", "karet"],
  ["Kopi Robusta", "kopiRobusta"],
  ["Kakao", "kakao"],
  ["Tebu", "tebu"],
  ["Teh", "teh"],
  ["Tembakau", "tembakau"],
  ["Kopi Arabica", "kopiArabica"],
];
const TANAMAN_MAP = new Map(TANAMAN_FIELDS);

const num0 = (v) => (v === null || v === undefined ? 0 : Number(v));

/** GET /api/v1/perkebunan/areal -> PlantationArea[] (ha) */
perkebunanRouter.get(
  "/areal",
  route(async () => {
    const rows = await q(
      `SELECT k.nama AS kecamatan, t.tahun, t.tanaman, t.luas_ha AS nilai
       FROM perkebunan_areal t JOIN kecamatan k ON k.id = t.kecamatan_id
       ORDER BY k.nama, t.tahun`,
    );
    return pivotLong(rows, (r) => {
      const f = TANAMAN_MAP.get(r.tanaman);
      return f ? [f, num0(r.nilai)] : null;
    });
  }),
);

/** GET /api/v1/perkebunan/produksi -> PlantationProduction[] (ton) — tanpa kopiArabica */
perkebunanRouter.get(
  "/produksi",
  route(async () => {
    const rows = await q(
      `SELECT k.nama AS kecamatan, t.tahun, t.tanaman, t.produksi_ton AS nilai
       FROM perkebunan_produksi t JOIN kecamatan k ON k.id = t.kecamatan_id
       ORDER BY k.nama, t.tahun`,
    );
    return pivotLong(rows, (r) => {
      const f = TANAMAN_MAP.get(r.tanaman);
      return f && f !== "kopiArabica" ? [f, num0(r.nilai)] : null;
    });
  }),
);
