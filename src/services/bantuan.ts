/**
 * Data Bantuan Pemerintah — sumber: backend SISPERTANI (MySQL `sispertani`,
 * tabel bantuan_program / bantuan_alokasi / bantuan_korelasi).
 * Diisi manual oleh admin Distan melalui Dasbor Admin (/admin — import Excel).
 * Pengganti Sanity Content Lake (dilepas penuh 2026-09-22).
 *
 * Bentuk BantuanData dipertahankan identik (termasuk _id/_updatedAt) supaya
 * halaman /government-assistance tidak berubah. BantuanTidakAda fallback:
 * cache stale-if-error → EMPTY.
 */
import { API_BASE } from "./api";

export interface ProgramBantuan {
  _id: string;
  _updatedAt: string;
  nama: string;
  sumber: "APBD" | "APBN";
  tahunAnggaran: number;
  nilaiRupiah: number;
  sektor: string;
  penerimaJumlah: number;
  penerimaJenis: string;
  dampakLevel: "Tinggi" | "Sedang" | "Rendah";
  dampakCatatan: string;
}

export interface AlokasiTahunan {
  _id: string;
  _updatedAt: string;
  tahun: number;
  apbdMiliar: number;
  apbnMiliar: number;
}

export interface KorelasiSektor {
  _id: string;
  _updatedAt: string;
  sektor: string;
  bantuanMiliar: number;
  kenaikanProduksiPct: number;
}

export interface BantuanData {
  program: ProgramBantuan[];
  alokasi: AlokasiTahunan[];
  korelasi: KorelasiSektor[];
  updatedAt: string;
}

export const EMPTY: BantuanData = {
  program: [],
  alokasi: [],
  korelasi: [],
  updatedAt: new Date().toISOString(),
};

const CACHE_KEY = "sispertani:bantuan-pemerintah";

/** Cache stale-if-error: bila MySQL/backend gagal, pakai snapshot terakhir. */
function readCache(): BantuanData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: BantuanData };
    return parsed?.data && Array.isArray(parsed.data.program) ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Muat data bantuan dari backend. Fallback: cache lama → EMPTY. */
export async function fetchBantuanPemerintah(): Promise<BantuanData> {
  try {
    const res = await fetch(`${API_BASE}/v1/bantuan`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as BantuanData;
    if (!Array.isArray(data?.program) || !Array.isArray(data?.alokasi) || !Array.isArray(data?.korelasi)) {
      throw new Error("Bentuk data bantuan tidak sesuai");
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt: new Date().toISOString() }));
    return data;
  } catch {
    return readCache() ?? EMPTY;
  }
}

/** Hapus cache bantuan (dipakai dasbor admin setelah import data baru). */
export function clearBantuanCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* localStorage bisa tidak tersedia (private mode) */
  }
}

export function formatRupiahShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 1 })} T`;
  if (abs >= 1e9) return `${(n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1e6) return `${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (abs >= 1e3) return `${(n / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 1 })} rb`;
  return n.toLocaleString("id-ID");
}

export function formatTanggal(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}
