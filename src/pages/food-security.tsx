import { useEffect, useState } from "react";
import DefaultLayout from "@/layouts/default";
import { LoadingSpinner } from "@/components/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { fetchPadiProduction, fetchPenduduk } from "@/services/api";
import { ShieldCheck, Search, Warehouse, AlertCircle, Info, Users } from "lucide-react";

/*
 * Rasio Ketersediaan Pangan (indikator "ketersediaan" — pilar pertama ketahanan pangan).
 *
 * Formula (standar nasional, lihat ketahanan-pangan.txt):
 *   Beras tersedia = Produksi padi (ton GKG) × 64% rendemen
 *   Kebutuhan      = Jumlah penduduk × 114 kg/tahun
 *   Rasio          = (Beras tersedia ÷ Kebutuhan) × 100%
 *
 * Klasifikasi: >100% Surplus | 90–100% Seimbang | <90% Defisit.
 *
 * CATATAN: indikator ini mengukur KETERSEDIAAN dari sisi produksi saja, belum
 * keterjangkauan (harga/daya beli) dan pemanfaatan (gizi) — dua pilar lainnya.
 */
const RENDEMEN_BERAS = 0.64; // konversi gabah kering giling → beras (64%)
const KEBUTUHAN_BERAS_KG = 114; // konsumsi beras per kapita per tahun (kg)

type StatusKetahanan = "Surplus" | "Seimbang" | "Defisit";

interface FoodSecurityCombined {
  kecamatan: string;
  penduduk: number;
  produksiPadi: number; // ton GKG
  luasPanen: number; // Ha
  berasTersedia: number; // ton beras
  kebutuhan: number; // ton beras
  rasio: number; // %
  status: StatusKetahanan;
}

function classify(rasio: number): StatusKetahanan {
  if (rasio > 100) return "Surplus";
  if (rasio >= 90) return "Seimbang";
  return "Defisit";
}

function matchName<T extends { kecamatan: string }>(target: string, candidates: T[]): T | undefined {
  const t = target.toUpperCase();
  return candidates.find((c) => {
    const k = c.kecamatan.toUpperCase();
    return k === t || k.includes(t) || t.includes(k);
  });
}

export default function FoodSecurityPage() {
  const [combinedData, setCombinedData] = useState<FoodSecurityCombined[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [padi, penduduk] = await Promise.all([
          fetchPadiProduction(),
          fetchPenduduk(),
        ]);

        // Dijalankan dari daftar penduduk (20 kecamatan) agar kecamatan tanpa
        // produksi padi (mis. Batur) tetap tampil dengan rasio 0 (Defisit).
        const combined = penduduk.map((p): FoodSecurityCombined => {
          const padiMatch = matchName(p.kecamatan, padi);

          const produksiPadi = padiMatch ? padiMatch.produksi : 0;
          const luasPanen = padiMatch ? padiMatch.luasPanen : 0;

          const berasTersedia = produksiPadi * RENDEMEN_BERAS; // ton beras
          const kebutuhan = (p.penduduk * KEBUTUHAN_BERAS_KG) / 1000; // ton beras
          const rasio = kebutuhan > 0 ? (berasTersedia / kebutuhan) * 100 : 0;

          return {
            kecamatan: p.kecamatan,
            penduduk: p.penduduk,
            produksiPadi,
            luasPanen,
            berasTersedia,
            kebutuhan,
            rasio,
            status: classify(rasio),
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

  const filteredData = combinedData.filter((item) =>
    item.kecamatan.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPenduduk = combinedData.reduce((a, c) => a + c.penduduk, 0);
  const totalBerasTersedia = combinedData.reduce((a, c) => a + c.berasTersedia, 0);
  const totalKebutuhan = combinedData.reduce((a, c) => a + c.kebutuhan, 0);
  const totalRasio = totalKebutuhan > 0 ? (totalBerasTersedia / totalKebutuhan) * 100 : 0;
  const countSurplus = combinedData.filter((c) => c.status === "Surplus").length;
  const countDefisit = combinedData.filter((c) => c.status === "Defisit").length;

  const statusStyleMap: Record<StatusKetahanan, string> = {
    Surplus: "bg-emerald-100 text-emerald-800 border-emerald-600",
    Seimbang: "bg-amber-100 text-amber-800 border-amber-600",
    Defisit: "bg-red-100 text-red-800 border-red-600",
  };

  const barColorMap: Record<StatusKetahanan, string> = {
    Surplus: "#059669",
    Seimbang: "#d97706",
    Defisit: "#dc2626",
  };

  const formatNum = (num: number, digits: number = 0) =>
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(num);

  // Data chart diurutkan dari rasio tertinggi agar pola tersaji jelas.
  const chartData = [...filteredData].sort((a, b) => b.rasio - a.rasio);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-200 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="text-2xl sm:text-4xl leading-tight font-bold tracking-tight text-slate-800">
              Ketersediaan Beras
            </h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-2 max-w-2xl border-l-2 border-blue-500 pl-3">
              Rasio ketersediaan beras per kecamatan — beras yang tersedia dari produksi padi dibandingkan kebutuhan konsumsi penduduk.
            </p>
          </div>
          <div className="w-full md:w-48 lg:w-64 shrink-0 flex items-center justify-center">
            <img
              src="/img/food-security.png"
              alt="Ketersediaan Beras"
              className="w-full max-h-32 md:max-h-36 object-contain"
            />
          </div>
        </section>

        {loading ? (
          <LoadingSpinner label="Memuat data ketersediaan beras..." />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-5 flex items-center gap-3">
                <div className="p-3 border border-slate-200 bg-blue-100 text-slate-800 shadow-sm">
                  <Users size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Jumlah Penduduk</p>
                  <p className="text-xl font-semibold mt-0.5">{formatNum(totalPenduduk)} Jiwa</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-5 flex items-center gap-3">
                <div className="p-3 border border-slate-200 bg-emerald-100 text-slate-800 shadow-sm">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Beras Tersedia</p>
                  <p className="text-xl font-semibold mt-0.5">{formatNum(totalBerasTersedia)} Ton</p>
                  <p className="text-[10px] text-slate-400 font-medium">produksi padi × 64%</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-5 flex items-center gap-3">
                <div className="p-3 border border-slate-200 bg-slate-100 text-slate-800 shadow-sm">
                  <Warehouse size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Kebutuhan Beras</p>
                  <p className="text-xl font-semibold mt-0.5">{formatNum(totalKebutuhan)} Ton</p>
                  <p className="text-[10px] text-slate-400 font-medium">penduduk × 114 kg</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-5 flex items-center gap-3">
                <div className="p-3 border border-slate-200 bg-yellow-100 text-slate-800 shadow-sm">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Rasio Kabupaten</p>
                  <p className="text-xl font-semibold mt-0.5">{formatNum(totalRasio, 1)} %</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {formatNum(countSurplus)} surplus · {formatNum(countDefisit)} defisit
                  </p>
                </div>
              </div>
            </div>

            {/* Rasio Ketersediaan Chart */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-6">
              <div className="flex flex-col mb-6 border-b border-slate-200 pb-3">
                <h4 className="text-lg font-bold uppercase flex items-center gap-2 tracking-wide">
                  <AlertCircle className="text-blue-600" />
                  Rasio Ketersediaan Beras per Kecamatan
                </h4>
                <p className="text-xs font-bold text-slate-500 uppercase mt-1">
                  % beras tersedia terhadap kebutuhan (garis 90% = batas Seimbang, 100% = Surplus)
                </p>
              </div>

              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} vertical={false} />
                    <XAxis
                      dataKey="kecamatan"
                      className="font-bold text-[9px]"
                      tickLine={{ stroke: "#cbd5e1" }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      height={70}
                      tick={{ fontSize: 10, fill: "#475569" }}
                    />
                    <YAxis
                      width={50}
                      className="font-bold text-[10px]"
                      tick={{ fontSize: 10, fill: "#475569" }}
                      tickLine={{ stroke: "#cbd5e1" }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      unit="%"
                    />
                    <Tooltip
                      formatter={(value) => [`${formatNum(Number(value ?? 0), 1)}%`, "Rasio Ketersediaan"]}
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
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontWeight: "bold", fontSize: "11px" }} />
                    <ReferenceLine y={100} stroke="#059669" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Surplus", position: "insideTopRight", fontSize: 10, fill: "#059669" }} />
                    <ReferenceLine y={90} stroke="#d97706" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Seimbang", position: "insideTopRight", fontSize: 10, fill: "#d97706" }} />
                    <Bar dataKey="rasio" name="Rasio Ketersediaan" strokeWidth={1}>
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={barColorMap[entry.status]} stroke={barColorMap[entry.status]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabel detail */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all duration-200 p-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 border-b border-slate-200 pb-4">
                <div>
                  <h4 className="text-lg font-bold uppercase tracking-wide">Status Ketersediaan Pangan</h4>
                  <p className="text-xs font-bold text-slate-500 uppercase mt-1">
                    Beras tersedia vs kebutuhan konsumsi per kecamatan
                  </p>
                </div>
                <div className="flex items-center w-full md:w-64 border border-slate-200 rounded-lg px-3 py-1.5 bg-white shadow-sm">
                  <Search size={16} className="text-slate-500 mr-2 shrink-0" />
                  <input
                    placeholder="Cari kecamatan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none outline-none font-bold text-xs p-0 focus:ring-0"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-700">
                      <th className="pb-3 px-3">KECAMATAN</th>
                      <th className="pb-3 px-3 text-right">PENDUDUK (Jiwa)</th>
                      <th className="pb-3 px-3 text-right">PRODUKSI PADI (Ton)</th>
                      <th className="pb-3 px-3 text-right">BERAS TERSEDIA (Ton)</th>
                      <th className="pb-3 px-3 text-right">KEBUTUHAN (Ton)</th>
                      <th className="pb-3 px-6 text-center">RASIO</th>
                      <th className="pb-3 px-6 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData
                      .slice()
                      .sort((a, b) => b.rasio - a.rasio)
                      .map((item) => (
                        <tr
                          key={item.kecamatan}
                          className="border-b border-slate-200/20 hover:bg-slate-50 transition-colors text-sm"
                        >
                          <td className="py-3.5 px-3 font-bold text-slate-800 uppercase text-xs">
                            {item.kecamatan}
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-600">{formatNum(item.penduduk)}</td>
                          <td className="py-3.5 px-3 text-right text-slate-600">{formatNum(item.produksiPadi)}</td>
                          <td className="py-3.5 px-3 text-right text-slate-600">{formatNum(item.berasTersedia)}</td>
                          <td className="py-3.5 px-3 text-right text-slate-600">{formatNum(item.kebutuhan)}</td>
                          <td className="py-3.5 px-6 text-center font-bold text-blue-600">
                            {formatNum(item.rasio, 1)}%
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 border font-bold text-[10px] uppercase shadow-sm ${statusStyleMap[item.status]}`}
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

            {/* Catatan metodologi */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-sm p-5 flex gap-3">
              <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-slate-600 leading-relaxed">
                <p className="font-bold text-slate-700 mb-1">Metodologi &amp; batasan</p>
                <p>
                  Rasio dihitung sebagai <strong>beras tersedia ÷ kebutuhan</strong>: beras tersedia = produksi padi
                  (ton GKG) × <strong>64% rendemen</strong>; kebutuhan = jumlah penduduk × <strong>114 kg/tahun</strong>.
                  Klasifikasi: &gt;100% <em>Surplus</em>, 90–100% <em>Seimbang</em>, &lt;90% <em>Defisit</em>.
                </p>
                <p className="mt-2">
                  Indikator ini mengukur <strong>ketersediaan (availability)</strong> dari sisi produksi saja — belum mencakup
                  keterjangkauan (harga/daya beli) dan pemanfaatan (gizi). Kecamatan tanpa produksi padi (mis. Batur) tampil
                  sebagai defisit. Angka produksi memakai data BPS/Distankan yang tersedia di database.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 italic text-right">
              Sumber: produksi padi BPS/Distankan KP (database) · jumlah penduduk Kementerian Agama (2023).
            </p>
          </>
        )}
      </section>
    </DefaultLayout>
  );
}
