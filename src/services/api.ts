import Papa from "papaparse";

const CACHE_STALE_AGE = 15 * 60 * 1000; // 15 menit limit stale
// Catatan: tidak ada lagi limit umur keras. Cache localStorage berperan sebagai
// "storage darurat" per-browser: saat CKAN down berhari-hari, data terakhir yang
// berhasil diambil tetap dilayani (stale-if-error), dan diperbarui otomatis
// di background begitu CKAN pulih. Snapshot statis di /data/snapshots/ tetap
// menjadi fallback saat browser belum pernah punya cache sama sekali.

// Guard untuk SSR / private mode: localStorage bisa undefined/throw SecurityError
const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(key, value);
    } catch {
      // abaikan (quota / private mode)
    }
  },
  removeItem(key: string): void {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.removeItem(key);
    } catch {
      // abaikan
    }
  },
  listKeys(): string[] {
    try {
      if (typeof localStorage === "undefined") return [];
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) keys.push(k);
      }
      return keys;
    } catch {
      return [];
    }
  },
};

const getCachedData = <T>(key: string): { data: T; isStale: boolean } | null => {
  try {
    const cached = safeLocalStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    // Cache tidak pernah dibuang karena umur — data basi lebih baik daripada
    // tidak ada data saat server CKAN sedang down (stale-if-error).
    return {
      data: parsed.data as T,
      isStale: age > CACHE_STALE_AGE,
    };
  } catch (e) {
    console.warn("Gagal membaca cache localStorage:", e);
    return null;
  }
};

const setCachedData = <T>(key: string, data: T): void => {
  try {
    const payload = {
      timestamp: Date.now(),
      data,
    };
    safeLocalStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn("Gagal menulis cache localStorage:", e);
  }
};

/**
 * Hapus semua entry localStorage yang mengandung substring tertentu.
 * Aman untuk SSR / private mode (no-op bila localStorage tidak tersedia).
 */
export const clearLocalStorageByPattern = (pattern: string): number => {
  const keys = safeLocalStorage.listKeys().filter((k) => k.includes(pattern));
  keys.forEach((k) => safeLocalStorage.removeItem(k));
  return keys.length;
};

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// ============================================================
// FASE B - Sumber utama data: backend MySQL read-only (backend/).
// Skema pengambilan data tiap fetcher:
//   1. API backend (bila tersedia) - data paling segar dari DB.
//   2. Fallback jalur lama (CKAN / CSV lokal / snapshot) - tetap hidup
//      utuh, dipakai otomatis bila backend down/unreachable.
// Deteksi ketersediaan backend dilakukan SEKALI per sesi browser
// (health check) sehingga fallback tidak menunggu timeout tiap fetch.
// ============================================================

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) || "/sispertani-api";

let apiHealthPromise: Promise<boolean> | null = null;

const apiAvailable = (): Promise<boolean> => {
  if (!apiHealthPromise) {
    apiHealthPromise = (async () => {
      try {
        const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 4000);
        if (!res.ok) return false;
        const body = (await res.json()) as { ok?: boolean };
        return body.ok === true;
      } catch {
        return false;
      }
    })();
    apiHealthPromise.catch(() => undefined); // hindari unhandled rejection
  }
  return apiHealthPromise;
};

/** Ambil data dari backend; null bila backend down, endpoint error, atau bentuk respons tidak valid. */
const apiGet = async <T>(path: string): Promise<T | null> => {
  try {
    if (!(await apiAvailable())) return null;
    const res = await fetchWithTimeout(`${API_BASE}${path}`, {}, 8000);
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    // Endpoint array yang sah tidak pernah kosong di dataset nyata;
    // array kosong dibaca sebagai kegagalan agar fallback CSV dijalankan.
    if (Array.isArray(data) && data.length === 0) return null;
    return data;
  } catch {
    return null;
  }
};

/**
 * Bungkus fetcher CSV/CKAN lama dengan sumber utama backend.
 * - Cache SWR dengan prefix `api_` menyimpan hasil TERBAIK terakhir
 *   (dari backend bila hidup, dari fallback bila tidak).
 * - Refresh background selalu mencoba backend dulu lagi.
 * - Fallback internal tetap memakai cache lamanya sendiri.
 */
const apiFirst = <T>(path: string, fetchFromCsv: () => Promise<T>): (() => Promise<T>) => {
  const cacheKey = `api_${path.replace(/\//g, "_")}`;
  const fetchBest = async (): Promise<T> => {
    const fromApi = await apiGet<T>(path);
    if (fromApi !== null) return fromApi;
    return fetchFromCsv();
  };
  return async () => withCache(cacheKey, fetchBest);
};

/**
 * Wrapper stale-while-revalidate: return cache immediately if available,
 * trigger background refresh if stale. If no cache, fetch fresh and cache it.
 */
const withCache = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
): Promise<T> => {
  const cached = getCachedData<T>(cacheKey);

  if (cached) {
    if (cached.isStale) {
      fetchFn()
        .then((data) => setCachedData(cacheKey, data))
        .catch((err) => console.warn(`Gagal update background ${cacheKey}:`, err));
    }
    return cached.data;
  }

  const data = await fetchFn();
  setCachedData(cacheKey, data);
  return data;
};

export interface CkanDataset {
  id: string;
  title: string;
  notes: string;
  organization: {
    title: string;
  };
}

export interface CkanResource {
  id: string;
  name: string;
  format: string;
  url: string;
  description?: string;
  datastore_active?: boolean;
}

export interface CkanCatalogEntry {
  id: string;
  title: string;
  notes: string;
  org: string;
  tags: string[];
  csvUrls: string[];
  xlsxUrls: string[];
  totalResources: number;
}

export interface CkanCatalog {
  totalDatasets: number;
  entries: CkanCatalogEntry[];
  fetchedAt: string;
}

export interface CkanResponse {
  success: boolean;
  result: {
    count: number;
    results: CkanDataset[];
  };
}

export const fetchOpenDataPertanian = async (): Promise<CkanResponse> => {
  const cacheKey = "ckan_open_data_pertanian_cache_v2";
  const cached = getCachedData<CkanResponse>(cacheKey);

  const fetchFresh = async (): Promise<CkanResponse> => {
    const response = await fetchWithTimeout("/api/3/action/package_search?q=pertanian");
    if (!response.ok) throw new Error("Network response was not ok");
    const data: CkanResponse = await response.json();
    setCachedData(cacheKey, data);
    return data;
  };

  if (cached) {
    if (cached.isStale) {
      console.log("Cache open data pertanian stale. Memicu silent update...");
      fetchFresh().catch((err) => console.warn("Gagal update background open data:", err));
    }
    return cached.data;
  }

  try {
    return await fetchFresh();
  } catch (err) {
    // Lapis 2: snapshot katalog lokal (hasil scripts/sync-ckan-snapshot.ps1)
    try {
      console.warn("CKAN tidak terjangkau, memakai snapshot katalog lokal...");
      const snap = await fetchWithTimeout("/data/snapshots/ckan-catalog.json");
      if (!snap.ok) throw new Error("Snapshot tidak ditemukan");
      const catalog = (await snap.json()) as CkanCatalog;
      return {
        success: true,
        result: {
          count: catalog.totalDatasets,
          results: catalog.entries.map((e) => ({
            id: e.id,
            title: e.title,
            notes: e.notes,
            organization: { title: e.org },
          })),
        },
      };
    } catch (e2) {
      console.warn("Gagal fetch online open data & snapshot, menggunakan fallback minimal.", err);
      return {
        success: true,
        result: {
          count: 14,
          results: [
            {
              id: "lahan-pertanian",
              title: "Luas Lahan Pertanian Menurut Jenis Tanah dan Desa",
              notes: "Fallback data lokal",
              organization: { title: "Dinas Pertanian" }
            }
          ]
        }
      };
    }
  }
};

export interface LahanDesa {
  desa: string;
  kecamatan: string;
  lahanSawah: number;
  lahanBukanSawah: number;
  /** BPS ST2023 T4.10 kolom 7 — komponen terbesar (Ha) */
  tanamanTahunan?: number | null;
  /** BPS ST2023 T4.10 kolom 12 — total lahan yang dikuasai usaha tani perorangan (Ha) */
  totalDikuasai?: number | null;
  jumlah: number;
  tahun: string;
}

// Katalog lengkap dataset OpenData Banjarnegara (untuk konteks ChatBot "Si Pertani")
// Mengambil 151 dataset relevan pertanian + URL resource CSV/XLSX masing-masing
export const fetchOpenDataCatalog = async (): Promise<CkanCatalog> => {
  const cacheKey = "ckan_open_data_catalog_cache_v1";
  const cached = getCachedData<CkanCatalog>(cacheKey);

  const fetchFresh = async (): Promise<CkanCatalog> => {
    // Beberapa query untuk mencakup variasi dataset yang tersedia
    const queries = ["pertanian", "pangan", "hortikultura", "perkebunan", "peternakan", "perikanan", "lahan"];
    const allResults: any[] = [];
    const seen = new Set<string>();

    for (const q of queries) {
      try {
        const response = await fetchWithTimeout(
          `/api/3/action/package_search?q=${encodeURIComponent(q)}&rows=100`,
        );
        if (!response.ok) continue;
        const data = await response.json();
        const results = data?.result?.results || [];
        for (const r of results) {
          if (!seen.has(r.id)) {
            seen.add(r.id);
            allResults.push(r);
          }
        }
      } catch (err) {
        console.warn(`Gagal fetch katalog q=${q}:`, err);
      }
    }

    const entries: CkanCatalogEntry[] = allResults.map((d: any) => {
      const resources: CkanResource[] = d.resources || [];
      return {
        id: d.id,
        title: d.title,
        notes: (d.notes || "").slice(0, 200),
        org: d.organization?.title || "Tidak diketahui",
        tags: (d.tags || []).map((t: any) => t.display_name || t.name),
        csvUrls: resources
          .filter((r: any) => (r.format || "").toUpperCase() === "CSV")
          .map((r: any) => r.url)
          .filter(Boolean),
        xlsxUrls: resources
          .filter((r: any) => ["XLSX", "XLS"].includes((r.format || "").toUpperCase()))
          .map((r: any) => r.url)
          .filter(Boolean),
        totalResources: resources.length,
      };
    });

    const catalog: CkanCatalog = {
      totalDatasets: entries.length,
      entries,
      fetchedAt: new Date().toISOString(),
    };

    setCachedData(cacheKey, catalog);
    return catalog;
  };

  if (cached) {
    if (cached.isStale) {
      console.log("Cache katalog opendata stale. Memicu silent update...");
      fetchFresh().catch((err) => console.warn("Gagal update background katalog:", err));
    }
    return cached.data;
  }

  try {
    return await fetchFresh();
  } catch (err) {
    // Lapis 2: snapshot katalog lokal (hasil scripts/sync-ckan-snapshot.ps1)
    try {
      console.warn("CKAN tidak terjangkau, memakai snapshot katalog lokal...");
      const snap = await fetchWithTimeout("/data/snapshots/ckan-catalog.json");
      if (!snap.ok) throw new Error("Snapshot tidak ditemukan");
      const catalog = (await snap.json()) as CkanCatalog;
      setCachedData(cacheKey, catalog);
      return catalog;
    } catch (e2) {
      console.warn("Gagal fetch online katalog opendata & snapshot, menggunakan fallback kosong.", err);
      return {
        totalDatasets: 0,
        entries: [],
        fetchedAt: new Date().toISOString(),
      };
    }
  }
};

const fetchLahanBanjarnegaraCsv = async (): Promise<LahanDesa[]> => {
  // v7: regen 12-kolom Tabel 4.10 ST2023 — jumlah kini = total_dikuasai (kolom 12),
  // ditambah field tanamanTahunan & totalDikuasai.
  const cacheKey = "banjarnegara_lahan_cache_v7";
  const cached = getCachedData<LahanDesa[]>(cacheKey);

  // Fetch-first: file lokal kecil (~50KB), selalu ambil yang terbaru.
  // Cache localStorage HANYA dipakai sebagai darurat saat fetch gagal (offline).
  try {
    const response = await fetch("/data/lahan-fallback.json", { cache: "no-cache" });
    const data = (await response.json()) as LahanDesa[];
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.warn("Gagal memuat data lahan; memakai cache localStorage darurat.", error);
    if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
      return cached.data;
    }
    return [];
  }
};

// Total resmi kabupaten dari dataset tidy Distankan "Luas Penggunaan Lahan
// menurut Jenis Penggunaan (Ha)" â€” dipakai kartu dasbor agar sesuai rilis resmi.
export interface LahanResmiKabupaten {
  tahun: number;
  sawah: number; // I. Lahan sawah (Ha)
  bukanSawah: number; // II. Bukan lahan sawah (Ha)
}

const fetchLahanResmiKabupatenCsv = async (): Promise<LahanResmiKabupaten | null> => {
  return withCache("lahan-resmi-kabupaten-v1", async () => {
    try {
      const response = await fetch(
        "/14. Distankan KP/tidy/Luas Penggunaan Lahan menurut Jenis Penggunaan (Ha)/Luas Penggunaan Lahan menurut Jenis Penggunaan (Ha) tidy.csv",
      );
      if (!response.ok) throw new Error("CSV tidy lahan tidak tersedia");
      const csvText = await response.text();
      return await new Promise<LahanResmiKabupaten | null>((resolve) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const rows = results.data as any[];
            let tahun = 0;
            rows.forEach((r) => {
              const t = parseInt(r.tahun);
              if (!isNaN(t) && t > tahun) tahun = t;
            });
            if (!tahun) return resolve(null);
            const pick = (kat: string) => {
              const row = rows.find(
                (r) => String(r.kategori || "").trim() === kat && parseInt(r.tahun) === tahun,
              );
              const v = row ? parseFloat(String(row.value).replace(",", ".")) : NaN;
              return isNaN(v) ? 0 : v;
            };
            resolve({ tahun, sawah: pick("I. Lahan sawah"), bukanSawah: pick("II. Bukan lahan sawah") });
          },
          error: () => resolve(null),
        });
      });
    } catch (e) {
      console.warn("fetchLahanResmiKabupaten gagal:", e);
      return null;
    }
  });
};

// Normalisasi nama kecamatan dari sumber CKAN/Distan yang kadang memuat
// letter-spacing ("B a w a n g" -> "Bawang"), prefix angka ("2. Purwareja Klampok"),
// atau salah eja ("Purwonegoro" -> "Purwanegara", "Purworejo Klampok" -> "Purwareja Klampok").
const KECAMATAN_VARIANTS: Record<string, string> = {
  "PURWONEGORO": "Purwanegara",
  "PURWOREJO KLAMPOK": "Purwareja Klampok",
  "PURWOREJOKLAMPOK": "Purwareja Klampok",
  "PURWOREJO KLP.": "Purwareja Klampok",
  "PURWOREJO KLP": "Purwareja Klampok",
};

const normalizeKecamatanName = (raw: string): string => {
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
};

export interface PadiProduction {
  kecamatan: string;
  luasPanen: number;
  produksi: number;
  rataRata: number;
  tahun: string;
}

const fetchPadiProductionCsv = async (): Promise<PadiProduction[]> =>
  withCache("cache_padi_production_v5", async () => {
  try {
    let response;
    let isLocal = false;
    try {
      response = await fetch(
        "/14. Distankan KP/Luas  Panen,  Produksi dan Rata-rata Produksi/Luas Panen, Produksi dan Rata-rata Produksi Padi Sawah Dan Padi Ladang CSV.csv",
      );
      if (!response.ok) throw new Error("CSV lokal tidak tersedia");
      isLocal = true;
    } catch (e) {
      // Fallback 1: snapshot CKAN lokal
      try {
        console.warn("CSV lokal padi gagal, mencoba snapshot CKAN...");
        response = await fetchWithTimeout("/data/snapshots/padi-2025.csv");
        if (!response.ok) throw new Error("Snapshot tidak ditemukan");
        isLocal = false;
      } catch (e2) {
        // Fallback 2: CKAN online (terakhir)
        console.warn("Snapshot CKAN gagal, mencoba CKAN online...");
        response = await fetchWithTimeout(
          "/dataset/9238267d-6b2e-4c44-a3f6-6d70351c75a0/resource/8180ee00-dedd-4b08-b165-ef3bd6bb7075/download/total-luas-panen-produksi-dan-rata-rata-produksi-tanaman-pangan-padi-2025.csv",
        );
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || contentType.includes("html")) throw new Error("CKAN online gagal");
        isLocal = false;
      }
    }

    if (!response.ok) throw new Error("Gagal mengambil data produksi padi");
    const csvText = await response.text();

    return new Promise<PadiProduction[]>((resolve) => {
      Papa.parse(csvText, {
        header: isLocal, // Lokal menggunakan header, online tidak
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          const parsedData: PadiProduction[] = [];

          if (isLocal) {
            const rows = results.data as any[];
            // Kelompokkan berdasarkan kecamatan dan ambil data tahun terbaru (misal 2022)
            const mapData = new Map<string, PadiProduction>();

            rows.forEach((row) => {
              const parseNum = (val: string) => {
                if (!val) return 0;
                let cleaned = val.toString().trim().replace(/ /g, "");
                // Jika mengandung koma dan tidak mengandung titik, hapus koma (format ribuan Inggris "12,971")
                if (cleaned.includes(",") && !cleaned.includes(".")) {
                  cleaned = cleaned.replace(/,/g, "");
                } else {
                  // Format Indonesia "12.971,5" -> hapus titik, ubah koma ke titik
                  cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
                }
                return parseFloat(cleaned) || 0;
              };

              const rawKec = row["Kecamatan"] || "";
              // Normalisasi typo BPS
              let normalizedKec = rawKec;
              if (normalizedKec === "Purwonegoro") normalizedKec = "Purwanegara";
              if (normalizedKec === "Purworejo Klampok") normalizedKec = "Purwareja Klampok";
              const kecName = normalizeKecamatanName(normalizedKec);
              if (!kecName || kecName.toLowerCase().includes("jumlah") || kecName.toLowerCase().includes("total")) return;

              const tahunKey = Object.keys(row).find((k) => k.trim().toLowerCase() === "tahun") || "Tahun";
              const year = parseInt(row[tahunKey]) || 0;
              if (!year) return; // lewati baris tanpa tahun valid
              // CSV lokal (normalisasi xlsx asli BPS Distankan): kolom terpisah
              // Padi Sawah + Padi Ladang, nilai total = Sawah + Ladang
              const luasPanen = parseNum(row["Padi Sawah (Ha)"]) + parseNum(row["Padi Ladang (Ha)"]);
              const produksi = parseNum(row["Produksi Padi Sawah (Ton)"]) + parseNum(row["Produksi Padi Ladang(Ton)"]);
              const rataRata = parseNum(row["Rata-rata Produksi Padi Sawah(Kw/Ha)"]);

              const entry: PadiProduction = {
                kecamatan: kecName,
                luasPanen,
                produksi,
                rataRata,
                tahun: year.toString(),
              };

              const key = kecName.toUpperCase();
              const existing = mapData.get(key);
              if (!existing || year > (parseInt(existing.tahun || "0") || 0)) {
                mapData.set(key, entry);
              }
            });

            resolve(Array.from(mapData.values()));
          } else {
            const rows = results.data as string[][];
            for (let i = 4; i < rows.length; i++) {
              const row = rows[i];

              if (
                !row[0] ||
                row[0].toLowerCase().includes("jumlah") ||
                row[0].toLowerCase().includes("total")
              )
                continue;

              const cleanNum = (val: string) => {
                if (!val) return 0;

                return parseFloat(val.replace(/,/g, "")) || 0;
              };

              const nameClean = normalizeKecamatanName(row[0]);

              parsedData.push({
                kecamatan: nameClean,
                luasPanen: cleanNum(row[1]),
                produksi: cleanNum(row[2]),
                rataRata: cleanNum(row[3]),
                tahun: "2025", // Data CKAN online adalah prediksi 2025
              });
            }
            resolve(parsedData);
          }
        },
        error: () => resolve([]),
      });
    });
  } catch (error) {
    console.error("Error fetchPadiProduction:", error);

    return [];
  }
  });

// ---- Riwayat Tahunan Produksi Padi (2018–2025) ----
export interface PadiHistoryPoint {
  tahun: string;
  luasPanen: number;
  produksi: number;
  rataRata: number;
}

const fetchPadiHistoryCsv = async (): Promise<PadiHistoryPoint[]> => {
  const parseNum = (val: string): number => {
    if (!val) return 0;
    let cleaned = val.toString().trim().replace(/ /g, "");
    if (cleaned.includes(",") && !cleaned.includes(".")) {
      cleaned = cleaned.replace(/,/g, "");
    } else {
      cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    }
    return parseFloat(cleaned) || 0;
  };

  type YearAgg = { luas: number; produksi: number; areaWeighted: number; reporters: number };

  const aggregate = (
    agg: Map<string, YearAgg>,
    year: string,
    luas: number,
    produksi: number,
    rata: number,
  ) => {
    const cur = agg.get(year) || { luas: 0, produksi: 0, areaWeighted: 0, reporters: 0 };
    cur.luas += luas;
    cur.produksi += produksi;
    cur.areaWeighted += rata * luas;
    if (luas > 0) cur.reporters += 1; // hanya kecamatan yang benar-benar melapor
    agg.set(year, cur);
  };

  const pruneIncompleteYears = (agg: Map<string, YearAgg>) => {
    // Buang tahun dengan cakupan tidak lengkap di CSV sumber (mis. 2018/2020/2021
    // yang hanya beberapa kecamatan melapor) agar tren & proyeksi tidak terdistorsi
    for (const [y, v] of Array.from(agg.entries())) {
      if (v.reporters < 10) {
        console.warn(`fetchPadiHistory: tahun ${y} dilewati (hanya ${v.reporters} kecamatan melapor)`);
        agg.delete(y);
      }
    }
  };

  const toPoints = (agg: Map<string, YearAgg>): PadiHistoryPoint[] =>
    Array.from(agg.entries())
      .map(([tahun, v]) => ({
        tahun,
        luasPanen: v.luas,
        produksi: v.produksi,
        rataRata: v.luas > 0 ? v.areaWeighted / v.luas : 0,
      }))
      .sort((a, b) => parseInt(a.tahun) - parseInt(b.tahun));

  const agg = new Map<string, YearAgg>();

  try {
    // 1. Data historis multi-tahun (2018–2024) dari CSV lokal (merged, tipe C)
    const localRes = await fetch(
      "/14. Distankan KP/Luas  Panen,  Produksi dan Rata-rata Produksi/Luas Panen, Produksi dan Rata-rata Produksi Padi Sawah Dan Padi Ladang CSV.csv",
    );
    if (localRes.ok) {
      const localText = await localRes.text();
      await new Promise<void>((resolve) => {
        Papa.parse(localText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim(),
          complete: (results) => {
            const rows = results.data as any[];
            rows.forEach((row) => {
              // Normalisasi typo BPS
              let rawKec = row["Kecamatan"] || "";
              if (rawKec === "Purwonegoro") rawKec = "Purwanegara";
              if (rawKec === "Purworejo Klampok") rawKec = "Purwareja Klampok";
              const kecName = normalizeKecamatanName(rawKec);
              if (!kecName || kecName.toLowerCase().includes("jumlah") || kecName.toLowerCase().includes("total")) return;
              const tahunKey = Object.keys(row).find((k) => k.trim().toLowerCase() === "tahun") || "Tahun";
              const year = parseInt(row[tahunKey]) || 0;
              if (!year) return;
              // CSV lokal (normalisasi xlsx asli BPS Distankan): Padi Sawah + Padi Ladang
              const luas = parseNum(row["Padi Sawah (Ha)"]) + parseNum(row["Padi Ladang (Ha)"]);
              const produksi = parseNum(row["Produksi Padi Sawah (Ton)"]) + parseNum(row["Produksi Padi Ladang(Ton)"]);
              const rata = parseNum(row["Rata-rata Produksi Padi Sawah(Kw/Ha)"]);
              aggregate(agg, year.toString(), luas, produksi, rata);
            });
            resolve();
          },
          error: () => resolve(),
        });
      });
    }

    // 2. Titik 2025 (snapshot lokal, fallback online CKAN)
    let snapText: string | null = null;
    try {
      const snapRes = await fetchWithTimeout("/data/snapshots/padi-2025.csv");
      if (snapRes.ok) snapText = await snapRes.text();
    } catch (e) {
      snapText = null;
    }
    if (!snapText) {
      const onlineRes = await fetchWithTimeout(
        "/dataset/9238267d-6b2e-4c44-a3f6-6d70351c75a0/resource/8180ee00-dedd-4b08-b165-ef3bd6bb7075/download/total-luas-panen-produksi-dan-rata-rata-produksi-tanaman-pangan-padi-2025.csv",
      );
      if (onlineRes.ok) snapText = await onlineRes.text();
    }

    if (snapText) {
      await new Promise<void>((resolve) => {
        Papa.parse(snapText, {
          header: false,
          skipEmptyLines: true,
          complete: (results) => {
            const rows = results.data as string[][];
            // Deteksi posisi kolom dari baris header (snapshot lokal berformat
            // "No,Kecamatan,Luas Panen (Ha),Produksi (Ton),Rata-rata Produksi (Kw/Ha)")
            let nameIdx = -1, luasIdx = -1, prodIdx = -1, rataIdx = -1, dataStart = 0;
            for (let i = 0; i < Math.min(rows.length, 10); i++) {
              const r = rows[i];
              for (let c = 0; c < r.length; c++) {
                const cell = (r[c] || "").trim().toLowerCase();
                if (cell === "kecamatan" && nameIdx === -1) nameIdx = c;
                if (/^luas/.test(cell) && luasIdx === -1) luasIdx = c;
                if (/^produksi/.test(cell) && prodIdx === -1) prodIdx = c;
                if (/rata/.test(cell) && rataIdx === -1) rataIdx = c;
              }
              if (nameIdx >= 0 && luasIdx >= 0 && prodIdx >= 0) {
                dataStart = i + 1;
                break;
              }
            }
            // Fallback: format CKAN online lama (tanpa baris header, data mulai baris ke-5)
            if (nameIdx === -1) {
              nameIdx = 0; luasIdx = 1; prodIdx = 2; rataIdx = 3; dataStart = 4;
            }
            const cleanNum = (val: string) => {
              if (!val) return 0;
              return parseFloat(val.replace(/,/g, "")) || 0;
            };
            for (let i = dataStart; i < rows.length; i++) {
              const row = rows[i];
              const rawName = (row[nameIdx] || "").trim();
              if (
                !rawName ||
                rawName.toLowerCase().includes("jumlah") ||
                rawName.toLowerCase().includes("total")
              )
                continue;
              const nameClean = normalizeKecamatanName(rawName);
              if (!nameClean) continue;
              const luas = cleanNum(row[luasIdx]);
              const produksi = cleanNum(row[prodIdx]);
              const rata = cleanNum(row[rataIdx]);
              aggregate(agg, "2025", luas, produksi, rata);
            }
            resolve();
          },
          error: () => resolve(),
        });
      });
    }

    pruneIncompleteYears(agg);
    return toPoints(agg);
  } catch (error) {
    console.error("Error fetchPadiHistory:", error);
    pruneIncompleteYears(agg);
    return toPoints(agg);
  }
};

// ---- Tanaman Pangan (Palawija) ----

export interface FoodCropItem {
  komoditas: string;
  luasPanen: number;
  produksi: number;
  rataRata: number;
}

export interface FoodCropRow {
  kecamatan: string;
  tahun: string;
  items: FoodCropItem[];
}

const cleanFloat = (val?: string | number): number => {
  if (val == null) return 0;
  const s = String(val).trim();
  if (!s || s === "-") return 0;
  return parseFloat(s.replace(/,/g, "")) || 0;
};

// Struktur CSV palawija: [Kecamatan, LuasPanen A, Produksi A, RataA, LuasPanen B, Produksi B, RataB, Tahun]
const parseFoodCrop = (
  text: string,
  komoditasA: string,
  komoditasB: string,
): Promise<FoodCropRow[]> =>
  new Promise((resolve) => {
    Papa.parse(text, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        const out: FoodCropRow[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || !r[0]) continue;
          const kec = normalizeKecamatanName(r[0]);
          if (!kec || kec.toLowerCase().includes("jumlah") || kec.toLowerCase().includes("total")) continue;
          out.push({
            kecamatan: kec,
            tahun: (r[7] || "").trim(),
            items: [
              { komoditas: komoditasA, luasPanen: cleanFloat(r[1]), produksi: cleanFloat(r[2]), rataRata: cleanFloat(r[3]) },
              { komoditas: komoditasB, luasPanen: cleanFloat(r[4]), produksi: cleanFloat(r[5]), rataRata: cleanFloat(r[6]) },
            ],
          });
        }
        resolve(out);
      },
      error: () => resolve([]),
    });
  });

const fetchTanamanPangan = async (
  path: string,
  cacheKey: string,
  komoditasA: string,
  komoditasB: string,
): Promise<FoodCropRow[]> =>
  withCache(cacheKey, async () => {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error("Gagal mengambil data");
      return await parseFoodCrop(await res.text(), komoditasA, komoditasB);
    } catch {
      return [];
    }
  });

const fetchJagungUbiKayuCsv = (): Promise<FoodCropRow[]> =>
  fetchTanamanPangan(
    "/14. Distankan KP/Luas  Panen,  Produksi dan Rata-rata Produksi/Luas Panen, Produksi dan Rata-rata Produksi Tanaman Pangan (Jagung dan Ubi Kayu) CSV.csv",
    "cache_jagung_ubi_kayu_v2",
    "Jagung",
    "Ubi Kayu",
  );

const fetchKacangKedelaiCsv = (): Promise<FoodCropRow[]> =>
  fetchTanamanPangan(
    "/14. Distankan KP/Luas  Panen,  Produksi dan Rata-rata Produksi/Luas Panen, Produksi dan Rata-rata Produksi Tanaman Pangan (Kacang Tanah dan Kedelai) CSV.csv",
    "cache_kacang_kedelai_v2",
    "Kacang Tanah",
    "Kedelai",
  );

const fetchUbiKacangHijauCsv = (): Promise<FoodCropRow[]> =>
  fetchTanamanPangan(
    "/14. Distankan KP/Luas  Panen,  Produksi dan Rata-rata Produksi/Luas Panen, Produksi dan Rata-rata Produksi Tanaman Pangan (Ubi Jalar dan Kacang Hijau) CSV.csv",
    "cache_ubi_kacang_hijau_v2",
    "Ubi Jalar",
    "Kacang Hijau",
  );

// ---- Padi (Sawah + Ladang) untuk halaman Tanaman Pangan ----
// Sumber: CSV normalisasi xlsx asli BPS Distankan (140 baris, 2018-2024).
// CATATAN: jangan pakai file "511b" di _tmp maupun merged lama — keduanya
// berisi data geser/tidak akurat (lihat scripts/regenerate-merged-padi.cjs).
const fetchPadiSawahLadangCsv = (): Promise<FoodCropRow[]> =>
  withCache("cache_padi_sawah_ladang_v1", async () => {
    try {
      const res = await fetch(
        "/14. Distankan KP/Luas  Panen,  Produksi dan Rata-rata Produksi/Luas Panen, Produksi dan Rata-rata Produksi Padi Sawah Dan Padi Ladang CSV.csv",
      );
      if (!res.ok) throw new Error("CSV lokal tidak tersedia");
      const text = await res.text();

      return new Promise<FoodCropRow[]>((resolve) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim(),
          complete: (results) => {
            const rows = results.data as any[];
            const out: FoodCropRow[] = [];
            for (const row of rows) {
              const kec = normalizeKecamatanName(row["Kecamatan"] || "");
              if (
                !kec ||
                kec.toLowerCase().includes("jumlah") ||
                kec.toLowerCase().includes("total")
              )
                continue;
              const tahunKey =
                Object.keys(row).find((k) => k.trim().toLowerCase() === "tahun") ||
                "Tahun";
              const tahun = (row[tahunKey] || "").toString().trim();
              if (!tahun) continue;
              out.push({
                kecamatan: kec,
                tahun,
                items: [
                  {
                    komoditas: "Padi Sawah",
                    luasPanen: cleanFloat(row["Padi Sawah (Ha)"]),
                    produksi: cleanFloat(row["Produksi Padi Sawah (Ton)"]),
                    rataRata: cleanFloat(row["Rata-rata Produksi Padi Sawah(Kw/Ha)"]),
                  },
                  {
                    komoditas: "Padi Ladang",
                    luasPanen: cleanFloat(row["Padi Ladang (Ha)"]),
                    produksi: cleanFloat(row["Produksi Padi Ladang(Ton)"]),
                    rataRata: cleanFloat(row["Rata-rata Produksi Padi Ladang(Ku/Ha)"]),
                  },
                ],
              });
            }
            console.log(
              `✓ fetchPadiSawahLadang: ${out.length} baris (Padi Sawah + Padi Ladang)`,
            );
            resolve(out);
          },
          error: () => resolve([]),
        });
      });
    } catch (error) {
      console.error("Error fetchPadiSawahLadang:", error);
      return [];
    }
  });

export interface VegetableProduction {
  kecamatan: string;
  bawangMerah: number;
  cabaiBesar: number;
  kentang: number;
  kubis: number;
  petsai: number;
  tomat: number;
  bawangPutih: number;
  cabaiRawit: number;
  tahun: string;
}

const fetchVegetableProductionCsv = async (): Promise<
  VegetableProduction[]
> =>
  withCache("cache_vegetable_production_v2", async () => {
  try {
    let response;
    let sourceLabel = "lokal";

    // Prioritas 1: CSV lokal dari folder "14. Distankan KP"
    try {
      response = await fetch(
        "/14. Distankan KP/Produksi Tanaman Sayuran Menurut Kecamatan dan Jenis Tanaman (ton)/Produksi Tanaman Sayuran Menurut Kecamatan dan Jenis Tanaman (ton) CSV.csv",
      );
      if (!response.ok) throw new Error("CSV lokal tidak tersedia");
      sourceLabel = "lokal";
    } catch (e) {
      // Fallback 1: snapshot CKAN lokal
      try {
        console.warn("CSV lokal sayuran gagal, mencoba snapshot CKAN...");
        response = await fetchWithTimeout("/data/snapshots/sayuran-2018-2024.csv");
        if (!response.ok) throw new Error("Snapshot tidak ditemukan");
        sourceLabel = "snapshot CKAN";
      } catch (e2) {
        // Fallback 2: CKAN online (terakhir)
        console.warn("Snapshot CKAN gagal, mencoba CKAN online...");
        response = await fetchWithTimeout(
          "/dataset/226f7b4c-a07c-4248-a837-ea4dba4ec05e/resource/e6481f04-0ffd-40df-871f-7005a8d266cb/download/produksi-tanaman-sayuran-menurut-kecamatan-dan-jenis-tanaman-2018-2024.csv",
        );
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || contentType.includes("html")) throw new Error("CKAN online gagal");
        sourceLabel = "CKAN online";
      }
    }

    if (!response.ok) throw new Error("Gagal mengambil data produksi sayuran dari semua sumber");
    const csvText = await response.text();

    return new Promise<VegetableProduction[]>((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const list = results.data as any[];
          const cleanData: VegetableProduction[] = list
            .map((row) => {
              const cleanNum = (val: any) => {
                if (val === undefined || val === null || val === "") return 0;
                return parseFloat(val.toString().replace(/,/g, "")) || 0;
              };

              // Normalisasi nama kecamatan (Purwonegoro → Purwanegara, Purworejo Klampok → Purwareja Klampok)
              let kecRaw = row["Kecamatan"] || row["kecamatan"] || "";
              if (kecRaw === "Purwonegoro") kecRaw = "Purwanegara";
              if (kecRaw === "Purworejo Klampok") kecRaw = "Purwareja Klampok";
              const kecClean = normalizeKecamatanName(kecRaw);

              // Ambil tahun dari kolom "Tahun" di akhir baris
              const tahunKey = Object.keys(row).find(k => k.trim().toLowerCase() === "tahun") || "Tahun";
              const tahun = (row[tahunKey] || "").toString().trim();

              // Helper: cari kolom dengan pola "<Tanaman> (ton) <Tahun>"
              const findVal = (tanaman: string, yr: string) => {
                const keys = Object.keys(row);
                // Pola 1: "Bawang Merah (ton) 2018" — exact match dengan tahun
                for (const k of keys) {
                  const m = k.match(/^([^(]+?)\s*\(ton\)\s*(\d{4})$/);
                  if (!m) continue;
                  const metricName = m[1].trim();
                  const colYear = m[2];
                  if (metricName === tanaman && colYear === yr) {
                    return row[k];
                  }
                }
                // Pola 2: fallback tanpa suffix tahun (untuk CSV CKAN jika ada)
                const direct = row[tanaman] ?? row[tanaman.toLowerCase().replace(/\s+/g, "_")];
                if (direct !== undefined) return direct;
                
                return undefined;
              };

              return {
                kecamatan: kecClean,
                bawangMerah: cleanNum(findVal("Bawang Merah", tahun)),
                cabaiBesar: cleanNum(findVal("Cabai Besar", tahun)),
                kentang: cleanNum(findVal("Kentang", tahun)),
                kubis: cleanNum(findVal("Kubis", tahun)),
                petsai: cleanNum(findVal("Petsai", tahun)),
                tomat: cleanNum(findVal("Tomat", tahun)),
                bawangPutih: cleanNum(findVal("Bawang Putih", tahun)),
                cabaiRawit: cleanNum(findVal("Cabai Rawit", tahun)),
                tahun: tahun,
              };
            })
            .filter(
              (item) =>
                item.kecamatan &&
                item.tahun &&
                !item.kecamatan.toLowerCase().includes("jumlah") &&
                !item.kecamatan.toLowerCase().includes("total"),
            );

          console.log(`✓ fetchVegetableProduction: loaded ${cleanData.length} rows from ${sourceLabel}`);
          resolve(cleanData);
        },
        error: (err: any) => {
          console.error("Papa.parse error:", err);
          resolve([]);
        },
      });
    });
  } catch (error) {
    console.error("Error fetchVegetableProduction:", error);
    return [];
  }
  });

export interface InflationData {
  pembanding: string;
  inflasi: number;
  tahun: string;
}

const fetchInflationDataCsv = async (): Promise<InflationData[]> =>
  withCache("cache_inflation_data_v1", async () => {
  try {
    let response;
    try {
      response = await fetchWithTimeout(
        "/dataset/5b935f47-a0df-4185-9328-2e13131dcd15/resource/bf424522-8fe9-46a1-99d3-3b102cf890b2/download/perbandingan_laju_inflasi_2018-2024.csv",
      );
      if (!response.ok) throw new Error("Gagal online");
    } catch (e) {
      // Lapis 2: snapshot CKAN lokal (format CSV identik -> lanjut parsing normal)
      try {
        console.warn("CKAN inflasi gagal, mencoba snapshot lokal...");
        response = await fetchWithTimeout("/data/snapshots/inflasi-2018-2024.csv");
        if (!response.ok) throw new Error("Snapshot tidak ditemukan");
      } catch (e2) {
        console.warn("Menggunakan data inflasi fallback lokal.");
        return [
        { pembanding: "Banjarnegara", inflasi: 2.1, tahun: "2024" },
        { pembanding: "Jawa Tengah", inflasi: 2.3, tahun: "2024" },
        { pembanding: "Nasional", inflasi: 2.5, tahun: "2024" },
        { pembanding: "Banjarnegara", inflasi: 2.8, tahun: "2023" },
        { pembanding: "Jawa Tengah", inflasi: 2.9, tahun: "2023" },
        { pembanding: "Nasional", inflasi: 2.6, tahun: "2023" },
        { pembanding: "Banjarnegara", inflasi: 5.4, tahun: "2022" },
        { pembanding: "Jawa Tengah", inflasi: 5.6, tahun: "2022" },
        { pembanding: "Nasional", inflasi: 5.5, tahun: "2022" },
        { pembanding: "Banjarnegara", inflasi: 1.6, tahun: "2021" },
        { pembanding: "Jawa Tengah", inflasi: 1.7, tahun: "2021" },
        { pembanding: "Nasional", inflasi: 1.87, tahun: "2021" },
        { pembanding: "Banjarnegara", inflasi: 1.5, tahun: "2020" },
        { pembanding: "Jawa Tengah", inflasi: 1.56, tahun: "2020" },
        { pembanding: "Nasional", inflasi: 1.68, tahun: "2020" },
      ];
      }
    }

    const csvText = await response.text();

    return new Promise<InflationData[]>((resolve) => {
      Papa.parse(csvText, {
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        complete: (results) => {
          const list = results.data as any[];
          const cleanData: InflationData[] = list
            .map((row) => ({
              pembanding: (row["Pembanding"] || "").trim(),
              inflasi: parseFloat(row["Inflasi"] || "0") || 0,
              tahun: (row["Tahun"] || "").toString().trim(),
            }))
            .filter((item) => item.pembanding !== "");

          resolve(cleanData);
        },
        error: () => resolve([]),
      });
    });
  } catch (error) {
    console.error("Error fetchInflationData:", error);

    return [];
  }
  });

export interface LumbungPangan {
  kecamatan: string;
  lumbungUnit: number;
  lumbungKapasitas: number;
  gudangLuas: number;
  gudangKapasitas: number;
  tahun?: number;
}

// Data lumbung & gudang pangan.
// Prioritas (sesuai perbaikan.md): 1) CSV lokal hasil normalisasi dari 7 xlsx asli BPS di _tmp
// (2018-2024, terverifikasi 140/140 baris vs blok JUMLAH resmi: 63 unit / 95.826 ton pada 2024),
// diambil baris tahun terbaru per kecamatan. 2) Snapshot CKAN 2025. 3) CKAN online.
// Catatan: snapshot CKAN 2025 korup sebagian (Bawang tertulis 12 unit, xlsx asli: 3;
// total kolom = 72 != Jumlah resmi 63) -> hanya dijadikan fallback.
const fetchLumbungPanganCsv = async (): Promise<LumbungPangan[]> =>
  withCache("cache_lumbung_pangan_v3", async () => {
  try {
    let response;
    let isLocal = true;
    try {
      // Lapis 1: CSV lokal (header: Kecamatan, Lumbung Jumlah, Lumbung Kapasitas, Luas (M2), Lumbung Kapasitas/Bulan, Tahun)
      response = await fetchWithTimeout(
        "/14. Distankan KP/Banyaknya Lumbung dan Gudang Pangan/Banyaknya Lumbung dan Gudang Pangan CSV.csv",
      );
      if (!response.ok) throw new Error("CSV lokal tidak tersedia");
    } catch (e) {
      // Lapis 2: snapshot CKAN lokal (format identik dgn CKAN -> isLocal false)
      try {
        console.warn("CSV lokal lumbung gagal, mencoba snapshot CKAN...");
        response = await fetchWithTimeout("/data/snapshots/lumbung-pangan-2025.csv");
        if (!response.ok) throw new Error("Snapshot tidak ditemukan");
        isLocal = false;
      } catch (e2) {
        // Lapis 3: CKAN online (terakhir)
        console.warn("Snapshot lumbung gagal, mencoba CKAN online...");
        response = await fetchWithTimeout(
          "/dataset/bd6ca920-4cd8-49a2-8e5d-291f01e1a11e/resource/1e578131-0fc4-4db4-95a4-a3af66aa7bec/download/banyaknya-lumbung-dan-gudang-pangan-kab-banjarnegara-menurut-kecamatan-2025.csv",
        );
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || contentType.includes("html")) throw new Error("CKAN online gagal");
        isLocal = false;
      }
    }

    if (!response.ok) throw new Error("Gagal mengambil data lumbung pangan");
    const csvText = await response.text();

    return new Promise<LumbungPangan[]>((resolve) => {
      Papa.parse(csvText, {
        header: isLocal,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          const parsedData: LumbungPangan[] = [];

          if (isLocal) {
            // Kelompokkan per kecamatan, ambil baris tahun terbaru (mis. 2024)
            const list = results.data as any[];
            const mapData = new Map<string, { tahun: number; data: LumbungPangan }>();
            let maxTahun = 0;

            list.forEach((row: any) => {
              const rawKec = row["Kecamatan"] || "";
              // Normalisasi typo BPS
              let normalizedKec = rawKec;
              if (normalizedKec === "Purwonegoro") normalizedKec = "Purwanegara";
              if (normalizedKec === "Purworejo Klampok") normalizedKec = "Purwareja Klampok";
              const kecName = normalizeKecamatanName(normalizedKec);
              if (!kecName || kecName.toLowerCase().includes("jumlah") || kecName.toLowerCase().includes("total")) return;

              const tahunKey = Object.keys(row).find((k) => k.trim().toLowerCase() === "tahun") || "Tahun";
              const tahun = parseInt(row[tahunKey]) || 0;
              if (tahun < 2000 || tahun > 2100) return; // lewati baris tanpa tahun valid

              // CSV lokal menyimpan angka polos bergaya JS ("11.3", "95.826") -> cleanFloat aman
              const entry: LumbungPangan = {
                kecamatan: kecName,
                lumbungUnit: cleanFloat(row["Lumbung Jumlah"]),
                lumbungKapasitas: cleanFloat(row["Lumbung Kapasitas"]),
                gudangLuas: cleanFloat(row["Luas (M2)"]),
                gudangKapasitas: cleanFloat(row["Lumbung Kapasitas/Bulan"]),
                tahun,
              };

              const existing = mapData.get(kecName);
              if (!existing || tahun > existing.tahun) {
                mapData.set(kecName, { tahun, data: entry });
                if (tahun > maxTahun) maxTahun = tahun;
              }
            });

            console.log(`Lumbung pangan dari CSV lokal (${mapData.size} kecamatan, tahun terbaru ${maxTahun})`);
            resolve(Array.from(mapData.values()).map((v) => v.data));
          } else {
            // Snapshot/CKAN: 4 baris pertama adalah header bertingkat.
            // Kolom: [no, Kecamatan, Lumbung Unit, Lumbung Kapasitas, Gudang Luas, Gudang Kapasitas]
            const rows = results.data as string[][];
            for (let i = 4; i < rows.length; i++) {
              const row = rows[i];
              if (!row[1] || row[1].replace(/\s/g, "").toLowerCase().includes("jumlah")) continue;

              const kecName = normalizeKecamatanName(row[1]);
              if (!kecName) continue;

              parsedData.push({
                kecamatan: kecName,
                lumbungUnit: cleanFloat(row[2]),
                lumbungKapasitas: cleanFloat(row[3]),
                gudangLuas: cleanFloat(row[4]),
                gudangKapasitas: cleanFloat(row[5]),
              });
            }
            resolve(parsedData);
          }
        },
        error: () => resolve([]),
      });
    });
  } catch (error) {
    console.error("Error fetchLumbungPangan:", error);

    return [];
  }
  });

export interface MarketData {
  jenis: string;
  jumlah: number;
  tahun: string;
}

const fetchMarketDataCsv = async (): Promise<MarketData[]> =>
  withCache("cache_market_data_v1", async () => {
  try {
    let response;
    try {
      response = await fetchWithTimeout(
        "/dataset/d6f86fd9-32b1-40c1-b7c3-ccf311271bff/resource/aa29ce02-f750-46df-b1fd-9ba681bb500c/download/banyaknya-pasar-dirinci-menurut-jenisnya-2016-2025.csv",
      );
      if (!response.ok) throw new Error("Gagal online");
    } catch (e) {
      // Lapis 2: snapshot CKAN lokal (format identik -> lanjut parsing normal)
      try {
        console.warn("CKAN pasar gagal, mencoba snapshot lokal...");
        response = await fetchWithTimeout("/data/snapshots/pasar-2016-2025.csv");
        if (!response.ok) throw new Error("Snapshot tidak ditemukan");
      } catch (e2) {
        console.warn("Menggunakan data pasar fallback lokal.");
        return [
          { jenis: "Pasar Rakyat (Umum)", jumlah: 12, tahun: "2025" },
          { jenis: "Pasar Hewan", jumlah: 2, tahun: "2025" },
          { jenis: "Pasar Desa", jumlah: 45, tahun: "2025" },
          { jenis: "Pasar Rakyat (Umum)", jumlah: 12, tahun: "2024" },
          { jenis: "Pasar Hewan", jumlah: 2, tahun: "2024" },
          { jenis: "Pasar Desa", jumlah: 45, tahun: "2024" },
        ];
      }
    }

    const csvText = await response.text();

    return new Promise<MarketData[]>((resolve) => {
      Papa.parse(csvText, {
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        complete: (results) => {
          const list = results.data as any[];
          const cleanData: MarketData[] = list
            .map((row) => ({
              jenis: (row["Jenis Pasar"] || row["jenis_pasar"] || "").trim(),
              jumlah:
                parseInt(
                  (row["Jumlah Pasar"] || row["jumlah_pasar"] || "0")
                    .toString()
                    .replace(/,/g, ""),
                ) || 0,
              tahun: (row["Tahun"] || row["tahun"] || "").toString().trim(),
            }))
            .filter((item) => item.jenis !== "");

          resolve(cleanData);
        },
        error: () => resolve([]),
      });
    });
  } catch (error) {
    console.error("Error fetchMarketData:", error);

    return [];
  }
  });

export interface TernakKecil {
  kecamatan: string;
  kambing: number;
  domba: number;
  babi: number;
  kelinci: number;
  tahun: string;
}

export interface TernakBesar {
  kecamatan: string;
  sapiPerah: number;
  sapi: number;
  kerbau: number;
  kuda: number;
  tahun: string;
}

export interface Unggas {
  kecamatan: string;
  ayamKampung: number;
  ayamRasLayer: number;
  ayamBroiler: number;
  itikBiasa: number;
  itikManila: number;
  tahun: string;
}

const fetchTernakKecilCsv = async (): Promise<TernakKecil[]> =>
  withCache("cache_ternak_kecil_v2", async () => {
  try {
    // Nama file di disk memakai SPASI GANDA ("Jumlah  Ternak Kecil ... CSV.csv") — jangan dirapatkan!
    const response = await fetch("/14. Distankan KP/Jumlah  Ternak Kecil Menurut Kecamatan dan Jenis Ternak/Jumlah  Ternak Kecil Menurut Kecamatan dan Jenis Ternak CSV.csv");
    if (!response.ok) throw new Error("Gagal mengambil data");
    const text = await response.text();
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true, skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          const rows = results.data as any[];
          // cleanFloat: nilai desimal (mis. Domba 2021 "597.59") TIDAK boleh di-parseInt
          // (strip titik desimal → tergelembung 100x). Baris tanpa tahun 4-digit dilewati.
          resolve(rows.filter(r => {
            const kec = String(r.Kecamatan ?? "").trim();
            if (!kec || kec.toLowerCase().includes("jumlah")) return false;
            return /^\d{4}$/.test(String(r.Tahun ?? "").trim());
          }).map(r => {
            const kecRaw = String(r.Kecamatan ?? "").trim();
            return {
              kecamatan: kecRaw === "Purwonegoro" ? "Purwanegara" : kecRaw.replace("Purworejo Klampok", "Purwareja Klampok"),
              kambing: cleanFloat(r.Kambing),
              domba: cleanFloat(r.Domba),
              babi: cleanFloat(r.Babi),
              kelinci: cleanFloat(r.Kelinci),
              tahun: String(r.Tahun ?? "").trim()
            };
          }));
        }
      });
    });
  } catch (e) { return []; }
  });

const fetchTernakBesarCsv = async (): Promise<TernakBesar[]> =>
  withCache("cache_ternak_besar_v2", async () => {
  try {
    const response = await fetch("/14. Distankan KP/Jumlah Ternak Besar Menurut Kecamatan dan Jenis Ternak/Jumlah Ternak Besar Menurut Kecamatan dan Jenis Ternak CSV.csv");
    if (!response.ok) throw new Error("Gagal mengambil data");
    const text = await response.text();
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true, skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          const rows = results.data as any[];
          resolve(rows.filter(r => {
            const kec = String(r.Kecamatan ?? "").trim();
            if (!kec || kec.toLowerCase().includes("jumlah")) return false;
            return /^\d{4}$/.test(String(r.Tahun ?? "").trim());
          }).map(r => {
            const kecRaw = String(r.Kecamatan ?? "").trim();
            return {
              kecamatan: kecRaw === "Purwonegoro" ? "Purwanegara" : kecRaw.replace("Purworejo Klampok", "Purwareja Klampok"),
              sapi: cleanFloat(r.Sapi),
              sapiPerah: cleanFloat(r["Sapi Perah"]),
              kerbau: cleanFloat(r.Kerbau),
              kuda: cleanFloat(r.Kuda),
              tahun: String(r.Tahun ?? "").trim()
            };
          }));
        }
      });
    });
  } catch (e) { return []; }
  });

const fetchUnggasCsv = async (): Promise<Unggas[]> =>
  withCache("cache_unggas_v2", async () => {
  try {
    const response = await fetch("/14. Distankan KP/Jumlah Unggas Menurut Kecamatan dan Jenis Ternak/Jumlah Unggas Menurut Kecamatan dan Jenis Ternak CSV.csv");
    if (!response.ok) throw new Error("Gagal mengambil data");
    const text = await response.text();
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true, skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          const rows = results.data as any[];
          // cleanFloat mempertahankan nilai negatif (revisi BPS, mis. Itik Biasa 2022 "-65")
          // — parseInt lama membalik tandanya menjadi positif.
          resolve(rows.filter(r => {
            const kec = String(r.Kecamatan ?? "").trim();
            if (!kec || kec.toLowerCase().includes("jumlah")) return false;
            return /^\d{4}$/.test(String(r.Tahun ?? "").trim());
          }).map(r => {
            const kecRaw = String(r.Kecamatan ?? "").trim();
            return {
              kecamatan: kecRaw === "Purwonegoro" ? "Purwanegara" : kecRaw.replace("Purworejo Klampok", "Purwareja Klampok"),
              ayamKampung: cleanFloat(r["Ayam Kampung"]),
              ayamRasLayer: cleanFloat(r["Ayam Ras Layer"]),
              ayamBroiler: cleanFloat(r["Ayam Broiler"]),
              itikBiasa: cleanFloat(r["Itik Biasa"]),
              itikManila: cleanFloat(r["Itik Manila"]),
              tahun: String(r.Tahun ?? "").trim()
            };
          }));
        }
      });
    });
  } catch (e) { return []; }
  });

// ---- Lalu Lintas & Pemotongan Ternak ----

export interface TernakFlowItem {
  jenis: string;
  jumlah: number;
}

export interface TernakFlow {
  kecamatan: string;
  tahun: string;
  unit: string;
  items: TernakFlowItem[];
}

// Struktur CSV lalu-lintas ternak: [Kecamatan, Jumlah Jenis1..N, Tahun].
// Panjang jenisLabels HARUS sama dengan jumlah kolom jenis di CSV — Tahun dibaca
// pada indeks jenisLabels.length + 1 (label kurang → tahun terbaca dari kolom jenis;
// label lebih → kolom Tahun masuk sebagai jumlah, mis. "2019 kg").
// Nilai bisa desimal (Produksi Daging Unggas, mis. "46612.06") → wajib cleanFloat;
// cleanInt menstrip titik desimal → tergelembung 100×.
const parseTernakFlow = (
  text: string,
  jenisLabels: string[],
  unit: string,
): Promise<TernakFlow[]> =>
  new Promise((resolve) => {
    Papa.parse(text, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        const out: TernakFlow[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || !r[0]) continue;
          const kec = normalizeKecamatanName(r[0]);
          if (!kec || kec.toLowerCase().includes("jumlah")) continue;
          const tahun = String(r[jenisLabels.length + 1] ?? "").trim();
          if (!/^\d{4}$/.test(tahun)) continue; // lewati baris tanpa tahun valid
          out.push({
            kecamatan: kec,
            tahun,
            unit,
            items: jenisLabels.map((j, idx) => ({
              jenis: j,
              jumlah: cleanFloat(r[idx + 1]),
            })),
          });
        }
        resolve(out);
      },
      error: () => resolve([]),
    });
  });

const fetchTernakFlow = async (
  path: string,
  cacheKey: string,
  jenisLabels: string[],
  unit: string,
): Promise<TernakFlow[]> =>
  withCache(cacheKey, async () => {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error("Gagal mengambil data");
      return await parseTernakFlow(await res.text(), jenisLabels, unit);
    } catch {
      return [];
    }
  });

const fetchPemasukanTernakCsv = (): Promise<TernakFlow[]> =>
  fetchTernakFlow(
    "/14. Distankan KP/Banyaknya Pemasukan Ternak ke Kabupaten Banjarnegara/Banyaknya Pemasukan Ternak Ke Kabupaten Banjarnegara CSV.csv",
    "cache_pemasukan_ternak_v2",
    ["Sapi Perah", "Sapi Potong", "Kerbau", "Kuda", "Kambing", "Domba"],
    "ekor",
  );

const fetchPengeluaranTernakCsv = (): Promise<TernakFlow[]> =>
  fetchTernakFlow(
    "/14. Distankan KP/Banyaknya Pengeluaran Ternak Potong ke Kabupaten Banjarnegara/Banyaknya Pengeluaran Ternak Potong ke Kabupaten Banjarnegara CSV.csv",
    "cache_pengeluaran_ternak_v2",
    ["Sapi Perah", "Sapi Potong", "Kerbau", "Kuda", "Kambing", "Domba"],
    "ekor",
  );

const fetchLuarRPHCsv = (): Promise<TernakFlow[]> =>
  fetchTernakFlow(
    "/14. Distankan KP/Jumlah (Perkiraan) Ternak yang Dipotong di Luar RPH/Jumlah (Perkiraan) Ternak yang Dipotong di Luar RPH CSV.csv",
    "cache_luar_rph_v2",
    ["Sapi", "Kerbau", "Babi", "Kambing", "Domba"],
    "ekor",
  );

const fetchDagingUnggasCsv = (): Promise<TernakFlow[]> =>
  fetchTernakFlow(
    "/14. Distankan KP/Produksi Daging Unggas Menurut Kecamatan dan Jenis Unggas/Produksi Daging Unggas Menurut Kecamatan dan Jenis Unggas CSV.csv",
    "cache_daging_unggas_v2",
    // CSV hanya punya 2 kolom jenis (Ayam Ras Layer, Ayam Kampung) — Tahun di indeks 3.
    // Label "Itik" lama membuat kolom Tahun terbaca sebagai jumlah (2019 kg!)
    // dan field tahun jadi kosong semua.
    ["Ayam Ras Layer", "Ayam Kampung"],
    "kg",
  );

// ---- Perikanan ----

export interface PerikananBudidaya {
  kecamatan: string;
  kolamPembesaran: number;
  karambaApung: number;
  minaPenyelang: number;
  minaTumpangsari: number;
  tahun: string;
}

export interface PerikananTangkap {
  kecamatan: string;
  jalaTebar: number;
  pancing: number;
  jaringIngsang: number;
  lainnya: number;
  tahun: string;
}

export interface PerikananBenih {
  kecamatan: string;
  dipeliharaSendiri: number;
  dijualLuar: number;
  tahun: string;
}

// Normalisasi header: buang spasi tepi & rapatkan spasi ganda internal
const normalizeHeader = (h: string) => h.trim().replace(/\s+/g, " ");

const isSummaryRow = (kec?: string) => {
  if (!kec) return true;
  const low = kec.toLowerCase();
  return low.includes("jumlah") || low.includes("total");
};

const fetchPerikananBudidayaCsv = async (): Promise<PerikananBudidaya[]> =>
  withCache("cache_perikanan_budidaya_v3", async () => {
  try {
    const response = await fetch(
      "/14. Distankan KP/Luas dan Produksi Ikan Menurut Kecamatan dan Tempat Pemeliharaan/Luas dan Produksi Ikan Menurut Kecamatan dan Jenis Tempat Pemeliharaan CSV.csv",
    );
    if (!response.ok) throw new Error("Gagal mengambil data");
    const text = await response.text();
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
        complete: (results) => {
          const rows = results.data as any[];
          resolve(
            rows
              .filter((r) => !isSummaryRow(r.Kecamatan))
              .map((r) => ({
                kecamatan: normalizeKecamatanName(String(r.Kecamatan ?? "")),
                kolamPembesaran: cleanFloat(r["Kolam Pembesaran Ikan Produksi (Kg)"]),
                karambaApung: cleanFloat(r["Jaring Karamba Apung Produksi (Kg)"]),
                minaPenyelang: cleanFloat(r["Mina Padi Penyelang Produksi (Kg)"]),
                minaTumpangsari: cleanFloat(r["Mina Padi Tumpang sari Produksi (Kg)"]),
                tahun: String(r.Tahun ?? "").trim(),
              }))
              .filter((d) => d.tahun),
          );
        },
      });
    });
  } catch (e) {
    return [];
  }
  });

// ---- Nilai Ekonomi Perikanan (Produksi & Nilai Produksi) ----

export interface NilaiProduksiJenis {
  label: string;
  produksi: number; // kg
  nilai: number; // ribu rupiah
}

export interface NilaiProduksiRow {
  kecamatan: string;
  tahun: string;
  subSektor: "Budidaya" | "Tangkap";
  jenis: NilaiProduksiJenis[];
}

// Pasangan kolom (produksi, nilai) per jenis untuk tiap dataset
const NILAI_BUDIDAYA_PAIRS: { label: string; prod: string; val: string }[] = [
  {
    label: "Kolam Pembesaran",
    prod: "Pembesaran Produksi (Kg)",
    val: "Pembesaran Nilai (Ribu Rupiah)",
  },
  {
    label: "Karamba Jaring Apung",
    prod: "Karamba Jaring Apung Produksi (Kg)",
    val: "Karamba Jaring Apung Nilai (Ribu Rupiah)",
  },
  {
    label: "Minapadi Tumpang Sari",
    prod: "Minapadi Tumpang Sari Produksi (Kg)",
    val: "Minapadi Tumpang Sari Nilai (Ribu Rupiah)",
  },
];

const NILAI_TANGKAP_PAIRS: { label: string; prod: string; val: string }[] = [
  { label: "Jala Tebar", prod: "Jala Tebar Produksi (Kg)", val: "Jala Tebar Nilai (Ribu Rupiah)" },
  { label: "Pancing", prod: "Pancing Produksi (Kg)", val: "Pancing Nilai (Ribu Rupiah)" },
  {
    label: "Jaring Insang",
    prod: "Jaring Ingsang Produksi (Kg)",
    val: "Jaring Ingsang Nilai (Ribu Rupiah)",
  },
  { label: "Lainnya", prod: "Lainnya Produksi (Kg)", val: "Lainnya Nilai (Ribu Rupiah)" },
];

const fetchNilaiProduksi = (
  url: string,
  subSektor: "Budidaya" | "Tangkap",
  pairs: { label: string; prod: string; val: string }[],
): Promise<NilaiProduksiRow[]> =>
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("Gagal mengambil data");
      return res.text();
    })
    .then(
      (text) =>
        new Promise<NilaiProduksiRow[]>((resolve) => {
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: normalizeHeader,
            complete: (results) => {
              const rows = results.data as any[];
              resolve(
                rows
                  .filter((r) => !isSummaryRow(r.Kecamatan))
                  .map((r) => ({
                    kecamatan: normalizeKecamatanName(String(r.Kecamatan ?? "")),
                    tahun: String(r.Tahun ?? "").trim(),
                    subSektor,
                    jenis: pairs.map((p) => ({
                      label: p.label,
                      produksi: cleanFloat(r[p.prod]),
                      nilai: cleanFloat(r[p.val]),
                    })),
                  }))
                  .filter((r) => r.tahun),
              );
            },
          });
        }),
    )
    .catch(() => []);

const fetchNilaiProduksiBudidayaCsv = (): Promise<NilaiProduksiRow[]> =>
  withCache("cache_nilai_produksi_budidaya_v3", () =>
    fetchNilaiProduksi(
      "/14. Distankan KP/Produksi dan Nilai Produksi Perikanan Budidaya Menurut Kecamatan dan Jenis Budidaya/Produksi dan Nilai Produksi Perikanan Budidaya Menurut Kecamatan dan Jenis Budidaya CSV.csv",
      "Budidaya",
      NILAI_BUDIDAYA_PAIRS,
    ),
  );

const fetchNilaiProduksiTangkapCsv = (): Promise<NilaiProduksiRow[]> =>
  withCache("cache_nilai_produksi_tangkap_v3", () =>
    fetchNilaiProduksi(
      "/14. Distankan KP/Produksi dan Nilai Produksi Perikanan Tangkap Menurut Kecamatan dan Jenis Penangkapan/Produksi dan Nilai Produksi Perikanan Tangkap Menurut Kecamatan dan Jenis Penangkapan CSV.csv",
      "Tangkap",
      NILAI_TANGKAP_PAIRS,
    ),
  );

const fetchPerikananTangkapCsv = async (): Promise<PerikananTangkap[]> =>
  withCache("cache_perikanan_tangkap_v3", async () => {
  try {
    const response = await fetch(
      "/14. Distankan KP/Produksi dan Nilai Produksi Perikanan Tangkap Menurut Kecamatan dan Jenis Penangkapan/Produksi dan Nilai Produksi Perikanan Tangkap Menurut Kecamatan dan Jenis Penangkapan CSV.csv",
    );
    if (!response.ok) throw new Error("Gagal mengambil data");
    const text = await response.text();
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
        complete: (results) => {
          const rows = results.data as any[];
          resolve(
            rows
              .filter((r) => !isSummaryRow(r.Kecamatan))
              .map((r) => ({
                kecamatan: normalizeKecamatanName(String(r.Kecamatan ?? "")),
                jalaTebar: cleanFloat(r["Jala Tebar Produksi (Kg)"]),
                pancing: cleanFloat(r["Pancing Produksi (Kg)"]),
                jaringIngsang: cleanFloat(r["Jaring Ingsang Produksi (Kg)"]),
                lainnya: cleanFloat(r["Lainnya Produksi (Kg)"]),
                tahun: String(r.Tahun ?? "").trim(),
              }))
              .filter((d) => d.tahun),
          );
        },
      });
    });
  } catch (e) {
    return [];
  }
  });

const fetchPerikananBenihCsv = async (): Promise<PerikananBenih[]> =>
  withCache("cache_perikanan_benih_v3", async () => {
  try {
    const response = await fetch(
      "/14. Distankan KP/Distribusi Produksi Perikanan Hasil Obyek Pembenihan Ikan/Distribusi Produksi Perikanan Hasil Obyek Pembenihan Ikan CSV.csv",
    );
    if (!response.ok) throw new Error("Gagal mengambil data");
    const text = await response.text();
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
        complete: (results) => {
          const rows = results.data as any[];
          resolve(
            rows
              .filter((r) => !isSummaryRow(r.Kecamatan))
              .map((r) => ({
                kecamatan: normalizeKecamatanName(String(r.Kecamatan ?? "")),
                dipeliharaSendiri: cleanFloat(r["Sendiri"]),
                dijualLuar: cleanFloat(r["Lain Daerah"]),
                tahun: String(r.Tahun ?? "").trim(),
              }))
              .filter((d) => d.tahun),
          );
        },
      });
    });
  } catch (e) {
    return [];
  }
  });

export interface PlantationArea {
  kecamatan: string;
  kelapaSawit: number;
  kelapaDalam: number;
  karet: number;
  kopiRobusta: number;
  kakao: number;
  tebu: number;
  teh: number;
  tembakau: number;
  kopiArabica: number;
  tahun: string;
}

export interface PlantationProduction {
  kecamatan: string;
  kelapaSawit: number;
  kelapaDalam: number;
  karet: number;
  kopiRobusta: number;
  kakao: number;
  tebu: number;
  teh: number;
  tembakau: number;
  tahun: string;
}

const fetchPlantationAreaCsv = async (): Promise<PlantationArea[]> =>
  withCache("cache_plantation_area_v2", async () => {
  try {
    const response = await fetch(
      "/14. Distankan KP/Luas Areal Tanaman Perkebunan Menurut Kecamatan dan Jenis Tanaman (ha)/Luas Areal Tanaman Perkebunan Menurut Kecamatan dan Jenis Tanaman (ha) CSV.csv"
    );
    // Vite dev server membalas index.html (status 200) untuk file yang tidak ada —
    // cek content-type agar tidak mem-parsing HTML sebagai CSV.
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || contentType.includes("html")) throw new Error("Gagal mengambil data");
    const text = await response.text();
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
        complete: (results) => {
          const rows = results.data as any[];
          const out: PlantationArea[] = [];
          for (const row of rows) {
            // Normalisasi nama kecamatan (Purwonegoro → Purwanegara, Purworejo Klampok → Purwareja Klampok)
            let kecRaw = (row["Kecamatan"] || "").toString().replace(/^\d+\.\s*/, "").trim();
            if (kecRaw === "Purwonegoro") kecRaw = "Purwanegara";
            if (kecRaw === "Purworejo Klampok") kecRaw = "Purwareja Klampok";
            if (!kecRaw || isSummaryRow(kecRaw)) continue;
            const kecClean = normalizeKecamatanName(kecRaw);
            const tahun = (row["Tahun"] || "").toString().trim();
            if (!/^\d{4}$/.test(tahun)) continue;
            // CSV berformat wide×tahun: kolom "Kelapa Sawit (ha) 2017" … "(ha) 2024",
            // nilai hanya terisi pada grup kolom yang cocok dengan kolom "Tahun".
            const findVal = (tanaman: string, yr: string) => {
              for (const k of Object.keys(row)) {
                const m = k.match(/^([^(]+?)\s*\(ha\)\s*(\d{4})$/);
                if (m && m[1].trim() === tanaman && m[2] === yr) return row[k];
              }
              const direct = row[tanaman];
              return direct !== undefined ? direct : undefined;
            };
            out.push({
              kecamatan: kecClean,
              kelapaSawit: cleanFloat(findVal("Kelapa Sawit", tahun)),
              kelapaDalam: cleanFloat(findVal("Kelapa Dalam", tahun)),
              karet: cleanFloat(findVal("Karet", tahun)),
              kopiRobusta: cleanFloat(findVal("Kopi Robusta", tahun)),
              kakao: cleanFloat(findVal("Kakao", tahun)),
              tebu: cleanFloat(findVal("Tebu", tahun)),
              teh: cleanFloat(findVal("Teh", tahun)),
              tembakau: cleanFloat(findVal("Tembakau", tahun)),
              kopiArabica: cleanFloat(findVal("Kopi Arabica", tahun)),
              tahun,
            });
          }
          resolve(out);
        },
      });
    });
  } catch (e) {
    return [];
  }
  });

const fetchPlantationProductionCsv = async (): Promise<PlantationProduction[]> =>
  withCache("cache_plantation_production_v2", async () => {
  try {
    const response = await fetch(
      "/14. Distankan KP/Produksi Perkebunan Menurut Kecamatan dan Jenis Tanaman (ton)/Produksi Perkebunan Menurut Kecamatan dan Jenis Tanaman (ton) CSV.csv"
    );
    // Vite dev server membalas index.html (status 200) untuk file yang tidak ada —
    // cek content-type agar tidak mem-parsing HTML sebagai CSV.
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || contentType.includes("html")) throw new Error("Gagal mengambil data");
    const text = await response.text();
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
        complete: (results) => {
          const rows = results.data as any[];
          // Data 2017–2021 memuat baris agregat kabupaten per komoditas
          // ("JENIS", "Kakao", "Karet", dst. — nilainya di kolom ke-2, bukan di grup
          // kolom tahun). Baris itu bukan kecamatan — filter agar tidak terbaca sebagai data.
          const AGG_ROWS = new Set([
            "JENIS",
            "Jenis",
            "Kakao",
            "Karet",
            "Kelapa Dalam",
            "Kelapa Sawit",
            "Kopi Robusta",
            "Kopi Arabica",
            "Tebu",
            "Teh",
            "Tembakau",
          ]);
          const out: PlantationProduction[] = [];
          for (const row of rows) {
            // Normalisasi nama kecamatan (Purwonegoro → Purwanegara, Purworejo Klampok → Purwareja Klampok)
            let kecRaw = (row["Kecamatan"] || "").toString().replace(/^\d+\.\s*/, "").trim();
            if (kecRaw === "Purwonegoro") kecRaw = "Purwanegara";
            if (kecRaw === "Purworejo Klampok") kecRaw = "Purwareja Klampok";
            if (!kecRaw || isSummaryRow(kecRaw) || AGG_ROWS.has(kecRaw)) continue;
            const kecClean = normalizeKecamatanName(kecRaw);
            const tahun = (row["Tahun"] || "").toString().trim();
            if (!/^\d{4}$/.test(tahun)) continue;
            // CSV berformat wide×tahun: kolom "Kelapa Sawit (ton) 2017" … "(ton) 2024",
            // nilai hanya terisi pada grup kolom yang cocok dengan kolom "Tahun".
            // (Kolom "Kelapa Dalam (ton)" baru ada mulai 2018 → 2017 bernilai 0.)
            const findVal = (tanaman: string, yr: string) => {
              for (const k of Object.keys(row)) {
                const m = k.match(/^([^(]+?)\s*\(ton\)\s*(\d{4})$/);
                if (m && m[1].trim() === tanaman && m[2] === yr) return row[k];
              }
              const direct = row[tanaman];
              return direct !== undefined ? direct : undefined;
            };
            out.push({
              kecamatan: kecClean,
              kelapaSawit: cleanFloat(findVal("Kelapa Sawit", tahun)),
              kelapaDalam: cleanFloat(findVal("Kelapa Dalam", tahun)),
              karet: cleanFloat(findVal("Karet", tahun)),
              kopiRobusta: cleanFloat(findVal("Kopi Robusta", tahun)),
              kakao: cleanFloat(findVal("Kakao", tahun)),
              tebu: cleanFloat(findVal("Tebu", tahun)),
              teh: cleanFloat(findVal("Teh", tahun)),
              tembakau: cleanFloat(findVal("Tembakau", tahun)),
              tahun,
            });
          }
          resolve(out);
        },
      });
    });
  } catch (e) {
    return [];
  }
  });

export interface VegetableArea {
  kecamatan: string;
  bawangMerah: number;
  cabaiBesar: number;
  kentang: number;
  kubis: number;
  petsai: number;
  tomat: number;
  bawangPutih: number;
  cabaiRawit: number;
  tahun: string;
}

export interface FruitProduction {
  kecamatan: string;
  mangga: number;
  durian: number;
  jerukBesar: number;
  pisang: number;
  pepaya: number;
  salak: number;
  jerukSiam: number;
  tahun: string;
}

export interface AnnualHorticultureProduction {
  jenisTanaman: string;
  produksiTon: number;
  tahun: string;
}

const bpsAnnualHorticulture2025: AnnualHorticultureProduction[] = [
  { jenisTanaman: "Alpukat", produksiTon: 2126.043, tahun: "2025" },
  { jenisTanaman: "Belimbing", produksiTon: 33.792, tahun: "2025" },
  { jenisTanaman: "Duku/Langsat/Kokosan", produksiTon: 1329.105, tahun: "2025" },
  { jenisTanaman: "Durian", produksiTon: 12809.925, tahun: "2025" },
  { jenisTanaman: "Jambu Air", produksiTon: 285.218, tahun: "2025" },
  { jenisTanaman: "Jambu Biji", produksiTon: 2813.476, tahun: "2025" },
  { jenisTanaman: "Jengkol", produksiTon: 556.41, tahun: "2025" },
  { jenisTanaman: "Jeruk Siam/Keprok", produksiTon: 40.2, tahun: "2025" },
  { jenisTanaman: "Mangga", produksiTon: 589.75, tahun: "2025" },
  { jenisTanaman: "Manggis", produksiTon: 326.193, tahun: "2025" },
  { jenisTanaman: "Melinjo", produksiTon: 883.675, tahun: "2025" },
  { jenisTanaman: "Nangka/Cempedak", produksiTon: 2350.192, tahun: "2025" },
  { jenisTanaman: "Nenas", produksiTon: 81.124, tahun: "2025" },
  { jenisTanaman: "Pepaya", produksiTon: 3509.496, tahun: "2025" },
  { jenisTanaman: "Petai", produksiTon: 3279.633, tahun: "2025" },
  { jenisTanaman: "Pisang", produksiTon: 18090.363, tahun: "2025" },
  { jenisTanaman: "Rambutan", produksiTon: 1800.123, tahun: "2025" },
  { jenisTanaman: "Salak", produksiTon: 127950.403, tahun: "2025" },
  { jenisTanaman: "Sawo", produksiTon: 9.732, tahun: "2025" },
  { jenisTanaman: "Sirsak", produksiTon: 248.525, tahun: "2025" },
  { jenisTanaman: "Sukun", produksiTon: 10.795, tahun: "2025" },
  { jenisTanaman: "Buah Naga", produksiTon: 62.72, tahun: "2025" },
  { jenisTanaman: "Jeruk Lemon", produksiTon: 870.173, tahun: "2025" },
  { jenisTanaman: "Lengkeng", produksiTon: 16.875, tahun: "2025" },
];

const fetchVegetableAreaCsv = async (): Promise<VegetableArea[]> =>
  withCache("cache_vegetable_area_v2", async () => {
  try {
    const response = await fetch(
      "/14. Distankan KP/Luas Panen Tanaman Sayuran Menurut Kecamatan dan Jenis Tanaman (ha)/Luas Panen Tanaman Sayuran Menurut Kecamatan dan Jenis Tanaman (ha) CSV.csv"
    );
    // Vite dev server membalas index.html (status 200) untuk file yang tidak ada —
    // cek content-type agar tidak mem-parsing HTML sebagai CSV.
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || contentType.includes("html")) throw new Error("Gagal mengambil data");
    const text = await response.text();
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
        complete: (results) => {
          const rows = results.data as any[];
          const out: VegetableArea[] = [];
          for (const row of rows) {
            // Normalisasi nama kecamatan (Purwonegoro → Purwanegara, Purworejo Klampok → Purwareja Klampok)
            let kecRaw = (row["Kecamatan"] || "").toString().replace(/^\d+\.\s*/, "").trim();
            if (kecRaw === "Purwonegoro") kecRaw = "Purwanegara";
            if (kecRaw === "Purworejo Klampok") kecRaw = "Purwareja Klampok";
            if (!kecRaw || isSummaryRow(kecRaw)) continue;
            const kecClean = normalizeKecamatanName(kecRaw);
            const tahun = (row["Tahun"] || "").toString().trim();
            if (!/^\d{4}$/.test(tahun)) continue;
            // CSV berformat wide×tahun: kolom "Bawang Merah (ha) 2017" … "(ha) 2024",
            // nilai hanya terisi pada grup kolom yang cocok dengan kolom "Tahun".
            const findVal = (tanaman: string, yr: string) => {
              for (const k of Object.keys(row)) {
                const m = k.match(/^([^(]+?)\s*\(ha\)\s*(\d{4})$/);
                if (m && m[1].trim() === tanaman && m[2] === yr) return row[k];
              }
              const direct = row[tanaman];
              return direct !== undefined ? direct : undefined;
            };
            out.push({
              kecamatan: kecClean,
              bawangMerah: cleanFloat(findVal("Bawang Merah", tahun)),
              cabaiBesar: cleanFloat(findVal("Cabai Besar", tahun)),
              kentang: cleanFloat(findVal("Kentang", tahun)),
              kubis: cleanFloat(findVal("Kubis", tahun)),
              petsai: cleanFloat(findVal("Petsai", tahun)),
              tomat: cleanFloat(findVal("Tomat", tahun)),
              bawangPutih: cleanFloat(findVal("Bawang Putih", tahun)),
              cabaiRawit: cleanFloat(findVal("Cabai Rawit", tahun)),
              tahun,
            });
          }
          resolve(out);
        },
      });
    });
  } catch (e) {
    return [];
  }
  });

const fetchAnnualHorticultureProductionCsv = async (): Promise<AnnualHorticultureProduction[]> =>
  withCache("cache_annual_horticulture_prod_v2", async () => {
  try {
    const response = await fetch(
      "/14. Distankan KP/Produksi Buah-buahan dan Sayuran Tahunan Menurut Jenis Tanaman (ton)/Produksi Buah-buahan dan Sayuran Tahunan Menurut Jenis Tanaman (ton) CSV.csv"
    );
    // Vite dev server membalas index.html (status 200) untuk file yang tidak ada —
    // cek content-type agar tidak mem-parsing HTML sebagai CSV.
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || contentType.includes("html")) return bpsAnnualHorticulture2025;

    const text = await response.text();
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
        complete: (results) => {
          const rows = results.data as any[];
          // Header bisa "Jenis Tanaman" atau "Jenis tanaman" — cari case-insensitive
          const sample = rows[0] || {};
          const jenisKey =
            Object.keys(sample).find((k) => /^jenis\s*tanaman$/i.test(k.trim())) || "Jenis Tanaman";
          const prodKey =
            Object.keys(sample).find((k) => /^produksi\s*\(ton\)$/i.test(k.trim())) || "Produksi (ton)";
          const tahunKey = Object.keys(sample).find((k) => /^tahun$/i.test(k.trim())) || "Tahun";
          const localRows: AnnualHorticultureProduction[] = rows
            .map((r) => ({
              jenisTanaman: (r[jenisKey] || "").toString().trim(),
              produksiTon: cleanFloat(r[prodKey]),
              tahun: (r[tahunKey] || "").toString().trim(),
            }))
            .filter(
              (r) =>
                r.jenisTanaman &&
                !isSummaryRow(r.jenisTanaman) &&
                /^\d{4}$/.test(r.tahun)
            );

          resolve([...localRows, ...bpsAnnualHorticulture2025]);
        },
        error: () => resolve(bpsAnnualHorticulture2025),
      });
    });
  } catch (e) {
    return bpsAnnualHorticulture2025;
  }
  });

const fetchFruitProductionCsv = async (): Promise<FruitProduction[]> =>
  withCache("cache_fruit_production_v2", async () => {
  try {
    const response = await fetch(
      "/14. Distankan KP/Produksi Buah-buahan Menurut Kecamatan dan Jenis Tanaman (ton)/Produksi Buah-buahan Menurut Kecamatan dan Jenis Tanaman (ton) CSV.csv"
    );
    // Vite dev server membalas index.html (status 200) untuk file yang tidak ada —
    // cek content-type agar tidak mem-parsing HTML sebagai CSV.
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || contentType.includes("html")) throw new Error("Gagal mengambil data");
    const text = await response.text();
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
        complete: (results) => {
          const rows = results.data as any[];
          const out: FruitProduction[] = [];
          for (const row of rows) {
            // Normalisasi nama kecamatan (Purwonegoro → Purwanegara, Purworejo Klampok → Purwareja Klampok)
            let kecRaw = (row["Kecamatan"] || "").toString().replace(/^\d+\.\s*/, "").trim();
            if (kecRaw === "Purwonegoro") kecRaw = "Purwanegara";
            if (kecRaw === "Purworejo Klampok") kecRaw = "Purwareja Klampok";
            if (!kecRaw || isSummaryRow(kecRaw)) continue;
            const kecClean = normalizeKecamatanName(kecRaw);
            const tahun = (row["Tahun"] || "").toString().trim();
            if (!/^\d{4}$/.test(tahun)) continue;
            // CSV berformat wide×tahun: kolom "Mangga (ton) 2017" … "(ton) 2024",
            // nilai hanya terisi pada grup kolom yang cocok dengan kolom "Tahun".
            const findVal = (tanaman: string, yr: string) => {
              for (const k of Object.keys(row)) {
                const m = k.match(/^([^(]+?)\s*\(ton\)\s*(\d{4})$/);
                if (m && m[1].trim() === tanaman && m[2] === yr) return row[k];
              }
              const direct = row[tanaman];
              return direct !== undefined ? direct : undefined;
            };
            out.push({
              kecamatan: kecClean,
              mangga: cleanFloat(findVal("Mangga", tahun)),
              durian: cleanFloat(findVal("Durian", tahun)),
              jerukBesar: cleanFloat(findVal("Jeruk Besar", tahun)),
              pisang: cleanFloat(findVal("Pisang", tahun)),
              pepaya: cleanFloat(findVal("Pepaya", tahun)),
              salak: cleanFloat(findVal("Salak", tahun)),
              jerukSiam: cleanFloat(findVal("Jeruk Siam", tahun)),
              tahun,
            });
          }
          resolve(out);
        },
      });
    });
  } catch (e) {
    return [];
  }
  });

export interface KelompokTaniHutanDetail {
  namaKelompok: string;
  noRegister: string;
  tanggalBerdiri: string;
  kelas: string;
  alamat: string;
  ketua: string;
}

export interface KelompokTaniRow {
  desa: string;
  kecamatan: string;
  kelompokTani: number;
  anggotaTani: number;
  kelompokPerikanan: number;
  anggotaPerikanan: number;
  gapoktan: number;
  anggotaGapoktan: number;
  tahun: string;
  kelompokTaniHutan?: number;
  anggotaTaniHutan?: number;
  kthPemula?: number;
  kthMadya?: number;
  kthUtama?: number;
  kelompokTaniHutanList?: KelompokTaniHutanDetail[];
}

const normalizeKecamatan = (title: string): string => {
  const upper = title.toUpperCase();
  if (upper.includes("BANJARMANGU")) return "Banjarmangu";
  if (upper.includes("BANJARNEGARA")) return "Banjarnegara";
  if (upper.includes("BATUR")) return "Batur";
  if (upper.includes("BAWANG")) return "Bawang";
  if (upper.includes("KALIBENING")) return "Kalibening";
  if (upper.includes("KARANGKOBAR")) return "Karangkobar";
  if (upper.includes("MADUKARA")) return "Madukara";
  if (upper.includes("MANDIRAJA")) return "Mandiraja";
  if (upper.includes("PAGEDONGAN")) return "Pagedongan";
  if (upper.includes("PAGENTAN")) return "Pagentan";
  if (upper.includes("PANDANARUM")) return "Pandanarum";
  if (upper.includes("PEJAWARAN")) return "Pejawaran";
  if (upper.includes("PUNGGELAN")) return "Punggelan";
  if (upper.includes("PURWANEGARA")) return "Purwanegara";
  if (upper.includes("KLAMPOK") || upper.includes("PURWAREJA")) return "Purwareja Klampok";
  if (upper.includes("RAKIT")) return "Rakit";
  if (upper.includes("SIGALUH")) return "Sigaluh";
  if (upper.includes("SUSUKAN")) return "Susukan";
  if (upper.includes("WANADADI") || upper.includes("WONODADI")) return "Wanadadi";
  if (upper.includes("WANAYASA")) return "Wanayasa";
  return title;
};

const normalizeDesaName = (value: string): string =>
  value
    .toUpperCase()
    .replace(/^DESA\s+/i, "")
    .replace(/^KELURAHAN\s+/i, "")
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const getKelompokTaniKey = (desa: string, kecamatan: string): string =>
  `${normalizeDesaName(desa)}_${normalizeKecamatan(kecamatan).toUpperCase()}`;

const mergeKelompokTaniHutan = (baseData: KelompokTaniRow[], hutanData: KelompokTaniRow[]): KelompokTaniRow[] => {
  if (hutanData.length === 0) return baseData;

  const hutanByKey = new Map<string, KelompokTaniRow>();

  hutanData.forEach((item) => {
    hutanByKey.set(getKelompokTaniKey(item.desa, item.kecamatan), item);
  });

  const merged = baseData.map((item) => {
    const key = getKelompokTaniKey(item.desa, item.kecamatan);
    const hutan = hutanByKey.get(key);

    if (!hutan) return item;

    return {
      ...item,
      kelompokTaniHutan: hutan.kelompokTaniHutan,
      anggotaTaniHutan: hutan.anggotaTaniHutan,
      kthPemula: hutan.kthPemula,
      kthMadya: hutan.kthMadya,
      kthUtama: hutan.kthUtama,
      kelompokTaniHutanList: hutan.kelompokTaniHutanList,
    };
  });

  // Catatan: baris hutan untuk desa yang tidak ada di data kelembagaan Dinas TIDAK
  // di-append lagi. Dulu di-append dengan tahun "2026" sehingga muncul opsi tahun
  // 2026 yang menyesatkan (semua poktan 0). KTH untuk seluruh kecamatan (termasuk
  // 5 kecamatan tanpa data Dinas) kini disajikan lewat fetchKelompokTaniHutanSnapshot.
  return merged;
};

const fetchKelompokTaniHutan = async (): Promise<KelompokTaniRow[]> => {
  try {
    const response = await fetch("/data/kelompok-tani-hutan.json");
    if (!response.ok) return [];
    return (await response.json()) as KelompokTaniRow[];
  } catch {
    return [];
  }
};

/**
 * Snapshot Kelompok Tani Hutan (KTH) SIMLUH seluruh 20 kecamatan.
 * Tidak terikat tahun data kelembagaan Dinas — dipakai untuk statistik KTH
 * yang mencakup kecamatan tanpa data Dinas (Banjarmangu, Kalibening, Madukara,
 * Pagedongan, Purwareja Klampok) dan sebagai panel snapshot terpisah.
 */
const fetchKelompokTaniHutanSnapshotCsv = async (): Promise<KelompokTaniRow[]> =>
  withCache("cache_kelompok_tani_hutan_snapshot_v1", async () => fetchKelompokTaniHutan());

const fetchKelompokTaniCsv = async (): Promise<KelompokTaniRow[]> => {
  const cacheKey = "banjarnegara_kelompok_tani_cache_v6";

  const fetchFresh = async (): Promise<KelompokTaniRow[]> => {
    let fallbackData: KelompokTaniRow[] = [];
    try {
      const response = await fetch("/data/kelompok-tani-fallback.json");
      if (response.ok) {
        fallbackData = (await response.json()) as KelompokTaniRow[];
      }
    } catch {
      fallbackData = [];
    }
    const hutanData = await fetchKelompokTaniHutan();
    const mergedData = mergeKelompokTaniHutan(fallbackData, hutanData);
    setCachedData(cacheKey, mergedData);
    return mergedData;
  };

  const cached = getCachedData<KelompokTaniRow[]>(cacheKey);
  if (cached) {
    if (cached.isStale) {
      fetchFresh().catch((err) =>
        console.warn("Gagal update background kelompoktani:", err),
      );
    }
    return cached.data;
  }

  return fetchFresh();
};

// ===================== ST2023 PER-DESA (EKSTRAKSI PDF BPS) =====================
// Data per-desa dari PDF Hasil Sensus Pertanian 2023 (BPS) untuk kecamatan yang
// tidak punya data kelembagaan/CKAN (saat ini: Kalibening, Banjarmangu).
// Diekstrak oleh scripts/scraping/extract-st2023-extra.py
//   -> digabung scripts/build-st2023-extra-fallback.ps1
//   -> public/data/st2023-desa-fallback.json
export interface St2023DesaExtra {
  desa: string;
  kecamatan: string;
  rumahTanggaPetani?: number; // RT petani (Tabel 2.9)
  petani?: number; // petani, orang (Tabel 2.9)
  rtAnggotaKelompok?: number; // RTUP anggota kelompok tani/peternak/nelayan (Tabel 5.1)
  rtBukanAnggotaKelompok?: number;
  rtup?: number; // total RTUP (Tabel 5.1)
  rtPerikanan?: number; // RT usaha perikanan (Tabel 10.1)
  rtPerikananBudidaya?: number;
  rtPerikananTangkap?: number;
  ternak?: Record<string, number>; // populasi ternak (ekor) per 1 Mei 2023 (Tabel 9.9)
  sumber?: string;
}

const fetchSt2023DesaExtraCsv = async (): Promise<St2023DesaExtra[]> =>
  withCache("cache_st2023_desa_extra_v2", async () => {
    try {
      const response = await fetch("/data/st2023-desa-fallback.json");
      if (!response.ok) throw new Error("Gagal mengambil data ST2023 per-desa");
      return (await response.json()) as St2023DesaExtra[];
    } catch (e) {
      console.warn("fetchSt2023DesaExtra: file ST2023 per-desa belum tersedia.", e);
      return [];
    }
  });

// ============================================================
// FASE B - Export fetcher publik: backend MySQL dulu, fallback
// CSV/CKAN/snapshot (implementasi *Csv di atas) tetap hidup.
// fetchOpenDataPertanian & fetchOpenDataCatalog TIDAK dibungkus:
// keduanya katalog CKAN live, bukan data numerik yang dimigrasi.
// ============================================================

export const fetchLahanBanjarnegara = apiFirst<LahanDesa[]>("/v1/lahan/desa?regen=t410", fetchLahanBanjarnegaraCsv);
export const fetchLahanResmiKabupaten = apiFirst<LahanResmiKabupaten | null>("/v1/lahan/kabupaten", fetchLahanResmiKabupatenCsv);
export const fetchPadiProduction = apiFirst<PadiProduction[]>("/v1/padi/production", fetchPadiProductionCsv);
export const fetchPadiHistory = apiFirst<PadiHistoryPoint[]>("/v1/padi/history", fetchPadiHistoryCsv);
export const fetchJagungUbiKayu = apiFirst<FoodCropRow[]>("/v1/palawija/jagung-ubi-kayu", fetchJagungUbiKayuCsv);
export const fetchKacangKedelai = apiFirst<FoodCropRow[]>("/v1/palawija/kacang-kedelai", fetchKacangKedelaiCsv);
export const fetchUbiKacangHijau = apiFirst<FoodCropRow[]>("/v1/palawija/ubi-kacang-hijau", fetchUbiKacangHijauCsv);
export const fetchPadiSawahLadang = apiFirst<FoodCropRow[]>("/v1/padi/sawah-ladang", fetchPadiSawahLadangCsv);
export const fetchVegetableProduction = apiFirst<VegetableProduction[]>("/v1/hortikultura/sayuran-produksi", fetchVegetableProductionCsv);
export const fetchVegetableArea = apiFirst<VegetableArea[]>("/v1/hortikultura/sayuran-luas", fetchVegetableAreaCsv);
export const fetchFruitProduction = apiFirst<FruitProduction[]>("/v1/hortikultura/buah-produksi", fetchFruitProductionCsv);
export const fetchAnnualHorticultureProduction = apiFirst<AnnualHorticultureProduction[]>("/v1/hortikultura/produksi-tahunan", fetchAnnualHorticultureProductionCsv);
export const fetchInflationData = apiFirst<InflationData[]>("/v1/ekonomi/inflasi", fetchInflationDataCsv);
export const fetchMarketData = apiFirst<MarketData[]>("/v1/ekonomi/pasar", fetchMarketDataCsv);
export const fetchLumbungPangan = apiFirst<LumbungPangan[]>("/v1/lumbung", fetchLumbungPanganCsv);
export const fetchTernakKecil = apiFirst<TernakKecil[]>("/v1/peternakan/kecil", fetchTernakKecilCsv);
export const fetchTernakBesar = apiFirst<TernakBesar[]>("/v1/peternakan/besar", fetchTernakBesarCsv);
export const fetchUnggas = apiFirst<Unggas[]>("/v1/peternakan/unggas", fetchUnggasCsv);
export const fetchPemasukanTernak = apiFirst<TernakFlow[]>("/v1/peternakan/pemasukan", fetchPemasukanTernakCsv);
export const fetchPengeluaranTernak = apiFirst<TernakFlow[]>("/v1/peternakan/pengeluaran", fetchPengeluaranTernakCsv);
export const fetchLuarRPH = apiFirst<TernakFlow[]>("/v1/peternakan/luar-rph", fetchLuarRPHCsv);
export const fetchDagingUnggas = apiFirst<TernakFlow[]>("/v1/peternakan/daging-unggas", fetchDagingUnggasCsv);
export const fetchPerikananBudidaya = apiFirst<PerikananBudidaya[]>("/v1/perikanan/budidaya", fetchPerikananBudidayaCsv);

export interface TernakSusuKulit {
  kecamatan: string;
  jenis: "Sapi/Kerbau" | "Kambing/Domba";
  tahun: string;
  jumlah: number;
  satuan: string;
}

/**
 * GET /api/v1/peternakan/susu-kulit
 * Produksi susu & kulit per grup ternak (Sapi/Kerbau, Kambing/Domba) per kecamatan/tahun.
 * Σ data live == 121.087 unit (verif backend: 120 baris).
 * Auth: tidak perlu (public read-only backend MySQL read-only).
 */
const susuKulitTransform = (raw: any): TernakSusuKulit[] => {
  if (!raw || typeof raw !== "object") return [];
  const list = Array.isArray(raw) ? raw : (Array.isArray(raw.value) ? raw.value : raw.data);
  if (!Array.isArray(list)) return [];
  const out: TernakSusuKulit[] = [];
  const satuan = "gabungan (kulit lembar / susu liter)";
  for (const rec of list) {
    const kec = String(rec.kecamatan ?? "");
    const thn = String(rec.tahun ?? "");
    const unit = rec.unit ?? satuan;
    for (const item of rec.items ?? []) {
      out.push({
        kecamatan: kec,
        jenis: item.jenis,
        tahun: thn,
        jumlah: Number(item.jumlah) || 0,
        satuan: unit,
      });
    }
  }
  return out;
};

const fetchTernakSusuKulitCsv = async (): Promise<TernakSusuKulit[]> => {
  // Fallback: snapshot lokal public/data/susu-kulit-fallback.json (dump endpoint
  // /v1/peternakan/susu-kulit, 120 record, Σ 121.087 unit). Bentuk payload sama
  // dengan respons API → cukup lewat susuKulitTransform.
  try {
    const res = await fetch("/data/susu-kulit-fallback.json");
    if (!res.ok) return [];
    return susuKulitTransform(await res.json());
  } catch {
    return [];
  }
};
export const fetchTernakSusuKulit = apiFirst<TernakSusuKulit[]>("/v1/peternakan/susu-kulit", fetchTernakSusuKulitCsv);

export interface SyncLogRow {
  id: number;
  dataset: string;
  sumber: string;
  aksi: string; // "import"
  baris: number;
  status: string; // "ok" | "error" | "skipped"
  pesan: string | null;
  created_at: string;
}

export interface SyncLogResponse {
  total: number;
  limit: number;
  data: SyncLogRow[];
}

/**
 * GET /api/v1/admin/sync-log
 * Riwayat import/sync (audit log). Membutuhkan auth Bearer token (requireAdmin).
 * Jika backend down / token tidak ada → return array kosong (UI kosong).
 * Query: ?limit=N (default 50, range 1-200).
 */
export const fetchSyncLog = async (token: string, limit = 50): Promise<SyncLogResponse | null> => {
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/v1/admin/sync-log?limit=${Math.min(Math.max(limit, 1), 200)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as Partial<SyncLogResponse>;
    if (!Array.isArray(j.data)) return null;
    return {
      total: j.total ?? j.data.length,
      limit: j.limit ?? limit,
      data: j.data,
    };
  } catch {
    return null;
  }
};
export const fetchPerikananTangkap = apiFirst<PerikananTangkap[]>("/v1/perikanan/tangkap", fetchPerikananTangkapCsv);
export const fetchPerikananBenih = apiFirst<PerikananBenih[]>("/v1/perikanan/benih", fetchPerikananBenihCsv);
export const fetchNilaiProduksiBudidaya = apiFirst<NilaiProduksiRow[]>("/v1/perikanan/nilai-budidaya", fetchNilaiProduksiBudidayaCsv);
export const fetchNilaiProduksiTangkap = apiFirst<NilaiProduksiRow[]>("/v1/perikanan/nilai-tangkap", fetchNilaiProduksiTangkapCsv);
export const fetchPlantationArea = apiFirst<PlantationArea[]>("/v1/perkebunan/areal", fetchPlantationAreaCsv);
export const fetchPlantationProduction = apiFirst<PlantationProduction[]>("/v1/perkebunan/produksi", fetchPlantationProductionCsv);
export const fetchKelompokTaniHutanSnapshot = apiFirst<KelompokTaniRow[]>("/v1/kelembagaan/kth", fetchKelompokTaniHutanSnapshotCsv);
export const fetchKelompokTani = apiFirst<KelompokTaniRow[]>("/v1/kelembagaan/kelompok-tani", fetchKelompokTaniCsv);
export const fetchSt2023DesaExtra = apiFirst<St2023DesaExtra[]>("/v1/st2023/desa", fetchSt2023DesaExtraCsv);



// --- Tipe baru: KWT, Komoditas, Nilai Ekonomi, LTT ---
export interface KwtRow {
  id: number;
  nama_kelompok: string;
  kecamatan: string;
  desa: string;
  jenis: "KWT" | "Pokdakan" | "Poklahsar" | "Pokmamas";
  jumlah_anggota?: number;
  produk_andalan?: string;
  tahun_registrasi?: number;
}
export interface KomoditasUnggulanRow {
  bidang: string;
  komoditas: string;
  varietas: string;
  kecamatan?: string;
  luas_lahan?: number;
  produktivitas?: number;
  produksi?: number;
  ketersediaan_benih?: string;
  tahun?: number;
}
export interface NilaiEkonomiRow {
  bidang: string;
  komoditas?: string;
  satuan: string;
  tahun: number;
  triwulan?: number;
  volume?: number;
  nilai_rupiah?: number;
  harga_per_unit?: number;
}
export interface LttKatamRow {
  komoditas: string;
  kecamatan: string;
  jenis: "LTT" | "Katam";
  luas_rencana?: number;
  luas_tanam?: number;
  luas_panen?: number;
  produksi_rencana?: number;
  produksi_aktual?: number;
  bulan_mulai?: number;
  bulan_panen?: number;
  tahun: number;
  source?: string;
}

/**
 * Fetcher placeholder untuk bidang-gap yang belum ada di backend.
 * Jika endpoint belum siap, kirim array kosong -> UI tampil empty state "Coming Soon".
 * Backend route akan tersedia sesuai jadwal (data diberikan 23 Sep 2026).
 */
const createFetcher = <T,>(url: string): (() => Promise<T[]>) =>
  async (): Promise<T[]> => {
    try {
      const res = await fetch(`${API_BASE}${url}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) return [];
      const j = await res.json();
      if (Array.isArray(j)) return j;
      if (Array.isArray(j?.data)) return j.data;
      if (Array.isArray(j?.result)) return j.result;
      return [];
    } catch {
      return [];
    }
  };

export const fetchKwt = createFetcher<KwtRow>("/v1/kewirausahaan/kwt");
export const fetchKomoditasUnggulan = createFetcher<KomoditasUnggulanRow>("/v1/komoditas-unggulan");
export const fetchNilaiEkonomi = createFetcher<NilaiEkonomiRow>("/v1/nilai-ekonomi");
export const fetchLttKatam = createFetcher<LttKatamRow>("/v1/ltt-katam");

// --- Nilai Ekonomi (halaman /nilai-ekonomi): daging ternak & telur per kecamatan ---
// Bentuk TernakFlow (items + unit kg), konsisten dengan fetchDagingUnggas / fetchTernakSusuKulit.
// Data hanya di MySQL (tidak ada CSV publik) -> fallback kosong; UI menampilkan EmptyBlock.
export const fetchTernakDaging = apiFirst<TernakFlow[]>("/v1/peternakan/daging", async () => []);
export const fetchTernakTelur = apiFirst<TernakFlow[]>("/v1/peternakan/telur", async () => []);
