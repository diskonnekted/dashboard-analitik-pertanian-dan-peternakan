import { useEffect, useState } from "react";
import DefaultLayout from "@/layouts/default";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { fetchVegetableProduction, VegetableProduction } from "@/services/api";
import { Compass, Tractor, ListFilter, Leaf } from "lucide-react";

export default function SuitabilityPage() {
  const [vegData, setVegData] = useState<VegetableProduction[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedKec, setSelectedKec] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchVegetableProduction();
        setVegData(data);
        
        const uniqueYears = Array.from(new Set(data.map(d => d.tahun).filter(y => y !== "")))
          .sort((a, b) => b.localeCompare(a));
        setYears(uniqueYears);
        
        if (uniqueYears.length > 0) {
          setSelectedYear(uniqueYears[0]);
        }
        
        const uniqueKec = Array.from(new Set(data.map(d => d.kecamatan)))
          .sort((a, b) => a.localeCompare(b));
        if (uniqueKec.length > 0) {
          setSelectedKec(uniqueKec[0]);
        }
      } catch (err) {
        console.error("Gagal memuat data sayuran:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const activeData = vegData.find(item => item.kecamatan === selectedKec && item.tahun === selectedYear);

  const cropList = [
    { key: "kentang", label: "Kentang", value: activeData?.kentang || 0, color: "#eab308" },
    { key: "kubis", label: "Kubis", value: activeData?.kubis || 0, color: "#10b981" },
    { key: "cabaiRawit", label: "Cabai Rawit", value: activeData?.cabaiRawit || 0, color: "#ef4444" },
    { key: "cabaiBesar", label: "Cabai Besar", value: activeData?.cabaiBesar || 0, color: "#f87171" },
    { key: "tomat", label: "Tomat", value: activeData?.tomat || 0, color: "#fca5a5" },
    { key: "bawangMerah", label: "Bawang Merah", value: activeData?.bawangMerah || 0, color: "#8b5cf6" },
    { key: "bawangPutih", label: "Bawang Putih", value: activeData?.bawangPutih || 0, color: "#6b7280" },
    { key: "petsai", label: "Petsai (Sawi)", value: activeData?.petsai || 0, color: "#34d399" },
  ];

  const radarData = cropList.map(c => ({
    subject: c.label,
    produksi: c.value,
  }));

  const sortedCrops = [...cropList].sort((a, b) => b.value - a.value);
  const primaryCrop = sortedCrops[0];

  const getSuitabilityStatus = (value: number) => {
    if (value > 1000) return { label: "Sangat Sesuai", style: "bg-emerald-100 text-emerald-800 border-emerald-600" };
    if (value > 100) return { label: "Cukup Sesuai", style: "bg-amber-100 text-amber-800 border-amber-600" };
    if (value > 0) return { label: "Kesesuaian Rendah", style: "bg-neutral-100 text-neutral-800 border-neutral-600" };
    return { label: "Tidak Diusahakan", style: "bg-red-100 text-red-800 border-red-600" };
  };

  const formatNum = (num: number) => new Intl.NumberFormat("id-ID").format(num);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Header */}
        <div className="bg-emerald-100 border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6 text-left">
          <h1 className="text-3xl md:text-4xl font-serif font-black uppercase tracking-tight text-[#141414]">
            Kesesuaian Lahan Sayuran
          </h1>
          <p className="text-xs font-mono font-bold text-neutral-600 mt-2 uppercase tracking-wide">
            Pemetaan kecocokan lahan aktual berdasarkan volume produksi sayuran riil Kabupaten Banjarnegara
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-neutral-500 font-mono font-bold animate-pulse uppercase">Memuat data kesesuaian lahan...</p>
          </div>
        ) : (
          <>
            {/* Filter Control Box */}
            <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6">
              <div className="flex items-center gap-2 mb-4 border-b-2 border-[#141414] pb-3">
                <ListFilter className="text-[#141414]" size={20} />
                <h4 className="text-md font-serif font-black uppercase">Filter Analisis</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-mono font-bold text-neutral-700 uppercase">Pilih Kecamatan:</span>
                  <select 
                    value={selectedKec}
                    onChange={(e) => setSelectedKec(e.target.value)}
                    className="w-full border-2 border-[#141414] rounded-none px-3 py-2 font-mono font-bold text-xs uppercase bg-white shadow-[2px_2px_0px_0px_#141414] focus:outline-none"
                  >
                    {Array.from(new Set(vegData.map(d => d.kecamatan)))
                      .sort((a, b) => a.localeCompare(b))
                      .map((kec) => (
                        <option key={kec} value={kec} className="capitalize">
                          {kec.toUpperCase()}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-mono font-bold text-neutral-700 uppercase">Pilih Tahun Data:</span>
                  <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full border-2 border-[#141414] rounded-none px-3 py-2 font-mono font-bold text-xs uppercase bg-white shadow-[2px_2px_0px_0px_#141414] focus:outline-none"
                  >
                    {years.map((yr) => (
                      <option key={yr} value={yr}>
                        TAHUN {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Main Visualizations */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Radar Chart Profile */}
              <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6 flex flex-col justify-between">
                <div className="flex flex-col mb-4 border-b-2 border-[#141414] pb-3">
                  <h4 className="text-md font-serif font-black uppercase flex items-center gap-2">
                    <Compass className="text-[#141414]" size={18} />
                    Radar Karakteristik
                  </h4>
                  <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">Visualisasi sebaran hasil panen sayuran</p>
                </div>
                <div className="h-[250px] w-full flex items-center justify-center">
                  {primaryCrop && primaryCrop.value > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#141414" strokeOpacity={0.15} />
                        <PolarAngleAxis dataKey="subject" fontSize={9} className="font-mono font-bold" />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} fontSize={8} className="font-mono" />
                        <Radar name="Produksi (Ton)" dataKey="produksi" stroke="#141414" strokeWidth={2} fill="#eab308" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs font-mono font-bold text-neutral-400 uppercase italic">Tidak ada catatan produksi sayuran pada tahun ini.</p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t-2 border-[#141414] text-xs font-mono font-bold text-neutral-600 uppercase">
                  Kecamatan <span className="text-[#141414] font-black">{selectedKec}</span> memiliki produksi dominan <span className="text-emerald-600 font-black">{primaryCrop?.value > 0 ? primaryCrop.label : "N/A"}</span>.
                </div>
              </div>

              {/* Bar Chart Breakdown */}
              <div className="lg:col-span-2 bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6">
                <div className="flex flex-col mb-4 border-b-2 border-[#141414] pb-3">
                  <h4 className="text-md font-serif font-black uppercase flex items-center gap-2">
                    <Tractor className="text-[#141414]" size={18} />
                    Rincian Hasil Panen Sayuran (Ton)
                  </h4>
                  <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">Volume produksi riil sayuran di wilayah terpilih</p>
                </div>
                <div className="h-[250px] w-full">
                  {primaryCrop && primaryCrop.value > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cropList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} vertical={false} />
                        <XAxis 
                          dataKey="label" 
                          className="font-mono font-bold text-[9px]" 
                          tickLine={{ stroke: '#141414', strokeWidth: 2 }} 
                          axisLine={{ stroke: '#141414', strokeWidth: 2 }} 
                        />
                        <YAxis 
                          className="font-mono font-bold text-[10px]" 
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
                        <Bar dataKey="value" name="Produksi (Ton)" fill="#f5a524" stroke="#141414" strokeWidth={2}>
                          {cropList.map((entry, index) => (
                            <rect key={`rect-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-neutral-400 font-mono font-bold uppercase italic text-sm">
                      Tidak ada catatan produksi sayuran pada tahun ini.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Suitability Matrix Table */}
            <div className="bg-white border-2 border-[#141414] rounded-none shadow-[4px_4px_0px_0px_#141414] p-6">
              <div className="flex flex-col mb-4 border-b-2 border-[#141414] pb-3">
                <h4 className="text-lg font-serif font-black uppercase flex items-center gap-2">
                  <Leaf className="text-[#141414]" />
                  Matriks Kesesuaian Komoditas Aktual
                </h4>
                <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">Indeks kecocokan lahan berdasarkan produktivitas rill di lapangan</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-[#141414] text-xs font-mono font-bold text-neutral-700">
                      <th className="pb-3 px-3">NAMA KOMODITAS</th>
                      <th className="pb-3 px-3 text-right">TOTAL PANEN (Ton)</th>
                      <th className="pb-3 px-6 text-center">STATUS KESESUAIAN</th>
                      <th className="pb-3 px-3">REKOMENDASI PENGEMBANGAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cropList.map((crop) => {
                      const status = getSuitabilityStatus(crop.value);
                      let rec = "Lahan kurang cocok atau butuh modifikasi mikro/irigasi tambahan.";
                      if (crop.value > 1000) {
                        rec = "Sangat direkomendasikan untuk pembesaran skala industri dan korporasi tani.";
                      } else if (crop.value > 100) {
                        rec = "Layak dikembangkan untuk pasar lokal dan pemenuhan ketahanan pangan desa.";
                      } else if (crop.value > 0) {
                        rec = "Kembangkan dalam skala kecil atau gunakan rumah kaca.";
                      }

                      return (
                        <tr 
                          key={crop.key} 
                          className="border-b border-[#141414]/20 hover:bg-neutral-50 transition-colors text-sm"
                        >
                          <td className="py-4 px-3 font-mono font-bold text-neutral-800 uppercase text-xs flex items-center gap-2">
                            <span className="w-3 h-3 border border-[#141414]" style={{ backgroundColor: crop.color }} />
                            {crop.label}
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-bold text-neutral-800">
                            {formatNum(crop.value)}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span 
                              className={`inline-flex items-center px-2 py-0.5 border-2 font-mono font-bold text-[10px] uppercase shadow-[1px_1px_0px_0px_#141414] ${status.style}`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-neutral-600 text-xs font-mono font-bold uppercase text-[10px] whitespace-normal max-w-sm">
                            {rec}
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
