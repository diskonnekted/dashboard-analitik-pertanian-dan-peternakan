/**
 * produk-ikan.ts — Katalog jenis produk ikan & harga referensi (halaman /fisheries, kategori "Jenis Ikan").
 *
 * PRINSIP (mengikuti harga-referensi.ts): harga TIDAK hardcode di komponen — semua di
 * modul data ini, setiap entri WAJIB punya keterangan sumber & tanggal.
 *
 * SATU KELOMPOK PRODUK:
 *  - "tawar" — ikan air tawar hasil BUDIDAYA (kolam/karamba/minapadi) + TANGKAP
 *    perairan umum (Waduk Mrica / Serayu) Banjarnegara. Volume produksi resmi BPS
 *    hanya dipublikasikan per tempat pemeliharaan / alat tangkap — TIDAK per jenis
 *    ikan — sehingga rincian per jenis di halaman /fisheries adalah ESTIMASI
 *    komposisi (pangsa % indikatif), bukan angka BPS. Penyajian memakai 5 GRUP
 *    PRODUK sesuai daftar klien (refinemen 22 Sep 2026): Lele, Gurame, Patin,
 *    Nila / Mujair (grup gabungan master §3.2 No. 2–3), Ikan Gabus & Belut.
 *    Kebutuhan data statistik per jenis (7 jenis + minapadi + pembenihan) tetap
 *    mengikuti gap-analysis-master.md §3.2 — grup ini dipecah ulang begitu data
 *    resmi per jenis tersedia (endpoint/admin).
 *
 * Ikan laut DIHAPUS: Banjarnegara bukan penghasil ikan laut, sehingga jenis laut
 * tidak lagi dikatalogkan (keputusan klien 23 Sep 2026).
 *
 * KELAS SUMBER HARGA: "indikatif" — harga pasar wajar per 2025-2026 yang BELUM
 * terverifikasi dari sumber resmi online (API Bapanas 403 WAF; Bappebti infoharga
 * tidak menyediakan ikan per jenis). ANGKA INI HARUS DIVERIFIKASI & DIGANTI dengan
 * sumber resmi begitu tersedia — lihat harga-referensi.ts untuk presedennya.
 *
 * Update: cukup sunting entri di bawah (hargaMin/hargaMax/pangsa/sentra/deskripsi).
 */

export type KelompokIkan = "tawar";

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
 * minapadi), disusul grup nila/mujair; tangkap Waduk Mrica/Serayu menambah
 * nila, mujair, gabus & belut. 5 grup produk per daftar klien 22 Sep 2026
 * (grup gabungan: §3.2 No. 2–3 jadi "Nila / Mujair"; pangsa No. 5 Ikan Mas &
 * No. 6 Tawes — 11% — didistribusikan ke grup lain). Mina padi sentra:
 * Singomerto, Bawang, Madukara. Bukan angka BPS — hanya basis estimasi. */
export const PRODUK_IKAN_TAWAR: ProdukIkan[] = [
  {
    nama: "Lele",
    kelompok: "tawar",
    deskripsi:
      "Tersedia dalam kondisi hidup atau segar, sangat populer untuk konsumsi harian.",
    hargaMin: 22_000,
    hargaMax: 28_000,
    pangsa: 42,
    sentra: ["Purwareja Klampok", "Susukan", "Mandiraja"],
    catatan: "Komoditas budidaya dominan (kolam pekarangan & minapadi).",
  },
  {
    nama: "Gurame",
    kelompok: "tawar",
    deskripsi:
      "Ukuran bervariasi dari sedang hingga besar, banyak dicari untuk restoran atau acara keluarga.",
    hargaMin: 45_000,
    hargaMax: 55_000,
    pangsa: 10,
    sentra: ["Bawang", "Rakit", "Madukara", "Purwanegara"],
    catatan: "Ikan premium — harga di atas rata-rata ikan tawar lain.",
  },
  {
    nama: "Patin",
    kelompok: "tawar",
    deskripsi:
      "Daging tebal dan lembut, sering diolah menjadi sop atau gulai.",
    hargaMin: 22_000,
    hargaMax: 28_000,
    pangsa: 9,
    sentra: ["Mandiraja", "Purwanegara"],
    catatan: "Umumnya dibudidayakan di kolam/karamba.",
  },
  {
    nama: "Nila / Mujair",
    kelompok: "tawar",
    deskripsi:
      "Ikan air tawar lokal yang sangat stabil ketersediaannya dan digemari untuk digoreng atau dibakar.",
    hargaMin: 25_000,
    hargaMax: 38_000,
    pangsa: 30,
    sentra: ["Bawang", "Madukara", "Wanadadi", "Batur", "Banjarmangu", "Rakit"],
    catatan:
      "Grup gabungan nila & mujair (master §3.2 No. 2–3): mujair di kisaran harga bawah, nila di kisaran atas. Termasuk hasil tangkap Waduk Mrica/Serayu.",
  },
  {
    nama: "Ikan Gabus & Belut",
    kelompok: "tawar",
    deskripsi:
      "Sering ditemukan di pasar tradisional seperti Pasar Ikan Purwanegara untuk kebutuhan konsumsi khusus atau olahan tradisional.",
    hargaMin: 50_000,
    hargaMax: 65_000,
    pangsa: 9,
    catatan: "Umumnya hasil tangkap perairan umum/sawah, bukan budidaya.",
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
