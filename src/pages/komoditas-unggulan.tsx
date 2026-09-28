/**
 * /komoditas-unggulan — Komoditas & Varietas Unggulan (bidang 1.1)
 *
 * Struktur data (mirror skema MySQL `komoditas_unggulan`, database/schema.sql):
 * bidang (5 enum) · komoditas · varietas · kecamatan · luas_lahan (Ha) ·
 * produktivitas (Ku/Ha) · produksi (Ton) · ketersediaan_benih (4 enum) · tahun.
 *
 * Endpoint backend /v1/komoditas-unggulan belum tersedia. Selama data resmi
 * belum tersambung, halaman menampilkan DATA LOKAL NYATA yang diturunkan dari
 * data produksi 2024 di basis data aplikasi ini (src/data/komoditas-unggulan.ts)
 * — bukan data contoh/rekaan. Begitu endpoint mengembalikan data resmi Dinas,
 * data lokal otomatis tergantikan tanpa perubahan kode.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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
import { KOMODITAS_UNGGULAN_LOKAL } from "@/data/komoditas-unggulan";

const fmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const formatNum = (v?: number | null) => (v == null ? "—" : fmt.format(v));

const BIDANG_LIST = ["Tanaman Pangan", "Hortikultura", "Perkebunan", "Peternakan", "Perikanan"] as const;
/* Slug route -> nilai filter bidang (nav per grup bidang: /komoditas-unggulan/:bidang). */
const BIDANG_SLUG: Record<string, string> = {
  pangan: "Tanaman Pangan",
  hortikultura: "Hortikultura",
  perkebunan: "Perkebunan",
  peternakan: "Peternakan",
  perikanan: "Perikanan",
};
const CHART_COLORS = ["#1e40af", "#0891b2", "#ca8a04", "#7c3aed", "#dc2626", "#059669", "#db2777"];

const BIDANG_TONE: Record<string, "blue"> = {
  "Tanaman Pangan": "blue",
  Hortikultura: "blue",
  Perkebunan: "blue",
  Peternakan: "blue",
  Perikanan: "blue",
};
const BENIH_TONE: Record<string, "emerald" | "amber" | "red" | "slate"> = {
  Tersedia: "emerald",
  Terbatas: "amber",
  Kurang: "red",
  "Tidak ada": "slate",
};

/* Komoditas tambahan Bidang Perkebunan (notulen Distankan KP 21 Sep 2026;
   keputusan klien 23 Sep: talas & porang = dua komoditas terpisah). Kartu
   placeholder di bawah otomatis hilang begitu data dinas memuat komoditas
   dengan nama yang sama (pola placeholder auto-upgrade). */
const KOMODITAS_DINAS: { komoditas: string; deskripsi: string }[] = [
  { komoditas: "Kelapa Deres", deskripsi: "Nira kelapa dalam diolah menjadi gula semut/gula aren — produk hilirisasi khas kawasan Dieng." },
  { komoditas: "Talas", deskripsi: "Umbi talas sebagai komoditas non-rilis BPS; sentra kawasan Dieng." },
  { komoditas: "Porang", deskripsi: "Umbi porang untuk bahan baku chip kering / tepung glukomanan berorientasi ekspor." },
];

/* ------------------------------------------------------------------
   Data lokal nyata — diturunkan dari data produksi 2024 yang sudah ada
   di basis data aplikasi ini (lihat src/data/komoditas-unggulan.ts).
   Bukan data contoh/rekaan. Otomatis tergantikan data resmi begitu
   endpoint /v1/komoditas-unggulan mengembalikan data dari basis data.
   ------------------------------------------------------------------ */

export default function KomoditasUnggulanPage() {
  const { bidang: bidangParam } = useParams<{ bidang: string }>();
  const [realRows, setRealRows] = useState<KomoditasUnggulanRow[] | null>(null);
  const [year, setYear] = useState("");
  const [kecamatan, setKecamatan] = useState("all");
  const [bidang, setBidang] = useState(bidangParam ? (BIDANG_SLUG[bidangParam] ?? "all") : "all");
  const [query, setQuery] = useState("");

  // Sinkronkan filter bidang dengan route /komoditas-unggulan/:bidang (nav per grup).
  useEffect(() => {
    setBidang(bidangParam ? (BIDANG_SLUG[bidangParam] ?? "all") : "all");
  }, [bidangParam]);

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
  const baseRows = isPlaceholder ? KOMODITAS_UNGGULAN_LOKAL : (realRows ?? []);

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
            title="Komoditas & Varietas Unggulan"
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
          title="Komoditas & Varietas Unggulan"
          subtitle="Komoditas dan varietas unggulan per bidang & kecamatan Kabupaten Banjarnegara — luas lahan, produktivitas, produksi, dan ketersediaan benih."
          actions={
            <>
              {isPlaceholder ? (
                <Badge tone="blue">Data Lokal Terverifikasi</Badge>
              ) : (
                <Badge tone="emerald">Data Resmi</Badge>
              )}
              <Badge tone="blue">{activeYear ? `Tahun ${activeYear}` : "Semua Tahun"}</Badge>
            </>
          }
        />

        {isPlaceholder && (
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">Data diturunkan dari basis data produksi 2024 aplikasi ini.</span>{" "}
              Angka di bawah dihitung dari data produksi resmi Distankan KP yang sudah tersimpan di basis data
              lokal (padi/palawija, hortikultura, perkebunan, ternak daging, dan perikanan), bukan data contoh.{" "}
              <span className="font-semibold">Varietas &amp; ketersediaan benih</span> belum tersedia di data
              produksi dan menunggu impor Dinas; begitu data resmi Dinas tersambung, seluruh tabel otomatis
              tergantikan.
            </p>
          </div>
        )}

        {/* Komoditas tambahan Perkebunan — placeholder menunggu import dinas.
            Kartu otomatis tergantikan data resmi begitu komoditas bernama sama
            muncul di basis data. */}
        {(() => {
          const menunggu = KOMODITAS_DINAS.filter(
            (k) => !baseRows.some((r) => r.bidang === "Perkebunan" && r.komoditas === k.komoditas),
          );
          if (menunggu.length === 0) return null;
          return (
            <div className="grid gap-4 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-5 md:grid-cols-3">
              {menunggu.map((k) => (
                <div key={k.komoditas} className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-white/70 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-800">
                      <Sprout className="h-4 w-4" aria-hidden />
                      Perkebunan
                    </span>
                    <Badge tone="amber">Menunggu Data Dinas</Badge>
                  </div>
                  <p className="text-lg font-bold text-slate-900">{k.komoditas}</p>
                  <p className="text-sm leading-relaxed text-slate-600">{k.deskripsi}</p>
                </div>
              ))}
              <p className="text-xs leading-relaxed text-amber-800 md:col-span-3">
                Tiga komoditas tambahan Bidang Perkebunan (notulen Distankan KP 21 Sep 2026 — talas &amp; porang
                sebagai dua komoditas terpisah) akan diimpor dari Dinas; kartu di atas otomatis tergantikan
                data resmi begitu tersedia di basis data.
              </p>
            </div>
          );
        })()}

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
              <span className="font-semibold text-blue-700">
                {" "}Data diturunkan dari produksi 2024 basis data lokal; varietas &amp; benih menunggu impor Dinas.
              </span>
            )}
          </div>
        </SectionCard>
      </section>
    </DefaultLayout>
  );
}
