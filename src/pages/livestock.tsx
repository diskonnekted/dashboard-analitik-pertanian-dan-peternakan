import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchTernakKecil, fetchTernakBesar, fetchUnggas, fetchTernakTelur, TernakKecil, TernakBesar, Unggas, TernakFlow } from "@/services/api";
import { Beef, Squirrel, Bird, Calendar, MapPin, TrendingUp, Filter, AlertTriangle, ShieldCheck, Egg } from "lucide-react";
import { PageHeader, KpiCard, SectionCard, TrendPill, Badge, LoadingSpinner } from "@/components/ui";

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

  // ===== Produksi Telur (kg) — S1 "Produksi ternak: ... telur ..." (notulen Distankan KP 21 Sep) =====
  const [telurData, setTelurData] = useState<TernakFlow[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await fetchTernakTelur();
        if (mounted) setTelurData(rows);
      } catch (err) {
        console.error("Gagal memuat data produksi telur:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const telurTahun = (() => {
    const yrs = Array.from(new Set(telurData.map((r) => r.tahun).filter(Boolean))).sort();
    return yrs.length > 0 ? yrs[yrs.length - 1] : "";
  })();
  const telurJenis = telurData.length > 0
    ? Array.from(new Set(telurData.flatMap((r) => r.items.map((it) => it.jenis))))
    : [];
  const telurRows = telurData
    .filter((r) => r.tahun === telurTahun)
    .map((r) => ({
      kecamatan: r.kecamatan,
      byJenis: Object.fromEntries(r.items.map((it) => [it.jenis, Number(it.jumlah) || 0])),
    }))
    .sort((a, b) => a.kecamatan.localeCompare(b.kecamatan));
  const telurTotal = telurRows.reduce(
    (a, row) => a + telurJenis.reduce((x, j) => x + (row.byJenis[j] || 0), 0),
    0
  );

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
    let topVal = 0;
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
        <PageHeader
          icon={<Beef className="h-6 w-6" />}
          title="Analitik Peternakan & Unggas"
          subtitle="Pemantauan populasi ternak besar, ternak kecil, dan unggas per kecamatan di Kabupaten Banjarnegara."
          actions={<Badge tone="blue">Tahun {selectedYear}</Badge>}
        />

        {/* Jenis ternak tambahan — placeholder menunggu data dinas (keputusan klien 23 Sep 2026) */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">Jenis ternak tambahan — menunggu data dinas.</span>{" "}
            <span className="font-semibold">Domba Batur</span> (kategori Ternak Kecil, entri terpisah dari Domba
            lokal) dan <span className="font-semibold">Puyuh</span> (kategori Unggas) akan tampil otomatis pada
            kategori terkait setelah data populasi &amp; produksinya diimpor dari Distankan KP melalui dasbor
            admin. Dataset BPS tahunan belum memisahkan kedua jenis ini.
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          {/* Category Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kategori Ternak</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setCategory("besar")} 
                className={`py-2 px-3 border border-slate-200 text-xs font-semibold uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "besar"
                    ? "bg-blue-800 text-white shadow-sm"
                    : "bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <Beef size={14} />
                Besar
              </button>
              <button 
                onClick={() => setCategory("kecil")} 
                className={`py-2 px-3 border border-slate-200 text-xs font-semibold uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "kecil"
                    ? "bg-blue-800 text-white shadow-sm"
                    : "bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <Squirrel size={14} />
                Kecil
              </button>
              <button 
                onClick={() => setCategory("unggas")} 
                className={`py-2 px-3 border border-slate-200 text-xs font-semibold uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "unggas"
                    ? "bg-blue-800 text-white shadow-sm"
                    : "bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <Bird size={14} />
                Unggas
              </button>
            </div>
          </div>

          {/* Year Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tahun Data</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 text-sm font-medium bg-white focus:outline-none appearance-none cursor-pointer rounded-md"
              >
                {yearsList.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Kecamatan Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pilih Kecamatan</label>
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
              <select 
                value={selectedKecamatan} 
                onChange={(e) => setSelectedKecamatan(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 text-sm font-medium bg-white focus:outline-none appearance-none cursor-pointer rounded-md"
              >
                {uniqueKecamatan.map(kec => (
                  <option key={kec} value={kec}>{kec}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner label="Memuat data peternakan" />
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stat 1: Total Populasi */}
              <KpiCard
                icon={category === "besar" ? <Beef size={20} /> : category === "kecil" ? <Squirrel size={20} /> : <Bird size={20} />}
                label="Total Populasi"
                value={formatNum(stats.total)}
                unit="ekor"
                color="bg-amber-300"
                hint={`Ternak terdata di Banjarnegara (${selectedYear})`}
              />

              {/* Stat 2: Top Kecamatan */}
              <KpiCard
                icon={<MapPin size={20} />}
                label="Kecamatan Terpadat"
                value={stats.topDistrict}
                color="bg-emerald-300"
                hint={`Populasi ${formatNum(stats.topVal)} ekor (${selectedYear})`}
              />

              {/* Stat 3: Komposisi Jenis */}
              <SectionCard title="Komposisi Populasi" bodyClassName="p-5 flex flex-col justify-center">
                <div className="flex flex-col gap-2.5">
                  {stats.breakdown.map((item, idx) => {
                    const percentage = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                    return (
                      <div key={item.name} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>{item.name}</span>
                        <span>{formatNum(item.value)} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#f472b6", "#a855f7"][idx % 7] }}></div>
                      </div>
                      </div>

                    );
                  })}
                </div>
              </SectionCard>
            </div>

            {/* Tren Deret Waktu */}
            <SectionCard
              title={`Tren Populasi ${trendData.length > 0 ? `${trendData[0].tahun}–${trendData[trendData.length - 1].tahun}` : ""}${
                selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""
              }`}
              icon={<TrendingUp size={16} className="text-amber-600" />}
              actions={
                trendGrowth ? (
                  <TrendPill value={trendGrowth.pct} label={`${trendGrowth.first.tahun}→${trendGrowth.last.tahun}`} />
                ) : undefined
              }
            >
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendWithProjection} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} vertical={false} />
                    <XAxis
                      dataKey="tahun"
                      tick={{ fill: "#475569", fontSize: 11 }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                    />
                    <YAxis
                      tick={{ fill: "#475569", fontSize: 10 }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                      tickFormatter={(v) => formatNum(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: any, name: any) => [formatNum(Number(value)), String(name ?? "")]}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px" }} />
                    <Line type="monotone" dataKey="total" name="Total Populasi" stroke="#64748b" strokeWidth={3} dot={{ fill: "#475569", r: 4 }} activeDot={{ r: 6 }} connectNulls={false} />
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
            </SectionCard>

            {/* Proyeksi Tahun Depan (Regresi Linear) */}
            {projection && (
              <SectionCard
                title={`Proyeksi ${projection.nextYear} — Regresi Linear${
                  selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""
                }`}
                icon={<TrendingUp size={16} className="text-red-600" />}
              >
                <p className="text-xs text-slate-500 mb-4">
                  Perkiraan berdasarkan tren garis lurus (least-squares) atas total populasi
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border border-red-100 bg-red-50 rounded-lg p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      Perkiraan {projection.nextYear} (ekor)
                    </span>
                    <span className="text-2xl font-bold tabular-nums text-slate-800 mt-2">
                      {formatNum(projection.predicted)}
                    </span>
                  </div>
                  <div className="border border-slate-200 bg-white rounded-lg p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      Perubahan vs {projection.lastTahun}
                    </span>
                    <span
                      className={`text-2xl font-bold tabular-nums mt-2 ${
                        projection.deltaPct === null
                          ? "text-slate-400"
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
                  <div className="border border-slate-200 bg-white rounded-lg p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      Keandalan Model (R²)
                    </span>
                    <span
                      className={`text-2xl font-bold tabular-nums mt-2 ${
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
                <p className="text-xs text-slate-400 mt-3">
                  {projection.r2 >= 0.7
                    ? "Tren cukup konsisten — proyeksi relatif dapat diandalkan."
                    : projection.r2 >= 0.4
                      ? "Tren agak fluktuatif — proyeksi perlu kehati-hatian."
                      : "Data sangat fluktuatif — proyeksi kurang dapat diandalkan."}
                </p>
              </SectionCard>
            )}

            {/* Deteksi Anomali */}
            <SectionCard
              title="Deteksi Anomali Populasi"
              icon={<AlertTriangle size={16} className="text-red-600" />}
              actions={<Badge tone="red">Ambang {ANOMALY_THRESHOLD}% YoY</Badge>}
            >
              {anomalies.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-semibold text-emerald-800">
                  <ShieldCheck size={14} />
                  Tidak ada penurunan tajam terdeteksi pada periode ini
                  {selectedKecamatan !== "Semua" ? ` (${selectedKecamatan})` : ""}.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {anomalies.map((a) => (
                    <div
                      key={a.tahun}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 bg-red-50 border border-red-100 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-800 text-white text-xs font-bold tabular-nums">
                          {a.tahun}
                        </span>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-red-700">
                            Turun {formatNum(Math.abs(a.pct))}% dari {a.prevTahun}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Penyumbang utama: {a.penyumbang} · {formatNum(Math.abs(a.selisih))} ekor
                          </p>
                        </div>
                      </div>
                      <span className="text-xl font-bold tabular-nums text-red-600">
                        ▼ {formatNum(Math.abs(a.pct))}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* CAGR per Komoditas */}
            {cagrData && (
              <SectionCard
                title={`Laju Pertumbuhan Tahunan (CAGR) ${cagrData.periode}${
                  selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""
                }`}
              >
                <p className="text-xs text-slate-500 mb-4">
                  Rata-rata pertumbuhan majemuk populasi per tahun selama {cagrData.years} tahun
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Kartu Total */}
                  <div className="border border-slate-800 bg-slate-800 text-white rounded-lg p-4 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold uppercase text-slate-400">
                      Total
                    </span>
                    <span className="text-2xl font-bold tabular-nums mt-2">
                      {cagrData.total === null
                        ? "N/A"
                        : `${cagrData.total >= 0 ? "+" : ""}${formatPct(cagrData.total)}%`}
                    </span>
                  </div>
                  {cagrData.items.map((item) => (
                    <div
                      key={item.name}
                      className="border border-slate-200 bg-white p-4 flex flex-col justify-between shadow-sm"
                    >
                      <span className="text-[11px] font-semibold uppercase text-slate-500 leading-tight">
                        {item.name}
                      </span>
                      <span
                        className={`text-2xl font-bold tabular-nums mt-2 ${
                          item.cagr === null
                            ? "text-slate-400"
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
              </SectionCard>
            )}

            {/* Chart Area */}
            <SectionCard
              title={`Grafik Sebaran Populasi Ternak (${selectedYear})`}
              icon={<TrendingUp size={16} className="text-amber-600" />}
            >
              <p className="text-xs text-slate-500 mb-4">
                Populasi per Kecamatan di Banjarnegara Tahun {selectedYear} · batang ditumpuk per jenis ternak,
                tinggi total batang = total populasi kecamatan
              </p>
              
              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.1} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: "#475569", fontSize: 10 }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis 
                      width={70}
                      tick={{ fill: "#475569", fontSize: 10 }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
                      }}
                      formatter={(value: any, name: any) => [formatNum(Number(value)), String(name ?? "")]}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px" }} />
                    {stats.breakdown.map((item, idx) => {
                      const colors = ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#f472b6", "#a855f7"];
                      return (
                        <Bar
                          key={idx}
                          dataKey={item.name}
                          stackId="a"
                          fill={colors[idx % colors.length]}
                          stroke="#64748b"
                          strokeWidth={1}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            {/* Data Table */}
            <SectionCard title={`Tabel Rincian Populasi (${selectedYear})`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">No</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Kecamatan</th>
                      {stats.breakdown.map((b, idx) => (
                        <th key={idx} className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">{b.name}</th>
                      ))}
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row: any, idx: number) => {
                      // Filter keys for values to display
                      const displayKeys = Object.keys(row).filter(k => k !== "name" && k !== "total");
                      
                      return (
                        <tr key={`${row.name}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-xs font-semibold text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-semibold">{row.name}</td>
                          {displayKeys.map((key, i) => (
                            <td key={i} className="px-3 py-2.5 text-right tabular-nums">{formatNum(row[key])}</td>
                          ))}
                          <td className="px-3 py-2.5 font-bold text-right bg-slate-50 tabular-nums">{formatNum(row.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {tableData.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold">
                        <td className="px-3 py-2.5 text-[11px] uppercase tracking-wide text-slate-600" colSpan={2}>
                          Jumlah · {selectedKecamatan === "Semua" ? "Seluruh Kabupaten" : selectedKecamatan}
                        </td>
                        {stats.breakdown.map((b, idx) => (
                          <td key={idx} className="px-3 py-2.5 text-xs text-right tabular-nums">
                            {formatNum(tableData.reduce((a: number, row: any) => a + (Number(row[b.name]) || 0), 0))}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-xs font-bold text-right bg-amber-50 tabular-nums">
                          {formatNum(stats.total)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </SectionCard>
          </>
        )}

        {/* ===== Produksi Telur (kg) — S1 "Produksi ternak: ... telur ..." (notulen 21 Sep) ===== */}
        {telurRows.length > 0 && (
          <SectionCard
            title={`Produksi Telur${telurTahun ? ` — ${telurTahun}` : ""} (kg)`}
            icon={<Egg size={16} className="text-amber-600" />}
            actions={<Badge tone="blue">Total {formatNum(telurTotal)} kg</Badge>}
          >
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Produksi telur ayam kampung &amp; ayam ras layer per kecamatan. Sumber: Distankan KP Banjarnegara
              (BPS) — jalur utama MySQL, fallback CSV. Telur puyuh &amp; itik akan menyusul melalui import dinas
              (notulen Distankan KP 21 Sep 2026).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">No</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Kecamatan</th>
                    {telurJenis.map((j) => (
                      <th key={j} className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">{j}</th>
                    ))}
                    <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {telurRows.map((row, idx) => (
                    <tr key={row.kecamatan} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-xs font-semibold text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-semibold">{row.kecamatan}</td>
                      {telurJenis.map((j) => (
                        <td key={j} className="px-3 py-2.5 text-right tabular-nums">{formatNum(row.byJenis[j] || 0)}</td>
                      ))}
                      <td className="px-3 py-2.5 font-bold text-right bg-slate-50 tabular-nums">
                        {formatNum(telurJenis.reduce((a, j) => a + (row.byJenis[j] || 0), 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {telurRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold">
                      <td className="px-3 py-2.5 text-[11px] uppercase tracking-wide text-slate-600" colSpan={2}>
                        Jumlah · Seluruh Kabupaten
                      </td>
                      {telurJenis.map((j) => (
                        <td key={j} className="px-3 py-2.5 text-xs text-right tabular-nums">
                          {formatNum(telurRows.reduce((a, row) => a + (row.byJenis[j] || 0), 0))}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-xs font-bold text-right bg-amber-50 tabular-nums">
                        {formatNum(telurTotal)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </SectionCard>
        )}
      </section>
    </DefaultLayout>
  );
}
