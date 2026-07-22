import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchPlantationArea, fetchPlantationProduction, PlantationArea, PlantationProduction } from "@/services/api";
import { Sprout, TreePine, Calendar, MapPin, TrendingUp, Filter, AlertTriangle, ShieldCheck, FileSpreadsheet, Activity } from "lucide-react";

type Metric = "luas" | "produksi" | "produktivitas";

export default function PlantationPage() {
  const [areaData, setAreaData] = useState<PlantationArea[]>([]);
  const [productionData, setProductionData] = useState<PlantationProduction[]>([]);
  const [metric, setMetric] = useState<Metric>("luas");
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [area, production] = await Promise.all([
          fetchPlantationArea(),
          fetchPlantationProduction(),
        ]);
        setAreaData(area);
        setProductionData(production);
      } catch (err) {
        console.error("Gagal memuat data perkebunan:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const cropKeys = useMemo(() => [
    { key: "kelapaDalam", label: "Kelapa Dalam" },
    { key: "kopiRobusta", label: "Kopi Robusta" },
    { key: "teh", label: "Teh" },
    { key: "tembakau", label: "Tembakau" },
    { key: "karet", label: "Karet" },
    { key: "kakao", label: "Kakao" },
    { key: "tebu", label: "Tebu" },
    { key: "kopiArabica", label: "Kopi Arabica" },
    { key: "kelapaSawit", label: "Kelapa Sawit" }
  ], []);

  // Ambil daftar tahun unik dari data areal
  const yearsList = useMemo(() => {
    return Array.from(new Set(areaData.map((d) => d.tahun).filter(Boolean)))
      .sort((a, b) => b.localeCompare(a));
  }, [areaData]);

  useEffect(() => {
    if (yearsList.length > 0 && !yearsList.includes(selectedYear)) {
      setSelectedYear(yearsList[0]);
    }
  }, [yearsList, selectedYear]);

  // Gabungkan data areal & produksi berdasarkan kecamatan + tahun
  const mergedData = useMemo(() => {
    const dataMap = new Map<string, any>();

    areaData.forEach((area) => {
      const key = `${area.kecamatan.toUpperCase()}_${area.tahun}`;
      dataMap.set(key, {
        kecamatan: area.kecamatan,
        tahun: area.tahun,
        luas: {
          kelapaDalam: area.kelapaDalam,
          kopiRobusta: area.kopiRobusta,
          teh: area.teh,
          tembakau: area.tembakau,
          karet: area.karet,
          kakao: area.kakao,
          tebu: area.tebu,
          kopiArabica: area.kopiArabica,
          kelapaSawit: area.kelapaSawit,
        },
        produksi: {
          kelapaDalam: 0,
          kopiRobusta: 0,
          teh: 0,
          tembakau: 0,
          karet: 0,
          kakao: 0,
          tebu: 0,
          kopiArabica: 0, // 0 default
          kelapaSawit: 0,
        },
      });
    });

    productionData.forEach((prod) => {
      const key = `${prod.kecamatan.toUpperCase()}_${prod.tahun}`;
      if (dataMap.has(key)) {
        const entry = dataMap.get(key);
        entry.produksi.kelapaDalam = prod.kelapaDalam;
        entry.produksi.kopiRobusta = prod.kopiRobusta;
        entry.produksi.teh = prod.teh;
        entry.produksi.tembakau = prod.tembakau;
        entry.produksi.karet = prod.karet;
        entry.produksi.kakao = prod.kakao;
        entry.produksi.tebu = prod.tebu;
        entry.produksi.kelapaSawit = prod.kelapaSawit;
      }
    });

    return Array.from(dataMap.values());
  }, [areaData, productionData]);

  // Filter berdasarkan tahun terpilih
  const currentYearData = useMemo(() => {
    return mergedData.filter((d) => d.tahun === selectedYear);
  }, [mergedData, selectedYear]);

  // Daftar kecamatan unik untuk dropdown filter
  const uniqueKecamatan = useMemo(() => {
    return ["Semua", ...Array.from(new Set(mergedData.map((d) => d.kecamatan))).sort()];
  }, [mergedData]);

  // Filter berdasarkan kecamatan terpilih
  const filteredData = useMemo(() => {
    return selectedKecamatan === "Semua"
      ? currentYearData
      : currentYearData.filter((d) => d.kecamatan === selectedKecamatan);
  }, [currentYearData, selectedKecamatan]);

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

      const compareVal = metric === "luas" ? sumLuas : metric === "produksi" ? sumProd : (sumLuas > 0 ? sumProd / sumLuas : 0);
      if (compareVal > maxVal) {
        maxVal = compareVal;
        topDistrict = d.kecamatan;
      }
    });

    const breakdown = cropBreakdown.map((item) => {
      let value = 0;
      if (metric === "luas") value = item.luas;
      else if (metric === "produksi") value = item.produksi;
      else value = item.luas > 0 ? item.produksi / item.luas : 0;

      return {
        name: item.name,
        value,
        luas: item.luas,
        produksi: item.produksi,
      };
    }).sort((a, b) => b.value - a.value);

    const totalVal = metric === "luas" ? totalLuas : metric === "produksi" ? totalProduksi : (totalLuas > 0 ? totalProduksi / totalLuas : 0);

    return {
      total: totalVal,
      totalLuas,
      totalProduksi,
      topDistrict,
      topVal: maxVal,
      breakdown,
    };
  }, [filteredData, metric, cropKeys]);

  // Format data untuk grafik sebaran per kecamatan
  const chartData = useMemo(() => {
    return filteredData.map((d) => {
      const obj: any = { name: d.kecamatan };
      let sum = 0;
      
      cropKeys.forEach((crop) => {
        let val = 0;
        if (metric === "luas") {
          val = d.luas[crop.key] || 0;
        } else if (metric === "produksi") {
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
  }, [filteredData, metric, cropKeys]);

  // Tren Historis (2018 - 2024)
  const trendData = useMemo(() => {
    const base = selectedKecamatan === "Semua"
      ? mergedData
      : mergedData.filter((d) => d.kecamatan === selectedKecamatan);

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

        if (metric === "luas") {
          entry[crop.label] += l;
        } else if (metric === "produksi") {
          entry[crop.label] += p;
        }
      });
    });

    return Array.from(byYear.values()).map((entry) => {
      if (metric === "luas") {
        entry.total = entry.totalLuas;
      } else if (metric === "produksi") {
        entry.total = entry.totalProduksi;
      } else {
        entry.total = entry.totalLuas > 0 ? entry.totalProduksi / entry.totalLuas : 0;
        // Produktivitas tiap komoditas secara total
        cropKeys.forEach((crop) => {
          // Cari luas & produksi untuk tahun ini
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
  }, [mergedData, selectedKecamatan, metric, cropKeys]);

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
      maximumFractionDigits: metric === "produktivitas" ? 2 : 0,
    }).format(num);
  };

  const formatPct = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(val);
  };

  const metricLabel = useMemo(() => {
    if (metric === "luas") return "Luas Lahan (Ha)";
    if (metric === "produksi") return "Volume Produksi (Ton)";
    return "Produktivitas (Ton/Ha)";
  }, [metric]);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b-2 border-dashed border-neutral-300 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm">
            Analitik Perkebunan & Komoditas
          </h2>
            <p className="font-mono text-sm md:text-base font-medium text-[#4a4a4a] mt-4 max-w-2xl border-l-4 border-emerald-500 pl-4 bg-white/80 py-1">
            Analisis Luas Lahan, Hasil Produksi, dan Produktivitas Perkebunan Kabupaten Banjarnegara.
          </p>
          </div>
          <div className="w-full md:w-48 lg:w-64 shrink-0 flex items-center justify-center">
            <img
              src="/img/plantation.png"
              alt="Perkebunan"
              className="w-full max-h-32 md:max-h-36 object-contain"
            />
          </div>
        </section>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
          {/* Metric Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">Metrik Analisis</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setMetric("luas")}
                className={`py-2 px-1 border-2 border-[#141414] font-mono font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  metric === "luas"
                    ? "bg-[#141414] text-white shadow-none"
                    : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <TreePine size={14} />
                Luas (Ha)
              </button>
              <button
                onClick={() => setMetric("produksi")}
                className={`py-2 px-1 border-2 border-[#141414] font-mono font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  metric === "produksi"
                    ? "bg-[#141414] text-white shadow-none"
                    : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Sprout size={14} />
                Produksi
              </button>
              <button
                onClick={() => setMetric("produktivitas")}
                className={`py-2 px-1 border-2 border-[#141414] font-mono font-bold text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  metric === "produktivitas"
                    ? "bg-[#141414] text-white shadow-none"
                    : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Activity size={14} />
                Ton / Ha
              </button>
            </div>
          </div>

          {/* Year Dropdown */}
          <div className="flex flex-col gap-2 text-left">
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
          <div className="flex flex-col gap-2 text-left">
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
              Memuat data perkebunan...
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
                    {metric === "luas" ? <TreePine size={20} /> : metric === "produksi" ? <Sprout size={20} /> : <Activity size={20} />}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-neutral-500 mt-4 uppercase flex flex-col gap-1">
                  <span>Luas Lahan Total: {formatNum(stats.totalLuas)} Ha</span>
                  <span>Produksi Total: {formatNum(stats.totalProduksi)} Ton</span>
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
                  Nilai: {formatNum(stats.topVal)} {metric === "luas" ? "Ha" : metric === "produksi" ? "Ton" : "Ton/Ha"}
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
                      metric === "produktivitas"
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
                            {formatNum(item.value)} {metric === "luas" ? "Ha" : metric === "produksi" ? "Ton" : "T/Ha"}{" "}
                            {metric !== "produktivitas" && `(${percentage.toFixed(1)}%)`}
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
                                "#dc2626",
                              ][idx % 9],
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
                  Tren Perkembangan {metricLabel}
                  {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                </h4>
                {metric !== "produktivitas" && cagrData && (
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
                    <Line type="monotone" dataKey="total" name={`Total ${metric === "luas" ? "Ha" : metric === "produksi" ? "Ton" : "Rata-Rata"}`} stroke="#141414" strokeWidth={3} dot={{ fill: "#141414", r: 4 }} activeDot={{ r: 6 }} connectNulls={false} />
                    {metric !== "produktivitas" && (
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
                        "#dc2626",
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
            {metric !== "produktivitas" && projection && (
              <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                    <TrendingUp className="text-emerald-600" size={18} />
                    Proyeksi Garis Tren Perkebunan ({projection.nextYear})
                  </h4>
                  <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-1">
                    Estimasi model regresi linier (least-squares) berdasarkan tren historis
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="border-2 border-[#141414] bg-emerald-50 p-4 shadow-[2px_2px_0px_0px_#141414] flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">
                      Prediksi {projection.nextYear} ({metric === "luas" ? "Ha" : "Ton"})
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
            {metric !== "produktivitas" && (
              <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="mb-4 text-left border-b border-neutral-200 pb-2 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                    <AlertTriangle className="text-red-600" size={18} />
                    Deteksi Anomali Luas / Produksi Perkebunan
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">
                    Penurunan Tajam &gt; {Math.abs(ANOMALY_THRESHOLD)}% YoY
                  </span>
                </div>
                {anomalies.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border-2 border-[#141414] text-[11px] font-mono font-bold text-emerald-800 uppercase text-left">
                    <ShieldCheck size={14} />
                    Tidak ada anomali penurunan tajam terdeteksi pada komoditas perkebunan di wilayah ini.
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
                              Penyumbang penurunan terbesar: {a.penyumbang} (Selisih: {formatNum(a.selisih)} {metric === "luas" ? "Ha" : "Ton"})
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
            {metric !== "produktivitas" && cagrData && (
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

            {/* Distribution Map/Chart */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="flex flex-col mb-6 border-b-2 border-[#141414] pb-3 text-left">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <FileSpreadsheet className="text-emerald-600" />
                  Sebaran Nilai Komoditas per Kecamatan ({selectedYear})
                </h4>
                <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">
                  Kontribusi masing-masing kecamatan terhadap {metricLabel} perkebunan
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
                        "#dc2626",
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
