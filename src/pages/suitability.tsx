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
  Calendar,
  MapPin,
  TrendingUp,
  Layers,
  Award,
  Sprout,
} from "lucide-react";

/* ── Status Kesesuaian ────────────────────────────────────── */
const getSuitabilityStatus = (value: number) => {
  if (value > 1000)
    return {
      label: "Sangat Sesuai",
      dot: "bg-green-600",
      badge: "bg-green-50 text-green-700 border border-green-200",
      bar: "bg-green-600",
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
      badge: "bg-slate-50 text-slate-700 border border-slate-200",
      bar: "bg-slate-400",
    };
  return {
    label: "Tidak Diusahakan",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 border border-red-200",
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

/* ── Indikator Naik/Turun vs tahun sebelumnya ─────────────── */
function DeltaCell({ value, prevValue }: { value: number; prevValue: number }) {
  const fmt = (n: number, frac = 1) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: frac,
      maximumFractionDigits: frac,
    }).format(n);

  if (prevValue === 0 && value === 0)
    return <span className="text-slate-600">–</span>;
  if (prevValue === 0 && value > 0)
    return (
      <span className="text-blue-800 font-medium" title="Belum tercatat pada tahun sebelumnya">
        ▲ Baru tercatat
      </span>
    );
  const delta = value - prevValue;
  const pct = (delta / prevValue) * 100;
  if (delta === 0)
    return <span className="text-slate-600">0,0% (tetap)</span>;
  return (
    <span className={delta > 0 ? "text-green-700" : "text-red-700"}>
      {delta > 0 ? "▲" : "▼"} {fmt(Math.abs(pct))}%
      {" "}
      <span className="text-slate-600">
        ({delta > 0 ? "+" : "−"}
        {new Intl.NumberFormat("id-ID").format(Math.abs(delta))} Ton)
      </span>
    </span>
  );
}

/* ── Custom Tooltip ───────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  const pct = item.payload.pct;
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-sm px-3.5 py-2.5">
      <p className="text-xs font-semibold text-slate-900 uppercase mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.payload.color }} />
        <span className="text-sm font-medium text-slate-800 tabular-nums">
          {new Intl.NumberFormat("id-ID").format(item.value)} Ton
        </span>
      </div>
      {pct > 0 && (
        <p className="text-xs text-slate-600 mt-1">{pct.toFixed(1)}% dari total</p>
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

  const aggregateRows = (
    items: VegetableProduction[],
    kecamatan: string,
    tahun: string,
  ): VegetableProduction => {
    const sum = (key: keyof VegetableProduction) =>
      items.reduce((acc, d) => acc + (d[key] as number), 0);
    return {
      kecamatan,
      tahun,
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

  // Baris data untuk tahun tertentu (agregat kabupaten atau satu kecamatan)
  const getDataForYear = (year: string): VegetableProduction | undefined => {
    if (!year) return undefined;
    if (selectedKec === "Semua Kecamatan") {
      const yearData = vegData.filter((item) => item.tahun === year);
      if (yearData.length === 0) return undefined;
      return aggregateRows(yearData, "Semua Kecamatan", year);
    }
    return vegData.find((item) => item.kecamatan === selectedKec && item.tahun === year);
  };

  const yearsDesc = useMemo(
    () => [...years].sort((a, b) => b.localeCompare(a)),
    [years],
  );

  const yearsWithData = useMemo(() => {
    const s = new Set<string>();
    vegData.forEach((d) => {
      if (getTotalProduction(d) > 0) s.add(d.tahun);
    });
    return s;
  }, [vegData]);

  // Tahun terpilih langsung; jika kosong, jatuh ke tahun terbaru yang ada datanya
  const activeData = useMemo(() => {
    const direct = getDataForYear(selectedYear);
    if (direct && getTotalProduction(direct) > 0) return direct;
    for (const y of yearsDesc) {
      const d = getDataForYear(y);
      if (d && getTotalProduction(d) > 0) return d;
    }
    return direct;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vegData, selectedKec, selectedYear, yearsDesc]);

  const activeDataYear = activeData?.tahun || selectedYear;
  const isFallbackYear = !!activeData && activeData.tahun !== selectedYear;
  const totalAll = getTotalProduction(activeData);

  // Data tahun sebelumnya terdekat yang memiliki catatan (pembanding naik/turun)
  const prevData = useMemo(() => {
    if (!activeData?.tahun) return undefined;
    const lower = yearsDesc.filter((y) => y < activeData.tahun!);
    for (const y of lower) {
      const d = getDataForYear(y);
      if (d && getTotalProduction(d) > 0) return d;
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeData, yearsDesc, selectedKec, vegData]);

  const prevTotal = prevData ? getTotalProduction(prevData) : 0;
  const totalDeltaPct =
    prevData && prevTotal > 0 ? ((totalAll - prevTotal) / prevTotal) * 100 : null;

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
    return list.map((c) => {
      const prevValue = prevData ? ((prevData as any)[c.key] as number) || 0 : 0;
      return {
        ...c,
        prevValue,
        pct: totalAll > 0 ? (c.value / totalAll) * 100 : 0,
      };
    });
  }, [activeData, totalAll, prevData]);

  const radarData = cropList.map((c) => ({
    subject: c.label,
    produksi: c.value,
  }));

  const sortedCrops = [...cropList].sort((a, b) => b.value - a.value);
  const primaryCrop = sortedCrops[0];
  const suitableCount = cropList.filter((c) => c.value > 100).length;
  const activeCount = cropList.filter((c) => c.value > 0).length;
  const hasData = totalAll > 0;

  const formatNum = (num: number) => new Intl.NumberFormat("id-ID").format(num);
  const formatPct = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(val);

  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        {/* ===== Kepala Halaman ===== */}
        <header className="border-b border-slate-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-800">
            Bidang Hortikultura &amp; Perkebunan
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1.5">
            Kesesuaian Lahan Sayuran
          </h1>
          <p className="text-sm text-slate-700 mt-1 max-w-3xl">
            Pemetaan kecocokan lahan berdasarkan volume produksi riil 8 komoditas sayuran
            (Kentang, Kubis, Cabai, Tomat, Bawang, Petsai) per kecamatan Kabupaten Banjarnegara,
            dilengkapi indikator perubahan terhadap tahun sebelumnya.
          </p>
        </header>

        {/* ===== Panel Filter ===== */}
        <section className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="st-kec" className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Kecamatan
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <select
                  id="st-kec"
                  value={selectedKec}
                  onChange={(e) => setSelectedKec(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 appearance-none cursor-pointer"
                >
                  <option value="Semua Kecamatan">Semua Kecamatan (agregat kabupaten)</option>
                  {Array.from(new Set(vegData.map((d) => d.kecamatan)))
                    .sort((a, b) => a.localeCompare(b))
                    .map((kec) => (
                      <option key={kec} value={kec}>
                        {kec}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="st-year" className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Tahun
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <select
                  id="st-year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 appearance-none cursor-pointer"
                >
                  {years.map((yr) => (
                    <option key={yr} value={yr}>
                      {yearsWithData.has(yr) ? yr : `${yr} — tanpa data`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-3 border-t border-slate-100 pt-3">
            Menampilkan: <span className="text-slate-800 font-medium">
              {selectedKec === "Semua Kecamatan" ? "Seluruh kabupaten" : `Kecamatan ${selectedKec}`}
            </span>
            {" · "}<span className="text-slate-800 font-medium">Tahun {activeDataYear || "—"}</span>
            {prevData && (
              <>
                {" · "}<span className="text-slate-800 font-medium">dibandingkan dengan tahun {prevData.tahun}</span>
              </>
            )}
          </p>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white border border-slate-200 rounded-lg">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-800 rounded-full animate-spin" />
            <p className="text-sm text-slate-700">Memuat data sayuran…</p>
          </div>
        ) : !hasData ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            Tidak ada catatan produksi sayuran pada wilayah dan tahun terpilih.
            Pilih kombinasi kecamatan dan tahun lainnya.
          </div>
        ) : (
          <>
            {/* ===== Kartu Ringkasan ===== */}
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 border-l-4 border-l-blue-800 rounded-lg p-5">
                <div className="flex items-center gap-2.5 text-blue-800">
                  <TrendingUp size={16} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Total Produksi</p>
                </div>
                <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">
                  {formatNum(totalAll)} <span className="text-base font-medium text-slate-700">Ton</span>
                </p>
                <p className="text-xs mt-1.5">
                  {totalDeltaPct === null ? (
                    <span className="text-slate-600">Tahun {activeDataYear} · tidak ada pembanding</span>
                  ) : (
                    <span className={totalDeltaPct >= 0 ? "text-green-700" : "text-red-700"}>
                      {totalDeltaPct >= 0 ? "▲" : "▼"} {formatPct(Math.abs(totalDeltaPct))}% vs {prevData?.tahun}
                      {" · "}
                      <span className="text-slate-600">
                        {totalDeltaPct >= 0 ? "+" : "−"}
                        {formatNum(Math.abs(totalAll - prevTotal))} Ton
                      </span>
                    </span>
                  )}
                </p>
              </div>

              <div className="bg-white border border-slate-200 border-l-4 border-l-teal-700 rounded-lg p-5">
                <div className="flex items-center gap-2.5 text-teal-700">
                  <Award size={16} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Komoditas Dominan</p>
                </div>
                <p className="text-2xl font-semibold text-slate-900 mt-2">
                  {primaryCrop?.value > 0 ? primaryCrop.label : "—"}
                </p>
                <p className="text-xs text-slate-700 mt-1.5 tabular-nums">
                  {primaryCrop?.value > 0
                    ? `${formatNum(primaryCrop.value)} Ton · ${primaryCrop.pct.toFixed(1)}% dari total`
                    : "tidak ada data"}
                </p>
              </div>

              <div className="bg-white border border-slate-200 border-l-4 border-l-amber-600 rounded-lg p-5">
                <div className="flex items-center gap-2.5 text-amber-600">
                  <Sprout size={16} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Komoditas Aktif</p>
                </div>
                <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">
                  {activeCount} <span className="text-base font-medium text-slate-700">/ 8</span>
                </p>
                <p className="text-xs text-slate-700 mt-1.5">jenis sayuran dengan produksi tercatat</p>
              </div>

              <div className="bg-white border border-slate-200 border-l-4 border-l-purple-700 rounded-lg p-5">
                <div className="flex items-center gap-2.5 text-purple-700">
                  <Layers size={16} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Layak Ekspansi</p>
                </div>
                <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">
                  {suitableCount} <span className="text-base font-medium text-slate-700">komoditas</span>
                </p>
                <p className="text-xs text-slate-700 mt-1.5">produksi &gt; 100 Ton · sangat sesuai &gt; 1.000 Ton</p>
              </div>
            </section>

            {/* Peringatan fallback tahun */}
            {isFallbackYear && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                Data tahun <span className="font-semibold">{selectedYear}</span> tidak tersedia untuk wilayah ini —
                menampilkan tahun terbaru dengan data (<span className="font-semibold">{activeDataYear}</span>).
              </div>
            )}

            {/* ===== Grafik ===== */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Radar */}
              <div className="bg-white border border-slate-200 rounded-lg">
                <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900">Radar Karakteristik</h2>
                  <p className="text-xs text-slate-700 mt-0.5">
                    Sebaran hasil panen sayuran · Tahun {activeDataYear}
                  </p>
                </div>
                <div className="p-5">
                  <div className="h-[280px] w-full flex items-center justify-center">
                    {primaryCrop && primaryCrop.value > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                          <PolarGrid stroke="#cbd5e1" strokeOpacity={0.5} />
                          <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: "#1e293b", fontSize: 10 }}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, "auto"]}
                            tick={{ fill: "#475569", fontSize: 8 }}
                          />
                          <Radar
                            name="Produksi (Ton)"
                            dataKey="produksi"
                            stroke="#1d4ed8"
                            strokeWidth={2}
                            fill="#1d4ed8"
                            fillOpacity={0.15}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-slate-600">Tidak ada catatan produksi.</p>
                    )}
                  </div>
                  <div className="mt-2 pt-3 border-t border-slate-100 text-xs text-slate-700">
                    Kecamatan <span className="font-medium text-slate-900">{selectedKec}</span> —
                    produksi dominan{" "}
                    <span className="font-medium text-slate-900">
                      {primaryCrop?.value > 0 ? primaryCrop.label : "N/A"}
                    </span>
                    .
                  </div>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="bg-white border border-slate-200 rounded-lg lg:col-span-2">
                <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900">
                    Rincian Hasil Panen Sayuran (Ton)
                  </h2>
                  <p className="text-xs text-slate-700 mt-0.5">
                    Volume produksi riil per komoditas · Tahun {activeDataYear}
                    {selectedKec !== "Semua Kecamatan" && ` · Kecamatan ${selectedKec}`}
                  </p>
                </div>
                <div className="p-5">
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cropList} margin={{ top: 20, right: 10, left: 0, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                          dataKey="label"
                          angle={-30}
                          textAnchor="end"
                          interval={0}
                          height={50}
                          tick={{ fill: "#1e293b", fontSize: 11 }}
                        />
                        <YAxis width={60} tick={{ fill: "#1e293b", fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                        <Bar dataKey="value" name="Produksi (Ton)" radius={[3, 3, 0, 0]}>
                          {cropList.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                          <LabelList
                            dataKey="value"
                            position="top"
                            formatter={(v: any) => (v > 0 ? formatNum(Number(v)) : "")}
                            style={{ fill: "#1e293b", fontSize: 10 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>

            {/* ===== Matriks Kesesuaian ===== */}
            <section className="bg-white border border-slate-200 rounded-lg">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Matriks Kesesuaian Komoditas Aktual
                </h2>
                <p className="text-xs text-slate-700 mt-0.5">
                  Indeks kecocokan lahan berdasarkan produktivitas riil di lapangan · Tahun {activeDataYear}
                  {prevData && ` · dibandingkan tahun ${prevData.tahun}`}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                        Komoditas
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200 whitespace-nowrap">
                        Panen (Ton)
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200 whitespace-nowrap">
                        {prevData ? `Vs Tahun ${prevData.tahun}` : "Vs Tahun Lalu"}
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                        % Share
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                        Kesesuaian
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                        Rekomendasi Pengembangan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedCrops.map((crop, idx) => {
                      const status = getSuitabilityStatus(crop.value);
                      const rec = getRecommendation(crop.value);
                      const maxVal = sortedCrops[0]?.value || 1;
                      const barWidth = (crop.value / maxVal) * 100;

                      return (
                        <tr key={crop.key} className={`hover:bg-slate-50 ${idx < 1 && crop.value > 0 ? "bg-blue-50/30" : ""}`}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: crop.color }} />
                              <span className="text-slate-900 font-medium">{crop.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-800 tabular-nums">
                            {crop.value > 0 ? formatNum(crop.value) : "–"}
                          </td>
                          <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                            {prevData ? (
                              <DeltaCell value={crop.value} prevValue={crop.prevValue} />
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 justify-end">
                              <div className="w-20 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                                <div
                                  className={`h-full ${status.bar}`}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-700 w-10 text-right tabular-nums">
                                {crop.pct.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.badge}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-700 whitespace-normal max-w-xs leading-relaxed">
                            {rec}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                      <td className="px-4 py-3 text-slate-900">Total</td>
                      <td className="px-4 py-3 text-right text-slate-900 tabular-nums">
                        {formatNum(totalAll)}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {prevData ? (
                          totalDeltaPct === null ? (
                            <span className="text-slate-600">—</span>
                          ) : (
                            <span className={totalDeltaPct >= 0 ? "text-green-700" : "text-red-700"}>
                              {totalDeltaPct >= 0 ? "▲" : "▼"} {formatPct(Math.abs(totalDeltaPct))}%
                              {" · "}
                              <span className="text-slate-600">
                                {totalDeltaPct >= 0 ? "+" : "−"}
                                {formatNum(Math.abs(totalAll - prevTotal))} Ton
                              </span>
                            </span>
                          )
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 tabular-nums">100%</td>
                      <td className="px-4 py-3" colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ===== Catatan Sumber ===== */}
            <p className="text-xs text-slate-600 text-center pb-2">
              Sumber: Dinas Pertanian dan Ketahanan Pangan Kabupaten Banjarnegara,
              melalui Portal Open Data Banjarnegara (opendata.banjarnegarakab.go.id).
              Ambang kesesuaian: Sangat Sesuai &gt; 1.000 Ton, Cukup Sesuai &gt; 100 Ton.
            </p>
          </>
        )}
      </div>
    </DefaultLayout>
  );
}
