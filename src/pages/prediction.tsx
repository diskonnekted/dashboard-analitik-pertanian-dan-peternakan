import { useEffect, useMemo, useState } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { fetchPadiProduction, PadiProduction, fetchPadiHistory, PadiHistoryPoint } from "@/services/api";
import { AlertCircle, MapPin } from "lucide-react";

export default function PredictionPage() {
  const [padiData, setPadiData] = useState<PadiProduction[]>([]);
  const [padiHistory, setPadiHistory] = useState<PadiHistoryPoint[]>([]);
  const [selectedKec, setSelectedKec] = useState<string>("");
  const [expansionHa, setExpansionHa] = useState<string>("50");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [data, history] = await Promise.all([fetchPadiProduction(), fetchPadiHistory()]);
        setPadiData(data);
        setPadiHistory(history);
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

  // Proyeksi produksi padi (regresi linier ke tahun berikutnya)
  const historyProjection = useMemo(() => {
    if (padiHistory.length < 2) return null;
    const pts = padiHistory.map((d) => ({ x: parseInt(d.tahun), y: d.produksi }));
    const n = pts.length;
    const sumX = pts.reduce((a, p) => a + p.x, 0);
    const sumY = pts.reduce((a, p) => a + p.y, 0);
    const sumXY = pts.reduce((a, p) => a + p.x * p.y, 0);
    const sumXX = pts.reduce((a, p) => a + p.x * p.x, 0);
    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const meanY = sumY / n;
    const ssTot = pts.reduce((a, p) => a + Math.pow(p.y - meanY, 2), 0);
    const ssRes = pts.reduce((a, p) => a + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    const nextYear = pts[n - 1].x + 1;
    const predicted = Math.max(0, slope * nextYear + intercept);
    const lastVal = pts[n - 1].y;
    const deltaPct = lastVal > 0 ? ((predicted - lastVal) / lastVal) * 100 : null;
    return {
      nextYear: String(nextYear),
      predicted,
      deltaPct,
      r2,
      lastTahun: String(pts[n - 1].x),
    };
  }, [padiHistory]);

  const historyChartData = useMemo(() => {
    const base = padiHistory.map((d) => ({
      tahun: d.tahun,
      produksi: d.produksi,
      luasPanen: d.luasPanen,
      proyeksi: undefined as number | undefined,
    }));
    if (historyProjection && base.length > 0) {
      base[base.length - 1].proyeksi = base[base.length - 1].produksi;
      base.push({
        tahun: historyProjection.nextYear,
        produksi: undefined as any,
        luasPanen: undefined as any,
        proyeksi: historyProjection.predicted,
      } as any);
    }
    return base;
  }, [padiHistory, historyProjection]);

  const activeKecData = padiData.find(item => item.kecamatan === selectedKec);

  const inputExpansion = parseFloat(expansionHa) || 0;
  const currentLuas = activeKecData ? activeKecData.luasPanen : 0;
  const currentProduksi = activeKecData ? activeKecData.produksi : 0;
  const yieldRateTonHa = activeKecData ? (activeKecData.rataRata / 10) : 0;

  const projectedLuas = currentLuas + inputExpansion;
  const projectedProduksi = currentProduksi + (inputExpansion * yieldRateTonHa);

  const sortedProductivity = [...padiData].sort((a, b) => b.rataRata - a.rataRata);

  const totalLuas = padiData.reduce((a, d) => a + d.luasPanen, 0);
  const totalProduksi = padiData.reduce((a, d) => a + d.produksi, 0);

  const formatNum = (num: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(num);

  const tooltipStyle = {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  } as const;

  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        {/* ===== Kepala Halaman ===== */}
        <header className="border-b border-slate-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-800">
            Bidang Tanaman Pangan · Produksi Padi
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1.5">
            Prediksi Panen Padi
          </h1>
          <p className="text-sm text-slate-700 mt-1 max-w-3xl">
            Analisis produktivitas padi Kabupaten Banjarnegara per kecamatan dilengkapi tren
            historis (2018–2025), proyeksi linier tahun berikutnya, dan simulator ekspansi lahan.
          </p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white border border-slate-200 rounded-lg">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-800 rounded-full animate-spin" />
            <p className="text-sm text-slate-700">Memuat data padi…</p>
          </div>
        ) : (
          <>
            {/* ===== Tren & Prediksi ===== */}
            <section className="bg-white border border-slate-200 rounded-lg">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Tren &amp; Prediksi Produksi Padi Kabupaten
                  </h2>
                  <p className="text-xs text-slate-700 mt-0.5">
                    Produksi (sumbu kiri) dan luas panen (sumbu kanan) · 2018–
                    {historyProjection ? historyProjection.nextYear : "—"}
                  </p>
                </div>
                {historyProjection && (
                  <div className="text-right">
                    <p className="text-xs text-slate-700 uppercase tracking-wide">
                      Proyeksi {historyProjection.nextYear}
                    </p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums">
                      {formatNum(historyProjection.predicted)} Ton
                    </p>
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                  <div className="lg:col-span-3 h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="tahun" tick={{ fill: "#1e293b", fontSize: 11 }} />
                        <YAxis yAxisId="left" tick={{ fill: "#1e293b", fontSize: 11 }} tickFormatter={(v) => formatNum(v)} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: "#1e293b", fontSize: 11 }} tickFormatter={(v) => formatNum(v)} />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value: any, name: any) => [
                            `${formatNum(Number(value))} ${name === "Luas Panen (Ha)" ? "Ha" : "Ton"}`,
                            name,
                          ]}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="produksi"
                          name="Produksi Aktual (Ton)"
                          stroke="#1d4ed8"
                          strokeWidth={2.5}
                          dot={{ fill: "#1d4ed8", r: 3 }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="proyeksi"
                          name="Proyeksi (Ton)"
                          stroke="#dc2626"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                          dot={{ fill: "#dc2626", r: 3 }}
                          connectNulls={true}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="luasPanen"
                          name="Luas Panen (Ha)"
                          stroke="#0d9488"
                          strokeWidth={1.5}
                          dot={false}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {historyProjection && (
                    <dl className="flex flex-col gap-4">
                      <div className="border border-slate-200 border-l-4 border-l-blue-800 rounded-md p-4">
                        <dt className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                          Prediksi {historyProjection.nextYear}
                        </dt>
                        <dd className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">
                          {formatNum(historyProjection.predicted)} Ton
                        </dd>
                      </div>
                      <div className="border border-slate-200 border-l-4 border-l-teal-700 rounded-md p-4">
                        <dt className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                          Perubahan vs {historyProjection.lastTahun}
                        </dt>
                        <dd className={`text-xl font-semibold mt-1 tabular-nums ${
                          historyProjection.deltaPct === null
                            ? "text-slate-600"
                            : historyProjection.deltaPct >= 0
                            ? "text-green-700"
                            : "text-red-700"
                        }`}>
                          {historyProjection.deltaPct === null
                            ? "—"
                            : `${historyProjection.deltaPct >= 0 ? "▲" : "▼"} ${formatNum(Math.abs(historyProjection.deltaPct))}%`}
                        </dd>
                      </div>
                      <div className="border border-slate-200 border-l-4 border-l-amber-600 rounded-md p-4">
                        <dt className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                          Keandalan Model (R²)
                        </dt>
                        <dd className={`text-xl font-semibold mt-1 tabular-nums ${
                          historyProjection.r2 >= 0.7
                            ? "text-green-700"
                            : historyProjection.r2 >= 0.4
                            ? "text-amber-600"
                            : "text-red-700"
                        }`}>
                          {formatNum(historyProjection.r2 * 100)}%
                        </dd>
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                          Garis putus-putus merah pada grafik adalah estimasi tren
                          {historyProjection.nextYear}.
                        </p>
                      </div>
                    </dl>
                  )}
                </div>
              </div>
            </section>

            {/* ===== Grafik Perbandingan & Simulator ===== */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Grafik batang */}
              <section className="bg-white border border-slate-200 rounded-lg lg:col-span-2">
                <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900">
                    Profil Luas Panen vs Produksi Padi per Kecamatan
                  </h2>
                  <p className="text-xs text-slate-700 mt-0.5">
                    Luas panen (Ha, sumbu kiri) dibandingkan produksi (Ton, sumbu kanan) · data 2025
                  </p>
                </div>
                <div className="p-5">
                  <div className="h-[420px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={padiData} margin={{ top: 10, right: 10, left: 0, bottom: 90 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis
                          dataKey="kecamatan"
                          tickLine={false}
                          axisLine={{ stroke: "#cbd5e1" }}
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          height={70}
                          tick={{ fontSize: 11, fill: "#1e293b" }}
                        />
                        <YAxis yAxisId="left" width={70} tick={{ fill: "#1e293b", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} />
                        <YAxis yAxisId="right" orientation="right" width={60} tick={{ fill: "#1e293b", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f8fafc" }} />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="left" dataKey="luasPanen" name="Luas Panen (Ha)" fill="#1d4ed8" radius={[3, 3, 0, 0]} />
                        <Bar yAxisId="right" dataKey="produksi" name="Produksi (Ton)" fill="#0d9488" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              {/* Simulator ekspansi */}
              <section className="bg-white border border-slate-200 rounded-lg flex flex-col">
                <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900">Simulator Ekspansi Lahan</h2>
                  <p className="text-xs text-slate-700 mt-0.5">
                    Prediksi hasil panen tambahan berdasarkan produktivitas wilayah.
                  </p>
                </div>

                <div className="p-5 flex flex-col gap-4 flex-1">
                  <div>
                    <label htmlFor="pd-kec" className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                      Kecamatan
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                      <select
                        id="pd-kec"
                        value={selectedKec}
                        onChange={(e) => setSelectedKec(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 appearance-none cursor-pointer"
                      >
                        {[...padiData]
                          .sort((a, b) => a.kecamatan.localeCompare(b.kecamatan))
                          .map((item) => (
                            <option key={item.kecamatan} value={item.kecamatan}>
                              {item.kecamatan}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="pd-exp" className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                      Rencana Ekspansi (Ha)
                    </label>
                    <input
                      id="pd-exp"
                      type="number"
                      min={0}
                      value={expansionHa}
                      onChange={(e) => setExpansionHa(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 tabular-nums"
                    />
                  </div>

                  {activeKecData && (
                    <div className="mt-1 pt-4 border-t border-slate-200 flex flex-col gap-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-700">Produktivitas saat ini</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {formatNum(activeKecData.rataRata)} Ku/Ha
                        </span>
                      </div>

                      <dl className="grid grid-cols-2 border border-slate-200 rounded-md overflow-hidden divide-x divide-slate-200">
                        <div className="p-4 bg-slate-50">
                          <dt className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                            Luas Panen Baru
                          </dt>
                          <dd className="text-lg font-semibold text-slate-900 mt-1 tabular-nums">
                            {formatNum(projectedLuas)} Ha
                          </dd>
                          <dd className="text-xs text-green-700 mt-0.5 tabular-nums">
                            ▲ +{formatNum(inputExpansion)} Ha
                          </dd>
                        </div>
                        <div className="p-4 bg-slate-50">
                          <dt className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                            Estimasi Hasil Panen
                          </dt>
                          <dd className="text-lg font-semibold text-slate-900 mt-1 tabular-nums">
                            {formatNum(projectedProduksi)} Ton
                          </dd>
                          <dd className="text-xs text-green-700 mt-0.5 tabular-nums">
                            ▲ +{formatNum(inputExpansion * yieldRateTonHa)} Ton
                          </dd>
                        </div>
                      </dl>

                      <div className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-700 bg-blue-50 border border-blue-100 rounded-md p-3.5">
                        <AlertCircle size={15} className="text-blue-800 shrink-0 mt-0.5" />
                        <span>
                          Rumus linier:{" "}
                          <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded-sm text-slate-800">
                            Produksi_Baru = Produksi_Lama + (Ekspansi&nbsp;Ha × Laju_Produksi)
                          </code>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* ===== Peringkat Produktivitas ===== */}
            <section className="bg-white border border-slate-200 rounded-lg">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Peringkat Produktivitas Padi per Kecamatan
                </h2>
                <p className="text-xs text-slate-700 mt-0.5">
                  Diurutkan dari laju hasil per hektar tertinggi · data 2025
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200 w-20">
                        Peringkat
                      </th>
                      <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                        Kecamatan
                      </th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200 whitespace-nowrap">
                        Luas Panen (Ha)
                      </th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200 whitespace-nowrap">
                        Produksi (Ton)
                      </th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200 whitespace-nowrap bg-slate-100">
                        Produktivitas (Ku/Ha)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedProductivity.map((item, index) => (
                      <tr key={item.kecamatan} className={`hover:bg-slate-50 ${index < 3 ? "bg-blue-50/30" : ""}`}>
                        <td className="px-5 py-2.5 tabular-nums">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-sm text-xs font-semibold ${
                            index < 3 ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-800"
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-slate-900 font-medium">{item.kecamatan}</td>
                        <td className="px-5 py-2.5 text-right text-slate-800 tabular-nums">{formatNum(item.luasPanen)}</td>
                        <td className="px-5 py-2.5 text-right text-slate-800 tabular-nums">{formatNum(item.produksi)}</td>
                        <td className="px-5 py-2.5 text-right font-semibold text-slate-900 tabular-nums bg-slate-50">
                          {formatNum(item.rataRata)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                      <td className="px-5 py-3" />
                      <td className="px-5 py-3 text-slate-900">Kabupaten Banjarnegara</td>
                      <td className="px-5 py-3 text-right text-slate-900 tabular-nums">{formatNum(totalLuas)}</td>
                      <td className="px-5 py-3 text-right text-slate-900 tabular-nums">{formatNum(totalProduksi)}</td>
                      <td className="px-5 py-3 text-right text-slate-900 tabular-nums bg-slate-100">
                        {totalLuas > 0 ? formatNum((totalProduksi / totalLuas) * 10) : "–"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ===== Catatan Sumber ===== */}
            <p className="text-xs text-slate-600 text-center pb-2">
              Sumber: Dinas Pertanian dan Ketahanan Pangan Kabupaten Banjarnegara,
              melalui Portal Open Data Banjarnegara (opendata.banjarnegarakab.go.id) ·
              Proyeksi menggunakan model regresi linier (kuadrat terkecil) atas data historis.
            </p>
          </>
        )}
      </div>
    </DefaultLayout>
  );
}
