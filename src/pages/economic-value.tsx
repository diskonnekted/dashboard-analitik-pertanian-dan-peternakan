import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  fetchNilaiProduksiBudidaya,
  fetchNilaiProduksiTangkap,
  NilaiProduksiRow,
} from "@/services/api";
import { Fish, Waves, Calendar, Filter, DollarSign, Tag, PieChart } from "lucide-react";

type SubSektor = "Budidaya" | "Tangkap";

const COLORS = ["#0ea5e9", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444", "#f472b6"];

export default function EconomicValuePage() {
  const [budidayaData, setBudidayaData] = useState<NilaiProduksiRow[]>([]);
  const [tangkapData, setTangkapData] = useState<NilaiProduksiRow[]>([]);

  const [subSektor, setSubSektor] = useState<SubSektor>("Budidaya");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [budidaya, tangkap] = await Promise.all([
          fetchNilaiProduksiBudidaya(),
          fetchNilaiProduksiTangkap(),
        ]);
        setBudidayaData(budidaya);
        setTangkapData(tangkap);
      } catch (err) {
        console.error("Gagal memuat data nilai produksi:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeRaw = useMemo(
    () => (subSektor === "Budidaya" ? budidayaData : tangkapData),
    [subSektor, budidayaData, tangkapData],
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
  }, [yearsList]);

  const currentData = useMemo(
    () => activeRaw.filter((d) => d.tahun === selectedYear),
    [activeRaw, selectedYear],
  );

  const uniqueKecamatan = useMemo(() => {
    return ["Semua", ...Array.from(new Set(currentData.map((d) => d.kecamatan))).sort()];
  }, [currentData]);

  const filteredData = useMemo(() => {
    return selectedKecamatan === "Semua"
      ? currentData
      : currentData.filter((d) => d.kecamatan === selectedKecamatan);
  }, [currentData, selectedKecamatan]);

  // Nilai (ribu rupiah) -> Rupiah penuh
  const toRupiah = (ribu: number) => ribu * 1000;

  // Agregat nilai & produksi per jenis (untuk kontribusi & harga implisit)
  const byJenis = useMemo(() => {
    const map = new Map<string, { nilai: number; produksi: number }>();
    filteredData.forEach((row) => {
      row.jenis.forEach((j) => {
        const cur = map.get(j.label) || { nilai: 0, produksi: 0 };
        cur.nilai += j.nilai;
        cur.produksi += j.produksi;
        map.set(j.label, cur);
      });
    });
    return Array.from(map.entries()).map(([label, v]) => ({
      label,
      nilaiRibu: v.nilai,
      nilaiRp: toRupiah(v.nilai),
      produksi: v.produksi,
      // Harga implisit Rp/kg = (nilai ribu * 1000) / produksi kg
      hargaImplisit: v.produksi > 0 ? toRupiah(v.nilai) / v.produksi : 0,
    }));
  }, [filteredData]);

  // Statistik ringkas
  const stats = useMemo(() => {
    const totalNilaiRibu = byJenis.reduce((a, j) => a + j.nilaiRibu, 0);
    const totalProduksi = byJenis.reduce((a, j) => a + j.produksi, 0);
    const totalRp = toRupiah(totalNilaiRibu);
    const hargaRata = totalProduksi > 0 ? totalRp / totalProduksi : 0;

    // Jenis dengan kontribusi nilai terbesar
    let topJenis = "-";
    let topVal = -1;
    byJenis.forEach((j) => {
      if (j.nilaiRibu > topVal) {
        topVal = j.nilaiRibu;
        topJenis = j.label;
      }
    });

    return { totalRp, totalProduksi, hargaRata, topJenis, topShare: totalNilaiRibu > 0 ? (topVal / totalNilaiRibu) * 100 : 0 };
  }, [byJenis]);

  // Nilai ekonomi per kecamatan (bar chart)
  const perKecamatan = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach((row) => {
      const total = row.jenis.reduce((a, j) => a + j.nilai, 0);
      map.set(row.kecamatan, (map.get(row.kecamatan) || 0) + total);
    });
    return Array.from(map.entries())
      .map(([name, nilaiRibu]) => ({ name, nilaiJuta: toRupiah(nilaiRibu) / 1_000_000 }))
      .sort((a, b) => b.nilaiJuta - a.nilaiJuta);
  }, [filteredData]);

  // Kontribusi nilai per jenis (untuk chart & persentase)
  const kontribusi = useMemo(() => {
    const total = byJenis.reduce((a, j) => a + j.nilaiRibu, 0);
    return byJenis
      .map((j) => ({
        name: j.label,
        nilaiJuta: j.nilaiRp / 1_000_000,
        pct: total > 0 ? (j.nilaiRibu / total) * 100 : 0,
      }))
      .sort((a, b) => b.nilaiJuta - a.nilaiJuta);
  }, [byJenis]);

  // Harga implisit per jenis (Rp/kg)
  const hargaData = useMemo(() => {
    return byJenis
      .filter((j) => j.produksi > 0)
      .map((j) => ({ name: j.label, harga: Math.round(j.hargaImplisit) }))
      .sort((a, b) => b.harga - a.harga);
  }, [byJenis]);

  const formatRp = (num: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);

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
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b-2 border-dashed border-neutral-300 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm">
            Nilai Ekonomi Perikanan
          </h2>
            <p className="font-mono text-sm md:text-base font-medium text-[#4a4a4a] mt-4 max-w-2xl border-l-4 border-emerald-500 pl-4 bg-white/80 py-1">
            Nilai Produksi, Harga Rata-rata Implisit & Kontribusi Sub-sektor Perikanan Kabupaten Banjarnegara.
          </p>
          </div>
          <div className="w-full md:w-48 lg:w-64 shrink-0 flex items-center justify-center">
            <img
              src="/img/economic-value.png"
              alt="Nilai Ekonomi"
              className="w-full max-h-32 md:max-h-36 object-contain"
            />
          </div>
        </section>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
          {/* Sub-sektor Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">
              Sub-sektor
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSubSektor("Budidaya")}
                className={`py-2 px-3 border-2 border-[#141414] font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  subSektor === "Budidaya"
                    ? "bg-[#141414] text-white shadow-none"
                    : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Fish size={14} />
                Budidaya
              </button>
              <button
                onClick={() => setSubSektor("Tangkap")}
                className={`py-2 px-3 border-2 border-[#141414] font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  subSektor === "Tangkap"
                    ? "bg-[#141414] text-white shadow-none"
                    : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Waves size={14} />
                Tangkap
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
              Memuat data nilai produksi...
            </p>
          </div>
        ) : currentData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
            <p className="text-neutral-500 font-mono font-bold uppercase">
              Data tidak tersedia untuk tahun ini
            </p>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Nilai Ekonomi */}
              <div className="bg-emerald-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono font-bold uppercase text-neutral-500">
                    Total Nilai Ekonomi
                  </span>
                  <DollarSign className="text-emerald-600" size={20} />
                </div>
                <span className="text-2xl font-serif font-black text-[#141414] mt-3 break-words leading-tight">
                  {formatRp(stats.totalRp)}
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-1">
                  {formatNum(stats.totalProduksi)} kg total produksi
                </span>
              </div>

              {/* Harga Rata-rata Implisit */}
              <div className="bg-amber-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono font-bold uppercase text-neutral-500">
                    Harga Rata-rata Implisit
                  </span>
                  <Tag className="text-amber-600" size={20} />
                </div>
                <span className="text-2xl font-serif font-black text-[#141414] mt-3 break-words leading-tight">
                  {formatRp(stats.hargaRata)}
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-1">
                  Per kg (nilai ÷ produksi)
                </span>
              </div>

              {/* Jenis Kontribusi Tertinggi */}
              <div className="bg-violet-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono font-bold uppercase text-neutral-500">
                    Kontributor Terbesar
                  </span>
                  <PieChart className="text-violet-600" size={20} />
                </div>
                <span className="text-2xl font-serif font-black text-[#141414] mt-3 break-words leading-tight">
                  {stats.topJenis}
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-1">
                  {formatPct(stats.topShare)}% dari total nilai
                </span>
              </div>
            </div>

            {/* Nilai Ekonomi per Kecamatan */}
            {selectedKecamatan === "Semua" && (
              <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                    Nilai Ekonomi per Kecamatan (Juta Rupiah)
                  </h4>
                </div>
                <div className="h-[360px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perKecamatan} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} vertical={false} />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={70}
                        tick={{ fontFamily: "monospace", fontSize: 10, fontWeight: "bold" }}
                        stroke="#141414"
                      />
                      <YAxis
                        tick={{ fontFamily: "monospace", fontSize: 10, fontWeight: "bold" }}
                        stroke="#141414"
                      />
                      <Tooltip
                        formatter={(v: any) => [`${formatNum(Number(v))} Juta`, "Nilai"]}
                        contentStyle={{
                          border: "2px solid #141414",
                          borderRadius: 0,
                          fontFamily: "monospace",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      />
                      <Bar dataKey="nilaiJuta" fill="#10b981" stroke="#141414" strokeWidth={2} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Kontribusi & Harga Implisit per Jenis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Kontribusi Nilai per Jenis */}
              <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                    Kontribusi Nilai per Jenis
                  </h4>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={kontribusi}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontFamily: "monospace", fontSize: 10, fontWeight: "bold" }}
                        stroke="#141414"
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontFamily: "monospace", fontSize: 10, fontWeight: "bold" }}
                        stroke="#141414"
                      />
                      <Tooltip
                        formatter={(v: any, _n: any, p: any) => [
                          `${formatNum(Number(v))} Juta (${formatPct(p.payload.pct)}%)`,
                          "Nilai",
                        ]}
                        contentStyle={{
                          border: "2px solid #141414",
                          borderRadius: 0,
                          fontFamily: "monospace",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      />
                      <Bar dataKey="nilaiJuta" stroke="#141414" strokeWidth={2}>
                        {kontribusi.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Harga Implisit per Jenis */}
              <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                    Harga Rata-rata Implisit (Rp/kg)
                  </h4>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hargaData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} vertical={false} />
                      <XAxis
                        dataKey="name"
                        angle={-25}
                        textAnchor="end"
                        height={50}
                        tick={{ fontFamily: "monospace", fontSize: 10, fontWeight: "bold" }}
                        stroke="#141414"
                      />
                      <YAxis
                        tick={{ fontFamily: "monospace", fontSize: 10, fontWeight: "bold" }}
                        stroke="#141414"
                      />
                      <Tooltip
                        formatter={(v: any) => [formatRp(Number(v)), "Harga/kg"]}
                        contentStyle={{
                          border: "2px solid #141414",
                          borderRadius: 0,
                          fontFamily: "monospace",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      />
                      <Bar dataKey="harga" fill="#f59e0b" stroke="#141414" strokeWidth={2} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tabel Rincian per Jenis */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                  Rincian per Jenis {subSektor}
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#141414]">
                      <th className="py-2 px-3 font-mono text-xs font-bold uppercase text-neutral-500">
                        Jenis
                      </th>
                      <th className="py-2 px-3 font-mono text-xs font-bold uppercase text-neutral-500 text-right">
                        Produksi (kg)
                      </th>
                      <th className="py-2 px-3 font-mono text-xs font-bold uppercase text-neutral-500 text-right">
                        Nilai (Rp)
                      </th>
                      <th className="py-2 px-3 font-mono text-xs font-bold uppercase text-neutral-500 text-right">
                        Harga Implisit (Rp/kg)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {byJenis.map((j) => (
                      <tr key={j.label} className="border-b border-neutral-200">
                        <td className="py-2 px-3 font-mono text-sm font-bold">{j.label}</td>
                        <td className="py-2 px-3 font-mono text-sm text-right">
                          {formatNum(j.produksi)}
                        </td>
                        <td className="py-2 px-3 font-mono text-sm text-right">
                          {formatRp(j.nilaiRp)}
                        </td>
                        <td className="py-2 px-3 font-mono text-sm text-right">
                          {j.produksi > 0 ? formatRp(j.hargaImplisit) : "-"}
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
