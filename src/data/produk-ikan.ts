/**
 * produk-ikan.ts — Katalog jenis produk ikan & harga referensi (halaman /fisheries, kategori "Jenis Ikan").
 *
 * PRINSIP (mengikuti harga-referensi.ts): harga TIDAK hardcode di komponen — semua di
 * modul data ini, setiap entri WAJIB punya keterangan sumber & tanggal.
 *
 * DUA KELOMPOK PRODUK:
 *  1. "tawar" — ikan air tawar hasil BUDIDAYA (kolam/karamba/minapadi) + TANGKAP
 *     perairan umum (Waduk Mrica / Serayu) Banjarnegara. Volume produksi resmi BPS
 *     hanya dipublikasikan per tempat pemeliharaan / alat tangkap — TIDAK per jenis
 *     ikan — sehingga rincian per jenis di halaman /fisheries adalah ESTIMASI
 *     komposisi (pangsa % indikatif), bukan angka BPS. Daftar jenis & sentra
 *     kecamatan mengikuti kebutuhan klien (gap-analysis-master.md §3.2):
 *     Lele, Nila, Mujair, Gurame, Ikan Mas, Tawes, Patin (+ Gabus & Belut dari
 *     konteks pasar lokal). Mina padi sentra: Singomerto, Bawang, Madukara.
 *  2. "laut" — ikan laut yang BEREDAR di pasar lokal (mis. Pasar Ikan Purwanegara),
 *     didatangkan dari wilayah pesisir; Banjarnegara BUKAN penghasil ikan laut,
 *     sehingga produk laut hanya dikatalogkan harga & ketersediaannya (tanpa volume).
 *
 * KELAS SUMBER HARGA: "indikatif" — harga pasar wajar per 2025-2026 yang BELUM
 * terverifikasi dari sumber resmi online (API Bapanas 403 WAF; Bappebti infoharga
 * tidak menyediakan ikan per jenis). ANGKA INI HARUS DIVERIFIKASI & DIGANTI dengan
 * sumber resmi begitu tersedia — lihat harga-referensi.ts untuk presedennya.
 *
 * Update: cukup sunting entri di bawah (hargaMin/hargaMax/pangsa/sentra/deskripsi).
 */

export type KelompokIkan = "tawar" | "laut";

export interface ProdukIkan {
  /** nama jenis ikan (label tampil) */
  nama: string;
  kelompok: KelompokIkan;
  /** deskripsi produk & ketersediaan (ringkas, ditampilkan di kartu katalog) */
  deskripsi: string;
  /** harga indikatif pasar Rp/kg (range) */
  hargaMin: number;
  hargaMax: number;
  /** pangsa komposisi estimasi (%) — hanya untuk kelompok "tawar"; Σ wajib 100 */
  pangsa?: number;
  /** sentra kecamatan produksi (master §3.2 — Distankan KP); opsional */
  sentra?: string[];
  /** keterangan sumber/cara pakai tambahan */
  catatan: string;
}

export const PRODUK_IKAN_SUMBER =
  "Indikatif (harga pasar wajar — VERIFIKASI): kisaran harga ikan segar di pasar Kabupaten Banjarnegara & Jateng";
export const PRODUK_IKAN_TANGGAL = "per 2025-2026";

/* ===================== AIR TAWAR (produksi lokal) ===================== */
/* Pangsa komposisi estimasi — Σ = 100. Didominasi lele (kolam pekarangan &
 * minapadi), disusul nila; tangkap Waduk Mrica/Serayu menambah nila, mujair,
 * tawes, gabus & belut. Jenis & sentra kecamatan per gap-analysis-master.md §3.2.
 * Bukan angka BPS — hanya basis estimasi rincian per jenis. */
export const PRODUK_IKAN_TAWAR: ProdukIkan[] = [
  {
    nama: "Lele",
    kelompok: "tawar",
    deskripsi:
      "Tersedia dalam kondisi hidup atau segar, sangat populer untuk konsumsi harian.",
    hargaMin: 22_000,
    hargaMax: 28_000,
    pangsa: 40,
    sentra: ["Purwareja Klampok", "Susukan", "Mandiraja"],
    catatan: "Komoditas budidaya dominan (kolam pekarangan & minapadi).",
  },
  {
    nama: "Nila",
    kelompok: "tawar",
    deskripsi:
      "Ikan air tawar lokal yang sangat stabil ketersediaannya dari kolam, minapadi, dan Waduk Mrica — digemari untuk digoreng atau dibakar.",
    hargaMin: 28_000,
    hargaMax: 38_000,
    pangsa: 18,
    sentra: ["Bawang", "Madukara", "Wanadadi", "Batur"],
    catatan: "Budidaya kolam/karamba serta hasil tangkap Waduk Mrica.",
  },
  {
    nama: "Mujair",
    kelompok: "tawar",
    deskripsi:
      "Ikan air tawar lokal dari kolam tanah, rawa, dan waduk — pilihan ekonomis untuk konsumsi harian.",
    hargaMin: 25_000,
    hargaMax: 33_000,
    pangsa: 9,
    sentra: ["Wanadadi", "Banjarmangu", "Rakit"],
    catatan: "Budidaya kolam tanah serta hasil tangkap perairan umum.",
  },
  {
    nama: "Gurame",
    kelompok: "tawar",
    deskripsi:
      "Ukuran bervariasi dari sedang hingga besar, banyak dicari untuk restoran atau acara keluarga.",
    hargaMin: 45_000,
    hargaMax: 55_000,
    pangsa: 8,
    sentra: ["Bawang", "Rakit", "Madukara", "Purwanegara"],
    catatan: "Ikan premium — harga di atas rata-rata ikan tawar lain.",
  },
  {
    nama: "Ikan Mas",
    kelompok: "tawar",
    deskripsi:
      "Ikan konsumsi sekaligus benih/ikan hias; dibudidayakan di kolam air deras dan minapadi.",
    hargaMin: 30_000,
    hargaMax: 40_000,
    pangsa: 7,
    sentra: ["Bawang", "Banjarmangu", "Karangkobar"],
    catatan: "Ukuran konsumsi; ukuran kecil sebagian dijual sebagai benih.",
  },
  {
    nama: "Patin",
    kelompok: "tawar",
    deskripsi:
      "Daging tebal dan lembut, sering diolah menjadi sop atau gulai.",
    hargaMin: 22_000,
    hargaMax: 28_000,
    pangsa: 6,
    sentra: ["Mandiraja", "Purwanegara"],
    catatan: "Umumnya dibudidayakan di kolam/karamba.",
  },
  {
    nama: "Tawes",
    kelompok: "tawar",
    deskripsi:
      "Ikan konsumsi lokal dari kolam tanah serta hasil tangkap Sungai Serayu dan Waduk Mrica.",
    hargaMin: 25_000,
    hargaMax: 35_000,
    pangsa: 4,
    sentra: ["Purwareja Klampok", "Susukan"],
    catatan: "Umumnya hasil tangkap perairan umum & kolam tanah.",
  },
  {
    nama: "Gabus & Belut",
    kelompok: "tawar",
    deskripsi:
      "Sering ditemukan di pasar tradisional seperti Pasar Ikan Purwanegara untuk kebutuhan konsumsi khusus atau olahan tradisional.",
    hargaMin: 50_000,
    hargaMax: 65_000,
    pangsa: 8,
    catatan: "Umumnya hasil tangkap perairan umum/sawah, bukan budidaya.",
  },
];

/* ===================== LAUT (peredaran pasar lokal) ===================== */
/* Banjarnegara bukan penghasil ikan laut — produk didatangkan dari wilayah
 * pesisir (mis. via PPS Cilacap/Pekalongan) dan hanya dikatalogkan harga. */
export const PRODUK_IKAN_LAUT: ProdukIkan[] = [
  {
    nama: "Selar Kuning (Ciu)",
    kelompok: "laut",
    deskripsi:
      "Pasokan stabil dengan harga terjangkau di pasaran.",
    hargaMin: 20_000,
    hargaMax: 30_000,
    catatan: "Ikan laut ekonomis paling banyak beredar harian.",
  },
  {
    nama: "Kurisi & Kembung",
    kelompok: "laut",
    deskripsi:
      "Sering dijual sebagai pilihan ikan laut segar harian.",
    hargaMin: 25_000,
    hargaMax: 35_000,
    catatan: "Duo ikan laut segar andalan pedagang pasar tradisional.",
  },
  {
    nama: "Bandeng",
    kelompok: "laut",
    deskripsi:
      "Tersedia dalam berbagai ukuran berat per kilogram.",
    hargaMin: 28_000,
    hargaMax: 40_000,
    catatan: "Ukuran/kelas berat menentukan harga per kilogram.",
  },
  {
    nama: "Cumi-cumi & Udang Putih Besar",
    kelompok: "laut",
    deskripsi:
      "Produk hasil laut pendukung yang juga tersedia di pusat perdagangan ikan setempat.",
    hargaMin: 60_000,
    hargaMax: 110_000,
    catatan: "Produk premium — udang putih besar di harga atas kisaran.",
  },
];

/* ===================== HELPER ===================== */

/** Harga tengah (rata-rata min–max) sebuah produk, Rp/kg. */
export const hargaTengah = (p: ProdukIkan): number =>
  Math.round((p.hargaMin + p.hargaMax) / 2);

/** Harga referensi air tawar tertimbang pangsa (Rp/kg) — dipakai estimasi nilai. */
export const HARGA_TAWAR_TERTIMBANG: number = PRODUK_IKAN_TAWAR.reduce(
  (a, p) => a + (p.pangsa ?? 0) / 100 * hargaTengah(p),
  0,
);

/** Validasi invariant pangsa (Σ harus 100) — gagal cepat saat dev. */
const totalPangsa = PRODUK_IKAN_TAWAR.reduce((a, p) => a + (p.pangsa ?? 0), 0);
if (totalPangsa !== 100) {
  throw new Error(
    `produk-ikan: Σ pangsa PRODUK_IKAN_TAWAR = ${totalPangsa} (harus 100)`,
  );
}
