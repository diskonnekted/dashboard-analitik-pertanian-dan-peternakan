/**
 * harga-referensi.ts — Harga referensi untuk estimasi Nilai Ekonomi (halaman /nilai-ekonomi).
 *
 * PRINSIP: harga TIDAK hardcode di komponen — semua di modul data ini, setiap entri
 * WAJIB punya keterangan sumber & tanggal.
 *
 * Dua kelas sumber:
 *  1. "resmi-live"  — Bappebti infoharga (Kemendag), tingkat PETANI, diakses LIVE
 *                     22 Sep 2026 pk 15.10 WIB via https://infoharga.bappebti.go.id/harga_komoditi_petani
 *  2. "indikatif"   — harga pasar wajar (indikatif) yang BELUM terverifikasi dari sumber
 *                     resmi online, karena seluruh mesin pencari memblokir akses programatik
 *                     (Bing menyajikan SERP palsu utk bot, Brave/Searx/Mojeek rate-limit,
 *                     DuckDuckGo diblokir, API Bapanas 403 WAF). ANGKA INI HARUS DIVERIFIKASI
 *                     & DIGANTI dengan sumber resmi begitu tersedia.
 *
 * Update: cukup sunting entri di bawah (hargaRp / sumber / tanggal / jenisSumber).
 */

export type JenisSumber = "resmi-live" | "indikatif";

export interface HargaRef {
  /** satuan dasar harga (kg / liter / lembar) */
  satuan: string;
  /** harga per satuan (Rp) */
  hargaRp: number;
  jenisSumber: JenisSumber;
  /** keterangan sumber — ditampilkan di UI */
  sumber: string;
  /** tanggal/periode sumber */
  tanggal: string;
}

export const AKSES_HARGA_TANGGAL = "22 September 2026";
export const SUMBER_BAPPEBTI = "Bappebti infoharga (Kemendag) — tingkat petani";

export const KETERANGAN_PENCARIAN =
  "Harga resmi-live bersumber Bappebti infoharga.bappebti.go.id (tingkat petani), diakses " +
  AKSES_HARGA_TANGGAL + ". Mesin pencari & situs harga resmi lain memblokir akses otomatis " +
  "(Bing SERP palsu untuk bot; Brave/Mojeek/Searx/DuckDuckGo rate-limit; API Bapanas 403), " +
  "sehingga komoditas lain memakai harga indikatif yang WAJIB diverifikasi — lihat kolom Sumber.";

const bappebti = (wilayah: string): Pick<HargaRef, "jenisSumber" | "sumber" | "tanggal"> => ({
  jenisSumber: "resmi-live",
  sumber: `${SUMBER_BAPPEBTI}, pantauan ${wilayah}`,
  tanggal: AKSES_HARGA_TANGGAL,
});

const indikatif = (catatan: string): Pick<HargaRef, "jenisSumber" | "sumber" | "tanggal"> => ({
  jenisSumber: "indikatif",
  sumber: `Indikatif (harga pasar wajar — VERIFIKASI): ${catatan}`,
  tanggal: "per 2025-2026",
});

/* ===================== TANAMAN PANGAN (volume BPS: ton) ===================== */
export const HARGA_PANGAN: Record<string, HargaRef> = {
  // Produksi BPS padi = GABAH (ton). Harga gabah petani Bappebti Cianjur.
  "Padi Sawah": { satuan: "kg", hargaRp: 8000, ...bappebti("Cianjur") },
  "Padi Ladang": { satuan: "kg", hargaRp: 8000, ...bappebti("Cianjur") },
  Jagung: { satuan: "kg", hargaRp: 5500, ...bappebti("Tasikmalaya") },
  "Ubi Kayu": { satuan: "kg", hargaRp: 1200, ...indikatif("ubi kayu segar tingkat petani/pabrik tapioka") },
  "Ubi Jalar": { satuan: "kg", hargaRp: 4000, ...indikatif("ubi jalar segar tingkat petani") },
  "Kacang Tanah": { satuan: "kg", hargaRp: 16000, ...indikatif("kacang tanah kering polong") },
  "Kacang Hijau": { satuan: "kg", hargaRp: 22000, ...indikatif("kacang hijau kering") },
  Kedelai: { satuan: "kg", hargaRp: 11000, ...indikatif("kedelai kering tingkat petani") },
};

/* ===================== HORTIKULTURA (volume: ton) ===================== */
export const HARGA_HORTI: Record<string, HargaRef> = {
  "Bawang Merah": { satuan: "kg", hargaRp: 18000, ...bappebti("Brebes (sentra Jateng)") },
  "Bawang Putih": { satuan: "kg", hargaRp: 45000, ...indikatif("bawang putih kering") },
  "Cabai Besar": { satuan: "kg", hargaRp: 35000, ...indikatif("cabai besar keriting tingkat petani") },
  "Cabai Rawit": { satuan: "kg", hargaRp: 50000, ...indikatif("cabai rawit merah tingkat petani") },
  Kentang: { satuan: "kg", hargaRp: 9000, ...indikatif("kentang granola tingkat petani") },
  Kubis: { satuan: "kg", hargaRp: 5000, ...indikatif("kubis tingkat petani") },
  Petsai: { satuan: "kg", hargaRp: 5000, ...indikatif("petsai/sawi putih tingkat petani") },
  Tomat: { satuan: "kg", hargaRp: 7000, ...indikatif("tomat tingkat petani") },
  Mangga: { satuan: "kg", hargaRp: 12000, ...indikatif("mangga gedong/liwet tingkat petani") },
  Durian: { satuan: "kg", hargaRp: 30000, ...indikatif("durian tingkat petani") },
  "Jeruk Besar": { satuan: "kg", hargaRp: 10000, ...indikatif("jeruk besar tingkat petani") },
  "Jeruk Siam": { satuan: "kg", hargaRp: 10000, ...indikatif("jeruk siam tingkat petani") },
  Pisang: { satuan: "kg", hargaRp: 8000, ...indikatif("pisang tingkat petani") },
  Pepaya: { satuan: "kg", hargaRp: 5000, ...indikatif("pepaya california tingkat petani") },
  Salak: { satuan: "kg", hargaRp: 12000, ...indikatif("salak pondoh tingkat petani") },
};

/* ===================== PERKEBUNAN (volume: ton) ===================== */
export const HARGA_KEBUN: Record<string, HargaRef> = {
  "Kopi Robusta": { satuan: "kg", hargaRp: 87000, ...bappebti("Subang") },
  Kakao: { satuan: "kg", hargaRp: 54500, ...bappebti("Kendari") },
  Karet: { satuan: "kg", hargaRp: 19000, ...bappebti("Jambi") },
  // Rata-rata 4 jenis tembakau Bappebti: Boyolali 85.000, Burley 74.000, Kasturi 90.000, Madura 54.300
  Tembakau: { satuan: "kg", hargaRp: 75800, ...bappebti("rata-rata 4 jenis (Malang dll.)") },
  "Kelapa Sawit": { satuan: "kg", hargaRp: 3851, ...bappebti("Sumsel (TBS)") },
  "Kelapa Dalam": { satuan: "kg", hargaRp: 5000, ...indikatif("kelapa dalam per kg butir") },
  Teh: { satuan: "kg", hargaRp: 3500, ...indikatif("pucuk teh basah tingkat petani") },
  Tebu: { satuan: "kg", hargaRp: 650, ...indikatif("tebu giling tingkat petani") },
};

/* ===================== PETERNAKAN — DAGING (volume: kg) ===================== */
export const HARGA_DAGING: Record<string, HargaRef> = {
  Sapi: { satuan: "kg", hargaRp: 130000, ...indikatif("daging sapi potong (kisaran pasar 110-150 rb)") },
  Kerbau: { satuan: "kg", hargaRp: 120000, ...indikatif("daging kerbau") },
  Kambing: { satuan: "kg", hargaRp: 110000, ...indikatif("daging kambing") },
  Domba: { satuan: "kg", hargaRp: 115000, ...indikatif("daging domba") },
  Babi: { satuan: "kg", hargaRp: 35000, ...indikatif("daging babi") },
  "Ayam Kampung": { satuan: "kg", hargaRp: 60000, ...indikatif("daging ayam kampung") },
  "Ayam Ras Layer": { satuan: "kg", hargaRp: 35000, ...indikatif("daging ayam ras (afkir)") },
  // Tambahan utk estimasi unggas (populasi broiler/itik besar tanpa harga = bolong):
  "Ayam Broiler": { satuan: "kg", hargaRp: 32000, ...indikatif("daging ayam broiler (karkas, kisaran pasar)") },
  Itik: { satuan: "kg", hargaRp: 45000, ...indikatif("daging itik (karkas, kisaran pasar)") },
  "Entok (Itik Manila)": { satuan: "kg", hargaRp: 55000, ...indikatif("daging entok/itik manila (karkas, kisaran pasar)") },
};

/* ===================== PETERNAKAN — TELUR (volume: kg) ===================== */
export const HARGA_TELUR: Record<string, HargaRef> = {
  "Ayam Ras Layer": { satuan: "kg", hargaRp: 28000, ...indikatif("telur ayam ras (kisaran pasar 25-32 rb)") },
  "Ayam Kampung": { satuan: "kg", hargaRp: 45000, ...indikatif("telur ayam kampung per kg") },
};

/* ===================== PETERNAKAN — SUSU & KULIT (volume: liter / lembar) ===================== */
export const HARGA_SUSUKULIT: Record<string, HargaRef> = {
  "Sapi/Kerbau": { satuan: "liter", hargaRp: 7500, ...indikatif("susu sapi segar tingkat peternak") },
  "Kambing/Domba": { satuan: "lembar", hargaRp: 40000, ...indikatif("kulit kambing/domba per lembar (kering)") },
};
