/**
 * nilai-ekonomi-estimasi.ts — Komposisi estimasi Nilai Ekonomi per bidang.
 *
 * PRINSIP:
 *  - TIDAK menambah fetcher baru ke src/services/api.ts (file itu dikerjakan
 *    sesi lain) — modul ini murni MENGOMPOSISIKAN fetcher existing.
 *  - Harga TIDAK hardcode di komponen — semua dari src/data/harga-referensi.ts.
 *  - Kelas sumber jujur: "resmi-live" (Bappebti), "indikatif" (perlu verifikasi),
 *    "tanpa-harga" (harga referensi belum tersedia — subtotal tidak dihitung).
 *  - Struktur output di-align dengan schema tabel nilai_ekonomi_tahunan
 *    (endpoint /api/v1/nilai-ekonomi, data resmi datang 23 Sep 2026) agar
 *    halaman tinggal menukar sumber saat data resmi tersedia.
 */

import {
  API_BASE,
  fetchPadiSawahLadang,
  fetchJagungUbiKayu,
  fetchKacangKedelai,
  fetchUbiKacangHijau,
  fetchVegetableProduction,
  fetchFruitProduction,
  fetchPlantationProduction,
  fetchTernakBesar,
  fetchTernakKecil,
  fetchUnggas,
} from "@/services/api";
import { HARGA_PANGAN, HARGA_HORTI, HARGA_KEBUN, HARGA_DAGING, type HargaRef } from "@/data/harga-referensi";

export const BIDANG_NILAI_EKONOMI = [
  "pangan",
  "hortikultura",
  "perkebunan",
  "peternakan",
] as const;

export type BidangKey = (typeof BIDANG_NILAI_EKONOMI)[number];

export interface BidangMeta {
  /** label nav pendek */
  label: string;
  /** judul halaman */
  judul: string;
  /** subjudul deskriptif */
  tagline: string;
  /** ikon lucide key — dipetakan di halaman */
  ikon: "wheat" | "carrot" | "coffee" | "beef";
  /** catatan metode per bidang (ditampilkan di disklosur) */
  catatan: string[];
}

export const CATATAN_BOBOT_POTONG =
  "Asumsi bobot potong (kg/ekor): sapi 350, kerbau 300, kambing 35, domba 30, babi 70, " +
  "kelinci 2, ayam kampung 1, layer 1,5 (afkir), broiler 1,8, itik 1,3, entok 2 — " +
  "parameter teknis standar, bukan angka BPS.";

export const BIDANG_META: Record<BidangKey, BidangMeta> = {
  pangan: {
    label: "Pangan",
    judul: "Nilai Ekonomi Tanaman Pangan",
    tagline:
      "Estimasi nilai produksi padi & palawija: volume BPS × harga referensi tingkat petani.",
    ikon: "wheat",
    catatan: [
      "Volume = produksi tahunan BPS Distankan (ton). Padi dinilai sebagai GABAH kering panen.",
      "Estimasi = ton × 1.000 kg × harga referensi Rp/kg (Bappebti resmi-live / indikatif).",
    ],
  },
  hortikultura: {
    label: "Hortikultura",
    judul: "Nilai Ekonomi Hortikultura",
    tagline:
      "Estimasi nilai produksi sayuran & buah: volume BPS × harga referensi tingkat petani.",
    ikon: "carrot",
    catatan: [
      "Volume = produksi sayuran (musiman) & buah tahunan BPS Distankan (ton).",
      "Estimasi = ton × 1.000 kg × harga referensi Rp/kg (Bappebti resmi-live / indikatif).",
    ],
  },
  perkebunan: {
    label: "Perkebunan",
    judul: "Nilai Ekonomi Perkebunan",
    tagline:
      "Estimasi nilai produksi perkebunan rakyat: volume BPS × harga referensi tingkat petani.",
    ikon: "coffee",
    catatan: [
      "Volume = produksi perkebunan BPS Distankan (ton).",
      "Kelapa sawit dinilai per kg TBS (buah segar), teh per pucuk basah, tebu per batang giling.",
      "Estimasi = ton × 1.000 kg × harga referensi Rp/kg (Bappebti resmi-live / indikatif).",
    ],
  },
  peternakan: {
    label: "Peternakan",
    judul: "Nilai Ekonomi Peternakan",
    tagline:
      "Estimasi nilai populasi ternak: ekor × asumsi bobot potong × harga daging referensi.",
    ikon: "beef",
    catatan: [
      CATATAN_BOBOT_POTONG,
      "Ini estimasi nilai POPULASI bila seluruh ternak dipotong — BUKAN nilai produksi tahunan (offtake riil jauh lebih kecil).",
      "Harga referensi telur (HARGA_TELUR) dan susu/kulit (HARGA_SUSUKULIT) telah tersedia di modul harga; volume produksinya menyusul dataset resmi.",
      "Kuda dinilai sebagai hewan kerja (bukan daging) — harga referensi tidak relevan; kelinci belum ada harga referensi.",
    ],
  },
};

export type KelasEstimasi = "resmi-live" | "indikatif" | "tanpa-harga";

/** Satu baris estimasi mentah per (kecamatan, tahun, komoditas). */
export interface EstimasiUnit {
  kecamatan: string;
  tahun: string;
  komoditas: string;
  /** volume dalam satuan asli dataset (ton / ekor / kg) */
  volume: number;
  satuanVolume: string;
  /** volume dikonversi ke kg (ton×1.000 atau ekor×bobot potong) */
  konversiKg: number;
  /** harga referensi per satuanHarga; null = belum ada harga (subtotal tidak dihitung) */
  hargaRp: number | null;
  satuanHarga: string;
  kelas: KelasEstimasi;
  sumber: string;
  /** nilai aktual langsung dari dataset resmi (disiapkan utk /v1/nilai-ekonomi nanti) */
  nilaiRpLangsung?: number;
  catatan?: string;
  /** asumsi bobot potong (khusus peternakan) */
  bobotKgPerEkor?: number;
}

/** Subtotal satu unit; null bila tidak bisa dihitung (harga belum tersedia). */
export const subtotalUnit = (u: EstimasiUnit): number | null =>
  u.nilaiRpLangsung ?? (u.hargaRp != null ? u.konversiKg * u.hargaRp : null);

/* ---------- helper pembangun unit ---------- */

const unitDariTon = (
  kecamatan: string,
  tahun: string,
  komoditas: string,
  ton: number,
  harga?: HargaRef,
): EstimasiUnit => ({
  kecamatan,
  tahun,
  komoditas,
  volume: ton,
  satuanVolume: "ton",
  konversiKg: ton * 1000,
  hargaRp: harga?.hargaRp ?? null,
  satuanHarga: harga?.satuan ?? "kg",
  kelas: harga ? harga.jenisSumber : "tanpa-harga",
  sumber: harga?.sumber ?? "Harga referensi belum tersedia — menyusul verifikasi",
});

const unitTernak = (
  kecamatan: string,
  tahun: string,
  komoditas: string,
  ekor: number,
  hargaKey: string | null,
  bobot: number,
  catatan?: string,
): EstimasiUnit => {
  const harga = hargaKey != null ? HARGA_DAGING[hargaKey] : undefined;
  return {
    kecamatan,
    tahun,
    komoditas,
    volume: ekor,
    satuanVolume: "ekor",
    konversiKg: ekor * bobot,
    hargaRp: harga?.hargaRp ?? null,
    satuanHarga: harga?.satuan ?? "kg",
    kelas: harga ? harga.jenisSumber : "tanpa-harga",
    sumber: harga?.sumber ?? "Harga referensi belum tersedia — menyusul verifikasi",
    catatan,
    bobotKgPerEkor: bobot,
  };
};

const asNumber = (row: unknown, field: string): number => {
  const v = (row as Record<string, unknown>)[field];
  return typeof v === "number" ? v : 0;
};

/* ---------- peta field → komoditas ---------- */

const VEG_FIELDS: { field: string; komoditas: string }[] = [
  { field: "bawangMerah", komoditas: "Bawang Merah" },
  { field: "bawangPutih", komoditas: "Bawang Putih" },
  { field: "cabaiBesar", komoditas: "Cabai Besar" },
  { field: "cabaiRawit", komoditas: "Cabai Rawit" },
  { field: "kentang", komoditas: "Kentang" },
  { field: "kubis", komoditas: "Kubis" },
  { field: "petsai", komoditas: "Petsai" },
  { field: "tomat", komoditas: "Tomat" },
];

const BUAH_FIELDS: { field: string; komoditas: string }[] = [
  { field: "mangga", komoditas: "Mangga" },
  { field: "durian", komoditas: "Durian" },
  { field: "jerukBesar", komoditas: "Jeruk Besar" },
  { field: "jerukSiam", komoditas: "Jeruk Siam" },
  { field: "pisang", komoditas: "Pisang" },
  { field: "pepaya", komoditas: "Pepaya" },
  { field: "salak", komoditas: "Salak" },
];

const KEBUN_FIELDS: { field: string; komoditas: string }[] = [
  { field: "kelapaSawit", komoditas: "Kelapa Sawit" },
  { field: "kelapaDalam", komoditas: "Kelapa Dalam" },
  { field: "karet", komoditas: "Karet" },
  { field: "kopiRobusta", komoditas: "Kopi Robusta" },
  { field: "kakao", komoditas: "Kakao" },
  { field: "tebu", komoditas: "Tebu" },
  { field: "teh", komoditas: "Teh" },
  { field: "tembakau", komoditas: "Tembakau" },
];

const TERNAK_BESAR_FIELDS: {
  field: string;
  komoditas: string;
  hargaKey: string | null;
  bobot: number;
  catatan?: string;
}[] = [
  { field: "sapi", komoditas: "Sapi", hargaKey: "Sapi", bobot: 350 },
  {
    field: "sapiPerah",
    komoditas: "Sapi Perah",
    hargaKey: "Sapi",
    bobot: 350,
    catatan: "dinilai sebagai daging sapi (asumsi — harga susu menunggu volume resmi)",
  },
  { field: "kerbau", komoditas: "Kerbau", hargaKey: "Kerbau", bobot: 300 },
  {
    field: "kuda",
    komoditas: "Kuda",
    hargaKey: null,
    bobot: 300,
    catatan: "hewan kerja — nilai daging tidak relevan/tidak tersedia",
  },
];

const TERNAK_KECIL_FIELDS: {
  field: string;
  komoditas: string;
  hargaKey: string | null;
  bobot: number;
  catatan?: string;
}[] = [
  { field: "kambing", komoditas: "Kambing", hargaKey: "Kambing", bobot: 35 },
  { field: "domba", komoditas: "Domba", hargaKey: "Domba", bobot: 30 },
  { field: "babi", komoditas: "Babi", hargaKey: "Babi", bobot: 70 },
  {
    field: "kelinci",
    komoditas: "Kelinci",
    hargaKey: null,
    bobot: 2,
    catatan: "harga referensi belum tersedia",
  },
];

const UNGGAS_FIELDS: {
  field: string;
  komoditas: string;
  hargaKey: string | null;
  bobot: number;
  catatan?: string;
}[] = [
  { field: "ayamKampung", komoditas: "Ayam Kampung", hargaKey: "Ayam Kampung", bobot: 1 },
  {
    field: "ayamRasLayer",
    komoditas: "Ayam Ras Layer",
    hargaKey: "Ayam Ras Layer",
    bobot: 1.5,
    catatan: "daging afkir — produksi telur menunggu volume resmi",
  },
  { field: "ayamBroiler", komoditas: "Ayam Broiler", hargaKey: "Ayam Broiler", bobot: 1.8 },
  { field: "itikBiasa", komoditas: "Itik", hargaKey: "Itik", bobot: 1.3 },
  { field: "itikManila", komoditas: "Entok (Itik Manila)", hargaKey: "Entok (Itik Manila)", bobot: 2 },
];

/* ---------- loader utama ---------- */

export async function loadEstimasiUnit(bidang: BidangKey): Promise<EstimasiUnit[]> {
  const units: EstimasiUnit[] = [];

  if (bidang === "pangan") {
    const [padi, jagungUbi, kacangKedelai, ubiHijau] = await Promise.all([
      fetchPadiSawahLadang(),
      fetchJagungUbiKayu(),
      fetchKacangKedelai(),
      fetchUbiKacangHijau(),
    ]);
    [...padi, ...jagungUbi, ...kacangKedelai, ...ubiHijau].forEach((row) => {
      row.items.forEach((it) => {
        if (it.produksi > 0)
          units.push(
            unitDariTon(row.kecamatan, row.tahun, it.komoditas, it.produksi, HARGA_PANGAN[it.komoditas]),
          );
      });
    });
    return units;
  }

  if (bidang === "hortikultura") {
    const [sayur, buah] = await Promise.all([fetchVegetableProduction(), fetchFruitProduction()]);
    sayur.forEach((row) => {
      VEG_FIELDS.forEach(({ field, komoditas }) => {
        const ton = asNumber(row, field);
        if (ton > 0) units.push(unitDariTon(row.kecamatan, row.tahun, komoditas, ton, HARGA_HORTI[komoditas]));
      });
    });
    buah.forEach((row) => {
      BUAH_FIELDS.forEach(({ field, komoditas }) => {
        const ton = asNumber(row, field);
        if (ton > 0) units.push(unitDariTon(row.kecamatan, row.tahun, komoditas, ton, HARGA_HORTI[komoditas]));
      });
    });
    return units;
  }

  if (bidang === "perkebunan") {
    const rows = await fetchPlantationProduction();
    rows.forEach((row) => {
      KEBUN_FIELDS.forEach(({ field, komoditas }) => {
        const ton = asNumber(row, field);
        if (ton > 0) units.push(unitDariTon(row.kecamatan, row.tahun, komoditas, ton, HARGA_KEBUN[komoditas]));
      });
    });
    return units;
  }

  if (bidang === "peternakan") {
    const [besar, kecil, unggas] = await Promise.all([
      fetchTernakBesar(),
      fetchTernakKecil(),
      fetchUnggas(),
    ]);
    besar.forEach((row) => {
      TERNAK_BESAR_FIELDS.forEach((m) => {
        const ekor = asNumber(row, m.field);
        if (ekor > 0) units.push(unitTernak(row.kecamatan, row.tahun, m.komoditas, ekor, m.hargaKey, m.bobot, m.catatan));
      });
    });
    kecil.forEach((row) => {
      TERNAK_KECIL_FIELDS.forEach((m) => {
        const ekor = asNumber(row, m.field);
        if (ekor > 0) units.push(unitTernak(row.kecamatan, row.tahun, m.komoditas, ekor, m.hargaKey, m.bobot, m.catatan));
      });
    });
    unggas.forEach((row) => {
      UNGGAS_FIELDS.forEach((m) => {
        const ekor = asNumber(row, m.field);
        if (ekor > 0) units.push(unitTernak(row.kecamatan, row.tahun, m.komoditas, ekor, m.hargaKey, m.bobot, m.catatan));
      });
    });
    return units;
  }

  // bidang perikanan tidak diestimasi di sini — nilai produksi aktual
  // perikanan ditampilkan halaman kanonik /economic-value (budidaya+tangkap).
  return units;
}

/* ---------- data resmi (tabel nilai_ekonomi_tahunan) ---------- */

export interface NilaiEkonomiResmiRow {
  komoditas: string;
  satuan: string;
  tahun: number;
  /** 1-4; null = baris tahunan */
  triwulan: number | null;
  volume: number;
  hargaProdusen: number;
  nilaiRp: number;
}

/**
 * Data resmi nilai ekonomi dari backend (tabel nilai_ekonomi_tahunan —
 * input Dinas via dasbor admin; endpoint /api/v1/ekonomi/nilai-ekonomi).
 * Return null bila endpoint gagal / tabel kosong → halaman tetap memakai
 * mode estimasi harga referensi (pola auto-upgrade, keputusan notulen #4).
 * Semester diturunkan klien: S1 = T1+T2, S2 = T3+T4.
 */
export async function fetchNilaiEkonomiResmi(
  bidang: BidangKey,
): Promise<NilaiEkonomiResmiRow[] | null> {
  try {
    const res = await fetch(
      `${API_BASE}/v1/ekonomi/nilai-ekonomi?bidang=${encodeURIComponent(bidang)}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { rows?: NilaiEkonomiResmiRow[] };
    return Array.isArray(body.rows) && body.rows.length > 0 ? body.rows : null;
  } catch {
    return null;
  }
}
