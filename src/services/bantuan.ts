// ============================================================
// Data Bantuan Pemerintah — sumber: Sanity Content Lake
// Diisi manual oleh admin Distan melalui Sanity Studio
// (project: spukl1fj, dataset: datasispertani — public, read-only
//  dari aplikasi; penulisan HANYA via Studio yang ter-autentikasi).
//
// Pola: fetch CDN → sukses: timpa cache lokal; gagal (CORS belum
// di-set / offline / Sanity down): pakai cache basi (stale-if-error);
// tanpa cache: struktur kosong (belum ada input admin).
// ============================================================

export const SANITY_PROJECT_ID = "spukl1fj";
export const SANITY_DATASET = "datasispertani";

export interface BantuanProgram {
  _id: string;
  _updatedAt: string;
  nama: string;
  sumber: "APBD" | "APBN";
  tahunAnggaran: number;
  /** Nilai dalam Rupiah penuh, mis. 3200000000 (= Rp 3,2 Miliar) */
  nilaiRupiah: number;
  sektor: string;
  penerimaJumlah: number;
  penerimaJenis: string;
  dampakLevel: "Tinggi" | "Sedang" | "Rendah";
  dampakCatatan: string;
}

export interface BantuanAlokasi {
  _id: string;
  _updatedAt: string;
  tahun: number;
  /** APBD dalam Miliar Rp */
  apbdMiliar: number;
  /** APBN dalam Miliar Rp */
  apbnMiliar: number;
}

export interface BantuanKorelasi {
  _id: string;
  _updatedAt: string;
  sektor: string;
  /** Total bantuan sektor dalam Miliar Rp */
  bantuanMiliar: number;
  /** Kenaikan produksi sektor (%) */
  kenaikanProduksiPct: number;
}

export interface BantuanData {
  program: BantuanProgram[];
  alokasi: BantuanAlokasi[];
  korelasi: BantuanKorelasi[];
  /** _updatedAt terbaru lintas seluruh dokumen (null bila belum ada data) */
  updatedAt: string | null;
}

export const EMPTY_BANTUAN: BantuanData = {
  program: [],
  alokasi: [],
  korelasi: [],
  updatedAt: null,
};

const CACHE_KEY = "sispertani:bantuan-pemerintah";

const GROQ =
  '{"program": *[_type == "programBantuan"] | order(_createdAt asc), ' +
  '"alokasi": *[_type == "alokasiTahunan"] | order(tahun asc), ' +
  '"korelasi": *[_type == "korelasiSektor"] | order(sektor asc)}';

const num = (v: unknown): number =>
  typeof v === "number" && isFinite(v) ? v : 0;
const str = (v: unknown): string => (typeof v === "string" ? v : "");

function normalize(r: {
  program?: unknown[];
  alokasi?: unknown[];
  korelasi?: unknown[];
}): BantuanData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (arr: unknown): any[] => (Array.isArray(arr) ? arr : []);
  const program: BantuanProgram[] = rows(r.program).map((d) => ({
    _id: str(d._id),
    _updatedAt: str(d._updatedAt),
    nama: str(d.nama),
    sumber: d.sumber === "APBD" ? "APBD" : "APBN",
    tahunAnggaran: num(d.tahunAnggaran),
    nilaiRupiah: num(d.nilaiRupiah),
    sektor: str(d.sektor),
    penerimaJumlah: num(d.penerimaJumlah),
    penerimaJenis: str(d.penerimaJenis),
    dampakLevel:
      d.dampakLevel === "Tinggi" || d.dampakLevel === "Sedang"
        ? d.dampakLevel
        : "Rendah",
    dampakCatatan: str(d.dampakCatatan),
  }));
  const alokasi: BantuanAlokasi[] = rows(r.alokasi).map((d) => ({
    _id: str(d._id),
    _updatedAt: str(d._updatedAt),
    tahun: num(d.tahun),
    apbdMiliar: num(d.apbdMiliar),
    apbnMiliar: num(d.apbnMiliar),
  }));
  const korelasi: BantuanKorelasi[] = rows(r.korelasi).map((d) => ({
    _id: str(d._id),
    _updatedAt: str(d._updatedAt),
    sektor: str(d.sektor),
    bantuanMiliar: num(d.bantuanMiliar),
    kenaikanProduksiPct: num(d.kenaikanProduksiPct),
  }));
  const stamps = [...program, ...alokasi, ...korelasi]
    .map((d) => d._updatedAt)
    .filter(Boolean)
    .sort();
  return {
    program,
    alokasi,
    korelasi,
    updatedAt: stamps.length ? stamps[stamps.length - 1] : null,
  };
}

/** Ambil data bantuan (dengan cache stale-if-error; tidak pernah melempar). */
export async function fetchBantuanPemerintah(): Promise<BantuanData> {
  const url = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v1/data/query/${SANITY_DATASET}?query=${encodeURIComponent(GROQ)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { result?: Record<string, unknown> };
    const data = normalize(
      (json.result ?? {}) as {
        program?: unknown[];
        alokasi?: unknown[];
        korelasi?: unknown[];
      },
    );
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ savedAt: Date.now(), data }),
      );
    } catch {
      /* localStorage penuh/blocked — abaikan */
    }
    return data;
  } catch {
    // Gagal (CORS belum diizinkan / offline / gangguan) → cache basi → kosong
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { data?: BantuanData };
        if (parsed.data && Array.isArray(parsed.data.program)) {
          return parsed.data;
        }
      }
    } catch {
      /* cache korup — abaikan */
    }
    return EMPTY_BANTUAN;
  } finally {
    clearTimeout(t);
  }
}

/** Hapus cache (dipakai halaman admin untuk refresh paksa). */
export function clearBantuanCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* abaikan */
  }
}

// ---------- Formatter tampilan ----------

/** 3200000000 → "Rp 3,2 Miliar"; 980000000 → "Rp 980 Juta" */
export function formatRupiahShort(n: number): string {
  if (!isFinite(n) || n <= 0) return "Rp 0";
  if (n >= 1e12)
    return `Rp ${(n / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Triliun`;
  if (n >= 1e9)
    return `Rp ${(n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Miliar`;
  if (n >= 1e6)
    return `Rp ${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 0 })} Juta`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

/** "2026-09-19T03:14:22Z" → "19 September 2026" */
export function formatTanggal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
