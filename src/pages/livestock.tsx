import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchTernakKecil, fetchTernakBesar, fetchUnggas, TernakKecil, TernakBesar, Unggas } from "@/services/api";
import { Beef, Squirrel, Bird, Calendar, MapPin, TrendingUp, Filter } from "lucide-react";

type Category = "besar" | "kecil" | "unggas";

export default function LivestockPage() {
  const [kecilData, setKecilData] = useState<TernakKecil[]>([]);
  const [besarData, setBesarData] = useState<TernakBesar[]>([]);
  const [unggasData, setUnggasData] = useState<Unggas[]>([]);
  
  const [category, setCategory] = useState<Category>("besar");
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [kecil, besar, unggas] = await Promise.all([
          fetchTernakKecil(),
          fetchTernakBesar(),
          fetchUnggas()
        ]);
        setKecilData(kecil);
        setBesarData(besar);
        setUnggasData(unggas);
      } catch (err) {
        console.error("Gagal memuat data peternakan:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  const yearsList = useMemo(() => {
    const activeData = category === "besar" ? besarData : category === "kecil" ? kecilData : unggasData;
    return Array.from(new Set(activeData.map(d => d.tahun).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  }, [category, besarData, kecilData, unggasData]);

  useEffect(() => {
    if (yearsList.length > 0 && !yearsList.includes(selectedYear)) {
      setSelectedYear(yearsList[0]);
    }
  }, [category, yearsList]);

  const currentData = useMemo(() => {
    const rawData = category === "besar" ? besarData : category === "kecil" ? kecilData : unggasData;
    return rawData.filter(d => d.tahun === selectedYear);
  }, [category, besarData, kecilData, unggasData, selectedYear]);

  const uniqueKecamatan = useMemo(() => {
    return ["Semua", ...Array.from(new Set(currentData.map(d => d.kecamatan))).sort()];
  }, [currentData]);

  const filteredData = useMemo(() => {
    return selectedKecamatan === "Semua" 
      ? currentData 
      : currentData.filter(d => d.kecamatan === selectedKecamatan);
  }, [currentData, selectedKecamatan]);

  const stats = useMemo(() => {
    let total = 0;
    let topDistrict = "-";
    let topVal = -1;
    let breakdown: { name: string; value: number }[] = [];

    if (category === "besar") {
      const data = filteredData as TernakBesar[];
      let sapiPerah = 0, sapi = 0, kerbau = 0, kuda = 0;
      data.forEach(d => {
        total += (d.sapiPerah + d.sapi + d.kerbau + d.kuda);
        sapiPerah += d.sapiPerah; sapi += d.sapi; kerbau += d.kerbau; kuda += d.kuda;
        const sum = d.sapiPerah + d.sapi + d.kerbau + d.kuda;
        if (sum > topVal) { topVal = sum; topDistrict = d.kecamatan; }
      });
      breakdown = [{ name: "Sapi Potong", value: sapi }, { name: "Sapi Perah", value: sapiPerah }, { name: "Kerbau", value: kerbau }, { name: "Kuda", value: kuda }];
    } else if (category === "kecil") {
      const data = filteredData as TernakKecil[];
      let kambing = 0, domba = 0, babi = 0, kelinci = 0;
      data.forEach(d => {
        total += (d.kambing + d.domba + d.babi + d.kelinci);
        kambing += d.kambing; domba += d.domba; babi += d.babi; kelinci += d.kelinci;
        const sum = d.kambing + d.domba + d.babi + d.kelinci;
        if (sum > topVal) { topVal = sum; topDistrict = d.kecamatan; }
      });
      breakdown = [{ name: "Kambing", value: kambing }, { name: "Domba", value: domba }, { name: "Kelinci", value: kelinci }, { name: "Babi", value: babi }];
    } else {
      const data = filteredData as Unggas[];
      let ayamKampung = 0, ayamRasLayer = 0, ayamBroiler = 0, itikBiasa = 0, itikManila = 0;
      data.forEach(d => {
        total += (d.ayamKampung + d.ayamRasLayer + d.ayamBroiler + d.itikBiasa + d.itikManila);
        ayamKampung += d.ayamKampung; ayamRasLayer += d.ayamRasLayer; ayamBroiler += d.ayamBroiler; itikBiasa += d.itikBiasa; itikManila += d.itikManila;
        const sum = d.ayamKampung + d.ayamRasLayer + d.ayamBroiler + d.itikBiasa + d.itikManila;
        if (sum > topVal) { topVal = sum; topDistrict = d.kecamatan; }
      });
      breakdown = [{ name: "Ayam Broiler", value: ayamBroiler }, { name: "Ayam Kampung", value: ayamKampung }, { name: "Ayam Ras Layer", value: ayamRasLayer }, { name: "Itik Biasa", value: itikBiasa }, { name: "Itik Manila", value: itikManila }];
    }
    return { total, topDistrict, topVal, breakdown };
  }, [category, filteredData]);

  const chartData = useMemo(() => {
    // Map data to match the keys expected by the Bar components
    return filteredData.map(d => {
      const obj: any = { name: d.kecamatan };
      
      if (category === "besar") {
        const r = d as TernakBesar;
        obj["Sapi Potong"] = r.sapi;
        obj["Sapi Perah"] = r.sapiPerah;
        obj["Kerbau"] = r.kerbau;
        obj["Kuda"] = r.kuda;
      } else if (category === "kecil") {
        const r = d as TernakKecil;
        obj["Kambing"] = r.kambing;
        obj["Domba"] = r.domba;
        obj["Kelinci"] = r.kelinci;
        obj["Babi"] = r.babi;
      } else {
        const r = d as Unggas;
        obj["Ayam Broiler"] = r.ayamBroiler;
        obj["Ayam Kampung"] = r.ayamKampung;
        obj["Ayam Ras Layer"] = r.ayamRasLayer;
        obj["Itik Biasa"] = r.itikBiasa;
        obj["Itik Manila"] = r.itikManila;
      }
      return obj;
    });
  }, [category, filteredData]);

  const formatNum = (num: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Header Banner */}
        <div className="bg-amber-100 border-2 border-[#171717] rounded-none shadow-[4px_4px_0px_0px_#171717] p-6 text-left">
          <h1 className="text-3xl md:text-4xl font-serif font-black uppercase tracking-tight text-[#171717]">
            Analitik Peternakan & Unggas
          </h1>
          <p className="text-xs font-mono font-bold text-neutral-600 mt-2 uppercase tracking-wide">
            Pemantauan Populasi Ternak Besar, Ternak Kecil, dan Unggas Kabupaten Banjarnegara
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border-2 border-[#171717] p-6 shadow-[4px_4px_0px_0px_#171717]">
          {/* Category Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">Kategori Ternak</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setCategory("besar")} 
                className={`py-2 px-3 border-2 border-[#171717] font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "besar" 
                    ? "bg-[#171717] text-white shadow-none" 
                    : "bg-white text-[#171717] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#171717] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Beef size={14} />
                Besar
              </button>
              <button 
                onClick={() => setCategory("kecil")} 
                className={`py-2 px-3 border-2 border-[#171717] font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "kecil" 
                    ? "bg-[#171717] text-white shadow-none" 
                    : "bg-white text-[#171717] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#171717] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Squirrel size={14} />
                Kecil
              </button>
              <button 
                onClick={() => setCategory("unggas")} 
                className={`py-2 px-3 border-2 border-[#171717] font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "unggas" 
                    ? "bg-[#171717] text-white shadow-none" 
                    : "bg-white text-[#171717] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#171717] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Bird size={14} />
                Unggas
              </button>
            </div>
          </div>

          {/* Year Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">Tahun Data</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border-2 border-[#171717] font-mono text-sm font-bold bg-white focus:outline-none appearance-none cursor-pointer rounded-none"
              >
                {yearsList.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Kecamatan Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">Pilih Kecamatan</label>
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
              <select 
                value={selectedKecamatan} 
                onChange={(e) => setSelectedKecamatan(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border-2 border-[#171717] font-mono text-sm font-bold bg-white focus:outline-none appearance-none cursor-pointer rounded-none"
              >
                {uniqueKecamatan.map(kec => (
                  <option key={kec} value={kec}>{kec}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-neutral-500 font-mono font-bold animate-pulse uppercase">Memuat data peternakan...</p>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stat 1: Total Populasi */}
              <div className="bg-amber-50 border-2 border-[#171717] p-6 shadow-[4px_4px_0px_0px_#171717] text-left flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-neutral-500 uppercase">Total Populasi</h5>
                    <h3 className="text-3xl font-serif font-black uppercase text-[#171717] mt-1">{formatNum(stats.total)}</h3>
                  </div>
                  <div className="p-2 border-2 border-[#171717] bg-white">
                    {category === "besar" ? <Beef size={20} /> : category === "kecil" ? <Squirrel size={20} /> : <Bird size={20} />}
                  </div>
                </div>
                <p className="text-xs font-mono text-neutral-500 mt-4 uppercase">Ekor ternak terdata di Banjarnegara ({selectedYear})</p>
              </div>

              {/* Stat 2: Top Kecamatan */}
              <div className="bg-emerald-50 border-2 border-[#171717] p-6 shadow-[4px_4px_0px_0px_#171717] text-left flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-neutral-500 uppercase">Kecamatan Terpadat</h5>
                    <h3 className="text-2xl font-serif font-black uppercase text-[#171717] mt-1 truncate max-w-[200px]">{stats.topDistrict}</h3>
                  </div>
                  <div className="p-2 border-2 border-[#171717] bg-white">
                    <MapPin size={20} />
                  </div>
                </div>
                <p className="text-xs font-mono text-neutral-500 mt-4 uppercase">Populasi: {formatNum(stats.topVal)} ekor</p>
              </div>

              {/* Stat 3: Komposisi Jenis */}
              <div className="bg-violet-50 border-2 border-[#171717] p-6 shadow-[4px_4px_0px_0px_#171717] text-left">
                <h5 className="text-xs font-mono font-bold text-neutral-500 uppercase mb-3">Komposisi Populasi</h5>
                <div className="flex flex-col gap-2">
                  {stats.breakdown.map((item, idx) => {
                    const percentage = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                    return (
                      <div key={idx} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-mono font-bold uppercase">
                          <span>{item.name}</span>
                          <span>{formatNum(item.value)} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-neutral-200 h-2 border border-[#171717]">
                          <div className="bg-violet-500 h-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="bg-white border-2 border-[#171717] p-6 shadow-[4px_4px_0px_0px_#171717]">
              <div className="flex flex-col mb-6 border-b-2 border-[#171717] pb-3 text-left">
                <h4 className="text-lg font-serif font-black uppercase flex items-center gap-2">
                  <TrendingUp className="text-amber-600" />
                  Grafik Sebaran Populasi Ternak
                </h4>
                <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">
                  Populasi per Kecamatan di Banjarnegara Tahun {selectedYear}
                </p>
              </div>
              
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#171717" strokeOpacity={0.1} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: "#171717", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#171717", strokeWidth: 2 }}
                      tickLine={{ stroke: "#171717" }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fill: "#171717", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#171717", strokeWidth: 2 }}
                      tickLine={{ stroke: "#171717" }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "2px solid #171717",
                        borderRadius: "0px",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        fontWeight: "bold",
                        boxShadow: "4px 4px 0px 0px #171717"
                      }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontSize: "11px", fontWeight: "bold" }} />
                    {stats.breakdown.map((item, idx) => {
                      const colors = ["#d97706", "#2563eb", "#9333ea", "#059669", "#dc2626"];
                      return (
                        <Bar 
                          key={idx}
                          dataKey={item.name} 
                          stackId="a" 
                          fill={colors[idx % colors.length]} 
                          stroke="#171717"
                          strokeWidth={1.5}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border-2 border-[#171717] p-6 shadow-[4px_4px_0px_0px_#171717]">
              <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                <h4 className="text-md font-serif font-black uppercase">Tabel Rincian Populasi ({selectedYear})</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#171717] bg-neutral-100">
                      <th className="p-3 border-r-2 border-[#171717] font-bold uppercase text-xs">No</th>
                      <th className="p-3 border-r-2 border-[#171717] font-bold uppercase text-xs">Kecamatan</th>
                      {stats.breakdown.map((b, idx) => (
                        <th key={idx} className="p-3 border-r-2 border-[#171717] font-bold uppercase text-xs text-right">{b.name}</th>
                      ))}
                      <th className="p-3 font-bold uppercase text-xs text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, idx) => {
                      let values: number[] = [];
                      let sum = 0;

                      if (category === "besar") {
                        const r = row as TernakBesar;
                        values = [r.sapi, r.sapiPerah, r.kerbau, r.kuda];
                        sum = r.sapi + r.sapiPerah + r.kerbau + r.kuda;
                      } else if (category === "kecil") {
                        const r = row as TernakKecil;
                        values = [r.kambing, r.domba, r.kelinci, r.babi];
                        sum = r.kambing + r.domba + r.kelinci + r.babi;
                      } else {
                        const r = row as Unggas;
                        values = [r.ayamBroiler, r.ayamKampung, r.ayamRasLayer, r.itikBiasa, r.itikManila];
                        sum = r.ayamBroiler + r.ayamKampung + r.ayamRasLayer + r.itikBiasa + r.itikManila;
                      }

                      return (
                        <tr key={idx} className="border-b-2 border-neutral-200 hover:bg-neutral-50 transition-colors">
                          <td className="p-3 border-r-2 border-neutral-200 text-xs font-bold">{idx + 1}</td>
                          <td className="p-3 border-r-2 border-neutral-200 font-bold uppercase">{row.kecamatan}</td>
                          {values.map((v, i) => (
                            <td key={i} className="p-3 border-r-2 border-neutral-200 text-right">{formatNum(v)}</td>
                          ))}
                          <td className="p-3 font-bold text-right bg-neutral-50">{formatNum(sum)}</td>
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
