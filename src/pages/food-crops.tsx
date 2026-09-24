import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import { LoadingSpinner } from "@/components/ui";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchJagungUbiKayu, fetchKacangKedelai, fetchUbiKacangHijau, fetchPadiSawahLadang, FoodCropRow } from "@/services/api";
import { Wheat, Calendar, MapPin, FileSpreadsheet } from "lucide-react";

type Category = "padi" | "jagung-ubi" | "kacang-kedelai" | "ubi-kacanghijau";
type Metric = "luas" | "produksi" | "rata";

const CATEGORY_META: Record<Category, { label: string; sub: string }> = {
  "padi": { label: "Padi Sawah & Padi Ladang", sub: "Luas panen, produksi, dan rata-rata produksi padi" },
  "jagung-ubi": { label: "Jagung & Ubi Kayu", sub: "Luas panen, produksi, dan rata-rata produksi palawija" },
  "kacang-kedelai": { label: "Kacang Tanah & Kedelai", sub: "Luas panen, produksi, dan rata-rata produksi kacang-kacangan" },
  "ubi-kacanghijau": { label: "Ubi Jalar & Kacang Hijau", sub: "Luas panen, produksi, dan rata-rata produksi palawija" },
};

const METRIC_LABEL: Record<Metric, string> = {
  luas: "Luas Panen (Ha)",
  produksi: "Produksi (Ton)",
  rata: "Rata-rata Produksi (Ku/Ha)",
};

const METRIC_UNIT: Record<Metric, string> = {
  luas: "Ha",
  produksi: "Ton",
  rata: "Ku/Ha",
};

const METRIC_SHORT: Record<Metric, string> = {
  luas: "Luas Panen",
  produksi: "Produksi",
  rata: "Rata-rata Produksi",
};

// Palet warna formal: biru pemerintahan + warna pelengkap yang tenang
const COLORS = ["#1d4ed8", "#0d9488", "#b45309", "#be185d", "#6d28d9", "#4d7c0f"];

export default function FoodCropsPage() {
  const [padi, setPadi] = useState<FoodCropRow[]>([]);
  const [jagungUbi, setJagungUbi] = useState<FoodCropRow[]>([]);
  const [kacangKedelai, setKacangKedelai] = useState<FoodCropRow[]>([]);
  const [ubiKacangHijau, setUbiKacangHijau] = useState<FoodCropRow[]>([]);

  const [category, setCategory] = useState<Category>("padi");
  const [metric, setMetric] = useState<Metric>("produksi");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pd, ju, kk, ukh] = await Promise.all([
          fetchPadiSawahLadang(),
          fetchJagungUbiKayu(),
          fetchKacangKedelai(),
          fetchUbiKacangHijau(),
        ]);
        setPadi(pd);
        setJagungUbi(ju);
        setKacangKedelai(kk);
        setUbiKacangHijau(ukh);
      } catch (err) {
        console.error("Gagal memuat data tanaman pangan:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeData = useMemo(() => {
    if (category === "padi") return padi;
    if (category === "jagung-ubi") return jagungUbi;
    if (category === "kacang-kedelai") return kacangKedelai;
    return ubiKacangHijau;
  }, [category, padi, jagungUbi, kacangKedelai, ubiKacangHijau]);

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

  // Agregasi nilai metrik atas kumpulan baris. Khusus metrik "rata" dihitung
  // sebagai rata-rata tertimbang (Σ produksi kuintal ÷ Σ luas panen) karena
  // produktivitas (Ku/Ha) tidak boleh dijumlahkan antar kecamatan/komoditas.
  const agg = (rows: FoodCropRow[], komoditas?: string): number => {
    let luas = 0;
    let prod = 0;
    let sum = 0;
    rows.forEach((d) =>
      d.items.forEach((it) => {
        if (komoditas && it.komoditas !== komoditas) return;
        luas += it.luasPanen;
        prod += it.produksi;
        sum += metric === "luas" ? it.luasPanen : metric === "produksi" ? it.produksi : it.rataRata;
      })
    );
    if (metric === "rata") return luas > 0 ? (prod * 10) / luas : 0;
    return sum;
  };

  const stats = useMemo(() => {
    let topDistrict = "-";
    let topVal = 0;
    const breakdown = komoditasList.map((k) => {
      let luas = 0;
      let produksi = 0;
      filteredData.forEach((d) => {
        const it = d.items.find((i) => i.komoditas === k);
        luas += it?.luasPanen || 0;
        produksi += it?.produksi || 0;
      });
      return { name: k, value: agg(filteredData, k), luas, produksi };
    });

    // Kecamatan dengan nilai metrik tertinggi (rata-rata tertimbang bila metrik "rata")
    const byKec = new Map<string, FoodCropRow[]>();
    filteredData.forEach((d) => {
      byKec.set(d.kecamatan, [...(byKec.get(d.kecamatan) || []), d]);
    });
    byKec.forEach((rows, kec) => {
      const v = agg(rows);
      if (v > topVal) {
        topVal = v;
        topDistrict = kec;
      }
    });

    return { total: agg(filteredData), topDistrict, topVal, breakdown };
  }, [filteredData, komoditasList, metric]);

  // Data grafik per kecamatan (kolom "total" memakai agregasi tertimbang utk "rata")
  const chartData = useMemo(() => {
    return filteredData
      .map((d) => {
        const obj: any = { name: d.kecamatan };
        komoditasList.forEach((k) => {
          obj[k] = getVal(d, k);
        });
        obj.total = agg([d]);
        return obj;
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredData, komoditasList, metric]);

  // Tren historis per tahun — metrik "rata" memakai rata-rata tertimbang
  const trendData = useMemo(() => {
    const base = selectedKecamatan === "Semua"
      ? activeData
      : activeData.filter((d) => d.kecamatan === selectedKecamatan);

    const acc = new Map<
      string,
      { luas: number; prod: number; luasK: Record<string, number>; prodK: Record<string, number> }
    >();
    base.forEach((d) => {
      const yr = d.tahun;
      if (!yr) return;
      let e = acc.get(yr);
      if (!e) {
        const luasK: Record<string, number> = {};
        const prodK: Record<string, number> = {};
        komoditasList.forEach((k) => {
          luasK[k] = 0;
          prodK[k] = 0;
        });
        e = { luas: 0, prod: 0, luasK, prodK };
        acc.set(yr, e);
      }
      d.items.forEach((it) => {
        e.luas += it.luasPanen;
        e.prod += it.produksi;
        if (e.luasK[it.komoditas] !== undefined) {
          e.luasK[it.komoditas] += it.luasPanen;
          e.prodK[it.komoditas] += it.produksi;
        }
      });
    });

    const weighted = (prod: number, luas: number) => (luas > 0 ? (prod * 10) / luas : 0);

    return Array.from(acc.entries())
      .map(([yr, e]) => {
        const obj: any = { tahun: yr };
        komoditasList.forEach((k) => {
          obj[k] =
            metric === "luas"
              ? e.luasK[k]
              : metric === "produksi"
                ? e.prodK[k]
                : weighted(e.prodK[k], e.luasK[k]);
        });
        obj.total =
          metric === "luas" ? e.luas : metric === "produksi" ? e.prod : weighted(e.prod, e.luas);
        return obj;
      })
      .sort((a, b) => a.tahun.localeCompare(b.tahun));
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

  // Ranking kecamatan kumulatif seluruh tahun — "rata" memakai rata-rata tertimbang
  const kecamatanRanking = useMemo(() => {
    const base = selectedKecamatan === "Semua"
      ? activeData
      : activeData.filter((d) => d.kecamatan === selectedKecamatan);

    const acc = new Map<string, { luas: number; prod: number }>();
    base.forEach((d) => {
      let e = acc.get(d.kecamatan);
      if (!e) {
        e = { luas: 0, prod: 0 };
        acc.set(d.kecamatan, e);
      }
      d.items.forEach((it) => {
        e.luas += it.luasPanen;
        e.prod += it.produksi;
      });
    });

    return Array.from(acc.entries())
      .map(([name, e]) => ({
        name,
        value:
          metric === "luas"
            ? e.luas
            : metric === "produksi"
              ? e.prod
              : e.luas > 0
                ? (e.prod * 10) / e.luas
                : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeData, selectedKecamatan, metric]);

  const formatNum = (num: number) =>
    new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: metric === "rata" ? 2 : 0,
    }).format(num);

  const formatPct = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(val);

  const unit = METRIC_UNIT[metric];

  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        {/* ===== Kepala Halaman ===== */}
        <header className="border-b border-slate-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-800">
            Bidang Tanaman Pangan
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1.5">
            Tanaman Pangan (Padi & Palawija)
          </h1>
          <p className="text-sm text-slate-700 mt-1 max-w-3xl">
            Data luas panen, produksi, dan rata-rata produksi tanaman pangan — Padi
            Sawah, Padi Ladang, serta palawija (Jagung, Ubi Kayu, Kacang Tanah,
            Kedelai, Ubi Jalar, Kacang Hijau) per kecamatan Kabupaten Banjarnegara.
          </p>
        </header>

        {/* ===== Panel Filter ===== */}
        <section className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Komoditas */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Kelompok Komoditas
              </label>
              <div className="flex rounded-md border border-slate-300 overflow-hidden bg-white">
                {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`flex-1 py-2 px-2 text-xs font-medium transition-colors ${
                      category === c
                        ? "bg-blue-800 text-white"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {c === "padi"
                      ? "Padi Sawah·Ladang"
                      : c === "jagung-ubi"
                        ? "Jagung·Ubi Kayu"
                        : c === "kacang-kedelai"
                          ? "Kacang·Kedelai"
                          : "Ubi Jalar·K.Hijau"}
                  </button>
                ))}
              </div>
            </div>

            {/* Metrik */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Indikator
              </label>
              <div className="flex rounded-md border border-slate-300 overflow-hidden bg-white">
                {(["luas", "produksi", "rata"] as Metric[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={`flex-1 py-2 px-2 text-xs font-medium transition-colors ${
                      metric === m
                        ? "bg-blue-800 text-white"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {METRIC_SHORT[m]}
                  </button>
                ))}
              </div>
            </div>

            {/* Tahun */}
            <div>
              <label htmlFor="fc-year" className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Tahun
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
                <select
                  id="fc-year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 appearance-none cursor-pointer"
                >
                  {yearsList.map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Kecamatan */}
            <div>
              <label htmlFor="fc-kec" className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Kecamatan
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
                <select
                  id="fc-kec"
                  value={selectedKecamatan}
                  onChange={(e) => setSelectedKecamatan(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 appearance-none cursor-pointer"
                >
                  {uniqueKecamatan.map((kec) => (
                    <option key={kec} value={kec}>{kec}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-3 border-t border-slate-100 pt-3">
            Menampilkan: <span className="text-slate-800 font-medium">{CATEGORY_META[category].label}</span>
            {" · "}<span className="text-slate-800 font-medium">{METRIC_LABEL[metric]}</span>
            {" · "}<span className="text-slate-800 font-medium">{selectedYear || "—"}</span>
            {" · "}<span className="text-slate-800 font-medium">{selectedKecamatan}</span>
          </p>
        </section>

        {loading ? (
          <LoadingSpinner label="Memuat data tanaman pangan…" />
        ) : (
          <>
            {/* ===== Kartu Ringkasan ===== */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 border-l-4 border-l-blue-800 rounded-lg p-5">
                <div className="flex items-center gap-2.5 text-blue-800">
                  <Wheat size={16} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {metric === "rata" ? "Rata-rata Produksi Tertimbang" : `Total ${METRIC_SHORT[metric]}`}
                  </p>
                </div>
                <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">
                  {formatNum(stats.total)}
                </p>
                <p className="text-xs text-slate-700 mt-1.5">
                  {unit} · {CATEGORY_META[category].label} · {selectedYear}
                  {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : " · Seluruh kecamatan"}
                  {metric === "rata" ? " · Σ produksi ÷ Σ luas panen" : ""}
                </p>
              </div>

              <div className="bg-white border border-slate-200 border-l-4 border-l-teal-700 rounded-lg p-5">
                <div className="flex items-center gap-2.5 text-teal-700">
                  <MapPin size={16} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Kecamatan Tertinggi
                  </p>
                </div>
                <p className="text-2xl font-semibold text-slate-900 mt-2">
                  {stats.topDistrict}
                </p>
                <p className="text-xs text-slate-700 mt-1.5 tabular-nums">
                  {formatNum(stats.topVal)} {unit} · {selectedYear}
                </p>
              </div>

              <div className="bg-white border border-slate-200 border-l-4 border-l-amber-600 rounded-lg p-5">
                <div className="flex items-center gap-2.5 text-amber-600">
                  <FileSpreadsheet size={16} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Komposisi Komoditas
                  </p>
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {stats.breakdown.map((item, idx) => {
                    // Untuk metrik "rata", komposisi dihitung dari tonase produksi
                    // (bukan jumlah produktivitas yang tidak bermakna bila dijumlahkan)
                    const refTotal =
                      metric === "rata"
                        ? stats.breakdown.reduce((s, b) => s + b.produksi, 0)
                        : stats.total;
                    const refVal = metric === "rata" ? item.produksi : item.value;
                    const pct = refTotal > 0 ? (refVal / refTotal) * 100 : 0;
                    return (
                      <div
                        key={item.name}
                        className="flex items-center gap-2 text-xs"
                        title={`${item.name}: ${formatNum(item.value)} ${unit}`}
                      >
                        <span className="w-24 shrink-0 text-slate-800 truncate">{item.name}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-sm overflow-hidden">
                          <div
                            className="h-full"
                            style={{ width: `${pct}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                        </div>
                        <span className="w-12 text-right font-medium text-slate-900 tabular-nums">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ===== Grafik Sebaran ===== */}
            <section className="bg-white border border-slate-200 rounded-lg">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Sebaran {METRIC_SHORT[metric]} per Kecamatan
                </h2>
                <p className="text-xs text-slate-700 mt-0.5">
                  {METRIC_LABEL[metric]} · Tahun {selectedYear}
                </p>
              </div>
              <div className="p-5">
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#1e293b", fontSize: 11 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis
                        width={70}
                        tick={{ fill: "#1e293b", fontSize: 11 }}
                        tickFormatter={(v) => formatNum(v)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          fontSize: 12,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        }}
                        formatter={(value: any, name: any) => [formatNum(Number(value)), String(name ?? "")]}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                      {komoditasList.map((k, idx) => (
                        <Bar
                          key={k}
                          dataKey={k}
                          stackId={metric === "rata" ? undefined : "a"}
                          fill={COLORS[idx % COLORS.length]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* ===== Tren & Proyeksi ===== */}
            <section className="bg-white border border-slate-200 rounded-lg">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Tren {METRIC_SHORT[metric]} — {CATEGORY_META[category].label}
                  </h2>
                  <p className="text-xs text-slate-700 mt-0.5">
                    {selectedKecamatan !== "Semua" ? `Kecamatan ${selectedKecamatan}` : "Seluruh Kabupaten Banjarnegara"}
                    {" · "}
                    {yearsList.length > 0 && `${yearsList[yearsList.length - 1]}–${yearsList[0]}`}
                  </p>
                </div>
                {cagrData && (
                  <div className="text-right">
                    <p className="text-xs text-slate-700 uppercase tracking-wide">CAGR {cagrData.periode}</p>
                    <p className={`text-lg font-semibold tabular-nums ${
                      cagrData.total === null ? "text-slate-600" : cagrData.total >= 0 ? "text-green-700" : "text-red-700"
                    }`}>
                      {cagrData.total === null
                        ? "N/A"
                        : `${cagrData.total >= 0 ? "▲" : "▼"} ${formatPct(Math.abs(cagrData.total))}% / tahun`}
                    </p>
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendWithProjection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="tahun" tick={{ fill: "#1e293b", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#1e293b", fontSize: 11 }} tickFormatter={(v) => formatNum(v)} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          fontSize: 12,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        }}
                        formatter={(value: any, name: any) => [formatNum(Number(value)), String(name ?? "")]}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke="#1e3a8a"
                        strokeWidth={2.5}
                        dot={{ fill: "#1e3a8a", r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="proyeksi"
                        name="Proyeksi (tren)"
                        stroke="#dc2626"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={{ fill: "#dc2626", r: 3, strokeDasharray: "0" }}
                        connectNulls={true}
                      />
                      {komoditasList.map((k, idx) => (
                        <Line
                          key={k}
                          type="monotone"
                          dataKey={k}
                          stroke={COLORS[idx % COLORS.length]}
                          strokeWidth={1.5}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {projection && (
                  <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border border-slate-200 rounded-md overflow-hidden bg-white">
                    <div className="p-4">
                      <dt className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                        Prediksi {projection.nextYear} ({unit})
                      </dt>
                      <dd className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">
                        {formatNum(projection.predicted)}
                      </dd>
                    </div>
                    <div className="p-4">
                      <dt className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                        Perubahan vs {projection.lastTahun}
                      </dt>
                      <dd className={`text-xl font-semibold mt-1 tabular-nums ${
                        projection.deltaPct === null
                          ? "text-slate-600"
                          : projection.deltaPct >= 0
                          ? "text-green-700"
                          : "text-red-700"
                      }`}>
                        {projection.deltaPct === null
                          ? "N/A"
                          : `${projection.deltaPct >= 0 ? "▲" : "▼"} ${formatPct(Math.abs(projection.deltaPct))}%`}
                      </dd>
                    </div>
                    <div className="p-4">
                      <dt className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                        Keandalan Model (R²)
                      </dt>
                      <dd className={`text-xl font-semibold mt-1 tabular-nums ${
                        projection.r2 >= 0.7 ? "text-green-700" : projection.r2 >= 0.4 ? "text-amber-600" : "text-red-700"
                      }`}>
                        {formatPct(projection.r2 * 100)}%
                      </dd>
                    </div>
                  </dl>
                )}
                {projection && (
                  <p className="text-xs text-slate-600 mt-2">
                    * Proyeksi menggunakan model regresi linier (kuadrat terkecil) atas tren historis;
                    garis putus-putus merah pada grafik menunjukkan estimasi {projection.nextYear}.
                  </p>
                )}
              </div>
            </section>

            {/* ===== CAGR per Komoditas ===== */}
            {cagrData && (
              <section className="bg-white border border-slate-200 rounded-lg">
                <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900">
                    Laju Pertumbuhan Tahunan (CAGR) per Komoditas
                  </h2>
                  <p className="text-xs text-slate-700 mt-0.5">
                    Periode {cagrData.periode} · {cagrData.years} tahun
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-800">
                        <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                          Komoditas
                        </th>
                        <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                          CAGR / Tahun
                        </th>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                          Arah Tren
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-blue-50/40 font-semibold">
                        <td className="px-5 py-2.5 text-slate-900">Total Gabungan</td>
                        <td className={`px-5 py-2.5 text-right tabular-nums ${
                          cagrData.total === null ? "text-slate-600" : cagrData.total >= 0 ? "text-green-700" : "text-red-700"
                        }`}>
                          {cagrData.total === null
                            ? "N/A"
                            : `${cagrData.total >= 0 ? "+" : "−"}${formatPct(Math.abs(cagrData.total))}%`}
                        </td>
                        <td className="px-5 py-2.5 text-slate-800">
                          {cagrData.total === null ? "—" : cagrData.total >= 0 ? "Meningkat" : "Menurun"}
                        </td>
                      </tr>
                      {cagrData.items.map((item) => (
                        <tr key={item.name} className="hover:bg-slate-50">
                          <td className="px-5 py-2.5 text-slate-900">{item.name}</td>
                          <td className={`px-5 py-2.5 text-right tabular-nums ${
                            item.cagr === null ? "text-slate-600" : item.cagr >= 0 ? "text-green-700" : "text-red-700"
                          }`}>
                            {item.cagr === null
                              ? "N/A"
                              : `${item.cagr >= 0 ? "+" : "−"}${formatPct(Math.abs(item.cagr))}%`}
                          </td>
                          <td className="px-5 py-2.5 text-slate-800">
                            {item.cagr === null ? "—" : item.cagr >= 0 ? "Meningkat" : "Menurun"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ===== Peringkat Kecamatan ===== */}
            <section className="bg-white border border-slate-200 rounded-lg">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Peringkat Kecamatan
                </h2>
                <p className="text-xs text-slate-700 mt-0.5">
                  Kumulatif {METRIC_SHORT[metric]} ·{" "}
                  {yearsList.length > 0 && `${yearsList[yearsList.length - 1]}–${yearsList[0]}`}
                  {" · "}
                  {selectedKecamatan !== "Semua" ? `Kecamatan ${selectedKecamatan}` : "Seluruh kecamatan (10 teratas)"}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200 w-20">
                        Peringkat
                      </th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                        Kecamatan
                      </th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                        Total {METRIC_SHORT[metric]} ({unit})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kecamatanRanking.slice(0, 10).map((item, idx) => (
                      <tr
                        key={item.name}
                        className={`hover:bg-slate-50 ${idx < 3 ? "bg-blue-50/30" : ""}`}
                      >
                        <td className="px-5 py-2.5 tabular-nums">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-sm text-xs font-semibold ${
                            idx < 3 ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-800"
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-slate-900 font-medium">{item.name}</td>
                        <td className="px-5 py-2.5 text-right text-slate-900 tabular-nums">
                          {formatNum(item.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ===== Tabel Rincian ===== */}
            <section className="bg-white border border-slate-200 rounded-lg">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Tabel Rincian Data per Kecamatan
                </h2>
                <p className="text-xs text-slate-700 mt-0.5">
                  {METRIC_LABEL[metric]} · Tahun {selectedYear}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200 w-12">
                        No
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                        Kecamatan
                      </th>
                      {komoditasList.map((k) => (
                        <th
                          key={k}
                          className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200 whitespace-nowrap"
                        >
                          {k} ({unit})
                        </th>
                      ))}
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200 whitespace-nowrap bg-slate-100">
                        Total ({unit})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chartData.map((row, idx) => (
                      <tr key={row.name} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-600 tabular-nums">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-slate-900 font-medium">{row.name}</td>
                        {komoditasList.map((k) => (
                          <td key={k} className="px-4 py-2.5 text-right text-slate-800 tabular-nums">
                            {formatNum(row[k] || 0)}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-900 tabular-nums bg-slate-50">
                          {formatNum(row.total)}
                        </td>
                      </tr>
                    ))}
                    {chartData.length > 0 && (
                      <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-slate-900">
                          {selectedKecamatan === "Semua" ? "Kabupaten Banjarnegara" : `Kecamatan ${selectedKecamatan}`}
                        </td>
                        {komoditasList.map((k) => (
                          <td key={k} className="px-4 py-3 text-right text-slate-900 tabular-nums">
                            {formatNum(agg(filteredData, k))}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right text-slate-900 tabular-nums">
                          {formatNum(agg(filteredData))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ===== Catatan Sumber ===== */}
            <p className="text-xs text-slate-600 text-center pb-2">
              Sumber: Dinas Pertanian dan Ketahanan Pangan Kabupaten Banjarnegara,
              melalui Portal Open Data Banjarnegara (opendata.banjarnegarakab.go.id).
            </p>
          </>
        )}
      </div>
    </DefaultLayout>
  );
}
