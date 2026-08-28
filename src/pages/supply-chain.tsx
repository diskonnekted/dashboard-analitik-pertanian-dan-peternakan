import { useEffect, useState } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

  const latestYear = uniqueYears[uniqueYears.length - 1] || "";
  const latestMarkets = marketData.filter(item => item.tahun === latestYear);
  const totalLatestMarkets = latestMarkets.reduce((sum, item) => sum + item.jumlah, 0);

  const marketNodes = [
    {
      name: "Pasar Induk Banjarnegara",
      kecamatan: "Banjarnegara",
      type: "Pasar induk / pusat konsumsi",
      role: "Tujuan utama distribusi sayuran dataran tinggi dan pangan kabupaten",
      commodities: "Kentang, kubis, cabai, beras, buah lokal",
      source: "Rute logistik internal aplikasi",
    },
    {
      name: "Pasar Sayur Karangkobar",
      kecamatan: "Karangkobar",
      type: "Pasar pengumpul sayuran",
      role: "Simpul konsolidasi komoditas dataran tinggi utara sebelum masuk pusat kota",
      commodities: "Kentang, kubis, cabai rawit, sayur mayur",
      source: "Rute logistik internal aplikasi",
    },
    {
      name: "Pasar Rakyat Mandiraja",
      kecamatan: "Mandiraja",
      type: "Pasar rakyat / koridor barat",
      role: "Pintu distribusi pangan untuk wilayah barat dan perbatasan Banyumas",
      commodities: "Beras, cabai, palawija, komoditas harian",
      source: "Rute logistik internal aplikasi",
    },
    {
      name: "Pasar Rakyat Klampok",
      kecamatan: "Purwareja Klampok",
      type: "Pasar rakyat / wilayah perbatasan",
      role: "Tujuan distribusi pangan dan komoditas dari koridor Purwanegara-Mandiraja",
      commodities: "Beras, cabai, pangan pokok",
      source: "Rute logistik internal aplikasi",
    },
    {
      name: "Pasar Buah Banjarnegara",
      kecamatan: "Banjarnegara",
      type: "Pasar buah / outlet komoditas segar",
      role: "Simpul pemasaran buah segar dari Sigaluh dan sentra hortikultura buah",
      commodities: "Durian, salak, pisang, pepaya, buah lokal",
      source: "Rute logistik internal aplikasi",
    },
    {
      name: "Pasar Desa Selatan",
      kecamatan: "Koridor selatan",
      type: "Jaringan pasar desa",
      role: "Outlet pasar lokal untuk komoditas sayur dan pangan harian",
      commodities: "Sayuran, cabai, pangan rumah tangga",
      source: "Rute logistik internal aplikasi",
    },
  ];

  const realRoutes = [
    {
      id: 1,
      from: "Kecamatan Batur (Dieng)",
      commodity: "Kentang & Sayur Mayur",
      via: "Pasar Sayur Karangkobar",
      to: "Pasar Induk Banjarnegara",
      desc: "Rute distribusi dataran tinggi utara melintasi jalur pegunungan menuju pusat kota.",
      status: "Lancar",
      risk: "Risiko kabut dan longsor pada musim hujan",
      priority: "Cold chain sederhana, sortir kualitas, jadwal angkut pagi",
      distance: "Koridor utara - kota",
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
      risk: "Kemacetan distribusi karena melayani koridor barat dan pasar perbatasan",
      priority: "Buffer stock cabai/beras, pengaturan jam bongkar, gudang transit",
      distance: "Koridor barat - Klampok/Mandiraja",
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
      risk: "Fluktuasi pasokan buah musiman dan kebutuhan sortasi mutu",
      priority: "Pusat grading buah, kemasan standar, koneksi pasar luar daerah",
      distance: "Koridor timur - pusat buah",
      badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-600"
    },
    {
      id: 4,
      from: "Kecamatan Wanayasa & Pejawaran",
      commodity: "Kubis, Cabai Rawit & Sayur Dataran Tinggi",
      via: "Koridor Karangkobar - Banjarnegara",
      to: "Pasar Induk Banjarnegara & Pasar Desa Selatan",
      desc: "Jalur pengumpul sayuran dari dataran tinggi menuju pasar kabupaten dan pedagang antar daerah.",
      status: "Perlu Monitoring",
      risk: "Harga cepat berubah dan produk mudah susut kualitasnya",
      priority: "Informasi harga harian, konsolidasi muatan, titik timbang bersama",
      distance: "Koridor utara-tengah",
      badgeStyle: "bg-sky-100 text-sky-800 border-sky-600"
    },
    {
      id: 5,
      from: "Kecamatan Susukan & Mandiraja",
      commodity: "Padi, Palawija & Cabai Lokal",
      via: "Pasar Rakyat Mandiraja",
      to: "Konsumen Banjarnegara Barat & Banyumas",
      desc: "Koridor barat berfungsi sebagai pintu keluar komoditas pangan menuju wilayah perbatasan.",
      status: "Strategis",
      risk: "Ketergantungan pada pasar pengumpul dan variasi harga antar wilayah",
      priority: "Kemitraan pedagang, gudang mini, pencatatan volume keluar daerah",
      distance: "Koridor barat",
      badgeStyle: "bg-violet-100 text-violet-800 border-violet-600"
    }
  ];

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-200 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="text-2xl sm:text-4xl leading-tight font-bold tracking-tight text-slate-800">
            Infrastruktur Rantai Pasok
          </h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-2 max-w-2xl border-l-2 border-blue-500 pl-3">
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
            <p className="text-slate-500 font-mono font-bold animate-pulse uppercase">Memuat data logistik...</p>
          </div>
        ) : (
          <>
            {/* Analisis Kesiapan Koridor Logistik */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 transition-all duration-300 hover:shadow-md">
              <div className="flex flex-col mb-6 border-b border-slate-200 pb-3">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <Truck className="text-slate-800" />
                  Analisis Kesiapan Koridor Logistik Hortikultura
                </h4>
                <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">Ringkasan fungsi pasar dan prioritas intervensi distribusi pangan</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={realRoutes} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }} />
                      <YAxis dataKey="distance" type="category" width={135} tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }} />
                      <Tooltip
                        formatter={(_, __, item: any) => [item?.payload?.commodity || "-", "Komoditas"]}
                        contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", fontFamily: "monospace", fontWeight: "bold", fontSize: "11px" }}
                      />
                      <Bar dataKey={() => 1} name="Koridor" fill="#059669" stroke="#cbd5e1" strokeWidth={1} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="border border-slate-200 bg-emerald-50 p-4 shadow-sm">
                    <p className="text-[10px] font-mono font-bold uppercase text-slate-500">Pasar Aktif {latestYear}</p>
                    <h5 className="text-3xl font-serif font-black text-slate-800 mt-1">{totalLatestMarkets}</h5>
                    <p className="text-[10px] font-mono font-bold uppercase text-emerald-700 mt-1">Total simpul pasar dari data resmi</p>
                  </div>
                  <div className="border border-slate-200 bg-yellow-50 p-4 shadow-sm">
                    <p className="text-[10px] font-mono font-bold uppercase text-slate-500">Koridor Prioritas</p>
                    <h5 className="text-3xl font-serif font-black text-slate-800 mt-1">{realRoutes.length}</h5>
                    <p className="text-[10px] font-mono font-bold uppercase text-yellow-700 mt-1">Rute produksi menuju pasar konsumen</p>
                  </div>
                  <div className="border border-slate-200 bg-sky-50 p-4 shadow-sm">
                    <p className="text-[10px] font-mono font-bold uppercase text-slate-500">Fokus Tindakan</p>
                    <p className="text-xs font-mono font-bold uppercase text-slate-800 mt-2 leading-relaxed">Sortasi, konsolidasi muatan, cold chain sederhana, dan pencatatan volume keluar daerah.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Peta / Tabel Alur Distribusi */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Market Capacity summary */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-md">
                <div>
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 mb-4 border-b border-slate-200 pb-3 tracking-wide">
                    <Store className="text-slate-800" size={18} />
                    Kapasitas Pasar Aktif ({latestYear})
                  </h4>
                  <div className="flex flex-col gap-4">
                    {latestMarkets.map(item => (
                      <div key={item.jenis} className="flex justify-between items-center pb-2 border-b border-slate-200/20">
                        <span className="text-xs font-mono font-bold text-slate-800 uppercase">Pasar {item.jenis}</span>
                        <span className="inline-flex items-center px-2 py-0.5 border border-slate-200 bg-yellow-200 text-slate-800 font-mono font-bold text-xs shadow-sm">
                          {item.jumlah} UNIT
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 p-3 bg-emerald-50 border border-slate-200 shadow-sm text-[10px] text-emerald-800 flex items-start gap-2">
                  <ShieldCheck size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                  <span className="font-mono font-bold uppercase leading-normal">Ketersediaan pasar ikan dan buah khusus sangat mendukung stabilitas harga komoditas.</span>
                </div>
              </div>

              {/* Real Distribution Routes */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 transition-all duration-300 hover:shadow-md">
                <div className="flex flex-col mb-6 border-b border-slate-200 pb-3">
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                    <Truck className="text-slate-800" size={18} />
                    Alur Distribusi Logistik Hortikultura Riil
                  </h4>
                  <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">Peta pergerakan pasokan pertanian dari produsen ke pasar konsumen</p>
                </div>

                <div className="flex flex-col gap-5">
                  {realRoutes.map((route) => (
                    <div 
                      key={route.id} 
                      className="p-4 border border-slate-200 bg-white shadow-sm flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-center border-b border-slate-200/10 pb-2">
                        <span className={`inline-flex items-center px-2 py-0.5 border border-slate-200 font-mono font-bold text-[10px] uppercase shadow-sm ${route.badgeStyle}`}>
                          Jalur {route.status}
                        </span>
                        <span className="text-xs font-mono font-bold text-blue-600 uppercase">{route.commodity}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-slate-800 uppercase">
                        <span>{route.from}</span>
                        <ArrowRight size={14} className="text-slate-500" />
                        <span className="text-purple-600">{route.via}</span>
                        <ArrowRight size={14} className="text-slate-500" />
                        <span>{route.to}</span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-mono mt-1 whitespace-normal uppercase text-[10px]">
                        {route.desc}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                        <div className="bg-rose-50 border border-rose-300 p-2">
                          <p className="text-[9px] font-mono font-black uppercase text-rose-700 mb-1">Risiko Distribusi</p>
                          <p className="text-[10px] font-mono font-bold uppercase text-slate-700 leading-relaxed">{route.risk}</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-300 p-2">
                          <p className="text-[9px] font-mono font-black uppercase text-emerald-700 mb-1">Prioritas Intervensi</p>
                          <p className="text-[10px] font-mono font-bold uppercase text-slate-700 leading-relaxed">{route.priority}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Daftar Simpul Pasar */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 transition-all duration-300 hover:shadow-md">
              <div className="flex flex-col mb-6 border-b border-slate-200 pb-3">
                <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <Store className="text-slate-800" size={18} />
                  Daftar Simpul Pasar & Lokasi Fungsional
                </h4>
                <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">
                  Belum ditemukan dataset koordinat/alamat pasar resmi di folder public; daftar ini disusun dari rute logistik yang sudah ada di aplikasi.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100">
                      <th className="p-3 border-r border-slate-200 uppercase">Nama Pasar</th>
                      <th className="p-3 border-r border-slate-200 uppercase">Lokasi/Kecamatan</th>
                      <th className="p-3 border-r border-slate-200 uppercase">Tipe</th>
                      <th className="p-3 border-r border-slate-200 uppercase">Komoditas</th>
                      <th className="p-3 uppercase">Fungsi Logistik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketNodes.map((market) => (
                      <tr key={market.name} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-3 border-r border-slate-200 font-black uppercase text-slate-800">{market.name}</td>
                        <td className="p-3 border-r border-slate-200 font-bold uppercase text-emerald-700">{market.kecamatan}</td>
                        <td className="p-3 border-r border-slate-200 uppercase text-slate-700">{market.type}</td>
                        <td className="p-3 border-r border-slate-200 uppercase text-blue-700 font-bold">{market.commodities}</td>
                        <td className="p-3 uppercase text-slate-600 leading-relaxed min-w-[260px]">{market.role}</td>
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
