import type { KomoditasUnggulanRow } from "@/services/api";

/**
 * Data Komoditas & Varietas Unggulan — turunan dari data produksi resmi
 * Distankan KP yang SUDAH ADA di basis data aplikasi ini (database `sispertani`,
 * tahun 2024 — tahun data produksi terlengkap). Bukan data contoh/rekaan.
 *
 * Sumber per bidang:
 *  - Tanaman Pangan : padi_produksi & palawija_produksi (produksi_ton, luas_panen_ha, rata_ku_ha)
 *  - Hortikultura   : horti_produksi (ton) × horti_luas (ha) — kelompok sayuran
 *  - Perkebunan     : perkebunan_produksi (produksi_ton) × perkebunan_areal (luas_ha)
 *  - Peternakan     : ternak_daging (produksi_kg → ton)
 *  - Perikanan      : pangsa estimasi PRODUK_IKAN_TAWAR (src/data/produk-ikan.ts)
 *                     × total produksi budidaya tahun 2024 (ikan_budidaya)
 *
 * "kecamatan" = kecamatan sentra (produksi tertinggi) untuk komoditas tsb.
 * "luas_lahan" & "produksi" = total kabupaten tahun 2024.
 * "produktivitas" (Ku/Ha) = produksi × 10 ÷ luas (tanaman pangan memakai
 * rata_ku_ha tertimbang dari sumber). Varietas & ketersediaan benih belum
 * tersedia di data produksi BPS/Distankan → diisi "-" (menunggu impor Dinas).
 */
export const KOMODITAS_UNGGULAN_SUMBER =
  "Turunan data produksi 2024 (basis data lokal: padi/palawija, horti_produksi×horti_luas, perkebunan_produksi×areal, ternak_daging; perikanan = pangsa estimasi produk ikan × total budidaya). Varietas & ketersediaan benih menunggu data Dinas.";
export const KOMODITAS_UNGGULAN_TAHUN = 2024;

export const KOMODITAS_UNGGULAN_LOKAL: KomoditasUnggulanRow[] = [
  // ----- Tanaman Pangan -----
  { bidang: "Tanaman Pangan", komoditas: "Padi", varietas: "-", kecamatan: "Mandiraja", luas_lahan: 25576, produktivitas: 68.9, produksi: 176200, ketersediaan_benih: "-", tahun: 2024 },
  { bidang: "Tanaman Pangan", komoditas: "Jagung", varietas: "-", kecamatan: "Purwanegara", luas_lahan: 7632, produktivitas: 66.7, produksi: 51146, ketersediaan_benih: "-", tahun: 2024 },
  { bidang: "Tanaman Pangan", komoditas: "Ubi Kayu", varietas: "-", kecamatan: "Purwanegara", luas_lahan: 2637, produktivitas: 298.9, produksi: 78886, ketersediaan_benih: "-", tahun: 2024 },

  // ----- Hortikultura -----
  { bidang: "Hortikultura", komoditas: "Kentang", varietas: "-", kecamatan: "Batur", luas_lahan: 7644, produktivitas: 182.8, produksi: 139726, ketersediaan_benih: "-", tahun: 2024 },
  { bidang: "Hortikultura", komoditas: "Kubis", varietas: "-", kecamatan: "Batur", luas_lahan: 1919, produktivitas: 164.4, produksi: 31549, ketersediaan_benih: "-", tahun: 2024 },
  { bidang: "Hortikultura", komoditas: "Tomat", varietas: "-", kecamatan: "Pejawaran", luas_lahan: 1232, produktivitas: 154.9, produksi: 19083.6, ketersediaan_benih: "-", tahun: 2024 },
  { bidang: "Hortikultura", komoditas: "Cabai Besar", varietas: "-", kecamatan: "Pagentan", luas_lahan: 3572.2, produktivitas: 39.5, produksi: 14117.8, ketersediaan_benih: "-", tahun: 2024 },

  // ----- Perkebunan -----
  { bidang: "Perkebunan", komoditas: "Kelapa Dalam", varietas: "-", kecamatan: "Susukan", luas_lahan: 12053.9, produktivitas: 14, produksi: 16919.4, ketersediaan_benih: "-", tahun: 2024 },
  { bidang: "Perkebunan", komoditas: "Teh", varietas: "-", kecamatan: "Kalibening", luas_lahan: 1645.2, produktivitas: 22.7, produksi: 3730.7, ketersediaan_benih: "-", tahun: 2024 },
  { bidang: "Perkebunan", komoditas: "Kopi Robusta", varietas: "-", kecamatan: "Karangkobar", luas_lahan: 1937.1, produktivitas: 11.2, produksi: 2168.9, ketersediaan_benih: "-", tahun: 2024 },

  // ----- Peternakan (produksi daging) -----
  { bidang: "Peternakan", komoditas: "Sapi Potong", varietas: "-", kecamatan: "Banjarnegara", produksi: 1859.2, ketersediaan_benih: "-", tahun: 2024 },
  { bidang: "Peternakan", komoditas: "Ayam Kampung", varietas: "-", kecamatan: "Purwanegara", produksi: 288.9, ketersediaan_benih: "-", tahun: 2024 },
  { bidang: "Peternakan", komoditas: "Kambing", varietas: "-", kecamatan: "Punggelan", produksi: 75.4, ketersediaan_benih: "-", tahun: 2024 },
  { bidang: "Peternakan", komoditas: "Domba", varietas: "-", kecamatan: "Batur", produksi: 32.8, ketersediaan_benih: "-", tahun: 2024 },

  // ----- Perikanan (estimasi pangsa spesies × total budidaya) -----
  { bidang: "Perikanan", komoditas: "Lele", varietas: "-", kecamatan: "Purwareja Klampok", produksi: 17180, ketersediaan_benih: "-", tahun: 2024 },
  { bidang: "Perikanan", komoditas: "Nila / Mujair", varietas: "-", kecamatan: "Bawang", produksi: 12271, ketersediaan_benih: "-", tahun: 2024 },
  { bidang: "Perikanan", komoditas: "Gurame", varietas: "-", kecamatan: "Bawang", produksi: 4090, ketersediaan_benih: "-", tahun: 2024 },
];