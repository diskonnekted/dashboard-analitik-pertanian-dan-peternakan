import { useEffect, useState } from "react";
import DefaultLayout from "@/layouts/default";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchMarketData, MarketData } from "@/services/api";
import { Truck, Store, ArrowRight, ShieldCheck } from "lucide-react";

export default function SupplyChainPage() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchMarketData();
        setMarketData(data);
      } catch (err) {
        console.error("Gagal memuat data pasar:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const uniqueYears = Array.from(new Set(marketData.map(item => item.tahun)))
    .filter(y => y !== "")
    .sort((a, b) => a.localeCompare(b));

  const marketTypes = Array.from(new Set(marketData.map(item => item.jenis)))
    .filter(t => t !== "");

  const chartData = uniqueYears.map(year => {
    const rowRow: any = { tahun: year };
    marketTypes.forEach(type => {
      const match = marketData.find(item => item.tahun === year && item.jenis === type);
      rowRow[type] = match ? match.jumlah : 0;
    });
    return rowRow;
  });

  const latestYear = uniqueYears[uniqueYears.length - 1] || "";
  const latestMarkets = marketData.filter(item => item.tahun === latestYear);

  const realRoutes = [
    {
      id: 1,
      from: "Kecamatan Batur (Dieng)",
      commodity: "Kentang & Sayur Mayur",
      via: "Pasar Sayur Karangkobar",
      to: "Pasar Induk Banjarnegara",
      desc: "Rute distribusi dataran tinggi utara melintasi jalur pegunungan menuju pusat kota.",
      status: "Lancar",
      badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-600"
    },
    {
      id: 2,
      from: "Kecamatan Purwanegara",
      commodity: "Beras & Cabai",
      via: "Gudang Pangan Purwanegara",
      to: "Pasar Rakyat Mandiraja & Klampok",
      desc: "Suplai pangan pokok untuk wilayah barat perbatasan Banyumas.",
      status: "Padat",
      badgeStyle: "bg-amber-100 text-amber-800 border-amber-600"
    },
    {
      id: 3,
      from: "Kecamatan Sigaluh",
      commodity: "Durian & Salak Pondoh",
      via: "Pengepul Buah Sigaluh",
      to: "Pasar Buah Banjarnegara & Luar Daerah",
      desc: "Sentra hortikultura buah segar untuk konsumsi domestik dan ekspor daerah.",
      status: "Lancar",
      badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-600"
    }
  ];

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b-2 border-dashed border-neutral-300 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm">
            Infrastruktur Rantai Pasok
          </h2>
            <p className="font-mono text-sm md:text-base font-medium text-[#4a4a4a] mt-4 max-w-2xl border-l-4 border-emerald-500 pl-4 bg-white/80 py-1">
            Pemetaan sarana perdagangan pasar riil Kabupaten Banjarnegara untuk mengoptimalkan alur distribusi pangan.
          </p>
          </div>
          <div className="w-full md:w-48 lg:w-64 shrink-0 flex items-center justify-center">
            <img
              src="/img/supply-chain.png"
              alt="Rantai Pasok"
              className="w-full max-h-32 md:max-h-36 object-contain"
            />
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-neutral-500 font-mono font-bold animate-pulse uppercase">Memuat data logistik...</p>
          </div>
        ) : (
          <>
            {/* Visualisasi Perkembangan Pasar */}
            <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6 transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="flex flex-col mb-6 border-b-2 border-[#141414] pb-3">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <Store className="text-[#141414]" />
                  Tren Perkembangan Pasar Daerah (2016-2025)
                </h4>
                <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">Jumlah pasar resmi dikelola daerah berdasarkan spesifikasi komoditas</p>
              </div>

              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
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
                    <Legend wrapperStyle={{ paddingTop: '15px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="Umum" name="Pasar Umum" stackId="1" stroke="#141414" strokeWidth={2} fill="#93c5fd" fillOpacity={0.8} />
                    <Area type="monotone" dataKey="Hewan" name="Pasar Hewan" stackId="1" stroke="#141414" strokeWidth={2} fill="#a7f3d0" fillOpacity={0.8} />
                    <Area type="monotone" dataKey="Buah" name="Pasar Buah" stackId="1" stroke="#141414" strokeWidth={2} fill="#fde047" fillOpacity={0.8} />
                    <Area type="monotone" dataKey="Ikan" name="Pasar Ikan" stackId="1" stroke="#141414" strokeWidth={2} fill="#f87171" fillOpacity={0.8} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribution Flow Map / Table */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Market Capacity summary */}
              <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div>
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 mb-4 border-b-2 border-[#141414] pb-3 tracking-wide">
                    <Store className="text-[#141414]" size={18} />
                    Kapasitas Pasar Aktif ({latestYear})
                  </h4>
                  <div className="flex flex-col gap-4">
                    {latestMarkets.map(item => (
                      <div key={item.jenis} className="flex justify-between items-center pb-2 border-b border-[#141414]/20">
                        <span className="text-xs font-mono font-bold text-neutral-800 uppercase">Pasar {item.jenis}</span>
                        <span className="inline-flex items-center px-2 py-0.5 border-2 border-[#141414] bg-yellow-200 text-neutral-800 font-mono font-bold text-xs shadow-[1px_1px_0px_0px_#141414]">
                          {item.jumlah} UNIT
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 p-3 bg-emerald-50 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] text-[10px] text-emerald-800 flex items-start gap-2">
                  <ShieldCheck size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                  <span className="font-mono font-bold uppercase leading-normal">Ketersediaan pasar ikan dan buah khusus sangat mendukung stabilitas harga komoditas.</span>
                </div>
              </div>

              {/* Real Distribution Routes */}
              <div className="lg:col-span-2 bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6 transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="flex flex-col mb-6 border-b-2 border-[#141414] pb-3">
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                    <Truck className="text-[#141414]" size={18} />
                    Alur Distribusi Logistik Hortikultura Riil
                  </h4>
                  <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">Peta pergerakan pasokan pertanian dari produsen ke pasar konsumen</p>
                </div>

                <div className="flex flex-col gap-5">
                  {realRoutes.map((route) => (
                    <div 
                      key={route.id} 
                      className="p-4 border-2 border-[#141414] bg-white shadow-[3px_3px_0px_0px_#141414] flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-center border-b border-[#141414]/10 pb-2">
                        <span className={`inline-flex items-center px-2 py-0.5 border-2 font-mono font-bold text-[10px] uppercase shadow-[1px_1px_0px_0px_#141414] ${route.badgeStyle}`}>
                          Jalur {route.status}
                        </span>
                        <span className="text-xs font-mono font-bold text-blue-600 uppercase">{route.commodity}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-neutral-800 uppercase">
                        <span>{route.from}</span>
                        <ArrowRight size={14} className="text-neutral-500" />
                        <span className="text-purple-600">{route.via}</span>
                        <ArrowRight size={14} className="text-neutral-500" />
                        <span>{route.to}</span>
                      </div>

                      <p className="text-xs text-neutral-600 leading-relaxed font-mono mt-1 whitespace-normal uppercase text-[10px]">
                        {route.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </DefaultLayout>
  );
}
