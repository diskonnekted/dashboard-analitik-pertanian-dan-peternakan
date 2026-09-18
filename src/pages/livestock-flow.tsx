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

  const Icon = CATEGORY_META[category].icon;

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero */}
        <section className="relative text-left py-4 md:py-8 border-b border-slate-200">
          <h2 className="text-2xl sm:text-4xl leading-tight font-bold tracking-tight text-slate-800">
            Analitik Lalu Lintas & Pemotongan Ternak
          </h2>
          <p className="text-xs md:text-sm font-medium text-slate-500 mt-2 max-w-2xl border-l border-amber-500 pl-3">
            Pemantauan pemasukan, pengeluaran, pemotongan, dan produksi daging unggas di Kabupaten Banjarnegara.
          </p>
        </section>

        {/* Filter Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-white border border-slate-200 p-6 shadow-sm text-left">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-bold uppercase text-slate-500">Jenis Data</label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
                const CIcon = CATEGORY_META[c].icon;
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`py-2 px-3 border border-slate-200 font-mono font-bold text-xs uppercase flex items-center justify-start gap-2 transition-all ${
                      category === c
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                    }`}
                  >
                    <CIcon size={14} />
                    {CATEGORY_META[c].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-bold uppercase text-slate-500">Satuan</label>
            <div className="py-2 px-3 border border-slate-200 bg-slate-50 text-slate-500 font-mono font-bold text-sm uppercase flex items-center gap-2">
              <Beef size={14} />
              {unit}
            </div>
            <span className="text-[10px] font-mono text-slate-400 uppercase">{CATEGORY_META[category].sub}</span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-bold uppercase text-slate-500">Tahun Data</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 font-mono text-sm font-bold bg-white focus:outline-none appearance-none cursor-pointer rounded-xl"
              >
                {yearsList.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-bold uppercase text-slate-500">Pilih Kecamatan</label>
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
              <select
                value={selectedKecamatan}
                onChange={(e) => setSelectedKecamatan(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 font-mono text-sm font-bold bg-white focus:outline-none appearance-none cursor-pointer rounded-xl"
              >
                {uniqueKecamatan.map((kec) => (
                  <option key={kec} value={kec}>{kec}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-slate-500 font-mono font-bold animate-pulse uppercase">
              Memuat data lalu lintas ternak...
            </p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-amber-50 border border-slate-200 p-6 shadow-sm text-left flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-slate-500 uppercase">
                      Total ({unit})
                    </h5>
                    <h3 className="text-3xl font-serif font-black uppercase text-slate-800 mt-1">
                      {formatNum(stats.total)}
                    </h3>
                  </div>
                  <div className="p-2 border border-slate-200 bg-white"><Icon size={20} /></div>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-4 uppercase">
                  {CATEGORY_META[category].label} · {selectedYear}
                </div>
              </div>

              <div className="bg-emerald-50 border border-slate-200 p-6 shadow-sm text-left flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-slate-500 uppercase">Kecamatan Tertinggi</h5>
                    <h3 className="text-2xl font-serif font-black uppercase text-slate-800 mt-1 break-words leading-tight">
                      {stats.topDistrict}
                    </h3>
                  </div>
                  <div className="p-2 border border-slate-200 bg-white"><MapPin size={20} /></div>
                </div>
                <p className="text-xs font-mono text-slate-500 mt-4 uppercase">
                  Nilai: {formatNum(stats.topVal)} {unit}
                </p>
              </div>

              <div className="bg-violet-50 border border-slate-200 p-6 shadow-sm text-left">
                <h5 className="text-xs font-mono font-bold text-slate-500 uppercase mb-3">Komposisi Jenis Ternak</h5>
                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {stats.breakdown.map((item, idx) => {
                    const pct = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                    return (
                      <div key={item.name} className="flex flex-col gap-0.5">
                        <div className="flex justify-between text-[10px] font-mono font-bold uppercase">
                          <span className="truncate max-w-[140px]">{item.name}</span>
                          <span>{formatNum(item.value)} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full">
                          <div className="h-full" style={{ width: `${pct}%`, backgroundColor: COLORS[idx % COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Distribution Chart */}
            <div className="bg-white border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col mb-6 border-b border-slate-200 pb-3 text-left">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <FileSpreadsheet className="text-amber-600" />
                  Sebaran {CATEGORY_META[category].label} per Kecamatan ({selectedYear})
                </h4>
                <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">
                  Kontribusi masing-masing kecamatan (satuan: {unit})
                </p>
              </div>
              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }} interval={0} angle={-45} textAnchor="end" height={70} />
                    <YAxis width={70} tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }} tickFormatter={(v) => formatNum(v)} />
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, fontFamily: "monospace", fontSize: 12, fontWeight: "bold" }} formatter={(value: any) => [formatNum(Number(value)), ""]} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontSize: 10, fontWeight: "bold" }} />
                    {jenisList.map((j, idx) => (
                      <Bar key={j} dataKey={j} stackId="a" fill={COLORS[idx % COLORS.length]} stroke="#64748b" strokeWidth={1} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trend */}
            <div className="bg-white border border-slate-200 p-6 shadow-sm">
              <div className="mb-4 text-left border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <TrendingUp className="text-amber-600" />
                  Tren {CATEGORY_META[category].label}
                  {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                </h4>
                {cagrData && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-slate-200 font-mono font-bold text-[10px] uppercase bg-amber-100 text-amber-800">
                    CAGR: {cagrData.total === null ? "N/A" : `${cagrData.total >= 0 ? "+" : ""}${formatPct(cagrData.total)}%`} ({cagrData.periode})
                  </span>
                )}
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
                    {jenisList.map((j, idx) => (
                      <Line key={j} type="monotone" dataKey={j} stroke={COLORS[idx % COLORS.length]} strokeWidth={1.5} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Regression Projections */}
            {projection && (
              <div className="bg-white border border-slate-200 p-6 shadow-sm">
                <div className="mb-4 text-left border-b border-slate-200 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                    <TrendingUp className="text-amber-600" size={18} />
                    Proyeksi Garis Tren Ternak ({projection.nextYear})
                  </h4>
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase mt-1">
                    Estimasi model regresi linier (least-squares) berdasarkan tren historis
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="border border-slate-200 bg-amber-50 p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
                      Prediksi {projection.nextYear} ({unit})
                    </span>
                    <span className="text-2xl font-serif font-black text-slate-800 mt-2">
                      {formatNum(projection.predicted)}
                    </span>
                  </div>
                  <div className="border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
                      Perubahan vs {projection.lastTahun}
                    </span>
                    <span className={`text-2xl font-serif font-black mt-2 ${projection.deltaPct === null ? "text-slate-400" : projection.deltaPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {projection.deltaPct === null ? "N/A" : `${projection.deltaPct >= 0 ? "▲" : "▼"} ${formatPct(Math.abs(projection.deltaPct))}%`}
                    </span>
                  </div>
                  <div className="border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
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
              <div className="bg-white border border-slate-200 p-6 shadow-sm">
                <div className="mb-4 text-left border-b border-slate-200 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                    Rata-rata Laju Pertumbuhan Jenis Ternak (CAGR) {cagrData.periode}
                  </h4>
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase mt-1">
                    Laju pertumbuhan majemuk per tahun per jenis ({selectedKecamatan !== "Semua" ? selectedKecamatan : "Seluruh Banjarnegara"})
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
                  <div className="border border-slate-200 bg-slate-800 text-white p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Total Gabungan</span>
                    <span className="text-2xl font-serif font-black mt-2">
                      {cagrData.total === null ? "N/A" : `${cagrData.total >= 0 ? "+" : ""}${formatPct(cagrData.total)}%`}
                    </span>
                  </div>
                  {cagrData.items.map((item) => (
                    <div key={item.name} className="border border-slate-200 bg-white p-4 flex flex-col justify-between shadow-sm">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-500 leading-tight">{item.name}</span>
                      <span className={`text-2xl font-serif font-black mt-2 ${item.cagr === null ? "text-slate-400" : item.cagr >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {item.cagr === null ? "N/A" : <>{item.cagr >= 0 ? "▲" : "▼"} {formatPct(Math.abs(item.cagr))}%</>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ranking Kecamatan */}
            <div className="bg-white border border-slate-200 p-6 shadow-sm">
              <div className="mb-4 text-left border-b border-slate-200 pb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <FileSpreadsheet className="text-amber-600" size={18} />
                  Ranking Kecamatan (Kumulatif {yearsList[yearsList.length - 1]}–{yearsList[0]})
                </h4>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  Total {unit} seluruh tahun
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-left">
                {kecamatanRanking.slice(0, 10).map((item, idx) => (
                  <div key={item.name} className={`border p-3 flex flex-col gap-1 shadow-sm ${idx === 0 ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-black font-mono bg-slate-800 text-white">
                        {idx + 1}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-500 truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="text-lg font-serif font-black text-slate-800">{formatNum(item.value)}</span>
                    <span className="text-[9px] font-mono text-slate-400 uppercase">{unit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-slate-200 p-6 shadow-sm">
              <div className="mb-4 text-left border-b border-slate-200 pb-2">
                <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                  Tabel Rincian Data Perkecamatan ({selectedYear})
                </h4>
                <p className="text-[10px] font-mono font-bold text-slate-500 uppercase mt-1">
                  Satuan: {unit}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100">
                      <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs">No</th>
                      <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs">Kecamatan</th>
                      {jenisList.map((j) => (
                        <th key={j} className="p-3 border-r border-slate-200 font-bold uppercase text-xs text-right">{j}</th>
                      ))}
                      <th className="p-3 font-bold uppercase text-xs text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, idx) => (
                      <tr key={row.name} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-3 border-r border-slate-200 text-xs font-bold">{idx + 1}</td>
                        <td className="p-3 border-r border-slate-200 text-xs font-bold uppercase">{row.name}</td>
                        {jenisList.map((j) => (
                          <td key={j} className="p-3 border-r border-slate-200 text-xs text-right">{formatNum(row[j] || 0)}</td>
                        ))}
                        <td className="p-3 text-xs font-black text-right bg-slate-50">{formatNum(row.total)}</td>
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
