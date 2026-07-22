import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchTernakKecil, fetchTernakBesar, fetchUnggas, TernakKecil, TernakBesar, Unggas } from "@/services/api";
import { Beef, Squirrel, Bird, Calendar, MapPin, TrendingUp, Filter, AlertTriangle, ShieldCheck } from "lucide-react";

type Category = "besar" | "kecil" | "unggas";

export default function LivestockPage() {
  const [kecilData, setKecilData] = useState<TernakKecil[]>([]);
  const [besarData, setBesarData] = useState<TernakBesar[]>([]);
  const [unggasData, setUnggasData] = useState<Unggas[]>([]);
  
  const [category, setCategory] = useState<Category>("besar");
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [kecil, besar, unggas] = await Promise.all([
          fetchTernakKecil(),
          fetchTernakBesar(),
          fetchUnggas()
        ]);
        setKecilData(kecil);
        setBesarData(besar);
        setUnggasData(unggas);
      } catch (err) {
        console.error("Gagal memuat data peternakan:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  const yearsList = useMemo(() => {
    const activeData = category === "besar" ? besarData : category === "kecil" ? kecilData : unggasData;
    return Array.from(new Set(activeData.map(d => d.tahun).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  }, [category, besarData, kecilData, unggasData]);

  useEffect(() => {
    if (yearsList.length > 0 && !yearsList.includes(selectedYear)) {
      setSelectedYear(yearsList[0]);
    }
  }, [category, yearsList]);

  const currentData = useMemo(() => {
    const rawData = category === "besar" ? besarData : category === "kecil" ? kecilData : unggasData;
    return rawData.filter(d => d.tahun === selectedYear);
  }, [category, besarData, kecilData, unggasData, selectedYear]);

  const uniqueKecamatan = useMemo(() => {
    return ["Semua", ...Array.from(new Set(currentData.map(d => d.kecamatan))).sort()];
  }, [currentData]);

  const filteredData = useMemo(() => {
    return selectedKecamatan === "Semua" 
      ? currentData 
      : currentData.filter(d => d.kecamatan === selectedKecamatan);
  }, [currentData, selectedKecamatan]);

  const stats = useMemo(() => {
    let total = 0;
    let topDistrict = "-";
    let topVal = -1;
    let breakdown: { name: string; value: number }[] = [];

    if (category === "besar") {
      const data = filteredData as TernakBesar[];
      let sapiPerah = 0, sapi = 0, kerbau = 0, kuda = 0;
      data.forEach(d => {
        total += (d.sapiPerah + d.sapi + d.kerbau + d.kuda);
        sapiPerah += d.sapiPerah; sapi += d.sapi; kerbau += d.kerbau; kuda += d.kuda;
        const sum = d.sapiPerah + d.sapi + d.kerbau + d.kuda;
        if (sum > topVal) { topVal = sum; topDistrict = d.kecamatan; }
      });
      breakdown = [{ name: "Sapi Potong", value: sapi }, { name: "Sapi Perah", value: sapiPerah }, { name: "Kerbau", value: kerbau }, { name: "Kuda", value: kuda }];
    } else if (category === "kecil") {
      const data = filteredData as TernakKecil[];
      let kambing = 0, domba = 0, babi = 0, kelinci = 0;
      data.forEach(d => {
        total += (d.kambing + d.domba + d.babi + d.kelinci);
        kambing += d.kambing; domba += d.domba; babi += d.babi; kelinci += d.kelinci;
        const sum = d.kambing + d.domba + d.babi + d.kelinci;
        if (sum > topVal) { topVal = sum; topDistrict = d.kecamatan; }
      });
      breakdown = [{ name: "Kambing", value: kambing }, { name: "Domba", value: domba }, { name: "Kelinci", value: kelinci }, { name: "Babi", value: babi }];
    } else {
      const data = filteredData as Unggas[];
      let ayamKampung = 0, ayamRasLayer = 0, ayamBroiler = 0, itikBiasa = 0, itikManila = 0;
      data.forEach(d => {
        total += (d.ayamKampung + d.ayamRasLayer + d.ayamBroiler + d.itikBiasa + d.itikManila);
        ayamKampung += d.ayamKampung; ayamRasLayer += d.ayamRasLayer; ayamBroiler += d.ayamBroiler; itikBiasa += d.itikBiasa; itikManila += d.itikManila;
        const sum = d.ayamKampung + d.ayamRasLayer + d.ayamBroiler + d.itikBiasa + d.itikManila;
        if (sum > topVal) { topVal = sum; topDistrict = d.kecamatan; }
      });
      breakdown = [{ name: "Ayam Broiler", value: ayamBroiler }, { name: "Ayam Kampung", value: ayamKampung }, { name: "Ayam Ras Layer", value: ayamRasLayer }, { name: "Itik Biasa", value: itikBiasa }, { name: "Itik Manila", value: itikManila }];
    }
    return { total, topDistrict, topVal, breakdown };
  }, [category, filteredData]);

  const chartData = useMemo(() => {
    // Map data untuk agregasi unik per Kecamatan
    const aggregatedMap = new Map<string, any>();
    
    filteredData.forEach(d => {
      const kec = d.kecamatan;
      if (!aggregatedMap.has(kec)) {
        const obj: any = { name: kec };
        // Inisialisasi properti berdasarkan kategori
        if (category === "besar") {
            obj["Sapi Potong"] = 0; obj["Sapi Perah"] = 0; obj["Kerbau"] = 0; obj["Kuda"] = 0;
        } else if (category === "kecil") {
            obj["Kambing"] = 0; obj["Domba"] = 0; obj["Kelinci"] = 0; obj["Babi"] = 0;
        } else {
            obj["Ayam Broiler"] = 0; obj["Ayam Kampung"] = 0; obj["Ayam Ras Layer"] = 0; obj["Itik Biasa"] = 0; obj["Itik Manila"] = 0;
        }
        obj.total = 0;
        aggregatedMap.set(kec, obj);
      }

      const entry = aggregatedMap.get(kec);
      if (category === "besar") {
        const r = d as TernakBesar;
        entry["Sapi Potong"] += r.sapi;
        entry["Sapi Perah"] += r.sapiPerah;
        entry["Kerbau"] += r.kerbau;
        entry["Kuda"] += r.kuda;
        entry.total += (r.sapi + r.sapiPerah + r.kerbau + r.kuda);
      } else if (category === "kecil") {
        const r = d as TernakKecil;
        entry["Kambing"] += r.kambing;
        entry["Domba"] += r.domba;
        entry["Kelinci"] += r.kelinci;
        entry["Babi"] += r.babi;
        entry.total += (r.kambing + r.domba + r.kelinci + r.babi);
      } else {
        const r = d as Unggas;
        entry["Ayam Broiler"] += r.ayamBroiler;
        entry["Ayam Kampung"] += r.ayamKampung;
        entry["Ayam Ras Layer"] += r.ayamRasLayer;
        entry["Itik Biasa"] += r.itikBiasa;
        entry["Itik Manila"] += r.itikManila;
        entry.total += (r.ayamBroiler + r.ayamKampung + r.ayamRasLayer + r.itikBiasa + r.itikManila);
      }
    });

    return Array.from(aggregatedMap.values()).sort((a: any, b: any) => b.total - a.total);
  }, [category, filteredData]);

  const tableData = useMemo(() => {
    // Sama dengan chartData tapi untuk tabel
    return chartData;
  }, [chartData]);

  // Definisi jenis (field -> label) per kategori untuk agregasi tren
  const seriesKeys = useMemo(() => {
    if (category === "besar")
      return [
        { key: "sapi", label: "Sapi Potong" },
        { key: "sapiPerah", label: "Sapi Perah" },
        { key: "kerbau", label: "Kerbau" },
        { key: "kuda", label: "Kuda" },
      ];
    if (category === "kecil")
      return [
        { key: "kambing", label: "Kambing" },
        { key: "domba", label: "Domba" },
        { key: "kelinci", label: "Kelinci" },
        { key: "babi", label: "Babi" },
      ];
    return [
      { key: "ayamBroiler", label: "Ayam Broiler" },
      { key: "ayamKampung", label: "Ayam Kampung" },
      { key: "ayamRasLayer", label: "Ayam Ras Layer" },
      { key: "itikBiasa", label: "Itik Biasa" },
      { key: "itikManila", label: "Itik Manila" },
    ];
  }, [category]);

  // Tren deret waktu: agregasi populasi per tahun (lintas semua tahun),
  // menghormati filter kecamatan tapi mengabaikan filter tahun.
  const trendData = useMemo(() => {
    const rawData = category === "besar" ? besarData : category === "kecil" ? kecilData : unggasData;
    const base = selectedKecamatan === "Semua"
      ? rawData
      : rawData.filter(d => d.kecamatan === selectedKecamatan);

    const byYear = new Map<string, any>();
    base.forEach((d: any) => {
      const yr = d.tahun;
      if (!yr) return;
      if (!byYear.has(yr)) {
        const obj: any = { tahun: yr, total: 0 };
        seriesKeys.forEach(s => (obj[s.label] = 0));
        byYear.set(yr, obj);
      }
      const entry = byYear.get(yr);
      seriesKeys.forEach(s => {
        const v = d[s.key] || 0;
        entry[s.label] += v;
        entry.total += v;
      });
    });

    return Array.from(byYear.values()).sort((a, b) => a.tahun.localeCompare(b.tahun));
  }, [category, besarData, kecilData, unggasData, selectedKecamatan, seriesKeys]);

  const trendGrowth = useMemo(() => {
    if (trendData.length < 2) return null;
    const first = trendData[0];
    const last = trendData[trendData.length - 1];
    if (!first.total) return null;
    const pct = ((last.total - first.total) / first.total) * 100;
    return { first, last, pct };
  }, [trendData]);

  // CAGR (Compound Annual Growth Rate) per komoditas + total.
  // Rumus: (nilai_akhir / nilai_awal)^(1/jumlah_tahun) - 1
  const cagrData = useMemo(() => {
    if (trendData.length < 2) return null;
    const first = trendData[0];
    const last = trendData[trendData.length - 1];
    const years = parseInt(last.tahun) - parseInt(first.tahun);
    if (!years || years <= 0) return null;

    const calc = (awal: number, akhir: number): number | null => {
      if (!awal || awal <= 0 || akhir < 0) return null;
      return (Math.pow(akhir / awal, 1 / years) - 1) * 100;
    };

    const items = seriesKeys.map((s) => ({
      name: s.label,
      cagr: calc(first[s.label] || 0, last[s.label] || 0),
    }));

    return {
      periode: `${first.tahun}–${last.tahun}`,
      years,
      total: calc(first.total || 0, last.total || 0),
      items,
    };
  }, [trendData, seriesKeys]);

  // Deteksi anomali: tahun dengan penurunan populasi total tajam (YoY <= -15%).
  // Menandai penurunan sebagai indikasi wabah / gangguan populasi ternak.
  const ANOMALY_THRESHOLD = -15;
  const anomalies = useMemo(() => {
    const result: {
      tahun: string;
      prevTahun: string;
      pct: number;
      selisih: number;
      penyumbang: string;
    }[] = [];

    for (let i = 1; i < trendData.length; i++) {
      const prev = trendData[i - 1];
      const cur = trendData[i];
      if (!prev.total || prev.total <= 0) continue;
      const pct = ((cur.total - prev.total) / prev.total) * 100;
      if (pct > ANOMALY_THRESHOLD) continue;

      let penyumbang = "-";
      let maxDrop = 0;
      seriesKeys.forEach((s) => {
        const drop = (prev[s.label] || 0) - (cur[s.label] || 0);
        if (drop > maxDrop) {
          maxDrop = drop;
          penyumbang = s.label;
        }
      });

      result.push({
        tahun: cur.tahun,
        prevTahun: prev.tahun,
        pct,
        selisih: cur.total - prev.total,
        penyumbang,
      });
    }

    return result;
  }, [trendData, seriesKeys]);

  // Proyeksi regresi linear (least-squares) atas total populasi per tahun.
  // Memprediksi populasi tahun berikutnya + R^2 sebagai indikator keandalan.
  const projection = useMemo(() => {
    if (trendData.length < 3) return null;

    const pts = trendData.map((d) => ({ x: parseInt(d.tahun), y: d.total as number }));
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
      r2,
      slope,
      deltaPct,
      lastTahun: trendData[n - 1].tahun,
    };
  }, [trendData]);

  // Data grafik tren + titik proyeksi (garis putus-putus terpisah).
  const trendWithProjection = useMemo(() => {
    const base = trendData.map((d) => ({ ...d, proyeksi: undefined as number | undefined }));
    if (projection && base.length > 0) {
      base[base.length - 1].proyeksi = base[base.length - 1].total;
      base.push({ tahun: projection.nextYear, total: undefined as any, proyeksi: projection.predicted } as any);
    }
    return base;
  }, [trendData, projection]);

  const formatNum = (num: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num);

  const formatPct = (val: number) => new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8">
          
          
          <div className="relative z-10">
          
          <h2 className="font-serif italic text-3xl sm:text-5xl mt-2 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 to-teal-500 font-black drop-shadow-sm">
            Analitik Peternakan & Unggas
          </h2>
          <p className="font-mono text-sm md:text-base font-medium text-[#4a4a4a] mt-4 max-w-2xl border-l-4 border-emerald-500 pl-4 bg-white/80 py-1">
            Pemantauan Populasi Ternak Besar, Ternak Kecil, dan Unggas Kabupaten Banjarnegara.
          </p>
          </div>
        </section>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
          {/* Category Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">Kategori Ternak</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setCategory("besar")} 
                className={`py-2 px-3 border-2 border-[#141414] font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "besar" 
                    ? "bg-[#141414] text-white shadow-none" 
                    : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Beef size={14} />
                Besar
              </button>
              <button 
                onClick={() => setCategory("kecil")} 
                className={`py-2 px-3 border-2 border-[#141414] font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "kecil" 
                    ? "bg-[#141414] text-white shadow-none" 
                    : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Squirrel size={14} />
                Kecil
              </button>
              <button 
                onClick={() => setCategory("unggas")} 
                className={`py-2 px-3 border-2 border-[#141414] font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "unggas" 
                    ? "bg-[#141414] text-white shadow-none" 
                    : "bg-white text-[#141414] hover:bg-neutral-100 shadow-[2px_2px_0px_0px_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                }`}
              >
                <Bird size={14} />
                Unggas
              </button>
            </div>
          </div>

          {/* Year Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">Tahun Data</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border-2 border-[#141414] font-mono text-sm font-bold bg-white focus:outline-none appearance-none cursor-pointer rounded-none"
              >
                {yearsList.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Kecamatan Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-mono font-bold uppercase text-neutral-500">Pilih Kecamatan</label>
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
              <select 
                value={selectedKecamatan} 
                onChange={(e) => setSelectedKecamatan(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border-2 border-[#141414] font-mono text-sm font-bold bg-white focus:outline-none appearance-none cursor-pointer rounded-none"
              >
                {uniqueKecamatan.map(kec => (
                  <option key={kec} value={kec}>{kec}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-neutral-500 font-mono font-bold animate-pulse uppercase">Memuat data peternakan...</p>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stat 1: Total Populasi */}
              <div className="bg-amber-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-neutral-500 uppercase">Total Populasi</h5>
                    <h3 className="text-3xl font-serif font-black uppercase text-[#141414] mt-1">{formatNum(stats.total)}</h3>
                  </div>
                  <div className="p-2 border-2 border-[#141414] bg-white">
                    {category === "besar" ? <Beef size={20} /> : category === "kecil" ? <Squirrel size={20} /> : <Bird size={20} />}
                  </div>
                </div>
                <p className="text-xs font-mono text-neutral-500 mt-4 uppercase">Ekor ternak terdata di Banjarnegara ({selectedYear})</p>
              </div>

              {/* Stat 2: Top Kecamatan */}
              <div className="bg-emerald-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left flex flex-col justify-between transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-neutral-500 uppercase">Kecamatan Terpadat</h5>
                    <h3 className="text-2xl font-serif font-black uppercase text-[#141414] mt-1 break-words leading-tight">{stats.topDistrict}</h3>
                  </div>
                  <div className="p-2 border-2 border-[#141414] bg-white">
                    <MapPin size={20} />
                  </div>
                </div>
                <p className="text-xs font-mono text-neutral-500 mt-4 uppercase">Populasi: {formatNum(stats.topVal)} ekor</p>
              </div>

              {/* Stat 3: Komposisi Jenis */}
              <div className="bg-violet-50 border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] text-left transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <h5 className="text-xs font-mono font-bold text-neutral-500 uppercase mb-3">Komposisi Populasi</h5>
                <div className="flex flex-col gap-2">
                  {stats.breakdown.map((item, idx) => {
                    const percentage = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                    return (
                      <div key={item.name} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-mono font-bold uppercase">
                        <span>{item.name}</span>
                        <span>{formatNum(item.value)} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-neutral-200 h-2 border border-[#141414]">
                        <div className="h-full" style={{ width: `${percentage}%`, backgroundColor: ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#f472b6", "#a855f7"][idx % 7] }}></div>
                      </div>
                      </div>

                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tren Deret Waktu */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="mb-4 text-left border-b-2 border-[#141414] pb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <TrendingUp className="text-amber-600" />
                  Tren Populasi {trendData.length > 0 ? `${trendData[0].tahun}–${trendData[trendData.length - 1].tahun}` : ""}
                  {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                </h4>
                {trendGrowth && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 border-2 border-[#141414] font-mono font-bold text-[10px] uppercase ${
                      trendGrowth.pct >= 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {trendGrowth.pct >= 0 ? "▲" : "▼"} {formatNum(Math.abs(trendGrowth.pct))}% ({trendGrowth.first.tahun}→{trendGrowth.last.tahun})
                  </span>
                )}
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendWithProjection} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} vertical={false} />
                    <XAxis
                      dataKey="tahun"
                      tick={{ fill: "#141414", fontSize: 11, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#141414", strokeWidth: 2 }}
                      tickLine={{ stroke: "#141414" }}
                    />
                    <YAxis
                      tick={{ fill: "#141414", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#141414", strokeWidth: 2 }}
                      tickLine={{ stroke: "#141414" }}
                      tickFormatter={(v) => formatNum(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "2px solid #141414",
                        borderRadius: "0px",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        fontWeight: "bold",
                        boxShadow: "4px 4px 0px 0px #141414",
                      }}
                      formatter={(value: any) => [formatNum(Number(value)), ""]}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontSize: "11px", fontWeight: "bold" }} />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#141414" strokeWidth={3} dot={{ fill: "#141414", r: 4 }} activeDot={{ r: 6 }} connectNulls={false} />
                    <Line type="monotone" dataKey="proyeksi" name="Proyeksi" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 4" dot={{ fill: "#ef4444", r: 4 }} connectNulls={true} />
                    {seriesKeys.map((s, idx) => {
                      const colors = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#f472b6", "#a855f7"];
                      return (
                        <Line key={s.key} type="monotone" dataKey={s.label} stroke={colors[idx % colors.length]} strokeWidth={2} dot={false} />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Proyeksi Tahun Depan (Regresi Linear) */}
            {projection && (
              <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                    <TrendingUp className="text-red-600" size={18} />
                    Proyeksi {projection.nextYear} — Regresi Linear
                    {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                  </h4>
                  <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-1">
                    Perkiraan berdasarkan tren garis lurus (least-squares) atas total populasi
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border-2 border-[#141414] bg-red-50 p-4 shadow-[2px_2px_0px_0px_#141414] flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">
                      Perkiraan {projection.nextYear} (ekor)
                    </span>
                    <span className="text-2xl font-serif font-black text-[#141414] mt-2">
                      {formatNum(projection.predicted)}
                    </span>
                  </div>
                  <div className="border-2 border-[#141414] bg-white p-4 shadow-[2px_2px_0px_0px_#141414] flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">
                      Perubahan vs {projection.lastTahun}
                    </span>
                    <span
                      className={`text-2xl font-serif font-black mt-2 ${
                        projection.deltaPct === null
                          ? "text-neutral-400"
                          : projection.deltaPct >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                      }`}
                    >
                      {projection.deltaPct === null
                        ? "N/A"
                        : `${projection.deltaPct >= 0 ? "▲" : "▼"} ${formatPct(Math.abs(projection.deltaPct))}%`}
                    </span>
                  </div>
                  <div className="border-2 border-[#141414] bg-white p-4 shadow-[2px_2px_0px_0px_#141414] flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">
                      Keandalan Model (R²)
                    </span>
                    <span
                      className={`text-2xl font-serif font-black mt-2 ${
                        projection.r2 >= 0.7
                          ? "text-emerald-600"
                          : projection.r2 >= 0.4
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {formatPct(projection.r2 * 100)}%
                    </span>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-neutral-500 uppercase mt-3">
                  {projection.r2 >= 0.7
                    ? "Tren cukup konsisten — proyeksi relatif dapat diandalkan."
                    : projection.r2 >= 0.4
                      ? "Tren agak fluktuatif — proyeksi perlu kehati-hatian."
                      : "Data sangat fluktuatif — proyeksi kurang dapat diandalkan."}
                </p>
              </div>
            )}

            {/* Deteksi Anomali */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="mb-4 text-left border-b border-neutral-200 pb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <AlertTriangle className="text-red-600" size={18} />
                  Deteksi Anomali Populasi
                </h4>
                <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">
                  Ambang penurunan tajam: {ANOMALY_THRESHOLD}% YoY
                </span>
              </div>
              {anomalies.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border-2 border-[#141414] text-[11px] font-mono font-bold text-emerald-800 uppercase">
                  <ShieldCheck size={14} />
                  Tidak ada penurunan tajam terdeteksi pada periode ini
                  {selectedKecamatan !== "Semua" ? ` (${selectedKecamatan})` : ""}.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {anomalies.map((a) => (
                    <div
                      key={a.tahun}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 bg-red-50 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-2 py-0.5 bg-red-600 text-white border-2 border-[#141414] font-mono font-black text-sm">
                          {a.tahun}
                        </span>
                        <div className="text-left">
                          <p className="text-[11px] font-mono font-bold uppercase text-red-800">
                            Turun {formatNum(Math.abs(a.pct))}% dari {a.prevTahun}
                          </p>
                          <p className="text-[10px] font-mono text-neutral-600 uppercase">
                            Penyumbang utama: {a.penyumbang} · {formatNum(Math.abs(a.selisih))} ekor
                          </p>
                        </div>
                      </div>
                      <span className="text-xl font-serif font-black text-red-600">
                        ▼ {formatNum(Math.abs(a.pct))}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CAGR per Komoditas */}
            {cagrData && (
              <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
                <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                    Laju Pertumbuhan Tahunan (CAGR) {cagrData.periode}
                    {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                  </h4>
                  <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase mt-1">
                    Rata-rata pertumbuhan majemuk populasi per tahun selama {cagrData.years} tahun
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Kartu Total */}
                  <div className="border-2 border-[#141414] bg-[#141414] text-white p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-300">
                      Total
                    </span>
                    <span className="text-2xl font-serif font-black mt-2">
                      {cagrData.total === null
                        ? "N/A"
                        : `${cagrData.total >= 0 ? "+" : ""}${formatPct(cagrData.total)}%`}
                    </span>
                  </div>
                  {cagrData.items.map((item) => (
                    <div
                      key={item.name}
                      className="border-2 border-[#141414] bg-white p-4 flex flex-col justify-between shadow-[2px_2px_0px_0px_#141414]"
                    >
                      <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 leading-tight">
                        {item.name}
                      </span>
                      <span
                        className={`text-2xl font-serif font-black mt-2 ${
                          item.cagr === null
                            ? "text-neutral-400"
                            : item.cagr >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                        }`}
                      >
                        {item.cagr === null ? (
                          "N/A"
                        ) : (
                          <>
                            {item.cagr >= 0 ? "▲" : "▼"} {formatPct(Math.abs(item.cagr))}%
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chart Area */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="flex flex-col mb-6 border-b-2 border-[#141414] pb-3 text-left">
                <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <TrendingUp className="text-amber-600" />
                  Grafik Sebaran Populasi Ternak ({selectedYear})
                </h4>
                <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">
                  Populasi per Kecamatan di Banjarnegara Tahun {selectedYear}
                </p>
              </div>
              
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: "#141414", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#141414", strokeWidth: 2 }}
                      tickLine={{ stroke: "#141414" }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fill: "#141414", fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                      axisLine={{ stroke: "#141414", strokeWidth: 2 }}
                      tickLine={{ stroke: "#141414" }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "2px solid #141414",
                        borderRadius: "0px",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        fontWeight: "bold",
                        boxShadow: "4px 4px 0px 0px #141414"
                      }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "monospace", fontSize: "11px", fontWeight: "bold" }} />
                    {stats.breakdown.map((item, idx) => {
                      const colors = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#f472b6", "#a855f7"];
                      return (
                        <Bar 
                          key={idx}
                          dataKey={item.name} 
                          fill={colors[idx % colors.length]} 
                          stroke="#141414"
                          strokeWidth={1}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border-2 border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] transition-all duration-300 hover:shadow-[8px_8px_0px_0px_#141414] hover:translate-y-[-2px] hover:translate-x-[-2px]">
              <div className="mb-4 text-left border-b border-neutral-200 pb-2">
                <h4 className="text-md font-mono font-bold uppercase tracking-wide">Tabel Rincian Populasi ({selectedYear})</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#141414] bg-neutral-100">
                      <th className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs">No</th>
                      <th className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs">Kecamatan</th>
                      {stats.breakdown.map((b, idx) => (
                        <th key={idx} className="p-3 border-r-2 border-[#141414] font-bold uppercase text-xs text-right">{b.name}</th>
                      ))}
                      <th className="p-3 font-bold uppercase text-xs text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row: any, idx: number) => {
                      // Filter keys for values to display
                      const displayKeys = Object.keys(row).filter(k => k !== "name" && k !== "total");
                      
                      return (
                        <tr key={`${row.name}-${idx}`} className="border-b-2 border-neutral-200 hover:bg-neutral-50 transition-colors">
                          <td className="p-3 border-r-2 border-neutral-200 text-xs font-bold">{idx + 1}</td>
                          <td className="p-3 border-r-2 border-neutral-200 font-bold uppercase">{row.name}</td>
                          {displayKeys.map((key, i) => (
                            <td key={i} className="p-3 border-r-2 border-neutral-200 text-right">{formatNum(row[key])}</td>
                          ))}
                          <td className="p-3 font-bold text-right bg-neutral-50">{formatNum(row.total)}</td>
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
