/**
 * src/services/kecamatan.ts
 *
 * Agregator data tingkat-kecamatan untuk halaman /kecamatan/:kecSlug
 * (mirror arsitektur services/desa.ts — identitas & daftar desa dari geoindex
 * desa yang sudah di-cache; data domain dari fetcher api.ts yang semuanya
 * per-kecamatan; matching tahan-varian-ejaan via slug).
 *
 * Sumber:
 *   - fetchAllDesa()  → peta_desa_v3.geojson (cached) — identitas kecamatan:
 *     jumlah desa, Σ luas wilayah (polygon, Ha), daftar desa + link.
 *   - fetchLahanBanjarnegara  → ST2023 T4.10 lahan usaha tani per desa.
 *   - fetchPadiSawahLadang / fetchJagungUbiKayu / fetchKacangKedelai /
 *     fetchUbiKacangHijau → tanaman pangan per kecamatan per tahun.
 *   - fetchTernakBesar / TernakKecil / Unggas → populasi ternak.
 *   - fetchPerikananBudidaya / Tangkap → perikanan.
 *   - fetchLumbungPangan → lumbung & gudang pangan.
 *   - fetchKelompokTani → poktan / gapoktan / kelompok perikanan.
 *
 * Keputusan arsitektur (kebalikan halaman desa): data kecamatan-level
 * (padi, ternak, perikanan, dst.) TIDAK dipakai di halaman desa —
 * halaman inilah rumahnya.
 */

import {
  fetchFruitProduction,
  fetchJagungUbiKayu,
  fetchKacangKedelai,
  fetchKelompokTani,
  fetchLahanBanjarnegara,
  fetchLumbungPangan,
  fetchPadiSawahLadang,
  fetchPerikananBudidaya,
  fetchPerikananTangkap,
  fetchPlantationProduction,
  fetchTernakBesar,
  fetchTernakKecil,
  fetchUbiKacangHijau,
  fetchUnggas,
  fetchVegetableProduction,
  type FoodCropItem,
  type FoodCropRow,
  type KelompokTaniRow,
  type LahanDesa,
  type LumbungPangan,
  type PerikananBudidaya,
  type PerikananTangkap,
  type TernakBesar,
  type TernakKecil,
  type Unggas,
} from "./api";
import {
  fetchAllDesa,
  kecamatanSlugOf,
  namaKecamatanTanpaSingkatan,
  type DesaIndex,
} from "./desa";

/* ------------------------------------------------------------------ */
/* Tipe publik                                                         */
/* ------------------------------------------------------------------ */

export interface KecamatanIndex {
  /** Slug URL kecamatan — sama dengan slug yang dipakai route desa (mis. "kec-bawang"). */
  slug: string;
  /** Nama tampil (dari GeoJSON, ternormalisasi). */
  namaTampil: string;
  /** Jumlah desa/kelurahan. */
  jumlahDesa: number;
  /** Σ luas polygon desa (Ha). */
  luasWilayahHa: number;
  /** Daftar desa (untuk link detail desa). */
  desa: DesaIndex[];
}

export interface PanganItem extends FoodCropItem {
  /** Label grup sumber (mis. "Padi Sawah & Ladang", "Jagung & Ubi Kayu"). */
  grup: string;
  tahun: string;
}

export interface KecamatanDetail extends KecamatanIndex {
  /** Lahan usaha tani per desa (ST2023 T4.10) di kecamatan ini. */
  lahan: LahanDesa[];
  /** Item tanaman pangan (padi + palawija) tahun terbaru. */
  panganItems: PanganItem[];
  panganTahun: string | null;
  ternakBesar: TernakBesar | null;
  ternakKecil: TernakKecil | null;
  unggas: Unggas | null;
  ternakTahun: string | null;
  budidaya: PerikananBudidaya | null;
  tangkap: PerikananTangkap | null;
  perikananTahun: string | null;
  lumbung: LumbungPangan | null;
  /** Kelompok tani per desa — tahun terbaru saja. */
  kelompokTani: KelompokTaniRow[];
  kelembagaanTahun: string | null;
}

export interface KecamatanFailures {
  lahan: boolean;
  pangan: boolean;
  ternak: boolean;
  perikanan: boolean;
  lumbung: boolean;
  kelembagaan: boolean;
}

export interface KecamatanDetailResult {
  detail: KecamatanDetail | null;
  failures: KecamatanFailures;
}

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

/**
 * Kunci pembanding kecamatan yang tahan varian ejaan:
 * normalize varian (KECAMATAN_VARIANTS via kecamatanSlugOf) → buang prefix
 * "kec-" (dari teks geojson "Kec.X") → hilangkan dash (geojson
 * "Purwarejaklampok" 1 kata vs data "Purwareja Klampok" 2 kata).
 */
export const KEC_KEY = (nama: string): string =>
  kecamatanSlugOf(String(nama))
    .replace(/^kec-?/, "")
    .replace(/-/g, "");

/** Ambil baris dengan tahun terbaru (tahun string/number/optional). */
function latestByTahun<T extends { tahun?: string | number | null }>(rows: T[]): T | null {
  if (!rows.length) return null;
  const max = rows.reduce((m, r) => Math.max(m, Number(r.tahun ?? 0) || 0), 0);
  const hits = rows.filter((r) => Number(r.tahun ?? 0) === max);
  return hits[0] ?? null;
}

function allLatestByTahun<T extends { tahun?: string | number | null }>(rows: T[]): T[] {
  if (!rows.length) return [];
  const max = rows.reduce((m, r) => Math.max(m, Number(r.tahun ?? 0) || 0), 0);
  return rows.filter((r) => Number(r.tahun ?? 0) === max);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Bangun URL path untuk halaman kecamatan. */
export function buildKecamatanPath(kecamatan: string): string {
  return `/kecamatan/${kecamatanSlugOf(kecamatan)}`;
}

/** Index 20 kecamatan — identitas dari geoindex desa (cached localStorage). */
export async function fetchKecamatanIndex(): Promise<KecamatanIndex[]> {
  const all = await fetchAllDesa();
  const m = new Map<string, KecamatanIndex>();
  for (const d of all) {
    const cur =
      m.get(d.kecamatanSlug) ??
      {
        slug: d.kecamatanSlug,
        // Geojson menyimpan "Kec.Pagentan" — buang singkatan agar tidak dobel
        // saat halaman merender "Kecamatan {namaTampil}".
        namaTampil: namaKecamatanTanpaSingkatan(d.kecamatanTampil),
        jumlahDesa: 0,
        luasWilayahHa: 0,
        desa: [] as DesaIndex[],
      };
    cur.jumlahDesa += 1;
    cur.luasWilayahHa += d.luasHa || 0;
    cur.desa.push(d);
    m.set(d.kecamatanSlug, cur);
  }
  return [...m.values()].sort((a, b) => a.namaTampil.localeCompare(b.namaTampil, "id"));
}

/** Detail lengkap satu kecamatan (semua domain, fail-safe per sumber). */
export async function fetchKecamatanDetail(
  kecSlug: string,
): Promise<KecamatanDetailResult> {
  const want = KEC_KEY((kecSlug || "").toLowerCase().trim());
  const index = await fetchKecamatanIndex();
  const idx = index.find((k) => KEC_KEY(k.slug) === want);
  if (!idx) {
    return {
      detail: null,
      failures: {
        lahan: false,
        pangan: false,
        ternak: false,
        perikanan: false,
        lumbung: false,
        kelembagaan: false,
      },
    };
  }
  const target = KEC_KEY(idx.slug);
  const inKec = <T extends { kecamatan: string }>(rows: T[]): T[] =>
    rows.filter((r) => KEC_KEY(r.kecamatan) === target);

  const [
    lahanS,
    padiS,
    jagungS,
    kacangS,
    ubiS,
    ternakBesarS,
    ternakKecilS,
    unggasS,
    budidayaS,
    tangkapS,
    lumbungS,
    ktS,
  ] = await Promise.allSettled([
    fetchLahanBanjarnegara(),
    fetchPadiSawahLadang(),
    fetchJagungUbiKayu(),
    fetchKacangKedelai(),
    fetchUbiKacangHijau(),
    fetchTernakBesar(),
    fetchTernakKecil(),
    fetchUnggas(),
    fetchPerikananBudidaya(),
    fetchPerikananTangkap(),
    fetchLumbungPangan(),
    fetchKelompokTani(),
  ]);

  const val = <T>(s: PromiseSettledResult<T[]>, fallback: T[] = [] as T[]): T[] =>
    s.status === "fulfilled" ? s.value : fallback;

  const lahan = inKec(val(lahanS) as LahanDesa[]);

  const panganRows = inKec(val(padiS) as FoodCropRow[]);
  const jagungRows = inKec(val(jagungS) as FoodCropRow[]);
  const kacangRows = inKec(val(kacangS) as FoodCropRow[]);
  const ubiRows = inKec(val(ubiS) as FoodCropRow[]);

  const panganItems: PanganItem[] = [];
  const pushItems = (rows: FoodCropRow[], grup: string) => {
    const r = latestByTahun(rows);
    if (!r) return;
    r.items.forEach((it) => panganItems.push({ ...it, grup, tahun: String(r.tahun) }));
  };
  pushItems(panganRows, "Padi Sawah & Ladang");
  pushItems(jagungRows, "Jagung & Ubi Kayu");
  pushItems(kacangRows, "Kacang & Kedelai");
  pushItems(ubiRows, "Ubi Jalar & Kacang Hijau");
  const panganTahun = panganItems.length ? panganItems[0].tahun : null;

  const ternakBesar = latestByTahun(inKec(val(ternakBesarS) as TernakBesar[]));
  const ternakKecil = latestByTahun(inKec(val(ternakKecilS) as TernakKecil[]));
  const unggas = latestByTahun(inKec(val(unggasS) as Unggas[]));
  const ternakTahun = ternakBesar?.tahun ?? ternakKecil?.tahun ?? unggas?.tahun ?? null;

  const budidaya = latestByTahun(inKec(val(budidayaS) as PerikananBudidaya[]));
  const tangkap = latestByTahun(inKec(val(tangkapS) as PerikananTangkap[]));
  const perikananTahun = budidaya?.tahun ?? tangkap?.tahun ?? null;

  const lumbung = latestByTahun(inKec(val(lumbungS) as LumbungPangan[]));

  const kelompokTani = allLatestByTahun(inKec(val(ktS) as KelompokTaniRow[]));
  const kelembagaanTahun = kelompokTani.length ? kelompokTani[0].tahun : null;

  return {
    detail: {
      ...idx,
      lahan,
      panganItems,
      panganTahun,
      ternakBesar,
      ternakKecil,
      unggas,
      ternakTahun,
      budidaya,
      tangkap,
      perikananTahun,
      lumbung,
      kelompokTani,
      kelembagaanTahun,
    },
    failures: {
      lahan: lahanS.status === "rejected",
      pangan:
        padiS.status === "rejected" ||
        jagungS.status === "rejected" ||
        kacangS.status === "rejected" ||
        ubiS.status === "rejected",
      ternak:
        ternakBesarS.status === "rejected" ||
        ternakKecilS.status === "rejected" ||
        unggasS.status === "rejected",
      perikanan: budidayaS.status === "rejected" || tangkapS.status === "rejected",
      lumbung: lumbungS.status === "rejected",
      kelembagaan: ktS.status === "rejected",
    },
  };
}

/* ------------------------------------------------------------------ */
/* SEBARAN BIDANG (/sebaran/:bidang) — peta tematik per-kecamatan      */
/* ------------------------------------------------------------------ */
/**
 * Agregat indikator utama tiap bidang: baris-terbaru per kecamatan per
 * dataset, lalu dijumlah antar-dataset dalam bidang yang sama.
 *   pangan       → Σ produksi tanaman pangan (ton)
 *   hortikultura → Σ produksi sayuran + buah-buahan (ton)
 *   perkebunan   → Σ produksi tanaman perkebunan rakyat (ton)
 *   peternakan   → Σ populasi ternak besar + kecil + unggas (ekor)
 *   perikanan    → Σ produksi budidaya + tangkap (kg → ton)
 */

export type SebaranBidangKey =
  | "pangan"
  | "hortikultura"
  | "perkebunan"
  | "peternakan"
  | "perikanan";

export const SEBARAN_BIDANG_KEYS: readonly SebaranBidangKey[] = [
  "pangan",
  "hortikultura",
  "perkebunan",
  "peternakan",
  "perikanan",
] as const;

export const isSebaranBidangKey = (v: string | undefined): v is SebaranBidangKey =>
  !!v && (SEBARAN_BIDANG_KEYS as readonly string[]).includes(v);

export interface SebaranBidangRow {
  /** Nama tampil (nama resmi 20 kecamatan). */
  kecamatan: string;
  /** Slug route profil kecamatan (mis. "purwareja-klampok"). */
  kecamatanSlug: string;
  /** Agregat indikator bidang (satuan lihat SebaranBidangData.unit). */
  nilai: number;
  /** Tahun baris terbaru yang dipakai agregat ini. */
  tahun: string;
}

export interface SebaranBidangData {
  bidang: SebaranBidangKey;
  judul: string;
  /** Penjelasan cakupan indikator. */
  indikator: string;
  /** Satuan angka (ton / ekor). */
  unit: string;
  /** Tahun data terbaru lintas kecamatan (maksimum). */
  tahun: string;
  /** Baris urut menurun — hanya kecamatan resmi dengan data > 0. */
  rows: SebaranBidangRow[];
}

const SEBARAN_META: Record<
  SebaranBidangKey,
  { judul: string; indikator: string; unit: string }
> = {
  pangan: {
    judul: "Sebaran Produksi Tanaman Pangan",
    indikator:
      "Total produksi padi sawah & ladang, jagung, ubi kayu, kacang-kedelai, dan ubi jalar — baris terbaru tiap dataset",
    unit: "ton",
  },
  hortikultura: {
    judul: "Sebaran Produksi Hortikultura",
    indikator: "Total produksi sayuran dan buah-buahan — baris terbaru tiap dataset",
    unit: "ton",
  },
  perkebunan: {
    judul: "Sebaran Produksi Perkebunan",
    indikator: "Total produksi tanaman perkebunan rakyat — baris terbaru dataset",
    unit: "ton",
  },
  peternakan: {
    judul: "Sebaran Populasi Ternak",
    indikator: "Total populasi ternak besar, kecil, dan unggas — baris terbaru tiap kelompok",
    unit: "ekor",
  },
  perikanan: {
    judul: "Sebaran Produksi Perikanan",
    indikator:
      "Total produksi perikanan budidaya dan tangkap (kg dikonversi ton) — baris terbaru tiap kelompok",
    unit: "ton",
  },
};

interface BarisAgg {
  nilai: number;
  tahun: string;
}

/** Kolom non-produksi/populasi yang diabaikan saat menjumlah record. */
const SUM_SKIP = /^(kecamatan|tahun|jumlah|total|luas|panen|satuan|id)$/i;

const sumRecord = (r: Record<string, unknown>): number => {
  let s = 0;
  for (const [k, v] of Object.entries(r)) {
    if (SUM_SKIP.test(k)) continue;
    const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n) && n > 0) s += n;
  }
  return s;
};

const nilaiPanganRow = (r: FoodCropRow): number =>
  r.items.reduce((s, it) => s + (Number(it.produksi) || 0), 0);

/** Per kecamatan: baris tahun-terbaru (dijumlah bila ada >1 baris tahun sama). */
function barisTerbaru<T extends { kecamatan?: string; tahun?: string | number }>(
  rows: T[],
  nilaiOf: (r: T) => number,
): Map<string, BarisAgg> {
  const m = new Map<string, BarisAgg>();
  for (const r of rows) {
    const key = KEC_KEY(r.kecamatan ?? "");
    if (!key) continue;
    const t = String(r.tahun ?? "");
    const v = nilaiOf(r);
    if (!Number.isFinite(v) || v <= 0) continue;
    const cur = m.get(key);
    if (!cur || t > cur.tahun) m.set(key, { nilai: v, tahun: t });
    else if (t === cur.tahun) cur.nilai += v;
  }
  return m;
}

/** Jumlahkan antar-dataset dalam satu bidang (nilai = Σ nilai terbaru tiap dataset). */
function gabungDataset(maps: Map<string, BarisAgg>[]): Map<string, BarisAgg> {
  const out = new Map<string, BarisAgg>();
  for (const m of maps)
    for (const [key, b] of m) {
      const cur = out.get(key);
      if (cur) {
        cur.nilai += b.nilai;
        if (b.tahun > cur.tahun) cur.tahun = b.tahun;
      } else out.set(key, { ...b });
    }
  return out;
}

/** Baris mentah antar-interface dataset (field kunci optional di sumber). */
type BarisMentah = { kecamatan?: string; tahun?: string | number };

/** Map tiap dataset → agregat baris-terbaru per kecamatan. */
function barisTerbaruPerDataset(
  datasets: Array<BarisMentah[]>,
  nilaiOf: (r: BarisMentah) => number,
): Map<string, BarisAgg>[] {
  return datasets.map((rows) => barisTerbaru(rows, nilaiOf));
}

export async function fetchSebaranBidang(bidang: SebaranBidangKey): Promise<SebaranBidangData> {
  const meta = SEBARAN_META[bidang];
  let maps: Map<string, BarisAgg>[];

  switch (bidang) {
    case "pangan": {
      const [padi, jagung, kacang, ubi] = await Promise.all([
        fetchPadiSawahLadang(),
        fetchJagungUbiKayu(),
        fetchKacangKedelai(),
        fetchUbiKacangHijau(),
      ]);
      maps = [padi, jagung, kacang, ubi].map((rs) => barisTerbaru(rs, nilaiPanganRow));
      break;
    }
    case "hortikultura": {
      const [sayur, buah] = await Promise.all([fetchVegetableProduction(), fetchFruitProduction()]);
      maps = barisTerbaruPerDataset([sayur, buah], (r) =>
        sumRecord(r as unknown as Record<string, unknown>),
      );
      break;
    }
    case "perkebunan": {
      const keb = await fetchPlantationProduction();
      maps = [
        barisTerbaru(keb, (r) => sumRecord(r as unknown as Record<string, unknown>)),
      ];
      break;
    }
    case "peternakan": {
      const [besar, kecil, unggas] = await Promise.all([
        fetchTernakBesar(),
        fetchTernakKecil(),
        fetchUnggas(),
      ]);
      maps = barisTerbaruPerDataset([besar, kecil, unggas], (r) =>
        sumRecord(r as unknown as Record<string, unknown>),
      );
      break;
    }
    case "perikanan": {
      const [budidaya, tangkap] = await Promise.all([
        fetchPerikananBudidaya(),
        fetchPerikananTangkap(),
      ]);
      // Sumber menyimpan kg — konversi ke ton agar sebanding antar-bidang.
      maps = barisTerbaruPerDataset([budidaya, tangkap], (r) =>
        sumRecord(r as unknown as Record<string, unknown>) / 1000,
      );
      break;
    }
  }

  const index = await fetchKecamatanIndex();
  const idxByKey = new Map(index.map((k) => [KEC_KEY(k.namaTampil), k]));

  const rows: SebaranBidangRow[] = Array.from(gabungDataset(maps).entries())
    .flatMap(([key, b]) => {
      const idx = idxByKey.get(key);
      // Buang varian ejaan yang tak terpetakan ke 20 kecamatan resmi.
      return idx
        ? [
            {
              kecamatan: idx.namaTampil,
              kecamatanSlug: idx.slug,
              nilai: b.nilai,
              tahun: b.tahun,
            },
          ]
        : [];
    })
    .sort((a, b) => b.nilai - a.nilai);

  return {
    bidang,
    judul: meta.judul,
    indikator: meta.indikator,
    unit: meta.unit,
    tahun: rows.reduce((m, r) => (r.tahun > m ? r.tahun : m), ""),
    rows,
  };
}

/* ------------------------------------------------------------------ */
/* GeoJSON batas kecamatan (peta tematik sebaran)                      */
/* ------------------------------------------------------------------ */

export interface KecGeoFeature {
  type: "Feature";
  geometry: unknown;
  properties: {
    /** Kunci join (= KEC_KEY, tanpa dash) — cocok dengan SebaranBidangRow via KEC_KEY. */
    kecKey: string;
    /** Nama tampil tanpa singkatan "Kec." */
    nama: string;
  };
}

export interface KecGeoCollection {
  type: "FeatureCollection";
  features: KecGeoFeature[];
}

const KEC_GEO_CACHE_KEY = "cache_kec_geo_v1";

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* kuota penuh — biarkan fetch berikutnya memuat ulang */
  }
}

/**
 * GeoJSON 20 kecamatan (public/peta_kecamatan.geojson) + cache localStorage.
 * Properties dinormalisasi: { kecKey, nama }.
 */
export async function fetchKecamatanGeo(): Promise<KecGeoCollection> {
  const cached = lsGet<KecGeoCollection>(KEC_GEO_CACHE_KEY);
  if (cached && Array.isArray(cached.features) && cached.features.length) return cached;

  const res = await fetch(`${import.meta.env.BASE_URL}peta_kecamatan.geojson`, {
    cache: "force-cache",
  });
  if (!res.ok) throw new Error(`Gagal memuat peta_kecamatan.geojson (HTTP ${res.status})`);
  const raw = (await res.json()) as {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: unknown;
      properties: Record<string, unknown>;
    }>;
  };

  const fc: KecGeoCollection = {
    type: "FeatureCollection",
    features: raw.features.map((f) => {
      const nama = String(f.properties?.Kecamatan ?? f.properties?.Name ?? "").trim();
      return {
        type: "Feature" as const,
        geometry: f.geometry,
        properties: {
          kecKey: KEC_KEY(nama),
          nama: namaKecamatanTanpaSingkatan(nama),
        },
      };
    }),
  };
  lsSet(KEC_GEO_CACHE_KEY, fc);
  return fc;
}
