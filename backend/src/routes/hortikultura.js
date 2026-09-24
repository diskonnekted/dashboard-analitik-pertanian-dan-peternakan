// Hortikultura — /api/v1/hortikultura/*
// Replika fetchVegetableProduction, fetchVegetableArea, fetchFruitProduction,
// fetchAnnualHorticultureProduction (termasuk titik 2025 hardcoded BPS).
import { Router } from "express";
import { q } from "../db.js";
import { route, pivotLong } from "../lib/helpers.js";

export const hortikulturaRouter = Router();

const SAYURAN_FIELDS = [
  ["Bawang Merah", "bawangMerah"],
  ["Cabai Besar", "cabaiBesar"],
  ["Kentang", "kentang"],
  ["Kubis", "kubis"],
  ["Petsai", "petsai"],
  ["Tomat", "tomat"],
  ["Bawang Putih", "bawangPutih"],
  ["Cabai Rawit", "cabaiRawit"],
];
const SAYURAN_MAP = new Map(SAYURAN_FIELDS);

const BUAH_FIELDS = [
  ["Mangga", "mangga"],
  ["Durian", "durian"],
  ["Jeruk Besar", "jerukBesar"],
  ["Pisang", "pisang"],
  ["Pepaya", "pepaya"],
  ["Salak", "salak"],
  ["Jeruk Siam", "jerukSiam"],
];
const BUAH_MAP = new Map(BUAH_FIELDS);

const num0 = (v) => (v === null || v === undefined ? 0 : Number(v));

/** GET /api/v1/hortikultura/sayuran-produksi -> VegetableProduction[] (ton) */
hortikulturaRouter.get(
  "/sayuran-produksi",
  route(async () => {
    const rows = await q(
      `SELECT k.nama AS kecamatan, t.tahun, t.komoditas, t.nilai
       FROM horti_produksi t JOIN kecamatan k ON k.id = t.kecamatan_id
       WHERE t.kelompok = 'sayuran' ORDER BY k.nama, t.tahun`,
    );
    return pivotLong(rows, (r) => {
      const f = SAYURAN_MAP.get(r.komoditas);
      return f ? [f, num0(r.nilai)] : null;
    });
  }),
);

/** GET /api/v1/hortikultura/sayuran-luas -> VegetableArea[] (ha) */
hortikulturaRouter.get(
  "/sayuran-luas",
  route(async () => {
    const rows = await q(
      `SELECT k.nama AS kecamatan, t.tahun, t.komoditas, t.nilai
       FROM horti_luas t JOIN kecamatan k ON k.id = t.kecamatan_id
       WHERE t.kelompok = 'sayuran' ORDER BY k.nama, t.tahun`,
    );
    return pivotLong(rows, (r) => {
      const f = SAYURAN_MAP.get(r.komoditas);
      return f ? [f, num0(r.nilai)] : null;
    });
  }),
);

/** GET /api/v1/hortikultura/buah-produksi -> FruitProduction[] (ton) */
hortikulturaRouter.get(
  "/buah-produksi",
  route(async () => {
    const rows = await q(
      `SELECT k.nama AS kecamatan, t.tahun, t.komoditas, t.nilai
       FROM horti_produksi t JOIN kecamatan k ON k.id = t.kecamatan_id
       WHERE t.kelompok = 'buah_tahunan' ORDER BY k.nama, t.tahun`,
    );
    return pivotLong(rows, (r) => {
      const f = BUAH_MAP.get(r.komoditas);
      return f ? [f, num0(r.nilai)] : null;
    });
  }),
);

/**
 * GET /api/v1/hortikultura/produksi-tahunan -> AnnualHorticultureProduction[]
 * Buah-buayan & sayuran tahunan kabupaten (long format per jenis tanaman)
 * + titik 2025 dari tabel tetap BPS (hardcoded, sama seperti api.ts).
 */
const bpsAnnualHorticulture2025 = [
  { jenisTanaman: "Alpukat", produksiTon: 2126.043, tahun: "2025" },
  { jenisTanaman: "Belimbing", produksiTon: 33.792, tahun: "2025" },
  { jenisTanaman: "Duku/Langsat/Kokosan", produksiTon: 1329.105, tahun: "2025" },
  { jenisTanaman: "Durian", produksiTon: 12809.925, tahun: "2025" },
  { jenisTanaman: "Jambu Air", produksiTon: 285.218, tahun: "2025" },
  { jenisTanaman: "Jambu Biji", produksiTon: 2813.476, tahun: "2025" },
  { jenisTanaman: "Jengkol", produksiTon: 556.41, tahun: "2025" },
  { jenisTanaman: "Jeruk Siam/Keprok", produksiTon: 40.2, tahun: "2025" },
  { jenisTanaman: "Mangga", produksiTon: 589.75, tahun: "2025" },
  { jenisTanaman: "Manggis", produksiTon: 326.193, tahun: "2025" },
  { jenisTanaman: "Melinjo", produksiTon: 883.675, tahun: "2025" },
  { jenisTanaman: "Nangka/Cempedak", produksiTon: 2350.192, tahun: "2025" },
  { jenisTanaman: "Nenas", produksiTon: 81.124, tahun: "2025" },
  { jenisTanaman: "Pepaya", produksiTon: 3509.496, tahun: "2025" },
  { jenisTanaman: "Petai", produksiTon: 3279.633, tahun: "2025" },
  { jenisTanaman: "Pisang", produksiTon: 18090.363, tahun: "2025" },
  { jenisTanaman: "Rambutan", produksiTon: 1800.123, tahun: "2025" },
  { jenisTanaman: "Salak", produksiTon: 127950.403, tahun: "2025" },
  { jenisTanaman: "Sawo", produksiTon: 9.732, tahun: "2025" },
  { jenisTanaman: "Sirsak", produksiTon: 248.525, tahun: "2025" },
  { jenisTanaman: "Sukun", produksiTon: 10.795, tahun: "2025" },
  { jenisTanaman: "Buah Naga", produksiTon: 62.72, tahun: "2025" },
  { jenisTanaman: "Jeruk Lemon", produksiTon: 870.173, tahun: "2025" },
  { jenisTanaman: "Lengkeng", produksiTon: 16.875, tahun: "2025" },
];

hortikulturaRouter.get(
  "/produksi-tahunan",
  route(async () => {
    const rows = await q(
      `SELECT t.komoditas, t.nilai, t.tahun
       FROM horti_produksi_kabupaten t
       WHERE t.kelompok = 'buah_sayuran_tahunan'
       ORDER BY t.tahun, t.komoditas`,
    );
    const dbRows = rows.map((r) => ({
      jenisTanaman: r.komoditas,
      produksiTon: num0(r.nilai),
      tahun: String(r.tahun),
    }));
    return [...dbRows, ...bpsAnnualHorticulture2025];
  }),
);

/**
 * Gabung luas (m2) + produksi (tangkai) tingkat kabupaten untuk suatu kelompok
 * (tanaman_hias / biofarmaka) menjadi deret long per jenis tanaman × tahun.
 * Bentuk hasil: [{ jenisTanaman, tahun, luas, produksi }]
 */
async function kelompokLuasProduksi(kelompok) {
  const luasRows = await q(
    `SELECT t.komoditas, t.tahun, t.nilai
     FROM horti_luas_kabupaten t WHERE t.kelompok = '${kelompok}'`,
  );
  const prodRows = await q(
    `SELECT t.komoditas, t.tahun, t.nilai
     FROM horti_produksi_kabupaten t WHERE t.kelompok = '${kelompok}'`,
  );
  const luas = new Map(luasRows.map((r) => [`${r.komoditas}|${r.tahun}`, num0(r.nilai)]));
  const prod = new Map(prodRows.map((r) => [`${r.komoditas}|${r.tahun}`, num0(r.nilai)]));
  const keys = new Set([...luas.keys(), ...prod.keys()]);
  return [...keys]
    .map((k) => {
      const [jenisTanaman, tahun] = k.split("|");
      return {
        jenisTanaman,
        tahun: String(tahun),
        luas: luas.get(k) ?? 0,
        produksi: prod.get(k) ?? 0,
      };
    })
    .sort(
      (a, b) =>
        a.jenisTanaman.localeCompare(b.jenisTanaman, "id") ||
        a.tahun.localeCompare(b.tahun, "id"),
    );
}

/** GET /api/v1/hortikultura/tanaman-hias -> [{ jenisTanaman, tahun, luas, produksi }] */
hortikulturaRouter.get(
  "/tanaman-hias",
  route(async () => kelompokLuasProduksi("tanaman_hias")),
);

/** GET /api/v1/hortikultura/biofarmaka -> [{ jenisTanaman, tahun, luas, produksi }] */
hortikulturaRouter.get(
  "/biofarmaka",
  route(async () => kelompokLuasProduksi("biofarmaka")),
);

/** GET /api/v1/hortikultura/sayuran-buah-semusim -> [{ jenisTanaman, tahun, luas, produksi }] */
hortikulturaRouter.get(
  "/sayuran-buah-semusim",
  route(async () => kelompokLuasProduksi("sayuran_buah_semusim")),
);
