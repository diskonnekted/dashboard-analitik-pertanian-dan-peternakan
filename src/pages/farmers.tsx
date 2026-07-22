import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchKelompokTani, KelompokTaniRow } from "@/services/api";
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

export default function FarmersPage() {
  const [rawData, setRawData] = useState<KelompokTaniRow[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchKelompokTani();
        setRawData(data);
      } catch (err) {
        console.error("Gagal memuat data kelompok tani:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Format nama kecamatan agar proporsional
  const formatKecName = (name: string) => {
    return name || "Unknown";
  };

  // Daftar tahun unik
  const yearsList = useMemo(() => {
    return Array.from(new Set(rawData.map((d) => d.tahun).filter(Boolean)))
      .sort((a, b) => b.localeCompare(a));
  }, [rawData]);

  useEffect(() => {
    if (yearsList.length > 0 && !yearsList.includes(selectedYear)) {
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

      const normKec = formatKecName(d.kecamatan);
      const sumGroups = d.kelompokTani + d.kelompokPerikanan + d.gapoktan;
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
      entry.totalKelompok += (d.kelompokTani + d.kelompokPerikanan + d.gapoktan);
    });

    return Array.from(kecMap.values()).sort((a, b) => b.totalKelompok - a.totalKelompok);
  }, [filteredData]);

  // Tren Historis Kelembagaan Tani (Berdasarkan Kecamatan Terpilih)
  const trendData = useMemo(() => {
    const base = selectedKecamatan === "Semua"
      ? rawData
      : rawData.filter((d) => formatKecName(d.kecamatan) === selectedKecamatan);

    const byYear = new Map<string, any>();

    base.forEach((d) => {
      const yr = d.tahun;
      if (!yr) return;

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

    return Array.from(byYear.values()).sort((a, b) => a.tahun.localeCompare(b.tahun));
  }, [rawData, selectedKecamatan]);

  const formatNum = (num: number) => {
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num);
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b-2 border-dashed border-neutral-300 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm">
            Kelembagaan Petani & Gapoktan
          </h2>
            <p className="font-mono text-sm md:text-base font-medium text-[#4a4a4a] mt-4 max-w-2xl border-l-4 border-emerald-500 pl-4 bg-white/80 py-1">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
          {/* Tahun */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">Tahun Data</label>
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

          {/* Kecamatan */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">Pilih Kecamatan</label>
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
              Mengekstrak data dari CKAN Open Data...
            </p>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              {/* Stat 1: Kelompok Tani */}
              <div className="bg-amber-50 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div>
                  <h5 className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Kelompok Tani (Poktan)</h5>
                  <h3 className="text-2xl font-serif font-black uppercase text-[#141414] mt-1">
                    {formatNum(stats.kelompokTani)} <span className="text-xs font-mono font-normal lowercase">unit</span>
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-amber-700 mt-2">
                    {formatNum(stats.anggotaTani)} anggota terdaftar
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-neutral-200 text-[9px] font-mono text-neutral-400 uppercase">
                  Poktan Pertanian / Pekebun
                </div>
              </div>

              {/* Stat 2: Kelompok Perikanan */}
              <div className="bg-blue-50 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div>
                  <h5 className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Kelompok Perikanan (Pokkan)</h5>
                  <h3 className="text-2xl font-serif font-black uppercase text-[#141414] mt-1">
                    {formatNum(stats.kelompokPerikanan)} <span className="text-xs font-mono font-normal lowercase">unit</span>
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-blue-700 mt-2">
                    {formatNum(stats.anggotaPerikanan)} anggota terdaftar
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-neutral-200 text-[9px] font-mono text-neutral-400 uppercase">
                  Pembudidaya Ikan lokal
                </div>
              </div>

              {/* Stat 3: Gapoktan */}
              <div className="bg-emerald-50 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div>
                  <h5 className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Gabungan Poktan (Gapoktan)</h5>
                  <h3 className="text-2xl font-serif font-black uppercase text-[#141414] mt-1">
                    {formatNum(stats.gapoktan)} <span className="text-xs font-mono font-normal lowercase">gabungan</span>
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-emerald-700 mt-2">
                    {formatNum(stats.anggotaGapoktan)} pengurus/anggota
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-neutral-200 text-[9px] font-mono text-neutral-400 uppercase">
                  Aliansi Poktan Tingkat Desa
                </div>
              </div>

              {/* Stat 4: Top Kecamatan */}
              <div className="bg-purple-50 border-2 border-[#141414] p-5 shadow-[4px_4px_0px_0px_#141414] flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div>
                  <h5 className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Kemitraan Tertinggi</h5>
                  <h3 className="text-lg font-mono font-bold uppercase text-[#141414] mt-1 truncate tracking-wide">
                    {stats.topDistrict}
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-purple-700 mt-2">
                    {formatNum(stats.maxGroups)} lembaga tani ({selectedYear})
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-neutral-200 text-[9px] font-mono text-neutral-400 uppercase">
                  Sebaran kelembagaan terpadat
                </div>
              </div>
            </div>

            {/* Time-Series Trend */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="mb-4 text-left border-b-2 border-[#141414] pb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <TrendingUp className="text-amber-600" />
                  Tren Keanggotaan Lembaga Tani ({trendData.length > 0 ? `${trendData[0].tahun}–${trendData[trendData.length - 1].tahun}` : ""})
                  {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                </h4>
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} vertical={false} />
                    <XAxis
                      dataKey="tahun"
                      tick={{ fill: "#141414", fontSize: 11, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#141414", strokeWidth: 2 }}
                      tickLine={{ stroke: "#141414" }}
                    />
                    <YAxis
                      tick={{ fill: "#141414", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
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
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontSize: "10px", fontWeight: "bold" }} />
                    <Line type="monotone" dataKey="totalAnggota" name="Total Anggota (Jiwa)" stroke="#141414" strokeWidth={3} dot={{ fill: "#141414", r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Anggota Tani" name="Anggota Poktan" stroke="#d97706" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Anggota Perikanan" name="Anggota Pokkan" stroke="#2563eb" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Anggota Gapoktan" name="Anggota Gapoktan" stroke="#059669" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Institutional Bar Chart */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="flex flex-col mb-6 border-b-2 border-[#141414] pb-3 text-left">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <FileSpreadsheet className="text-emerald-600" />
                  Sebaran Unit Kelembagaan per Kecamatan ({selectedYear})
                </h4>
                <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">
                  Kontribusi unit Poktan, Pokkan, dan Gapoktan per wilayah
                </p>
              </div>

              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#141414", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#141414", strokeWidth: 2 }}
                      tickLine={{ stroke: "#141414" }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fill: "#141414", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#141414", strokeWidth: 2 }}
                      tickLine={{ stroke: "#141414" }}
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
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontSize: "10px", fontWeight: "bold" }} />
                    <Bar dataKey="Kelompok Tani" stackId="a" fill="#f59e0b" stroke="#141414" strokeWidth={1} />
                    <Bar dataKey="Kelompok Perikanan" stackId="a" fill="#3b82f6" stroke="#141414" strokeWidth={1} />
                    <Bar dataKey="Gapoktan" stackId="a" fill="#10b981" stroke="#141414" strokeWidth={1} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="mb-4 text-left border-b border-neutral-200 pb-2 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                    Tabel Rincian Poktan & Gapoktan ({selectedYear})
                  </h4>
                  <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-1">
                    Detail sebaran desa/kelurahan, poktan, pokkan, dan gapoktan di Kabupaten Banjarnegara
                  </p>
                </div>
                {filteredData.length === 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 border-2 border-[#141414] text-[10px] font-mono font-bold text-rose-800 uppercase max-w-full">
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
                    <tr className="border-b-2 border-[#141414] bg-neutral-100 sticky top-0 z-10">
                      <th className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs">No</th>
                      <th className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs">Desa/Kelurahan</th>
                      <th className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs">Kecamatan</th>
                      <th className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs text-right">Poktan</th>
                      <th className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs text-right">Anggota Poktan</th>
                      <th className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs text-right">Pokkan</th>
                      <th className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs text-right">Anggota Pokkan</th>
                      <th className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs text-right">Gapoktan</th>
                      <th className="p-3 font-bold uppercase text-xs text-right">Anggota Gapoktan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, idx) => (
                      <tr key={`${row.desa}_${idx}`} className="border-b border-neutral-200 hover:bg-neutral-50">
                        <td className="p-3 border-r border-neutral-200 text-xs font-bold">{idx + 1}</td>
                        <td className="p-3 border-r border-neutral-200 text-xs font-bold uppercase">{row.desa}</td>
                        <td className="p-3 border-r border-neutral-200 text-xs font-bold uppercase">{formatKecName(row.kecamatan)}</td>
                        <td className="p-3 border-r border-neutral-200 text-xs text-right">{formatNum(row.kelompokTani)}</td>
                        <td className="p-3 border-r border-neutral-200 text-xs text-right text-amber-700 font-bold">{formatNum(row.anggotaTani)}</td>
                        <td className="p-3 border-r border-neutral-200 text-xs text-right">{formatNum(row.kelompokPerikanan)}</td>
                        <td className="p-3 border-r border-neutral-200 text-xs text-right text-blue-700 font-bold">{formatNum(row.anggotaPerikanan)}</td>
                        <td className="p-3 border-r border-neutral-200 text-xs text-right">{formatNum(row.gapoktan)}</td>
                        <td className="p-3 text-xs text-right text-emerald-700 font-bold">{formatNum(row.anggotaGapoktan)}</td>
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
