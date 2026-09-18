import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchPemasukanTernak, fetchPengeluaranTernak, fetchLuarRPH, fetchDagingUnggas, TernakFlow } from "@/services/api";
import { Beef, Calendar, MapPin, TrendingUp, Filter, FileSpreadsheet, ArrowDownToLine, ArrowUpFromLine, Slice, Drumstick } from "lucide-react";

type Category = "pemasukan" | "pengeluaran" | "luar-rph" | "daging-unggas";

const CATEGORY_META: Record<Category, { label: string; sub: string; unit: string; icon: any }> = {
  "pemasukan": { label: "Pemasukan Ternak", sub: "Ternak yang masuk ke Kabupaten Banjarnegara", unit: "ekor", icon: ArrowDownToLine },
  "pengeluaran": { label: "Pengeluaran Ternak Potong", sub: "Ternak potong yang keluar dari Kabupaten", unit: "ekor", icon: ArrowUpFromLine },
  "luar-rph": { label: "Pemotongan di Luar RPH", sub: "Perkiraan ternak yang dipotong di luar RPH", unit: "ekor", icon: Slice },
  "daging-unggas": { label: "Produksi Daging Unggas", sub: "Produksi daging unggas per kecamatan", unit: "kg", icon: Drumstick },
};

const COLORS = ["#059669", "#2563eb", "#d97706", "#db2777", "#7c3aed", "#ea580c"];

export default function LivestockFlowPage() {
  const [pemasukan, setPemasukan] = useState<TernakFlow[]>([]);
  const [pengeluaran, setPengeluaran] = useState<TernakFlow[]>([]);
  const [luarRph, setLuarRph] = useState<TernakFlow[]>([]);
  const [dagingUnggas, setDagingUnggas] = useState<TernakFlow[]>([]);

  const [category, setCategory] = useState<Category>("pemasukan");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pm, pg, lr, du] = await Promise.all([
          fetchPemasukanTernak(),
          fetchPengeluaranTernak(),
          fetchLuarRPH(),
          fetchDagingUnggas(),
        ]);
        setPemasukan(pm);
        setPengeluaran(pg);
        setLuarRph(lr);
        setDagingUnggas(du);
      } catch (err) {
        console.error("Gagal memuat data lalu lintas ternak:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeData = useMemo(() => {
    if (category === "pemasukan") return pemasukan;
    if (category === "pengeluaran") return pengeluaran;
    if (category === "luar-rph") return luarRph;
    return dagingUnggas;
  }, [category, pemasukan, pengeluaran, luarRph, dagingUnggas]);

  const jenisList = useMemo(() => {
    const names = new Set<string>();
    activeData.forEach((d) => d.items.forEach((it) => names.add(it.jenis)));
    return Array.from(names);
  }, [activeData]);

  const unit = CATEGORY_META[category].unit;

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

  const stats = useMemo(() => {
    let total = 0;
    let maxVal = -1;
    let topDistrict = "-";
    const breakdown = jenisList.map((j) => ({ name: j, value: 0 }));

    filteredData.forEach((d) => {
      let rowSum = 0;
      jenisList.forEach((j, idx) => {
        const it = d.items.find((i) => i.jenis === j);
        const v = it?.jumlah || 0;
        breakdown[idx].value += v;
        rowSum += v;
        total += v;
      });
      if (rowSum > maxVal) {
        maxVal = rowSum;
        topDistrict = d.kecamatan;
      }
    });

    return { total, topDistrict, topVal: maxVal, breakdown };
  }, [filteredData, jenisList]);

  const chartData = useMemo(() => {
    return filteredData
      .map((d) => {
        const obj: any = { name: d.kecamatan };
        let sum = 0;
        jenisList.forEach((j) => {
          const it = d.items.find((i) => i.jenis === j);
          const v = it?.jumlah || 0;
          obj[j] = v;
          sum += v;
        });
        obj.total = sum;
        return obj;
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredData, jenisList]);

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
        jenisList.forEach((j) => (obj[j] = 0));
        byYear.set(yr, obj);
      }
      const entry = byYear.get(yr);
      jenisList.forEach((j) => {
        const it = d.items.find((i) => i.jenis === j);
        const v = it?.jumlah || 0;
        entry[j] += v;
        entry.total += v;
      });
    });

    return Array.from(byYear.values()).sort((a, b) => a.tahun.localeCompare(b.tahun));
  }, [activeData, selectedKecamatan, jenisList]);

  // CAGR Laju Pertumbuhan Tahunan per jenis ternak
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

    const items = jenisList.map((j) => {
      const firstNonZero = trendData.find((d) => (d[j] || 0) > 0);
      if (!firstNonZero) return { name: j, cagr: null as number | null };
      const yrs = lastYear - parseInt(firstNonZero.tahun);
      return { name: j, cagr: calc(firstNonZero[j] || 0, last[j] || 0, yrs) };
    });

    return {
      periode: `${firstWithData.tahun}–${last.tahun}`,
      years: totalYears,
      total: calc(firstWithData.total || 0, last.total || 0, totalYears),
      items,
    };
  }, [trendData, jenisList]);

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
      jenisList.forEach((j) => {
        const it = d.items.find((i) => i.jenis === j);
        sum += it?.jumlah || 0;
      });
      map.set(d.kecamatan, (map.get(d.kecamatan) || 0) + sum);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [activeData, selectedKecamatan, jenisList]);

  const formatNum = (num: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num);

  const formatPct = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(val);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-4">
        {/* Hero */}
        <section className="relative text-left py-8 border-b-4 border-amber-600 bg-white shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 rounded-b" />
          <div className="flex items-start gap-5 mb-3">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 border-4 border-amber-400 mt-1 shadow-xl shadow-amber-500/30">
              <Beef className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl leading-tight font-black tracking-tight text-slate-900">
                Ternak & Daging
              </h2>
              <p className="text-base text-slate-600 mt-1.5 font-medium">
                Pemasukan, pengeluaran, luar RPH, dan produksi daging unggas per kecamatan
              </p>
            </div>
          </div>
        </section>

        {/* Filter Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 rounded-3xl shadow-xl shadow-amber-600/20 text-white flex flex-col gap-4 border-2 border-amber-400">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-black uppercase tracking-widest opacity-90">Jenis Data</label>
              <Beef size={16} />
            </div>
            <div className="flex flex-col gap-3">
              {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
                const CIcon = CATEGORY_META[c].icon;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`py-2.5 px-4 rounded-xl font-mono font-black text-xs uppercase flex items-center justify-start gap-3 transition-all ${
                      category === c
                        ? "bg-white text-amber-700 shadow-lg shadow-amber-500/40 transform scale-105"
                        : "bg-white/15 hover:bg-white/25 text-white"
                    }`}
                  >
                    <CIcon size={14} />
                    {CATEGORY_META[c].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-3xl shadow-xl shadow-orange-600/20 text-white flex flex-col gap-4 border-2 border-orange-400">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-black uppercase tracking-widest opacity-90">Satuan</label>
              <Beef size={16} />
            </div>
            <div className="py-2.5 px-4 rounded-xl font-mono font-black text-sm uppercase flex items-center gap-3 bg-white/15">
              <Beef size={14} />
              {unit}
            </div>
            <span className="text-xs font-mono text-orange-100 uppercase text-center">{CATEGORY_META[category].sub}</span>
          </div>

          <div className="bg-gradient-to-br from-sky-500 to-blue-500 p-6 rounded-3xl shadow-xl shadow-sky-600/20 text-white flex flex-col gap-4 border-2 border-sky-400">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-black uppercase tracking-widest opacity-90">Tahun Data</label>
              <Calendar size={16} />
            </div>
            <div className="relative">
              <Calendar className="absolute left-4 top-3 h-5 w-5 text-sky-200 pointer-events-none" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full pl-10 pr-5 py-3 font-mono text-sm font-black bg-white text-sky-700 focus:outline-none appearance-none cursor-pointer rounded-xl shadow-lg shadow-sky-500/30 hover:shadow-xl transition-all"
              >
                {yearsList.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-500 to-purple-500 p-6 rounded-3xl shadow-xl shadow-violet-600/20 text-white flex flex-col gap-4 border-2 border-violet-400">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-black uppercase tracking-widest opacity-90">Kecamatan</label>
              <MapPin size={16} />
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-3 h-5 w-5 text-violet-200 pointer-events-none" />
              <select
                value={selectedKecamatan}
                onChange={(e) => setSelectedKecamatan(e.target.value)}
                className="w-full pl-10 pr-5 py-3 font-mono text-sm font-black bg-white text-violet-700 focus:outline-none appearance-none cursor-pointer rounded-xl shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all"
              >
                {uniqueKecamatan.map((kec) => (
                  <option key={kec} value={kec}>{kec}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[400px] gap-6">
            <div className="w-14 h-14 border-6 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
            <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">Memuat data ternak…</p>
          </div>
        ) : (
          <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-amber-500 via-orange-400 to-orange-500 p-8 text-white shadow-2xl shadow-amber-500/40 rounded-3xl flex flex-col justify-between relative overflow-hidden border-4 border-amber-300">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
            <div>
              <h5 className="text-xs font-mono font-black uppercase tracking-widest text-amber-100 mb-3">Total {CATEGORY_META[category].label}</h5>
              <h3 className="text-5xl font-serif font-black leading-none drop-shadow-md">{formatNum(stats.total)}</h3>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <span className="px-4 py-2 rounded-full bg-amber-500/50 backdrop-blur-md border-2 border-amber-300/50 text-xs font-mono font-bold uppercase shadow-lg">
                {CATEGORY_META[category].label}
              </span>
              <span className="text-sm font-mono text-amber-100 font-bold">{selectedYear}</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-rose-500 via-pink-400 to-pink-500 p-8 text-white shadow-2xl shadow-rose-500/40 rounded-3xl flex flex-col justify-between relative overflow-hidden border-4 border-rose-300">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
            <div>
              <h5 className="text-xs font-mono font-black uppercase tracking-widest text-rose-100 mb-3">Kecamatan Tertinggi</h5>
              <h3 className="text-3xl font-serif font-black leading-tight break-words drop-shadow-md">{stats.topDistrict}</h3>
            </div>
            <p className="mt-8 text-sm font-mono text-rose-100 font-bold uppercase">
              {formatNum(stats.topVal)} {unit}
            </p>
          </div>

          <div className="bg-white border-4 border-purple-400 p-8 shadow-2xl shadow-purple-500/20 rounded-3xl flex flex-col justify-between">
            <h5 className="text-xs font-mono font-black uppercase tracking-widest text-purple-700 mb-6">Komposisi</h5>
            <div className="flex flex-col gap-4">
              {stats.breakdown.map((item, idx) => {
                const pct = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between gap-4">
                    <span className="text-xs font-mono font-black uppercase text-slate-600 min-w-[90px]">{item.name}</span>
                    <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden relative shadow-inner">
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
            <div className="bg-white border-4 border-amber-200 p-8 shadow-2xl shadow-amber-100 rounded-3xl">
              <div className="flex flex-col mb-8 border-b-4 border-amber-100 pb-4 text-left">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl shadow-amber-500/30">
                    <FileSpreadsheet size={24} />
                  </div>
                  <h4 className="text-2xl font-mono font-black uppercase text-slate-800">
                    Sebaran {CATEGORY_META[category].label} per Kecamatan
                  </h4>
                </div>
                <p className="text-sm font-mono text-amber-600 uppercase font-bold">Kontribusi masing-masing kecamatan • {selectedYear}</p>
              </div>
              <div className="h-[480px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 90 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#fde68a" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#78350f", fontSize: 11, fontFamily: "monospace", fontWeight: "black" }} interval={0} angle={-45} textAnchor="end" height={80} />
                    <YAxis width={70} tick={{ fill: "#78350f", fontSize: 11, fontFamily: "monospace", fontWeight: "black" }} tickFormatter={(v) => formatNum(v)} />
                    <Tooltip contentStyle={{ backgroundColor: "#fffbeb", border: "2px solid #fde68a", borderRadius: 16, fontFamily: "monospace", fontSize: 12, fontWeight: "black", boxShadow: "0 10px 24px rgba(245,158,11,0.2)" }} formatter={(value: any) => [formatNum(Number(value)), ""]} />
                    <Legend verticalAlign="top" height={40} wrapperStyle={{ fontFamily: "monospace", fontSize: 11, fontWeight: "black" }} />
                    {jenisList.map((j, idx) => (
                      <Bar key={j} dataKey={j} stackId="a" fill={COLORS[idx % COLORS.length]} stroke="#b45309" strokeWidth={1} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trend */}
            <div className="bg-white border-4 border-amber-200 p-8 shadow-2xl shadow-amber-100 rounded-3xl">
              <div className="flex flex-col mb-8 border-b-4 border-amber-100 pb-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl shadow-amber-500/30">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-mono font-black uppercase text-slate-800">
                        Tren {CATEGORY_META[category].label}
                      </h4>
                      <p className="text-xs font-mono text-slate-500 uppercase font-bold">{selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : " · Seluruh Banjarnegara"}</p>
                    </div>
                  </div>
                  {cagrData && (
                    <span className="px-4 py-2 rounded-full bg-amber-600 text-white font-mono font-black text-sm uppercase shadow-xl shadow-amber-600/40 border-2 border-amber-400">
                      CAGR: {cagrData.total === null ? "N/A" : `${cagrData.total >= 0 ? "+" : ""}${formatPct(cagrData.total)}%`}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendWithProjection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#fde68a" vertical={false} />
                    <XAxis dataKey="tahun" tick={{ fill: "#78350f", fontSize: 10, fontFamily: "monospace", fontWeight: "black" }} />
                    <YAxis tick={{ fill: "#78350f", fontSize: 10, fontFamily: "monospace", fontWeight: "black" }} tickFormatter={(v) => formatNum(v)} />
                    <Tooltip contentStyle={{ backgroundColor: "#fffbeb", border: "2px solid #fde68a", borderRadius: 12, fontFamily: "monospace", fontSize: 12, fontWeight: "black", boxShadow: "0 6px 16px rgba(245,158,11,0.15)" }} formatter={(value: any) => [formatNum(Number(value)), ""]} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontSize: 10, fontWeight: "black" }} />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#d97706" strokeWidth={3} dot={{ fill: '#d97706', r: 4 }} activeDot={{ r: 6 }} connectNulls={false} />
                    <Line type="monotone" dataKey="proyeksi" name="Proyeksi" stroke="#dc2626" strokeWidth={2} strokeDasharray="8 4" dot={{ fill: '#dc2626', r: 4 }} connectNulls={true} />
                    {jenisList.map((j, idx) => (
                      <Line key={j} type="monotone" dataKey={j} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Regression Projections */}
            {projection && (
              <div className="bg-white border-4 border-orange-200 p-8 shadow-2xl shadow-orange-100 rounded-3xl">
                <div className="flex items-center gap-4 mb-6 border-b-4 border-orange-100 pb-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/30">
                    <TrendingUp size={22} />
                  </div>
                  <div>
                    <h4 className="text-xl font-mono font-black uppercase text-slate-800">Proyeksi Garis Tren</h4>
                    <p className="text-xs font-mono text-orange-600 uppercase font-bold">Ternak • {projection.nextYear}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                  <div className="border-4 border-orange-500 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-6 shadow-lg flex flex-col justify-between rounded-2xl">
                    <span className="text-xs font-mono font-black uppercase text-orange-700 tracking-wider">
                      Prediksi {projection.nextYear} ({unit})
                    </span>
                    <span className="text-3xl font-serif font-black text-slate-800 mt-3">
                      {formatNum(projection.predicted)}
                    </span>
                  </div>
                  <div className="border-4 border-slate-200 bg-white p-6 shadow-lg flex flex-col justify-between rounded-2xl">
                    <span className="text-xs font-mono font-black uppercase text-slate-500">
                      Perubahan vs {projection.lastTahun}
                    </span>
                    <span className={`text-3xl font-serif font-black mt-3 ${projection.deltaPct === null ? "text-slate-400" : projection.deltaPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {projection.deltaPct === null ? "N/A" : `${projection.deltaPct >= 0 ? "▲" : "▼"} ${formatPct(Math.abs(projection.deltaPct))}%`}
                    </span>
                  </div>
                  <div className="border-4 border-slate-200 bg-white p-6 shadow-lg flex flex-col justify-between rounded-2xl">
                    <span className="text-xs font-mono font-black uppercase text-slate-500">
                      Keandalan Model (R²)
                    </span>
                    <span className={`text-3xl font-serif font-black mt-3 ${projection.r2 >= 0.7 ? "text-emerald-600" : projection.r2 >= 0.4 ? "text-amber-600" : "text-red-600"}`}>
                      {formatPct(projection.r2 * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CAGR Breakdown */}
            {cagrData && (
              <div className="bg-white border-4 border-purple-200 p-8 shadow-2xl shadow-purple-100 rounded-3xl">
                <div className="flex items-center gap-4 mb-6 border-b-4 border-purple-100 pb-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl shadow-purple-500/30">
                    <FileSpreadsheet size={22} />
                  </div>
                  <div>
                    <h4 className="text-xl font-mono font-black uppercase text-slate-800">CAGR Per Jenis</h4>
                    <p className="text-xs font-mono text-purple-600 uppercase font-bold">{cagrData.periode}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  <div className="border-4 border-slate-900 bg-slate-900 text-white p-6 flex flex-col justify-between rounded-2xl shadow-xl">
                    <span className="text-xs font-mono font-black uppercase text-slate-400 tracking-wider">Total Gabungan</span>
                    <span className="text-4xl font-serif font-black mt-3">
                      {cagrData.total === null ? "N/A" : `${cagrData.total >= 0 ? "+" : ""}${formatPct(cagrData.total)}%`}
                    </span>
                  </div>
                  {cagrData.items.map((item) => (
                    <div key={item.name} className="border-4 border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xl rounded-2xl">
                      <span className="text-xs font-mono font-black uppercase text-slate-600 leading-tight">{item.name}</span>
                      <span className={`text-3xl font-serif font-black mt-3 ${item.cagr === null ? "text-slate-400" : item.cagr >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {item.cagr === null ? "N/A" : <>{item.cagr >= 0 ? "▲" : "▼"} {formatPct(Math.abs(item.cagr))}%</>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ranking Kecamatan */}
            <div className="bg-white border-4 border-amber-200 p-8 shadow-2xl shadow-amber-100 rounded-3xl">
              <div className="flex items-center justify-between mb-6 border-b-4 border-amber-100 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl shadow-amber-500/30">
                    <FileSpreadsheet size={22} />
                  </div>
                  <div>
                    <h4 className="text-xl font-mono font-black uppercase text-slate-800">Ranking Kecamatan</h4>
                    <p className="text-xs font-mono text-amber-600 uppercase font-bold">
                      Kumulatif {yearsList[yearsList.length - 1]}–{yearsList[0]}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-600 uppercase">
                  Total {unit} seluruh tahun
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-left">
                {kecamatanRanking.slice(0, 10).map((item, idx) => {
                  const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
                  const colors = idx === 0 ? "border-amber-500 bg-amber-50/50" : "border-slate-200 bg-white";
                  const iconBg = idx < 3 ? "bg-amber-500" : "bg-slate-100";
                  return (
                    <div key={item.name} className={`border-4 p-5 flex flex-col gap-2 shadow-lg rounded-2xl transition-all hover:shadow-xl ${colors}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black font-mono ${iconBg} ${idx < 3 ? "text-white" : "text-slate-500"}`}>
                          {medal || (idx + 1)}
                        </span>
                        <span className="text-xs font-mono font-black uppercase text-slate-700 truncate">{item.name}</span>
                      </div>
                      <span className="text-3xl font-serif font-black text-slate-800 leading-tight">{formatNum(item.value)}</span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">{unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border-4 border-slate-200 p-8 shadow-2xl shadow-slate-200/50 rounded-3xl">
              <div className="flex items-center justify-between mb-6 border-b-4 border-slate-100 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/30">
                    <FileSpreadsheet size={22} />
                  </div>
                  <div>
                    <h4 className="text-xl font-mono font-black uppercase text-slate-800">Tabel Rincian Data</h4>
                    <p className="text-xs font-mono text-slate-500 uppercase font-bold">
                      Perkecamatan • {selectedYear} • Satuan: {unit}
                    </p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-sm">
                <table className="w-full text-left font-mono text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-4 border-r border-slate-700 font-black uppercase text-xs whitespace-nowrap w-12">#</th>
                      <th className="p-4 border-r border-slate-700 font-black uppercase text-xs">Kecamatan</th>
                      {jenisList.map((j) => (
                        <th key={j} className="p-4 border-r border-slate-700 font-black uppercase text-xs text-right whitespace-nowrap">{j}</th>
                      ))}
                      <th className="p-4 font-black uppercase text-xs text-right bg-slate-800">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, idx) => (
                      <tr key={row.name} className={`border-b border-slate-200 hover:bg-amber-50/60 transition-colors ${idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}`}>
                        <td className="p-4 border-r border-slate-100 text-xs font-black text-slate-400">{idx + 1}</td>
                        <td className="p-4 border-r border-slate-100 text-xs font-black uppercase text-slate-700">{row.name}</td>
                        {jenisList.map((j) => (
                          <td key={j} className="p-4 border-r border-slate-100 text-xs text-right text-slate-600 font-medium">{formatNum(row[j] || 0)}</td>
                        ))}
                        <td className="p-4 text-xs font-black text-right bg-slate-900 text-white">{formatNum(row.total)}</td>
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
