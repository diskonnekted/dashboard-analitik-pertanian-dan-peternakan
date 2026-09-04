import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { fetchKelompokTani, KelompokTaniRow, clearLocalStorageByPattern } from "@/services/api";
import { Calendar, TrendingUp, Filter, FileSpreadsheet, ShieldAlert } from "lucide-react";

const KECAMATAN_LIST = [
  "Banjarmangu",
  "Banjarnegara",
  "Batur",
  "Bawang",
  "Kalibening",
  "Karangkobar",
  "Madukara",
  "Mandiraja",
  "Pagedongan",
  "Pagentan",
  "Pandanarum",
  "Pejawaran",
  "Punggelan",
  "Purwanegara",
  "Purwareja Klampok",
  "Rakit",
  "Sigaluh",
  "Susukan",
  "Wanadadi",
  "Wanayasa"
];

// Prediksi sederhana dengan regresi linier least-squares
function linearPredict(points: { x: number; y: number }[], targetX: number): number {
  const n = points.length;
  if (n === 0) return 0;
  if (n === 1) return Math.round(points[0].y);
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return Math.max(0, Math.round(slope * targetX + intercept));
}

export default function FarmersPage() {
  const [rawData, setRawData] = useState<KelompokTaniRow[]>([]);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [loading, setLoading] = useState<boolean>(true);
  const [reloading, setReloading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoadError(null);
      try {
        const data = await fetchKelompokTani();
        setRawData(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Gagal memuat data kelompok tani:", err);
        setLoadError(msg);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Setelah data dimuat, set default tahun ke tahun terbaru yang punya data aktual
  useEffect(() => {
    if (!loading && selectedYear === null) {
      const dataYears = rawData
        .map((d) => d.tahun)
        .filter((y) => y && /^\d{4}$/.test(y) && parseInt(y) <= 2025);
      const distinct = Array.from(new Set(dataYears)).sort((a, b) =>
        b.localeCompare(a),
      );
      if (distinct.length > 0) {
        setSelectedYear(distinct[0]);
      }
    }
  }, [loading, rawData, selectedYear]);

  // Tombol muat ulang: bersihkan cache localStorage untuk kunci kelompok tani, lalu ambil ulang
  const handleReload = () => {
    if (reloading) return;
    setReloading(true);
    clearLocalStorageByPattern("kelompok_tani");
    setLoading(true);
    setRawData([]);
    setLoadError(null);
    (async () => {
      try {
        const data = await fetchKelompokTani();
        setRawData(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Gagal memuat ulang data kelompok tani:", err);
        setLoadError(msg);
      } finally {
        setLoading(false);
        setReloading(false);
      }
    })();
  };

  // Format nama kecamatan agar proporsional
  const formatKecName = (name: string) => {
    return name || "Unknown";
  };

  // Daftar tahun unik (gabungan fallback tahun hardcode + tahun dari data)
  const yearsList = useMemo(() => {
    const knownYears = ["2025", "2024", "2023", "2022"];
    const fromData = rawData
      .map((d) => d.tahun)
      .filter(Boolean)
      .filter((y) => /^\d{4}$/.test(y));
    const merged = Array.from(new Set([...knownYears, ...fromData])).sort((a, b) =>
      b.localeCompare(a),
    );
    return merged;
  }, [rawData]);

  useEffect(() => {
    if (selectedYear !== null && yearsList.length > 0 && !yearsList.includes(selectedYear)) {
      setSelectedYear(yearsList[0]);
    }
  }, [yearsList, selectedYear]);

  // Data per tahun terpilih
  const currentYearData = useMemo(() => {
    return rawData.filter((d) => d.tahun === selectedYear);
  }, [rawData, selectedYear]);

  // Daftar kecamatan unik (20 kecamatan Kabupaten Banjarnegara)
  const uniqueKecamatan = useMemo(() => {
    return ["Semua", ...KECAMATAN_LIST];
  }, []);

  // Data disaring berdasarkan kecamatan terpilih
  const filteredData = useMemo(() => {
    return selectedKecamatan === "Semua"
      ? currentYearData
      : currentYearData.filter((d) => formatKecName(d.kecamatan) === selectedKecamatan);
  }, [currentYearData, selectedKecamatan]);

  // Statistik Utama
  const stats = useMemo(() => {
    let totalKelompokTani = 0;
    let totalAnggotaTani = 0;
    let totalKelompokPerikanan = 0;
    let totalAnggotaPerikanan = 0;
    let totalGapoktan = 0;
    let totalAnggotaGapoktan = 0;
    let totalKelompokTaniHutan = 0;

    let maxGroups = -1;
    let topDistrict = "-";

    // Agregasi kelompok per kecamatan
    const kecGroupsMap = new Map<string, number>();

    filteredData.forEach((d) => {
      totalKelompokTani += d.kelompokTani;
      totalAnggotaTani += d.anggotaTani;
      totalKelompokPerikanan += d.kelompokPerikanan;
      totalAnggotaPerikanan += d.anggotaPerikanan;
      totalGapoktan += d.gapoktan;
      totalAnggotaGapoktan += d.anggotaGapoktan;
      totalKelompokTaniHutan += d.kelompokTaniHutan || 0;

      const normKec = formatKecName(d.kecamatan);
      const sumGroups = d.kelompokTani + d.kelompokPerikanan + d.gapoktan + (d.kelompokTaniHutan || 0);
      kecGroupsMap.set(normKec, (kecGroupsMap.get(normKec) || 0) + sumGroups);
    });

    kecGroupsMap.forEach((val, key) => {
      if (val > maxGroups) {
        maxGroups = val;
        topDistrict = key;
      }
    });

    return {
      kelompokTani: totalKelompokTani,
      anggotaTani: totalAnggotaTani,
      kelompokPerikanan: totalKelompokPerikanan,
      anggotaPerikanan: totalAnggotaPerikanan,
      gapoktan: totalGapoktan,
      anggotaGapoktan: totalAnggotaGapoktan,
      kelompokTaniHutan: totalKelompokTaniHutan,
      topDistrict,
      maxGroups,
    };
  }, [filteredData]);

  // Agregasi Data per Kecamatan untuk Grafik Sebaran
  const chartData = useMemo(() => {
    const kecMap = new Map<string, any>();

    filteredData.forEach((d) => {
      const kecName = formatKecName(d.kecamatan);
      if (!kecMap.has(kecName)) {
        kecMap.set(kecName, {
          name: kecName,
          "Kelompok Tani": 0,
          "Anggota Tani": 0,
          "Kelompok Perikanan": 0,
          "Anggota Perikanan": 0,
          Gapoktan: 0,
          "Anggota Gapoktan": 0,
          "Kelompok Tani Hutan": 0,
          totalKelompok: 0,
        });
      }

      const entry = kecMap.get(kecName);
      entry["Kelompok Tani"] += d.kelompokTani;
      entry["Anggota Tani"] += d.anggotaTani;
      entry["Kelompok Perikanan"] += d.kelompokPerikanan;
      entry["Anggota Perikanan"] += d.anggotaPerikanan;
      entry.Gapoktan += d.gapoktan;
      entry["Anggota Gapoktan"] += d.anggotaGapoktan;
      entry["Kelompok Tani Hutan"] += d.kelompokTaniHutan || 0;
      entry.totalKelompok += (d.kelompokTani + d.kelompokPerikanan + d.gapoktan + (d.kelompokTaniHutan || 0));
    });

    return Array.from(kecMap.values()).sort((a, b) => b.totalKelompok - a.totalKelompok);
  }, [filteredData]);

  // Tren Historis Kelembagaan Tani (data aktual + prediksi 2026)
  const trendData = useMemo(() => {
    const base = selectedKecamatan === "Semua"
      ? rawData
      : rawData.filter((d) => formatKecName(d.kecamatan) === selectedKecamatan);

    const byYear = new Map<string, any>();

    base.forEach((d) => {
      const yr = d.tahun;
      if (!yr) return;
      // Hanya data aktual sampai 2025
      if (parseInt(yr) > 2025) return;

      if (!byYear.has(yr)) {
        byYear.set(yr, {
          tahun: yr,
          "Kelompok Tani": 0,
          "Anggota Tani": 0,
          "Kelompok Perikanan": 0,
          "Anggota Perikanan": 0,
          Gapoktan: 0,
          "Anggota Gapoktan": 0,
          totalKelompok: 0,
          totalAnggota: 0,
          isPrediction: false,
        });
      }

      const entry = byYear.get(yr);
      entry["Kelompok Tani"] += d.kelompokTani;
      entry["Anggota Tani"] += d.anggotaTani;
      entry["Kelompok Perikanan"] += d.kelompokPerikanan;
      entry["Anggota Perikanan"] += d.anggotaPerikanan;
      entry.Gapoktan += d.gapoktan;
      entry["Anggota Gapoktan"] += d.anggotaGapoktan;
      entry.totalKelompok += (d.kelompokTani + d.kelompokPerikanan + d.gapoktan);
      entry.totalAnggota += (d.anggotaTani + d.anggotaPerikanan + d.anggotaGapoktan);
    });

    const sorted = Array.from(byYear.values()).sort((a, b) => a.tahun.localeCompare(b.tahun));

    // Hanya tambah prediksi 2026 jika belum ada data aktual 2026 dan minimal 3 tahun aktual
    const hasActual2026 = sorted.some((d) => d.tahun === "2026" && !d.isPrediction);
    if (!hasActual2026 && sorted.length >= 3) {
      const metrics = ["totalAnggota", "Anggota Tani", "Anggota Perikanan", "Anggota Gapoktan", "Kelompok Tani", "Kelompok Perikanan", "Gapoktan", "totalKelompok"];
      const predictedEntry: any = { tahun: "2026", isPrediction: true };
      metrics.forEach((m) => {
        predictedEntry[m] = linearPredict(
          sorted.map((d) => ({ x: parseInt(d.tahun), y: d[m] })),
          2026
        );
      });
      sorted.push(predictedEntry);
    }

    return sorted;
  }, [rawData, selectedKecamatan]);

  const formatNum = (num: number) => {
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num);
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-200 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="text-2xl sm:text-4xl leading-tight font-bold tracking-tight text-slate-800">
            Kelembagaan Petani & Gapoktan
          </h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-2 max-w-2xl border-l-2 border-blue-500 pl-3">
            Pemantauan Kemitraan, Kelompok Tani (Poktan), Kelompok Perikanan (Pokkan), dan Gapoktan Kabupaten Banjarnegara.
          </p>
          </div>
          <div className="w-full md:w-48 lg:w-64 shrink-0 flex items-center justify-center">
            <img
              src="/img/farmers.png"
              alt="Kelembagaan Tani"
              className="w-full max-h-32 md:max-h-36 object-contain"
            />
          </div>
        </section>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-slate-200 p-6 shadow-sm text-left transition-all duration-300 hover:shadow-md">
          {/* Tahun */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-bold uppercase text-slate-500">Tahun Data</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
              <select
                value={selectedYear ?? ""}
                onChange={(e) => setSelectedYear(e.target.value)}
                disabled={selectedYear === null}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 font-mono text-sm font-bold bg-white focus:outline-none appearance-none cursor-pointer rounded-xl disabled:opacity-50 disabled:cursor-wait"
              >
                {yearsList.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Kecamatan */}
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
                  <option key={kec} value={kec}>
                    {kec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Aksi: Muat Ulang */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-bold uppercase text-slate-500">Sinkronisasi</label>
            <button
              type="button"
              onClick={handleReload}
              disabled={loading || reloading}
              className="inline-flex items-center justify-center gap-2 w-full pl-3 pr-4 h-[38px] border border-slate-200 font-mono text-sm font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {reloading ? "Memuat…" : "Muat Ulang Data"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-slate-500 font-mono font-bold animate-pulse uppercase">
              Mengekstrak data dari CKAN Open Data...
            </p>
          </div>
        ) : loadError && rawData.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 h-[300px] bg-rose-50 border border-rose-200 p-8 rounded-xl">
            <ShieldAlert className="h-10 w-10 text-rose-600" />
            <div className="text-center">
              <h3 className="text-lg font-mono font-bold uppercase text-rose-900">
                Gagal Memuat Data
              </h3>
              <p className="text-sm text-rose-700 mt-2 font-mono">
                {loadError}
              </p>
              <p className="text-xs text-rose-600 mt-3 font-mono">
                Periksa koneksi internet Anda lalu coba muat ulang.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReload}
              disabled={reloading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold uppercase text-sm rounded-lg transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {reloading ? "Memuat…" : "Coba Lagi"}
            </button>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              {/* Stat 1: Kelompok Tani */}
              <div className="bg-amber-50 border border-slate-200 p-5 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md">
                <div>
                  <h5 className="text-[10px] font-mono font-bold text-slate-500 uppercase">Kelompok Tani (Poktan)</h5>
                  <h3 className="text-2xl font-serif font-black uppercase text-slate-800 mt-1">
                    {formatNum(stats.kelompokTani)} <span className="text-xs font-mono font-normal lowercase">unit</span>
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-amber-700 mt-2">
                    {formatNum(stats.anggotaTani)} anggota terdaftar
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-200 text-[9px] font-mono text-slate-400 uppercase">
                  Poktan Pertanian / Pekebun
                </div>
              </div>

              {/* Stat 2: Kelompok Perikanan */}
              <div className="bg-blue-50 border border-slate-200 p-5 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md">
                <div>
                  <h5 className="text-[10px] font-mono font-bold text-slate-500 uppercase">Kelompok Perikanan (Pokkan)</h5>
                  <h3 className="text-2xl font-serif font-black uppercase text-slate-800 mt-1">
                    {formatNum(stats.kelompokPerikanan)} <span className="text-xs font-mono font-normal lowercase">unit</span>
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-blue-700 mt-2">
                    {formatNum(stats.anggotaPerikanan)} anggota terdaftar
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-200 text-[9px] font-mono text-slate-400 uppercase">
                  Pembudidaya Ikan lokal
                </div>
              </div>

              {/* Stat 3: Gapoktan */}
              <div className="bg-emerald-50 border border-slate-200 p-5 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md">
                <div>
                  <h5 className="text-[10px] font-mono font-bold text-slate-500 uppercase">Gabungan Poktan (Gapoktan)</h5>
                  <h3 className="text-2xl font-serif font-black uppercase text-slate-800 mt-1">
                    {formatNum(stats.gapoktan)} <span className="text-xs font-mono font-normal lowercase">gabungan</span>
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-emerald-700 mt-2">
                    {formatNum(stats.anggotaGapoktan)} pengurus/anggota
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-200 text-[9px] font-mono text-slate-400 uppercase">
                  Aliansi Poktan Tingkat Desa
                </div>
              </div>

              {/* Stat 4: Kelompok Tani Hutan */}
              <div className="bg-green-50 border border-slate-200 p-5 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md">
                <div>
                  <h5 className="text-[10px] font-mono font-bold text-slate-500 uppercase">Kelompok Tani Hutan</h5>
                  <h3 className="text-2xl font-serif font-black uppercase text-slate-800 mt-1">
                    {formatNum(stats.kelompokTaniHutan)} <span className="text-xs font-mono font-normal lowercase">unit</span>
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-green-700 mt-2">
                    Data pelengkap dari SIMLUH KTH
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-200 text-[9px] font-mono text-slate-400 uppercase">
                  Kelompok tani hutan terdata
                </div>
              </div>
            </div>

            {/* Time-Series Trend */}
            <div className="bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="mb-4 text-left border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <TrendingUp className="text-amber-600" />
                  Tren Keanggotaan Lembaga Tani ({(() => {
                    const actuals = trendData.filter((d) => !d.isPrediction);
                    if (actuals.length === 0) return "";
                    return `${actuals[0].tahun}–${actuals[actuals.length - 1].tahun}`;
                  })()})
                  {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                </h4>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-md text-[10px] font-mono font-bold text-amber-700 uppercase">
                  <TrendingUp size={11} /> 2026: Prediksi Regresi Linier
                </span>
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} vertical={false} />
                    <XAxis
                      dataKey="tahun"
                      tick={{ fill: "#475569", fontSize: 11, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                    />
                    <YAxis
                      tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                      tickFormatter={(v) => formatNum(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        fontFamily: "monospace",
                        fontSize: "12px",
                        fontWeight: "bold",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: any, name: any, props: any) => {
                        const label = props?.payload?.isPrediction ? `${name} (Prediksi)` : name;
                        return [formatNum(Number(value)), label];
                      }}
                      labelFormatter={(label: any, payload: any) => {
                        if (payload?.[0]?.payload?.isPrediction) return `${label} (Prediksi)`;
                        return label;
                      }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontSize: "10px", fontWeight: "bold" }} />
                    <ReferenceLine x="2026" stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity={0.5} label={{ value: "Prediksi", position: "top", fill: "#d97706", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }} />
                    <Line type="monotone" dataKey="totalAnggota" name="Total Anggota (Jiwa)" stroke="#64748b" strokeWidth={3} dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload?.isPrediction) return <circle cx={cx} cy={cy} r={6} fill="#fff" stroke="#64748b" strokeWidth={2} />;
                      return <circle cx={cx} cy={cy} r={4} fill="#475569" />;
                    }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Anggota Tani" name="Anggota Poktan" stroke="#d97706" strokeWidth={2} dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload?.isPrediction) return <circle cx={cx} cy={cy} r={5} fill="#fff" stroke="#d97706" strokeWidth={2} />;
                      return false;
                    }} />
                    <Line type="monotone" dataKey="Anggota Perikanan" name="Anggota Pokkan" stroke="#2563eb" strokeWidth={2} dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload?.isPrediction) return <circle cx={cx} cy={cy} r={5} fill="#fff" stroke="#2563eb" strokeWidth={2} />;
                      return false;
                    }} />
                    <Line type="monotone" dataKey="Anggota Gapoktan" name="Anggota Gapoktan" stroke="#059669" strokeWidth={2} dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload?.isPrediction) return <circle cx={cx} cy={cy} r={5} fill="#fff" stroke="#059669" strokeWidth={2} />;
                      return false;
                    }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Institutional Bar Chart */}
            <div className="bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="flex flex-col mb-6 border-b border-slate-200 pb-3 text-left">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <FileSpreadsheet className="text-emerald-600" />
                  Sebaran Unit Kelembagaan per Kecamatan ({selectedYear})
                </h4>
                <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">
                  Kontribusi unit Poktan, Pokkan, dan Gapoktan per wilayah
                </p>
              </div>

              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
                      width={70}
                      tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        fontFamily: "monospace",
                        fontSize: "12px",
                        fontWeight: "bold",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontSize: "10px", fontWeight: "bold" }} />
                    <Bar dataKey="Kelompok Tani" stackId="a" fill="#f59e0b" stroke="#64748b" strokeWidth={1} />
                    <Bar dataKey="Kelompok Perikanan" stackId="a" fill="#3b82f6" stroke="#64748b" strokeWidth={1} />
                    <Bar dataKey="Gapoktan" stackId="a" fill="#10b981" stroke="#64748b" strokeWidth={1} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="mb-4 text-left border-b border-slate-200 pb-2 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                    Tabel Rincian Poktan, Gapoktan & KTH ({selectedYear})
                  </h4>
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase mt-1">
                    Detail sebaran desa/kelurahan, poktan, pokkan, gapoktan, dan kelompok tani hutan di Kabupaten Banjarnegara
                  </p>
                </div>
                {filteredData.length === 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-slate-200 text-[10px] font-mono font-bold text-rose-800 uppercase max-w-full">
                    <ShieldAlert size={14} className="flex-shrink-0" />
                    <span>
                      {selectedKecamatan === "Semua"
                        ? `Data kelompok tani untuk tahun ${selectedYear} belum terunggah di portal Open Data.`
                        : `Kecamatan ${selectedKecamatan} belum memiliki data kelompok tani terunggah di portal Open Data untuk tahun ${selectedYear}.`}
                    </span>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto max-h-[450px]">
                <table className="w-full text-left font-mono text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 sticky top-0 z-10">
                      <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs">No</th>
                      <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs">Desa/Kelurahan</th>
                      <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs">Kecamatan</th>
                      <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs text-right">Poktan</th>
                      <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs text-right">Anggota Poktan</th>
                      <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs text-right">Pokkan</th>
                      <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs text-right">Anggota Pokkan</th>
                      <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs text-right">Gapoktan</th>
                      <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs text-right">Anggota Gapoktan</th>
                      <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs text-right">KTH</th>
                      <th className="p-3 font-bold uppercase text-xs">Detail KTH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, idx) => (
                      <tr key={`${row.desa}_${idx}`} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-3 border-r border-slate-200 text-xs font-bold">{idx + 1}</td>
                        <td className="p-3 border-r border-slate-200 text-xs font-bold uppercase">{row.desa}</td>
                        <td className="p-3 border-r border-slate-200 text-xs font-bold uppercase">{formatKecName(row.kecamatan)}</td>
                        <td className="p-3 border-r border-slate-200 text-xs text-right">{formatNum(row.kelompokTani)}</td>
                        <td className="p-3 border-r border-slate-200 text-xs text-right text-amber-700 font-bold">{formatNum(row.anggotaTani)}</td>
                        <td className="p-3 border-r border-slate-200 text-xs text-right">{formatNum(row.kelompokPerikanan)}</td>
                        <td className="p-3 border-r border-slate-200 text-xs text-right text-blue-700 font-bold">{formatNum(row.anggotaPerikanan)}</td>
                        <td className="p-3 border-r border-slate-200 text-xs text-right">{formatNum(row.gapoktan)}</td>
                        <td className="p-3 border-r border-slate-200 text-xs text-right text-emerald-700 font-bold">{formatNum(row.anggotaGapoktan)}</td>
                        <td className="p-3 border-r border-slate-200 text-xs text-right text-green-700 font-bold">{formatNum(row.kelompokTaniHutan || 0)}</td>
                        <td className="p-3 text-[10px] text-slate-600 min-w-[220px]">
                          {(row.kelompokTaniHutanList || []).slice(0, 3).map((item) => item.namaKelompok).join(", ") || "-"}
                          {(row.kelompokTaniHutanList?.length || 0) > 3 ? ` +${(row.kelompokTaniHutanList?.length || 0) - 3} lainnya` : ""}
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
