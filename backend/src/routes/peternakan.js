// Peternakan — /api/v1/peternakan/*
// Replika fetchTernakKecil/Besar/Unggas, fetchPemasukanTernak, fetchPengeluaranTernak,
// fetchLuarRPH, fetchDagingUnggas (semua bentuk TernakFlow memakai items + label fix).
import { Router } from "express";
import { q } from "../db.js";
import { route, pivotLong } from "../lib/helpers.js";

export const peternakanRouter = Router();

const num0 = (v) => (v === null || v === undefined ? 0 : Number(v));

const POPULASI_MAPS = {
  kecil: new Map([
    ["Kambing", "kambing"],
    ["Domba", "domba"],
    ["Babi", "babi"],
    ["Kelinci", "kelinci"],
  ]),
  besar: new Map([
    ["Sapi Perah", "sapiPerah"],
    ["Sapi", "sapi"],
    ["Kerbau", "kerbau"],
    ["Kuda", "kuda"],
  ]),
  unggas: new Map([
    ["Ayam Kampung", "ayamKampung"],
    ["Ayam Ras Layer", "ayamRasLayer"],
    ["Ayam Broiler", "ayamBroiler"],
    ["Itik Biasa", "itikBiasa"],
    ["Itik Manila", "itikManila"],
  ]),
};

for (const kelompok of Object.keys(POPULASI_MAPS)) {
  peternakanRouter.get(
    `/${kelompok}`,
    route(async () => {
      const rows = await q(
        `SELECT k.nama AS kecamatan, t.tahun, t.jenis, t.jumlah_ekor AS nilai
         FROM ternak_populasi t JOIN kecamatan k ON k.id = t.kecamatan_id
         WHERE t.kelompok = ? ORDER BY k.nama, t.tahun`,
        [kelompok],
      );
      const map = POPULASI_MAPS[kelompok];
      return pivotLong(
        rows,
        (r) => {
          const f = map.get(r.jenis);
          return f ? [f, num0(r.nilai)] : null;
        },
        // pastikan semua field hadir (default 0) seperti kolom CSV yang selalu ada
        (r) => Object.fromEntries([...map.values()].map((f) => [f, 0])),
      );
    }),
  );
}

/** Label TernakFlow lalu-lintas ternak — urutan & nama persis seperti frontend.
 *  Kolom sumber "Sapi" ditampilkan sebagai "Sapi Potong". */
const FLOW_LABELS = ["Sapi Perah", "Sapi Potong", "Kerbau", "Kuda", "Kambing", "Domba"];
const FLOW_DB_TO_LABEL = { "Sapi Perah": "Sapi Perah", Sapi: "Sapi Potong", Kerbau: "Kerbau", Kuda: "Kuda", Kambing: "Kambing", Domba: "Domba" };

const RPH_LABELS = ["Sapi", "Kerbau", "Babi", "Kambing", "Domba"];
const UNGGAS_LABELS = ["Ayam Ras Layer", "Ayam Kampung"];

async function ternakFlow({ table, where, params, labels, dbToLabel, valueCol, unit }) {
  const rows = await q(
    `SELECT k.nama AS kecamatan, t.tahun, t.jenis, t.${valueCol} AS nilai
     FROM ${table} t JOIN kecamatan k ON k.id = t.kecamatan_id
     ${where} ORDER BY k.nama, t.tahun`,
    params,
  );
  const byKey = new Map();
  for (const r of rows) {
    const key = `${r.kecamatan}|${r.tahun}`;
    if (!byKey.has(key)) byKey.set(key, { kecamatan: r.kecamatan, tahun: String(r.tahun), values: {} });
    const label = dbToLabel ? dbToLabel[r.jenis] : r.jenis;
    byKey.get(key).values[label] = num0(r.nilai);
  }
  return [...byKey.values()]
    .map((r) => ({
      kecamatan: r.kecamatan,
      tahun: r.tahun,
      unit,
      items: labels.map((label) => ({ jenis: label, jumlah: r.values[label] ?? 0 })),
    }))
    .sort((a, b) =>
      a.kecamatan === b.kecamatan
        ? parseInt(a.tahun) - parseInt(b.tahun)
        : a.kecamatan.localeCompare(b.kecamatan),
    );
}

/** GET /api/v1/peternakan/pemasukan -> TernakFlow[] */
peternakanRouter.get(
  "/pemasukan",
  route(() => ternakFlow({ table: "ternak_flow", where: "WHERE t.arah = ?", params: ["pemasukan"], labels: FLOW_LABELS, dbToLabel: FLOW_DB_TO_LABEL, valueCol: "jumlah_ekor", unit: "ekor" })),
);

/** GET /api/v1/peternakan/pengeluaran -> TernakFlow[] (Sapi Perah & Kuda nihil di sumber -> 0) */
peternakanRouter.get(
  "/pengeluaran",
  route(() => ternakFlow({ table: "ternak_flow", where: "WHERE t.arah = ?", params: ["pengeluaran"], labels: FLOW_LABELS, dbToLabel: FLOW_DB_TO_LABEL, valueCol: "jumlah_ekor", unit: "ekor" })),
);

/** GET /api/v1/peternakan/luar-rph -> TernakFlow[] (ekor) */
peternakanRouter.get(
  "/luar-rph",
  route(() => ternakFlow({ table: "ternak_pemotongan", where: "WHERE t.lokasi = ?", params: ["luar_rph"], labels: RPH_LABELS, valueCol: "jumlah_ekor", unit: "ekor" })),
);

/** GET /api/v1/peternakan/rph-pemerintah -> TernakFlow[] (ekor) - pemotongan RESMI di RPH Pemerintah.
 *  Sumber: ternak_pemotongan lokasi='rph_pemerintah' (importer: "Jumlah Ternak yang Dipotong di RPH Pemerintah").
 *  Notulen Distankan KP 21 Sep 2026 - Submenu 4 Peternakan: "Lalu Lintas Ternak & Produksi Daging + RPH (resmi)". */
const RPH_PEMERINTAH_LABELS = ["Sapi", "Kerbau", "Kuda", "Babi", "Kambing", "Domba"];
peternakanRouter.get(
  "/rph-pemerintah",
  route(() => ternakFlow({ table: "ternak_pemotongan", where: "WHERE t.lokasi = ?", params: ["rph_pemerintah"], labels: RPH_PEMERINTAH_LABELS, valueCol: "jumlah_ekor", unit: "ekor" })),
);

/** GET /api/v1/peternakan/daging-unggas -> TernakFlow[] (kg) */
peternakanRouter.get(
  "/daging-unggas",
  route(() => ternakFlow({ table: "ternak_daging", where: "WHERE t.kelompok = ?", params: ["unggas"], labels: UNGGAS_LABELS, valueCol: "produksi_kg", unit: "kg" })),
);

/** GET /api/v1/peternakan/susu-kulit -> TernakFlow[] (produksi kulit & susu per grup ternak).
 *  Sumber BPS memakai 1 kolom per grup ternak tanpa memisahkan satuan kulit (lembar) vs
 *  susu (liter) — unit dilabeli "gabungan" dan catatan tersimpan per baris di tabel. */
peternakanRouter.get(
  "/susu-kulit",
  route(() =>
    ternakFlow({
      table: "ternak_susu_kulit",
      where: "",
      params: [],
      labels: ["Sapi/Kerbau", "Kambing/Domba"],
      valueCol: "nilai",
      unit: "gabungan (kulit lembar / susu liter)",
    }),
  ),
);

/** GET /api/v1/peternakan/daging -> TernakFlow[] (kg) — daging ternak besar & kecil
 *  (Sapi, Kerbau, Kambing, Domba, Babi). Daging unggas lihat /daging-unggas. */
const DAGING_TERNAK_LABELS = ["Sapi", "Kerbau", "Kambing", "Domba", "Babi"];
peternakanRouter.get(
  "/daging",
  route(() => ternakFlow({ table: "ternak_daging", where: "WHERE t.kelompok = ?", params: ["ternak"], labels: DAGING_TERNAK_LABELS, valueCol: "produksi_kg", unit: "kg" })),
);

/** GET /api/v1/peternakan/telur -> TernakFlow[] (butir) — telur ayam kampung, ras layer & itik. */
const TELUR_LABELS = ["Ayam Kampung", "Ayam Ras Layer", "Itik"];
peternakanRouter.get(
  "/telur",
  route(() => ternakFlow({ table: "ternak_telur", where: "", params: [], labels: TELUR_LABELS, valueCol: "produksi_kg", unit: "butir" })),
);
