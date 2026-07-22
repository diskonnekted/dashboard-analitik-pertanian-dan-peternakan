import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchVegetableArea, fetchVegetableProduction, fetchFruitProduction, VegetableArea, VegetableProduction, FruitProduction } from "@/services/api";
import { Sprout, Calendar, MapPin, TrendingUp, Filter, AlertTriangle, ShieldCheck, FileSpreadsheet, Pizza } from "lucide-react";

type Category = "sayuran" | "buah";
type Metric = "luas" | "produksi" | "produktivitas";

export default function HorticulturePage() {
  const [vegAreaData, setVegAreaData] = useState<VegetableArea[]>([]);
  const [vegProdData, setVegProdData] = useState<VegetableProduction[]>([]);
  const [fruitProdData, setFruitProdData] = useState<FruitProduction[]>([]);
  
  const [category, setCategory] = useState<Category>("sayuran");
  const [metric, setMetric] = useState<Metric>("luas");
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vegArea, vegProd, fruitProd] = await Promise.all([
          fetchVegetableArea(),
          fetchVegetableProduction(),
          fetchFruitProduction(),
        ]);
        setVegAreaData(vegArea);
        setVegProdData(vegProd);
        setFruitProdData(fruitProd);
      } catch (err) {
        console.error("Gagal memuat data hortikultura:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const vegCrops = useMemo(() => [
    { key: "bawangMerah", label: "Bawang Merah" },
    { key: "cabaiBesar", label: "Cabai Besar" },
    { key: "kentang", label: "Kentang" },
    { key: "kubis", label: "Kubis" },
    { key: "petsai", label: "Petsai" },
    { key: "tomat", label: "Tomat" },
    { key: "bawangPutih", label: "Bawang Putih" },
    { key: "cabaiRawit", label: "Cabai Rawit" }
  ], []);

  const fruitCrops = useMemo(() => [
    { key: "mangga", label: "Mangga" },
    { key: "durian", label: "Durian" },
    { key: "jerukBesar", label: "Jeruk Besar" },
    { key: "pisang", label: "Pisang" },
    { key: "pepaya", label: "Pepaya" },
    { key: "salak", label: "Salak" },
    { key: "jerukSiam", label: "Jeruk Siam" }
  ], []);

  const cropKeys = useMemo(() => {
    return category === "sayuran" ? vegCrops : fruitCrops;
  }, [category, vegCrops, fruitCrops]);

  // Helper untuk membersihkan & menormalkan nama kecamatan agar seragam lintas data
  const normalizeKecName = (name: string) => {
    if (!name) return "UNKNOWN";
    return name
      .toString()
      .replace(/^\d+\.\s*/, "") // buang "1. "
      .replace(/\s+/g, "")      // buang spasi internal/eksternal
      .toUpperCase();
  };

  // Nama Tampilan Kecamatan (Proper Case)
  const displayKecName = (name: string) => {
    if (!name) return "Unknown";
    const cleaned = name.toString().replace(/^\d+\.\s*/, "").trim();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  };

  // Ambil daftar tahun unik dari data sayuran
  const yearsList = useMemo(() => {
    const activeData = category === "sayuran" ? vegAreaData : fruitProdData;
    return Array.from(new Set(activeData.map((d) => d.tahun).filter(Boolean)))
      .sort((a, b) => b.localeCompare(a));
  }, [category, vegAreaData, fruitProdData]);

  useEffect(() => {
    if (yearsList.length > 0 && !yearsList.includes(selectedYear)) {
      setSelectedYear(yearsList[0]);
    }
  }, [yearsList, selectedYear]);

  // Gabungkan data sayuran luas & produksi berdasarkan kecamatan + tahun
  const mergedVegData = useMemo(() => {
    const dataMap = new Map<string, any>();

    vegAreaData.forEach((area) => {
      const normKec = normalizeKecName(area.kecamatan);
      const key = `${normKec}_${area.tahun}`;
      dataMap.set(key, {
        kecNameRaw: area.kecamatan,
        kecamatan: normKec,
        tahun: area.tahun,
        luas: {
          bawangMerah: area.bawangMerah,
          cabaiBesar: area.cabaiBesar,
          kentang: area.kentang,
          kubis: area.kubis,
          petsai: area.petsai,
          tomat: area.tomat,
          bawangPutih: area.bawangPutih,
          cabaiRawit: area.cabaiRawit,
        },
        produksi: {
          bawangMerah: 0,
          cabaiBesar: 0,
          kentang: 0,
          kubis: 0,
          petsai: 0,
          tomat: 0,
          bawangPutih: 0,
          cabaiRawit: 0,
        },
      });
    });

    vegProdData.forEach((prod) => {
      const normKec = normalizeKecName(prod.kecamatan);
      const key = `${normKec}_${prod.tahun}`;
      if (dataMap.has(key)) {
        const entry = dataMap.get(key);
        vegCrops.forEach((c) => {
          entry.produksi[c.key] = (prod as any)[c.key] || 0;
        });
      }
    });

    return Array.from(dataMap.values());
  }, [vegAreaData, vegProdData, vegCrops]);

  // Gabungkan data buah (hanya produksi)
  const mergedFruitData = useMemo(() => {
    return fruitProdData.map((d) => {
      const normKec = normalizeKecName(d.kecamatan);
      const productionObj: any = {};
      fruitCrops.forEach((c) => {
        productionObj[c.key] = (d as any)[c.key] || 0;
      });
      return {
        kecNameRaw: d.kecamatan,
        kecamatan: normKec,
        tahun: d.tahun,
        luas: {},
        produksi: productionObj,
      };
    });
  }, [fruitProdData, fruitCrops]);

  const activeCategoryData = useMemo(() => {
    return category === "sayuran" ? mergedVegData : mergedFruitData;
  }, [category, mergedVegData, mergedFruitData]);

  // Filter berdasarkan tahun terpilih
  const currentYearData = useMemo(() => {
    return activeCategoryData.filter((d) => d.tahun === selectedYear);
  }, [activeCategoryData, selectedYear]);

  // Daftar kecamatan unik untuk dropdown filter
  const uniqueKecamatan = useMemo(() => {
    return ["Semua", ...Array.from(new Set(activeCategoryData.map((d) => displayKecName(d.kecNameRaw)))).sort()];
  }, [activeCategoryData]);

  // Filter berdasarkan kecamatan terpilih
  const filteredData = useMemo(() => {
    return selectedKecamatan === "Semua"
      ? currentYearData
      : currentYearData.filter((d) => normalizeKecName(d.kecNameRaw) === normalizeKecName(selectedKecamatan));
  }, [currentYearData, selectedKecamatan]);

  // Force metrik produksi untuk kategori buah
  const activeMetric = useMemo(() => {
    return category === "buah" ? "produksi" : metric;
  }, [category, metric]);

  // Agregasi Statistik Utama
  const stats = useMemo(() => {
    let totalLuas = 0;
    let totalProduksi = 0;
    let maxVal = -1;
    let topDistrict = "-";

    const cropBreakdown = cropKeys.map((c) => ({
      key: c.key,
      name: c.label,
      luas: 0,
      produksi: 0,
    }));

    filteredData.forEach((d) => {
      let sumLuas = 0;
      let sumProd = 0;

      cropKeys.forEach((crop, idx) => {
        const lVal = d.luas[crop.key] || 0;
        const pVal = d.produksi[crop.key] || 0;
        
        sumLuas += lVal;
        sumProd += pVal;

        cropBreakdown[idx].luas += lVal;
        cropBreakdown[idx].produksi += pVal;
      });

      totalLuas += sumLuas;
      totalProduksi += sumProd;

      const compareVal = activeMetric === "luas" ? sumLuas : activeMetric === "produksi" ? sumProd : (sumLuas > 0 ? sumProd / sumLuas : 0);
      if (compareVal > maxVal) {
        maxVal = compareVal;
        topDistrict = displayKecName(d.kecNameRaw);
      }
    });

    const breakdown = cropBreakdown.map((item) => {
      let value = 0;
      if (activeMetric === "luas") value = item.luas;
      else if (activeMetric === "produksi") value = item.produksi;
      else value = item.luas > 0 ? item.produksi / item.luas : 0;

      return {
        name: item.name,
        value,
        luas: item.luas,
        produksi: item.produksi,
      };
    }).sort((a, b) => b.value - a.value);

    const totalVal = activeMetric === "luas" ? totalLuas : activeMetric === "produksi" ? totalProduksi : (totalLuas > 0 ? totalProduksi / totalLuas : 0);

    return {
      total: totalVal,
      totalLuas,
      totalProduksi,
      topDistrict,
      topVal: maxVal,
      breakdown,
    };
  }, [filteredData, activeMetric, cropKeys]);

  // Format data untuk grafik sebaran per kecamatan
  const chartData = useMemo(() => {
    return filteredData.map((d) => {
      const obj: any = { name: displayKecName(d.kecNameRaw) };
      let sum = 0;
      
      cropKeys.forEach((crop) => {
        let val = 0;
        if (activeMetric === "luas") {
          val = d.luas[crop.key] || 0;
        } else if (activeMetric === "produksi") {
          val = d.produksi[crop.key] || 0;
        } else {
          const l = d.luas[crop.key] || 0;
          const p = d.produksi[crop.key] || 0;
          val = l > 0 ? p / l : 0;
        }
        obj[crop.label] = val;
        sum += val;
      });

      obj.total = sum;
      return obj;
    }).sort((a, b) => b.total - a.total);
  }, [filteredData, activeMetric, cropKeys]);

  // Tren Historis
  const trendData = useMemo(() => {
    const base = selectedKecamatan === "Semua"
      ? activeCategoryData
      : activeCategoryData.filter((d) => normalizeKecName(d.kecNameRaw) === normalizeKecName(selectedKecamatan));

    const byYear = new Map<string, any>();

    base.forEach((d) => {
      const yr = d.tahun;
      if (!yr) return;

      if (!byYear.has(yr)) {
        const obj: any = { tahun: yr, total: 0, totalLuas: 0, totalProduksi: 0 };
        cropKeys.forEach((c) => (obj[c.label] = 0));
        byYear.set(yr, obj);
      }

      const entry = byYear.get(yr);
      
      cropKeys.forEach((crop) => {
        const l = d.luas[crop.key] || 0;
        const p = d.produksi[crop.key] || 0;

        entry.totalLuas += l;
        entry.totalProduksi += p;

        if (activeMetric === "luas") {
          entry[crop.label] += l;
        } else if (activeMetric === "produksi") {
          entry[crop.label] += p;
        }
      });
    });

    return Array.from(byYear.values()).map((entry) => {
      if (activeMetric === "luas") {
        entry.total = entry.totalLuas;
      } else if (activeMetric === "produksi") {
        entry.total = entry.totalProduksi;
      } else {
        entry.total = entry.totalLuas > 0 ? entry.totalProduksi / entry.totalLuas : 0;
        // Produktivitas tiap komoditas secara total
        cropKeys.forEach((crop) => {
          let cropLuas = 0;
          let cropProd = 0;
          base.filter(b => b.tahun === entry.tahun).forEach(b => {
            cropLuas += b.luas[crop.key] || 0;
            cropProd += b.produksi[crop.key] || 0;
          });
          entry[crop.label] = cropLuas > 0 ? cropProd / cropLuas : 0;
        });
      }
      return entry;
    }).sort((a, b) => a.tahun.localeCompare(b.tahun));
  }, [activeCategoryData, selectedKecamatan, activeMetric, cropKeys]);

  // CAGR Laju Pertumbuhan Tahunan
  const cagrData = useMemo(() => {
    if (trendData.length < 2) return null;
    const first = trendData[0];
    const last = trendData[trendData.length - 1];
    const years = parseInt(last.tahun) - parseInt(first.tahun);
    if (!years || years <= 0) return null;

    const calc = (awal: number, akhir: number): number | null => {
      if (!awal || awal <= 0 || akhir < 0) return null;
      return (Math.pow(akhir / awal, 1 / years) - 1) * 100;
    };

    const items = cropKeys.map((crop) => ({
      name: crop.label,
      cagr: calc(first[crop.label] || 0, last[crop.label] || 0),
    }));

    return {
      periode: `${first.tahun}–${last.tahun}`,
      years,
      total: calc(first.total || 0, last.total || 0),
      items,
    };
  }, [trendData, cropKeys]);

  // Deteksi Anomali
  const ANOMALY_THRESHOLD = -15;
  const anomalies = useMemo(() => {
    const result: {
      tahun: string;
      prevTahun: string;
      pct: number;
      selisih: number;
      penyumbang: string;
    }[] = [];

    for (let i = 1; i < trendData.length; i++) {
      const prev = trendData[i - 1];
      const cur = trendData[i];
      if (!prev.total || prev.total <= 0) continue;
      const pct = ((cur.total - prev.total) / prev.total) * 100;
      
      if (pct > ANOMALY_THRESHOLD) continue;

      let penyumbang = "-";
      let maxDrop = 0;

      cropKeys.forEach((crop) => {
        const drop = (prev[crop.label] || 0) - (cur[crop.label] || 0);
        if (drop > maxDrop) {
          maxDrop = drop;
          penyumbang = crop.label;
        }
      });

      result.push({
        tahun: cur.tahun,
        prevTahun: prev.tahun,
        pct,
        selisih: cur.total - prev.total,
        penyumbang,
      });
    }

    return result;
  }, [trendData, cropKeys]);

  // Regresi Linier Proyeksi
  const projection = useMemo(() => {
    if (trendData.length < 3) return null;

    const pts = trendData.map((d) => ({ x: parseInt(d.tahun), y: d.total }));
    const n = pts.length;
    const sumX = pts.reduce((a, p) => a + p.x, 0);
    const sumY = pts.reduce((a, p) => a + p.y, 0);
    const sumXY = pts.reduce((a, p) => a + p.x * p.y, 0);
    const sumXX = pts.reduce((a, p) => a + p.x * p.x, 0);

    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    const meanY = sumY / n;
    const ssTot = pts.reduce((a, p) => a + Math.pow(p.y - meanY, 2), 0);
    const ssRes = pts.reduce((a, p) => a + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

    const nextYear = pts[n - 1].x + 1;
    const predicted = Math.max(0, slope * nextYear + intercept);
    const lastVal = pts[n - 1].y;
    const deltaPct = lastVal > 0 ? ((predicted - lastVal) / lastVal) * 100 : null;

    return {
      nextYear: String(nextYear),
      predicted,
      r2,
      slope,
      deltaPct,
      lastTahun: trendData[n - 1].tahun,
    };
  }, [trendData]);

  // Data tren dengan proyeksi
  const trendWithProjection = useMemo(() => {
    const base = trendData.map((d) => ({ ...d, proyeksi: undefined as number | undefined }));
    if (projection && base.length > 0) {
      base[base.length - 1].proyeksi = base[base.length - 1].total;
      base.push({
        tahun: projection.nextYear,
        total: undefined as any,
        proyeksi: projection.predicted,
      } as any);
    }
    return base;
  }, [trendData, projection]);

  const formatNum = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: activeMetric === "produktivitas" ? 2 : 0,
    }).format(num);
  };

  const formatPct = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(val);
  };

  const metricLabel = useMemo(() => {
    if (activeMetric === "luas") return "Luas Lahan (Ha)";
    if (activeMetric === "produksi") return "Volume Produksi (Ton)";
    return "Produktivitas (Ton/Ha)";
  }, [activeMetric]);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b-2 border-dashed border-neutral-300 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm">
            Analitik Hortikultura
          </h2>
            <p className="font-mono text-sm md:text-base font-medium text-[#4a4a4a] mt-4 max-w-2xl border-l-4 border-emerald-500 pl-4 bg-white/80 py-1">
            Pemantauan Produksi dan Lahan Sayuran & Buah-Buahan Kabupaten Banjarnegara.
          </p>
          </div>
          <div className="w-full md:w-48 lg:w-64 shrink-0 flex items-center justify-center">
            <img
              src="/img/horticulture.png"
              alt="Hortikultura"
              className="w-full max-h-32 md:max-h-36 object-contain"
            />
          </div>
        </section>

        {/* Category & Filters Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
          {/* Sub-Sektor Hortikultura */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">Sub-Sektor</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCategory("sayuran")}
                className={`py-2 px-1 border-2 border-[#141414] font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "sayuran"
                    ? "bg-[#141414] text-white shadow-none"
                    : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Sprout size={14} />
                Sayuran
              </button>
              <button
                onClick={() => setCategory("buah")}
                className={`py-2 px-1 border-2 border-[#141414] font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "buah"
                    ? "bg-[#141414] text-white shadow-none"
                    : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Pizza size={14} />
                Buah
              </button>
            </div>
          </div>

          {/* Metrik Analisis */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">Metrik Analisis</label>
            {category === "buah" ? (
              <div className="py-2 px-3 border-2 border-neutral-200 bg-neutral-50 text-neutral-400 font-mono font-bold text-xs uppercase flex items-center justify-center gap-1">
                <Sprout size={14} />
                Hanya Produksi (Ton)
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setMetric("luas")}
                  className={`py-1.5 px-0.5 border-2 border-[#141414] font-mono font-bold text-[9px] sm:text-[10px] uppercase flex items-center justify-center gap-0.5 transition-all ${
                    metric === "luas"
                      ? "bg-[#141414] text-white shadow-none"
                      : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  }`}
                >
                  Luas (Ha)
                </button>
                <button
                  onClick={() => setMetric("produksi")}
                  className={`py-1.5 px-0.5 border-2 border-[#141414] font-mono font-bold text-[9px] sm:text-[10px] uppercase flex items-center justify-center gap-0.5 transition-all ${
                    metric === "produksi"
                      ? "bg-[#141414] text-white shadow-none"
                      : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  }`}
                >
                  Produksi
                </button>
                <button
                  onClick={() => setMetric("produktivitas")}
                  className={`py-1.5 px-0.5 border-2 border-[#141414] font-mono font-bold text-[9px] sm:text-[10px] uppercase flex items-center justify-center gap-0.5 transition-all ${
                    metric === "produktivitas"
                      ? "bg-[#141414] text-white shadow-none"
                      : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  }`}
                >
                  T / Ha
                </button>
              </div>
            )}
          </div>

          {/* Tahun Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">Tahun Data</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border-2 border-[#141414] font-mono text-sm font-bold bg-white focus:outline-none appearance-none cursor-pointer rounded-none"
              >
                {yearsList.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Kecamatan Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">Pilih Kecamatan</label>
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
              <select
                value={selectedKecamatan}
                onChange={(e) => setSelectedKecamatan(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border-2 border-[#141414] font-mono text-sm font-bold bg-white focus:outline-none appearance-none cursor-pointer rounded-none"
              >
                {uniqueKecamatan.map((kec) => (
                  <option key={kec} value={kec}>
                    {kec}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-neutral-500 font-mono font-bold animate-pulse uppercase">
              Memuat data hortikultura...
            </p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stat 1: Metric Value */}
              <div className="bg-amber-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-neutral-500 uppercase">
                      Total {metricLabel}
                    </h5>
                    <h3 className="text-3xl font-serif font-black uppercase text-[#141414] mt-1">
                      {formatNum(stats.total)}
                    </h3>
                  </div>
                  <div className="p-2 border-2 border-[#141414] bg-white">
                    {category === "sayuran" && activeMetric === "luas" ? <Sprout size={20} /> : <Pizza size={20} />}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-neutral-500 mt-4 uppercase flex flex-col gap-1">
                  {category === "sayuran" && <span>Luas Panen Total: {formatNum(stats.totalLuas)} Ha</span>}
                  <span>Volume Produksi Total: {formatNum(stats.totalProduksi)} Ton</span>
                </div>
              </div>

              {/* Stat 2: Top Kecamatan */}
              <div className="bg-emerald-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-neutral-500 uppercase">
                      Kecamatan Tertinggi
                    </h5>
                    <h3 className="text-2xl font-serif font-black uppercase text-[#141414] mt-1 break-words leading-tight">
                      {stats.topDistrict}
                    </h3>
                  </div>
                  <div className="p-2 border-2 border-[#141414] bg-white">
                    <MapPin size={20} />
                  </div>
                </div>
                <p className="text-xs font-mono text-neutral-500 mt-4 uppercase">
                  Nilai: {formatNum(stats.topVal)} {category === "buah" ? "Ton" : activeMetric === "luas" ? "Ha" : activeMetric === "produksi" ? "Ton" : "Ton/Ha"}
                </p>
              </div>

              {/* Stat 3: Komposisi Komoditas */}
              <div className="bg-violet-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <h5 className="text-xs font-mono font-bold text-neutral-500 uppercase mb-3">
                  Komposisi Komoditas
                </h5>
                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {stats.breakdown.map((item, idx) => {
                    const percentage =
                      activeMetric === "produktivitas"
                        ? stats.breakdown[0].value > 0
                          ? (item.value / stats.breakdown[0].value) * 100
                          : 0
                        : stats.total > 0
                          ? (item.value / stats.total) * 100
                          : 0;

                    return (
                      <div key={item.name} className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[10px] font-mono font-bold uppercase">
                          <span className="truncate max-w-[120px]">{item.name}</span>
                          <span>
                            {formatNum(item.value)} {category === "buah" ? "Ton" : activeMetric === "luas" ? "Ha" : activeMetric === "produksi" ? "Ton" : "T/Ha"}{" "}
                            {activeMetric !== "produktivitas" && `(${percentage.toFixed(1)}%)`}
                          </span>
                        </div>
                        <div className="w-full bg-neutral-200 h-1.5 border border-[#141414]">
                          <div
                            className="h-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: [
                                "#059669",
                                "#2563eb",
                                "#7c3aed",
                                "#db2777",
                                "#ea580c",
                                "#d97706",
                                "#4b5563",
                                "#16a34a",
                              ][idx % 8],
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Time-Series Trend */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="mb-4 text-left border-b-2 border-[#141414] pb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <TrendingUp className="text-emerald-600" />
                  Tren Perkembangan {metricLabel} {category === "sayuran" ? "Sayuran" : "Buah"}
                  {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                </h4>
                {activeMetric !== "produktivitas" && cagrData && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 border-2 border-[#141414] font-mono font-bold text-[10px] uppercase bg-emerald-100 text-emerald-800">
                    CAGR: {cagrData.total === null ? "N/A" : `${cagrData.total >= 0 ? "+" : ""}${formatPct(cagrData.total)}%`} ({cagrData.periode})
                  </span>
                )}
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendWithProjection} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} vertical={false} />
                    <XAxis
                      dataKey="tahun"
                      tick={{ fill: "#141414", fontSize: 11, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#141414", strokeWidth: 2 }}
                      tickLine={{ stroke: "#141414" }}
                    />
                    <YAxis
                      tick={{ fill: "#141414", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#141414", strokeWidth: 2 }}
                      tickLine={{ stroke: "#141414" }}
                      tickFormatter={(v) => formatNum(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "2px solid #141414",
                        borderRadius: "0px",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        fontWeight: "bold",
                        boxShadow: "4px 4px 0px 0px #141414",
                      }}
                      formatter={(value: any) => [formatNum(Number(value)), ""]}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontSize: "10px", fontWeight: "bold" }} />
                    <Line type="monotone" dataKey="total" name={`Total ${category === "buah" ? "Ton" : activeMetric === "luas" ? "Ha" : activeMetric === "produksi" ? "Ton" : "Rata-Rata"}`} stroke="#141414" strokeWidth={3} dot={{ fill: "#141414", r: 4 }} activeDot={{ r: 6 }} connectNulls={false} />
                    {activeMetric !== "produktivitas" && (
                      <Line type="monotone" dataKey="proyeksi" name="Proyeksi" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4" dot={{ fill: "#ef4444", r: 4 }} connectNulls={true} />
                    )}
                    {cropKeys.map((c, idx) => {
                      const colors = [
                        "#059669",
                        "#2563eb",
                        "#7c3aed",
                        "#db2777",
                        "#ea580c",
                        "#d97706",
                        "#4b5563",
                        "#16a34a",
                      ];
                      return (
                        <Line key={c.key} type="monotone" dataKey={c.label} stroke={colors[idx % colors.length]} strokeWidth={1.5} dot={false} />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Regression Projections (only for Area and Production, not productivity ratio) */}
            {activeMetric !== "produktivitas" && projection && (
              <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                    <TrendingUp className="text-emerald-600" size={18} />
                    Proyeksi Garis Tren Hortikultura ({projection.nextYear})
                  </h4>
                  <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-1">
                    Estimasi model regresi linier (least-squares) berdasarkan tren historis
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="border-2 border-[#141414] bg-emerald-50 p-4 shadow-[2px_2px_0px_0px_#141414] flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">
                      Prediksi {projection.nextYear} ({activeMetric === "luas" ? "Ha" : "Ton"})
                    </span>
                    <span className="text-2xl font-serif font-black text-[#141414] mt-2">
                      {formatNum(projection.predicted)}
                    </span>
                  </div>
                  <div className="border-2 border-[#141414] bg-white p-4 shadow-[2px_2px_0px_0px_#141414] flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">
                      Perubahan vs {projection.lastTahun}
                    </span>
                    <span
                      className={`text-2xl font-serif font-black mt-2 ${
                        projection.deltaPct === null
                          ? "text-neutral-400"
                          : projection.deltaPct >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                      }`}
                    >
                      {projection.deltaPct === null
                        ? "N/A"
                        : `${projection.deltaPct >= 0 ? "▲" : "▼"} ${formatPct(Math.abs(projection.deltaPct))}%`}
                    </span>
                  </div>
                  <div className="border-2 border-[#141414] bg-white p-4 shadow-[2px_2px_0px_0px_#141414] flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">
                      Keandalan Model (R²)
                    </span>
                    <span
                      className={`text-2xl font-serif font-black mt-2 ${
                        projection.r2 >= 0.7
                          ? "text-emerald-600"
                          : projection.r2 >= 0.4
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {formatPct(projection.r2 * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Anomaly Detection */}
            {activeMetric !== "produktivitas" && (
              <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="mb-4 text-left border-b border-neutral-200 pb-2 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                    <AlertTriangle className="text-red-600" size={18} />
                    Deteksi Anomali Hortikultura
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">
                    Penurunan Tajam &gt; {Math.abs(ANOMALY_THRESHOLD)}% YoY
                  </span>
                </div>
                {anomalies.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border-2 border-[#141414] text-[11px] font-mono font-bold text-emerald-800 uppercase text-left">
                    <ShieldCheck size={14} />
                    Tidak ada anomali penurunan tajam terdeteksi pada komoditas hortikultura di wilayah ini.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {anomalies.map((a) => (
                      <div
                        key={a.tahun}
                        className="flex flex-wrap items-center justify-between gap-3 p-3 bg-red-50 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center px-2 py-0.5 bg-red-600 text-white border-2 border-[#141414] font-mono font-black text-sm">
                            {a.tahun}
                          </span>
                          <div>
                            <p className="text-[11px] font-mono font-bold uppercase text-red-800">
                              Mengalami penurunan {formatPct(Math.abs(a.pct))}% dibandingkan {a.prevTahun}
                            </p>
                            <p className="text-[10px] font-mono text-neutral-600 uppercase">
                              Penyumbang penurunan terbesar: {a.penyumbang} (Selisih: {formatNum(a.selisih)} {activeMetric === "luas" ? "Ha" : "Ton"})
                            </p>
                          </div>
                        </div>
                        <span className="text-xl font-serif font-black text-red-600">
                          ▼ {formatPct(Math.abs(a.pct))}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CAGR Breakdown */}
            {activeMetric !== "produktivitas" && cagrData && (
              <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                    Rata-rata Laju Pertumbuhan Komoditas (CAGR) {cagrData.periode}
                  </h4>
                  <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-1">
                    Laju pertumbuhan majemuk per tahun per komoditas ({selectedKecamatan !== "Semua" ? selectedKecamatan : "Seluruh Banjarnegara"})
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-left">
                  <div className="border-2 border-[#141414] bg-[#141414] text-white p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-300">
                      Total Gabungan
                    </span>
                    <span className="text-2xl font-serif font-black mt-2">
                      {cagrData.total === null
                        ? "N/A"
                        : `${cagrData.total >= 0 ? "+" : ""}${formatPct(cagrData.total)}%`}
                    </span>
                  </div>
                  {cagrData.items.map((item) => (
                    <div
                      key={item.name}
                      className="border-2 border-[#141414] bg-white p-4 flex flex-col justify-between shadow-[2px_2px_0px_0px_#141414]"
                    >
                      <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 leading-tight">
                        {item.name}
                      </span>
                      <span
                        className={`text-2xl font-serif font-black mt-2 ${
                          item.cagr === null
                            ? "text-neutral-400"
                            : item.cagr >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                        }`}
                      >
                        {item.cagr === null ? (
                          "N/A"
                        ) : (
                          <>
                            {item.cagr >= 0 ? "▲" : "▼"} {formatPct(Math.abs(item.cagr))}%
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Distribution Chart */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="flex flex-col mb-6 border-b-2 border-[#141414] pb-3 text-left">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <FileSpreadsheet className="text-emerald-600" />
                  Sebaran Nilai Komoditas per Kecamatan ({selectedYear})
                </h4>
                <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">
                  Kontribusi masing-masing kecamatan terhadap {metricLabel} hortikultura
                </p>
              </div>

              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#141414", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#141414", strokeWidth: 2 }}
                      tickLine={{ stroke: "#141414" }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fill: "#141414", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#141414", strokeWidth: 2 }}
                      tickLine={{ stroke: "#141414" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "2px solid #141414",
                        borderRadius: "0px",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        fontWeight: "bold",
                        boxShadow: "4px 4px 0px 0px #141414",
                      }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontSize: "10px", fontWeight: "bold" }} />
                    {cropKeys.map((crop, idx) => {
                      const colors = [
                        "#059669",
                        "#2563eb",
                        "#7c3aed",
                        "#db2777",
                        "#ea580c",
                        "#d97706",
                        "#4b5563",
                        "#16a34a",
                      ];
                      return (
                        <Bar
                          key={crop.key}
                          dataKey={crop.label}
                          stackId="a"
                          fill={colors[idx % colors.length]}
                          stroke="#141414"
                          strokeWidth={1}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                  Tabel Rincian Data Perkecamatan ({selectedYear})
                </h4>
                <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-1">
                  Nilai yang ditampilkan adalah {metricLabel}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#141414] bg-neutral-100">
                      <th className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs">No</th>
                      <th className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs">Kecamatan</th>
                      {cropKeys.map((c) => (
                        <th key={c.key} className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs text-right truncate max-w-[100px]">
                          {c.label}
                        </th>
                      ))}
                      <th className="p-3 font-bold uppercase text-xs text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, idx) => (
                      <tr key={row.name} className="border-b border-neutral-200 hover:bg-neutral-50">
                        <td className="p-3 border-r border-neutral-200 text-xs font-bold">{idx + 1}</td>
                        <td className="p-3 border-r border-neutral-200 text-xs font-bold uppercase truncate max-w-[120px]">
                          {row.name}
                        </td>
                        {cropKeys.map((c) => (
                          <td key={c.key} className="p-3 border-r border-neutral-200 text-xs text-right">
                            {formatNum(row[c.label] || 0)}
                          </td>
                        ))}
                        <td className="p-3 text-xs font-black text-right bg-neutral-50">
                          {formatNum(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </DefaultLayout>
  );
}
