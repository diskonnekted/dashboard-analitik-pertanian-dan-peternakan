import Papa from "papaparse";

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
  try {
    const response = await fetch("/api/3/action/package_search?q=pertanian");

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data: CkanResponse = await response.json();

    return data;
  } catch (error) {
    console.error("Failed to fetch open data:", error);
    throw error;
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
  try {
    // 1. Cari dataset dengan query luas lahan pertanian, bukan sawah, dan luas wilayah (fallback) untuk semua kecamatan (termasuk Karangkobar, Madukara, dll.)
    const solrQuery = 'title:"Luas Lahan Pertanian Menurut Jenis Tanah dan Desa" OR title:"Luas Lahan Bukan Sawah Menurut Jenis Penggunaan dan Desa" OR title:"Luas Wilayah (Ha) Menurut Desa dan Persentase"';
    const searchResponse = await fetch(
      `/api/3/action/package_search?q=${encodeURIComponent(solrQuery)}&rows=100`,
    );

    if (!searchResponse.ok) throw new Error("Gagal mengambil metadata dataset");
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

    // 3. Download dan parse semua CSV secara paralel
    const allLahanData: LahanDesa[] = [];

    const fetchPromises = csvUrls.map(async (item) => {
      try {
        const response = await fetch(item.url);

        if (!response.ok) return [];
        const csvText = await response.text();

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
        console.error(`Gagal fetch CSV: ${item.url}`, err);

        return [];
      }
    });

    const resultsArray = await Promise.all(fetchPromises);

    resultsArray.forEach((arr) => allLahanData.push(...arr));

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

    return Array.from(uniqueLahan.values());
  } catch (error) {
    console.error("Gagal melakukan agregasi lahan:", error);

    return [];
  }
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

              const currentYear = row["Tahun"] || "";

              const entry = {
                kecamatan: kecName,
                luasPanen: luasSawah + luasLadang,
                produksi: prodSawah + prodLadang,
                rataRata: rataSawah,
              };

              const key = kecName.toUpperCase();
              if (!mapData.has(key)) {
                mapData.set(key, entry);
              } else {
                // Simpan yang tahunnya lebih baru jika ada
                const existing = mapData.get(key)!;
                // Di sini kita tidak punya field tahun di type PadiProduction tapi kita bisa pakai variabel temporary
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
    const response = await fetch(
      "/dataset/5b935f47-a0df-4185-9328-2e13131dcd15/resource/bf424522-8fe9-46a1-99d3-3b102cf890b2/download/perbandingan_laju_inflasi_2018-2024.csv",
    );

    if (!response.ok) throw new Error("Gagal mengambil data inflasi");
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
    const response = await fetch(
      "/dataset/d6f86fd9-32b1-40c1-b7c3-ccf311271bff/resource/aa29ce02-f750-46df-b1fd-9ba681bb500c/download/banyaknya-pasar-dirinci-menurut-jenisnya-2016-2025.csv",
    );

    if (!response.ok) throw new Error("Gagal mengambil data pasar");
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
