/**
 * penduduk.ts — Jumlah Penduduk per kecamatan Kab. Banjarnegara (tahun 2023).
 *
 * SUMBER: Kementerian Agama (KEMENAG) — "Banyaknya Penduduk Menurut Kecamatan
 * dan Agama", file master data Kab. Banjarnegara (folder 25. KEMENAG,
 * "Jumlah Penduduk Sesuai Agamanya", tahun 2023).
 *
 * Nilai = TOTAL seluruh agama (Islam + Protestan + Katolik + Hindu + Budha +
 * Lainnya) per kecamatan, sehingga setara jumlah penduduk (jiwa).
 *
 * CATATAN KUALITAS DATA (penting, diverifikasi 24 Sep 2026):
 *   - Tahun 2022 & 2023 bersih: pertumbuhan antar-tahun halus (~0,44%/th),
 *     distribusi per kecamatan wajar.
 *   - Tahun 2024 TIDAK DIPAKAI: baris per-kecamatan geser/rusak (mis. Banjarnegara
 *     -51%, Mandiraja -46%, Karangkobar +168%, Sigaluh +150%, bahkan kolom agama
 *     ikut acak — jelas kesalahan input sumber). Total kabupaten 2024 (1.068.178)
 *     wajar, tetapi distribusi per-kecamatan tidak valid.
 *   - CSV sumber header-nya salah label ("Masjid/Mushola/…" padahal berisi
 *     "Islam/Protestan/…"); angka yang valid diambil dari xlsx asli.
 *
 * KEGUNAAN: input Rasio Ketersediaan Pangan (halaman /food-security) —
 *   Kebutuhan beras = penduduk × 114 kg/tahun.
 *
 * Update: cukup sunting angka di bawah bila ada data penduduk yang lebih baru.
 */

export interface PendudukKecamatan {
  kecamatan: string;
  /** jumlah penduduk tahun 2023 (jiwa), total seluruh agama */
  penduduk: number;
  tahun: number;
}

export const PENDUDUK_2023: PendudukKecamatan[] = [
  { kecamatan: "Banjarmangu", penduduk: 47859, tahun: 2023 },
  { kecamatan: "Banjarnegara", penduduk: 69619, tahun: 2023 },
  { kecamatan: "Batur", penduduk: 47469, tahun: 2023 },
  { kecamatan: "Bawang", penduduk: 63755, tahun: 2023 },
  { kecamatan: "Kalibening", penduduk: 46863, tahun: 2023 },
  { kecamatan: "Karangkobar", penduduk: 32097, tahun: 2023 },
  { kecamatan: "Madukara", penduduk: 46778, tahun: 2023 },
  { kecamatan: "Mandiraja", penduduk: 80650, tahun: 2023 },
  { kecamatan: "Pagedongan", penduduk: 44185, tahun: 2023 },
  { kecamatan: "Pagentan", penduduk: 39463, tahun: 2023 },
  { kecamatan: "Pandanarum", penduduk: 23392, tahun: 2023 },
  { kecamatan: "Pejawaran", penduduk: 47396, tahun: 2023 },
  { kecamatan: "Punggelan", penduduk: 93157, tahun: 2023 },
  { kecamatan: "Purwanegara", penduduk: 88049, tahun: 2023 },
  { kecamatan: "Purwareja Klampok", penduduk: 50902, tahun: 2023 },
  { kecamatan: "Rakit", penduduk: 56034, tahun: 2023 },
  { kecamatan: "Sigaluh", penduduk: 33186, tahun: 2023 },
  { kecamatan: "Susukan", penduduk: 64711, tahun: 2023 },
  { kecamatan: "Wanadadi", penduduk: 35438, tahun: 2023 },
  { kecamatan: "Wanayasa", penduduk: 52991, tahun: 2023 },
];

/** Total penduduk kabupaten 2023 (hasil penjumlahan entri di atas). */
export const TOTAL_PENDUDUK_2023 = 1063994;

// Amankan agar total konsisten dengan jumlah entri (validasi ringan).
const _sumCheck = PENDUDUK_2023.reduce((acc, p) => acc + p.penduduk, 0);
if (_sumCheck !== TOTAL_PENDUDUK_2023) {
  console.warn(
    `penduduk.ts: total entri (${_sumCheck}) tidak sama dengan TOTAL_PENDUDUK_2023 (${TOTAL_PENDUDUK_2023}) — periksa data.`,
  );
}
