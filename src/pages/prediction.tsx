import { useEffect, useState } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchPadiProduction, PadiProduction } from "@/services/api";
import { Sprout, Calculator, TrendingUp, AlertCircle } from "lucide-react";

export default function PredictionPage() {
  const [padiData, setPadiData] = useState<PadiProduction[]>([]);
  const [selectedKec, setSelectedKec] = useState<string>("");
  const [expansionHa, setExpansionHa] = useState<string>("50");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchPadiProduction();
        setPadiData(data);
        if (data.length > 0) {
          const sorted = [...data].sort((a, b) => a.kecamatan.localeCompare(b.kecamatan));
          setSelectedKec(sorted[0].kecamatan);
        }
      } catch (err) {
        console.error("Gagal memuat data padi:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const activeKecData = padiData.find(item => item.kecamatan === selectedKec);

  const inputExpansion = parseFloat(expansionHa) || 0;
  const currentLuas = activeKecData ? activeKecData.luasPanen : 0;
  const currentProduksi = activeKecData ? activeKecData.produksi : 0;
  const yieldRateTonHa = activeKecData ? (activeKecData.rataRata / 10) : 0;
  
  const projectedLuas = currentLuas + inputExpansion;
  const projectedProduksi = currentProduksi + (inputExpansion * yieldRateTonHa);

  const sortedProductivity = [...padiData].sort((a, b) => b.rataRata - a.rataRata);

  const formatNum = (num: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(num);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Header */}
        <div className="bg-emerald-100 border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6 text-left">
          <h1 className="text-3xl md:text-4xl font-serif font-black uppercase tracking-tight text-[#141414]">
            Prediksi Panen Padi
          </h1>
          <p className="text-xs font-mono font-bold text-neutral-600 mt-2 uppercase tracking-wide">
            Analisis produktivitas padi riil Kabupaten Banjarnegara (Data 2025) dilengkapi simulator ekspansi lahan
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-neutral-500 font-mono font-bold animate-pulse uppercase">Memuat data pertanian dari portal...</p>
          </div>
        ) : (
          <>
            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Chart Comparison */}
              <div className="lg:col-span-2 bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6">
                <div className="flex flex-col mb-4 border-b-2 border-[#141414] pb-3">
                  <h4 className="text-lg font-serif font-black uppercase flex items-center gap-2">
                    <TrendingUp className="text-emerald-600" />
                    Profil Luas Panen vs Produksi Padi
                  </h4>
                  <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">Perbandingan Luas Panen (Ha) dan Hasil Produksi (Ton) tiap Kecamatan</p>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={padiData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
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
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontWeight: "bold", fontSize: "11px" }} />
                      <Bar yAxisId="left" dataKey="luasPanen" name="Luas Panen" fill="#a7f3d0" stroke="#141414" strokeWidth={2} />
                      <Bar yAxisId="right" dataKey="produksi" name="Produksi" fill="#93c5fd" stroke="#141414" strokeWidth={2} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Calculator Widget */}
              <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-4 border-b-2 border-[#141414] pb-3">
                  <Calculator className="text-emerald-600" size={22} />
                  <h4 className="text-lg font-serif font-black uppercase">Simulator Ekspansi</h4>
                </div>
                
                <p className="text-xs font-mono font-bold text-neutral-500 uppercase mb-4">
                  Prediksi hasil panen padi tambahan berdasarkan produktivitas wilayah.
                </p>

                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-mono font-bold text-neutral-700 uppercase">Pilih Kecamatan:</span>
                    <select 
                      value={selectedKec} 
                      onChange={(e) => setSelectedKec(e.target.value)}
                      className="w-full border-2 border-[#141414] rounded-none px-3 py-2 font-mono font-bold text-xs uppercase bg-white shadow-[2px_2px_0px_0px_#141414] focus:outline-none"
                    >
                      {[...padiData]
                        .sort((a, b) => a.kecamatan.localeCompare(b.kecamatan))
                        .map((item) => (
                          <option key={item.kecamatan} value={item.kecamatan} className="capitalize">
                            {item.kecamatan.toUpperCase()}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-mono font-bold text-neutral-700 uppercase">Rencana Ekspansi (Ha):</span>
                    <div className="flex items-center w-full border-2 border-[#141414] rounded-none px-3 py-1.5 bg-white shadow-[2px_2px_0px_0px_#141414]">
                      <input 
                        type="number" 
                        value={expansionHa} 
                        onChange={(e) => setExpansionHa(e.target.value)}
                        className="w-full bg-transparent border-none outline-none font-mono font-bold text-xs p-0"
                      />
                      <span className="font-mono font-bold text-xs text-neutral-500 ml-2">HA</span>
                    </div>
                  </div>

                  {activeKecData && (
                    <div className="mt-4 pt-4 border-t-2 border-[#141414] flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono font-bold text-neutral-600 uppercase">Produktivitas:</span>
                        <span className="font-mono font-bold px-2 py-0.5 border-2 border-[#141414] bg-yellow-200 text-neutral-800 shadow-[1px_1px_0px_0px_#141414]">
                          {formatNum(activeKecData.rataRata)} Ku/Ha
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="p-3 bg-neutral-50 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414]">
                          <p className="text-[9px] text-neutral-500 uppercase font-mono font-bold">Lahan Baru</p>
                          <p className="text-sm font-mono font-bold text-neutral-800 mt-1">{formatNum(projectedLuas)} Ha</p>
                          <p className="text-[9px] font-mono font-bold text-emerald-600">+{formatNum(inputExpansion)} Ha</p>
                        </div>
                        <div className="p-3 bg-neutral-50 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414]">
                          <p className="text-[9px] text-neutral-500 uppercase font-mono font-bold">Hasil Panen</p>
                          <p className="text-sm font-mono font-bold text-blue-600 mt-1">{formatNum(projectedProduksi)} Ton</p>
                          <p className="text-[9px] font-mono font-bold text-emerald-600">+{formatNum(inputExpansion * yieldRateTonHa)} Ton</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 text-[10px] text-neutral-600 mt-2 bg-yellow-50 p-2.5 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414]">
                        <AlertCircle size={14} className="text-yellow-600 shrink-0 mt-0.5" />
                        <span className="font-mono font-bold leading-normal">Rumus linear: `Produksi_Baru = Produksi_Lama + (Ekspansi * Laju_Produksi)`.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ranking Table */}
            <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6">
              <div className="flex flex-col mb-4 border-b-2 border-[#141414] pb-3">
                <h4 className="text-lg font-serif font-black uppercase flex items-center gap-2">
                  <Sprout className="text-emerald-600" />
                  Peringkat Produktivitas Padi per Kecamatan
                </h4>
                <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">Daftar wilayah diurutkan dari laju hasil per hektar tertinggi</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-[#141414] text-xs font-mono font-bold text-neutral-700">
                      <th className="pb-3 px-3">PERINGKAT</th>
                      <th className="pb-3 px-3">KECAMATAN</th>
                      <th className="pb-3 px-3 text-right">LUAS PANEN (Ha)</th>
                      <th className="pb-3 px-3 text-right">PRODUKSI (Ton)</th>
                      <th className="pb-3 px-3 text-right">PRODUKTIVITAS (Ku/Ha)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProductivity.map((item, index) => (
                      <tr 
                        key={item.kecamatan} 
                        className="border-b border-[#141414]/20 hover:bg-neutral-50 transition-colors text-sm"
                      >
                        <td className="py-3 px-3 font-mono font-bold text-neutral-500">#{index + 1}</td>
                        <td className="py-3 px-3 font-mono font-bold text-neutral-800 uppercase text-xs">
                          {item.kecamatan}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-neutral-600">
                          {formatNum(item.luasPanen)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-neutral-600">
                          {formatNum(item.produksi)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatNum(item.rataRata)}
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
