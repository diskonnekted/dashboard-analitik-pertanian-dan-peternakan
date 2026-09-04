import { useEffect, useState } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchPadiProduction, PadiProduction } from "@/services/api";
import { Sprout, Calculator, TrendingUp, AlertCircle, Leaf } from "lucide-react";

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
        <section className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 animate-fade-in shadow-lg shadow-emerald-500/20">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)", backgroundSize: "24px 24px, 32px 32px" }} />
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-300/30 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/4 w-56 h-56 bg-lime-300/30 rounded-full blur-3xl translate-y-1/2" />
          <div className="absolute top-4 right-6 w-12 h-12 rounded-full bg-yellow-300/40 blur-xl" />
          <div className="absolute bottom-8 right-1/3 w-8 h-8 rounded-full bg-amber-200/50 blur-md" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-6 py-6 md:px-8 md:py-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-3">
                <Leaf className="text-white" size={14} />
                <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                  Bidang Tanaman Pangan & Produksi Padi
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl leading-tight font-black tracking-tight text-white drop-shadow-sm">
                Prediksi Panen Padi
              </h2>
              <p className="text-xs md:text-sm font-medium text-emerald-50 mt-2 max-w-2xl">
                Analisis produktivitas padi riil Kabupaten Banjarnegara (Data 2025) dilengkapi simulator ekspansi lahan.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-[10px] font-mono font-bold uppercase border border-white/20">
                  <Sprout size={11} /> Produktivitas Riil
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/30 backdrop-blur-sm text-white text-[10px] font-mono font-bold uppercase border border-amber-200/40">
                  <Calculator size={11} /> Simulator Ekspansi
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-300/20 backdrop-blur-sm text-white text-[10px] font-mono font-bold uppercase border border-cyan-200/30">
                  <TrendingUp size={11} /> Data 2025
                </span>
              </div>
            </div>
            <div className="w-full md:w-44 lg:w-52 shrink-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-full blur-2xl scale-90" />
                <img
                  src="/img/prediction.png"
                  alt="Prediksi Panen"
                  className="relative w-full max-h-28 md:max-h-32 object-contain drop-shadow-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 shadow-sm p-12 flex flex-col items-center justify-center gap-4 min-h-[300px]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500" />
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-300/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-lime-300/20 rounded-full blur-3xl" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 opacity-70 animate-pulse shadow-lg" />
            <div className="relative h-4 w-64 rounded-full bg-gradient-to-r from-emerald-200 via-green-200 to-lime-200 animate-pulse" />
            <p className="relative font-mono font-bold text-[10px] uppercase tracking-wider text-emerald-700 animate-pulse">
              Memuat data pertanian dari portal...
            </p>
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
          </div>
        ) : (
          <>
            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Chart Comparison */}
              <div className="relative overflow-hidden lg:col-span-2 bg-gradient-to-br from-blue-50 via-white to-indigo-50 border border-blue-200 rounded-2xl shadow-sm p-5 hover:shadow-lg transition-all duration-200">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                <div className="absolute -top-12 -right-12 w-44 h-44 bg-blue-300/20 rounded-full blur-3xl" />
                <div className="relative flex flex-col mb-4 border-b border-blue-200/60 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-300/50">
                      <TrendingUp className="text-white" size={14} />
                    </div>
                    <h4 className="text-base font-mono font-bold text-blue-900">
                      Profil Luas Panen vs Produksi Padi
                    </h4>
                  </div>
                  <p className="text-[11px] font-mono font-bold text-blue-700/70 uppercase tracking-wide">Perbandingan Luas Panen (Ha) dan Hasil Produksi (Ton) tiap Kecamatan</p>
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
                          border: "1px solid #bfdbfe",
                          borderRadius: "12px",
                          boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.15), 0 4px 6px -4px rgba(37, 99, 235, 0.08)",
                          fontFamily: "var(--font-sans)",
                          fontSize: "11px",
                        }}
                        cursor={{ fill: "#dbeafe", fillOpacity: 0.4 }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "var(--font-sans)", fontSize: "11px" }} />
                      <Bar yAxisId="left" dataKey="luasPanen" name="Luas Panen" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="produksi" name="Produksi" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Calculator Widget */}
              <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-orange-50 border border-amber-200 rounded-2xl shadow-sm p-5 flex flex-col hover:shadow-lg transition-all duration-200">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
                <div className="absolute -bottom-12 -right-12 w-44 h-44 bg-amber-300/20 rounded-full blur-3xl" />
                <div className="relative flex items-center gap-2 mb-4 border-b border-amber-200/60 pb-3">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-300/50">
                    <Calculator className="text-white" size={14} />
                  </div>
                  <h4 className="text-base font-mono font-bold text-amber-900">Simulator Ekspansi</h4>
                </div>
                
                <p className="relative text-[11px] font-mono font-bold text-amber-700/70 uppercase tracking-wide mb-4">
                  Prediksi hasil panen padi tambahan berdasarkan produktivitas wilayah.
                </p>

                <div className="relative flex flex-col gap-4 flex-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-mono font-bold text-amber-700 uppercase tracking-wider">Pilih Kecamatan:</span>
                    <select 
                      value={selectedKec} 
                      onChange={(e) => setSelectedKec(e.target.value)}
                      className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-300 transition-all shadow-sm font-mono font-bold"
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
                    <span className="text-[11px] font-mono font-bold text-orange-700 uppercase tracking-wider">Rencana Ekspansi (Ha):</span>
                    <div className="flex items-center w-full border border-orange-200 rounded-xl px-3 py-2 bg-white shadow-sm focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-300 transition-all">
                      <input 
                        type="number" 
                        value={expansionHa} 
                        onChange={(e) => setExpansionHa(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-xs text-slate-700 p-0 font-mono font-bold"
                      />
                      <span className="font-mono font-bold text-[10px] text-orange-500 ml-2">HA</span>
                    </div>
                  </div>

                  {activeKecData && (
                    <div className="mt-2 pt-4 border-t border-amber-200/60 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono text-amber-700/70 uppercase tracking-wide text-[10px] font-bold">Produktivitas:</span>
                        <span className="font-mono font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-300 shadow-sm">
                          {formatNum(activeKecData.rataRata)} Ku/Ha
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-1">
                        <div className="relative p-3 bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border border-sky-200 shadow-sm overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-blue-500" />
                          <p className="text-[10px] text-sky-700 uppercase font-mono font-bold tracking-wider">Lahan Baru</p>
                          <p className="text-sm font-mono font-bold text-sky-900 mt-0.5">{formatNum(projectedLuas)} Ha</p>
                          <p className="text-[10px] font-mono font-bold text-emerald-700">+{formatNum(inputExpansion)} Ha</p>
                        </div>
                        <div className="relative p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-green-500" />
                          <p className="text-[10px] text-emerald-700 uppercase font-mono font-bold tracking-wider">Hasil Panen</p>
                          <p className="text-sm font-mono font-bold text-emerald-900 mt-0.5">{formatNum(projectedProduksi)} Ton</p>
                          <p className="text-[10px] font-mono font-bold text-emerald-700">+{formatNum(inputExpansion * yieldRateTonHa)} Ton</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 text-[10px] text-blue-800 mt-2 bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded-xl border border-blue-200 shadow-sm">
                        <AlertCircle size={14} className="text-blue-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed font-mono">Rumus linear: <code className="bg-white/70 px-1 rounded">Produksi_Baru = Produksi_Lama + (Ekspansi × Laju_Produksi)</code></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ranking Table */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-lime-50 border border-emerald-200 rounded-2xl shadow-sm p-5 hover:shadow-lg transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500" />
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-300/20 rounded-full blur-3xl" />
              <div className="relative flex flex-col mb-4 border-b border-emerald-200/60 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-md shadow-emerald-300/50">
                    <Sprout className="text-white" size={14} />
                  </div>
                  <h4 className="text-base font-mono font-bold text-emerald-900">
                    Peringkat Produktivitas Padi per Kecamatan
                  </h4>
                </div>
                <p className="text-[11px] font-mono font-bold text-emerald-700/70 uppercase tracking-wide">Daftar wilayah diurutkan dari laju hasil per hektar tertinggi</p>
              </div>

              <div className="relative overflow-x-auto rounded-xl border border-emerald-100">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-gradient-to-r from-emerald-100 via-green-50 to-lime-100 border-b-2 border-emerald-300 text-[10px] font-mono font-black text-emerald-900 uppercase tracking-wider">
                      <th className="pb-3 px-3">Peringkat</th>
                      <th className="pb-3 px-3">Kecamatan</th>
                      <th className="pb-3 px-3 text-right">Luas Panen (Ha)</th>
                      <th className="pb-3 px-3 text-right">Produksi (Ton)</th>
                      <th className="pb-3 px-3 text-right">Produktivitas (Ku/Ha)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProductivity.map((item, index) => {
                      const rowStripe = index % 2 === 0 ? "bg-white/60" : "bg-emerald-50/40";
                      // Badge warna untuk peringkat atas
                      const rankColor =
                        index === 0
                          ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md"
                          : index === 1
                          ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md"
                          : index === 2
                          ? "bg-gradient-to-br from-orange-300 to-amber-500 text-white shadow-md"
                          : "bg-emerald-100 text-emerald-700 border border-emerald-200";
                      return (
                        <tr 
                          key={item.kecamatan} 
                          className={`border-b border-emerald-100/60 ${rowStripe} hover:bg-emerald-100/40 transition-colors text-xs text-slate-600`}
                        >
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full font-mono font-black text-[10px] ${rankColor}`}>
                              #{index + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-700 uppercase">
                            {item.kecamatan}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {formatNum(item.luasPanen)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {formatNum(item.produksi)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatNum(item.rataRata)}
                          </td>
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
