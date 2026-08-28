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
      <section className="flex flex-col gap-6 py-2">
        {/* Hero / intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-6 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="relative z-10 flex-1">
            <h2 className="text-2xl sm:text-4xl leading-tight font-bold tracking-tight text-slate-800">
              Prediksi Panen Padi
            </h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-2 max-w-2xl border-l-2 border-blue-500 pl-3">
              Analisis produktivitas padi riil Kabupaten Banjarnegara (Data 2025) dilengkapi simulator ekspansi lahan.
            </p>
          </div>
          <div className="w-full md:w-36 lg:w-48 shrink-0 flex items-center justify-center">
            <img
              src="/img/prediction.png"
              alt="Prediksi Panen"
              className="w-full max-h-24 md:max-h-28 object-contain"
            />
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-slate-400 font-sans font-semibold animate-pulse">Memuat data pertanian dari portal...</p>
          </div>
        ) : (
          <>
            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Chart Comparison */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-all duration-200">
                <div className="flex flex-col mb-4 border-b border-slate-100 pb-3">
                  <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="text-blue-500 w-4 h-4" />
                    Profil Luas Panen vs Produksi Padi
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Perbandingan Luas Panen (Ha) dan Hasil Produksi (Ton) tiap Kecamatan</p>
                </div>
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={padiData} margin={{ top: 10, right: 10, left: 0, bottom: 90 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" strokeOpacity={0.4} vertical={false} />
                      <XAxis 
                        dataKey="kecamatan" 
                        className="font-sans text-[9px] text-slate-400"
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                        angle={-45} 
                        textAnchor="end"
                        interval={0}
                        height={70}
                        tick={{ fontSize: 10, fill: '#475569' }}
                      />
                      <YAxis yAxisId="left" width={70} tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                      <YAxis yAxisId="right" orientation="right" width={60} tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                          fontFamily: "var(--font-sans)",
                          fontSize: "11px",
                        }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "var(--font-sans)", fontSize: "11px" }} />
                      <Bar yAxisId="left" dataKey="luasPanen" name="Luas Panen" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="produksi" name="Produksi" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Calculator Widget */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                  <Calculator className="text-blue-500" size={20} />
                  <h4 className="text-base font-bold text-slate-800">Simulator Ekspansi</h4>
                </div>
                
                <p className="text-[11px] text-slate-400 mb-4">
                  Prediksi hasil panen padi tambahan berdasarkan produktivitas wilayah.
                </p>

                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pilih Kecamatan:</span>
                    <select 
                      value={selectedKec} 
                      onChange={(e) => setSelectedKec(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-150 transition-all"
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
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rencana Ekspansi (Ha):</span>
                    <div className="flex items-center w-full border border-slate-200 rounded-lg px-3 py-2 bg-white">
                      <input 
                        type="number" 
                        value={expansionHa} 
                        onChange={(e) => setExpansionHa(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-xs text-slate-700 p-0"
                      />
                      <span className="font-sans font-bold text-[10px] text-slate-400 ml-2">HA</span>
                    </div>
                  </div>

                  {activeKecData && (
                    <div className="mt-2 pt-4 border-t border-slate-100 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-sans text-slate-400">Produktivitas:</span>
                        <span className="font-sans font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                          {formatNum(activeKecData.rataRata)} Ku/Ha
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-1">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Lahan Baru</p>
                          <p className="text-sm font-bold text-slate-700 mt-0.5">{formatNum(projectedLuas)} Ha</p>
                          <p className="text-[10px] font-semibold text-emerald-600">+{formatNum(inputExpansion)} Ha</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Hasil Panen</p>
                          <p className="text-sm font-bold text-blue-600 mt-0.5">{formatNum(projectedProduksi)} Ton</p>
                          <p className="text-[10px] font-semibold text-emerald-600">+{formatNum(inputExpansion * yieldRateTonHa)} Ton</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 text-[10px] text-slate-500 mt-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100/60">
                        <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">Rumus linear: `Produksi_Baru = Produksi_Lama + (Ekspansi * Laju_Produksi)`.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ranking Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-all duration-200">
              <div className="flex flex-col mb-4 border-b border-slate-100 pb-3">
                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Sprout className="text-blue-500 w-4 h-4" />
                  Peringkat Produktivitas Padi per Kecamatan
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Daftar wilayah diurutkan dari laju hasil per hektar tertinggi</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
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
                        className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors text-xs text-slate-600"
                      >
                        <td className="py-3 px-3 font-semibold text-slate-400">#{index + 1}</td>
                        <td className="py-3 px-3 font-bold text-slate-700 uppercase">
                          {item.kecamatan}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500">
                          {formatNum(item.luasPanen)}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500">
                          {formatNum(item.produksi)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-600">
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
