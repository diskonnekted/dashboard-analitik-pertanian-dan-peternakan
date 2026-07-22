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
        const padi = await fetchPadiProduction();
        const lumbung = await fetchLumbungPangan();

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
        <section className="relative text-left animate-fade-in py-4 md:py-8">
          
          
          <div className="relative z-10">
          
          <h2 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm">
            Ketahanan Pangan (FSI)
          </h2>
          <p className="font-mono text-sm md:text-base font-medium text-[#4a4a4a] mt-4 max-w-2xl border-l-4 border-emerald-500 pl-4 bg-white/80 py-1">
            Analisis infrastruktur cadangan pangan riil Kabupaten Banjarnegara berdasarkan sebaran lumbung pangan dan volume produksi padi.
          </p>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-neutral-500 font-mono font-bold animate-pulse uppercase">Memuat data ketahanan pangan...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-5 flex items-center gap-3 transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="p-3 border-2 border-[#141414] bg-blue-100 text-[#141414] shadow-[2px_2px_0px_0px_#141414]">
                  <Warehouse size={22} />
                </div>
                <div>
                  <p className="text-xs font-mono font-bold text-neutral-500 uppercase">Total Lumbung Aktif</p>
                  <p className="text-xl font-serif font-black mt-0.5">{totalLumbungUnits} Unit</p>
                </div>
              </div>

              <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-5 flex items-center gap-3 transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="p-3 border-2 border-[#141414] bg-emerald-100 text-[#141414] shadow-[2px_2px_0px_0px_#141414]">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-xs font-mono font-bold text-neutral-500 uppercase">Total Kapasitas Simpan</p>
                  <p className="text-xl font-serif font-black mt-0.5">{formatNum(totalStorageCapacity)} Ton</p>
                </div>
              </div>

              <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-5 flex items-center gap-3 transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="p-3 border-2 border-[#141414] bg-yellow-100 text-[#141414] shadow-[2px_2px_0px_0px_#141414]">
                  <Warehouse size={22} />
                </div>
                <div>
                  <p className="text-xs font-mono font-bold text-neutral-500 uppercase">Kapasitas vs Hasil Panen</p>
                  <p className="text-xl font-serif font-black mt-0.5">
                    {formatNum((totalStorageCapacity / totalPadiProd) * 100, 2)} %
                  </p>
                </div>
              </div>
            </div>

            {/* Storage Gap Chart */}
            <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6 transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="flex flex-col mb-6 border-b-2 border-[#141414] pb-3">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <AlertCircle className="text-blue-600" />
                  Kesenjangan Produksi vs Kapasitas Lumbung
                </h4>
                <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">Perbandingan volume panen Padi (Ton) dengan kapasitas simpan Lumbung/Gudang Pangan (Ton)</p>
              </div>

              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={combinedData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} vertical={false} />
                    <XAxis 
                      dataKey="kecamatan" 
                      className="font-mono font-bold text-[9px]"
                      tickLine={{ stroke: '#141414', strokeWidth: 2 }}
                      axisLine={{ stroke: '#141414', strokeWidth: 2 }}
                      angle={-45} 
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis yAxisId="left" className="font-mono font-bold text-[10px]" tickLine={{ stroke: '#141414', strokeWidth: 2 }} axisLine={{ stroke: '#141414', strokeWidth: 2 }} />
                    <YAxis yAxisId="right" orientation="right" className="font-mono font-bold text-[10px]" tickLine={{ stroke: '#141414', strokeWidth: 2 }} axisLine={{ stroke: '#141414', strokeWidth: 2 }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "2px solid #141414",
                        borderRadius: "0px",
                        boxShadow: "3px 3px 0px 0px #141414",
                        fontFamily: "monospace",
                        fontWeight: "bold",
                        fontSize: "11px",
                      }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px' }} />
                    <Bar yAxisId="left" dataKey="produksiPadi" name="Produksi Padi (Ton)" fill="#93c5fd" stroke="#141414" strokeWidth={2} />
                    <Bar yAxisId="right" dataKey="totalKapasitasSimpanan" name="Kapasitas Simpan (Ton)" fill="#a7f3d0" stroke="#141414" strokeWidth={2} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Food Security Score Table */}
            <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6 transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 border-b-2 border-[#141414] pb-4">
                <div>
                  <h4 className="text-lg font-mono font-bold uppercase tracking-wide">Status Ketahanan Cadangan Pangan</h4>
                  <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">Daftar kesiapan cadangan penyimpanan pangan tiap kecamatan</p>
                </div>
                <div className="flex items-center w-full md:w-64 border-2 border-[#141414] rounded-none px-3 py-1.5 bg-white shadow-[2px_2px_0px_0px_#141414]">
                  <Search size={16} className="text-neutral-500 mr-2 shrink-0" />
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
                    <tr className="border-b-2 border-[#141414] text-xs font-mono font-bold text-neutral-700">
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
                        className="border-b border-[#141414]/20 hover:bg-neutral-50 transition-colors text-sm"
                      >
                        <td className="py-3.5 px-3 font-mono font-bold text-neutral-800 uppercase text-xs">
                          {item.kecamatan}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-neutral-600">
                          {formatNum(item.produksiPadi)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-neutral-600">
                          {item.lumbungUnit}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-neutral-600">
                          {formatNum(item.lumbungKapasitas)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-neutral-600">
                          {formatNum(item.gudangKapasitas)}
                        </td>
                        <td className="py-3.5 px-6 text-center font-mono font-bold text-blue-600">
                          {formatNum(item.storageRatio, 2)}%
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span 
                            className={`inline-flex items-center px-2 py-0.5 border-2 font-mono font-bold text-[10px] uppercase shadow-[1px_1px_0px_0px_#141414] ${statusStyleMap[item.status]}`}
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
