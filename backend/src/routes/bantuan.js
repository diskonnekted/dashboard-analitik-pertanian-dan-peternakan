/**
 * routes/bantuan.js — GET /api/v1/bantuan
 * Pengganti Sanity Content Lake: data bantuan pemerintah dari MySQL
 * (tabel bantuan_program / bantuan_alokasi / bantuan_korelasi).
 * Bentuk respons = BantuanData di src/services/bantuan.ts (camelCase + _id/_updatedAt)
 * supaya halaman /government-assistance tidak perlu berubah.
 */
import express from "express";
import { q } from "../db.js";
import { route } from "../lib/helpers.js";

const router = express.Router();

const toIso = (v) => (v ? new Date(v).toISOString() : new Date().toISOString());

router.get(
  "/",
  route(async () => {
    const [program, alokasi, korelasi] = await Promise.all([
      q("SELECT * FROM bantuan_program ORDER BY tahun_anggaran DESC, nama ASC"),
      q("SELECT * FROM bantuan_alokasi ORDER BY tahun ASC"),
      q("SELECT * FROM bantuan_korelasi ORDER BY sektor ASC"),
    ]);
    const updatedAt = [program, alokasi, korelasi]
      .flat()
      .map((r) => (r.updated_at ? new Date(r.updated_at).getTime() : 0))
      .reduce((a, b) => Math.max(a, b), 0);
    return {
      program: program.map((r) => ({
        _id: String(r.id),
        _updatedAt: toIso(r.updated_at),
        nama: r.nama,
        sumber: r.sumber_dana,
        tahunAnggaran: r.tahun_anggaran,
        nilaiRupiah: Number(r.nilai_rupiah),
        sektor: r.sektor,
        penerimaJumlah: r.penerima_jumlah,
        penerimaJenis: r.penerima_jenis,
        dampakLevel: r.dampak_level,
        dampakCatatan: r.dampak_catatan ?? "",
      })),
      alokasi: alokasi.map((r) => ({
        _id: String(r.id),
        _updatedAt: toIso(r.updated_at),
        tahun: r.tahun,
        apbdMiliar: Number(r.apbd_miliar),
        apbnMiliar: Number(r.apbn_miliar),
      })),
      korelasi: korelasi.map((r) => ({
        _id: String(r.id),
        _updatedAt: toIso(r.updated_at),
        sektor: r.sektor,
        bantuanMiliar: Number(r.bantuan_miliar),
        kenaikanProduksiPct: Number(r.kenaikan_produksi_pct),
      })),
      updatedAt: updatedAt ? new Date(updatedAt).toISOString() : new Date().toISOString(),
    };
  })
);

export default router;
