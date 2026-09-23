import { useEffect, useState, useMemo } from "react";
import DefaultLayout from "@/layouts/default";
import { LoadingSpinner } from "@/components/ui";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchPemasukanTernak, fetchPengeluaranTernak, fetchLuarRPH, fetchDagingUnggas, fetchRphPemerintah, fetchTernakDaging, TernakFlow } from "@/services/api";
import { Calendar, MapPin, FileSpreadsheet, ArrowDownToLine, ArrowUpFromLine, Slice, Drumstick, Beef, Building2 } from "lucide-react";

type Category = "pemasukan" | "pengeluaran" | "rph-pemerintah" | "luar-rph" | "daging-ternak" | "daging-unggas";

const CATEGORY_META: Record<Category, { label: string; sub: string; unit: string; icon: any; note: string }> = {
  "pemasukan": {
    label: "Pemasukan Ternak",
    sub: "Ternak yang masuk ke Kabupaten Banjarnegara",
    unit: "ekor",
    icon: ArrowDownToLine,
    note: "Bersifat catatan transaksi: hanya kecamatan dengan aktivitas pemasukan tercatat yang memiliki nilai (mayoritas di Kecamatan Madukara). Tanda \"–\" berarti tidak ada catatan pada sumber data, bukan nol.",
  },
  "pengeluaran": {
    label: "Pengeluaran Ternak Potong",
    sub: "Ternak potong yang keluar dari Kabupaten",
    unit: "ekor",
    icon: ArrowUpFromLine,
    note: "Bersifat catatan transaksi: hanya kecamatan dengan aktivitas pengeluaran tercatat yang memiliki nilai (mayoritas di Kecamatan Madukara). Tanda \"–\" berarti tidak ada catatan pada sumber data, bukan nol.",
  },
  "rph-pemerintah": {
    label: "Pemotongan RPH Pemerintah (Resmi)",
    sub: "Ternak yang dipotong resmi di RPH Pemerintah",
    unit: "ekor",
    icon: Building2,
    note: "Pemotongan ternak yang tercatat resmi di Rumah Potong Hewan (RPH) Pemerintah — melengkapi kategori \"Luar RPH\" yang bersifat perkiraan. Jenis mencakup Kuda (6 jenis: Sapi, Kerbau, Kuda, Babi, Kambing, Domba). Sumber: Distankan KP Banjarnegara (BPS) — notulen klien 21 Sep 2026 (Submenu 4 Peternakan: RPH resmi).",
  },
  "daging-ternak": {
    label: "Produksi Daging Ternak",
    sub: "Daging ternak besar & kecil per kecamatan",
    unit: "kg",
    icon: Beef,
    note: "Produksi daging sapi, kerbau, kambing, domba, dan babi per kecamatan (kg). Untuk daging unggas, lihat kategori \"Daging Unggas\". Sumber: Distankan KP Banjarnegara (BPS).",
  },
  "luar-rph": {
    label: "Pemotongan di Luar RPH",
    sub: "Perkiraan ternak yang dipotong di luar RPH",
    unit: "ekor",
    icon: Slice,
    note: "Perkiraan tahunan pemotongan di luar Rumah Potong Hewan. Tahun 2019 dan 2022 tidak tersedia pada sumber data (tidak direkap), sehingga tidak ditampilkan pada tren.",
  },
  "daging-unggas": {
    label: "Produksi Daging Unggas",
    sub: "Produksi daging unggas per kecamatan",
    unit: "kg",
    icon: Drumstick,
    note: "Tanda \"–\" pada sel tertentu berarti jenis unggas tersebut tidak dibudidayakan / tidak tercatat di kecamatan yang bersangkutan.",
  },
};

const CATEGORY_TAB: Record<Category, string> = {
  "pemasukan": "Pemasukan",
  "pengeluaran": "Pengeluaran",
  "rph-pemerintah": "RPH Resmi",
  "luar-rph": "Luar RPH",
  "daging-ternak": "Daging Ternak",
  "daging-unggas": "Daging Unggas",
};

// Palet warna formal: biru pemerintahan + warna pelengkap yang tenang
const COLORS = ["#1d4ed8", "#0d9488", "#b45309", "#be185d", "#6d28d9", "#4d7c0f"];

export default function LivestockFlowPage() {
  const [pemasukan, setPemasukan] = useState<TernakFlow[]>([]);
  const [pengeluaran, setPengeluaran] = useState<TernakFlow[]>([]);
  const [luarRph, setLuarRph] = useState<TernakFlow[]>([]);
  const [dagingUnggas, setDagingUnggas] = useState<TernakFlow[]>([]);
  const [rphPemerintah, setRphPemerintah] = useState<TernakFlow[]>([]);
  const [dagingTernak, setDagingTernak] = useState<TernakFlow[]>([]);

  const [category, setCategory] = useState<Category>("pemasukan");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>("Semua");
  const [hideEmpty, setHideEmpty] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pm, pg, rp, lr, dt, du] = await Promise.all([
          fetchPemasukanTernak(),
          fetchPengeluaranTernak(),
          fetchRphPemerintah(),
          fetchLuarRPH(),
          fetchTernakDaging(),
          fetchDagingUnggas(),
        ]);
        setPemasukan(pm);
        setPengeluaran(pg);
        setRphPemerintah(rp);
        setLuarRph(lr);
        setDagingTernak(dt);
        setDagingUnggas(du);
      } catch (err) {
        console.error("Gagal memuat data lalu lintas ternak:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeData = useMemo(() => {
    if (category === "pemasukan") return pemasukan;
    if (category === "pengeluaran") return pengeluaran;
    if (category === "rph-pemerintah") return rphPemerintah;
    if (category === "luar-rph") return luarRph;
    if (category === "daging-ternak") return dagingTernak;
    return dagingUnggas;
  }, [category, pemasukan, pengeluaran, rphPemerintah, luarRph, dagingTernak, dagingUnggas]);

  const jenisList = useMemo(() => {
    const names = new Set<string>();
    activeData.forEach((d) => d.items.forEach((it) => names.add(it.jenis)));
    return Array.from(names);
  }, [activeData]);

  const unit = CATEGORY_META[category].unit;

  const yearsList = useMemo(() => {
    return Array.from(new Set(activeData.map((d) => d.tahun).filter(Boolean)))
      .sort((a, b) => b.localeCompare(a));
  }, [activeData]);

  // Tahun yang benar-benar memiliki data tercatat (total seluruh kecamatan > 0).
  // Tahun tanpa rekap (mis. 2019 & 2022 pada Luar RPH) tidak ditampilkan di tren
  // agar tidak menghasilkan lekukan nol yang menyesatkan.
  const yearsWithData = useMemo(() => {
    const byYear = new Map<string, number>();
    activeData.forEach((d) => {
      const yr = d.tahun;
      if (!yr) return;
      let sum = 0;
      d.items.forEach((it) => (sum += it.jumlah || 0));
      byYear.set(yr, (byYear.get(yr) || 0) + sum);
    });
    return new Set(
      Array.from(byYear.entries())
        .filter(([, v]) => v > 0)
        .map(([k]) => k)
    );
  }, [activeData]);

  useEffect(() => {
    if (yearsList.length > 0 && !yearsList.includes(selectedYear)) {
      setSelectedYear(yearsList[0]);
    }
  }, [yearsList, selectedYear]);

  const uniqueKecamatan = useMemo(() => {
    return ["Semua", ...Array.from(new Set(activeData.map((d) => d.kecamatan))).sort()];
  }, [activeData]);

  const currentYearData = useMemo(() => {
    return activeData.filter((d) => d.tahun === selectedYear);
  }, [activeData, selectedYear]);

  const filteredData = useMemo(() => {
    return selectedKecamatan === "Semua"
      ? currentYearData
      : currentYearData.filter((d) => d.kecamatan === selectedKecamatan);
  }, [currentYearData, selectedKecamatan]);

  const stats = useMemo(() => {
    let total = 0;
    let maxVal = 0;
    let topDistrict = "-";
    const breakdown = jenisList.map((j) => ({ name: j, value: 0 }));

    filteredData.forEach((d) => {
      let rowSum = 0;
      jenisList.forEach((j, idx) => {
        const it = d.items.find((i) => i.jenis === j);
        const v = it?.jumlah || 0;
        breakdown[idx].value += v;
        rowSum += v;
        total += v;
      });
      if (rowSum > maxVal) {
        maxVal = rowSum;
        topDistrict = d.kecamatan;
      }
    });

    return { total, topDistrict, topVal: maxVal, breakdown };
  }, [filteredData, jenisList]);

  const chartData = useMemo(() => {
    return filteredData
      .map((d) => {
        const obj: any = { name: d.kecamatan };
        let sum = 0;
        jenisList.forEach((j) => {
          const it = d.items.find((i) => i.jenis === j);
          const v = it?.jumlah || 0;
          obj[j] = v;
          sum += v;
        });
        obj.total = sum;
        return obj;
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredData, jenisList]);

  // Baris yang ditampilkan pada grafik & tabel rincian:
  // secara default hanya kecamatan dengan data tercatat
  const displayData = useMemo(() => {
    return hideEmpty ? chartData.filter((r) => r.total > 0) : chartData;
  }, [chartData, hideEmpty]);

  // Kecamatan aktif dengan data (untuk keterangan "dari N kecamatan")
  const districtsReported = useMemo(() => {
    return chartData.filter((r) => r.total > 0).length;
  }, [chartData]);

  const trendData = useMemo(() => {
    const base = selectedKecamatan === "Semua"
      ? activeData
      : activeData.filter((d) => d.kecamatan === selectedKecamatan);

    const byYear = new Map<string, any>();
    base.forEach((d) => {
      const yr = d.tahun;
      if (!yr) return;
      if (!byYear.has(yr)) {
        const obj: any = { tahun: yr, total: 0 };
        jenisList.forEach((j) => (obj[j] = 0));
        byYear.set(yr, obj);
      }
      const entry = byYear.get(yr);
      jenisList.forEach((j) => {
        const it = d.items.find((i) => i.jenis === j);
        const v = it?.jumlah || 0;
        entry[j] += v;
        entry.total += v;
      });
    });

    return Array.from(byYear.values())
      // buang tahun tanpa rekap data (seluruh kecamatan "-")
      .filter((d) => yearsWithData.has(d.tahun))
      .sort((a, b) => a.tahun.localeCompare(b.tahun));
  }, [activeData, selectedKecamatan, jenisList, yearsWithData]);

  // CAGR Laju Pertumbuhan Tahunan per jenis ternak
  const cagrData = useMemo(() => {
    if (trendData.length < 2) return null;
    const last = trendData[trendData.length - 1];
    const lastYear = parseInt(last.tahun);

    const firstWithData = trendData.find((d) => (d.total || 0) > 0);
    if (!firstWithData) return null;
    const totalYears = lastYear - parseInt(firstWithData.tahun);
    if (!totalYears || totalYears <= 0) return null;

    const calc = (awal: number, akhir: number, years: number): number | null => {
      if (!awal || awal <= 0 || akhir < 0 || years <= 0) return null;
      return (Math.pow(akhir / awal, 1 / years) - 1) * 100;
    };

    const items = jenisList.map((j) => {
      const firstNonZero = trendData.find((d) => (d[j] || 0) > 0);
      if (!firstNonZero) return { name: j, cagr: null as number | null };
      const yrs = lastYear - parseInt(firstNonZero.tahun);
      return { name: j, cagr: calc(firstNonZero[j] || 0, last[j] || 0, yrs) };
    });

    return {
      periode: `${firstWithData.tahun}–${last.tahun}`,
      years: totalYears,
      total: calc(firstWithData.total || 0, last.total || 0, totalYears),
      items,
    };
  }, [trendData, jenisList]);

  // Regresi Linier Proyeksi
  const projection = useMemo(() => {
    if (trendData.length < 3) return null;

    const pts = trendData.map((d) => ({ x: parseInt(d.tahun), y: d.total }));
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

  const trendWithProjection = useMemo(() => {
    const base = trendData.map((d) => ({ ...d, proyeksi: undefined as number | undefined }));
    if (projection && base.length > 0) {
      base[base.length - 1].proyeksi = base[base.length - 1].total;
      base.push({
        tahun: projection.nextYear,
        total: undefined as any,
        proyeksi: projection.predicted,
      } as any);
    }
    return base;
  }, [trendData, projection]);

  // Ranking kecamatan kumulatif seluruh tahun
  const kecamatanRanking = useMemo(() => {
    const base = selectedKecamatan === "Semua"
      ? activeData
      : activeData.filter((d) => d.kecamatan === selectedKecamatan);

    const map = new Map<string, number>();
    base.forEach((d) => {
      let sum = 0;
      jenisList.forEach((j) => {
        const it = d.items.find((i) => i.jenis === j);
        sum += it?.jumlah || 0;
      });
      map.set(d.kecamatan, (map.get(d.kecamatan) || 0) + sum);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      // hanya kecamatan yang memiliki catatan data
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [activeData, selectedKecamatan, jenisList]);

  const formatNum = (num: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(num);

  // Sel tanpa catatan pada sumber ("-") ditampilkan sebagai en-dash, bukan nol
  const formatCell = (v: number) => (v > 0 ? formatNum(v) : "–");

  const formatPct = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(val);

  const ActiveIcon = CATEGORY_META[category].icon;

  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        {/* ===== Kepala Halaman ===== */}
        <header className="border-b border-slate-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-800">
            Bidang Peternakan
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1.5">
            Lalu Lintas Ternak & Produksi Daging
          </h1>
          <p className="text-sm text-slate-700 mt-1 max-w-3xl">
            Data pemasukan ternak, pengeluaran ternak potong, pemotongan resmi di
            Rumah Potong Hewan (RPH) Pemerintah, perkiraan pemotongan di luar RPH,
            serta produksi daging ternak dan daging unggas per kecamatan
            Kabupaten Banjarnegara.
          </p>
        </header>

        {/* ===== Panel Filter ===== */}
        <section className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Jenis data */}
            <div className="xl:col-span-2">
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Jenis Data
              </label>
              <div className="flex rounded-md border border-slate-300 overflow-hidden bg-white">
                {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`flex-1 py-2 px-2 text-xs font-medium transition-colors ${
                      category === c
                        ? "bg-blue-800 text-white"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {CATEGORY_TAB[c]}
                  </button>
                ))}
              </div>
            </div>

            {/* Tahun */}
            <div>
              <label htmlFor="ls-year" className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Tahun
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
                <select
                  id="ls-year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 appearance-none cursor-pointer"
                >
                  {yearsList.map((yr) => (
                    <option key={yr} value={yr}>
                      {yearsWithData.has(yr) ? yr : `${yr} — tanpa data`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Kecamatan */}
            <div>
              <label htmlFor="ls-kec" className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Kecamatan
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
                <select
                  id="ls-kec"
                  value={selectedKecamatan}
                  onChange={(e) => setSelectedKecamatan(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 appearance-none cursor-pointer"
                >
                  {uniqueKecamatan.map((kec) => (
                    <option key={kec} value={kec}>{kec}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-3 border-t border-slate-100 pt-3">
            Menampilkan: <span className="text-slate-800 font-medium">{CATEGORY_META[category].label}</span>
            {" · "}<span className="text-slate-800 font-medium">Satuan {unit}</span>
            {" · "}<span className="text-slate-800 font-medium">{selectedYear || "—"}</span>
            {" · "}<span className="text-slate-800 font-medium">{selectedKecamatan}</span>
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideEmpty}
                onChange={(e) => setHideEmpty(e.target.checked)}
                className="h-3.5 w-3.5 rounded-sm border-slate-300 text-blue-800 focus:ring-blue-700/20 cursor-pointer"
              />
              Tampilkan hanya kecamatan dengan data tercatat
            </label>
            {!loading && selectedYear && yearsList.length > 0 && (
              <span className="text-xs text-slate-600">
                Kecamatan melapor: <span className="font-semibold text-slate-900 tabular-nums">{districtsReported}</span> dari {chartData.length}
              </span>
            )}
          </div>
        </section>

        {/* Catatan ketersediaan data per jenis */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs leading-relaxed text-slate-700">
          <span className="font-semibold text-blue-800">Catatan data: </span>
          {CATEGORY_META[category].note}
        </div>

        {/* Peringatan tahun tanpa rekap */}
        {!loading && selectedYear && !yearsWithData.has(selectedYear) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            Tidak ada nilai tercatat pada tahun <span className="font-semibold">{selectedYear}</span> untuk jenis data ini —
            seluruh entri pada sumber bertanda "-" (tidak direkap). Pilih tahun lain, atau lihat tren yang hanya
            mencakup tahun dengan data.
          </div>
        )}

        {loading ? (
          <LoadingSpinner label="Memuat data ternak…" />
        ) : (
          <>
            {/* ===== Kartu Ringkasan ===== */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 border-l-4 border-l-blue-800 rounded-lg p-5">
                <div className="flex items-center gap-2.5 text-blue-800">
                  <ActiveIcon size={16} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Total {CATEGORY_META[category].label}
                  </p>
                </div>
                <p className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">
                  {formatNum(stats.total)}
                </p>
                <p className="text-xs text-slate-700 mt-1.5">
                  {unit} · {selectedYear}
                  {selectedKecamatan !== "Semua" ? ` · ${selectedKecamatan}` : " · Seluruh kecamatan"}
                </p>
              </div>

              <div className="bg-white border border-slate-200 border-l-4 border-l-teal-700 rounded-lg p-5">
                <div className="flex items-center gap-2.5 text-teal-700">
                  <MapPin size={16} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Kecamatan Tertinggi
                  </p>
                </div>
                <p className="text-2xl font-semibold text-slate-900 mt-2">
                  {stats.topVal > 0 ? stats.topDistrict : "—"}
                </p>
                <p className="text-xs text-slate-700 mt-1.5 tabular-nums">
                  {stats.topVal > 0 ? `${formatNum(stats.topVal)} ${unit}` : "tidak ada data tercatat"}
                  {" · "}{selectedYear}
                </p>
              </div>

              <div className="bg-white border border-slate-200 border-l-4 border-l-amber-600 rounded-lg p-5">
                <div className="flex items-center gap-2.5 text-amber-600">
                  <FileSpreadsheet size={16} />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Komposisi Jenis Ternak
                  </p>
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {stats.breakdown.map((item, idx) => {
                    const pct = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                    return (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <span className="w-24 shrink-0 text-slate-800 truncate">{item.name}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-sm overflow-hidden">
                          <div
                            className="h-full"
                            style={{ width: `${pct}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                        </div>
                        <span className="w-12 text-right font-medium text-slate-900 tabular-nums">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ===== Grafik Sebaran ===== */}
            <section className="bg-white border border-slate-200 rounded-lg">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Sebaran {CATEGORY_META[category].label} per Kecamatan
                </h2>
                <p className="text-xs text-slate-700 mt-0.5">
                  Satuan {unit} · Tahun {selectedYear}
                </p>
              </div>
              <div className="p-5">
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#1e293b", fontSize: 11 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis
                        width={70}
                        tick={{ fill: "#1e293b", fontSize: 11 }}
                        tickFormatter={(v) => formatNum(v)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          fontSize: 12,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        }}
                        formatter={(value: any, name: any) => [formatNum(Number(value)), String(name ?? "")]}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                      {jenisList.map((j, idx) => (
                        <Bar key={j} dataKey={j} stackId="a" fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* ===== Tren & Proyeksi ===== */}
            <section className="bg-white border border-slate-200 rounded-lg">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Tren {CATEGORY_META[category].label}
                  </h2>
                  <p className="text-xs text-slate-700 mt-0.5">
                    {selectedKecamatan !== "Semua" ? `Kecamatan ${selectedKecamatan}` : "Seluruh Kabupaten Banjarnegara"}
                    {" · "}
                    {trendData.length > 1 && `${trendData[0].tahun}–${trendData[trendData.length - 1].tahun}`}
                    {yearsList.some((y) => !yearsWithData.has(y)) && " · tahun tanpa rekap tidak diikutkan"}
                  </p>
                </div>
                {cagrData && (
                  <div className="text-right">
                    <p className="text-xs text-slate-700 uppercase tracking-wide">CAGR {cagrData.periode}</p>
                    <p className={`text-lg font-semibold tabular-nums ${
                      cagrData.total === null ? "text-slate-600" : cagrData.total >= 0 ? "text-green-700" : "text-red-700"
                    }`}>
                      {cagrData.total === null
                        ? "N/A"
                        : `${cagrData.total >= 0 ? "▲" : "▼"} ${formatPct(Math.abs(cagrData.total))}% / tahun`}
                    </p>
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendWithProjection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="tahun" tick={{ fill: "#1e293b", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#1e293b", fontSize: 11 }} tickFormatter={(v) => formatNum(v)} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          fontSize: 12,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        }}
                        formatter={(value: any, name: any) => [formatNum(Number(value)), String(name ?? "")]}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name={`Total (${unit})`}
                        stroke="#1e3a8a"
                        strokeWidth={2.5}
                        dot={{ fill: "#1e3a8a", r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="proyeksi"
                        name="Proyeksi (tren)"
                        stroke="#dc2626"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={{ fill: "#dc2626", r: 3, strokeDasharray: "0" }}
                        connectNulls={true}
                      />
                      {jenisList.map((j, idx) => (
                        <Line
                          key={j}
                          type="monotone"
                          dataKey={j}
                          stroke={COLORS[idx % COLORS.length]}
                          strokeWidth={1.5}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {projection && (
                  <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border border-slate-200 rounded-md overflow-hidden bg-white">
                    <div className="p-4">
                      <dt className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                        Prediksi {projection.nextYear} ({unit})
                      </dt>
                      <dd className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">
                        {formatNum(projection.predicted)}
                      </dd>
                    </div>
                    <div className="p-4">
                      <dt className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                        Perubahan vs {projection.lastTahun}
                      </dt>
                      <dd className={`text-xl font-semibold mt-1 tabular-nums ${
                        projection.deltaPct === null
                          ? "text-slate-600"
                          : projection.deltaPct >= 0
                          ? "text-green-700"
                          : "text-red-700"
                      }`}>
                        {projection.deltaPct === null
                          ? "N/A"
                          : `${projection.deltaPct >= 0 ? "▲" : "▼"} ${formatPct(Math.abs(projection.deltaPct))}%`}
                      </dd>
                    </div>
                    <div className="p-4">
                      <dt className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                        Keandalan Model (R²)
                      </dt>
                      <dd className={`text-xl font-semibold mt-1 tabular-nums ${
                        projection.r2 >= 0.7 ? "text-green-700" : projection.r2 >= 0.4 ? "text-amber-600" : "text-red-700"
                      }`}>
                        {formatPct(projection.r2 * 100)}%
                      </dd>
                    </div>
                  </dl>
                )}
                {projection && (
                  <p className="text-xs text-slate-600 mt-2">
                    * Proyeksi menggunakan model regresi linier (kuadrat terkecil) atas tren historis;
                    garis putus-putus merah pada grafik menunjukkan estimasi {projection.nextYear}.
                  </p>
                )}
              </div>
            </section>

            {/* ===== CAGR per Jenis ===== */}
            {cagrData && (
              <section className="bg-white border border-slate-200 rounded-lg">
                <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                  <h2 className="text-base font-semibold text-slate-900">
                    Laju Pertumbuhan Tahunan (CAGR) per Jenis Ternak
                  </h2>
                  <p className="text-xs text-slate-700 mt-0.5">
                    Periode {cagrData.periode} · {cagrData.years} tahun
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-800">
                        <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                          Jenis Ternak
                        </th>
                        <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                          CAGR / Tahun
                        </th>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                          Arah Tren
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-blue-50/40 font-semibold">
                        <td className="px-5 py-2.5 text-slate-900">Total Gabungan</td>
                        <td className={`px-5 py-2.5 text-right tabular-nums ${
                          cagrData.total === null ? "text-slate-600" : cagrData.total >= 0 ? "text-green-700" : "text-red-700"
                        }`}>
                          {cagrData.total === null
                            ? "N/A"
                            : `${cagrData.total >= 0 ? "+" : "−"}${formatPct(Math.abs(cagrData.total))}%`}
                        </td>
                        <td className="px-5 py-2.5 text-slate-800">
                          {cagrData.total === null ? "—" : cagrData.total >= 0 ? "Meningkat" : "Menurun"}
                        </td>
                      </tr>
                      {cagrData.items.map((item) => (
                        <tr key={item.name} className="hover:bg-slate-50">
                          <td className="px-5 py-2.5 text-slate-900">{item.name}</td>
                          <td className={`px-5 py-2.5 text-right tabular-nums ${
                            item.cagr === null ? "text-slate-600" : item.cagr >= 0 ? "text-green-700" : "text-red-700"
                          }`}>
                            {item.cagr === null
                              ? "N/A"
                              : `${item.cagr >= 0 ? "+" : "−"}${formatPct(Math.abs(item.cagr))}%`}
                          </td>
                          <td className="px-5 py-2.5 text-slate-800">
                            {item.cagr === null ? "—" : item.cagr >= 0 ? "Meningkat" : "Menurun"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ===== Peringkat Kecamatan ===== */}
            <section className="bg-white border border-slate-200 rounded-lg">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Peringkat Kecamatan
                </h2>
                <p className="text-xs text-slate-700 mt-0.5">
                  Kumulatif {CATEGORY_META[category].label} ({unit}) ·{" "}
                  {trendData.length > 1 && `${trendData[0].tahun}–${trendData[trendData.length - 1].tahun}`}
                  {" · "}
                  {selectedKecamatan !== "Semua" ? `Kecamatan ${selectedKecamatan}` : "hanya kecamatan dengan catatan (10 teratas)"}
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
                      <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                        Total ({unit})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kecamatanRanking.slice(0, 10).map((item, idx) => (
                      <tr
                        key={item.name}
                        className={`hover:bg-slate-50 ${idx < 3 ? "bg-blue-50/30" : ""}`}
                      >
                        <td className="px-5 py-2.5 tabular-nums">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-sm text-xs font-semibold ${
                            idx < 3 ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-800"
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-slate-900 font-medium">{item.name}</td>
                        <td className="px-5 py-2.5 text-right text-slate-900 tabular-nums">
                          {formatNum(item.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ===== Tabel Rincian ===== */}
            <section className="bg-white border border-slate-200 rounded-lg">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">
                  Tabel Rincian Data per Kecamatan
                </h2>
                <p className="text-xs text-slate-700 mt-0.5">
                  {CATEGORY_META[category].label} · Satuan {unit} · Tahun {selectedYear}
                  {" · "}<span className="text-slate-600">"–" = tidak ada catatan pada sumber</span>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200 w-12">
                        No
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-slate-200">
                        Kecamatan
                      </th>
                      {jenisList.map((j) => (
                        <th
                          key={j}
                          className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200 whitespace-nowrap"
                        >
                          {j} ({unit})
                        </th>
                      ))}
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide border-b border-slate-200 whitespace-nowrap bg-slate-100">
                        Total ({unit})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayData.map((row, idx) => (
                      <tr key={row.name} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-600 tabular-nums">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-slate-900 font-medium">{row.name}</td>
                        {jenisList.map((j) => (
                          <td key={j} className="px-4 py-2.5 text-right text-slate-800 tabular-nums">
                            {formatCell(row[j] || 0)}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-900 tabular-nums bg-slate-50">
                          {formatNum(row.total)}
                        </td>
                      </tr>
                    ))}
                    {displayData.length > 0 && (
                      <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-slate-900">
                          Jumlah · {selectedKecamatan === "Semua" ? "Kabupaten Banjarnegara (seluruh kecamatan)" : `Kecamatan ${selectedKecamatan}`}
                        </td>
                        {jenisList.map((j) => {
                          const sum = chartData.reduce((a, r) => a + (r[j] || 0), 0);
                          return (
                            <td key={j} className="px-4 py-3 text-right text-slate-900 tabular-nums">
                              {formatCell(sum)}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right text-slate-900 tabular-nums">
                          {formatNum(chartData.reduce((a, r) => a + r.total, 0))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ===== Catatan Sumber ===== */}
            <p className="text-xs text-slate-600 text-center pb-2">
              Sumber: Dinas Pertanian dan Ketahanan Pangan Kabupaten Banjarnegara,
              melalui Portal Open Data Banjarnegara (opendata.banjarnegarakab.go.id).
            </p>
          </>
        )}
      </div>
    </DefaultLayout>
  );
}
