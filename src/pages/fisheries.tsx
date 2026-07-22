import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  fetchPerikananBudidaya,
  fetchPerikananTangkap,
  fetchPerikananBenih,
  PerikananBudidaya,
  PerikananTangkap,
  PerikananBenih,
} from "@/services/api";
import { Fish, Waves, Egg, Calendar, MapPin, Filter, AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";

type Category = "budidaya" | "tangkap" | "benih";

export default function FisheriesPage() {
  const [budidayaData, setBudidayaData] = useState<PerikananBudidaya[]>([]);
  const [tangkapData, setTangkapData] = useState<PerikananTangkap[]>([]);
  const [benihData, setBenihData] = useState<PerikananBenih[]>([]);

  const [category, setCategory] = useState<Category>("budidaya");
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [budidaya, tangkap, benih] = await Promise.all([
          fetchPerikananBudidaya(),
          fetchPerikananTangkap(),
          fetchPerikananBenih(),
        ]);
        setBudidayaData(budidaya);
        setTangkapData(tangkap);
        setBenihData(benih);
      } catch (err) {
        console.error("Gagal memuat data perikanan:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  const activeRaw = useMemo(
    () =>
      category === "budidaya"
        ? budidayaData
        : category === "tangkap"
          ? tangkapData
          : benihData,
    [category, budidayaData, tangkapData, benihData],
  );

  const yearsList = useMemo(() => {
    return Array.from(new Set(activeRaw.map((d) => d.tahun).filter(Boolean))).sort(
      (a, b) => b.localeCompare(a),
    );
  }, [activeRaw]);

  useEffect(() => {
    if (yearsList.length > 0 && !yearsList.includes(selectedYear)) {
      setSelectedYear(yearsList[0]);
    }
  }, [category, yearsList]);

  const currentData = useMemo(() => {
    return activeRaw.filter((d) => d.tahun === selectedYear);
  }, [activeRaw, selectedYear]);

  const uniqueKecamatan = useMemo(() => {
    return [
      "Semua",
      ...Array.from(new Set(currentData.map((d) => d.kecamatan))).sort(),
    ];
  }, [currentData]);

  const filteredData = useMemo(() => {
    return selectedKecamatan === "Semua"
      ? currentData
      : currentData.filter((d) => d.kecamatan === selectedKecamatan);
  }, [currentData, selectedKecamatan]);

  // Definisi jenis (dataKey) per kategori
  const seriesKeys = useMemo(() => {
    if (category === "budidaya")
      return [
        { key: "kolamPembesaran", label: "Kolam Pembesaran" },
        { key: "karambaApung", label: "Karamba Apung" },
        { key: "minaPenyelang", label: "Mina Penyelang" },
        { key: "minaTumpangsari", label: "Mina Tumpangsari" },
      ];
    if (category === "tangkap")
      return [
        { key: "jalaTebar", label: "Jala Tebar" },
        { key: "pancing", label: "Pancing" },
        { key: "jaringIngsang", label: "Jaring Ingsang" },
        { key: "lainnya", label: "Lainnya" },
      ];
    return [
      { key: "dipeliharaSendiri", label: "Dipelihara Sendiri" },
      { key: "dijualLuar", label: "Dijual ke Luar" },
    ];
  }, [category]);

  const unit = category === "benih" ? "ekor" : "kg";

  const stats = useMemo(() => {
    let total = 0;
    let topDistrict = "-";
    let topVal = -1;
    const totalsByKey: Record<string, number> = {};
    seriesKeys.forEach((s) => (totalsByKey[s.key] = 0));

    filteredData.forEach((d: any) => {
      let sum = 0;
      seriesKeys.forEach((s) => {
        const v = d[s.key] || 0;
        totalsByKey[s.key] += v;
        sum += v;
      });
      total += sum;
      if (sum > topVal) {
        topVal = sum;
        topDistrict = d.kecamatan;
      }
    });

    const breakdown = seriesKeys.map((s) => ({
      name: s.label,
      value: totalsByKey[s.key],
    }));

    return { total, topDistrict, topVal, breakdown };
  }, [filteredData, seriesKeys]);

  const chartData = useMemo(() => {
    const aggregatedMap = new Map<string, any>();

    filteredData.forEach((d: any) => {
      const kec = d.kecamatan;
      if (!aggregatedMap.has(kec)) {
        const obj: any = { name: kec, total: 0 };
        seriesKeys.forEach((s) => (obj[s.label] = 0));
        aggregatedMap.set(kec, obj);
      }
      const entry = aggregatedMap.get(kec);
      seriesKeys.forEach((s) => {
        const v = d[s.key] || 0;
        entry[s.label] += v;
        entry.total += v;
      });
    });

    return Array.from(aggregatedMap.values()).sort(
      (a: any, b: any) => b.total - a.total,
    );
  }, [filteredData, seriesKeys]);

  // Tren deret waktu: agregasi produksi per tahun (lintas semua tahun),
  // menghormati filter kecamatan tapi mengabaikan filter tahun.
  const trendData = useMemo(() => {
    const base =
      selectedKecamatan === "Semua"
        ? activeRaw
        : activeRaw.filter((d) => d.kecamatan === selectedKecamatan);

    const byYear = new Map<string, any>();
    base.forEach((d: any) => {
      const yr = d.tahun;
      if (!yr) return;
      if (!byYear.has(yr)) {
        const obj: any = { tahun: yr, total: 0 };
        seriesKeys.forEach((s) => (obj[s.label] = 0));
        byYear.set(yr, obj);
      }
      const entry = byYear.get(yr);
      seriesKeys.forEach((s) => {
        const v = d[s.key] || 0;
        entry[s.label] += v;
        entry.total += v;
      });
    });

    return Array.from(byYear.values()).sort((a, b) =>
      a.tahun.localeCompare(b.tahun),
    );
  }, [activeRaw, selectedKecamatan, seriesKeys]);

  // Pertumbuhan total dari tahun pertama ke tahun terakhir yang tersedia
  const trendGrowth = useMemo(() => {
    if (trendData.length < 2) return null;
    const first = trendData[0];
    const last = trendData[trendData.length - 1];
    if (!first.total) return null;
    const pct = ((last.total - first.total) / first.total) * 100;
    return { first, last, pct };
  }, [trendData]);

  // CAGR (Compound Annual Growth Rate) per komoditas + total.
  // Rumus: (nilai_akhir / nilai_awal)^(1/jumlah_tahun) - 1
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

    const items = seriesKeys.map((s) => ({
      name: s.label,
      awal: first[s.label] || 0,
      akhir: last[s.label] || 0,
      cagr: calc(first[s.label] || 0, last[s.label] || 0),
    }));

    return {
      periode: `${first.tahun}–${last.tahun}`,
      years,
      total: calc(first.total || 0, last.total || 0),
      items,
    };
  }, [trendData, seriesKeys]);

  // Deteksi anomali: tahun dengan penurunan total tajam (YoY <= -15%).
  // Menandai penurunan sebagai indikasi gagal panen / gangguan produksi.
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

      // Komoditas dengan penurunan absolut terbesar sebagai penyumbang utama
      let penyumbang = "-";
      let maxDrop = 0;
      seriesKeys.forEach((s) => {
        const drop = (prev[s.label] || 0) - (cur[s.label] || 0);
        if (drop > maxDrop) {
          maxDrop = drop;
          penyumbang = s.label;
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
  }, [trendData, seriesKeys]);

  // Proyeksi regresi linear (least-squares) atas total per tahun.
  // Memprediksi produksi tahun berikutnya + R^2 sebagai indikator keandalan.
  const projection = useMemo(() => {
    if (trendData.length < 3) return null;

    const pts = trendData.map((d) => ({
      x: parseInt(d.tahun),
      y: d.total as number,
    }));
    const n = pts.length;
    const sumX = pts.reduce((a, p) => a + p.x, 0);
    const sumY = pts.reduce((a, p) => a + p.y, 0);
    const sumXY = pts.reduce((a, p) => a + p.x * p.y, 0);
    const sumXX = pts.reduce((a, p) => a + p.x * p.x, 0);

    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // R^2
    const meanY = sumY / n;
    const ssTot = pts.reduce((a, p) => a + Math.pow(p.y - meanY, 2), 0);
    const ssRes = pts.reduce(
      (a, p) => a + Math.pow(p.y - (slope * p.x + intercept), 2),
      0,
    );
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

  // Data grafik tren + titik proyeksi (garis putus-putus terpisah).
  const trendWithProjection = useMemo(() => {
    const base = trendData.map((d) => ({
      ...d,
      proyeksi: undefined as number | undefined,
    }));
    if (projection && base.length > 0) {
      // Sambungkan garis proyeksi dari titik terakhir aktual
      base[base.length - 1].proyeksi = base[base.length - 1].total;
      base.push({
        tahun: projection.nextYear,
        total: undefined as any,
        proyeksi: projection.predicted,
      } as any);
    }
    return base;
  }, [trendData, projection]);

  const formatNum = (num: number) =>
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num);

  const formatPct = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(val);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8">
          
          
          <div className="relative z-10">
          
          <h2 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm">
            Analitik Perikanan
          </h2>
          <p className="font-mono text-sm md:text-base font-medium text-[#4a4a4a] mt-4 max-w-2xl border-l-4 border-emerald-500 pl-4 bg-white/80 py-1">
            Pemantauan Produksi Perikanan Budidaya, Tangkap, dan Pembenihan Ikan Kabupaten Banjarnegara.
          </p>
          </div>
        </section>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
          {/* Category Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">
              Kategori Perikanan
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setCategory("budidaya")}
                className={`py-2 px-3 border-2 border-[#141414] font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "budidaya"
                    ? "bg-[#141414] text-white shadow-none"
                    : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Fish size={14} />
                Budidaya
              </button>
              <button
                onClick={() => setCategory("tangkap")}
                className={`py-2 px-3 border-2 border-[#141414] font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "tangkap"
                    ? "bg-[#141414] text-white shadow-none"
                    : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Waves size={14} />
                Tangkap
              </button>
              <button
                onClick={() => setCategory("benih")}
                className={`py-2 px-3 border-2 border-[#141414] font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "benih"
                    ? "bg-[#141414] text-white shadow-none"
                    : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Egg size={14} />
                Benih
              </button>
            </div>
          </div>

          {/* Year Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">
              Tahun Data
            </label>
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

          {/* Kecamatan Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">
              Pilih Kecamatan
            </label>
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
              Memuat data perikanan...
            </p>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stat 1: Total Produksi */}
              <div className="bg-sky-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-neutral-500 uppercase">
                      Total Produksi
                    </h5>
                    <h3 className="text-3xl font-serif font-black uppercase text-[#141414] mt-1">
                      {formatNum(stats.total)}
                    </h3>
                  </div>
                  <div className="p-2 border-2 border-[#141414] bg-white">
                    {category === "budidaya" ? (
                      <Fish size={20} />
                    ) : category === "tangkap" ? (
                      <Waves size={20} />
                    ) : (
                      <Egg size={20} />
                    )}
                  </div>
                </div>
                <p className="text-xs font-mono text-neutral-500 mt-4 uppercase">
                  Total {unit} terdata di Banjarnegara ({selectedYear})
                </p>
              </div>

              {/* Stat 2: Top Kecamatan */}
              <div className="bg-emerald-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-neutral-500 uppercase">
                      Kecamatan Terproduktif
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
                  Produksi: {formatNum(stats.topVal)} {unit}
                </p>
              </div>

              {/* Stat 3: Komposisi Jenis */}
              <div className="bg-violet-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <h5 className="text-xs font-mono font-bold text-neutral-500 uppercase mb-3">
                  Komposisi Produksi
                </h5>
                <div className="flex flex-col gap-2">
                  {stats.breakdown.map((item, idx) => {
                    const pct =
                      stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                    return (
                      <div key={idx} className="flex flex-col gap-1">
                        <div className="flex justify-between text-[11px] font-mono font-bold uppercase">
                          <span>{item.name}</span>
                          <span>{formatNum(item.value)}</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-200 border border-[#141414]">
                          <div
                            className="h-full bg-[#141414]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tren Deret Waktu */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="mb-4 text-left border-b border-neutral-200 pb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                  Tren Produksi {trendData.length > 0 ? `${trendData[0].tahun}–${trendData[trendData.length - 1].tahun}` : ""} — {unit}
                  {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                </h4>
                {trendGrowth && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 border-2 border-[#141414] font-mono font-bold text-[10px] uppercase ${
                      trendGrowth.pct >= 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {trendGrowth.pct >= 0 ? "▲" : "▼"} {formatNum(Math.abs(trendGrowth.pct))}% ({trendGrowth.first.tahun}→{trendGrowth.last.tahun})
                  </span>
                )}
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendWithProjection}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#141414"
                      strokeOpacity={0.1}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="tahun"
                      tick={{
                        fill: "#141414",
                        fontSize: 11,
                        fontFamily: "monospace",
                        fontWeight: "bold",
                      }}
                      axisLine={{ stroke: "#141414", strokeWidth: 2 }}
                      tickLine={{ stroke: "#141414" }}
                    />
                    <YAxis
                      tick={{
                        fill: "#141414",
                        fontSize: 10,
                        fontFamily: "monospace",
                        fontWeight: "bold",
                      }}
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
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{
                        fontFamily: "monospace",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Total"
                      stroke="#141414"
                      strokeWidth={3}
                      dot={{ fill: "#141414", r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="proyeksi"
                      name="Proyeksi"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={{ fill: "#ef4444", r: 4 }}
                      connectNulls={true}
                    />
                    {seriesKeys.map((s, idx) => {
                      const colors = [
                        "#0ea5e9",
                        "#3b82f6",
                        "#8b5cf6",
                        "#10b981",
                        "#ef4444",
                        "#f472b6",
                      ];
                      return (
                        <Line
                          key={s.key}
                          type="monotone"
                          dataKey={s.label}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Proyeksi Tahun Depan (Regresi Linear) */}
            {projection && (
              <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                    <TrendingUp className="text-red-600" size={18} />
                    Proyeksi {projection.nextYear} — Regresi Linear
                    {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                  </h4>
                  <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-1">
                    Perkiraan berdasarkan tren garis lurus (least-squares) atas total produksi
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Perkiraan produksi */}
                  <div className="border-2 border-[#141414] bg-red-50 p-4 shadow-[2px_2px_0px_0px_#141414] flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">
                      Perkiraan {projection.nextYear} ({unit})
                    </span>
                    <span className="text-2xl font-serif font-black text-[#141414] mt-2">
                      {formatNum(projection.predicted)}
                    </span>
                  </div>
                  {/* Perubahan vs tahun terakhir */}
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
                  {/* Keandalan (R^2) */}
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
                <p className="text-[10px] font-mono text-neutral-500 uppercase mt-3">
                  {projection.r2 >= 0.7
                    ? "Tren cukup konsisten — proyeksi relatif dapat diandalkan."
                    : projection.r2 >= 0.4
                      ? "Tren agak fluktuatif — proyeksi perlu kehati-hatian."
                      : "Data sangat fluktuatif — proyeksi kurang dapat diandalkan."}
                </p>
              </div>
            )}

            {/* Deteksi Anomali */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="mb-4 text-left border-b border-neutral-200 pb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <AlertTriangle className="text-red-600" size={18} />
                  Deteksi Anomali Produksi
                </h4>
                <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">
                  Ambang penurunan tajam: {ANOMALY_THRESHOLD}% YoY
                </span>
              </div>
              {anomalies.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border-2 border-[#141414] text-[11px] font-mono font-bold text-emerald-800 uppercase">
                  <ShieldCheck size={14} />
                  Tidak ada penurunan tajam terdeteksi pada periode ini
                  {selectedKecamatan !== "Semua" ? ` (${selectedKecamatan})` : ""}.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {anomalies.map((a) => (
                    <div
                      key={a.tahun}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 bg-red-50 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-2 py-0.5 bg-red-600 text-white border-2 border-[#141414] font-mono font-black text-sm">
                          {a.tahun}
                        </span>
                        <div className="text-left">
                          <p className="text-[11px] font-mono font-bold uppercase text-red-800">
                            Turun {formatPct(Math.abs(a.pct))}% dari {a.prevTahun}
                          </p>
                          <p className="text-[10px] font-mono text-neutral-600 uppercase">
                            Penyumbang utama: {a.penyumbang} · {formatNum(Math.abs(a.selisih))} {unit}
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

            {/* CAGR per Komoditas */}
            {cagrData && (
              <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                    Laju Pertumbuhan Tahunan (CAGR) {cagrData.periode}
                    {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                  </h4>
                  <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-1">
                    Rata-rata pertumbuhan majemuk per tahun selama {cagrData.years} tahun
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Kartu Total */}
                  <div className="border-2 border-[#141414] bg-[#141414] text-white p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-300">
                      Total
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

            {/* Chart */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                  Produksi per Kecamatan ({selectedYear}) — dalam {unit}
                </h4>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 50 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#141414"
                      strokeOpacity={0.1}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: "#141414",
                        fontSize: 10,
                        fontFamily: "monospace",
                        fontWeight: "bold",
                      }}
                      axisLine={{ stroke: "#141414", strokeWidth: 2 }}
                      tickLine={{ stroke: "#141414" }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{
                        fill: "#141414",
                        fontSize: 10,
                        fontFamily: "monospace",
                        fontWeight: "bold",
                      }}
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
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{
                        fontFamily: "monospace",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    />
                    {stats.breakdown.map((item, idx) => {
                      const colors = [
                        "#0ea5e9",
                        "#3b82f6",
                        "#8b5cf6",
                        "#10b981",
                        "#ef4444",
                        "#f472b6",
                      ];
                      return (
                        <Bar
                          key={idx}
                          dataKey={item.name}
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
                  Tabel Rincian Produksi ({selectedYear}) — {unit}
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#141414] bg-neutral-100">
                      <th className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs">
                        No
                      </th>
                      <th className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs">
                        Kecamatan
                      </th>
                      {stats.breakdown.map((b, idx) => (
                        <th
                          key={idx}
                          className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs text-right"
                        >
                          {b.name}
                        </th>
                      ))}
                      <th className="p-3 font-bold uppercase text-xs text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row: any, idx: number) => (
                      <tr
                        key={`${row.name}-${idx}`}
                        className="border-b-2 border-neutral-200 hover:bg-neutral-50 transition-colors"
                      >
                        <td className="p-3 border-r-2 border-neutral-200 text-xs font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-3 border-r-2 border-neutral-200 font-bold uppercase">
                          {row.name}
                        </td>
                        {stats.breakdown.map((b, i) => (
                          <td
                            key={i}
                            className="p-3 border-r-2 border-neutral-200 text-right"
                          >
                            {formatNum(row[b.name])}
                          </td>
                        ))}
                        <td className="p-3 font-bold text-right bg-neutral-50">
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
