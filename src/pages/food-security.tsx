import { useEffect, useState } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchPadiProduction, fetchLumbungPangan } from "@/services/api";
import { ShieldCheck, Search, Warehouse, AlertCircle } from "lucide-react";

interface FoodSecurityCombined {
  kecamatan: string;
  produksiPadi: number;
  luasPanen: number;
  lumbungUnit: number;
  lumbungKapasitas: number;
  gudangLuas: number;
  gudangKapasitas: number;
  totalKapasitasSimpanan: number;
  storageRatio: number;
  status: "Aman" | "Waspada" | "Rentan";
}

export default function FoodSecurityPage() {
  const [combinedData, setCombinedData] = useState<FoodSecurityCombined[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [padi, lumbung] = await Promise.all([
          fetchPadiProduction(),
          fetchLumbungPangan(),
        ]);

        const combined = padi.map((p): FoodSecurityCombined => {
          const nameClean = p.kecamatan.toUpperCase();
          
          const lMatch = lumbung.find(l => {
            const lKec = l.kecamatan.toUpperCase();
            return lKec === nameClean || lKec.includes(nameClean) || nameClean.includes(lKec);
          });

          const lUnit = lMatch ? lMatch.lumbungUnit : 0;
          const lKap = lMatch ? lMatch.lumbungKapasitas : 0;
          const gLuas = lMatch ? lMatch.gudangLuas : 0;
          const gKap = lMatch ? lMatch.gudangKapasitas : 0;
          const totalKap = lKap + gKap;
          
          const ratio = p.produksi > 0 ? (totalKap / p.produksi) * 100 : 0;

          let status: "Aman" | "Waspada" | "Rentan" = "Rentan";
          if (p.produksi > 10000 && totalKap > 15) {
            status = "Aman";
          } else if (p.produksi > 5000 || totalKap > 5) {
            status = "Waspada";
          }

          return {
            kecamatan: p.kecamatan,
            produksiPadi: p.produksi,
            luasPanen: p.luasPanen,
            lumbungUnit: lUnit,
            lumbungKapasitas: lKap,
            gudangLuas: gLuas,
            gudangKapasitas: gKap,
            totalKapasitasSimpanan: totalKap,
            storageRatio: ratio,
            status
          };
        });

        setCombinedData(combined);
      } catch (err) {
        console.error("Gagal memuat data ketahanan pangan:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredData = combinedData.filter(item => 
    item.kecamatan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalLumbungUnits = combinedData.reduce((acc, curr) => acc + curr.lumbungUnit, 0);
  const totalStorageCapacity = combinedData.reduce((acc, curr) => acc + curr.totalKapasitasSimpanan, 0);
  const totalPadiProd = combinedData.reduce((acc, curr) => acc + curr.produksiPadi, 0);

  const statusStyleMap = {
    Aman: "bg-emerald-100 text-emerald-800 border-emerald-600",
    Waspada: "bg-amber-100 text-amber-800 border-amber-600",
    Rentan: "bg-red-100 text-red-800 border-red-600",
  } as const;

  const formatNum = (num: number, digits: number = 0) => 
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(num);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-200 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="text-2xl sm:text-4xl leading-tight font-bold tracking-tight text-slate-800">
            Ketahanan Pangan (FSI)
          </h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-2 max-w-2xl border-l-2 border-blue-500 pl-3">
            Analisis infrastruktur cadangan pangan riil Kabupaten Banjarnegara berdasarkan sebaran lumbung pangan dan volume produksi padi.
          </p>
          </div>
          <div className="w-full md:w-48 lg:w-64 shrink-0 flex items-center justify-center">
            <img
              src="/img/food-security.png"
              alt="Ketahanan Pangan"
              className="w-full max-h-32 md:max-h-36 object-contain"
            />
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-slate-500 font-mono font-bold animate-pulse uppercase">Memuat data ketahanan pangan...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-5 flex items-center gap-3 transition-all duration-300 hover:shadow-md">
                <div className="p-3 border border-slate-200 bg-blue-100 text-slate-800 shadow-sm">
                  <Warehouse size={22} />
                </div>
                <div>
                  <p className="text-xs font-mono font-bold text-slate-500 uppercase">Total Lumbung Aktif</p>
                  <p className="text-xl font-serif font-black mt-0.5">{totalLumbungUnits} Unit</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-5 flex items-center gap-3 transition-all duration-300 hover:shadow-md">
                <div className="p-3 border border-slate-200 bg-emerald-100 text-slate-800 shadow-sm">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-xs font-mono font-bold text-slate-500 uppercase">Total Kapasitas Simpan</p>
                  <p className="text-xl font-serif font-black mt-0.5">{formatNum(totalStorageCapacity)} Ton</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-5 flex items-center gap-3 transition-all duration-300 hover:shadow-md">
                <div className="p-3 border border-slate-200 bg-yellow-100 text-slate-800 shadow-sm">
                  <Warehouse size={22} />
                </div>
                <div>
                  <p className="text-xs font-mono font-bold text-slate-500 uppercase">Kapasitas vs Hasil Panen</p>
                  <p className="text-xl font-serif font-black mt-0.5">
                    {formatNum((totalStorageCapacity / totalPadiProd) * 100, 2)} %
                  </p>
                </div>
              </div>
            </div>

            {/* Storage Gap Chart */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 transition-all duration-300 hover:shadow-md">
              <div className="flex flex-col mb-6 border-b border-slate-200 pb-3">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <AlertCircle className="text-blue-600" />
                  Kesenjangan Produksi vs Kapasitas Lumbung
                </h4>
                <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">Perbandingan volume panen Padi (Ton) dengan kapasitas simpan Lumbung/Gudang Pangan (Ton)</p>
              </div>

              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={combinedData} margin={{ top: 10, right: 10, left: 0, bottom: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} vertical={false} />
                    <XAxis 
                      dataKey="kecamatan" 
                      className="font-mono font-bold text-[9px]"
                      tickLine={{ stroke: '#cbd5e1' }}
                      axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                      angle={-45} 
                      textAnchor="end"
                      interval={0}
                      height={70}
                      tick={{ fontSize: 10, fill: '#475569' }}
                    />
                    <YAxis yAxisId="left" width={70} className="font-mono font-bold text-[10px]" tick={{ fontSize: 10, fill: '#475569' }} tickLine={{ stroke: '#cbd5e1' }} axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                    <YAxis yAxisId="right" orientation="right" width={60} className="font-mono font-bold text-[10px]" tick={{ fontSize: 10, fill: '#475569' }} tickLine={{ stroke: '#cbd5e1' }} axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                        fontFamily: "monospace",
                        fontWeight: "bold",
                        fontSize: "11px",
                      }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px' }} />
                    <Bar yAxisId="left" dataKey="produksiPadi" name="Produksi Padi (Ton)" fill="#2563eb" stroke="#1d4ed8" strokeWidth={1} />
                    <Bar yAxisId="right" dataKey="totalKapasitasSimpanan" name="Kapasitas Simpan (Ton)" fill="#059669" stroke="#047857" strokeWidth={1} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Food Security Score Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 transition-all duration-300 hover:shadow-md">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 border-b border-slate-200 pb-4">
                <div>
                  <h4 className="text-lg font-mono font-bold uppercase tracking-wide">Status Ketahanan Cadangan Pangan</h4>
                  <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">Daftar kesiapan cadangan penyimpanan pangan tiap kecamatan</p>
                </div>
                <div className="flex items-center w-full md:w-64 border border-slate-200 rounded-xl px-3 py-1.5 bg-white shadow-sm">
                  <Search size={16} className="text-slate-500 mr-2 shrink-0" />
                  <input 
                    placeholder="Cari kecamatan..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none outline-none font-mono font-bold text-xs p-0 focus:ring-0"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-mono font-bold text-slate-700">
                      <th className="pb-3 px-3">KECAMATAN</th>
                      <th className="pb-3 px-3 text-right">HASIL PANEN (Ton)</th>
                      <th className="pb-3 px-3 text-right">LUMBUNG (Unit)</th>
                      <th className="pb-3 px-3 text-right">KAPASITAS LUMBUNG (Ton)</th>
                      <th className="pb-3 px-3 text-right">KAPASITAS GUDANG (Ton)</th>
                      <th className="pb-3 px-6 text-center">RASIO SIMPANAN</th>
                      <th className="pb-3 px-6 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item) => (
                      <tr 
                        key={item.kecamatan} 
                        className="border-b border-slate-200/20 hover:bg-slate-50 transition-colors text-sm"
                      >
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-800 uppercase text-xs">
                          {item.kecamatan}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                          {formatNum(item.produksiPadi)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                          {item.lumbungUnit}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                          {formatNum(item.lumbungKapasitas)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                          {formatNum(item.gudangKapasitas)}
                        </td>
                        <td className="py-3.5 px-6 text-center font-mono font-bold text-blue-600">
                          {formatNum(item.storageRatio, 2)}%
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span 
                            className={`inline-flex items-center px-2 py-0.5 border font-mono font-bold text-[10px] uppercase shadow-sm ${statusStyleMap[item.status]}`}
                          >
                            {item.status}
                          </span>
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
