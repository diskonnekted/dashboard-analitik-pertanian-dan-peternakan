import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchJagungUbiKayu, fetchKacangKedelai, fetchUbiKacangHijau, FoodCropRow } from "@/services/api";
import { Wheat, Calendar, MapPin, TrendingUp, Filter, FileSpreadsheet } from "lucide-react";

type Category = "jagung-ubi" | "kacang-kedelai" | "ubi-kacanghijau";
type Metric = "luas" | "produksi" | "rata";

const CATEGORY_META: Record<Category, { label: string; sub: string }> = {
  "jagung-ubi": { label: "Jagung & Ubi Kayu", sub: "Luas panen, produksi, dan rata-rata produksi palawija" },
  "kacang-kedelai": { label: "Kacang Tanah & Kedelai", sub: "Luas panen, produksi, dan rata-rata produksi kacang-kacangan" },
  "ubi-kacanghijau": { label: "Ubi Jalar & Kacang Hijau", sub: "Luas panen, produksi, dan rata-rata produksi palawija" },
};

const METRIC_LABEL: Record<Metric, string> = {
  luas: "Luas Panen (Ha)",
  produksi: "Produksi (Ton)",
  rata: "Rata-rata Produksi (Ku/Ha)",
};

const COLORS = ["#059669", "#2563eb", "#d97706", "#db2777", "#7c3aed", "#ea580c"];

export default function FoodCropsPage() {
  const [jagungUbi, setJagungUbi] = useState<FoodCropRow[]>([]);
  const [kacangKedelai, setKacangKedelai] = useState<FoodCropRow[]>([]);
  const [ubiKacangHijau, setUbiKacangHijau] = useState<FoodCropRow[]>([]);

  const [category, setCategory] = useState<Category>("jagung-ubi");
  const [metric, setMetric] = useState<Metric>("produksi");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ju, kk, ukh] = await Promise.all([
          fetchJagungUbiKayu(),
          fetchKacangKedelai(),
          fetchUbiKacangHijau(),
        ]);
        setJagungUbi(ju);
        setKacangKedelai(kk);
        setUbiKacangHijau(ukh);
      } catch (err) {
        console.error("Gagal memuat data palawija:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeData = useMemo(() => {
    if (category === "jagung-ubi") return jagungUbi;
    if (category === "kacang-kedelai") return kacangKedelai;
    return ubiKacangHijau;
  }, [category, jagungUbi, kacangKedelai, ubiKacangHijau]);

  // Daftar komoditas unik dari dataset aktif (2 komoditas)
  const komoditasList = useMemo(() => {
    const names = new Set<string>();
    activeData.forEach((d) => d.items.forEach((it) => names.add(it.komoditas)));
    return Array.from(names);
  }, [activeData]);

  const yearsList = useMemo(() => {
    return Array.from(new Set(activeData.map((d) => d.tahun).filter(Boolean)))
      .sort((a, b) => b.localeCompare(a));
  }, [activeData]);

  useEffect(() => {
    if (yearsList.length > 0 && !yearsList.includes(selectedYear)) {
      setSelectedYear(yearsList[0]);
    }
  }, [yearsList, selectedYear]);

  const uniqueKecamatan = useMemo(() => {
    return ["Semua", ...Array.from(new Set(activeData.map((d) => d.kecamatan))).sort()];
  }, [activeData]);

  const currentYearData = useMemo(() => {
    return activeData.filter((d) => d.tahun === selectedYear);
  }, [activeData, selectedYear]);

  const filteredData = useMemo(() => {
    return selectedKecamatan === "Semua"
      ? currentYearData
      : currentYearData.filter((d) => d.kecamatan === selectedKecamatan);
  }, [currentYearData, selectedKecamatan]);

  const getVal = (row: FoodCropRow, komoditas: string): number => {
    const it = row.items.find((i) => i.komoditas === komoditas);
    if (!it) return 0;
    if (metric === "luas") return it.luasPanen;
    if (metric === "produksi") return it.produksi;
    return it.rataRata;
  };

  const stats = useMemo(() => {
    let total = 0;
    let maxVal = -1;
    let topDistrict = "-";
    const breakdown = komoditasList.map((k) => ({ name: k, value: 0, luas: 0, produksi: 0 }));

    filteredData.forEach((d) => {
      let rowSum = 0;
      komoditasList.forEach((k, idx) => {
        const it = d.items.find((i) => i.komoditas === k);
        const luas = it?.luasPanen || 0;
        const prod = it?.produksi || 0;
        const val = getVal(d, k);
        breakdown[idx].luas += luas;
        breakdown[idx].produksi += prod;
        breakdown[idx].value += val;
        rowSum += val;
        total += val;
      });
      if (rowSum > maxVal) {
        maxVal = rowSum;
        topDistrict = d.kecamatan;
      }
    });

    return { total, topDistrict, topVal: maxVal, breakdown };
  }, [filteredData, komoditasList, metric]);

  // Data grafik per kecamatan
  const chartData = useMemo(() => {
    return filteredData
      .map((d) => {
        const obj: any = { name: d.kecamatan };
        let sum = 0;
        komoditasList.forEach((k) => {
          const v = getVal(d, k);
          obj[k] = v;
          sum += v;
        });
        obj.total = sum;
        return obj;
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredData, komoditasList, metric]);

  // Tren historis per tahun
  const trendData = useMemo(() => {
    const base = selectedKecamatan === "Semua"
      ? activeData
      : activeData.filter((d) => d.kecamatan === selectedKecamatan);

    const byYear = new Map<string, any>();
    base.forEach((d) => {
      const yr = d.tahun;
      if (!yr) return;
      if (!byYear.has(yr)) {
        const obj: any = { tahun: yr, total: 0 };
        komoditasList.forEach((k) => (obj[k] = 0));
        byYear.set(yr, obj);
      }
      const entry = byYear.get(yr);
      komoditasList.forEach((k) => {
        const v = getVal(d, k);
        entry[k] += v;
        entry.total += v;
      });
    });

    return Array.from(byYear.values()).sort((a, b) => a.tahun.localeCompare(b.tahun));
  }, [activeData, selectedKecamatan, komoditasList, metric]);

  // CAGR Laju Pertumbuhan Tahunan per komoditas
  const cagrData = useMemo(() => {
    if (trendData.length < 2) return null;
    const last = trendData[trendData.length - 1];
    const lastYear = parseInt(last.tahun);

    const firstWithData = trendData.find((d) => (d.total || 0) > 0);
    if (!firstWithData) return null;
    const totalYears = lastYear - parseInt(firstWithData.tahun);
    if (!totalYears || totalYears <= 0) return null;

    const calc = (awal: number, akhir: number, years: number): number | null => {
      if (!awal || awal <= 0 || akhir < 0 || years <= 0) return null;
      return (Math.pow(akhir / awal, 1 / years) - 1) * 100;
    };

    const items = komoditasList.map((k) => {
      const firstNonZero = trendData.find((d) => (d[k] || 0) > 0);
      if (!firstNonZero) return { name: k, cagr: null as number | null };
      const yrs = lastYear - parseInt(firstNonZero.tahun);
      return { name: k, cagr: calc(firstNonZero[k] || 0, last[k] || 0, yrs) };
    });

    return {
      periode: `${firstWithData.tahun}–${last.tahun}`,
      years: totalYears,
      total: calc(firstWithData.total || 0, last.total || 0, totalYears),
      items,
    };
  }, [trendData, komoditasList]);

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

  // Ranking kecamatan kumulatif seluruh tahun
  const kecamatanRanking = useMemo(() => {
    const base = selectedKecamatan === "Semua"
      ? activeData
      : activeData.filter((d) => d.kecamatan === selectedKecamatan);

    const map = new Map<string, number>();
    base.forEach((d) => {
      let sum = 0;
      komoditasList.forEach((k) => (sum += getVal(d, k)));
      map.set(d.kecamatan, (map.get(d.kecamatan) || 0) + sum);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [activeData, selectedKecamatan, komoditasList, metric]);

  const formatNum = (num: number) =>
    new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: metric === "rata" ? 2 : 0,
    }).format(num);

  const formatPct = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(val);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero */}
        <section className="relative text-left py-6 md:py-8 border-b border-slate-200 bg-white">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-400 rounded-b" />
          <div className="flex items-start gap-4 mb-2">
            <div className="p-3 rounded-xl bg-emerald-500 border-2 border-emerald-600 mt-0.5 shadow-lg shadow-emerald-500/30">
              <Wheat className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl leading-tight font-black tracking-tight text-slate-900">
                Palawija
              </h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Analisis komprehensif Jagung, Ubi Kayu, Kacang Tanah, Kedelai, Ubi Jalar & Kacang Hijau
              </p>
            </div>
          </div>
        </section>

        {/* Filter Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-emerald-600 p-5 rounded-2xl shadow-lg shadow-emerald-600/20 text-white flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-black uppercase tracking-wider opacity-80">Jenis Komoditas</label>
              <Wheat size={14} />
            </div>
            <div className="flex flex-col gap-2">
              {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`py-2 px-3 rounded-xl font-mono font-black text-xs uppercase transition-all flex items-center justify-start gap-2 ${
                    category === c
                      ? "bg-white text-emerald-700 shadow-md"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  <Wheat size={12} />
                  {CATEGORY_META[c].label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-500 p-5 rounded-2xl shadow-lg shadow-amber-500/20 text-white flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-black uppercase tracking-wider opacity-80">Metrik</label>
              <TrendingUp size={14} />
            </div>
            <div className="flex items-center gap-2">
              {(["luas", "produksi", "rata"] as Metric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`flex-1 py-2 rounded-xl font-mono font-black text-[10px] uppercase transition-all ${
                    metric === m
                      ? "bg-white text-amber-600 shadow-md"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {m === "luas" ? "Luas" : m === "produksi" ? "Produksi" : "Rata"}
                </button>
              ))}
            </div>
            <span className="text-xs font-mono text-amber-100 uppercase text-center">{METRIC_LABEL[metric]}</span>
          </div>

          <div className="bg-sky-500 p-5 rounded-2xl shadow-lg shadow-sky-500/20 text-white flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-black uppercase tracking-wider opacity-80">Tahun</label>
              <Calendar size={14} />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-sky-200 pointer-events-none" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 font-mono text-sm font-black bg-white text-sky-700 focus:outline-none appearance-none cursor-pointer rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                {yearsList.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-violet-500 p-5 rounded-2xl shadow-lg shadow-violet-500/20 text-white flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-black uppercase tracking-wider opacity-80">Kecamatan</label>
              <MapPin size={14} />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-violet-200 pointer-events-none" />
              <select
                value={selectedKecamatan}
                onChange={(e) => setSelectedKecamatan(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 font-mono text-sm font-black bg-white text-violet-700 focus:outline-none appearance-none cursor-pointer rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                {uniqueKecamatan.map((kec) => (
                  <option key={kec} value={kec}>{kec}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[320px] gap-4">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Memuat data palawija…</p>
          </div>
        ) : (
          <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg shadow-emerald-500/30 rounded-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div>
              <h5 className="text-xs font-mono font-black uppercase tracking-widest text-emerald-100 mb-2">Total {METRIC_LABEL[metric]}</h5>
              <h3 className="text-4xl font-serif font-black leading-none">{formatNum(stats.total)}</h3>
            </div>
            <div className="mt-6 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/40 backdrop-blur-sm border border-emerald-400/50 text-xs font-mono font-bold uppercase">
                {CATEGORY_META[category].label}
              </span>
              <span className="text-xs font-mono text-emerald-100">{selectedYear}</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white shadow-lg shadow-amber-500/30 rounded-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div>
              <h5 className="text-xs font-mono font-black uppercase tracking-widest text-amber-100 mb-2">Kecamatan Tertinggi</h5>
              <h3 className="text-2xl font-serif font-black leading-tight break-words">{stats.topDistrict}</h3>
            </div>
            <p className="mt-6 text-xs font-mono text-amber-100 font-bold uppercase">
              {formatNum(stats.topVal)} {metric === "luas" ? "Ha" : metric === "produksi" ? "Ton" : "Ku/Ha"}
            </p>
          </div>

          <div className="bg-white border-2 border-violet-500 p-6 shadow-xl shadow-violet-500/20 rounded-2xl flex flex-col justify-between">
            <h5 className="text-xs font-mono font-black uppercase tracking-widest text-violet-700 mb-4">Komposisi</h5>
            <div className="flex flex-col gap-3">
              {stats.breakdown.map((item, idx) => {
                const pct = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono font-black uppercase text-slate-600 min-w-[80px]">{item.name}</span>
                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden relative">
                      <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, backgroundColor: COLORS[idx % COLORS.length] }} />
                    </div>
                    <span className="text-xs font-mono font-black text-slate-800 w-16 text-right">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-white border-2 border-slate-200 p-6 shadow-xl shadow-slate-200/50 rounded-2xl">
          <div className="flex flex-col mb-6 border-b-2 border-slate-100 pb-3 text-left">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                <FileSpreadsheet size={20} />
              </div>
              <h4 className="text-xl font-mono font-black uppercase text-slate-800">
                Sebaran {METRIC_LABEL[metric]} per Kecamatan
              </h4>
            </div>
            <p className="text-xs font-mono text-slate-500 uppercase">Kontribusi masing-masing kecamatan • {selectedYear}</p>
          </div>
          <div className="h-[440px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 90 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#cbd5e1" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "black" }} interval={0} angle={-45} textAnchor="end" height={70} />
                    <YAxis width={70} tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "black" }} tickFormatter={(v) => formatNum(v)} />
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "2px solid #e2e8f0", borderRadius: 12, fontFamily: "monospace", fontSize: 12, fontWeight: "black", boxShadow: "0 6px 16px rgba(0,0,0,0.08)" }} formatter={(value: any) => [formatNum(Number(value)), ""]} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontSize: 10, fontWeight: "black" }} />
                    {komoditasList.map((k, idx) => (
                      <Bar key={k} dataKey={k} stackId="a" fill={COLORS[idx % COLORS.length]} stroke="#64748b" strokeWidth={0.5} radius={[0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

        {/* Trend */}
        <div className="bg-white border-2 border-emerald-200 p-6 shadow-xl shadow-emerald-100 rounded-2xl">
          <div className="flex flex-col mb-6 border-b-2 border-emerald-100 pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                  <TrendingUp size={20} />
                </div>
                <h4 className="text-xl font-mono font-black uppercase text-slate-800">
                  Tren {METRIC_LABEL[metric]} {CATEGORY_META[category].label}
                </h4>
              </div>
              {cagrData && (
                <span className="px-3 py-1.5 rounded-full bg-emerald-600 text-white font-mono font-black text-xs uppercase shadow-lg shadow-emerald-600/40">
                  CAGR: {cagrData.total === null ? "N/A" : `${cagrData.total >= 0 ? "+" : ""}${formatPct(cagrData.total)}%`}
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-slate-500 uppercase">{selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : " · Seluruh Banjarnegara"}</p>
          </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendWithProjection} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} vertical={false} />
                    <XAxis dataKey="tahun" tick={{ fill: "#475569", fontSize: 11, fontFamily: "monospace", fontWeight: "bold" }} />
                    <YAxis tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }} tickFormatter={(v) => formatNum(v)} />
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, fontFamily: "monospace", fontSize: 12, fontWeight: "bold" }} formatter={(value: any) => [formatNum(Number(value)), ""]} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontSize: 10, fontWeight: "bold" }} />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#64748b" strokeWidth={3} dot={{ fill: "#475569", r: 4 }} activeDot={{ r: 6 }} connectNulls={false} />
                    <Line type="monotone" dataKey="proyeksi" name="Proyeksi" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4" dot={{ fill: "#ef4444", r: 4 }} connectNulls={true} />
                    {komoditasList.map((k, idx) => (
                      <Line key={k} type="monotone" dataKey={k} stroke={COLORS[idx % COLORS.length]} strokeWidth={1.5} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

        {/* Regression Projections */}
            {projection && (
              <div className="bg-white border border-slate-200 p-6 shadow-sm rounded-2xl">
                <div className="mb-4 text-left border-b border-slate-100 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide text-slate-800">
                    <TrendingUp className="text-emerald-600" size={18} />
                    Proyeksi Garis Tren Palawija ({projection.nextYear})
                  </h4>
                  <p className="text-[10px] font-mono font-bold text-slate-400 uppercase mt-1">
                    Estimasi model regresi linier (least-squares) berdasarkan tren historis
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-sm flex flex-col justify-between rounded-xl">
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-700">
                      Prediksi {projection.nextYear} ({metric === "luas" ? "Ha" : metric === "produksi" ? "Ton" : "Ku/Ha"})
                    </span>
                    <span className="text-2xl font-serif font-black text-emerald-900 mt-2">
                      {formatNum(projection.predicted)}
                    </span>
                  </div>
                  <div className="border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between rounded-xl">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
                      Perubahan vs {projection.lastTahun}
                    </span>
                    <span className={`text-2xl font-serif font-black mt-2 ${projection.deltaPct === null ? "text-slate-400" : projection.deltaPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {projection.deltaPct === null ? "N/A" : `${projection.deltaPct >= 0 ? "▲" : "▼"} ${formatPct(Math.abs(projection.deltaPct))}%`}
                    </span>
                  </div>
                  <div className="border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between rounded-xl">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
                      Keandalan Model (R²)
                    </span>
                    <span className={`text-2xl font-serif font-black mt-2 ${projection.r2 >= 0.7 ? "text-emerald-600" : projection.r2 >= 0.4 ? "text-amber-600" : "text-red-600"}`}>
                      {formatPct(projection.r2 * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

        {/* CAGR Breakdown */}
            {cagrData && (
              <div className="bg-white border-2 border-violet-200 p-6 shadow-xl shadow-violet-100 rounded-2xl">
                <div className="flex items-center gap-3 mb-6 border-b-2 border-violet-100 pb-3">
                  <div className="p-2 rounded-lg bg-violet-500 text-white shadow-lg shadow-violet-500/30">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <h4 className="text-lg font-mono font-black uppercase text-slate-800">CAGR Per Komoditas</h4>
                    <p className="text-xs font-mono text-violet-500 uppercase">{cagrData.periode}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="border-2 border-slate-900 bg-slate-900 text-white p-4 flex flex-col justify-between rounded-xl shadow-lg">
                    <span className="text-[10px] font-mono font-black uppercase text-slate-400">Total Gabungan</span>
                    <span className="text-3xl font-serif font-black mt-2">
                      {cagrData.total === null ? "N/A" : `${cagrData.total >= 0 ? "+" : ""}${formatPct(cagrData.total)}%`}
                    </span>
                  </div>
                  {cagrData.items.map((item) => (
                    <div key={item.name} className="border-2 border-slate-200 bg-white p-4 flex flex-col justify-between shadow-lg rounded-xl">
                      <span className="text-[10px] font-mono font-black uppercase text-slate-500 leading-tight">{item.name}</span>
                      <span className={`text-2xl font-serif font-black mt-2 ${item.cagr === null ? "text-slate-400" : item.cagr >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {item.cagr === null ? "N/A" : <>{item.cagr >= 0 ? "▲" : "▼"} {formatPct(Math.abs(item.cagr))}%</>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ranking Kecamatan */}
            <div className="bg-white border-2 border-amber-200 p-6 shadow-xl shadow-amber-100 rounded-2xl">
              <div className="flex items-center justify-between mb-6 border-b-2 border-amber-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <h4 className="text-lg font-mono font-black uppercase text-slate-800">Ranking Kecamatan</h4>
                    <p className="text-xs font-mono text-amber-500 uppercase">
                      Kumulatif {yearsList[yearsList.length - 1]}–{yearsList[0]}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-amber-500 uppercase">
                  {METRIC_LABEL[metric]} seluruh tahun
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-left">
                {kecamatanRanking.slice(0, 10).map((item, idx) => {
                  const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
                  const colors = idx === 0 ? "border-amber-500 bg-gradient-to-br from-orange-100 to-yellow-100" : "border-slate-200 bg-white";
                  const iconBg = idx < 3 ? "bg-orange-500" : "bg-slate-100";
                  return (
                    <div key={item.name} className={`border-2 p-4 flex flex-col gap-2 shadow-lg rounded-xl transition-all hover:shadow-xl ${colors}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center justify-center w-6 h-6 text-[10px] font-black font-mono ${iconBg} ${idx < 3 ? "text-white" : "text-slate-500"}`}>
                          {medal || (idx + 1)}
                        </span>
                        <span className="text-xs font-mono font-black uppercase text-slate-700 truncate">{item.name}</span>
                      </div>
                      <span className="text-2xl font-serif font-black text-slate-800 leading-tight">{formatNum(item.value)}</span>
                      <span className="text-[9px] font-mono text-slate-400 uppercase">{metric === "luas" ? "Ha" : metric === "produksi" ? "Ton" : "Ku/Ha"}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border-2 border-slate-200 p-6 shadow-xl shadow-slate-200/50 rounded-2xl">
              <div className="flex items-center justify-between mb-6 border-b-2 border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-white shadow-lg shadow-slate-800/30">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <h4 className="text-lg font-mono font-black uppercase text-slate-800">Tabel Rincian Data</h4>
                    <p className="text-xs font-mono text-slate-500 uppercase">
                      Perkecamatan • {selectedYear} • {METRIC_LABEL[metric]}
                    </p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left font-mono text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="p-4 border-r border-slate-600 font-black uppercase text-[10px] whitespace-nowrap w-12">#</th>
                  <th className="p-4 border-r border-slate-600 font-black uppercase text-[10px]">Kecamatan</th>
                  {komoditasList.map((k) => (
                    <th key={k} className="p-4 border-r border-slate-600 font-black uppercase text-[10px] text-right whitespace-nowrap">{k}</th>
                  ))}
                  <th className="p-4 font-black uppercase text-[10px] text-right bg-slate-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, idx) => (
                  <tr key={row.name} className={`border-b border-slate-200 hover:bg-emerald-50/50 transition-colors ${idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}`}>
                    <td className="p-4 border-r border-slate-100 text-xs font-black text-slate-400">{idx + 1}</td>
                    <td className="p-4 border-r border-slate-100 text-xs font-black uppercase text-slate-700">{row.name}</td>
                    {komoditasList.map((k) => (
                      <td key={k} className="p-4 border-r border-slate-100 text-xs text-right text-slate-600">{formatNum(row[k] || 0)}</td>
                    ))}
                    <td className="p-4 text-xs font-black text-right bg-slate-800 text-white rounded-br-xl">{formatNum(row.total)}</td>
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
