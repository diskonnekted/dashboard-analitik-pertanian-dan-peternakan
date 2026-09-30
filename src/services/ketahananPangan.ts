/**
 * ketahananPangan.ts — Kerangka 3 Pilar Ketahanan Pangan (FAO / Badan Pangan Nasional)
 *                        + Neraca Kalori berbasis produksi lokal.
 *
 * Latar belakang: data ketiga pilar sebelumnya tersebar di empat halaman berbeda
 * tanpa kerangka pemersatu — /food-security (ketersediaan beras), /fsva (indikator
 * lintas pilar), /price-volatility (harga/daya beli), /supply-chain (distribusi).
 * Modul ini menyatukan ketiganya dan menambah Neraca Kalori yang diminta
 * gap-analysis-master.md baris 6 ("Neraca kalori baku Penduduk x 2.100 kkal/hari").
 *
 * PRINSIP PERHITUNGAN (penting untuk audit):
 *   1. Tidak ada angka yang dikarang. Semua input berasal dari fetcher resmi di
 *      services/api.ts (jalur MySQL -> CKAN -> CSV BPS) dan data statis bersumber
 *      jelas (penduduk KEMENAG 2023, FSVA Bapanas 2021-2024).
 *   2. Seluruh faktor konversi dipusatkan di FAKTOR_KALORI agar mudah diperiksa
 *      dan disesuaikan tanpa menyentuh logika perhitungan.
 *   3. Yang tidak bisa dihitung dinyatakan terbuka (lihat DIKECUALIKAN_DARI_NERACA
 *      dan CELAH_DATA_PILAR), bukan diisi perkiraan.
 */

import {
  fetchDagingUnggas,
  fetchJagungUbiKayu,
  fetchKacangKedelai,
  fetchLumbungPangan,
  fetchPadiProduction,
  fetchPenduduk,
  fetchPerikananBudidaya,
  fetchPerikananTangkap,
  fetchTernakDaging,
  fetchTernakTelur,
  fetchUbiKacangHijau,
} from "@/services/api";
import {
  FSVA_DATA,
  FSVA_INDICATORS,
  FSVA_YEARS,
  kompositLabel,
  type FsvaDesa,
  type FsvaIndicatorDef,
  type FsvaIndicatorKey,
  type FsvaYear,
} from "@/data/fsva";

// ---------------------------------------------------------------------------
// Konstanta kebutuhan (standar Bapanas / WNPG)
// ---------------------------------------------------------------------------

/** Angka kecukupan energi minimal per kapita per hari (kkal) — standar Bapanas/WNPG. */
export const KEBUTUHAN_KKAL_PER_KAPITA_HARI = 2100;

/** Hari per tahun untuk konversi kebutuhan tahunan. */
export const HARI_PER_TAHUN = 365;

/** Kebutuhan energi per kapita per tahun (kkal) = 2.100 x 365 = 766.500. */
export const KEBUTUHAN_KKAL_PER_KAPITA_TAHUN =
  KEBUTUHAN_KKAL_PER_KAPITA_HARI * HARI_PER_TAHUN;

/**
 * Rendemen gabah kering giling (GKG) -> beras. 0,64 = konvensi Bapanas/BPS,
 * faktor yang sama dengan halaman /food-security supaya kedua halaman konsisten.
 */
export const RENDEMEN_BERAS = 0.64;

/** Berat rata-rata satu butir telur (kg). Rentang umum 55-65 gram. */
export const KG_PER_BUTIR_TELUR = 0.06;

// ---------------------------------------------------------------------------
// Tabel faktor konversi produksi -> energi
// ---------------------------------------------------------------------------

export type KelompokPangan = "Padi & Beras" | "Palawija" | "Peternakan" | "Perikanan";

export const KELOMPOK_PANGAN: KelompokPangan[] = [
  "Padi & Beras",
  "Palawija",
  "Peternakan",
  "Perikanan",
];

export interface FaktorKalori {
  /** Kunci internal — dipakai mencocokkan dengan label sumber data. */
  kunci: string;
  /** Label tampil di tabel rincian. */
  label: string;
  kelompok: KelompokPangan;
  /** Satuan pada sumber data (ton GKG / ton / kg / butir). */
  satuanData: string;
  /**
   * Pengali dari satuan data ke kilogram bagian-dapat-dimakan (BDD).
   * Contoh: padi 640 = 0,64 rendemen x 1.000 kg/ton.
   */
  faktorKeKg: number;
  /** Energi per kilogram BDD = (kkal per 100 gram) x 10. */
  kkalPerKg: number;
  /** Dasar penetapan faktor — ditampilkan di catatan metodologi. */
  dasar: string;
}

/**
 * Nilai energi memakai Tabel Komposisi Pangan Indonesia (TKPI, Kemenkes RI);
 * faktor BDD/rendemen memakai konvensi Neraca Bahan Makanan (NBM) Bapanas.
 */
export const FAKTOR_KALORI: FaktorKalori[] = [
  {
    kunci: "beras",
    label: "Beras (dari padi GKG)",
    kelompok: "Padi & Beras",
    satuanData: "ton GKG",
    faktorKeKg: RENDEMEN_BERAS * 1000,
    kkalPerKg: 3600,
    dasar: "Rendemen GKG->beras 64% (Bapanas); beras giling 360 kkal/100 g (TKPI)",
  },
  {
    kunci: "jagung",
    label: "Jagung pipilan kering",
    kelompok: "Palawija",
    satuanData: "ton",
    faktorKeKg: 1000,
    kkalPerKg: 3550,
    dasar: "Jagung kuning pipil 355 kkal/100 g (TKPI); pipilan kering sudah berupa biji",
  },
  {
    kunci: "ubi kayu",
    label: "Ubi kayu",
    kelompok: "Palawija",
    satuanData: "ton",
    faktorKeKg: 750,
    kkalPerKg: 1460,
    dasar: "Ubi kayu 146 kkal/100 g, BDD 75% (TKPI)",
  },
  {
    kunci: "ubi jalar",
    label: "Ubi jalar",
    kelompok: "Palawija",
    satuanData: "ton",
    faktorKeKg: 860,
    kkalPerKg: 1230,
    dasar: "Ubi jalar 123 kkal/100 g, BDD 86% (TKPI)",
  },
  {
    kunci: "kedelai",
    label: "Kedelai",
    kelompok: "Palawija",
    satuanData: "ton",
    faktorKeKg: 1000,
    kkalPerKg: 3810,
    dasar: "Kedelai 381 kkal/100 g (TKPI); biji kering",
  },
  {
    kunci: "kacang tanah",
    label: "Kacang tanah",
    kelompok: "Palawija",
    satuanData: "ton",
    faktorKeKg: 1000,
    kkalPerKg: 5250,
    dasar: "Kacang tanah 525 kkal/100 g (TKPI); biji kering",
  },
  {
    kunci: "kacang hijau",
    label: "Kacang hijau",
    kelompok: "Palawija",
    satuanData: "ton",
    faktorKeKg: 1000,
    kkalPerKg: 3450,
    dasar: "Kacang hijau 345 kkal/100 g (TKPI); biji kering",
  },
  {
    kunci: "daging sapi",
    label: "Daging sapi",
    kelompok: "Peternakan",
    satuanData: "kg",
    faktorKeKg: 1,
    kkalPerKg: 2070,
    dasar: "Daging sapi 207 kkal/100 g (TKPI)",
  },
  {
    kunci: "daging kerbau",
    label: "Daging kerbau",
    kelompok: "Peternakan",
    satuanData: "kg",
    faktorKeKg: 1,
    kkalPerKg: 1100,
    dasar: "Daging kerbau 110 kkal/100 g (TKPI)",
  },
  {
    kunci: "daging kambing",
    label: "Daging kambing",
    kelompok: "Peternakan",
    satuanData: "kg",
    faktorKeKg: 1,
    kkalPerKg: 1540,
    dasar: "Daging kambing 154 kkal/100 g (TKPI)",
  },
  {
    kunci: "daging domba",
    label: "Daging domba",
    kelompok: "Peternakan",
    satuanData: "kg",
    faktorKeKg: 1,
    kkalPerKg: 2060,
    dasar: "Daging domba 206 kkal/100 g (TKPI)",
  },
  {
    kunci: "daging babi",
    label: "Daging babi",
    kelompok: "Peternakan",
    satuanData: "kg",
    faktorKeKg: 1,
    kkalPerKg: 3010,
    dasar: "Daging babi 301 kkal/100 g (TKPI)",
  },
  {
    kunci: "daging ayam",
    label: "Daging ayam (ras & kampung)",
    kelompok: "Peternakan",
    satuanData: "kg",
    faktorKeKg: 1,
    kkalPerKg: 3020,
    dasar: "Daging ayam 302 kkal/100 g (TKPI); gabungan Ayam Ras Layer + Ayam Kampung",
  },
  {
    kunci: "telur ayam",
    label: "Telur ayam (ras & kampung)",
    kelompok: "Peternakan",
    satuanData: "butir",
    faktorKeKg: KG_PER_BUTIR_TELUR,
    kkalPerKg: 1540,
    dasar: "Telur ayam 154 kkal/100 g (TKPI); 1 butir ~60 g -> ~92 kkal/butir",
  },
  {
    kunci: "telur itik",
    label: "Telur itik",
    kelompok: "Peternakan",
    satuanData: "butir",
    faktorKeKg: KG_PER_BUTIR_TELUR,
    kkalPerKg: 1890,
    dasar: "Telur itik 189 kkal/100 g (TKPI); 1 butir ~60 g -> ~113 kkal/butir",
  },
  {
    kunci: "ikan budidaya",
    label: "Ikan budidaya",
    kelompok: "Perikanan",
    satuanData: "kg",
    faktorKeKg: 1,
    kkalPerKg: 1000,
    dasar: "Ikan air tawar segar ~100 kkal/100 g (TKPI, rata-rata lele/nila/mas)",
  },
  {
    kunci: "ikan tangkap",
    label: "Ikan tangkapan perairan umum",
    kelompok: "Perikanan",
    satuanData: "kg",
    faktorKeKg: 1,
    kkalPerKg: 1050,
    dasar: "Ikan air tawar segar ~105 kkal/100 g (TKPI)",
  },
];

const FAKTOR_BY_KUNCI: Record<string, FaktorKalori> = Object.fromEntries(
  FAKTOR_KALORI.map((f) => [f.kunci, f]),
);

/** Label sumber data (komoditas/jenis ternak) -> kunci faktor. */
const PETA_PALAWIJA: Record<string, string> = {
  Jagung: "jagung",
  "Ubi Kayu": "ubi kayu",
  "Ubi Jalar": "ubi jalar",
  Kedelai: "kedelai",
  "Kacang Tanah": "kacang tanah",
  "Kacang Hijau": "kacang hijau",
};

const PETA_DAGING: Record<string, string> = {
  Sapi: "daging sapi",
  Kerbau: "daging kerbau",
  Kambing: "daging kambing",
  Domba: "daging domba",
  Babi: "daging babi",
  "Ayam Ras Layer": "daging ayam",
  "Ayam Kampung": "daging ayam",
};

const PETA_TELUR: Record<string, string> = {
  "Ayam Ras Layer": "telur ayam",
  "Ayam Kampung": "telur ayam",
  Itik: "telur itik",
};

/**
 * Sumber pangan yang TIDAK dimasukkan ke neraca kalori, beserta alasannya.
 * Ditampilkan di halaman agar pembaca tahu batas cakupan perhitungan.
 */
export const DIKECUALIKAN_DARI_NERACA: { label: string; alasan: string }[] = [
  {
    label: "Sayuran & buah (20 komoditas)",
    alasan:
      "Kontribusi energi kecil (<5% total kkal) tetapi penting untuk mutu gizi/PPH — tetap dipantau di /horticulture.",
  },
  {
    label: "Susu sapi",
    alasan:
      "Sumber data 'Jumlah Produksi Kulit dan Susu' menyimpan kulit (lembar) dan susu (liter) dalam satu kolom bergantian, sehingga volume susu tidak dapat dipisahkan dengan andal. Tidak dimasukkan agar tidak menebak.",
  },
  {
    label: "Kulit ternak",
    alasan: "Bukan produk pangan (satuan lembar).",
  },
  {
    label: "Pangan olahan & industri",
    alasan: "Tidak ada data produksi pangan olahan per kecamatan.",
  },
];

// ---------------------------------------------------------------------------
// Status neraca kalori
// ---------------------------------------------------------------------------

export type StatusKalori = "Swasembada" | "Surplus" | "Defisit" | "Kurang";

/**
 * Ambang status mengikuti istilah gap-analysis-master.md (Swasembada/Surplus/Kurang)
 * dengan satu tingkat tambahan "Defisit" untuk rentang 75-100%.
 *   rasio >= 1,25  -> Swasembada (produksi lokal menutup kebutuhan + margin besar)
 *   1,00 - 1,25    -> Surplus
 *   0,75 - 1,00    -> Defisit (masih butuh pasokan luar, taraf ringan)
 *   < 0,75         -> Kurang  (bergantung besar pada pasokan luar)
 */
export function statusKalori(rasio: number): StatusKalori {
  if (rasio >= 1.25) return "Swasembada";
  if (rasio >= 1.0) return "Surplus";
  if (rasio >= 0.75) return "Defisit";
  return "Kurang";
}

export const STATUS_KALORI_WARNA: Record<StatusKalori, string> = {
  Swasembada: "bg-emerald-100 text-emerald-900 border-emerald-300",
  Surplus: "bg-teal-100 text-teal-900 border-teal-300",
  Defisit: "bg-amber-100 text-amber-900 border-amber-300",
  Kurang: "bg-rose-100 text-rose-900 border-rose-300",
};

export const STATUS_KALORI_BAR: Record<StatusKalori, string> = {
  Swasembada: "bg-emerald-600",
  Surplus: "bg-teal-600",
  Defisit: "bg-amber-500",
  Kurang: "bg-rose-600",
};

// ---------------------------------------------------------------------------
// Normalisasi nama kecamatan
// ---------------------------------------------------------------------------

/** Varian ejaan yang masih mungkin lolos dari normalisasi services/api.ts. */
const VARIAN_KECAMATAN: Record<string, string> = {
  purwonegoro: "purwanegara",
  "purworejo klampok": "purwareja klampok",
};

const normKec = (raw: unknown): string => {
  let s = String(raw ?? "").trim();
  s = s.replace(/^kec(?:amatan)?\.?\s+/i, "").replace(/^kel(?:urahan)?\.?\s+/i, "");
  s = s.replace(/\s+/g, " ").replace(/[^\w\s-]/g, "").trim();
  const low = s.toLowerCase();
  return VARIAN_KECAMATAN[low] ?? low;
};

// ---------------------------------------------------------------------------
// Neraca kalori
// ---------------------------------------------------------------------------

export interface RincianKomoditas {
  kunci: string;
  label: string;
  kelompok: KelompokPangan;
  produksi: number;
  satuanData: string;
  kgBdd: number;
  kkal: number;
}

export interface NeracaKaloriBaris {
  kecamatan: string;
  tahun: string;
  rincian: RincianKomoditas[];
  totalKkal: number;
  penduduk: number;
  kebutuhanKkal: number;
  tersediaKkalPerKapitaHari: number;
  /** tersedia / 2.100 kkal */
  rasio: number;
  selisihKkal: number;
  status: StatusKalori;
  /** Kelompok pangan yang benar-benar punya data pada tahun ini. */
  kelompokHadir: KelompokPangan[];
  /** "Parsial" bila ada kelompok pangan tanpa data pada tahun tersebut. */
  cakupan: "Lengkap" | "Parsial";
}

export interface NeracaKaloriHasil {
  baris: NeracaKaloriBaris[];
  tahunTersedia: string[];
  /** Tahun dengan cakupan empat kelompok pangan terlengkap. */
  tahunReferensi: string;
  /** Jumlah baris yang tidak punya data penduduk (dibuang dari perhitungan). */
  tanpaPenduduk: number;
  /**
   * Seluruh kecamatan yang punya data penduduk. Dipakai halaman untuk menyatakan
   * kecamatan mana yang TIDAK ikut neraca pada suatu tahun (mis. tanpa data padi),
   * agar tidak hilang diam-diam dari tabel.
   */
  kecamatanSemua: string[];
}

type Akumulator = Map<string, Map<string, Map<string, number>>>; // kec -> tahun -> kunci -> produksi

const tambahProduksi = (
  ak: Akumulator,
  kecamatan: unknown,
  tahun: unknown,
  kunci: string,
  nilai: number,
) => {
  if (!Number.isFinite(nilai) || nilai <= 0) return;
  const kec = normKec(kecamatan);
  const th = String(tahun ?? "").trim();
  if (!kec || !th) return;
  let perTahun = ak.get(kec);
  if (!perTahun) {
    perTahun = new Map();
    ak.set(kec, perTahun);
  }
  let perKomoditas = perTahun.get(th);
  if (!perKomoditas) {
    perKomoditas = new Map();
    perTahun.set(th, perKomoditas);
  }
  perKomoditas.set(kunci, (perKomoditas.get(kunci) ?? 0) + nilai);
};

/**
 * Menghitung neraca kalori per kecamatan per tahun dari produksi pangan lokal.
 *
 * Rumus:
 *   totalKkal        = SUM(produksi x faktorKeKg x kkalPerKg)
 *   kebutuhanKkal    = penduduk x 2.100 kkal x 365 hari
 *   tersedia/kapita/hari = totalKkal / penduduk / 365
 *   rasio            = tersedia / 2.100
 *
 * Catatan cakupan: ketersediaan data antar-komoditas tidak seragam (mis. telur
 * dan ikan baru tersedia mulai 2019). Tahun tanpa data padi dibuang karena padi
 * menyumbang sebagian besar energi; tahun yang kehilangan kelompok lain ditandai
 * "Parsial" supaya tidak terbaca sebagai angka lengkap.
 */
export async function fetchNeracaKalori(): Promise<NeracaKaloriHasil> {
  const [padi, jagungUbi, kacangKedelai, ubiHijau, daging, dagingUnggas, telur, budidaya, tangkap, penduduk] =
    await Promise.all([
      fetchPadiProduction().catch(() => []),
      fetchJagungUbiKayu().catch(() => []),
      fetchKacangKedelai().catch(() => []),
      fetchUbiKacangHijau().catch(() => []),
      fetchTernakDaging().catch(() => []),
      fetchDagingUnggas().catch(() => []),
      fetchTernakTelur().catch(() => []),
      fetchPerikananBudidaya().catch(() => []),
      fetchPerikananTangkap().catch(() => []),
      fetchPenduduk().catch(() => []),
    ]);

  const ak: Akumulator = new Map();

  // 1. Padi (GKG) -> beras. Hanya fetchPadiProduction yang dipakai; Padi Sawah
  //    dan Padi Ladang TIDAK ikut agar tidak terjadi hitung ganda.
  for (const r of padi) tambahProduksi(ak, r.kecamatan, r.tahun, "beras", r.produksi);

  // 2. Palawija — tiga berkas CSV, masing-masing dua komoditas pada items[].
  for (const baris of [...jagungUbi, ...kacangKedelai, ...ubiHijau]) {
    for (const it of baris.items ?? []) {
      const kunci = PETA_PALAWIJA[String(it.komoditas ?? "").trim()];
      if (kunci) tambahProduksi(ak, baris.kecamatan, baris.tahun, kunci, it.produksi);
    }
  }

  // 3. Daging ternak besar/kecil + unggas (kg)
  for (const baris of [...daging, ...dagingUnggas]) {
    for (const item of baris.items ?? []) {
      const kunci = PETA_DAGING[String(item.jenis ?? "").trim()];
      if (kunci) tambahProduksi(ak, baris.kecamatan, baris.tahun, kunci, item.jumlah);
    }
  }

  // 4. Telur (BUTIR — bukan kg)
  for (const baris of telur) {
    for (const item of baris.items ?? []) {
      const kunci = PETA_TELUR[String(item.jenis ?? "").trim()];
      if (kunci) tambahProduksi(ak, baris.kecamatan, baris.tahun, kunci, item.jumlah);
    }
  }

  // 5. Perikanan budidaya (kg) — empat metode dijumlahkan
  for (const r of budidaya) {
    const total =
      (r.kolamPembesaran || 0) +
      (r.karambaApung || 0) +
      (r.minaPenyelang || 0) +
      (r.minaTumpangsari || 0);
    tambahProduksi(ak, r.kecamatan, r.tahun, "ikan budidaya", total);
  }

  // 6. Perikanan tangkap perairan umum (kg) — empat alat tangkap dijumlahkan
  for (const r of tangkap) {
    const total =
      (r.jalaTebar || 0) + (r.pancing || 0) + (r.jaringIngsang || 0) + (r.lainnya || 0);
    tambahProduksi(ak, r.kecamatan, r.tahun, "ikan tangkap", total);
  }

  // Penduduk (KEMENAG 2023) — pembanding kebutuhan.
  const pendudukMap: Record<string, number> = {};
  for (const p of penduduk) {
    pendudukMap[normKec(p.kecamatan)] = Number(p.penduduk) || 0;
  }

  const baris: NeracaKaloriBaris[] = [];
  let tanpaPenduduk = 0;

  for (const [kec, perTahun] of ak) {
    const pendudukKec = pendudukMap[kec];
    for (const [tahun, perKomoditas] of perTahun) {
      // Tanpa padi angka neraca tidak berarti (padi dominan) -> lewati.
      if (!perKomoditas.has("beras")) continue;
      if (!pendudukKec) {
        tanpaPenduduk++;
        continue;
      }

      const rincian: RincianKomoditas[] = [];
      let totalKkal = 0;
      const kelompokHadir = new Set<KelompokPangan>();

      for (const [kunci, produksi] of perKomoditas) {
        const faktor = FAKTOR_BY_KUNCI[kunci];
        if (!faktor) continue;
        const kgBdd = produksi * faktor.faktorKeKg;
        const kkal = kgBdd * faktor.kkalPerKg;
        totalKkal += kkal;
        kelompokHadir.add(faktor.kelompok);
        rincian.push({
          kunci,
          label: faktor.label,
          kelompok: faktor.kelompok,
          produksi,
          satuanData: faktor.satuanData,
          kgBdd,
          kkal,
        });
      }

      rincian.sort((a, b) => b.kkal - a.kkal);

      const kebutuhanKkal = pendudukKec * KEBUTUHAN_KKAL_PER_KAPITA_TAHUN;
      const tersediaKkalPerKapitaHari = totalKkal / pendudukKec / HARI_PER_TAHUN;
      const rasio = tersediaKkalPerKapitaHari / KEBUTUHAN_KKAL_PER_KAPITA_HARI;

      baris.push({
        kecamatan: kec,
        tahun,
        rincian,
        totalKkal,
        penduduk: pendudukKec,
        kebutuhanKkal,
        tersediaKkalPerKapitaHari,
        rasio,
        selisihKkal: totalKkal - kebutuhanKkal,
        status: statusKalori(rasio),
        kelompokHadir: KELOMPOK_PANGAN.filter((k) => kelompokHadir.has(k)),
        cakupan: kelompokHadir.size >= KELOMPOK_PANGAN.length ? "Lengkap" : "Parsial",
      });
    }
  }

  baris.sort((a, b) => a.tahun.localeCompare(b.tahun) || a.kecamatan.localeCompare(b.kecamatan));

  const tahunTersedia = Array.from(new Set(baris.map((b) => b.tahun))).sort();

  // Tahun referensi = tahun terbaru dengan jumlah baris "Lengkap" terbanyak,
  // agar ringkasan tidak berdiri di atas tahun yang datanya bolong.
  let tahunReferensi = tahunTersedia[tahunTersedia.length - 1] ?? "";
  let skorTerbaik = -1;
  for (const th of tahunTersedia) {
    const milikTh = baris.filter((b) => b.tahun === th);
    const lengkap = milikTh.filter((b) => b.cakupan === "Lengkap").length;
    const skor = lengkap * 100 + milikTh.length;
    if (skor >= skorTerbaik) {
      skorTerbaik = skor;
      tahunReferensi = th;
    }
  }

  return {
    baris,
    tahunTersedia,
    tahunReferensi,
    tanpaPenduduk,
    kecamatanSemua: Object.keys(pendudukMap).sort(),
  };
}

// ---------------------------------------------------------------------------
// Cadangan pangan (komponen "cadangan" pada pilar ketersediaan)
// ---------------------------------------------------------------------------

export interface CadanganPangan {
  kecamatan: string;
  lumbungUnit: number;
  lumbungKapasitas: number;
  gudangLuas: number;
  gudangKapasitas: number;
}

export async function fetchCadanganPangan(): Promise<CadanganPangan[]> {
  const rows = await fetchLumbungPangan().catch(() => []);
  const byKec = new Map<string, CadanganPangan>();
  for (const r of rows) {
    const kec = normKec(r.kecamatan);
    if (!kec) continue;
    byKec.set(kec, {
      kecamatan: kec,
      lumbungUnit: Number(r.lumbungUnit) || 0,
      lumbungKapasitas: Number(r.lumbungKapasitas) || 0,
      gudangLuas: Number(r.gudangLuas) || 0,
      gudangKapasitas: Number(r.gudangKapasitas) || 0,
    });
  }
  return Array.from(byKec.values()).sort((a, b) => a.kecamatan.localeCompare(b.kecamatan));
}

// ---------------------------------------------------------------------------
// Kerangka 3 pilar (FAO / Bapanas) + agregasi indikator FSVA
// ---------------------------------------------------------------------------

export type PilarKey = "Ketersediaan" | "Keterjangkauan" | "Pemanfaatan";

/** Definisi & cakupan tiga pilar — teks rujukan FAO / Badan Pangan Nasional. */
export const PILAR: {
  key: PilarKey;
  judul: string;
  istilahInggris: string;
  definisi: string;
  cakupan: string;
  /** Kelas warna Tailwind untuk aksen pilar. */
  aksen: string;
  aksenTeks: string;
  aksenBar: string;
}[] = [
  {
    key: "Ketersediaan",
    judul: "Ketersediaan Pangan",
    istilahInggris: "Food Availability",
    definisi: "Kecukupan pasokan pangan secara fisik di suatu wilayah.",
    cakupan:
      "Produksi lokal (tanaman pangan, hortikultura, perkebunan, peternakan, perikanan), cadangan pangan (lumbung & gudang), serta arus pasokan dari luar wilayah.",
    aksen: "border-l-emerald-600",
    aksenTeks: "text-emerald-800",
    aksenBar: "bg-emerald-600",
  },
  {
    key: "Keterjangkauan",
    judul: "Keterjangkauan Pangan",
    istilahInggris: "Food Accessibility",
    definisi: "Kemampuan fisik dan ekonomi masyarakat untuk memperoleh pangan.",
    cakupan:
      "Daya beli konsumen (pendapatan dan harga pasar) serta infrastruktur distribusi yang menghubungkan daerah produsen ke konsumen.",
    aksen: "border-l-sky-600",
    aksenTeks: "text-sky-800",
    aksenBar: "bg-sky-600",
  },
  {
    key: "Pemanfaatan",
    judul: "Pemanfaatan Pangan",
    istilahInggris: "Food Utilization",
    definisi: "Cara tubuh memproses dan menyerap nutrisi dari makanan yang dikonsumsi.",
    cakupan:
      "Kualitas gizi, keamanan pangan dari kontaminasi, kebersihan air, serta angka kesehatan gizi masyarakat (termasuk pencegahan stunting).",
    aksen: "border-l-violet-600",
    aksenTeks: "text-violet-800",
    aksenBar: "bg-violet-600",
  },
];

export interface IndikatorPilarRingkasan {
  kunci: string;
  label: string;
  penjelasan: string;
  pilar: string;
  satuan: string;
  better: "up" | "down";
  tipe: "kontinu" | "kategorikal";
  /** Kontinu = rata-rata antar desa; kategorikal = jumlah desa berstatus "ya". */
  nilai: number;
  formatNilai: string;
  jumlahDesa: number;
}

export interface KecamatanPilar {
  kecamatan: string;
  jumlahDesa: number;
  /** Indeks Ketahanan Pangan rata-rata desa (skala 0-100, makin tinggi makin tahan). */
  ikpRataRata: number;
  /** Sebaran desa per kelas Prioritas FSVA (1-6). */
  prioritas: Record<number, number>;
  indikator: IndikatorPilarRingkasan[];
}

/**
 * Makna tiap indikator FSVA dalam bahasa ketahanan pangan — dipakai untuk
 * menjelaskan kaitan indikator dengan pilarnya. Definisi angka tetap mengacu
 * data/fsva.ts (FSVA Bapanas 2021-2024).
 */
export const PENJELASAN_INDIKATOR: Partial<Record<FsvaIndicatorKey, string>> = {
  rasioLahan:
    "KETERSEDIAAN: rasio luas lahan pertanian terhadap luas total desa. Makin besar, makin luas basis produksi pangan lokal.",
  rasioSarana:
    "KETERSEDIAAN: rasio ketersediaan sarana produksi (input & benih) di tingkat desa. Menopang kelangsungan pasokan.",
  rasioMiskin:
    "KETERJANGKAUAN (akses ekonomi): porsi penduduk miskin desil 1. Makin besar, makin lemah daya beli pangan rumah tangga.",
  tanpaAkses:
    "KETERJANGKAUAN (akses fisik): desa tanpa akses penghubung berupa jalan memadai dari dan ke pusat perdagangan.",
  tanpaAirBersih:
    "PEMANFAATAN: porsi rumah tangga tanpa akses air bersih. Menentukan kebersihan pangan dan penyerapan gizi.",
  rasioNakes:
    "PEMANFAATAN: rasio tenaga kesehatan terhadap penduduk desa. Menopang layanan gizi dan pencegahan masalah gizi.",
};

/** Indikator FSVA dikelompokkan per pilar (IKP dilewati: hasil gabungan). */
export const FSVA_INDIKATOR_PER_PILAR: Record<PilarKey, FsvaIndicatorDef[]> = {
  Ketersediaan: FSVA_INDICATORS.filter((d) => d.pilar === "Ketersediaan"),
  Keterjangkauan: FSVA_INDICATORS.filter((d) => d.pilar === "Keterjangkauan"),
  Pemanfaatan: FSVA_INDICATORS.filter((d) => d.pilar === "Pemanfaatan"),
};

/** Tahun FSVA terbaru yang tersedia. */
export const FSVA_TAHUN_TERBARU: FsvaYear = FSVA_YEARS[FSVA_YEARS.length - 1];

/**
 * Mengagregasi FSVA (278 desa x tahun) menjadi ringkasan per kecamatan.
 *
 * Indikator kontinu (rasioLahan, rasioSarana, rasioMiskin, tanpaAirBersih,
 * rasioNakes) dirata-rata antar desa; indikator kategorikal (tanpaAkses) dihitung
 * sebagai jumlah desa berstatus "ya". Semua memakai definisi resmi di data/fsva.ts
 * sehingga konsisten dengan halaman /fsva.
 */
export function agregatPilarFSVA(tahun: FsvaYear): Record<string, KecamatanPilar> {
  const daftar: FsvaDesa[] = FSVA_DATA[tahun] ?? [];

  interface Ak {
    jumlahDesa: number;
    ikp: number;
    prioritas: Record<number, number>;
    jumlah: Record<string, number>;
    n: Record<string, number>;
  }
  const akumulator: Record<string, Ak> = {};

  for (const d of daftar) {
    const kec = normKec(d.kecamatan);
    if (!kec) continue;
    akumulator[kec] ??= { jumlahDesa: 0, ikp: 0, prioritas: {}, jumlah: {}, n: {} };
    const a = akumulator[kec];
    a.jumlahDesa++;
    a.ikp += Number(d.ikp) || 0;
    const p = Number(d.komposit) || 0;
    if (p) a.prioritas[p] = (a.prioritas[p] ?? 0) + 1;

    for (const def of FSVA_INDICATORS) {
      if (def.pilar === "Indikator Utama") continue;
      const v = Number(d[def.key]);
      if (!Number.isFinite(v)) continue;
      a.jumlah[def.key] = (a.jumlah[def.key] ?? 0) + v;
      a.n[def.key] = (a.n[def.key] ?? 0) + 1;
    }
  }

  const hasil: Record<string, KecamatanPilar> = {};

  for (const [kec, a] of Object.entries(akumulator)) {
    const indikator: IndikatorPilarRingkasan[] = [];
    for (const def of FSVA_INDICATORS) {
      if (def.pilar === "Indikator Utama") continue;
      const n = a.n[def.key] ?? 0;
      if (!n) continue;
      const nilai = (a.jumlah[def.key] ?? 0) / n;
      indikator.push({
        kunci: def.key,
        label: def.label,
        penjelasan: PENJELASAN_INDIKATOR[def.key] ?? "",
        pilar: def.pilar,
        satuan: def.unit,
        better: def.higherIsBetter ? "up" : "down",
        tipe: def.categorical ? "kategorikal" : "kontinu",
        nilai,
        formatNilai: def.categorical ? `${Math.round(nilai)} desa` : def.format(nilai),
        jumlahDesa: n,
      });
    }

    hasil[kec] = {
      kecamatan: kec,
      jumlahDesa: a.jumlahDesa,
      ikpRataRata: a.jumlahDesa ? a.ikp / a.jumlahDesa : 0,
      prioritas: a.prioritas,
      indikator,
    };
  }

  return hasil;
}

/** Label Prioritas FSVA (1-6) — memakai fungsi resmi kompositLabel. */
export const labelPrioritas = (p: number): string => kompositLabel(p);

// ---------------------------------------------------------------------------
// Celah data yang diakui terbuka
// ---------------------------------------------------------------------------

/**
 * Indikator baku Bapanas yang BELUM bisa disajikan karena datanya belum ada di
 * sumber manapun (BPS/CKAN/MySQL). Diminta gap-analysis-master.md baris 6.
 * Ditampilkan jujur di halaman, bukan diisi angka perkiraan.
 */
export const CELAH_DATA_PILAR: {
  pilar: string;
  indikator: string;
  sumberDibutuhkan: string;
}[] = [
  {
    pilar: "Pemanfaatan",
    indikator: "Skor PPH (Pola Pangan Harapan) 0-100",
    sumberDibutuhkan: "Bapanas / Dinas Ketahanan Pangan Provinsi (survei konsumsi)",
  },
  {
    pilar: "Pemanfaatan",
    indikator: "PoU (Prevalence of Undernourishment)",
    sumberDibutuhkan: "Bapanas (perhitungan berbasis survei konsumsi rumah tangga)",
  },
  {
    pilar: "Pemanfaatan",
    indikator: "Prevalensi stunting balita",
    sumberDibutuhkan: "Dinas Kesehatan / e-PPGBM / SSGI",
  },
  {
    pilar: "Pemanfaatan",
    indikator: "Keamanan pangan (uji kontaminasi, sertifikasi mutu)",
    sumberDibutuhkan: "Dinas Kesehatan / OKKPD",
  },
  {
    pilar: "Ketersediaan",
    indikator: "Produksi pangan bulanan",
    sumberDibutuhkan: "Distankan KP (LTT/LP bulanan) — data yang ada masih tahunan",
  },
  {
    pilar: "Ketersediaan",
    indikator: "Sebaran RMU (Rice Milling Unit)",
    sumberDibutuhkan: "Distankan KP (inventarisasi penggilingan padi)",
  },
  {
    pilar: "Ketersediaan",
    indikator: "Arus impor/masuk pangan antar wilayah",
    sumberDibutuhkan: "Bulog / Dinas Perdagangan",
  },
  {
    pilar: "Keterjangkauan",
    indikator: "Pendapatan & daya beli per kapita",
    sumberDibutuhkan: "BPS (PDRB per kapita, pengeluaran per kapita)",
  },
  {
    pilar: "Keterjangkauan",
    indikator: "Kondisi jalan & jarak desa ke pasar",
    sumberDibutuhkan: "DPUPR / Dinas Perhubungan",
  },
];
