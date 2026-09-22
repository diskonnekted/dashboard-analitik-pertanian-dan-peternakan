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
  fetchJagungUbiKayu,
  fetchKacangKedelai,
  fetchKelompokTani,
  fetchLahanBanjarnegara,
  fetchLumbungPangan,
  fetchPadiSawahLadang,
  fetchPerikananBudidaya,
  fetchPerikananTangkap,
  fetchTernakBesar,
  fetchTernakKecil,
  fetchUbiKacangHijau,
  fetchUnggas,
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
const KEC_KEY = (nama: string): string =>
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
