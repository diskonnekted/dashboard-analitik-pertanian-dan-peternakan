// Padi & palawija — /api/v1/padi/* dan /api/v1/palawija/*
// Replika bentuk return fetchPadiProduction, fetchPadiHistory,
// fetchPadiSawahLadang, fetchJagungUbiKayu, fetchKacangKedelai, fetchUbiKacangHijau.
import { Router } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { q } from "../db.js";
import { route } from "../lib/helpers.js";

export const padiRouter = Router();
export const palawijaRouter = Router();

/** Baris gabungan per (kecamatan, tahun): sawah+ladang dijumlah, rata = rata sawah. */
async function padiPerKecTahun() {
  const rows = await q(
    `SELECT k.nama AS kecamatan, t.tahun,
            SUM(t.luas_panen_ha) AS luas,
            SUM(t.produksi_ton) AS produksi,
            MAX(CASE WHEN t.jenis = 'sawah' THEN t.rata_ku_ha END) AS rata_sawah,
            MAX(CASE WHEN t.jenis = 'ladang' THEN t.rata_ku_ha END) AS rata_ladang,
            MAX(CASE WHEN t.jenis = 'sawah' THEN t.luas_panen_ha END) AS luas_sawah,
            MAX(CASE WHEN t.jenis = 'sawah' THEN t.produksi_ton END) AS produksi_sawah,
            MAX(CASE WHEN t.jenis = 'ladang' THEN t.luas_panen_ha END) AS luas_ladang,
            MAX(CASE WHEN t.jenis = 'ladang' THEN t.produksi_ton END) AS produksi_ladang
     FROM padi_produksi t
     JOIN kecamatan k ON k.id = t.kecamatan_id
     GROUP BY k.id, t.tahun
     ORDER BY k.nama, t.tahun`,
  );
  return rows.map((r) => ({
    kecamatan: r.kecamatan,
    tahun: Number(r.tahun),
    luas: Number(r.luas) || 0,
    produksi: Number(r.produksi) || 0,
    rataSawah: r.rata_sawah === null ? 0 : Number(r.rata_sawah),
    rataLadang: r.rata_ladang === null ? 0 : Number(r.rata_ladang),
    luasSawah: r.luas_sawah === null ? 0 : Number(r.luas_sawah),
    produksiSawah: r.produksi_sawah === null ? 0 : Number(r.produksi_sawah),
    luasLadang: r.luas_ladang === null ? 0 : Number(r.luas_ladang),
    produksiLadang: r.produksi_ladang === null ? 0 : Number(r.produksi_ladang),
  }));
}

/**
 * GET /api/v1/padi/production -> PadiProduction[]
 * Data tahun TERBARU per kecamatan; luas & produksi = sawah + ladang; rata-rata = rata sawah.
 */
padiRouter.get(
  "/production",
  route(async () => {
    const rows = await padiPerKecTahun();
    const perKec = new Map();
    for (const r of rows) {
      const ex = perKec.get(r.kecamatan);
      if (!ex || r.tahun > ex.tahun) perKec.set(r.kecamatan, r);
    }
    return [...perKec.values()].map((r) => ({
      kecamatan: r.kecamatan,
      luasPanen: r.luas,
      produksi: r.produksi,
      rataRata: r.rataSawah,
      tahun: String(r.tahun),
    }));
  }),
);

/**
 * GET /api/v1/padi/history -> PadiHistoryPoint[]
 * Agregat kabupaten per tahun (prune tahun dengan <10 pelapor) + titik 2025
 * dari snapshot CKAN padi-2025.csv (file sengaja tidak diimpor ke DB — dibaca dari disk).
 * Logika meniru fetchPadiHistory di api.ts persis.
 */
padiRouter.get(
  "/history",
  route(async () => {
    const agg = new Map(); // tahun -> {luas, produksi, areaWeighted, reporters}
    const add = (tahun, luas, produksi, rata) => {
      const cur = agg.get(tahun) || { luas: 0, produksi: 0, areaWeighted: 0, reporters: 0 };
      cur.luas += luas;
      cur.produksi += produksi;
      cur.areaWeighted += rata * luas;
      if (luas > 0) cur.reporters += 1;
      agg.set(tahun, cur);
    };

    // 1. Historis 2018-2024 dari DB — luas = sawah+ladang, rata = rata SAWAH (mencerminkan kolom CSV).
    for (const r of await padiPerKecTahun()) {
      add(r.tahun, r.luas, r.produksi, r.rataSawah);
    }

    // 2. Titik 2025 dari snapshot (deteksi kolom header; fallback posisi tetap).
    try {
      const snapPath = path.join(process.env.PUBLIC_DIR || "../public", "data", "snapshots", "padi-2025.csv");
      const text = await readFile(snapPath, "utf8");
      const table = parseCsvSimple(text);
      let nameIdx = -1, luasIdx = -1, prodIdx = -1, rataIdx = -1, dataStart = 0;
      for (let i = 0; i < Math.min(table.length, 10); i++) {
        for (let c = 0; c < table[i].length; c++) {
          const cell = (table[i][c] || "").trim().toLowerCase();
          if (cell === "kecamatan" && nameIdx === -1) nameIdx = c;
          if (/^luas/.test(cell) && luasIdx === -1) luasIdx = c;
          if (/^produksi/.test(cell) && prodIdx === -1) prodIdx = c;
          if (/rata/.test(cell) && rataIdx === -1) rataIdx = c;
        }
        if (nameIdx >= 0 && luasIdx >= 0 && prodIdx >= 0) {
          dataStart = i + 1;
          break;
        }
      }
      if (nameIdx === -1) {
        nameIdx = 0; luasIdx = 1; prodIdx = 2; rataIdx = 3; dataStart = 4;
      }
      const cleanNum = (v) => (!v ? 0 : parseFloat(String(v).replace(/,/g, "")) || 0);
      for (let i = dataStart; i < table.length; i++) {
        const row = table[i];
        const rawName = (row[nameIdx] || "").trim();
        if (!rawName || rawName.toLowerCase().includes("jumlah") || rawName.toLowerCase().includes("total")) continue;
        add(2025, cleanNum(row[luasIdx]), cleanNum(row[prodIdx]), cleanNum(row[rataIdx]));
      }
    } catch (e) {
      // snapshot tidak ada — biarkan historis DB saja
    }

    // 3. Prune tahun tidak lengkap (<10 kecamatan melapor) — sama seperti frontend.
    for (const [y, v] of [...agg.entries()]) if (v.reporters < 10) agg.delete(y);

    return [...agg.entries()]
      .map(([tahun, v]) => ({
        tahun: String(tahun),
        luasPanen: v.luas,
        produksi: v.produksi,
        rataRata: v.luas > 0 ? v.areaWeighted / v.luas : 0,
      }))
      .sort((a, b) => parseInt(a.tahun) - parseInt(b.tahun));
  }),
);

/**
 * GET /api/v1/padi/sawah-ladang -> FoodCropRow[]
 * items: [Padi Sawah, Padi Ladang] per (kecamatan, tahun) — mencerminkan fetchPadiSawahLadang.
 */
padiRouter.get(
  "/sawah-ladang",
  route(async () => {
    const rows = await padiPerKecTahun();
    return rows.map((r) => ({
      kecamatan: r.kecamatan,
      tahun: String(r.tahun),
      items: [
        { komoditas: "Padi Sawah", luasPanen: r.luasSawah, produksi: r.produksiSawah, rataRata: r.rataSawah },
        { komoditas: "Padi Ladang", luasPanen: r.luasLadang, produksi: r.produksiLadang, rataRata: r.rataLadang },
      ],
    }));
  }),
);

/**
 * Palawija: GET /api/v1/palawija/:pair -> FoodCropRow[]
 * pair: jagung-ubi-kayu | kacang-kedelai | ubi-kacang-hijau
 */
const PALAWIJA_PAIRS = {
  "jagung-ubi-kayu": ["Jagung", "Ubi Kayu"],
  "kacang-kedelai": ["Kacang Tanah", "Kedelai"],
  "ubi-kacang-hijau": ["Ubi Jalar", "Kacang Hijau"],
};

palawijaRouter.get(
  "/:pair",
  route(async (req) => {
    const pair = PALAWIJA_PAIRS[req.params.pair];
    if (!pair) throw Object.assign(new Error("pair tidak dikenal"), { status: 404 });
    const rows = await q(
      `SELECT k.nama AS kecamatan, t.tahun, t.komoditas, t.luas_panen_ha, t.produksi_ton, t.rata_ku_ha
       FROM palawija_produksi t
       JOIN kecamatan k ON k.id = t.kecamatan_id
       WHERE t.komoditas IN (?, ?)
       ORDER BY k.nama, t.tahun`,
      pair,
    );
    const byKey = new Map();
    for (const r of rows) {
      const key = `${r.kecamatan}|${r.tahun}`;
      if (!byKey.has(key)) byKey.set(key, { kecamatan: r.kecamatan, tahun: String(r.tahun), items: [] });
      const row = byKey.get(key);
      row.items.push({
        komoditas: r.komoditas,
        luasPanen: Number(r.luas_panen_ha) || 0,
        produksi: Number(r.produksi_ton) || 0,
        rataRata: r.rata_ku_ha === null ? 0 : Number(r.rata_ku_ha),
      });
    }
    // Urutkan items sesuai urutan pair (A lalu B) — mencerminkan urutan kolom CSV.
    const order = (kom) => (kom === pair[0] ? 0 : 1);
    return [...byKey.values()]
      .map((r) => ({ ...r, items: r.items.sort((a, b) => order(a.komoditas) - order(b.komoditas)) }))
      .sort((a, b) =>
        a.kecamatan === b.kecamatan
          ? parseInt(a.tahun) - parseInt(b.tahun)
          : a.kecamatan.localeCompare(b.kecamatan),
      );
  }),
);

/** Parser CSV minimal (kutip ganda, koma/pemisah) — cukup untuk snapshot padi. */
export function parseCsvSimple(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === "," || ch === ";") {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}
