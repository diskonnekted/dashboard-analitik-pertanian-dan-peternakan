import { useEffect, useMemo, useState } from "react";
import DefaultLayout from "@/layouts/default";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";
import { fetchVegetableProduction, VegetableProduction } from "@/services/api";
import {
  Compass,
  Tractor,
  ListFilter,
  Leaf,
  TrendingUp,
  Layers,
  Award,
  Sprout,
} from "lucide-react";

/* ── Skeleton (gradient shimmer berwarna) ─────────────────── */
const skeletonThemes = [
  {
    wrapper: "bg-gradient-to-br from-sky-50 via-white to-blue-50 border-sky-200",
    bar: "bg-gradient-to-r from-sky-300 to-blue-400",
    topAccent: "bg-gradient-to-r from-sky-400 to-blue-500",
    blob: "bg-sky-300/30",
    icon: "bg-gradient-to-br from-sky-400 to-blue-600",
  },
  {
    wrapper: "bg-gradient-to-br from-amber-50 via-white to-orange-50 border-amber-200",
    bar: "bg-gradient-to-r from-amber-300 to-orange-400",
    topAccent: "bg-gradient-to-r from-amber-400 to-orange-500",
    blob: "bg-amber-300/30",
    icon: "bg-gradient-to-br from-amber-400 to-orange-600",
  },
  {
    wrapper: "bg-gradient-to-br from-emerald-50 via-white to-lime-50 border-emerald-200",
    bar: "bg-gradient-to-r from-emerald-300 to-lime-400",
    topAccent: "bg-gradient-to-r from-emerald-400 to-lime-500",
    blob: "bg-emerald-300/30",
    icon: "bg-gradient-to-br from-emerald-400 to-green-600",
  },
  {
    wrapper: "bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 border-violet-200",
    bar: "bg-gradient-to-r from-violet-300 to-fuchsia-400",
    topAccent: "bg-gradient-to-r from-violet-400 to-fuchsia-500",
    blob: "bg-violet-300/30",
    icon: "bg-gradient-to-br from-violet-400 to-fuchsia-600",
  },
];

function SkeletonCard({
  className = "",
  themeIndex = 0,
}: {
  className?: string;
  themeIndex?: number;
}) {
  const theme = skeletonThemes[themeIndex % skeletonThemes.length];
  return (
    <div
      className={`relative overflow-hidden ${theme.wrapper} border rounded-2xl shadow-sm p-4 md:p-5 ${className}`}
    >
      {/* Top accent bar dengan shimmer */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.topAccent}`} />
      {/* Blob dekoratif */}
      <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-30 blur-2xl ${theme.blob}`} />
      {/* Icon placeholder */}
      <div className={`relative w-9 h-9 rounded-xl mb-3 animate-pulse ${theme.icon} opacity-70 shadow-md`} />
      {/* Value placeholder */}
      <div className={`relative h-5 w-24 rounded mb-2 ${theme.bar} animate-pulse opacity-70`} />
      {/* Label placeholder */}
      <div className={`relative h-3 w-16 rounded ${theme.bar} animate-pulse opacity-50`} />
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
    </div>
  );
}

function SkeletonChart({
  themeIndex = 0,
}: {
  themeIndex?: number;
}) {
  const theme = skeletonThemes[themeIndex % skeletonThemes.length];
  return (
    <div className={`relative overflow-hidden ${theme.wrapper} border rounded-2xl shadow-sm p-6`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.topAccent}`} />
      <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-30 blur-3xl ${theme.blob}`} />
      <div className="relative flex flex-col mb-4">
        <div className={`h-4 w-32 rounded mb-2 ${theme.bar} animate-pulse opacity-70`} />
        <div className={`h-3 w-48 rounded ${theme.bar} animate-pulse opacity-50`} />
      </div>
      <div className="flex items-end gap-2 h-[250px]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 ${theme.bar} rounded-t animate-pulse opacity-70`}
            style={{
              height: `${30 + ((i * 11) % 60)}%`,
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
    </div>
  );
}

/* ── Status Badge ─────────────────────────────────────────── */
const getSuitabilityStatus = (value: number) => {
  if (value > 1000)
    return {
      label: "Sangat Sesuai",
      dot: "bg-emerald-500",
      badge:
        "bg-emerald-50 text-emerald-700 border border-emerald-200",
      bar: "bg-emerald-500",
    };
  if (value > 100)
    return {
      label: "Cukup Sesuai",
      dot: "bg-amber-500",
      badge: "bg-amber-50 text-amber-700 border border-amber-200",
      bar: "bg-amber-500",
    };
  if (value > 0)
    return {
      label: "Kesesuaian Rendah",
      dot: "bg-slate-400",
      badge: "bg-slate-50 text-slate-600 border border-slate-200",
      bar: "bg-slate-400",
    };
  return {
    label: "Tidak Diusahakan",
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-600 border border-red-200",
    bar: "bg-red-300",
  };
};

const getRecommendation = (value: number) => {
  if (value > 1000)
    return "Sangat direkomendasikan untuk pembesaran skala industri dan korporasi tani.";
  if (value > 100)
    return "Layak dikembangkan untuk pasar lokal dan pemenuhan ketahanan pangan desa.";
  if (value > 0)
    return "Kembangkan dalam skala kecil atau gunakan rumah kaca.";
  return "Lahan kurang cocok atau butuh modifikasi mikro/irigasi tambahan.";
};

/* ── Custom Tooltip ───────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  const pct = item.payload.pct;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3">
      <p className="text-xs font-mono font-bold text-slate-800 uppercase mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: item.payload.color }}
        />
        <span className="text-sm font-mono font-bold text-slate-700">
          {new Intl.NumberFormat("id-ID").format(item.value)} Ton
        </span>
      </div>
      {pct > 0 && (
        <p className="text-[10px] font-mono text-slate-400 mt-1">
          {pct.toFixed(1)}% dari total
        </p>
      )}
    </div>
  );
};

/* ── Page ─────────────────────────────────────────────────── */
export default function SuitabilityPage() {
  const [vegData, setVegData] = useState<VegetableProduction[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedKec, setSelectedKec] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchVegetableProduction();
        setVegData(data);

        const uniqueYears = Array.from(
          new Set(data.map((d) => d.tahun).filter((y) => y !== "")),
        ).sort((a, b) => b.localeCompare(a));
        setYears(uniqueYears);

        if (uniqueYears.length > 0) setSelectedYear(uniqueYears[0]);

        setSelectedKec("Semua Kecamatan");
      } catch (err) {
        console.error("Gagal memuat data sayuran:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getTotalProduction = (item?: VegetableProduction) => {
    if (!item) return 0;
    return (
      item.bawangMerah +
      item.cabaiBesar +
      item.kentang +
      item.kubis +
      item.petsai +
      item.tomat +
      item.bawangPutih +
      item.cabaiRawit
    );
  };

  const activeData = useMemo(() => {
    // Semua Kecamatan: agregasi seluruh kecamatan
    if (selectedKec === "Semua Kecamatan") {
      const yearData = vegData.filter((item) => item.tahun === selectedYear);
      const aggregate = (items: VegetableProduction[]): VegetableProduction => {
        const sum = (key: keyof VegetableProduction) =>
          items.reduce((acc, d) => acc + (d[key] as number), 0);
        return {
          kecamatan: "Semua Kecamatan",
          tahun: selectedYear,
          bawangMerah: sum("bawangMerah"),
          cabaiBesar: sum("cabaiBesar"),
          kentang: sum("kentang"),
          kubis: sum("kubis"),
          petsai: sum("petsai"),
          tomat: sum("tomat"),
          bawangPutih: sum("bawangPutih"),
          cabaiRawit: sum("cabaiRawit"),
        };
      };

      if (yearData.length > 0 && yearData.some((d) => getTotalProduction(d) > 0)) {
        return aggregate(yearData);
      }

      // Fallback: ambil tahun terbaru yang ada datanya
      const fallbackYear = vegData
        .filter((d) => getTotalProduction(d) > 0)
        .map((d) => d.tahun)
        .sort((a, b) => b.localeCompare(a))[0];
      if (fallbackYear) {
        return aggregate(vegData.filter((d) => d.tahun === fallbackYear));
      }
      return undefined;
    }

    // Per kecamatan
    const selected = vegData.find(
      (item) => item.kecamatan === selectedKec && item.tahun === selectedYear,
    );
    if (getTotalProduction(selected) > 0) return selected;

    return (
      vegData
        .filter(
          (item) => item.kecamatan === selectedKec && getTotalProduction(item) > 0,
        )
        .sort((a, b) => b.tahun.localeCompare(a.tahun))[0] || selected
    );
  }, [vegData, selectedKec, selectedYear]);

  const activeDataYear = activeData?.tahun || selectedYear;
  const totalAll = getTotalProduction(activeData);

  const cropList = useMemo(() => {
    const list = [
      { key: "kentang", label: "Kentang", value: activeData?.kentang || 0, color: "#ca8a04" },
      { key: "kubis", label: "Kubis", value: activeData?.kubis || 0, color: "#059669" },
      { key: "cabaiRawit", label: "Cabai Rawit", value: activeData?.cabaiRawit || 0, color: "#dc2626" },
      { key: "cabaiBesar", label: "Cabai Besar", value: activeData?.cabaiBesar || 0, color: "#b91c1c" },
      { key: "tomat", label: "Tomat", value: activeData?.tomat || 0, color: "#ea580c" },
      { key: "bawangMerah", label: "Bawang Merah", value: activeData?.bawangMerah || 0, color: "#7c3aed" },
      { key: "bawangPutih", label: "Bawang Putih", value: activeData?.bawangPutih || 0, color: "#4b5563" },
      { key: "petsai", label: "Petsai (Sawi)", value: activeData?.petsai || 0, color: "#16a34a" },
    ];
    return list.map((c) => ({
      ...c,
      pct: totalAll > 0 ? (c.value / totalAll) * 100 : 0,
    }));
  }, [activeData, totalAll]);

  const radarData = cropList.map((c) => ({
    subject: c.label,
    produksi: c.value,
  }));

  const sortedCrops = [...cropList].sort((a, b) => b.value - a.value);
  const primaryCrop = sortedCrops[0];
  const suitableCount = cropList.filter((c) => c.value > 100).length;
  const activeCount = cropList.filter((c) => c.value > 0).length;

  const formatNum = (num: number) => new Intl.NumberFormat("id-ID").format(num);

  /* ── KPI Cards ──────────────────────────────────────── */
  const kpiCards = [
    {
      label: "Total Produksi",
      value: `${formatNum(totalAll)} Ton`,
      icon: TrendingUp,
      iconColor: "text-white",
      iconBg: "bg-gradient-to-br from-sky-400 to-blue-600",
      cardBg: "bg-gradient-to-br from-sky-50 via-white to-blue-50",
      border: "border-sky-200",
      accent: "bg-sky-500",
      valueColor: "text-sky-900",
    },
    {
      label: "Komoditas Dominan",
      value: primaryCrop?.value > 0 ? primaryCrop.label : "N/A",
      icon: Award,
      iconColor: "text-white",
      iconBg: "bg-gradient-to-br from-amber-400 to-orange-600",
      cardBg: "bg-gradient-to-br from-amber-50 via-white to-orange-50",
      border: "border-amber-200",
      accent: "bg-amber-500",
      valueColor: "text-amber-900",
    },
    {
      label: "Komoditas Aktif",
      value: `${activeCount} / 8`,
      icon: Sprout,
      iconColor: "text-white",
      iconBg: "bg-gradient-to-br from-emerald-400 to-green-600",
      cardBg: "bg-gradient-to-br from-emerald-50 via-white to-lime-50",
      border: "border-emerald-200",
      accent: "bg-emerald-500",
      valueColor: "text-emerald-900",
    },
    {
      label: "Layak Ekspansi",
      value: `${suitableCount} Komoditas`,
      icon: Layers,
      iconColor: "text-white",
      iconBg: "bg-gradient-to-br from-violet-400 to-fuchsia-600",
      cardBg: "bg-gradient-to-br from-violet-50 via-white to-fuchsia-50",
      border: "border-violet-200",
      accent: "bg-violet-500",
      valueColor: "text-violet-900",
    },
  ];

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-6 py-2">
        {/* ── Hero ──────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 animate-fade-in shadow-lg shadow-emerald-500/20">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)", backgroundSize: "24px 24px, 32px 32px" }} />
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-300/30 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/4 w-56 h-56 bg-lime-300/30 rounded-full blur-3xl translate-y-1/2" />
          <div className="absolute top-4 right-6 w-12 h-12 rounded-full bg-yellow-300/40 blur-xl" />
          <div className="absolute bottom-8 right-1/3 w-8 h-8 rounded-full bg-amber-200/50 blur-md" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-6 py-6 md:px-8 md:py-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-3">
                <Leaf className="text-white" size={14} />
                <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                  Bidang Hortikultura & Perkebunan
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl leading-tight font-black tracking-tight text-white drop-shadow-sm">
                Kesesuaian Lahan Sayuran
              </h2>
              <p className="text-xs md:text-sm font-medium text-emerald-50 mt-2 max-w-2xl">
                Pemetaan kecocokan lahan aktual berdasarkan volume produksi
                sayuran riil Kabupaten Banjarnegara.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-[10px] font-mono font-bold uppercase border border-white/20">
                  <Sprout size={11} /> 8 Komoditas
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/30 backdrop-blur-sm text-white text-[10px] font-mono font-bold uppercase border border-amber-200/40">
                  <Award size={11} /> Data Aktual
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-300/20 backdrop-blur-sm text-white text-[10px] font-mono font-bold uppercase border border-cyan-200/30">
                  <TrendingUp size={11} /> Real-time Analytics
                </span>
              </div>
            </div>
            <div className="w-full md:w-44 lg:w-52 shrink-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-full blur-2xl scale-90" />
                <img
                  src="/img/suitability.png"
                  alt="Kesesuaian Lahan"
                  className="relative w-full max-h-28 md:max-h-32 object-contain drop-shadow-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <>
            {/* Skeleton KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} themeIndex={i} />
              ))}
            </div>
            {/* Skeleton Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <SkeletonChart themeIndex={3} />
              <div className="lg:col-span-2">
                <SkeletonChart themeIndex={1} />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ── KPI Cards ──────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiCards.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div
                    key={kpi.label}
                    className={`relative overflow-hidden ${kpi.cardBg} border ${kpi.border} rounded-2xl shadow-sm p-4 md:p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200`}
                  >
                    {/* Top accent bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${kpi.accent}`} />
                    {/* Decorative blob */}
                    <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl ${kpi.accent}`} />
                    <div className="relative flex items-start justify-between mb-3">
                      <div className={`p-2.5 rounded-xl shadow-md ${kpi.iconBg}`}>
                        <Icon className={kpi.iconColor} size={18} />
                      </div>
                    </div>
                    <p className={`text-lg md:text-xl font-black font-mono leading-tight ${kpi.valueColor}`}>
                      {kpi.value}
                    </p>
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mt-1">
                      {kpi.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* ── Filter ─────────────────────────────────── */}
            <div className="relative overflow-hidden bg-gradient-to-r from-indigo-50 via-white to-cyan-50 border border-indigo-200 rounded-2xl shadow-sm p-5">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-200/30 rounded-full blur-3xl" />
              <div className="relative flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md shadow-indigo-300/50">
                  <ListFilter className="text-white" size={16} />
                </div>
                <h4 className="text-sm font-mono font-bold uppercase tracking-wide text-indigo-900">
                  Filter Analisis
                </h4>
                <span className="ml-auto text-[10px] font-mono font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200 uppercase">
                  {selectedKec} • {selectedYear}
                </span>
              </div>
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider">
                    Kecamatan
                  </span>
                  <select
                    value={selectedKec}
                    onChange={(e) => setSelectedKec(e.target.value)}
                    className="w-full border border-indigo-200 rounded-xl px-3 py-2.5 font-mono font-bold text-xs uppercase bg-white shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all hover:border-indigo-300"
                  >
                    <option value="Semua Kecamatan">SEMUA KECAMATAN</option>
                    {Array.from(new Set(vegData.map((d) => d.kecamatan)))
                      .sort((a, b) => a.localeCompare(b))
                      .map((kec) => (
                        <option key={kec} value={kec} className="capitalize">
                          {kec.toUpperCase()}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-cyan-700 uppercase tracking-wider">
                    Tahun Data
                  </span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full border border-cyan-200 rounded-xl px-3 py-2.5 font-mono font-bold text-xs uppercase bg-white shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400 transition-all hover:border-cyan-300"
                  >
                    {years.map((yr) => (
                      <option key={yr} value={yr}>
                        TAHUN {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Charts ─────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Radar */}
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 border border-blue-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-200">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-300/20 rounded-full blur-3xl" />
                <div className="relative flex flex-col mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-300/50">
                      <Compass className="text-white" size={14} />
                    </div>
                    <h4 className="text-sm font-mono font-bold uppercase tracking-wide text-blue-900">
                      Radar Karakteristik
                    </h4>
                  </div>
                  <p className="text-[10px] font-mono font-bold text-blue-600/70 uppercase">
                    Sebaran hasil panen sayuran
                    {activeDataYear !== selectedYear
                      ? ` (data ${activeDataYear})`
                      : ""}
                  </p>
                </div>
                <div className="h-[280px] w-full flex items-center justify-center">
                  {primaryCrop && primaryCrop.value > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="72%"
                        data={radarData}
                      >
                        <PolarGrid stroke="#94a3b8" strokeOpacity={0.2} />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{
                            fill: "#475569",
                            fontSize: 9,
                            fontFamily: "monospace",
                            fontWeight: 600,
                          }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, "auto"]}
                          tick={{
                            fill: "#94a3b8",
                            fontSize: 8,
                            fontFamily: "monospace",
                          }}
                        />
                        <Radar
                          name="Produksi (Ton)"
                          dataKey="produksi"
                          stroke="#2563eb"
                          strokeWidth={2}
                          fill="#2563eb"
                          fillOpacity={0.15}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs font-mono font-bold text-slate-400 uppercase italic">
                      Tidak ada catatan produksi sayuran pada tahun ini.
                    </p>
                  )}
                </div>
                <div className="relative mt-4 pt-4 border-t border-blue-200/60 text-xs font-mono text-slate-600">
                  Kecamatan{" "}
                  <span className="text-blue-900 font-bold bg-blue-100 px-1.5 py-0.5 rounded">
                    {selectedKec}
                  </span>{" "}
                  produksi dominan{" "}
                  <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                    {primaryCrop?.value > 0 ? primaryCrop.label : "N/A"}
                  </span>
                  {activeDataYear !== selectedYear
                    ? ` (data ${activeDataYear})`
                    : ""}
                  .
                </div>
              </div>

              {/* Bar Chart */}
              <div className="relative overflow-hidden lg:col-span-2 bg-gradient-to-br from-amber-50 via-white to-orange-50 border border-amber-200 rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all duration-200">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
                <div className="absolute -top-12 -left-12 w-44 h-44 bg-amber-300/20 rounded-full blur-3xl" />
                <div className="relative flex flex-col mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-300/50">
                      <Tractor className="text-white" size={14} />
                    </div>
                    <h4 className="text-sm font-mono font-bold uppercase tracking-wide text-amber-900">
                      Rincian Hasil Panen Sayuran (Ton)
                    </h4>
                  </div>
                  <p className="text-[10px] font-mono font-bold text-amber-700/70 uppercase">
                    Volume produksi riil sayuran di wilayah terpilih
                  </p>
                </div>
                <div className="h-[350px] w-full">
                  {primaryCrop && primaryCrop.value > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={cropList}
                        margin={{ top: 20, right: 10, left: 0, bottom: 60 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#94a3b8"
                          strokeOpacity={0.12}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tickLine={{ stroke: "#cbd5e1" }}
                          axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                          angle={-30}
                          textAnchor="end"
                          interval={0}
                          height={50}
                          tick={{
                            fill: "#475569",
                            fontSize: 10,
                            fontFamily: "monospace",
                            fontWeight: 600,
                          }}
                        />
                        <YAxis
                          width={60}
                          tickLine={{ stroke: "#cbd5e1" }}
                          axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                          tick={{
                            fill: "#475569",
                            fontSize: 10,
                            fontFamily: "monospace",
                            fontWeight: 600,
                          }}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: "#f8fafc" }}
                        />
                        <Bar
                          dataKey="value"
                          name="Produksi (Ton)"
                          radius={[6, 6, 0, 0]}
                        >
                          {cropList.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                            />
                          ))}
                          <LabelList
                            dataKey="value"
                            position="top"
                            formatter={(v: any) =>
                              v > 0 ? formatNum(Number(v)) : ""
                            }
                            style={{
                              fill: "#64748b",
                              fontSize: 9,
                              fontFamily: "monospace",
                              fontWeight: 600,
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-amber-700/60 font-mono font-bold uppercase italic text-sm">
                      Tidak ada catatan produksi sayuran pada tahun ini.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Suitability Matrix ─────────────────────── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-lime-50 border border-emerald-200 rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500" />
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-300/20 rounded-full blur-3xl" />
              <div className="relative flex flex-col mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-md shadow-emerald-300/50">
                    <Leaf className="text-white" size={14} />
                  </div>
                  <h4 className="text-base font-mono font-bold uppercase tracking-wide text-emerald-900">
                    Matriks Kesesuaian Komoditas Aktual
                  </h4>
                </div>
                <p className="text-[10px] font-mono font-bold text-emerald-700/70 uppercase">
                  Indeks kecocokan lahan berdasarkan produktivitas riil di
                  lapangan
                </p>
              </div>

              <div className="relative overflow-x-auto rounded-xl border border-emerald-100">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-gradient-to-r from-emerald-100 via-green-50 to-lime-100 border-b-2 border-emerald-300 text-[10px] font-mono font-black text-emerald-900 uppercase tracking-wider">
                      <th className="pb-3 px-3">Komoditas</th>
                      <th className="pb-3 px-3 text-right">Panen (Ton)</th>
                      <th className="pb-3 px-3 text-right">% Share</th>
                      <th className="pb-3 px-6">Kesesuaian</th>
                      <th className="pb-3 px-3">Rekomendasi Pengembangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCrops.map((crop, idx) => {
                      const status = getSuitabilityStatus(crop.value);
                      const rec = getRecommendation(crop.value);
                      const maxVal = sortedCrops[0]?.value || 1;
                      const barWidth = (crop.value / maxVal) * 100;
                      const rowStripe = idx % 2 === 0 ? "bg-white/60" : "bg-emerald-50/40";

                      return (
                        <tr
                          key={crop.key}
                          className={`border-b border-emerald-100/60 ${rowStripe} hover:bg-emerald-100/40 transition-colors text-sm`}
                        >
                          <td className="py-4 px-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-3.5 h-3.5 rounded-md shrink-0 shadow-sm ring-1 ring-black/5"
                                style={{ backgroundColor: crop.color }}
                              />
                              <span className="font-mono font-bold text-slate-800 text-xs">
                                {crop.label}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-bold text-slate-700 text-xs">
                            {formatNum(crop.value)}
                          </td>
                          <td className="py-4 px-3 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${status.bar}`}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono font-bold text-slate-500 w-10 text-right">
                                {crop.pct.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono font-bold text-[10px] uppercase tracking-wide shadow-sm ${status.badge}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${status.dot}`}
                              />
                              {status.label}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-slate-600 text-[10px] font-mono whitespace-normal max-w-xs leading-relaxed">
                            {rec}
                          </td>
                        </tr>
                      );
                    })}
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
