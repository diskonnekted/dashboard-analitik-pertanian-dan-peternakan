import { useEffect, useState } from "react";
import DefaultLayout from "@/layouts/default";
import { LoadingSpinner } from "@/components/ui";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine } from "recharts";
import { fetchInflationData, fetchAnomaliHargaPangan, fetchHargaPanganJateng, InflationData, AnomaliHargaRow, HargaPanganJateng } from "@/services/api";
import { TrendingUp, AlertTriangle, ShieldAlert, Award, Info, CheckCircle2, Calendar, Filter, Banknote, Coins, MapPin, ArrowUpRight, ArrowDownRight } from "lucide-react";

// ===== Indeks Anomali Harga Pangan Nasional (Bapanas via API Indonesia) =====

const BULAN_PENDEK: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "Mei", "06": "Jun",
  "07": "Jul", "08": "Agu", "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des",
};

const labelEdisi = (tanggal: string) => {
  const [y, m] = tanggal.split("-");
  return m && BULAN_PENDEK[m] ? `${BULAN_PENDEK[m]} ${y}` : tanggal;
};

const fmtSigned = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(3)}`;

const severityOf = (status: string): "alert" | "warning" | "normal" => {
  if (status.startsWith("Alert")) return "alert";
  if (status.startsWith("Warning")) return "warning";
  return "normal";
};

/** Arah anomali: "high" (tekanan harga tinggi/mahal), "low" (rendah/murah), null (normal). */
const directionOf = (status: string): "high" | "low" | null => {
  if (status.includes("High")) return "high";
  if (status.includes("Low")) return "low";
  return null;
};

const SEVERITY_BAR: Record<string, string> = {
  alert: "#dc2626",
  warning: "#d97706",
  normal: "#059669",
};

const STATUS_LABEL: Record<string, string> = {
  Normal: "Normal",
  "Warning (High Price)": "Perhatian - cenderung mahal",
  "Warning (Low Price)": "Perhatian - cenderung murah",
  "Alert (High Price)": "Waspada - tekanan harga mahal",
  "Alert (Low Price)": "Waspada - tekanan harga murah",
};

const badgeStatus = (status: string) => {
  const sev = severityOf(status);
  if (sev === "alert") return "bg-red-100 text-red-700";
  if (sev === "warning") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
};

const AnomaliTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const r: AnomaliHargaRow = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="font-mono text-[11px] font-bold uppercase text-slate-800">{r.komoditas}</p>
      <p className={`mt-1 inline-flex px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${badgeStatus(r.status)}`}>
        {STATUS_LABEL[r.status] ?? r.status}
      </p>
      <div className="mt-2 space-y-0.5 font-mono text-[10px] font-bold uppercase text-slate-600">
        <p>IFPA: {fmtSigned(r.ifpa)}</p>
        <p>QIPA: {fmtSigned(r.qipa)}</p>
        <p>AIPA: {fmtSigned(r.aipa)}</p>
      </div>
    </div>
  );
};

const TrenTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="font-mono text-[11px] font-bold uppercase text-slate-800">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="mt-1 font-mono text-[10px] font-bold uppercase" style={{ color: p.color }}>
          {p.name}: {p.value == null ? "-" : fmtSigned(Number(p.value))}
        </p>
      ))}
    </div>
  );
};

// ===== Harga Pangan Jawa Tengah (konsumen & produsen) =====

const fmtRp = (v: number | null) => (v == null ? "-" : `Rp ${v.toLocaleString("id-ID")}`);
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

/** Warna perubahan bulanan: naik = merah (tekanan mahal), turun = hijau, stabil = abu. */
const momClass = (v: number | null) => {
  if (v == null) return "text-slate-400";
  if (v >= 0.05) return "text-red-600";
  if (v <= -0.05) return "text-emerald-600";
  return "text-slate-500";
};

const HargaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="font-mono text-[11px] font-bold uppercase text-slate-800">{label}</p>
      <p className="mt-1 font-mono text-[10px] font-bold uppercase text-blue-700">
        Harga: {v == null ? "-" : fmtRp(Number(v))}
      </p>
    </div>
  );
};

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

  // ----- Indeks Anomali Harga Pangan Nasional (Bapanas) -----
  const [anomali, setAnomali] = useState<AnomaliHargaRow[]>([]);
  const [anomaliLoading, setAnomaliLoading] = useState<boolean>(true);
  const [komoditasPilih, setKomoditasPilih] = useState<string>("");

  useEffect(() => {
    let live = true;
    fetchAnomaliHargaPangan()
      .then((rows) => {
        if (!live) return;
        setAnomali(rows);
        setAnomaliLoading(false);
      })
      .catch((err) => {
        console.error("Gagal memuat indeks anomali harga pangan:", err);
        if (live) setAnomaliLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const anomaliData = (() => {
    if (anomali.length === 0) return null;
    const edisi = Array.from(new Set(anomali.map((r) => r.tanggal))).sort();
    const komoditas = Array.from(new Set(anomali.map((r) => r.komoditas))).sort();
    const edisiTerbaru = edisi[edisi.length - 1];
    const barisTerbaru = anomali
      .filter((r) => r.tanggal === edisiTerbaru)
      .sort((a, b) => Math.abs(b.ifpa) - Math.abs(a.ifpa));
    const hitung = (sev: string) => barisTerbaru.filter((r) => severityOf(r.status) === sev).length;
    const kpi = { alert: hitung("alert"), warning: hitung("warning"), normal: hitung("normal") };
    const matriks = komoditas.map((k) => ({
      komoditas: k,
      sel: edisi.map((m) => anomali.find((r) => r.komoditas === k && r.tanggal === m)),
    }));
    return { edisi, komoditas, edisiTerbaru, barisTerbaru, kpi, matriks };
  })();

  const trenPilih = (() => {
    if (!anomaliData) return [];
    const k = komoditasPilih || anomaliData.komoditas[0];
    if (!k) return [];
    return anomaliData.edisi.map((m) => {
      const r = anomali.find((x) => x.komoditas === k && x.tanggal === m);
      return { edisi: labelEdisi(m), IFPA: r?.ifpa ?? null, QIPA: r?.qipa ?? null, AIPA: r?.aipa ?? null };
    });
  })();

  // Pilihan awal: komoditas dengan sinyal terkuat pada edisi terbaru
  useEffect(() => {
    if (!anomaliData || komoditasPilih) return;
    setKomoditasPilih(anomaliData.barisTerbaru[0]?.komoditas ?? anomaliData.komoditas[0] ?? "");
  }, [anomaliData, komoditasPilih]);

  // ----- Harga Pangan Jawa Tengah (Konsumen & Produsen) -----
  const [hargaJateng, setHargaJateng] = useState<HargaPanganJateng | null>(null);
  const [hargaLoading, setHargaLoading] = useState<boolean>(true);
  const [tingkatPilih, setTingkatPilih] = useState<"konsumen" | "produsen">("konsumen");
  const [komoditasHargaPilih, setKomoditasHargaPilih] = useState<string>("");
  const [rentangPilih, setRentangPilih] = useState<number>(24);

  useEffect(() => {
    let live = true;
    fetchHargaPanganJateng()
      .then((data) => {
        if (!live) return;
        setHargaJateng(data);
        setHargaLoading(false);
      })
      .catch((err) => {
        console.error("Gagal memuat harga pangan Jateng:", err);
        if (live) setHargaLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const hargaData = (() => {
    if (!hargaJateng) return null;
    const rows = hargaJateng[tingkatPilih];
    if (rows.length === 0) return null;
    const edisi = Array.from(new Set(rows.map((r) => r.tanggal))).sort();
    const komoditas = Array.from(new Set(rows.map((r) => r.komoditas))).sort();
    const edisiTerbaru = edisi[edisi.length - 1];
    const edisiLalu = edisi.length > 1 ? edisi[edisi.length - 2] : "";
    const byKom = new Map<string, Map<string, number | null>>();
    for (const r of rows) {
      if (!byKom.has(r.komoditas)) byKom.set(r.komoditas, new Map());
      byKom.get(r.komoditas)!.set(r.tanggal, r.harga);
    }
    const tabel = komoditas
      .map((k) => {
        const m = byKom.get(k)!;
        const harga = m.get(edisiTerbaru) ?? null;
        const lalu = m.get(edisiLalu) ?? null;
        const mom = harga != null && lalu != null && lalu > 0 ? ((harga - lalu) / lalu) * 100 : null;
        return { komoditas: k, harga, mom };
      })
      .filter((t) => t.harga != null)
      .sort((a, b) => (b.mom ?? -Infinity) - (a.mom ?? -Infinity));
    const staples =
      tingkatPilih === "konsumen"
        ? ["Beras Medium", "Cabai Rawit Merah", "Daging Ayam Ras", "Telur Ayam Ras"]
        : ["GKP Tk. Petani", "GKG Tk. Penggilingan", "Bawang Merah Tingkat Petani", "Telur Ayam Ras"];
    const kpiStaples = staples
      .map((k) => tabel.find((t) => t.komoditas === k))
      .filter((t): t is { komoditas: string; harga: number | null; mom: number | null } => t != null);
    const kTerpilih = komoditasHargaPilih || kpiStaples[0]?.komoditas || komoditas[0] || "";
    const edisiTren = rentangPilih > 0 ? edisi.slice(-rentangPilih) : edisi;
    const tren = edisiTren.map((m) => ({
      edisi: labelEdisi(m),
      harga: byKom.get(kTerpilih)?.get(m) ?? null,
    }));
    return { edisi, komoditas, edisiTerbaru, tabel, kpiStaples, kTerpilih, tren };
  })();

  // Reset pilihan komoditas bila tidak tersedia pada seri tingkat aktif
  useEffect(() => {
    if (!hargaData) return;
    if (komoditasHargaPilih && !hargaData.komoditas.includes(komoditasHargaPilih)) {
      setKomoditasHargaPilih("");
    }
  }, [tingkatPilih, hargaData, komoditasHargaPilih]);

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
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-200 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="text-2xl sm:text-4xl leading-tight font-bold tracking-tight text-slate-800">
            Volatilitas Ekonomi & Harga
          </h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-2 max-w-2xl border-l-2 border-blue-500 pl-3">
            Analisis laju inflasi makro ekonomi perbandingan tahun 2018 - 2024 sebagai proksi fluktuasi harga komoditas.
          </p>
          </div>
          <div className="w-full md:w-48 lg:w-64 shrink-0 flex items-center justify-center">
            <img
              src="/img/price-volatility.png"
              alt="Fluktuasi Harga"
              className="w-full max-h-32 md:max-h-36 object-contain"
            />
          </div>
        </section>

        {loading ? (
          <LoadingSpinner label="Memuat data fluktuasi harga..." />
        ) : (
          <>
            {/* Chart Section */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 transition-all duration-300 hover:shadow-md">
              <div className="flex flex-col mb-6 border-b border-slate-200 pb-3">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <TrendingUp className="text-slate-800" />
                  Tren Laju Inflasi Pembanding (%)
                </h4>
                <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">Perbandingan pertumbuhan inflasi tahunan daerah terhadap nasional</p>
              </div>

              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} vertical={false} />
                    <XAxis 
                      dataKey="tahun" 
                      className="font-mono font-bold text-[11px]" 
                      tick={{ fill: '#475569', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }}
                      tickLine={{ stroke: '#cbd5e1' }} 
                      axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }} 
                    />
                    <YAxis 
                      width={70}
                      tick={{ fill: '#475569', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }}
                      tickLine={{ stroke: '#cbd5e1' }} 
                      axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }} 
                      label={{ 
                        value: 'Inflasi (%)', 
                        angle: -90, 
                        position: 'insideLeft', 
                        offset: 10, 
                        style: { textAnchor: 'middle', fill: '#475569', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' } 
                      }} 
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
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
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 transition-all duration-300 hover:shadow-md">
                <div className="flex flex-col mb-4 border-b border-slate-200 pb-3">
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                    <ShieldAlert className="text-yellow-600" size={18} />
                    Indeks Volatilitas Harga
                  </h4>
                  <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">Semakin tinggi deviasi standar, semakin bergejolak harga wilayah</p>
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
                      <div key={item.region} className="flex justify-between items-center p-3 border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                          <span className="text-xs font-mono font-bold text-slate-800 uppercase">{item.region}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[9px] text-slate-400 uppercase font-mono font-bold">Std Dev</p>
                            <p className="text-xs font-mono font-bold text-slate-800">{formatNum(item.volatility)}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 border border-slate-200 font-mono font-bold text-[10px] uppercase shadow-sm ${badgeClass}`}>
                            {level}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Economic Insights Card */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-md">
                <div>
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                    <Award className="text-emerald-600" size={20} />
                    <h4 className="text-md font-mono font-bold uppercase tracking-wide">Ringkasan Analisis</h4>
                  </div>

                  <p className="text-xs font-mono font-bold text-slate-600 leading-relaxed mb-4 uppercase">
                    Berdasarkan data laju inflasi, daerah pembanding seperti Banyumas dan Cilacap memiliki laju yang cukup dinamis.
                  </p>
                  <p className="text-xs font-mono font-bold text-slate-600 leading-relaxed mb-4 uppercase">
                    Sementara inflasi Banjarnegara yang stabil memberi ruang ketahanan harga jangka panjang, tetapi memerlukan penguatan daya beli pedesaan.
                  </p>
                </div>

                <div className="flex items-start gap-2 p-3 bg-red-50 border border-slate-200 shadow-sm text-[10px] text-red-800 mt-2">
                  <AlertTriangle className="shrink-0 mt-0.5 text-red-600" size={14} />
                  <span className="font-mono font-bold leading-normal uppercase">
                    Gejolak Musiman: Kenaikan inflasi dipicu harga volatile foods menjelang hari raya keagamaan dan puncak musim kemarau.
                  </span>
                </div>
              </div>
            </div>

            {/* ===== Indeks Anomali Harga Pangan Nasional (Bapanas) ===== */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col border-b border-slate-200 pb-3">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <ShieldAlert className="text-slate-800" size={20} />
                  Indeks Anomali Harga Pangan Nasional
                </h4>
                <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">
                  QIPA (kualitas) - AIPA (akurasi) - IFPA (indikator utama) - edisi bulanan komoditas strategis nasional
                </p>
              </div>

              {anomaliLoading ? (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                  <LoadingSpinner label="Memuat indeks anomali harga pangan..." />
                </div>
              ) : !anomaliData ? (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                  <div className="flex items-start gap-2 text-slate-500">
                    <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" size={16} />
                    <span className="font-mono text-xs font-bold uppercase">
                      Indeks anomali harga pangan belum tersedia - layanan API apiindonesia.id tidak dapat dijangkau.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {/* KPI edisi terbaru */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Calendar className="text-slate-600" size={20} />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-mono font-bold">Edisi Terbaru</p>
                        <p className="text-lg font-mono font-bold text-slate-800">{labelEdisi(anomaliData.edisiTerbaru)}</p>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="text-red-600" size={20} />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-mono font-bold">Komoditas Waspada</p>
                        <p className="text-lg font-mono font-bold text-slate-800">{anomaliData.kpi.alert}</p>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <Info className="text-amber-600" size={20} />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-mono font-bold">Komoditas Perhatian</p>
                        <p className="text-lg font-mono font-bold text-slate-800">{anomaliData.kpi.warning}</p>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="text-emerald-600" size={20} />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-mono font-bold">Komoditas Normal</p>
                        <p className="text-lg font-mono font-bold text-slate-800">{anomaliData.kpi.normal}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grafik sinyal IFPA + tren per komoditas */}
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col">
                      <div className="flex flex-col mb-6 border-b border-slate-200 pb-3">
                        <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                          <TrendingUp className="text-slate-800" size={18} />
                          Sinyal IFPA per Komoditas
                        </h4>
                        <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">
                          Edisi {labelEdisi(anomaliData.edisiTerbaru)} - diurutkan kekuatan sinyal (|IFPA|)
                        </p>
                      </div>
                      <div className="h-[340px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={anomaliData.barisTerbaru} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} horizontal={false} />
                            <XAxis type="number" tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }} tickLine={{ stroke: "#cbd5e1" }} axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
                            <YAxis type="category" dataKey="komoditas" width={128} tick={{ fill: "#334155", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }} tickLine={{ stroke: "#cbd5e1" }} axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
                            <Tooltip content={<AnomaliTooltip />} cursor={{ fill: "rgba(100,116,139,0.06)" }} />
                            <ReferenceLine x={0} stroke="#94a3b8" />
                            <Bar dataKey="ifpa" barSize={12} radius={2}>
                              {anomaliData.barisTerbaru.map((r, i) => (
                                <Cell key={i} fill={SEVERITY_BAR[severityOf(r.status)]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 border-b border-slate-200 pb-3">
                        <div className="flex flex-col">
                          <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                            <Filter className="text-slate-800" size={18} />
                            Tren QIPA - AIPA - IFPA
                          </h4>
                          <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">
                            Satu komoditas dipantau lintas edisi
                          </p>
                        </div>
                        <select
                          value={komoditasPilih || anomaliData.komoditas[0]}
                          onChange={(e) => setKomoditasPilih(e.target.value)}
                          className="border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-xs font-bold uppercase text-slate-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {anomaliData.komoditas.map((k) => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                      </div>
                      <div className="h-[340px] w-full mt-auto">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trenPilih} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} vertical={false} />
                            <XAxis dataKey="edisi" tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }} tickLine={{ stroke: "#cbd5e1" }} axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
                            <YAxis tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }} tickLine={{ stroke: "#cbd5e1" }} axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
                            <Tooltip content={<TrenTooltip />} />
                            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                            <Line type="monotone" dataKey="IFPA" name="IFPA (utama)" stroke="#dc2626" strokeWidth={3} dot={{ r: 4 }} />
                            <Line type="monotone" dataKey="QIPA" name="QIPA (kualitas)" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="AIPA" name="AIPA (akurasi)" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
                            <Legend wrapperStyle={{ paddingTop: "10px", fontFamily: "monospace", fontWeight: "bold", fontSize: "11px" }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Matriks status per edisi */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6">
                    <div className="flex flex-col mb-6 border-b border-slate-200 pb-3">
                      <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                        <Calendar className="text-slate-800" size={18} />
                        Matriks Status Komoditas per Edisi
                      </h4>
                      <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">
                        Panah atas = tekanan harga tinggi - panah bawah = tekanan harga rendah - arahkan kursor untuk nilai indeks
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px]">
                        <thead>
                          <tr className="border-b-2 border-slate-200">
                            <th className="py-2 pr-4 text-left font-mono text-[10px] font-bold uppercase text-slate-500">Komoditas</th>
                            {anomaliData.edisi.map((m) => (
                              <th key={m} className="px-1 py-2 text-center font-mono text-[10px] font-bold uppercase text-slate-500">
                                {labelEdisi(m).split(" ")[0]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {anomaliData.matriks.map((row) => (
                            <tr key={row.komoditas} className="border-b border-slate-100 last:border-0">
                              <td className="py-2 pr-4 font-mono text-[11px] font-bold uppercase text-slate-700">{row.komoditas}</td>
                              {row.sel.map((c, i) => (
                                <td key={i} className="px-1 py-2 text-center">
                                  {c ? (
                                    <span
                                      title={`${labelEdisi(c.tanggal)} - ${STATUS_LABEL[c.status] ?? c.status} - IFPA ${fmtSigned(c.ifpa)} - QIPA ${fmtSigned(c.qipa)} - AIPA ${fmtSigned(c.aipa)}`}
                                      className={`inline-flex h-6 w-6 items-center justify-center rounded-md font-mono text-[10px] font-bold ${badgeStatus(c.status)}`}
                                    >
                                      {directionOf(c.status) === "high" ? "▲" : directionOf(c.status) === "low" ? "▼" : "•"}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-slate-500">
                        <span className="h-3 w-3 rounded-sm bg-red-500" /> Waspada (Alert)
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-slate-500">
                        <span className="h-3 w-3 rounded-sm bg-amber-500" /> Perhatian (Warning)
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-slate-500">
                        <span className="h-3 w-3 rounded-sm bg-emerald-500" /> Normal
                      </span>
                      <span className="font-mono text-[10px] font-bold uppercase text-slate-400">▲ harga tinggi</span>
                      <span className="font-mono text-[10px] font-bold uppercase text-slate-400">▼ harga rendah</span>
                    </div>
                  </div>

                  {/* Sumber data */}
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-slate-200 shadow-sm">
                    <Info className="shrink-0 mt-0.5 text-blue-600" size={14} />
                    <span className="font-mono text-[10px] font-bold leading-normal uppercase text-blue-800">
                      Sumber: Badan Pangan Nasional (Bapanas) melalui layanan API Indonesia (apiindonesia.id) - indeks anomali harga pangan edisi bulanan. Tanda IFPA menunjukkan arah anomali: positif = tekanan harga tinggi (mahal), negatif = tekanan harga rendah (murah).
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ===== Harga Pangan Jawa Tengah (Konsumen & Produsen) ===== */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col border-b border-slate-200 pb-3">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <Banknote className="text-slate-800" size={20} />
                  Harga Pangan Jawa Tengah
                </h4>
                <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">
                  Harga bulanan Bapanas tingkat provinsi - konsumen (eceran) & produsen (petani / penggilingan / RPH)
                </p>
              </div>

              {hargaLoading ? (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                  <LoadingSpinner label="Memuat harga pangan Jawa Tengah..." />
                </div>
              ) : !hargaData ? (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                  <div className="flex items-start gap-2 text-slate-500">
                    <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" size={16} />
                    <span className="font-mono text-xs font-bold uppercase">
                      Data harga pangan belum tersedia - layanan API apiindonesia.id tidak dapat dijangkau.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {/* Toggle tingkat + info edisi */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                      {(["konsumen", "produsen"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTingkatPilih(t)}
                          className={`px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wide transition-colors ${
                            tingkatPilih === t ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {t === "konsumen" ? "Konsumen" : "Produsen"}
                        </button>
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-slate-500">
                      <MapPin size={12} className="text-slate-400" />
                      Provinsi Jawa Tengah - Edisi {labelEdisi(hargaData.edisiTerbaru)}
                    </span>
                  </div>

                  {/* KPI komoditas pokok */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {hargaData.kpiStaples.map((s) => (
                      <div key={s.komoditas} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-4">
                        <p className="text-[9px] text-slate-400 uppercase font-mono font-bold leading-tight">{s.komoditas}</p>
                        <p className="mt-1.5 text-lg font-mono font-bold text-slate-800">{fmtRp(s.harga)}</p>
                        {s.mom != null ? (
                          <p className={`mt-1 inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase ${momClass(s.mom)}`}>
                            {s.mom >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {fmtPct(s.mom)} MoM
                          </p>
                        ) : (
                          <p className="mt-1 font-mono text-[10px] font-bold uppercase text-slate-400">Edisi lalu n/a</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Tren harga komoditas */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 border-b border-slate-200 pb-3">
                      <div className="flex flex-col">
                        <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                          <Coins className="text-slate-800" size={18} />
                          Tren Harga Bulanan
                        </h4>
                        <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">
                          {tingkatPilih === "konsumen" ? "Harga eceran konsumen" : "Harga tingkat produsen"} per komoditas
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={hargaData.kTerpilih}
                          onChange={(e) => setKomoditasHargaPilih(e.target.value)}
                          className="border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-xs font-bold uppercase text-slate-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[220px]"
                        >
                          {hargaData.komoditas.map((k) => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                        <select
                          value={rentangPilih}
                          onChange={(e) => setRentangPilih(Number(e.target.value))}
                          className="border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-xs font-bold uppercase text-slate-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={12}>12 Bulan</option>
                          <option value={24}>24 Bulan</option>
                          <option value={0}>Semua Edisi</option>
                        </select>
                      </div>
                    </div>
                    <div className="h-[340px] w-full mt-auto">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={hargaData.tren} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} vertical={false} />
                          <XAxis dataKey="edisi" tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }} tickLine={{ stroke: "#cbd5e1" }} axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
                          <YAxis
                            tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                            tickLine={{ stroke: "#cbd5e1" }}
                            axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}rb` : String(v))}
                          />
                          <Tooltip content={<HargaTooltip />} />
                          <Line type="monotone" dataKey="harga" name="Harga (Rp)" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                          <Legend wrapperStyle={{ paddingTop: "10px", fontFamily: "monospace", fontWeight: "bold", fontSize: "11px" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Tabel harga edisi terbaru */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6">
                    <div className="flex flex-col mb-6 border-b border-slate-200 pb-3">
                      <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                        <Calendar className="text-slate-800" size={18} />
                        Daftar Harga Edisi {labelEdisi(hargaData.edisiTerbaru)}
                      </h4>
                      <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">
                        {tingkatPilih === "konsumen" ? "Tingkat konsumen (eceran)" : "Tingkat produsen (petani / penggilingan / RPH)"} - diurutkan perubahan bulanan
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px]">
                        <thead>
                          <tr className="border-b-2 border-slate-200">
                            <th className="py-2 pr-4 text-left font-mono text-[10px] font-bold uppercase text-slate-500">Komoditas</th>
                            <th className="px-2 py-2 text-right font-mono text-[10px] font-bold uppercase text-slate-500">Harga</th>
                            <th className="py-2 pl-4 text-right font-mono text-[10px] font-bold uppercase text-slate-500">Perubahan MoM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hargaData.tabel.map((t) => (
                            <tr key={t.komoditas} className="border-b border-slate-100 last:border-0">
                              <td className="py-2 pr-4 font-mono text-[11px] font-bold uppercase text-slate-700">{t.komoditas}</td>
                              <td className="px-2 py-2 text-right font-mono text-[11px] font-bold text-slate-800">{fmtRp(t.harga)}</td>
                              <td className={`py-2 pl-4 text-right font-mono text-[11px] font-bold ${momClass(t.mom)}`}>
                                {t.mom == null ? "-" : `${t.mom >= 0 ? "+" : ""}${t.mom.toFixed(1)}%`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sumber data harga */}
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-slate-200 shadow-sm">
                    <Info className="shrink-0 mt-0.5 text-blue-600" size={14} />
                    <span className="font-mono text-[10px] font-bold leading-normal uppercase text-blue-800">
                      Sumber: Badan Pangan Nasional (Bapanas) melalui layanan API Indonesia (apiindonesia.id) - harga bulanan provinsi Jawa Tengah (tingkat konsumen & produsen), rilis B+1. Sumber tidak menyediakan data harga level kabupaten/kota; Jawa Tengah adalah wilayah terdekat yang tersedia.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </DefaultLayout>
  );
}
