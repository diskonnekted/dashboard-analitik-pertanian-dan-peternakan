/**
 * /komoditas-unggulan — Komoditas & Varietas Unggulan (bidang 1.1)
 *
 * Struktur data (mirror skema MySQL `komoditas_unggulan`, database/schema.sql):
 * bidang (5 enum) · komoditas · varietas · kecamatan · luas_lahan (Ha) ·
 * produktivitas (Ku/Ha) · produksi (Ton) · ketersediaan_benih (4 enum) · tahun.
 *
 * Endpoint backend /v1/komoditas-unggulan belum tersedia (data dijadwalkan
 * 23 Sep 2026). Selama data resmi belum tersambung, halaman menampilkan
 * DATA CONTOH (placeholder) dengan struktur tampilan identik dengan halaman
 * lain (layout, filter, KPI, grafik, tabel) — ditandai badge & banner amber.
 * Begitu endpoint mengembalikan data, data contoh otomatis tergantikan
 * tanpa perubahan kode.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  Boxes,
  Info,
  Layers,
  Ruler,
  RotateCcw,
  Sprout,
  Table2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DefaultLayout from "@/layouts/default";
import {
  Badge,
  KpiCard,
  LoadingSpinner,
  PageHeader,
  SectionCard,
  Toolbar,
  ToolbarField,
} from "@/components/ui";
import { fetchKomoditasUnggulan, type KomoditasUnggulanRow } from "@/services/api";

const fmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const formatNum = (v?: number | null) => (v == null ? "—" : fmt.format(v));

const BIDANG_LIST = ["Tanaman Pangan", "Hortikultura", "Perkebunan", "Peternakan", "Perikanan"] as const;
const CHART_COLORS = ["#1e40af", "#0891b2", "#ca8a04", "#7c3aed", "#dc2626", "#059669", "#db2777"];

const BIDANG_TONE: Record<string, "amber" | "emerald" | "violet" | "blue" | "red"> = {
  "Tanaman Pangan": "amber",
  Hortikultura: "emerald",
  Perkebunan: "violet",
  Peternakan: "blue",
  Perikanan: "red",
};
const BENIH_TONE: Record<string, "emerald" | "amber" | "red" | "slate"> = {
  Tersedia: "emerald",
  Terbatas: "amber",
  Kurang: "red",
  "Tidak ada": "slate",
};

/* ------------------------------------------------------------------
   DATA CONTOH (placeholder) — struktur & satuan identik dengan data
   resmi yang akan datang. Produksi (Ton) = luas (Ha) × produktivitas
   (Ku/Ha) ÷ 10 agar aritmetika konsisten. Tidak untuk dipakai sebagai
   angka resmi; otomatis tergantikan saat endpoint /v1/komoditas-unggulan
   mengembalikan data.
   ------------------------------------------------------------------ */
const PLACEHOLDER_ROWS: KomoditasUnggulanRow[] = [
  { bidang: "Tanaman Pangan", komoditas: "Padi", varietas: "Inpari 32", kecamatan: "Purwanegara", luas_lahan: 120.5, produktivitas: 68.2, produksi: 821.81, ketersediaan_benih: "Tersedia", tahun: 2025 },
  { bidang: "Tanaman Pangan", komoditas: "Jagung", varietas: "Bima 10", kecamatan: "Banjarnegara", luas_lahan: 45.25, produktivitas: 72, produksi: 325.8, ketersediaan_benih: "Tersedia", tahun: 2025 },
  { bidang: "Hortikultura", komoditas: "Kentang", varietas: "Granola", kecamatan: "Kejajar", luas_lahan: 85, produktivitas: 190, produksi: 1615, ketersediaan_benih: "Terbatas", tahun: 2025 },
  { bidang: "Hortikultura", komoditas: "Kentang", varietas: "Granola", kecamatan: "Batur", luas_lahan: 62.4, produktivitas: 178.5, produksi: 1113.84, ketersediaan_benih: "Terbatas", tahun: 2025 },
  { bidang: "Hortikultura", komoditas: "Wortel", varietas: "New Kuroda", kecamatan: "Batur", luas_lahan: 28.75, produktivitas: 160, produksi: 460, ketersediaan_benih: "Tersedia", tahun: 2025 },
  { bidang: "Hortikultura", komoditas: "Kubis", varietas: "Green Corona", kecamatan: "Kejajar", luas_lahan: 40.1, produktivitas: 210, produksi: 842.1, ketersediaan_benih: "Terbatas", tahun: 2025 },
  { bidang: "Perkebunan", komoditas: "Kopi Robusta", varietas: "BP 358", kecamatan: "Pejawaran", luas_lahan: 55, produktivitas: 9.8, produksi: 53.9, ketersediaan_benih: "Terbatas", tahun: 2025 },
  { bidang: "Perkebunan", komoditas: "Kayu Manis", varietas: "Kerinci", kecamatan: "Wanayasa", luas_lahan: 18, produktivitas: 6.5, produksi: 11.7, ketersediaan_benih: "Kurang", tahun: 2025 },
  { bidang: "Peternakan", komoditas: "Sapi Potong", varietas: "Simental", kecamatan: "Rakit", produksi: 145.2, ketersediaan_benih: "Tersedia", tahun: 2025 },
  { bidang: "Perikanan", komoditas: "Nila", varietas: "Nila Gesit", kecamatan: "Banjarnegara", produksi: 208.6, ketersediaan_benih: "Terbatas", tahun: 2025 },
  { bidang: "Tanaman Pangan", komoditas: "Padi", varietas: "Inpari 32", kecamatan: "Purwanegara", luas_lahan: 118, produktivitas: 67.5, produksi: 796.5, ketersediaan_benih: "Tersedia", tahun: 2024 },
  { bidang: "Hortikultura", komoditas: "Kentang", varietas: "Granola", kecamatan: "Kejajar", luas_lahan: 78.2, produktivitas: 185, produksi: 1446.7, ketersediaan_benih: "Terbatas", tahun: 2024 },
  { bidang: "Hortikultura", komoditas: "Kubis", varietas: "Green Corona", kecamatan: "Kejajar", luas_lahan: 36.4, produktivitas: 205, produksi: 746.2, ketersediaan_benih: "Terbatas", tahun: 2024 },
  { bidang: "Perkebunan", komoditas: "Cengkeh", varietas: "Siputih", kecamatan: "Wanayasa", luas_lahan: 32, produktivitas: 4.5, produksi: 14.4, ketersediaan_benih: "Kurang", tahun: 2024 },
  { bidang: "Perikanan", komoditas: "Lele", varietas: "Sangkuriang", kecamatan: "Susukan", produksi: 312.4, ketersediaan_benih: "Tersedia", tahun: 2024 },
];

export default function KomoditasUnggulanPage() {
  const [realRows, setRealRows] = useState<KomoditasUnggulanRow[] | null>(null);
  const [year, setYear] = useState("");
  const [kecamatan, setKecamatan] = useState("all");
  const [bidang, setBidang] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    fetchKomoditasUnggulan()
      .then((d) => {
        if (alive) setRealRows(d);
      })
      .catch(() => {
        if (alive) setRealRows([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const isPlaceholder = !(realRows && realRows.length > 0);
  const baseRows = isPlaceholder ? PLACEHOLDER_ROWS : (realRows ?? []);

  const tahunList = useMemo(() => {
    const y = [...new Set(baseRows.map((r) => r.tahun).filter((t): t is number => t != null))].sort((a, b) => b - a);
    return y.map(String);
  }, [baseRows]);

  const activeYear = year || tahunList[0] || "";

  const yearRows = useMemo(
    () => baseRows.filter((r) => (activeYear ? String(r.tahun) === activeYear : true)),
    [baseRows, activeYear],
  );

  const kecamatanList = useMemo(
    () => [...new Set(yearRows.map((r) => r.kecamatan).filter((x): x is string => !!x))].sort(),
    [yearRows],
  );

  const scopedRows = useMemo(
    () => yearRows.filter((r) => (kecamatan === "all" ? true : r.kecamatan === kecamatan)),
    [yearRows, kecamatan],
  );

  const filtered = useMemo(
    () => scopedRows.filter((r) => (bidang === "all" ? true : r.bidang === bidang)),
    [scopedRows, bidang],
  );

  const tableRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((r) =>
      [r.komoditas, r.varietas, r.kecamatan, r.bidang].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [filtered, query]);

  const perKec = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((r) => {
      if (r.kecamatan) m.set(r.kecamatan, (m.get(r.kecamatan) ?? 0) + (r.produksi ?? 0));
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  if (realRows === null) {
    return (
      <DefaultLayout>
        <section className="flex flex-col gap-8">
          <PageHeader
            icon={<Award className="h-6 w-6" />}
            title="Komoditas Unggulan & Varietas"
            subtitle="Komoditas dan varietas unggulan per bidang & kecamatan Kabupaten Banjarnegara — luas lahan, produktivitas, produksi, dan ketersediaan benih."
          />
          <LoadingSpinner label="Memuat data komoditas unggulan…" />
        </section>
      </DefaultLayout>
    );
  }

  /* ---------- statistik turunan (non-hook) ---------- */
  const jumlahVarietas = new Set(filtered.map((r) => `${r.bidang}|${r.komoditas}|${r.varietas}`)).size;
  const totalLuas = filtered.reduce((s, r) => s + (r.luas_lahan ?? 0), 0);
  const totalProduksi = filtered.reduce((s, r) => s + (r.produksi ?? 0), 0);
  const topKec = perKec[0];

  const seriesBidang = (bidang === "all" ? [...BIDANG_LIST] : [bidang]).filter((b) =>
    filtered.some((r) => r.bidang === b),
  );

  const chartData = perKec.map(([kec]) => {
    const point: Record<string, number | string> = { kecamatan: kec };
    seriesBidang.forEach((b) => {
      point[b] = filtered
        .filter((r) => r.kecamatan === kec && r.bidang === b)
        .reduce((s, r) => s + (r.produksi ?? 0), 0);
    });
    return point;
  });

  const perBidang = [...BIDANG_LIST]
    .map((b) => ({
      bidang: b,
      produksi: filtered.filter((r) => r.bidang === b).reduce((s, r) => s + (r.produksi ?? 0), 0),
    }))
    .filter((x) => x.produksi > 0)
    .sort((a, b) => b.produksi - a.produksi);

  const resetFilters = () => {
    setYear("");
    setKecamatan("all");
    setBidang("all");
    setQuery("");
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8">
        <PageHeader
          icon={<Award className="h-6 w-6" />}
          title="Komoditas Unggulan & Varietas"
          subtitle="Komoditas dan varietas unggulan per bidang & kecamatan Kabupaten Banjarnegara — luas lahan, produktivitas, produksi, dan ketersediaan benih."
          actions={
            <>
              {isPlaceholder ? (
                <Badge tone="amber">Data Contoh · Placeholder</Badge>
              ) : (
                <Badge tone="emerald">Data Resmi</Badge>
              )}
              <Badge tone="blue">{activeYear ? `Tahun ${activeYear}` : "Semua Tahun"}</Badge>
            </>
          }
        />

        {isPlaceholder && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">Pratinjau dengan data contoh.</span> Struktur tampilan (filter,
              KPI, grafik, tabel) sudah final dan konsisten dengan halaman lain; angka di bawah adalah data
              contoh, bukan angka resmi. Data resmi komoditas &amp; varietas unggulan dijadwalkan tersedia{" "}
              <span className="font-semibold">23 September 2026</span> dan akan otomatis menggantikan seluruh
              data contoh begitu basis data tersambung.
            </p>
          </div>
        )}

        {/* ---------- Filter ---------- */}
        <Toolbar>
          <ToolbarField label="Tahun">
            <select
              value={activeYear}
              onChange={(e) => setYear(e.target.value)}
              className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20"
            >
              {tahunList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </ToolbarField>
          <ToolbarField label="Kecamatan">
            <select
              value={kecamatan}
              onChange={(e) => setKecamatan(e.target.value)}
              className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20"
            >
              <option value="all">Semua Kecamatan</option>
              {kecamatanList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </ToolbarField>
          <ToolbarField label="Bidang">
            <select
              value={bidang}
              onChange={(e) => setBidang(e.target.value)}
              className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20"
            >
              <option value="all">Semua Bidang</option>
              {BIDANG_LIST.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </ToolbarField>
          <button
            type="button"
            onClick={resetFilters}
            className="h-[38px] inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset
          </button>
        </Toolbar>

        {/* ---------- KPI + komposisi ---------- */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Sprout className="h-5 w-5" />}
            label="Varietas Unggulan"
            value={jumlahVarietas}
            unit="entri"
            color="bg-emerald-300"
            hint="kombinasi unik komoditas × varietas pada filter aktif"
          />
          <KpiCard
            icon={<Ruler className="h-5 w-5" />}
            label="Total Luas Lahan"
            value={formatNum(totalLuas)}
            unit="Ha"
            color="bg-blue-300"
            hint="Σ luas lahan entri terfilter"
          />
          <KpiCard
            icon={<Boxes className="h-5 w-5" />}
            label="Total Produksi"
            value={formatNum(totalProduksi)}
            unit="Ton"
            color="bg-amber-300"
            hint={`kecamatan teratas: ${topKec ? `${topKec[0]} (${formatNum(topKec[1])} Ton)` : "—"}`}
          />
          <SectionCard
            title="Komposisi Produksi"
            icon={<Layers className="h-4 w-4 text-blue-800" />}
            className="flex-1"
          >
            <div className="flex h-full flex-col justify-center gap-2.5">
              {perBidang.map((b) => {
                const pct = totalProduksi > 0 ? (b.produksi / totalProduksi) * 100 : 0;
                return (
                  <div key={b.bidang} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 truncate text-slate-600">{b.bidang}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-blue-800"
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right tabular-nums text-slate-500">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
              {perBidang.length === 0 && (
                <p className="text-xs text-slate-400">Tidak ada data pada filter ini.</p>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ---------- Grafik ---------- */}
        <SectionCard
          title={`Produksi per Kecamatan${activeYear ? ` — Tahun ${activeYear}` : ""}`}
          icon={<BarChart3 className="h-4 w-4 text-blue-800" />}
          actions={<Badge tone="blue">Ton</Badge>}
        >
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => fmt.format(v)}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="kecamatan"
                  width={120}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(30, 64, 175, 0.06)" }}
                  formatter={(v) => `${fmt.format(Number(v))} Ton`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {seriesBidang.map((b, i) => (
                  <Bar
                    key={b}
                    dataKey={b}
                    stackId="komoditas"
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    name={b}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* ---------- Tabel ---------- */}
        <SectionCard
          title="Tabel Komoditas & Varietas Unggulan"
          icon={<Table2 className="h-4 w-4 text-blue-800" />}
          actions={
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari komoditas / varietas / kecamatan…"
                className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20"
              />
              <Badge tone="slate">{tableRows.length} baris</Badge>
            </>
          }
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">No.</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bidang</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Komoditas</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Varietas</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Kecamatan</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Luas (Ha)</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Produksi (Ton)</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Prod. (Ku/Ha)</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Benih</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tahun</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => (
                  <tr key={`${r.bidang}-${r.komoditas}-${r.varietas}-${r.kecamatan}-${r.tahun}-${i}`} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 border-b border-slate-100 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100">
                      <Badge tone={BIDANG_TONE[r.bidang] ?? "slate"}>{r.bidang}</Badge>
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100 font-medium text-slate-700">{r.komoditas}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-slate-700">{r.varietas}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-slate-700">{r.kecamatan ?? "—"}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-700">{formatNum(r.luas_lahan)}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-700">{formatNum(r.produksi)}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-700">{formatNum(r.produktivitas)}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100">
                      <Badge tone={BENIH_TONE[r.ketersediaan_benih ?? ""] ?? "slate"}>
                        {r.ketersediaan_benih ?? "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-700">{r.tahun ?? "—"}</td>
                  </tr>
                ))}
                {tableRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-400">
                      Tidak ada baris yang cocok dengan filter / pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
              {tableRows.length > 0 && (
                <tfoot className="bg-slate-50 font-semibold text-slate-800">
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={5} className="px-4 py-3">Jumlah ({tableRows.length} baris)</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatNum(tableRows.reduce((s, r) => s + (r.luas_lahan ?? 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatNum(tableRows.reduce((s, r) => s + (r.produksi ?? 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">—</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right text-slate-400">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-500">
            Sumber: Distankan Kab. Banjarnegara — bidang 1.1 Komoditas Unggulan. Satuan: luas lahan Ha,
            produktivitas Ku/Ha, produksi Ton; entri Peternakan/Perikanan dapat tanpa luas lahan.
            {isPlaceholder && (
              <span className="font-semibold text-amber-700">
                {" "}Saat ini menampilkan DATA CONTOH (placeholder), bukan angka resmi.
              </span>
            )}
          </div>
        </SectionCard>
      </section>
    </DefaultLayout>
  );
}
