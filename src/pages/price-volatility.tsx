import { useEffect, useState } from "react";
import DefaultLayout from "@/layouts/default";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchInflationData, InflationData } from "@/services/api";
import { TrendingUp, AlertTriangle, ShieldAlert, Award } from "lucide-react";

export default function PriceVolatilityPage() {
  const [inflationData, setInflationData] = useState<InflationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchInflationData();
        setInflationData(data);
      } catch (err) {
        console.error("Gagal memuat data inflasi:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const uniqueYears = Array.from(new Set(inflationData.map(item => item.tahun)))
    .filter(y => y !== "")
    .sort((a, b) => a.localeCompare(b));

  const regions = Array.from(new Set(inflationData.map(item => item.pembanding)))
    .filter(r => r !== "");

  const chartData = uniqueYears.map(year => {
    const dataRow: any = { tahun: year };
    regions.forEach(region => {
      const match = inflationData.find(item => item.tahun === year && item.pembanding === region);
      dataRow[region] = match ? match.inflasi : 0;
    });
    return dataRow;
  });

  const volatilityMetrics = regions.map(region => {
    const regionData = inflationData
      .filter(item => item.pembanding === region)
      .map(item => item.inflasi);
    
    const count = regionData.length;
    const avg = count > 0 ? regionData.reduce((acc, curr) => acc + curr, 0) / count : 0;
    
    const variance = count > 0 ? regionData.reduce((acc, curr) => acc + Math.pow(curr - avg, 2), 0) / count : 0;
    const stdDev = Math.sqrt(variance);
    const maxVal = count > 0 ? Math.max(...regionData) : 0;

    return {
      region,
      average: avg,
      volatility: stdDev,
      max: maxVal
    };
  }).sort((a, b) => b.volatility - a.volatility);

  const formatNum = (num: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(num);

  const getLineColor = (region: string) => {
    switch (region.toLowerCase()) {
      case "banjarnegara": return "#10b981";
      case "nasional": return "#ef4444";
      case "jawa tengah": return "#3b82f6";
      case "banyumas": return "#eab308";
      case "cilacap": return "#8b5cf6";
      default: return "#6b7280";
    }
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8">
          
          
          <div className="relative z-10">
          
          <h2 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm">
            Volatilitas Ekonomi & Harga
          </h2>
          <p className="font-mono text-sm md:text-base font-medium text-[#4a4a4a] mt-4 max-w-2xl border-l-4 border-emerald-500 pl-4 bg-white/80 py-1">
            Analisis laju inflasi makro ekonomi perbandingan tahun 2018 - 2024 sebagai proksi fluktuasi harga komoditas.
          </p>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-neutral-500 font-mono font-bold animate-pulse uppercase">Memuat data fluktuasi harga...</p>
          </div>
        ) : (
          <>
            {/* Chart Section */}
            <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6 transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="flex flex-col mb-6 border-b-2 border-[#141414] pb-3">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <TrendingUp className="text-[#141414]" />
                  Tren Laju Inflasi Pembanding (%)
                </h4>
                <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">Perbandingan pertumbuhan inflasi tahunan daerah terhadap nasional</p>
              </div>

              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} vertical={false} />
                    <XAxis 
                      dataKey="tahun" 
                      className="font-mono font-bold text-[11px]" 
                      tickLine={{ stroke: '#141414', strokeWidth: 2 }} 
                      axisLine={{ stroke: '#141414', strokeWidth: 2 }} 
                    />
                    <YAxis 
                      className="font-mono font-bold text-[11px]" 
                      tickLine={{ stroke: '#141414', strokeWidth: 2 }} 
                      axisLine={{ stroke: '#141414', strokeWidth: 2 }} 
                      label={{ 
                        value: 'Inflasi (%)', 
                        angle: -90, 
                        position: 'insideLeft', 
                        offset: 10, 
                        style: { textAnchor: 'middle', fill: '#141414', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' } 
                      }} 
                    />
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
                    <Legend wrapperStyle={{ paddingTop: '10px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px' }} />
                    {regions.map(region => (
                      <Line 
                        key={region}
                        type="monotone"
                        dataKey={region}
                        stroke={getLineColor(region)}
                        strokeWidth={region.toLowerCase() === "banjarnegara" ? 4 : 2}
                        dot={region.toLowerCase() === "banjarnegara" ? { r: 5 } : { r: 3 }}
                        strokeDasharray={region.toLowerCase() === "nasional" ? "5 5" : undefined}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Volatility Index Metrics */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* Volatility Leaderboard */}
              <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6 transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="flex flex-col mb-4 border-b-2 border-[#141414] pb-3">
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                    <ShieldAlert className="text-yellow-600" size={18} />
                    Indeks Volatilitas Harga
                  </h4>
                  <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">Semakin tinggi deviasi standar, semakin bergejolak harga wilayah</p>
                </div>

                <div className="flex flex-col gap-3">
                  {volatilityMetrics.map((item, idx) => {
                    let level = "Normal";
                    let badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-600";
                    if (item.volatility > 1.5) {
                      level = "Tinggi";
                      badgeClass = "bg-red-100 text-red-800 border-red-600";
                    } else if (item.volatility > 0.8) {
                      level = "Sedang";
                      badgeClass = "bg-amber-100 text-amber-800 border-amber-600";
                    }

                    return (
                      <div key={item.region} className="flex justify-between items-center p-3 border-2 border-[#141414] bg-white shadow-[2px_2px_0px_0px_#141414]">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-neutral-400">#{idx + 1}</span>
                          <span className="text-xs font-mono font-bold text-neutral-800 uppercase">{item.region}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[9px] text-neutral-400 uppercase font-mono font-bold">Std Dev</p>
                            <p className="text-xs font-mono font-bold text-neutral-800">{formatNum(item.volatility)}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 border-2 font-mono font-bold text-[10px] uppercase shadow-[1px_1px_0px_0px_#141414] ${badgeClass}`}>
                            {level}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Economic Insights Card */}
              <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div>
                  <div className="flex items-center gap-2 mb-4 border-b-2 border-[#141414] pb-3">
                    <Award className="text-emerald-600" size={20} />
                    <h4 className="text-md font-mono font-bold uppercase tracking-wide">Ringkasan Analisis</h4>
                  </div>

                  <p className="text-xs font-mono font-bold text-neutral-600 leading-relaxed mb-4 uppercase">
                    Berdasarkan data laju inflasi, daerah pembanding seperti Banyumas dan Cilacap memiliki laju yang cukup dinamis.
                  </p>
                  <p className="text-xs font-mono font-bold text-neutral-600 leading-relaxed mb-4 uppercase">
                    Sementara inflasi Banjarnegara yang stabil memberi ruang ketahanan harga jangka panjang, tetapi memerlukan penguatan daya beli pedesaan.
                  </p>
                </div>

                <div className="flex items-start gap-2 p-3 bg-red-50 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] text-[10px] text-red-800 mt-2">
                  <AlertTriangle className="shrink-0 mt-0.5 text-red-600" size={14} />
                  <span className="font-mono font-bold leading-normal uppercase">
                    Gejolak Musiman: Kenaikan inflasi dipicu harga volatile foods menjelang hari raya keagamaan dan puncak musim kemarau.
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </DefaultLayout>
  );
}
