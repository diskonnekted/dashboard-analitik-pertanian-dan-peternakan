import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import { EmptyStatePlaceholder, LoadingSpinner } from "@/components/ui";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  fetchPerikananBudidaya,
  fetchPerikananTangkap,
  fetchPerikananBenih,
  fetchNilaiProduksiBudidaya,
  fetchNilaiProduksiTangkap,
  PerikananBudidaya,
  PerikananTangkap,
  PerikananBenih,
  NilaiProduksiRow,
} from "@/services/api";
import {
  PRODUK_IKAN_TAWAR,
  PRODUK_IKAN_LAUT,
  PRODUK_IKAN_SUMBER,
  PRODUK_IKAN_TANGGAL,
  hargaTengah,
  HARGA_TAWAR_TERTIMBANG,
} from "@/data/produk-ikan";
import {
  Fish,
  Waves,
  Egg,
  Calendar,
  MapPin,
  Filter,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  ShoppingBasket,
  Banknote,
  Palette,
} from "lucide-react";

type Category = "budidaya" | "tangkap" | "benih" | "produk" | "hias";

export default function FisheriesPage() {
  const [budidayaData, setBudidayaData] = useState<PerikananBudidaya[]>([]);
  const [tangkapData, setTangkapData] = useState<PerikananTangkap[]>([]);
  const [benihData, setBenihData] = useState<PerikananBenih[]>([]);
  // Nilai produksi resmi BPS (budidaya + tangkap) — pembanding estimasi katalog jenis ikan
  const [nilaiBudidayaData, setNilaiBudidayaData] = useState<NilaiProduksiRow[]>(
    [],
  );
  const [nilaiTangkapData, setNilaiTangkapData] = useState<NilaiProduksiRow[]>(
    [],
  );

  const [category, setCategory] = useState<Category>("budidaya");
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [budidaya, tangkap, benih, nilaiBudidaya, nilaiTangkap] =
          await Promise.all([
            fetchPerikananBudidaya(),
            fetchPerikananTangkap(),
            fetchPerikananBenih(),
            fetchNilaiProduksiBudidaya(),
            fetchNilaiProduksiTangkap(),
          ]);
        setBudidayaData(budidaya);
        setTangkapData(tangkap);
        setBenihData(benih);
        setNilaiBudidayaData(nilaiBudidaya);
        setNilaiTangkapData(nilaiTangkap);
      } catch (err) {
        console.error("Gagal memuat data perikanan:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  const activeRaw = useMemo(
    () =>
      category === "budidaya"
        ? budidayaData
        : category === "tangkap"
          ? tangkapData
          : category === "produk"
            ? ([...budidayaData, ...tangkapData] as any[])
            : category === "hias"
              ? ([] as any[])
              : benihData,
    [category, budidayaData, tangkapData, benihData],
  );

  const yearsList = useMemo(() => {
    return Array.from(new Set(activeRaw.map((d) => d.tahun).filter(Boolean))).sort(
      (a, b) => b.localeCompare(a),
    );
  }, [activeRaw]);

  useEffect(() => {
    if (yearsList.length > 0 && !yearsList.includes(selectedYear)) {
      setSelectedYear(yearsList[0]);
    }
  }, [category, yearsList]);

  // Ganti kategori -> reset filter kecamatan agar tidak tersangkut
  // pada kecamatan yang tidak tersedia di kategori baru.
  useEffect(() => {
    setSelectedKecamatan("Semua");
  }, [category]);

  const currentData = useMemo(() => {
    return activeRaw.filter((d) => d.tahun === selectedYear);
  }, [activeRaw, selectedYear]);

  const uniqueKecamatan = useMemo(() => {
    return [
      "Semua",
      ...Array.from(new Set(currentData.map((d) => d.kecamatan))).sort(),
    ];
  }, [currentData]);

  const filteredData = useMemo(() => {
    return selectedKecamatan === "Semua"
      ? currentData
      : currentData.filter((d) => d.kecamatan === selectedKecamatan);
  }, [currentData, selectedKecamatan]);

  // Definisi jenis (dataKey) per kategori
  const seriesKeys = useMemo(() => {
    if (category === "produk" || category === "hias") return [];
    if (category === "budidaya")
      return [
        { key: "kolamPembesaran", label: "Kolam Pembesaran" },
        { key: "karambaApung", label: "Karamba Apung" },
        { key: "minaPenyelang", label: "Mina Penyelang" },
        { key: "minaTumpangsari", label: "Mina Tumpangsari" },
      ];
    if (category === "tangkap")
      return [
        { key: "jalaTebar", label: "Jala Tebar" },
        { key: "pancing", label: "Pancing" },
        { key: "jaringIngsang", label: "Jaring Insang" },
        { key: "lainnya", label: "Lainnya" },
      ];
    return [
      { key: "dipeliharaSendiri", label: "Dipelihara Sendiri" },
      { key: "dijualLuar", label: "Dijual ke Luar" },
    ];
  }, [category]);

  const unit = category === "benih" ? "ekor" : "kg";

  const stats = useMemo(() => {
    let total = 0;
    let topDistrict = "-";
    let topVal = 0;
    const totalsByKey: Record<string, number> = {};
    seriesKeys.forEach((s) => (totalsByKey[s.key] = 0));

    filteredData.forEach((d: any) => {
      let sum = 0;
      seriesKeys.forEach((s) => {
        const v = d[s.key] || 0;
        totalsByKey[s.key] += v;
        sum += v;
      });
      total += sum;
      if (sum > topVal) {
        topVal = sum;
        topDistrict = d.kecamatan;
      }
    });

    const breakdown = seriesKeys.map((s) => ({
      name: s.label,
      value: totalsByKey[s.key],
    }));

    return { total, topDistrict, topVal, breakdown };
  }, [filteredData, seriesKeys]);

  const chartData = useMemo(() => {
    const aggregatedMap = new Map<string, any>();

    filteredData.forEach((d: any) => {
      const kec = d.kecamatan;
      if (!aggregatedMap.has(kec)) {
        const obj: any = { name: kec, total: 0 };
        seriesKeys.forEach((s) => (obj[s.label] = 0));
        aggregatedMap.set(kec, obj);
      }
      const entry = aggregatedMap.get(kec);
      seriesKeys.forEach((s) => {
        const v = d[s.key] || 0;
        entry[s.label] += v;
        entry.total += v;
      });
    });

    return Array.from(aggregatedMap.values()).sort(
      (a: any, b: any) => b.total - a.total,
    );
  }, [filteredData, seriesKeys]);

  // Tren deret waktu: agregasi produksi per tahun (lintas semua tahun),
  // menghormati filter kecamatan tapi mengabaikan filter tahun.
  const trendData = useMemo(() => {
    const base =
      selectedKecamatan === "Semua"
        ? activeRaw
        : activeRaw.filter((d) => d.kecamatan === selectedKecamatan);

    const byYear = new Map<string, any>();
    base.forEach((d: any) => {
      const yr = d.tahun;
      if (!yr) return;
      if (!byYear.has(yr)) {
        const obj: any = { tahun: yr, total: 0 };
        seriesKeys.forEach((s) => (obj[s.label] = 0));
        byYear.set(yr, obj);
      }
      const entry = byYear.get(yr);
      seriesKeys.forEach((s) => {
        const v = d[s.key] || 0;
        entry[s.label] += v;
        entry.total += v;
      });
    });

    return Array.from(byYear.values()).sort((a, b) =>
      a.tahun.localeCompare(b.tahun),
    );
  }, [activeRaw, selectedKecamatan, seriesKeys]);

  // Pertumbuhan total dari tahun pertama ke tahun terakhir yang tersedia
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
      awal: first[s.label] || 0,
      akhir: last[s.label] || 0,
      cagr: calc(first[s.label] || 0, last[s.label] || 0),
    }));

    return {
      periode: `${first.tahun}–${last.tahun}`,
      years,
      total: calc(first.total || 0, last.total || 0),
      items,
    };
  }, [trendData, seriesKeys]);

  // Deteksi anomali: tahun dengan penurunan total tajam (YoY <= -15%).
  // Menandai penurunan sebagai indikasi gagal panen / gangguan produksi.
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

      // Komoditas dengan penurunan absolut terbesar sebagai penyumbang utama
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

  // Proyeksi regresi linear (least-squares) atas total per tahun.
  // Memprediksi produksi tahun berikutnya + R^2 sebagai indikator keandalan.
  const projection = useMemo(() => {
    if (trendData.length < 3) return null;

    const pts = trendData.map((d) => ({
      x: parseInt(d.tahun),
      y: d.total as number,
    }));
    const n = pts.length;
    const sumX = pts.reduce((a, p) => a + p.x, 0);
    const sumY = pts.reduce((a, p) => a + p.y, 0);
    const sumXY = pts.reduce((a, p) => a + p.x * p.y, 0);
    const sumXX = pts.reduce((a, p) => a + p.x * p.x, 0);

    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // R^2
    const meanY = sumY / n;
    const ssTot = pts.reduce((a, p) => a + Math.pow(p.y - meanY, 2), 0);
    const ssRes = pts.reduce(
      (a, p) => a + Math.pow(p.y - (slope * p.x + intercept), 2),
      0,
    );
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
    const base = trendData.map((d) => ({
      ...d,
      proyeksi: undefined as number | undefined,
    }));
    if (projection && base.length > 0) {
      // Sambungkan garis proyeksi dari titik terakhir aktual
      base[base.length - 1].proyeksi = base[base.length - 1].total;
      base.push({
        tahun: projection.nextYear,
        total: undefined as any,
        proyeksi: projection.predicted,
      } as any);
    }
    return base;
  }, [trendData, projection]);

  // ===================== Kategori "Jenis Ikan" =====================
  // Estimasi rincian produksi per jenis ikan air tawar (tahun & kecamatan terpilih).
  // BPS hanya mempublikasikan produksi per tempat pemeliharaan (budidaya) dan per
  // alat tangkap — TIDAK per jenis ikan — sehingga volume per jenis dihitung dari
  // pangsa komposisi indikatif (src/data/produk-ikan.ts), bukan angka BPS.
  const produkEstimasi = useMemo(() => {
    const matchFilter = (d: { kecamatan: string; tahun: string }) =>
      d.tahun === selectedYear &&
      (selectedKecamatan === "Semua" || d.kecamatan === selectedKecamatan);

    // Volume lokal air tawar = budidaya (kolam+karamba+2×mina) + tangkap (semua alat)
    const budidayaRows = budidayaData.filter(matchFilter);
    const tangkapRows = tangkapData.filter(matchFilter);
    const volBudidaya = budidayaRows.reduce(
      (a, d) =>
        a +
        (d.kolamPembesaran || 0) +
        (d.karambaApung || 0) +
        (d.minaPenyelang || 0) +
        (d.minaTumpangsari || 0),
      0,
    );
    const volTangkap = tangkapRows.reduce(
      (a, d) =>
        a +
        (d.jalaTebar || 0) +
        (d.pancing || 0) +
        (d.jaringIngsang || 0) +
        (d.lainnya || 0),
      0,
    );
    const volumeTawar = volBudidaya + volTangkap;

    // Rincian estimasi per jenis: volume = pangsa × total; nilai = volume × harga tengah
    const rincian = PRODUK_IKAN_TAWAR.map((p) => {
      const vol = (volumeTawar * (p.pangsa ?? 0)) / 100;
      const harga = hargaTengah(p);
      return { produk: p, volume: vol, harga, nilai: vol * harga };
    });
    const nilaiEstimasi = rincian.reduce((a, r) => a + r.nilai, 0);

    // Pembanding resmi: nilai & volume BPS (tabel nilai produksi budidaya + tangkap)
    const nilaiRows = [...nilaiBudidayaData, ...nilaiTangkapData].filter(
      matchFilter,
    );
    const nilaiAktual =
      nilaiRows.reduce(
        (a, d) => a + d.jenis.reduce((b, j) => b + (j.nilai || 0), 0),
        0,
      ) * 1000; // ribu Rp -> Rp
    const volumeAktual = nilaiRows.reduce(
      (a, d) => a + d.jenis.reduce((b, j) => b + (j.produksi || 0), 0),
      0,
    );
    const hargaImplisitAktual =
      volumeAktual > 0 ? nilaiAktual / volumeAktual : null;

    return {
      volBudidaya,
      volTangkap,
      volumeTawar,
      rincian,
      nilaiEstimasi,
      nilaiAktual,
      volumeAktual,
      hargaImplisitAktual,
    };
  }, [
    selectedYear,
    selectedKecamatan,
    budidayaData,
    tangkapData,
    nilaiBudidayaData,
    nilaiTangkapData,
  ]);

  const formatNum = (num: number) =>
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num);

  const formatPct = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(val);

  // Rupiah ringkas: jt / M / T
  const formatRp = (v: number) => {
    if (v >= 1e12)
      return `Rp ${(v / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
    if (v >= 1e9)
      return `Rp ${(v / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
    if (v >= 1e6)
      return `Rp ${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
    return `Rp ${Math.round(v).toLocaleString("id-ID")}`;
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8 py-2">
        {/* Hero / intro */}
        <section className="relative text-left animate-fade-in py-4 md:py-8 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-200 pb-8">
          <div className="relative z-10 flex-1">
            <h2 className="text-2xl sm:text-4xl leading-tight font-bold tracking-tight text-slate-800">
            Analitik Perikanan
          </h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-2 max-w-2xl border-l-2 border-blue-500 pl-3">
            Pemantauan Produksi Perikanan Budidaya, Tangkap, dan Pembenihan Ikan Kabupaten Banjarnegara.
          </p>
          </div>
          <div className="w-full md:w-48 lg:w-64 shrink-0 flex items-center justify-center">
            <img
              src="/img/fisheries.png"
              alt="Perikanan"
              className="w-full max-h-32 md:max-h-36 object-contain"
            />
          </div>
        </section>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
          {/* Category Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-mono font-bold uppercase text-slate-500">
              Kategori Perikanan
            </label>
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => setCategory("budidaya")}
                className={`py-2 px-3 border border-slate-200 font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "budidaya"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <Fish size={14} />
                Budidaya
              </button>
              <button
                onClick={() => setCategory("tangkap")}
                className={`py-2 px-3 border border-slate-200 font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "tangkap"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <Waves size={14} />
                Tangkap
              </button>
              <button
                onClick={() => setCategory("benih")}
                className={`py-2 px-3 border border-slate-200 font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "benih"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <Egg size={14} />
                Benih
              </button>
              <button
                onClick={() => setCategory("produk")}
                className={`py-2 px-3 border border-slate-200 font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "produk"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <ShoppingBasket size={14} />
                Jenis Ikan
              </button>
              {/* Ikan Hias — placeholder kategori dinamis (notulen Distankan KP 21 Sep 2026);
                  panel "menunggu data dinas" tampil hingga data diimpor. */}
              <button
                onClick={() => setCategory("hias")}
                className={`py-2 px-3 border border-slate-200 font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                  category === "hias"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <Palette size={14} />
                Ikan Hias
              </button>
            </div>
          </div>

          {/* Year Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-mono font-bold uppercase text-slate-500">
              Tahun Data
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                disabled={category === "hias"}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 font-mono text-sm font-bold bg-white focus:outline-none appearance-none cursor-pointer rounded-xl disabled:opacity-50"
              >
                {yearsList.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Kecamatan Selector */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-mono font-bold uppercase text-slate-500">
              Pilih Kecamatan
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
              <select
                value={selectedKecamatan}
                onChange={(e) => setSelectedKecamatan(e.target.value)}
                disabled={category === "hias"}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 font-mono text-sm font-bold bg-white focus:outline-none appearance-none cursor-pointer rounded-xl disabled:opacity-50"
              >
                {uniqueKecamatan.map((kec) => (
                  <option key={kec} value={kec}>
                    {kec}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner label="Memuat data perikanan..." />
        ) : category === "hias" ? (
          <EmptyStatePlaceholder
            icon={<Palette className="h-6 w-6" aria-hidden />}
            title="Kategori Ikan Hias — Menunggu Data Dinas"
            message="Daftar jenis ikan hias dikelola dinamis oleh Distankan KP dan akan tampil di sini setelah data produksi & populasi diimpor melalui dasbor admin — mencakup jenis, volume, dan sentra kecamatan (notulen Distankan KP 21 Sep 2026)."
          />
        ) : category === "produk" ? (
          <>
            {/* KPI: Volume & Nilai */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-sky-50 border border-slate-200 p-6 shadow-sm text-left flex flex-col justify-between transition-all duration-300 hover:shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-slate-500 uppercase">
                      Volume Ikan Air Tawar Lokal
                    </h5>
                    <h3 className="text-3xl font-serif font-black uppercase text-slate-800 mt-1">
                      {formatNum(produkEstimasi.volumeTawar)}
                    </h3>
                  </div>
                  <div className="p-2 border border-slate-200 bg-white">
                    <Fish size={20} />
                  </div>
                </div>
                <p className="text-xs font-mono text-slate-500 mt-4 uppercase">
                  kg ({selectedYear}) · budidaya {formatNum(produkEstimasi.volBudidaya)} + tangkap {formatNum(produkEstimasi.volTangkap)}
                  {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                </p>
              </div>

              <div className="bg-violet-50 border border-slate-200 p-6 shadow-sm text-left flex flex-col justify-between transition-all duration-300 hover:shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-slate-500 uppercase">
                      Nilai Estimasi per Jenis
                    </h5>
                    <h3 className="text-3xl font-serif font-black uppercase text-slate-800 mt-1">
                      {formatRp(produkEstimasi.nilaiEstimasi)}
                    </h3>
                  </div>
                  <div className="p-2 border border-slate-200 bg-white">
                    <Banknote size={20} />
                  </div>
                </div>
                <p className="text-xs font-mono text-slate-500 mt-4 uppercase">
                  harga referensi tertimbang Rp {formatNum(HARGA_TAWAR_TERTIMBANG)}/kg · estimasi (bukan angka BPS)
                </p>
              </div>

              <div className="bg-emerald-50 border border-slate-200 p-6 shadow-sm text-left flex flex-col justify-between transition-all duration-300 hover:shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-slate-500 uppercase">
                      Nilai Produksi Resmi BPS
                    </h5>
                    <h3 className="text-3xl font-serif font-black uppercase text-slate-800 mt-1">
                      {produkEstimasi.nilaiAktual > 0
                        ? formatRp(produkEstimasi.nilaiAktual)
                        : "—"}
                    </h3>
                  </div>
                  <div className="p-2 border border-slate-200 bg-white">
                    <ShieldCheck size={20} />
                  </div>
                </div>
                <p className="text-xs font-mono text-slate-500 mt-4 uppercase">
                  {produkEstimasi.hargaImplisitAktual
                    ? `harga implisit Rp ${formatNum(Math.round(produkEstimasi.hargaImplisitAktual))}/kg · budidaya + tangkap`
                    : "data nilai produksi belum tersedia untuk filter ini"}
                </p>
              </div>
            </div>

            {/* Katalog Jenis Ikan */}
            <div className="bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="mb-4 text-left border-b border-slate-200 pb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                  Katalog Jenis Ikan &amp; Harga Referensi
                </h4>
                <span className="font-mono text-[10px] uppercase text-slate-500">
                  {PRODUK_IKAN_SUMBER} · {PRODUK_IKAN_TANGGAL}
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Air Tawar — produksi lokal */}
                <div className="text-left">
                  <h5 className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-sky-700 mb-1">
                    <Fish size={14} /> Ikan Air Tawar — Produksi Lokal
                  </h5>
                  <p className="mb-3 text-[10px] font-mono uppercase leading-relaxed text-slate-500">
                    Minapadi (penyelang &amp; tumpangsari) — sentra: Singomerto ·
                    Bawang · Madukara
                  </p>
                  <div className="flex flex-col gap-3">
                    {PRODUK_IKAN_TAWAR.map((p) => (
                      <div
                        key={p.nama}
                        className="border border-slate-200 bg-white p-4 flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h6 className="text-sm font-mono font-bold uppercase text-slate-800">
                            {p.nama}
                          </h6>
                          <span className="px-2 py-0.5 border border-sky-200 bg-sky-50 font-mono font-bold text-[10px] uppercase text-sky-700 shrink-0">
                            Lokal
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {p.deskripsi}
                        </p>
                        {p.sentra && (
                          <p className="text-[10px] font-mono uppercase leading-relaxed text-sky-700">
                            Sentra: {p.sentra.join(" · ")}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                          <span className="font-mono font-bold text-xs text-slate-800">
                            Rp {formatNum(p.hargaMin)}–{formatNum(p.hargaMax)}/kg
                          </span>
                          {p.pangsa !== undefined && (
                            <span className="font-mono text-[10px] font-bold uppercase text-slate-500">
                              pangsa estimasi ±{p.pangsa}%
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono uppercase text-slate-400">
                          {p.catatan}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Laut — peredaran pasar */}
                <div className="text-left">
                  <h5 className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-blue-700 mb-3">
                    <Waves size={14} /> Ikan Laut — Peredaran Pasar Lokal
                  </h5>
                  <div className="flex flex-col gap-3">
                    {PRODUK_IKAN_LAUT.map((p) => (
                      <div
                        key={p.nama}
                        className="border border-slate-200 bg-white p-4 flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h6 className="text-sm font-mono font-bold uppercase text-slate-800">
                            {p.nama}
                          </h6>
                          <span className="px-2 py-0.5 border border-blue-200 bg-blue-50 font-mono font-bold text-[10px] uppercase text-blue-700 shrink-0">
                            Pasar
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {p.deskripsi}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                          <span className="font-mono font-bold text-xs text-slate-800">
                            Rp {formatNum(p.hargaMin)}–{formatNum(p.hargaMax)}/kg
                          </span>
                        </div>
                        <p className="text-[10px] font-mono uppercase text-slate-400">
                          {p.catatan}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 border border-dashed border-slate-300 bg-slate-50 p-3 text-[10px] font-mono uppercase leading-relaxed text-slate-500">
                    Banjarnegara bukan penghasil ikan laut — produk laut
                    didatangkan dari wilayah pesisir dan dikatalogkan
                    harga/ketersediaannya saja (tanpa volume produksi lokal).
                  </p>
                </div>
              </div>
            </div>

            {/* Estimasi Komposisi Produksi per Jenis */}
            <div className="bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="mb-4 text-left border-b border-slate-200 pb-2">
                <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                  Estimasi Produksi per Jenis Ikan Air Tawar ({selectedYear})
                  {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                </h4>
              </div>
              {produkEstimasi.volumeTawar === 0 ? (
                <div className="border border-dashed border-slate-300 bg-slate-50 p-6 text-center font-mono text-xs uppercase text-slate-500">
                  Tidak ada data produksi ikan air tawar untuk filter ini.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100">
                          <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs">
                            No
                          </th>
                          <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs">
                            Jenis Ikan
                          </th>
                          <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs text-right">
                            Pangsa
                          </th>
                          <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs text-right">
                            Volume Estimasi (kg)
                          </th>
                          <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs text-right">
                            Harga Referensi (Rp/kg)
                          </th>
                          <th className="p-3 font-bold uppercase text-xs text-right">
                            Nilai Estimasi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {produkEstimasi.rincian.map((r, idx) => {
                          const maxVol = Math.max(
                            ...produkEstimasi.rincian.map((x) => x.volume),
                          );
                          const pct =
                            maxVol > 0 ? (r.volume / maxVol) * 100 : 0;
                          return (
                            <tr
                              key={r.produk.nama}
                              className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                            >
                              <td className="p-3 border-r border-slate-200 text-xs font-bold">
                                {idx + 1}
                              </td>
                              <td className="p-3 border-r border-slate-200 font-bold uppercase">
                                <div className="flex flex-col gap-1">
                                  <span>{r.produk.nama}</span>
                                  <div className="h-1.5 w-28 bg-slate-200 border border-slate-200">
                                    <div
                                      className="h-full bg-slate-800"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  {r.produk.sentra && (
                                    <span className="text-[9px] font-mono uppercase text-slate-400">
                                      {r.produk.sentra.join(" · ")}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 border-r border-slate-200 text-right">
                                {r.produk.pangsa}%
                              </td>
                              <td className="p-3 border-r border-slate-200 text-right">
                                {formatNum(Math.round(r.volume))}
                              </td>
                              <td className="p-3 border-r border-slate-200 text-right">
                                {formatNum(r.harga)}
                              </td>
                              <td className="p-3 text-right font-bold bg-slate-50">
                                {formatRp(r.nilai)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                          <td
                            colSpan={2}
                            className="p-3 border-r border-slate-200 text-xs uppercase"
                          >
                            Jumlah (estimasi komposisi)
                          </td>
                          <td className="p-3 border-r border-slate-200 text-right">
                            100%
                          </td>
                          <td className="p-3 border-r border-slate-200 text-right">
                            {formatNum(produkEstimasi.volumeTawar)}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-right">
                            {formatNum(HARGA_TAWAR_TERTIMBANG)}
                          </td>
                          <td className="p-3 text-right bg-slate-200">
                            {formatRp(produkEstimasi.nilaiEstimasi)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Pembanding resmi BPS */}
                  <div className="mt-4 border border-slate-200 bg-slate-50 p-4 text-left">
                    <h5 className="text-xs font-mono font-bold uppercase text-slate-600 mb-2">
                      Pembanding Resmi BPS (budidaya + tangkap, {selectedYear})
                    </h5>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 leading-relaxed">
                      <li>
                        Nilai produksi resmi:{" "}
                        <b>
                          {produkEstimasi.nilaiAktual > 0
                            ? formatRp(produkEstimasi.nilaiAktual)
                            : "—"}
                        </b>{" "}
                        ({formatNum(produkEstimasi.volumeAktual)} kg
                        {produkEstimasi.hargaImplisitAktual
                          ? `, harga implisit Rp ${formatNum(Math.round(produkEstimasi.hargaImplisitAktual))}/kg`
                          : ""}
                        ).
                      </li>
                      <li>
                        Estimasi katalog jenis ikan (harga pasar konsumen):{" "}
                        <b>{formatRp(produkEstimasi.nilaiEstimasi)}</b> dengan
                        harga tertimbang Rp {formatNum(HARGA_TAWAR_TERTIMBANG)}/kg.
                      </li>
                      <li>
                        Estimasi umumnya lebih tinggi daripada nilai BPS karena
                        harga katalog adalah harga pasar konsumen, sedangkan
                        nilai BPS dihitung pada tingkat produsen
                        (pembudidaya/nelayan).
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Catatan Metodologi */}
            <div className="bg-amber-50 border border-amber-200 p-6 text-left">
              <h4 className="flex items-center gap-2 text-md font-mono font-bold uppercase tracking-wide text-amber-800">
                <AlertTriangle size={16} /> Catatan Metodologi
              </h4>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-amber-900 leading-relaxed">
                <li>
                  BPS tidak mempublikasikan produksi perikanan per jenis ikan
                  (hanya per tempat pemeliharaan budidaya dan per alat tangkap),
                  sehingga rincian per jenis di atas adalah{" "}
                  <b>estimasi komposisi</b> (pangsa indikatif) — bukan angka
                  resmi BPS. Daftar 5 grup produk &amp; sentra kecamatan
                  mengikuti daftar klien Distankan KP (gap-analysis-master
                  §3.2 — Nila &amp; Mujair digabung satu grup; Ikan Mas &amp;
                  Tawes tidak ditampilkan terpisah).
                </li>
                <li>
                  Harga referensi bersifat <b>indikatif</b> ({PRODUK_IKAN_SUMBER}{" "}
                  {PRODUK_IKAN_TANGGAL}) dan belum diverifikasi dari sumber
                  resmi — gunakan untuk gambaran relatif antar jenis, bukan
                  acuan transaksi.
                </li>
                <li>
                  Volume ikan air tawar dihitung dari tabel produksi resmi BPS
                  (budidaya: kolam + karamba + minapadi penyelang &amp;
                  tumpangsari; tangkap: semua alat) untuk tahun &amp; kecamatan
                  terpilih.
                </li>
                <li>
                  Pangsa &amp; harga dapat disesuaikan di{" "}
                  <code className="font-mono">src/data/produk-ikan.ts</code>.
                </li>
              </ul>
            </div>
          </>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stat 1: Total Produksi */}
              <div className="bg-sky-50 border border-slate-200 p-6 shadow-sm text-left flex flex-col justify-between transition-all duration-300 hover:shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-slate-500 uppercase">
                      Total Produksi
                    </h5>
                    <h3 className="text-3xl font-serif font-black uppercase text-slate-800 mt-1">
                      {formatNum(stats.total)}
                    </h3>
                  </div>
                  <div className="p-2 border border-slate-200 bg-white">
                    {category === "budidaya" ? (
                      <Fish size={20} />
                    ) : category === "tangkap" ? (
                      <Waves size={20} />
                    ) : (
                      <Egg size={20} />
                    )}
                  </div>
                </div>
                <p className="text-xs font-mono text-slate-500 mt-4 uppercase">
                  Total {unit} terdata di Banjarnegara ({selectedYear})
                </p>
              </div>

              {/* Stat 2: Top Kecamatan */}
              <div className="bg-emerald-50 border border-slate-200 p-6 shadow-sm text-left flex flex-col justify-between transition-all duration-300 hover:shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-xs font-mono font-bold text-slate-500 uppercase">
                      Kecamatan Terproduktif
                    </h5>
                    <h3 className="text-2xl font-serif font-black uppercase text-slate-800 mt-1 break-words leading-tight">
                      {stats.topDistrict}
                    </h3>
                  </div>
                  <div className="p-2 border border-slate-200 bg-white">
                    <MapPin size={20} />
                  </div>
                </div>
                <p className="text-xs font-mono text-slate-500 mt-4 uppercase">
                  Produksi: {formatNum(stats.topVal)} {unit}
                </p>
              </div>

              {/* Stat 3: Komposisi Jenis */}
              <div className="bg-violet-50 border border-slate-200 p-6 shadow-sm text-left transition-all duration-300 hover:shadow-md">
                <h5 className="text-xs font-mono font-bold text-slate-500 uppercase mb-3">
                  Komposisi Produksi
                </h5>
                <div className="flex flex-col gap-2">
                  {stats.breakdown.map((item, idx) => {
                    const pct =
                      stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                    return (
                      <div key={idx} className="flex flex-col gap-1">
                        <div className="flex justify-between text-[11px] font-mono font-bold uppercase">
                          <span>{item.name}</span>
                          <span>{formatNum(item.value)}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 border border-slate-200">
                          <div
                            className="h-full bg-slate-800"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tren Deret Waktu */}
            <div className="bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="mb-4 text-left border-b border-slate-200 pb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                  Tren Produksi {trendData.length > 0 ? `${trendData[0].tahun}–${trendData[trendData.length - 1].tahun}` : ""} — {unit}
                  {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                </h4>
                {trendGrowth && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 border border-slate-200 font-mono font-bold text-[10px] uppercase ${
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
                  <LineChart
                    data={trendWithProjection}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#64748b"
                      strokeOpacity={0.1}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="tahun"
                      tick={{
                        fill: "#475569",
                        fontSize: 11,
                        fontFamily: "monospace",
                        fontWeight: "bold",
                      }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                    />
                    <YAxis
                      tick={{
                        fill: "#475569",
                        fontSize: 10,
                        fontFamily: "monospace",
                        fontWeight: "bold",
                      }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                      tickFormatter={(v) => formatNum(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        fontFamily: "monospace",
                        fontSize: "12px",
                        fontWeight: "bold",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: any, name: any) => [
                        formatNum(Number(value)),
                        String(name ?? ""),
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{
                        fontFamily: "monospace",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name={`Total (${unit})`}
                      stroke="#64748b"
                      strokeWidth={3}
                      dot={{ fill: "#475569", r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="proyeksi"
                      name={`Proyeksi (${unit})`}
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={{ fill: "#ef4444", r: 4 }}
                      connectNulls={true}
                    />
                    {seriesKeys.map((s, idx) => {
                      const colors = [
                        "#0ea5e9",
                        "#3b82f6",
                        "#8b5cf6",
                        "#10b981",
                        "#ef4444",
                        "#f472b6",
                      ];
                      return (
                        <Line
                          key={s.key}
                          type="monotone"
                          dataKey={s.label}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Proyeksi Tahun Depan (Regresi Linear) */}
            {projection && (
              <div className="bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="mb-4 text-left border-b border-slate-200 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                    <TrendingUp className="text-red-600" size={18} />
                    Proyeksi {projection.nextYear} — Regresi Linear
                    {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                  </h4>
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase mt-1">
                    Perkiraan berdasarkan tren garis lurus (least-squares) atas total produksi
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Perkiraan produksi */}
                  <div className="border border-slate-200 bg-red-50 p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
                      Perkiraan {projection.nextYear} ({unit})
                    </span>
                    <span className="text-2xl font-serif font-black text-slate-800 mt-2">
                      {formatNum(projection.predicted)}
                    </span>
                  </div>
                  {/* Perubahan vs tahun terakhir */}
                  <div className="border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
                      Perubahan vs {projection.lastTahun}
                    </span>
                    <span
                      className={`text-2xl font-serif font-black mt-2 ${
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
                  {/* Keandalan (R^2) */}
                  <div className="border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
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
                <p className="text-[10px] font-mono text-slate-500 uppercase mt-3">
                  {projection.r2 >= 0.7
                    ? "Tren cukup konsisten — proyeksi relatif dapat diandalkan."
                    : projection.r2 >= 0.4
                      ? "Tren agak fluktuatif — proyeksi perlu kehati-hatian."
                      : "Data sangat fluktuatif — proyeksi kurang dapat diandalkan."}
                </p>
              </div>
            )}

            {/* Deteksi Anomali */}
            <div className="bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="mb-4 text-left border-b border-slate-200 pb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-md font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
                  <AlertTriangle className="text-red-600" size={18} />
                  Deteksi Anomali Produksi
                </h4>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  Ambang penurunan tajam: {ANOMALY_THRESHOLD}% YoY
                </span>
              </div>
              {anomalies.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-slate-200 text-[11px] font-mono font-bold text-emerald-800 uppercase">
                  <ShieldCheck size={14} />
                  Tidak ada penurunan tajam terdeteksi pada periode ini
                  {selectedKecamatan !== "Semua" ? ` (${selectedKecamatan})` : ""}.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {anomalies.map((a) => (
                    <div
                      key={a.tahun}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 bg-red-50 border border-slate-200 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-2 py-0.5 bg-red-600 text-white border border-slate-200 font-mono font-black text-sm">
                          {a.tahun}
                        </span>
                        <div className="text-left">
                          <p className="text-[11px] font-mono font-bold uppercase text-red-800">
                            Turun {formatPct(Math.abs(a.pct))}% dari {a.prevTahun}
                          </p>
                          <p className="text-[10px] font-mono text-slate-600 uppercase">
                            Penyumbang utama: {a.penyumbang} · {formatNum(Math.abs(a.selisih))} {unit}
                          </p>
                        </div>
                      </div>
                      <span className="text-xl font-serif font-black text-red-600">
                        ▼ {formatPct(Math.abs(a.pct))}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CAGR per Komoditas */}
            {cagrData && (
              <div className="bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="mb-4 text-left border-b border-slate-200 pb-2">
                  <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                    Laju Pertumbuhan Tahunan (CAGR) {cagrData.periode}
                    {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : ""}
                  </h4>
                  <p className="text-[10px] font-mono font-bold text-slate-500 uppercase mt-1">
                    Rata-rata pertumbuhan majemuk per tahun selama {cagrData.years} tahun
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Kartu Total */}
                  <div className="border border-slate-200 bg-slate-800 text-white p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
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
                      className="border border-slate-200 bg-white p-4 flex flex-col justify-between shadow-sm"
                    >
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-500 leading-tight">
                        {item.name}
                      </span>
                      <span
                        className={`text-2xl font-serif font-black mt-2 ${
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
              </div>
            )}

            {/* Chart */}
            <div className="bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="mb-4 text-left border-b border-slate-200 pb-2">
                <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                  Produksi per Kecamatan ({selectedYear}) — dalam {unit}
                </h4>
              </div>
              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 90 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#64748b"
                      strokeOpacity={0.1}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: "#475569",
                        fontSize: 10,
                        fontFamily: "monospace",
                        fontWeight: "bold",
                      }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
                      width={70}
                      tick={{
                        fill: "#475569",
                        fontSize: 10,
                        fontFamily: "monospace",
                        fontWeight: "bold",
                      }}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                      tickFormatter={(v) => formatNum(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        fontFamily: "monospace",
                        fontSize: "12px",
                        fontWeight: "bold",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: any, name: any) => [
                        formatNum(Number(value)),
                        String(name ?? ""),
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{
                        fontFamily: "monospace",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    />
                    {stats.breakdown.map((item, idx) => {
                      const colors = [
                        "#0ea5e9",
                        "#3b82f6",
                        "#8b5cf6",
                        "#10b981",
                        "#ef4444",
                        "#f472b6",
                      ];
                      return (
                        <Bar
                          key={idx}
                          dataKey={item.name}
                          fill={colors[idx % colors.length]}
                          stroke="#64748b"
                          strokeWidth={1}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="mb-4 text-left border-b border-slate-200 pb-2">
                <h4 className="text-md font-mono font-bold uppercase tracking-wide">
                  Tabel Rincian Produksi ({selectedYear}) — {unit}
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100">
                      <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs">
                        No
                      </th>
                      <th className="p-3 border-r border-slate-200 font-bold uppercase text-xs">
                        Kecamatan
                      </th>
                      {stats.breakdown.map((b, idx) => (
                        <th
                          key={idx}
                          className="p-3 border-r border-slate-200 font-bold uppercase text-xs text-right"
                        >
                          {b.name}
                        </th>
                      ))}
                      <th className="p-3 font-bold uppercase text-xs text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row: any, idx: number) => (
                      <tr
                        key={`${row.name}-${idx}`}
                        className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-3 border-r border-slate-200 text-xs font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-3 border-r border-slate-200 font-bold uppercase">
                          {row.name}
                        </td>
                        {stats.breakdown.map((b, i) => (
                          <td
                            key={i}
                            className="p-3 border-r border-slate-200 text-right"
                          >
                            {formatNum(row[b.name])}
                          </td>
                        ))}
                        <td className="p-3 font-bold text-right bg-slate-50">
                          {formatNum(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                      <td
                        colSpan={2}
                        className="p-3 border-r border-slate-200 text-xs uppercase"
                      >
                        {selectedKecamatan === "Semua"
                          ? "Jumlah (20 kecamatan)"
                          : `Jumlah (${selectedKecamatan})`}
                      </td>
                      {stats.breakdown.map((b, i) => (
                        <td
                          key={i}
                          className="p-3 border-r border-slate-200 text-right"
                        >
                          {formatNum(
                            chartData.reduce(
                              (a: number, r: any) => a + (r[b.name] || 0),
                              0,
                            ),
                          )}
                        </td>
                      ))}
                      <td className="p-3 text-right bg-slate-200">
                        {formatNum(
                          chartData.reduce((a: number, r: any) => a + (r.total || 0), 0),
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </DefaultLayout>
  );
}
