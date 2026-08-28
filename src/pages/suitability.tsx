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

/* ── Skeleton ─────────────────────────────────────────────── */
function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl shadow-sm p-6 animate-pulse ${className}`}
    >
      <div className="h-4 w-24 bg-slate-200 rounded mb-4" />
      <div className="h-3 w-16 bg-slate-100 rounded mb-2" />
      <div className="h-3 w-20 bg-slate-100 rounded" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 animate-pulse">
      <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
      <div className="h-3 w-48 bg-slate-100 rounded mb-6" />
      <div className="flex items-end gap-2 h-[250px]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-100 rounded-t"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
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
      color: "text-blue-600",
      bg: "bg-blue-50",
      ring: "ring-blue-100",
    },
    {
      label: "Komoditas Dominan",
      value: primaryCrop?.value > 0 ? primaryCrop.label : "N/A",
      icon: Award,
      color: "text-amber-600",
      bg: "bg-amber-50",
      ring: "ring-amber-100",
    },
    {
      label: "Komoditas Aktif",
      value: `${activeCount} / 8`,
      icon: Sprout,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      ring: "ring-emerald-100",
    },
    {
      label: "Layak Ekspansi",
      value: `${suitableCount} Komoditas`,
      icon: Layers,
      color: "text-violet-600",
      bg: "bg-violet-50",
      ring: "ring-violet-100",
    },
  ];

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-6 py-2">
        {/* ── Hero ──────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 animate-fade-in">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-amber-100/20 rounded-full blur-3xl translate-y-1/2" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-6 py-6 md:px-8 md:py-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-3">
                <Leaf className="text-blue-600" size={14} />
                <span className="text-[10px] font-mono font-bold text-blue-700 uppercase tracking-wider">
                  Bidang Hortikultura & Perkebunan
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl leading-tight font-bold tracking-tight text-slate-800">
                Kesesuaian Lahan Sayuran
              </h2>
              <p className="text-xs md:text-sm font-medium text-slate-500 mt-2 max-w-2xl">
                Pemetaan kecocokan lahan aktual berdasarkan volume produksi
                sayuran riil Kabupaten Banjarnegara.
              </p>
            </div>
            <div className="w-full md:w-44 lg:w-52 shrink-0 flex items-center justify-center">
              <img
                src="/img/suitability.png"
                alt="Kesesuaian Lahan"
                className="w-full max-h-28 md:max-h-32 object-contain drop-shadow-sm"
              />
            </div>
          </div>
        </section>

        {loading ? (
          <>
            {/* Skeleton KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
            {/* Skeleton Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <SkeletonChart />
              <div className="lg:col-span-2">
                <SkeletonChart />
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
                    className={`bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5 hover:shadow-md transition-all duration-200 ring-1 ${kpi.ring}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-xl ${kpi.bg}`}>
                        <Icon className={kpi.color} size={18} />
                      </div>
                    </div>
                    <p className="text-lg md:text-xl font-bold text-slate-800 font-mono leading-tight">
                      {kpi.value}
                    </p>
                    <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mt-1">
                      {kpi.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* ── Filter ─────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <ListFilter className="text-slate-700" size={18} />
                <h4 className="text-sm font-mono font-bold uppercase tracking-wide text-slate-700">
                  Filter Analisis
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                    Kecamatan
                  </span>
                  <select
                    value={selectedKec}
                    onChange={(e) => setSelectedKec(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-mono font-bold text-xs uppercase bg-white shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
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
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                    Tahun Data
                  </span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-mono font-bold text-xs uppercase bg-white shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
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
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all duration-200">
                <div className="flex flex-col mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Compass className="text-blue-600" size={18} />
                    <h4 className="text-sm font-mono font-bold uppercase tracking-wide text-slate-700">
                      Radar Karakteristik
                    </h4>
                  </div>
                  <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">
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
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs font-mono text-slate-500">
                  Kecamatan{" "}
                  <span className="text-slate-800 font-bold">
                    {selectedKec}
                  </span>{" "}
                  produksi dominan{" "}
                  <span className="text-emerald-600 font-bold">
                    {primaryCrop?.value > 0 ? primaryCrop.label : "N/A"}
                  </span>
                  {activeDataYear !== selectedYear
                    ? ` (data ${activeDataYear})`
                    : ""}
                  .
                </div>
              </div>

              {/* Bar Chart */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-all duration-200">
                <div className="flex flex-col mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Tractor className="text-amber-600" size={18} />
                    <h4 className="text-sm font-mono font-bold uppercase tracking-wide text-slate-700">
                      Rincian Hasil Panen Sayuran (Ton)
                    </h4>
                  </div>
                  <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">
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
                    <div className="flex items-center justify-center h-full text-slate-400 font-mono font-bold uppercase italic text-sm">
                      Tidak ada catatan produksi sayuran pada tahun ini.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Suitability Matrix ─────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 hover:shadow-md transition-all duration-200">
              <div className="flex flex-col mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <Leaf className="text-emerald-600" size={18} />
                  <h4 className="text-base font-mono font-bold uppercase tracking-wide text-slate-700">
                    Matriks Kesesuaian Komoditas Aktual
                  </h4>
                </div>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                  Indeks kecocokan lahan berdasarkan produktivitas riil di
                  lapangan
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                      <th className="pb-3 px-3">Komoditas</th>
                      <th className="pb-3 px-3 text-right">Panen (Ton)</th>
                      <th className="pb-3 px-3 text-right">% Share</th>
                      <th className="pb-3 px-6">Kesesuaian</th>
                      <th className="pb-3 px-3">Rekomendasi Pengembangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCrops.map((crop) => {
                      const status = getSuitabilityStatus(crop.value);
                      const rec = getRecommendation(crop.value);
                      const maxVal = sortedCrops[0]?.value || 1;
                      const barWidth = (crop.value / maxVal) * 100;

                      return (
                        <tr
                          key={crop.key}
                          className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors text-sm"
                        >
                          <td className="py-4 px-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-3.5 h-3.5 rounded-md shrink-0"
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
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono font-bold text-[10px] uppercase tracking-wide ${status.badge}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${status.dot}`}
                              />
                              {status.label}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-slate-500 text-[10px] font-mono whitespace-normal max-w-xs leading-relaxed">
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
