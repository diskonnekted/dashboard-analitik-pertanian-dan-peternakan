// Komoditas unggulan per kecamatan per bidang (dinamis, mengikuti tahun).
// Logika: untuk tiap kecamatan x bidang, komoditas dengan nilai TERBESAR.
//   Tanaman Pangan : Padi (sawah+ladang digabung) + palawija per komoditas, satuan ton.
//   Hortikultura   : sayuran + buah dengan satuan 'ton' saja (tangkai dikecualikan).
//   Perkebunan     : produksi_ton per tanaman.
//   Peternakan     : POPULASI per spesies (jumlah_ekor), mencakup besar/kecil/unggas.
//   Perikanan      : produksi budidaya per METODE (jenis_budidaya). Data spesies ikan
//                    per kecamatan tidak tersedia -> ditandai lewat catatan + flag metode.
// Semua agregasi server-side dari tabel produksi agar satu putaran & mengikuti tahun.
import express from "express";
import { q } from "../db.js";
import { route, num } from "../lib/helpers.js";

export const komoditasUnggulanRouter = express.Router();

const BIDANG = ["Tanaman Pangan", "Hortikultura", "Perkebunan", "Peternakan", "Perikanan"];
const SATUAN = {
  "Tanaman Pangan": "ton",
  Hortikultura: "ton",
  Perkebunan: "ton",
  Peternakan: "ekor",
  Perikanan: "ton",
};
const CATATAN = {
  Peternakan:
    "Berdasarkan populasi (jumlah ekor) per spesies; mencakup ternak besar, kecil, dan unggas.",
  Perikanan:
    "Data spesies ikan per kecamatan tidak tersedia; yang ditampilkan adalah metode budidaya (Pembesaran / Karamba Jaring Apung / Minapadi) berdasarkan produksi.",
};

const round1 = (v) => Math.round(Number(v) * 10) / 10;

// Ambil top-1 per kecamatan dari baris [{kecamatan_id, komoditas, nilai}].
function topPerKecamatan(rows) {
  const byKec = new Map();
  for (const r of rows) {
    const v = num(r.nilai);
    if (!Number.isFinite(v) || v <= 0) continue;
    const arr = byKec.get(r.kecamatan_id) || [];
    arr.push({ komoditas: r.komoditas, nilai: v });
    byKec.set(r.kecamatan_id, arr);
  }
  const out = new Map();
  for (const [kid, arr] of byKec) {
    arr.sort((a, b) => b.nilai - a.nilai);
    const total = arr.reduce((s, x) => s + x.nilai, 0);
    out.set(kid, {
      komoditas: arr[0].komoditas,
      nilai: round1(arr[0].nilai),
      total: round1(total),
      share: total > 0 ? Math.round((arr[0].nilai / total) * 1000) / 10 : 0,
      runnerUp: arr[1] ? arr[1].komoditas : null,
    });
  }
  return out;
}

komoditasUnggulanRouter.get(
  "/",
  route(async (req) => {
    // Tahun yang tersedia di seluruh tabel sumber (untuk pemilih tahun di frontend).
    const tahunRows = await q(
      `SELECT DISTINCT tahun FROM (
         SELECT tahun FROM padi_produksi
         UNION SELECT tahun FROM palawija_produksi
         UNION SELECT tahun FROM horti_produksi
         UNION SELECT tahun FROM perkebunan_produksi
         UNION SELECT tahun FROM ternak_populasi
         UNION SELECT tahun FROM ikan_budidaya
       ) u ORDER BY tahun`,
    );
    const tahunTersedia = tahunRows.map((r) => Number(r.tahun));

    const diminta = Number.parseInt(req.query.tahun, 10);
    const tahun =
      Number.isFinite(diminta) && tahunTersedia.includes(diminta)
        ? diminta
        : tahunTersedia[tahunTersedia.length - 1] ?? null;

    if (!tahun) {
      return { ok: true, tahun: null, tahunTersedia, satuan: SATUAN, catatan: CATATAN, kecamatan: [] };
    }

    // Baris (kecamatan_id, komoditas, nilai) per bidang.
    const [tanamanPangan, hortikultura, perkebunan, peternakan, perikanan] = await Promise.all([
      q(
        `SELECT kecamatan_id, komoditas, SUM(produksi) AS nilai FROM (
           SELECT kecamatan_id, 'Padi' AS komoditas, produksi_ton AS produksi
             FROM padi_produksi WHERE tahun = ?
           UNION ALL
           SELECT kecamatan_id, komoditas, produksi_ton
             FROM palawija_produksi WHERE tahun = ?
         ) t GROUP BY kecamatan_id, komoditas`,
        [tahun, tahun],
      ),
      q(
        `SELECT kecamatan_id, komoditas, SUM(nilai) AS nilai
           FROM horti_produksi WHERE tahun = ? AND satuan = 'ton'
          GROUP BY kecamatan_id, komoditas`,
        [tahun],
      ),
      q(
        `SELECT kecamatan_id, tanaman AS komoditas, SUM(produksi_ton) AS nilai
           FROM perkebunan_produksi WHERE tahun = ?
          GROUP BY kecamatan_id, tanaman`,
        [tahun],
      ),
      q(
        `SELECT kecamatan_id, jenis AS komoditas, SUM(jumlah_ekor) AS nilai
           FROM ternak_populasi WHERE tahun = ?
          GROUP BY kecamatan_id, jenis`,
        [tahun],
      ),
      q(
        `SELECT kecamatan_id, jenis_budidaya AS komoditas, SUM(produksi_kg) / 1000 AS nilai
           FROM ikan_budidaya WHERE tahun = ?
          GROUP BY kecamatan_id, jenis_budidaya`,
        [tahun],
      ),
    ]);

    const barisPerBidang = {
      "Tanaman Pangan": tanamanPangan,
      Hortikultura: hortikultura,
      Perkebunan: perkebunan,
      Peternakan: peternakan,
      Perikanan: perikanan,
    };

    const topPerBidang = {};
    for (const b of BIDANG) topPerBidang[b] = topPerKecamatan(barisPerBidang[b]);

    const kecRows = await q("SELECT id, nama FROM kecamatan ORDER BY nama");
    const kecamatan = kecRows.map((k) => {
      const bidang = {};
      for (const b of BIDANG) {
        const rec = topPerBidang[b].get(k.id);
        bidang[b] = rec
          ? { ...rec, satuan: SATUAN[b], ...(b === "Perikanan" ? { metode: true } : {}) }
          : null;
      }
      return { kecamatan: k.nama, bidang };
    });

    return { ok: true, tahun, tahunTersedia, satuan: SATUAN, catatan: CATATAN, kecamatan };
  }),
);
