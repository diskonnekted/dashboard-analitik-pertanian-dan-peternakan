/**
 * src/services/desa.ts
 *
 * Agregator data tingkat-desa untuk halaman detail desa:
 *   /desa/:kecSlug/:namaSlug
 *
 * Sumber per-desa yang dipakai:
 *   - peta_desa_v3.geojson         (polygon + nama + kecamatan + OBJECTID)
 *   - /data/lahan-fallback.json    (sawah / bukan sawah per-desa)
 *   - fetchKelompokTani            (kelompok tani, anggota, gapoktan, KTH)
 *   - fetchSt2023DesaExtra         (BPS ST2023: petani, perikanan, ternak nested)
 *
 * Sumber data **kecamatan** (padi, perkebunan, sayur, buah) **tidak dipakai**
 * per keputusan arsitektur (halaman desa hanya muat data per-desa).
 */

import area from "@turf/area";
import centroid from "@turf/centroid";

import {
  fetchLahanBanjarnegara,
  fetchKelompokTani,
  fetchSt2023DesaExtra,
  type LahanDesa,
  type KelompokTaniRow,
  type St2023DesaExtra,
} from "./api";

// Salin logika dari src/services/api.ts (normalizeKecamatanName) agar
// konsisten dengan normalisasi yang dipakai seluruh aplikasi — termasuk
// pluralisasi ("B a w a n g" → "Bawang") dan koreksi ejaan varian.
const KECAMATAN_VARIANTS: Record<string, string> = {
  PURWONEGORO: "Purwanegara",
  "PURWOREJO KLAMPOK": "Purwareja Klampok",
  PURWOREJOKLAMPOK: "Purwareja Klampok",
};

function normalizeKecamatan(raw: string): string {
  if (!raw) return "";
  let name = raw
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = name.split(" ").filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => t.length === 1)) {
    name = tokens.join("");
  }
  const variant = KECAMATAN_VARIANTS[name.toUpperCase()];
  if (variant) name = variant;
  return name;
}

// ------------------------------------------------------------------
// Subset tipe GeoJSON. Hindari @types/geojson untuk hemat bundle.
// ------------------------------------------------------------------
export type GeoGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type GeoFeature<G extends GeoGeometry = GeoGeometry> = {
  type: "Feature";
  geometry: G;
  properties: Record<string, unknown> | null;
};

// ------------------------------------------------------------------
// Tipe publik
// ------------------------------------------------------------------
export interface DesaIndex {
  /** OBJECTID dari GeoJSON, unik. */
  objectId: number;
  /** Slug kecamatan (mis. "susukan", "sigaluh"). */
  kecamatanSlug: string;
  /** Slug nama desa (mis. "brengkok", "bandingan"). */
  namaSlug: string;
  /** Nama tampil desa, mis. "Desa Brengkok". */
  namaTampil: string;
  /** Nama tampil kecamatan hasil normalizeKecamatan → Title Case. */
  kecamatanTampil: string;
  /** Kabupaten. */
  kabupaten: string;
  /** GeoJSON feature lengkap (untuk mini-map). null jika gagal parse. */
  geometry: GeoFeature | null;
  /** Luas polygon (Ha), computed via @turf/area. */
  luasHa: number;
  /** Centroid [lng, lat] untuk marker peta mini. */
  centroid: [number, number] | null;
}

export interface DesaDetail extends DesaIndex {
  lahan: LahanDesa[];
  kelompokTani: KelompokTaniRow[];
  st2023: St2023DesaExtra | null;
  /** 5 tetangga terdekat, berdasarkan jarak centroid. */
  tetangga: { nama: string; kecamatan: string }[];
  /** Total penduduk (dari ST2023 jika ada, jika tidak 0). */
  jumlahPenduduk: number;
  /** Total keluarga / KK (dari ST2023 jika ada, jika tidak 0). */
  jumlahKk: number;
  /** Total RT (dari ST2023 jika ada, jika tidak 0). */
  jumlahRt: number;
}

// ------------------------------------------------------------------
// Slug helpers
// ------------------------------------------------------------------
/**
 * Slugifier untuk nama Indonesia: strip "Desa "/"Kelurahan ", lower-case,
 * ganti non-alfanumerik dengan "-", trim "-".
 */
export const toSlug = (s: string): string => {
  if (!s) return "";
  let v = s.trim();
  v = v.replace(/^(Desa|Kelurahan)\s+/i, "");
  v = v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return v;
};

/** Slug kecamatan = normalizeKecamatan() → toSlug(). */
export const kecamatanSlugOf = (kec: string): string => {
  const normalized = normalizeKecamatan(kec);
  return toSlug(normalized || kec || "");
};

/**
 * Nama kecamatan TANPA singkatan "Kec." — untuk teks yang sudah didahului
 * kata "Kecamatan" (geojson menyimpan "Kec.Pagentan", sehingga
 * "Kecamatan Kec.Pagentan" menjadi dobel).
 */
export const namaKecamatanTanpaSingkatan = (t: string): string =>
  t.replace(/^kec\.?\s*/i, "").trim();

/**
 * Singkatan rapi "Kec. X" (dengan spasi) untuk tampilan mandiri,
 * mis. segmen breadcrumb halaman desa.
 */
export const singkatanKecamatan = (t: string): string => {
  const bare = t.replace(/^kec\.?\s*/i, "").trim();
  return bare ? `Kec. ${bare}` : t.trim();
};

/** Bangun URL path untuk desa. Dipakai dari popup MapWidget. */
export function buildDesaPath(kecamatan: string, nama: string): string {
  return `/desa/${kecamatanSlugOf(kecamatan)}/${toSlug(nama)}`;
}

// ------------------------------------------------------------------
// Cache helpers (localStorage, swallow errors)
// ------------------------------------------------------------------
const DESA_INDEX_CACHE_KEY = "desa-geo-index-v1";

const isBrowser = (): boolean =>
  typeof window !== "undefined" && typeof localStorage !== "undefined";

const lsGet = <T>(key: string): T | null => {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { timestamp: number; data: T };
    return parsed.data;
  } catch {
    return null;
  }
};

const lsSet = <T>(key: string, data: T): void => {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ timestamp: Date.now(), data }),
    );
  } catch {
    /* kuota penuh / private mode — abaikan */
  }
};

// ------------------------------------------------------------------
// Fetch: peta_desa_v3.geojson (1× load, di-cache di localStorage)
// ------------------------------------------------------------------
async function loadGeoIndex(): Promise<DesaIndex[]> {
  const cached = lsGet<DesaIndex[]>(DESA_INDEX_CACHE_KEY);
  if (cached && Array.isArray(cached) && cached.length) return cached;

  const res = await fetch("/peta_desa_v3.geojson", { cache: "force-cache" });
  if (!res.ok) throw new Error(`Gagal memuat peta_desa_v3.geojson (${res.status})`);
  const geo = (await res.json()) as { features?: GeoFeature[] };
  const features = geo.features ?? [];
  const out: DesaIndex[] = [];

  for (const f of features) {
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const nama = String(p.Nama_Desa_ ?? "").trim();
    const kec = String(p.Kecamatan ?? "").trim();
    const kabupaten = String(p.Kabupaten ?? "Banjarnegara").trim();
    const oid = Number(p.OBJECTID);
    if (!nama || !kec || !Number.isFinite(oid)) continue;

    const namaTampil = /^(Desa|Kelurahan)\s+/i.test(nama) ? nama : `Desa ${nama}`;
    const kecamatanTampil = normalizeKecamatan(kec);

    let geometry: GeoFeature | null = null;
    let luasHa = 0;
    let cent: [number, number] | null = null;

    try {
      if (
        f.geometry &&
        (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
      ) {
        geometry = f;
        const sqm = area(f as unknown as Parameters<typeof area>[0]);
        luasHa = Math.round((sqm / 10_000) * 100) / 100;
        const c = centroid(f as unknown as Parameters<typeof centroid>[0]);
        const coords = c.geometry.coordinates as unknown as [number, number];
        cent = [coords[0], coords[1]];
      }
    } catch {
      /* biarkan null kalau turf gagal */
    }

    out.push({
      objectId: oid,
      kecamatanSlug: kecamatanSlugOf(kec),
      namaSlug: toSlug(nama),
      namaTampil,
      kecamatanTampil,
      kabupaten,
      geometry,
      luasHa,
      centroid: cent,
    });
  }

  lsSet(DESA_INDEX_CACHE_KEY, out);
  return out;
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------
export async function lookupDesaBySlug(
  kecSlug: string,
  namaSlug: string,
): Promise<DesaIndex | null> {
  const idx = await loadGeoIndex();
  const wantKec = (kecSlug || "").toLowerCase().trim();
  const wantNama = (namaSlug || "").toLowerCase().trim();
  if (!wantKec || !wantNama) return null;

  const inKec = idx.filter((d) => d.kecamatanSlug === wantKec);
  const pool = inKec.length ? inKec : idx; // fallback global
  return pool.find((d) => d.namaSlug === wantNama) ?? null;
}

export async function lookupDesaByObjectId(oid: number): Promise<DesaIndex | null> {
  const idx = await loadGeoIndex();
  return idx.find((d) => d.objectId === oid) ?? null;
}

export async function fetchAllDesa(): Promise<DesaIndex[]> {
  return loadGeoIndex();
}

export function invalidateDesaIndexCache(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(DESA_INDEX_CACHE_KEY);
  } catch {
    /* noop */
  }
}

// ------------------------------------------------------------------
// Fetch: detail lengkap per-desa
// ------------------------------------------------------------------
export interface DesaDetailResult {
  /** Detail desa, atau `null` jika desa tidak ditemukan dalam index/geojson. */
  detail: DesaDetail | null;
  /**
   * Status pelaporan kegagalan per-sumber.
   * `true` menandakan upstream fetch (CKAN, fallback lokal) gagal.
   */
  failures: {
    lahan: boolean;
    kelompokTani: boolean;
    st2023: boolean;
  };
}

export async function fetchDesaDetail(
  kecSlug: string,
  namaSlug: string,
): Promise<DesaDetailResult> {
  const id = await lookupDesaBySlug(kecSlug, namaSlug);
  if (!id) {
    return {
      detail: null,
      failures: { lahan: false, kelompokTani: false, st2023: false },
    };
  }

  // Pakai allSettled agar kegagalan satu sumber tidak menggugurkan fetch
  // yang lain. Karena fallback lokal dipasang oleh api.ts
  // (Promise.resolve([]) bila fail), di sini flag dideteksi via status
  // "rejected" saja. Bila api.ts di masa depan mulai melempar fallback
  // kosong, perlu strategi deteksi yang lebih baik (lihat TODO).
  const [lahanS, ktS, stS] = await Promise.allSettled([
    fetchLahanBanjarnegara(),
    fetchKelompokTani(),
    fetchSt2023DesaExtra(),
  ]);

  const lahanAll =
    lahanS.status === "fulfilled" ? lahanS.value : ([] as LahanDesa[]);
  const ktAll =
    ktS.status === "fulfilled" ? ktS.value : ([] as KelompokTaniRow[]);
  const stAll =
    stS.status === "fulfilled" ? stS.value : ([] as St2023DesaExtra[]);

  // sumber (3 file) punya format nama desa dan kecamatan berbeda:
  //   - lahan-fallback.json    : desa UPPER, kec Title Case ("BRENGKOK", "Susukan")
  //   - st2023-desa-fallback   : desa UPPER, kec UPPER ("BRENGKOK", "SUSUKAN")
  //   - kelompok-tani-fallback : desa UPPER, kec Title Case ("BRENGKOK", "Susukan")
  // sedangkan id.namaTampil ber-prefix "Desa "/"Kelurahan " dan
  // id.kecamatanTampil ber-prefix "Kec." (dari GeoJSON "Kec.Susukan").
  //
  // Normalisasi: strip prefix + case-fold, agar match robust di semua sumber.
  const stripPrefix = (s: string) =>
    s.trim().replace(/^(Desa|Kelurahan)\s+/i, "").toLowerCase();
  const stripKecPrefix = (s: string) =>
    s.trim().replace(/^(Kec\.|Kecamatan\s+)\s*/i, "").toLowerCase();

  const wantClean = stripPrefix(id.namaTampil);
  const wantKec = stripKecPrefix(id.kecamatanTampil);

  const filterByDesa = <T extends { desa: string; kecamatan?: string }>(rows: T[]) =>
    rows.filter((r) => {
      const rowDesa = stripPrefix(r.desa);
      if (rowDesa !== wantClean) return false;
      // Match kecamatan kalau field tersedia (semua sumber punya)
      if (r.kecamatan != null) {
        return r.kecamatan.trim().toLowerCase() === wantKec;
      }
      return true;
    });

  const lahan = filterByDesa(lahanAll);
  const kelompokTani = filterByDesa(ktAll);
  const st2023List = filterByDesa(stAll);
  const st2023 = st2023List[0] ?? null;

  const tetangga = id.centroid ? await findNearestNeighbors(id, 5) : [];

  return {
    detail: {
      ...id,
      lahan,
      kelompokTani,
      st2023,
      tetangga,
      jumlahPenduduk: 0,
      jumlahKk: 0,
      jumlahRt: 0,
    },
    failures: {
      lahan: lahanS.status === "rejected",
      kelompokTani: ktS.status === "rejected",
      st2023: stS.status === "rejected",
    },
  };
}

async function findNearestNeighbors(
  self: DesaIndex,
  k: number,
): Promise<{ nama: string; kecamatan: string }[]> {
  const all = await loadGeoIndex();
  if (!self.centroid) return [];
  const [lng1, lat1] = self.centroid;
  const dist = (lng2: number, lat2: number) => {
    const dx = lng1 - lng2;
    const dy = lat1 - lat2;
    return Math.sqrt(dx * dx + dy * dy);
  };
  return all
    .filter((d) => d.objectId !== self.objectId && !!d.centroid)
    .map((d) => ({ d, dist: dist(d.centroid![0], d.centroid![1]) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, k)
    .map(({ d }) => ({ nama: d.namaTampil, kecamatan: d.kecamatanTampil }));
}
