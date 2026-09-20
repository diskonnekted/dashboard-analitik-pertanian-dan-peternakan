import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchPlantationArea, fetchPlantationProduction, PlantationArea, PlantationProduction } from "@/services/api";
import { Sprout, TreePine, Calendar, MapPin, TrendingUp, Filter, AlertTriangle, ShieldCheck, FileSpreadsheet, Activity } from "lucide-react";
import { PageHeader, KpiCard, SectionCard, TrendPill, Badge, LoadingSpinner } from "@/components/ui";

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
    let maxVal = 0;
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
      
      let sumLuas = 0;
      let sumProd = 0;

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
        sumLuas += d.luas[crop.key] || 0;
        sumProd += d.produksi[crop.key] || 0;
      });

      // Produktivitas tidak boleh dijumlah antar komoditas:
      // total kecamatan = rata-rata tertimbang (Σ produksi ÷ Σ luas areal).
      obj.total = metric === "produktivitas" ? (sumLuas > 0 ? sumProd / sumLuas : 0) : sum;
      return obj;
    }).sort((a, b) => b.total - a.total);
  }, [filteredData, metric, cropKeys]);

  // Tren Historis (2017 - 2024)
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

    // Pass 2: konversi ke nilai metrik. Produktivitas = rata-rata TERTIMBANG
    // (Σ produksi ÷ Σ luas) — bukan jumlah rasio per komoditas.
    return Array.from(byYear.values()).map((entry) => {
      if (metric === "luas") {
        entry.total = entry.totalLuas;
      } else if (metric === "produksi") {
        entry.total = entry.totalProduksi;
      } else {
        entry.total = entry.totalLuas > 0 ? entry.totalProduksi / entry.totalLuas : 0;
        cropKeys.forEach((crop) => {
          const cropLuas = entry[`__luas_${crop.key}`] || 0;
          const cropProd = entry[`__prod_${crop.key}`] || 0;
          entry[crop.label] = cropLuas > 0 ? cropProd / cropLuas : 0;
        });
      }
      cropKeys.forEach((c) => {
        delete entry[`__luas_${c.key}`];
        delete entry[`__prod_${c.key}`];
      });
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
        <PageHeader
          icon={<TreePine className="h-6 w-6" />}
          title="Analitik Perkebunan & Komoditas"
          subtitle="Analisis luas lahan, hasil produksi, dan produktivitas perkebunan Kabupaten Banjarnegara."
          actions={<Badge tone="blue">Tahun {selectedYear}</Badge>}
        />

        {/* Filters Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          {/* Metric Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metrik Analisis</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setMetric("luas")}
                className={`py-2 px-1 border border-slate-200 text-[10px] sm:text-xs font-semibold uppercase flex items-center justify-center gap-1 transition-all ${
                  metric === "luas"
                    ? "bg-blue-800 text-white shadow-sm"
                    : "bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <TreePine size={14} />
                Luas (Ha)
              </button>
              <button
                onClick={() => setMetric("produksi")}
                className={`py-2 px-1 border border-slate-200 text-[10px] sm:text-xs font-semibold uppercase flex items-center justify-center gap-1 transition-all ${
                  metric === "produksi"
                    ? "bg-blue-800 text-white shadow-sm"
                    : "bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <Sprout size={14} />
                Produksi
              </button>
              <button
                onClick={() => setMetric("produktivitas")}
                className={`py-2 px-1 border border-slate-200 text-[10px] sm:text-xs font-semibold uppercase flex items-center justify-center gap-1 transition-all ${
                  metric === "produktivitas"
                    ? "bg-blue-800 text-white shadow-sm"
                    : "bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <Activity size={14} />
                Ton / Ha
              </button>
            </div>
          </div>

          {/* Year Dropdown */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tahun Data</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 text-sm font-medium bg-white focus:outline-none appearance-none cursor-pointer rounded-md"
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
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pilih Kecamatan</label>
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
              <select
                value={selectedKecamatan}
                onChange={(e) => setSelectedKecamatan(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 text-sm font-medium bg-white focus:outline-none appearance-none cursor-pointer rounded-md"
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
          <LoadingSpinner label="Memuat data perkebunan" />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stat 1: Metric Value */}
              <KpiCard
                icon={metric === "luas" ? <TreePine size={20} /> : metric === "produksi" ? <Sprout size={20} /> : <Activity size={20} />}
                label={metric === "produktivitas" ? "Rata-rata Produksi Tertimbang" : `Total ${metricLabel}`}
                value={`${formatNum(stats.total)}${metric === "produktivitas" ? " T/Ha" : ""}`}
                color="bg-amber-300"
                hint={
                  metric === "produktivitas"
                    ? `Σ produksi ÷ Σ luas areal (${formatNum(stats.totalProduksi)} Ton ÷ ${formatNum(stats.totalLuas)} Ha)`
                    : `Luas Lahan ${formatNum(stats.totalLuas)} Ha · Produksi ${formatNum(stats.totalProduksi)} Ton`
                }
              />

              {/* Stat 2: Top Kecamatan */}
              <KpiCard
                icon={<MapPin size={20} />}
                label="Kecamatan Tertinggi"
                value={stats.topDistrict}
                color="bg-emerald-300"
                hint={`Nilai ${formatNum(stats.topVal)} ${metric === "luas" ? "Ha" : metric === "produksi" ? "Ton" : "Ton/Ha"} (${selectedYear})`}
              />

              {/* Stat 3: Komposisi Komoditas */}
              <SectionCard title="Komposisi Komoditas" bodyClassName="p-5 flex flex-col justify-center">
                <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {stats.breakdown.map((item, idx) => {
                    // Basis persentase: pangsa terhadap total metrik (luas/produksi).
                    // Untuk produktivitas, basisnya tonase produksi (fisik),
                    // bukan jumlah nilai intensitas.
                    const pctBase = metric === "luas" ? stats.totalLuas : stats.totalProduksi;
                    const pctVal = metric === "luas" ? item.luas : item.produksi;
                    const percentage = pctBase > 0 ? (pctVal / pctBase) * 100 : 0;

                    return (
                      <div key={item.name} className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                          <span className="truncate max-w-[120px]">{item.name}</span>
                          <span>
                            {formatNum(item.value)} {metric === "luas" ? "Ha" : metric === "produksi" ? "Ton" : "T/Ha"}{" "}
                            {`(${percentage.toFixed(1)}%${metric === "produktivitas" ? " prod" : ""})`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
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
              </SectionCard>
            </div>

            {/* Time-Series Trend */}
            <SectionCard
              title={`Tren Perkembangan ${metricLabel}${
                selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""
              }`}
              icon={<TrendingUp size={16} className="text-emerald-600" />}
              actions={
                metric !== "produktivitas" && cagrData ? (
                  cagrData.total === null ? (
                    <Badge tone="slate">CAGR N/A · {cagrData.periode}</Badge>
                  ) : (
                    <TrendPill value={cagrData.total} label={`CAGR ${cagrData.periode}`} />
                  )
                ) : undefined
              }
            >
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendWithProjection} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} vertical={false} />
                    <XAxis
                      dataKey="tahun"
                      tick={{ fill: "#475569", fontSize: 11 }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                    />
                    <YAxis
                      tick={{ fill: "#475569", fontSize: 10 }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                      tickFormatter={(v) => formatNum(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: any, name: any) => [formatNum(Number(value)), String(name ?? "")]}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "10px" }} />
                    <Line type="monotone" dataKey="total" name={metric === "luas" ? "Total (Ha)" : metric === "produksi" ? "Total (Ton)" : "Rata-rata Tertimbang (T/Ha)"} stroke="#64748b" strokeWidth={3} dot={{ fill: "#475569", r: 4 }} activeDot={{ r: 6 }} connectNulls={false} />
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
            </SectionCard>

            {/* Regression Projections (only for Area and Production, not productivity ratio) */}
            {metric !== "produktivitas" && projection && (
              <SectionCard
                title={`Proyeksi Garis Tren Perkebunan (${projection.nextYear})`}
                icon={<TrendingUp size={16} className="text-emerald-600" />}
              >
                <p className="text-xs text-slate-500 mb-4">
                  Estimasi model regresi linier (least-squares) berdasarkan tren historis
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="border border-emerald-100 bg-emerald-50 rounded-lg p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      Prediksi {projection.nextYear} ({metric === "luas" ? "Ha" : "Ton"})
                    </span>
                    <span className="text-2xl font-bold tabular-nums text-slate-800 mt-2">
                      {formatNum(projection.predicted)}
                    </span>
                  </div>
                  <div className="border border-slate-200 bg-white rounded-lg p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      Perubahan vs {projection.lastTahun}
                    </span>
                    <span
                      className={`text-2xl font-bold tabular-nums mt-2 ${
                        projection.deltaPct === null
                          ? "text-slate-400"
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
                  <div className="border border-slate-200 bg-white rounded-lg p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      Keandalan Model (R²)
                    </span>
                    <span
                      className={`text-2xl font-bold tabular-nums mt-2 ${
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
              </SectionCard>
            )}

            {/* Anomaly Detection */}
            {metric !== "produktivitas" && (
              <SectionCard
                title="Deteksi Anomali Luas / Produksi Perkebunan"
                icon={<AlertTriangle size={16} className="text-red-600" />}
                actions={<Badge tone="red">Penurunan &gt; {Math.abs(ANOMALY_THRESHOLD)}% YoY</Badge>}
              >
                {anomalies.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-semibold text-emerald-800 text-left">
                    <ShieldCheck size={14} />
                    Tidak ada anomali penurunan tajam terdeteksi pada komoditas perkebunan di wilayah ini.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {anomalies.map((a) => (
                      <div
                        key={a.tahun}
                        className="flex flex-wrap items-center justify-between gap-3 p-3 bg-red-50 border border-red-100 rounded-lg text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-800 text-white text-xs font-bold tabular-nums">
                            {a.tahun}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-red-700">
                              Mengalami penurunan {formatPct(Math.abs(a.pct))}% dibandingkan {a.prevTahun}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Penyumbang penurunan terbesar: {a.penyumbang} (Selisih: {formatNum(a.selisih)} {metric === "luas" ? "Ha" : "Ton"})
                            </p>
                          </div>
                        </div>
                        <span className="text-xl font-bold tabular-nums text-red-600">
                          ▼ {formatPct(Math.abs(a.pct))}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {/* CAGR Breakdown */}
            {metric !== "produktivitas" && cagrData && (
              <SectionCard title={`Rata-rata Laju Pertumbuhan Komoditas (CAGR) ${cagrData.periode}`}>
                <p className="text-xs text-slate-500 mb-4">
                  Laju pertumbuhan majemuk per tahun per komoditas ({selectedKecamatan !== "Semua" ? selectedKecamatan : "Seluruh Banjarnegara"})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-left">
                  <div className="border border-slate-800 bg-slate-800 text-white rounded-lg p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold uppercase text-slate-400">
                      Total Gabungan
                    </span>
                    <span className="text-2xl font-bold tabular-nums mt-2">
                      {cagrData.total === null
                        ? "N/A"
                        : `${cagrData.total >= 0 ? "+" : ""}${formatPct(cagrData.total)}%`}
                    </span>
                  </div>
                  {cagrData.items.map((item) => (
                    <div
                      key={item.name}
                      className="border border-slate-200 bg-white rounded-lg p-4 flex flex-col justify-between"
                    >
                      <span className="text-[11px] font-semibold uppercase text-slate-500 leading-tight">
                        {item.name}
                      </span>
                      <span
                        className={`text-2xl font-bold tabular-nums mt-2 ${
                          item.cagr === null
                            ? "text-slate-400"
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
              </SectionCard>
            )}

            {/* Distribution Map/Chart */}
            <SectionCard
              title={`Sebaran Nilai Komoditas per Kecamatan (${selectedYear})`}
              icon={<FileSpreadsheet size={16} className="text-emerald-600" />}
            >
              <p className="text-xs text-slate-500 mb-4">
                Kontribusi masing-masing kecamatan terhadap {metricLabel} perkebunan
                {metric === "produktivitas" &&
                  " — batang ditampilkan berdampingan karena nilai intensitas tidak dijumlah antar komoditas"}
              </p>

              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#475569", fontSize: 10 }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
                      width={70}
                      tick={{ fill: "#475569", fontSize: 10 }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: any, name: any) => [formatNum(Number(value)), String(name ?? "")]}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "10px" }} />
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
                          stackId={metric === "produktivitas" ? undefined : "a"}
                          fill={colors[idx % colors.length]}
                          stroke="#64748b"
                          strokeWidth={1}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            {/* Data Table */}
            <SectionCard title={`Tabel Rincian Data Perkecamatan (${selectedYear})`}>
              <p className="text-xs text-slate-500 mb-3">
                Nilai yang ditampilkan adalah {metricLabel}
                {metric === "produktivitas" &&
                  " (Ton/Ha = Σ produksi ÷ Σ luas areal per komoditas; produksi Kopi Arabica belum tersedia)"}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">No</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Kecamatan</th>
                      {cropKeys.map((c) => (
                        <th key={c.key} className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500 truncate max-w-[100px]">
                          {c.label}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, idx) => (
                      <tr key={row.name} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-xs font-semibold text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2.5 text-xs font-semibold truncate max-w-[120px]">
                          {row.name}
                        </td>
                        {cropKeys.map((c) => (
                          <td key={c.key} className="px-3 py-2.5 text-xs text-right tabular-nums">
                            {formatNum(row[c.label] || 0)}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-xs font-bold text-right bg-slate-50 tabular-nums">
                          {formatNum(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {chartData.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold">
                        <td className="px-3 py-2.5 text-[11px] uppercase tracking-wide text-slate-600" colSpan={2}>
                          {metric === "produktivitas" ? "Rata-rata tertimbang" : "Jumlah"} ·{" "}
                          {selectedKecamatan === "Semua" ? "Seluruh Kabupaten" : selectedKecamatan}
                        </td>
                        {cropKeys.map((c) => {
                          const l = filteredData.reduce((a, d) => a + (d.luas[c.key] || 0), 0);
                          const p = filteredData.reduce((a, d) => a + (d.produksi[c.key] || 0), 0);
                          const v = metric === "luas" ? l : metric === "produksi" ? p : l > 0 ? p / l : 0;
                          return (
                            <td key={c.key} className="px-3 py-2.5 text-xs text-right tabular-nums">
                              {formatNum(v)}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5 text-xs font-bold text-right bg-amber-50 tabular-nums">
                          {formatNum(stats.total)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </SectionCard>
          </>
        )}
      </section>
    </DefaultLayout>
  );
}
