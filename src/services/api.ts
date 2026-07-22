import Papa from "papaparse";

const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 jam limit keras
const CACHE_STALE_AGE = 15 * 60 * 1000; // 15 menit limit stale

const getCachedData = <T>(key: string): { data: T; isStale: boolean } | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    if (age > CACHE_MAX_AGE) {
      localStorage.removeItem(key);
      return null;
    }
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
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn("Gagal menulis cache localStorage:", e);
  }
};

export interface CkanDataset {
  id: string;
  title: string;
  notes: string;
  organization: {
    title: string;
  };
}

export interface CkanResponse {
  success: boolean;
  result: {
    count: number;
    results: CkanDataset[];
  };
}

export const fetchOpenDataPertanian = async (): Promise<CkanResponse> => {
  const cacheKey = "ckan_open_data_pertanian_cache";
  const cached = getCachedData<CkanResponse>(cacheKey);

  const fetchFresh = async (): Promise<CkanResponse> => {
    const response = await fetch("/api/3/action/package_search?q=pertanian");
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
    console.warn("Gagal fetch online open data, menggunakan fallback lokal.");
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
};

export interface LahanDesa {
  desa: string;
  kecamatan: string;
  lahanSawah: number;
  lahanBukanSawah: number;
  jumlah: number;
  tahun: string;
}

export const fetchLahanBanjarnegara = async (): Promise<LahanDesa[]> => {
  const cacheKey = "banjarnegara_lahan_cache";
  const cached = getCachedData<LahanDesa[]>(cacheKey);

  const fetchFreshData = async (): Promise<LahanDesa[]> => {
    try {
      // 1. Cari dataset dengan query luas lahan pertanian, bukan sawah, dan luas wilayah (fallback) untuk semua kecamatan
      const solrQuery = 'title:"Luas Lahan Pertanian Menurut Jenis Tanah dan Desa" OR title:"Luas Lahan Bukan Sawah Menurut Jenis Penggunaan dan Desa" OR title:"Luas Wilayah (Ha) Menurut Desa dan Persentase"';
      
      let searchResponse;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 8000); // 8s timeout
          searchResponse = await fetch(
            `/api/3/action/package_search?q=${encodeURIComponent(solrQuery)}&rows=100`,
            { signal: controller.signal }
          );
          clearTimeout(id);
          if (searchResponse.ok) break;
        } catch (e) {
          if (attempt === 2) throw e;
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (!searchResponse || !searchResponse.ok) throw new Error("Gagal mengambil metadata dataset");
      const searchData: CkanResponse = await searchResponse.json();

      // 2. Ekstrak semua URL resource berformat CSV dari hasil pencarian beserta kecamatan
      const csvUrls: { url: string; kecamatan: string }[] = [];

      searchData.result.results.forEach((dataset) => {
        const resources = (dataset as any).resources || [];
        const csvResource = resources.find(
          (r: any) =>
            r.format?.toUpperCase() === "CSV" && r.url && r.url.endsWith(".csv"),
        );

        if (csvResource) {
          const proxyUrl = csvResource.url.replace(
            "https://opendata.banjarnegarakab.go.id",
            "",
          );
          
          let kecName = dataset.title;
          const matchKec = kecName.match(/(?:di|kecamatan|kec)\s+([a-zA-Z\s]+)$/i);
          if (matchKec) {
            kecName = matchKec[1].trim();
          } else {
            kecName = kecName
              .replace(/Luas Lahan Pertanian Menurut Jenis Tanah dan Desa/gi, "")
              .replace(/Data Luas Lahan Pertanian/gi, "")
              .replace(/Luas Lahan Sawah Menurut Jenis Tanah dan Desa\/Kelurahan/gi, "")
              .replace(/Luas Wilayah \(Ha\) Menurut Desa dan Persentase/gi, "")
              .trim();
          }

          csvUrls.push({ url: proxyUrl, kecamatan: kecName });
        }
      });

      console.log(
        `Ditemukan ${csvUrls.length} file CSV kecamatan untuk diunduh.`,
      );

      // 3. Download dan parse semua CSV dalam chunk terkendali untuk menghindari overloading server
      const allLahanData: LahanDesa[] = [];
      const concurrency = 3;

      const fetchWithRetry = async (url: string, retries = 2, delayMs = 500): Promise<string> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 12000); // 12s timeout
            
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.text();
          } catch (err) {
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
        throw new Error("Failed after retries");
      };

      for (let i = 0; i < csvUrls.length; i += concurrency) {
        const chunk = csvUrls.slice(i, i + concurrency);
        const chunkPromises = chunk.map(async (item) => {
          try {
            const csvText = await fetchWithRetry(item.url);
            return new Promise<LahanDesa[]>((resolve) => {
              Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                  const cleanData: LahanDesa[] = results.data
                    .map((row: any) => {
                      const parseNum = (val: string) => {
                        if (!val) return 0;
                        const cleaned = val
                          .toString()
                          .replace(/ /g, "")
                          .replace(/\./g, "")
                          .replace(/,/g, ".");

                        return parseFloat(cleaned) || 0;
                      };

                      const desaName =
                        row["Desa/Kelurahan"] || row["Desa"] || row["desa"] || "";

                      return {
                        desa: desaName.trim(),
                        kecamatan: item.kecamatan,
                        lahanSawah: parseNum(
                          row["Lahan Sawah"] || row["lahan_sawah"],
                        ),
                        lahanBukanSawah: parseNum(
                          row["Lahan Bukan Sawah"] || row["lahan_bukan_sawah"],
                        ),
                        jumlah: parseNum(row["Jumlah"] || row["jumlah"] || row["Luas (Ha)"] || row["luas"]),
                        tahun: row["Tahun"]?.trim() || "",
                      };
                    })
                    .filter(
                      (item) =>
                        item.desa && item.desa.length > 2 && item.jumlah > 0,
                    );

                  resolve(cleanData);
                },
                error: () => resolve([]),
              });
            });
          } catch (err) {
            console.error(`Gagal fetch CSV setelah percobaan ulang: ${item.url}`, err);
            return [];
          }
        });

        const chunkResults = await Promise.all(chunkPromises);
        chunkResults.forEach((arr) => allLahanData.push(...arr));
      }

      const uniqueLahan = new Map<string, LahanDesa>();

      allLahanData.forEach((item) => {
        const key = `${item.desa.toUpperCase()}_${item.kecamatan.toUpperCase()}`;

        if (!uniqueLahan.has(key)) {
          uniqueLahan.set(key, item);
        } else {
          const existing = uniqueLahan.get(key)!;
          // Prioritaskan tahun yang lebih baru, atau jika tahun sama, pilih data yang lengkap sawahnya
          if (item.tahun > existing.tahun) {
            uniqueLahan.set(key, item);
          } else if (item.tahun === existing.tahun && item.lahanSawah > 0 && existing.lahanSawah === 0) {
            uniqueLahan.set(key, item);
          }
        }
      });

      const result = Array.from(uniqueLahan.values());
      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Gagal melakukan agregasi lahan:", error);
      return [];
    }
  };

  if (cached) {
    if (cached.isStale) {
      console.log("Data lahan Banjarnegara sudah stale. Memicu silent update di background...");
      fetchFreshData().catch((err) => console.warn("Background update lahan failed:", err));
    }
    return cached.data;
  }

  console.log("Tidak ada cache data lahan. Memuat dari local fallback...");
  try {
    const res = await fetch("/data/lahan-fallback.json");
    if (res.ok) {
      const fallbackData = await res.json();
      setCachedData(cacheKey, fallbackData);
      console.log("Memicu silent update online di background setelah load fallback...");
      fetchFreshData().catch((err) => console.warn("Background update lahan failed:", err));
      return fallbackData;
    }
  } catch (err) {
    console.warn("Gagal memuat local fallback lahan:", err);
  }

  return fetchFreshData();
};

export interface PadiProduction {
  kecamatan: string;
  luasPanen: number;
  produksi: number;
  rataRata: number;
}

export const fetchPadiProduction = async (): Promise<PadiProduction[]> => {
  try {
    let response;
    let isLocal = false;
    try {
      response = await fetch(
        "/dataset/9238267d-6b2e-4c44-a3f6-6d70351c75a0/resource/8180ee00-dedd-4b08-b165-ef3bd6bb7075/download/total-luas-panen-produksi-dan-rata-rata-produksi-tanaman-pangan-padi-2025.csv",
      );
      if (!response.ok) throw new Error("Gagal online");
    } catch (e) {
      console.warn("Menggunakan data padi offline lokal.");
      response = await fetch(
        "/14. Distankan KP/Luas  Panen,  Produksi dan Rata-rata Produksi/Luas Panen, Produksi dan Rata-rata Produksi Padi Sawah Dan Padi Ladang CSV.csv",
      );
      isLocal = true;
    }

    if (!response.ok) throw new Error("Gagal mengambil data produksi padi");
    const csvText = await response.text();

    return new Promise<PadiProduction[]>((resolve) => {
      Papa.parse(csvText, {
        header: isLocal, // Lokal menggunakan header, online tidak
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData: PadiProduction[] = [];

          if (isLocal) {
            const rows = results.data as any[];
            // Kelompokkan berdasarkan kecamatan dan ambil data tahun terbaru (misal 2024 atau 2023)
            const mapData = new Map<string, PadiProduction>();

            rows.forEach((row) => {
              const parseNum = (val: string) => {
                if (!val) return 0;
                const cleaned = val.toString().replace(/ /g, "").replace(/\./g, "").replace(/,/g, ".");
                return parseFloat(cleaned) || 0;
              };

              const rawKec = row["Kecamatan"] || "";
              const kecName = rawKec.replace(/\s+/g, "").trim();
              if (!kecName || kecName.toLowerCase().includes("jumlah") || kecName.toLowerCase().includes("total")) return;

              const luasSawah = parseNum(row["Padi Sawah (Ha)"]);
              const luasLadang = parseNum(row["Padi Ladang (Ha)"]);
              const prodSawah = parseNum(row["Produksi Padi Sawah (Ton)"]);
              const prodLadang = parseNum(row["Produksi Padi Ladang(Ton)"]);
              const rataSawah = parseNum(row["Rata-rata Produksi Padi Sawah(Kw/Ha)"]);

              const entry = {
                kecamatan: kecName,
                luasPanen: luasSawah + luasLadang,
                produksi: prodSawah + prodLadang,
                rataRata: rataSawah,
              };

              const key = kecName.toUpperCase();
              if (!mapData.has(key)) {
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

              const nameClean = row[0].replace(/\s+/g, "").trim();

              parsedData.push({
                kecamatan: nameClean,
                luasPanen: cleanNum(row[1]),
                produksi: cleanNum(row[2]),
                rataRata: cleanNum(row[3]),
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
};

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

export const fetchVegetableProduction = async (): Promise<
  VegetableProduction[]
> => {
  try {
    let response;
    try {
      response = await fetch(
        "/dataset/226f7b4c-a07c-4248-a837-ea4dba4ec05e/resource/e6481f04-0ffd-40df-871f-7005a8d266cb/download/produksi-tanaman-sayuran-menurut-kecamatan-dan-jenis-tanaman-2018-2024.csv",
      );
      if (!response.ok) throw new Error("Gagal online");
    } catch (e) {
      console.warn("Menggunakan data sayuran offline lokal.");
      response = await fetch(
        "/14. Distankan KP/Produksi Tanaman Sayuran Menurut Kecamatan dan Jenis Tanaman (ton)/Produksi Tanaman Sayuran Menurut Kecamatan dan Jenis Tanaman CSV.csv",
      );
    }

    if (!response.ok) throw new Error("Gagal mengambil data produksi sayuran");
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

              const kecClean = (row["Kecamatan"] || row["kecamatan"] || "")
                .replace(/\s+/g, "")
                .trim();

              const tahunKey = Object.keys(row).find(k => k.trim().toLowerCase() === "tahun") || "Tahun";

              return {
                kecamatan: kecClean,
                bawangMerah: cleanNum(
                  row["Bawang Merah"] || row["bawang_merah"],
                ),
                cabaiBesar: cleanNum(row["Cabai Besar"] || row["cabai_besar"]),
                kentang: cleanNum(row["Kentang"] || row["kentang"]),
                kubis: cleanNum(row["Kubis"] || row["kubis"]),
                petsai: cleanNum(row["Petsai"] || row["petsai"]),
                tomat: cleanNum(row["Tomat"] || row["tomat"]),
                bawangPutih: cleanNum(
                  row["Bawang Putih"] || row["bawang_putih"],
                ),
                cabaiRawit: cleanNum(row["Cabai Rawit"] || row["cabai_rawit"]),
                tahun: (row[tahunKey] || "").toString().trim(),
              };
            })
            .filter(
              (item) =>
                item.kecamatan &&
                !item.kecamatan.toLowerCase().includes("jumlah") &&
                !item.kecamatan.toLowerCase().includes("total"),
            );

          resolve(cleanData);
        },
        error: () => resolve([]),
      });
    });
  } catch (error) {
    console.error("Error fetchVegetableProduction:", error);

    return [];
  }
};

export interface InflationData {
  pembanding: string;
  inflasi: number;
  tahun: string;
}

export const fetchInflationData = async (): Promise<InflationData[]> => {
  try {
    let response;
    try {
      response = await fetch(
        "/dataset/5b935f47-a0df-4185-9328-2e13131dcd15/resource/bf424522-8fe9-46a1-99d3-3b102cf890b2/download/perbandingan_laju_inflasi_2018-2024.csv",
      );
      if (!response.ok) throw new Error("Gagal online");
    } catch (e) {
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
};

export interface LumbungPangan {
  kecamatan: string;
  lumbungUnit: number;
  lumbungKapasitas: number;
  gudangLuas: number;
  gudangKapasitas: number;
}

export const fetchLumbungPangan = async (): Promise<LumbungPangan[]> => {
  try {
    let response;
    let isLocal = false;
    try {
      response = await fetch(
        "/dataset/bd6ca920-4cd8-49a2-8e5d-291f01e1a11e/resource/1e578131-0fc4-4db4-95a4-a3af66aa7bec/download/banyaknya-lumbung-dan-gudang-pangan-kab-banjarnegara-menurut-kecamatan-2025.csv",
      );
      if (!response.ok) throw new Error("Gagal online");
    } catch (e) {
      console.warn("Menggunakan data lumbung offline lokal.");
      response = await fetch(
        "/14. Distankan KP/Banyaknya Lumbung dan Gudang Pangan/Banyaknya Lumbung dan Gudang Pangan CSV.csv",
      );
      isLocal = true;
    }

    if (!response.ok) throw new Error("Gagal mengambil data lumbung pangan");
    const csvText = await response.text();

    return new Promise<LumbungPangan[]>((resolve) => {
      Papa.parse(csvText, {
        header: isLocal,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData: LumbungPangan[] = [];

          if (isLocal) {
            const list = results.data as any[];
            const mapData = new Map<string, LumbungPangan>();

            list.forEach((row: any) => {
              const parseNum = (val: string) => {
                if (!val) return 0;
                const cleaned = val.toString().replace(/ /g, "").replace(/\./g, "").replace(/,/g, ".");
                return parseFloat(cleaned) || 0;
              };

              const rawKec = row["Kecamatan"] || "";
              const kecName = rawKec.replace(/\s+/g, "").trim();
              if (!kecName || kecName.toLowerCase().includes("jumlah") || kecName.toLowerCase().includes("total")) return;

              const unit = parseNum(row["Jumlah (Unit)"] || row["jumlah_unit"]);
              const kapasitas = parseNum(row["Kapasitas"] || row["kapasitas"]);

              const entry = {
                kecamatan: kecName,
                lumbungUnit: unit,
                lumbungKapasitas: kapasitas,
                gudangLuas: 0,
                gudangKapasitas: 0,
              };

              const key = kecName.toUpperCase();
              if (!mapData.has(key) || (row["Tahun"] && mapData.get(key)!.lumbungUnit === 0)) {
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

              parsedData.push({
                kecamatan: row[0].replace(/\s+/g, "").trim(),
                lumbungUnit: cleanNum(row[1]),
                lumbungKapasitas: cleanNum(row[2]),
                gudangLuas: cleanNum(row[3]),
                gudangKapasitas: cleanNum(row[4]),
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
};

export interface MarketData {
  jenis: string;
  jumlah: number;
  tahun: string;
}

export const fetchMarketData = async (): Promise<MarketData[]> => {
  try {
    let response;
    try {
      response = await fetch(
        "/dataset/d6f86fd9-32b1-40c1-b7c3-ccf311271bff/resource/aa29ce02-f750-46df-b1fd-9ba681bb500c/download/banyaknya-pasar-dirinci-menurut-jenisnya-2016-2025.csv",
      );
      if (!response.ok) throw new Error("Gagal online");
    } catch (e) {
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
};

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

export const fetchTernakKecil = async (): Promise<TernakKecil[]> => {
  try {
    const response = await fetch("/14. Distankan KP/Jumlah  Ternak Kecil Menurut Kecamatan dan Jenis Ternak/Jumlah Ternak Kecil Menurut Kecamatan dan Jenis Ternak CSV.csv");
    if (!response.ok) throw new Error("Gagal mengambil data");
    const text = await response.text();
    return new Promise((resolve) => {
      Papa.parse(text, {
        header: true, skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          const rows = results.data as any[];
          resolve(rows.filter(r => r.Kecamatan && !r.Kecamatan.toLowerCase().includes("jumlah")).map(r => ({
            kecamatan: r.Kecamatan?.trim() || "Unknown",
            kambing: parseInt(r.Kambing?.toString().replace(/[^\d]/g, "") || "0"),
            domba: parseInt(r.Domba?.toString().replace(/[^\d]/g, "") || "0"),
            babi: parseInt(r.Babi?.toString().replace(/[^\d]/g, "") || "0"),
            kelinci: parseInt(r.Kelinci?.toString().replace(/[^\d]/g, "") || "0"),
            tahun: r.Tahun?.trim() || "2024"
          })));
        }
      });
    });
  } catch (e) { return []; }
};

export const fetchTernakBesar = async (): Promise<TernakBesar[]> => {
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
          resolve(rows.filter(r => r.Kecamatan && !r.Kecamatan.toLowerCase().includes("jumlah")).map(r => ({
            kecamatan: r.Kecamatan?.trim() || "Unknown",
            sapi: parseInt(r.Sapi?.toString().replace(/[^\d]/g, "") || "0"),
            sapiPerah: parseInt(r["Sapi Perah"]?.toString().replace(/[^\d]/g, "") || "0"),
            kerbau: parseInt(r.Kerbau?.toString().replace(/[^\d]/g, "") || "0"),
            kuda: parseInt(r.Kuda?.toString().replace(/[^\d]/g, "") || "0"),
            tahun: r.Tahun?.trim() || "2024"
          })));
        }
      });
    });
  } catch (e) { return []; }
};

export const fetchUnggas = async (): Promise<Unggas[]> => {
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
          resolve(rows.filter(r => r.Kecamatan && !r.Kecamatan.toLowerCase().includes("jumlah")).map(r => ({
            kecamatan: r.Kecamatan?.trim() || "Unknown",
            ayamKampung: parseInt(r["Ayam Kampung"]?.toString().replace(/[^\d]/g, "") || "0"),
            ayamRasLayer: parseInt(r["Ayam Ras Layer"]?.toString().replace(/[^\d]/g, "") || "0"),
            ayamBroiler: parseInt(r["Ayam Broiler"]?.toString().replace(/[^\d]/g, "") || "0"),
            itikBiasa: parseInt(r["Itik Biasa"]?.toString().replace(/[^\d]/g, "") || "0"),
            itikManila: parseInt(r["Itik Manila"]?.toString().replace(/[^\d]/g, "") || "0"),
            tahun: r.Tahun?.trim() || "2024"
          })));
        }
      });
    });
  } catch (e) { return []; }
};

// ---- Perikanan ----

const cleanInt = (val: any) => parseInt(val?.toString().replace(/[^\d]/g, "") || "0");

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

export const fetchPerikananBudidaya = async (): Promise<PerikananBudidaya[]> => {
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
                kecamatan: r.Kecamatan?.trim() || "Unknown",
                kolamPembesaran: cleanInt(r["Kolam Pembesaran Ikan Produksi (Kg)"]),
                karambaApung: cleanInt(r["Jaring Karamba Apung Produksi (Kg)"]),
                minaPenyelang: cleanInt(r["Mina Padi Penyelang Produksi (Kg)"]),
                minaTumpangsari: cleanInt(r["Mina Padi Tumpang sari Produksi (Kg)"]),
                tahun: r.Tahun?.trim() || "2024",
              })),
          );
        },
      });
    });
  } catch (e) {
    return [];
  }
};

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
    label: "Pembesaran",
    prod: "Produksi (Kg) Pembesaran",
    val: "Nilai Produksi (ribu rupiah) Pembesaran",
  },
  {
    label: "Karamba Jaring Apung",
    prod: "Produksi (Kg) Karamba Jaring Apung",
    val: "Nilai Produksi (ribu rupiah) Karamba Jaring Apung",
  },
  {
    label: "Minapadi Tumpang Sari",
    prod: "Produksi (Kg) Minapadi Tumpang Sari",
    val: "Nilai Produksi (ribu rupiah) Minapadi Tumpang Sari",
  },
];

const NILAI_TANGKAP_PAIRS: { label: string; prod: string; val: string }[] = [
  { label: "Jala Tebar", prod: "Produksi Jala Tebar", val: "Nilai Produksi Jala Tebar" },
  { label: "Pancing", prod: "Produksi Pancing", val: "Nilai Produksi Pancing" },
  {
    label: "Jaring Ingsang",
    prod: "Produksi Jaring Ingsang",
    val: "Nilai Produksi Jaring Ingsang",
  },
  { label: "Lainnya", prod: "Produksi Lainnya", val: "Nilai Produksi Lainnya" },
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
                    kecamatan: r.Kecamatan?.trim() || "Unknown",
                    tahun: r.Tahun?.trim() || "2024",
                    subSektor,
                    jenis: pairs.map((p) => ({
                      label: p.label,
                      produksi: cleanInt(r[p.prod]),
                      nilai: cleanInt(r[p.val]),
                    })),
                  })),
              );
            },
          });
        }),
    )
    .catch(() => []);

export const fetchNilaiProduksiBudidaya = (): Promise<NilaiProduksiRow[]> =>
  fetchNilaiProduksi(
    "/14. Distankan KP/Produksi dan Nilai Produksi Perikanan Budidaya Menurut Kecamatan dan Jenis Budidaya/Produksi dan Nilai Produksi Perikanan Budidaya Menurut Kecamatan dan Jenis Budidaya CSV.csv",
    "Budidaya",
    NILAI_BUDIDAYA_PAIRS,
  );

export const fetchNilaiProduksiTangkap = (): Promise<NilaiProduksiRow[]> =>
  fetchNilaiProduksi(
    "/14. Distankan KP/Produksi dan Nilai Produksi Perikanan Tangkap Menurut Kecamatan dan Jenis Penangkapan/Produksi dan Nilai Produksi Perikanan Tangkap Menurut Kecamatan dan Jenis Penangkapan CSV.csv",
    "Tangkap",
    NILAI_TANGKAP_PAIRS,
  );

export const fetchPerikananTangkap = async (): Promise<PerikananTangkap[]> => {
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
                kecamatan: r.Kecamatan?.trim() || "Unknown",
                jalaTebar: cleanInt(r["Produksi Jala Tebar"]),
                pancing: cleanInt(r["Produksi Pancing"]),
                jaringIngsang: cleanInt(r["Produksi Jaring Ingsang"]),
                lainnya: cleanInt(r["Produksi Lainnya"]),
                tahun: r.Tahun?.trim() || "2024",
              })),
          );
        },
      });
    });
  } catch (e) {
    return [];
  }
};

export const fetchPerikananBenih = async (): Promise<PerikananBenih[]> => {
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
                kecamatan: r.Kecamatan?.trim() || "Unknown",
                dipeliharaSendiri: cleanInt(
                  r["Hasil Obyek Pembenihan Ikan Dipelihara Sendiri (Ekor)"],
                ),
                dijualLuar: cleanInt(r["Dijual ke Lain Daerah (Ekor)"]),
                tahun: r.Tahun?.trim() || "2024",
              })),
          );
        },
      });
    });
  } catch (e) {
    return [];
  }
};

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

export const fetchPlantationArea = async (): Promise<PlantationArea[]> => {
  try {
    const response = await fetch(
      "/14. Distankan KP/Luas Areal Tanaman Perkebunan Menurut Kecamatan dan Jenis Tanaman (ha)/Luas Areal Tanaman Perkebunan Menurut Kecamatan dan Jenis Tanaman CSV.csv"
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
                kecamatan: r.Kecamatan?.trim() || "Unknown",
                kelapaSawit: cleanInt(r["Kelapa Sawit"]),
                kelapaDalam: cleanInt(r["Kelapa Dalam"]),
                karet: cleanInt(r["Karet"]),
                kopiRobusta: cleanInt(r["Kopi Robusta"]),
                kakao: cleanInt(r["Kakao"]),
                tebu: cleanInt(r["Tebu"]),
                teh: cleanInt(r["Teh"]),
                tembakau: cleanInt(r["Tembakau"]),
                kopiArabica: cleanInt(r["Kopi Arabica"]),
                tahun: r.Tahun?.trim() || "2024",
              }))
          );
        },
      });
    });
  } catch (e) {
    return [];
  }
};

export const fetchPlantationProduction = async (): Promise<PlantationProduction[]> => {
  try {
    const response = await fetch(
      "/14. Distankan KP/Produksi Perkebunan Menurut Kecamatan dan Jenis Tanaman (ton)/Produksi Tanaman Perkebunan Menurut Kecamatan dan Jenis Tanaman CSV.csv"
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
                kecamatan: r.Kecamatan?.trim() || "Unknown",
                kelapaSawit: cleanInt(r["Kelapa Sawit"]),
                kelapaDalam: cleanInt(r["Kelapa Dalam"]),
                karet: cleanInt(r["Karet"]),
                kopiRobusta: cleanInt(r["Kopi Robusta"]),
                kakao: cleanInt(r["Kakao"]),
                tebu: cleanInt(r["Tebu"]),
                teh: cleanInt(r["Teh"]),
                tembakau: cleanInt(r["Tembakau"]),
                tahun: r.Tahun?.trim() || "2024",
              }))
          );
        },
      });
    });
  } catch (e) {
    return [];
  }
};

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

export const fetchVegetableArea = async (): Promise<VegetableArea[]> => {
  try {
    const response = await fetch(
      "/14. Distankan KP/Luas Panen Tanaman Sayuran Menurut Kecamatan dan Jenis Tanaman (ha)/Luas Panen Tanaman Sayuran Menurut Kecamatan dan Jenis Tanaman CSV.csv"
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
                kecamatan: r.Kecamatan?.toString().replace(/^\d+\.\s*/, "").trim() || "Unknown",
                bawangMerah: cleanInt(r["Bawang Merah"]),
                cabaiBesar: cleanInt(r["Cabai Besar"]),
                kentang: cleanInt(r["Kentang"]),
                kubis: cleanInt(r["Kubis"]),
                petsai: cleanInt(r["Petsai"]),
                tomat: cleanInt(r["Tomat"]),
                bawangPutih: cleanInt(r["Bawang Putih"]),
                cabaiRawit: cleanInt(r["Cabai Rawit"]),
                tahun: r.Tahun?.trim() || "2024",
              }))
          );
        },
      });
    });
  } catch (e) {
    return [];
  }
};

export const fetchFruitProduction = async (): Promise<FruitProduction[]> => {
  try {
    const response = await fetch(
      "/14. Distankan KP/Produksi Buah-buahan Menurut Kecamatan dan Jenis Tanaman (ton)/Produksi Buah-buahan Menurut Kecamatan dan Jenis Tanaman CSV.csv"
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
                kecamatan: r.Kecamatan?.toString().replace(/^\d+\.\s*/, "").trim() || "Unknown",
                mangga: cleanInt(r["Mangga"]),
                durian: cleanInt(r["Durian"]),
                jerukBesar: cleanInt(r["Jeruk Besar"]),
                pisang: cleanInt(r["Pisang"]),
                pepaya: cleanInt(r["Pepaya"]),
                salak: cleanInt(r["Salak"]),
                jerukSiam: cleanInt(r["Jeruk Siam"]),
                tahun: r.Tahun?.trim() || "2024",
              }))
          );
        },
      });
    });
  } catch (e) {
    return [];
  }
};

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

export const fetchKelompokTani = async (): Promise<KelompokTaniRow[]> => {
  const cacheKey = "banjarnegara_kelompok_tani_cache";
  const cached = getCachedData<KelompokTaniRow[]>(cacheKey);

  const fetchFreshData = async (): Promise<KelompokTaniRow[]> => {
    try {
      // 1. Cari dataset Kelompok Tani di CKAN
      const searchResponse = await fetch(
        `/api/3/action/package_search?q=title:"Banyaknya kelompok tani" OR title:"Kelompok Tani"&rows=50`
      );

      if (!searchResponse.ok) throw new Error("Gagal mengambil metadata Kelompok Tani");
      const searchData: CkanResponse = await searchResponse.json();

      // 2. Ekstrak URL resource CSV
      const csvUrls: { url: string; kecamatan: string }[] = [];

      searchData.result.results.forEach((dataset) => {
        const resources = (dataset as any).resources || [];
        const csvResource = resources.find(
          (r: any) =>
            r.format?.toUpperCase() === "CSV" && r.url && r.url.endsWith(".csv"),
        );

        if (csvResource) {
          const proxyUrl = csvResource.url.replace(
            "https://opendata.banjarnegarakab.go.id",
            "",
          );
          
          const cleanKec = normalizeKecamatan(dataset.title);
          csvUrls.push({ url: proxyUrl, kecamatan: cleanKec });
        }
      });

      console.log(`Ditemukan ${csvUrls.length} file CSV Kelompok Tani untuk diunduh.`);

      const allData: KelompokTaniRow[] = [];
      const concurrency = 3;

      const fetchWithRetry = async (url: string, retries = 2, delayMs = 500): Promise<string> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 12000); // 12s timeout
            
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.text();
          } catch (err) {
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
        throw new Error("Failed after retries");
      };

      for (let i = 0; i < csvUrls.length; i += concurrency) {
        const chunk = csvUrls.slice(i, i + concurrency);
        const chunkPromises = chunk.map(async (item) => {
          try {
            const csvText = await fetchWithRetry(item.url);
            return new Promise<KelompokTaniRow[]>((resolve) => {
              // Deteksi pembatas (koma atau titik koma)
              const delimiter = csvText.includes(";") ? ";" : ",";
              Papa.parse(csvText, {
                header: true,
                delimiter: delimiter,
                skipEmptyLines: true,
                transformHeader: (h) => h.trim().replace(/\s+/g, " "),
                complete: (results) => {
                  const cleanData: KelompokTaniRow[] = results.data
                    .map((row: any) => {
                      const parseNum = (val: any) => {
                        if (val === undefined || val === null || val === "" || val === "-") return 0;
                        const cleaned = val
                          .toString()
                          .replace(/ /g, "")
                          .replace(/\./g, "")
                          .replace(/,/g, ".");
                        return parseInt(cleaned) || 0;
                      };

                      const desaKey = Object.keys(row).find(
                        k => k.toLowerCase().includes("desa") || k.toLowerCase().includes("kelurahan")
                      ) || "Desa/Kelurahan";
                      const desaName = row[desaKey] || "";

                      const taniKey = Object.keys(row).find(k => k.includes("Banyaknya Kelompok Tani") || k.includes("Kelompok Tani")) || "Banyaknya Kelompok Tani";
                      const anggotaTaniKey = Object.keys(row).find(k => k.includes("Jumlah Anggota Kelompok Tani") || k.includes("Anggota Kelompok Tani")) || "Jumlah Anggota Kelompok Tani";
                      
                      const perikananKey = Object.keys(row).find(k => k.includes("Banyaknya Kelompok Perikanan") || k.includes("Kelompok Perikanan")) || "Banyaknya Kelompok Perikanan";
                      const anggotaPerikananKey = Object.keys(row).find(k => k.includes("Jumlah Anggota Kelompok Perikanan") || k.includes("Anggota Kelompok Perikanan")) || "Jumlah Anggota Kelompok Perikanan";

                      const gapoktanKey = Object.keys(row).find(k => k.includes("Banyaknya Gapoktan") || k.includes("Gapoktan")) || "Banyaknya Gapoktan";
                      const anggotaGapoktanKey = Object.keys(row).find(k => k.includes("Jumlah Anggota Gapoktan") || k.includes("Anggota Gapoktan")) || "Jumlah Anggota Gapoktan";

                      const tahunKey = Object.keys(row).find(k => k.toLowerCase().includes("tahun")) || "Tahun";

                      return {
                        desa: desaName.trim(),
                        kecamatan: item.kecamatan,
                        kelompokTani: parseNum(row[taniKey]),
                        anggotaTani: parseNum(row[anggotaTaniKey]),
                        kelompokPerikanan: parseNum(row[perikananKey]),
                        anggotaPerikanan: parseNum(row[anggotaPerikananKey]),
                        gapoktan: parseNum(row[gapoktanKey]),
                        anggotaGapoktan: parseNum(row[anggotaGapoktanKey]),
                        tahun: (row[tahunKey] || "").toString().trim(),
                      };
                    })
                    .filter((rowItem) => rowItem.desa && rowItem.desa.length > 2 && !rowItem.desa.toLowerCase().includes("jumlah"));

                  resolve(cleanData);
                },
                error: () => resolve([]),
              });
            });
          } catch (err) {
            console.error(`Gagal fetch CSV Kelompok Tani: ${item.url}`, err);
            return [];
          }
        });

        const chunkResults = await Promise.all(chunkPromises);
        chunkResults.forEach((arr) => allData.push(...arr));
      }

      setCachedData(cacheKey, allData);
      return allData;
    } catch (error) {
      console.error("Gagal agregasi Kelompok Tani:", error);
      return [];
    }
  };

  if (cached) {
    if (cached.isStale) {
      console.log("Data kelompok tani Banjarnegara sudah stale. Memicu silent update di background...");
      fetchFreshData().catch((err) => console.warn("Background update kelompok tani failed:", err));
    }
    return cached.data;
  }

  console.log("Tidak ada cache data kelompok tani. Memuat dari local fallback...");
  try {
    const res = await fetch("/data/kelompok-tani-fallback.json");
    if (res.ok) {
      const fallbackData = await res.json();
      setCachedData(cacheKey, fallbackData);
      console.log("Memicu silent update online di background setelah load fallback...");
      fetchFreshData().catch((err) => console.warn("Background update kelompok tani failed:", err));
      return fallbackData;
    }
  } catch (err) {
    console.warn("Gagal memuat local fallback kelompok tani:", err);
  }

  return fetchFreshData();
};


