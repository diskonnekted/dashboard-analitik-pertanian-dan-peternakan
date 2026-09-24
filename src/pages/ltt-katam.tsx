/**
 * /ltt-katam — LTT & Kalender Tanam (bidang 1.3 / 6.4).
 *
 * Struktur data (mirror skema MySQL `ltt_katam`, database/schema.sql):
 * komoditas · kecamatan · jenis (LTT|Katam) · luas_rencana/tanam/panen (Ha) ·
 * produksi_rencana/aktual (Ton) · bulan_mulai/bulan_panen (1–12) · tahun.
 *
 * LTT = realisasi tanam–panen (laporan); Katam = rencana pola tanam.
 *
 * Endpoint backend /v1/ltt-katam belum tersedia (data dijadwalkan 23 Sep
 * 2026). Selama data resmi belum tersambung, halaman menampilkan DATA CONTOH
 * (placeholder) dengan struktur tampilan identik dengan halaman lain (layout,
 * filter, KPI, grafik, tabel) — ditandai badge & banner amber. Begitu endpoint
 * mengembalikan data, data contoh otomatis tergantikan tanpa perubahan kode.
 */
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Info,
  Layers,
  MapPin,
  RotateCcw,
  Ruler,
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
import { fetchLttKatam, type LttKatamRow } from "@/services/api";

const fmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const formatNum = (v?: number | null) => (v == null ? "—" : fmt.format(v));

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const musim = (mulai?: number | null, panen?: number | null) =>
  mulai && panen ? `${BULAN[mulai - 1]}–${BULAN[panen - 1]}` : "—";

const JENIS_LIST = ["LTT", "Katam"] as const;
const JENIS_TONE: Record<string, "blue"> = { LTT: "blue", Katam: "blue" };
const CHART_COLORS = { rencana: "#0891b2", tanam: "#1e40af", panen: "#059669" };

/* ------------------------------------------------------------------
   DATA CONTOH (placeholder) — struktur & satuan identik dengan data
   resmi yang akan datang. LTT = realisasi 2025 (tanam/panen/produksi
   aktual terisi); Katam = rencana 2026 (hanya luas/produksi rencana).
   Produksi (Ton) dihitung dari luas akhir × produktivitas wajar
   (padi ±5,7 Ton/Ha, jagung ±6,1, kacang tanah ±1,15, ubi jalar ±18)
   agar aritmetika konsisten. Tidak untuk dipakai sebagai angka resmi;
   otomatis tergantikan saat endpoint /v1/ltt-katam mengembalikan data.
   ------------------------------------------------------------------ */
const PLACEHOLDER_ROWS: LttKatamRow[] = [
  // ---- LTT 2025 (realisasi) ----
  { komoditas: "Padi", kecamatan: "Purwanegara", jenis: "LTT", luas_rencana: 320, luas_tanam: 315.5, luas_panen: 310.2, produksi_rencana: 1824, produksi_aktual: 1768.1, bulan_mulai: 10, bulan_panen: 2, tahun: 2025 },
  { komoditas: "Padi", kecamatan: "Purwareja Klampok", jenis: "LTT", luas_rencana: 280, luas_tanam: 276.5, luas_panen: 271.3, produksi_rencana: 1596, produksi_aktual: 1546.4, bulan_mulai: 11, bulan_panen: 3, tahun: 2025 },
  { komoditas: "Padi", kecamatan: "Mandiraja", jenis: "LTT", luas_rencana: 240, luas_tanam: 238, luas_panen: 233.5, produksi_rencana: 1368, produksi_aktual: 1331, bulan_mulai: 10, bulan_panen: 2, tahun: 2025 },
  { komoditas: "Padi", kecamatan: "Susukan", jenis: "LTT", luas_rencana: 205, luas_tanam: 202.4, luas_panen: 198.7, produksi_rencana: 1168.5, produksi_aktual: 1132.6, bulan_mulai: 11, bulan_panen: 3, tahun: 2025 },
  { komoditas: "Jagung", kecamatan: "Banjarnegara", jenis: "LTT", luas_rencana: 120, luas_tanam: 116.8, luas_panen: 112.4, produksi_rencana: 714.8, produksi_aktual: 687.9, bulan_mulai: 3, bulan_panen: 6, tahun: 2025 },
  { komoditas: "Jagung", kecamatan: "Wanayasa", jenis: "LTT", luas_rencana: 85, luas_tanam: 83.2, luas_panen: 80.6, produksi_rencana: 509.2, produksi_aktual: 493.3, bulan_mulai: 12, bulan_panen: 4, tahun: 2025 },
  { komoditas: "Kacang Tanah", kecamatan: "Purwareja Klampok", jenis: "LTT", luas_rencana: 95, luas_tanam: 92.6, luas_panen: 90.1, produksi_rencana: 106.5, produksi_aktual: 103.6, bulan_mulai: 4, bulan_panen: 7, tahun: 2025 },
  { komoditas: "Ubi Jalar", kecamatan: "Sigaluh", jenis: "LTT", luas_rencana: 48, luas_tanam: 46.9, luas_panen: 45.3, produksi_rencana: 844.2, produksi_aktual: 815.4, bulan_mulai: 5, bulan_panen: 8, tahun: 2025 },
  // ---- Katam 2026 (rencana) ----
  { komoditas: "Padi", kecamatan: "Purwanegara", jenis: "Katam", luas_rencana: 330, produksi_rencana: 1881, bulan_mulai: 10, bulan_panen: 2, tahun: 2026 },
  { komoditas: "Padi", kecamatan: "Purwareja Klampok", jenis: "Katam", luas_rencana: 285, produksi_rencana: 1624.5, bulan_mulai: 11, bulan_panen: 3, tahun: 2026 },
  { komoditas: "Padi", kecamatan: "Susukan", jenis: "Katam", luas_rencana: 310, produksi_rencana: 1767, bulan_mulai: 11, bulan_panen: 3, tahun: 2026 },
  { komoditas: "Jagung", kecamatan: "Banjarnegara", jenis: "Katam", luas_rencana: 125, produksi_rencana: 765, bulan_mulai: 3, bulan_panen: 6, tahun: 2026 },
  { komoditas: "Jagung", kecamatan: "Madukara", jenis: "Katam", luas_rencana: 82, produksi_rencana: 501.8, bulan_mulai: 12, bulan_panen: 4, tahun: 2026 },
  { komoditas: "Kacang Tanah", kecamatan: "Purwareja Klampok", jenis: "Katam", luas_rencana: 100, produksi_rencana: 115, bulan_mulai: 4, bulan_panen: 7, tahun: 2026 },
  { komoditas: "Ubi Jalar", kecamatan: "Sigaluh", jenis: "Katam", luas_rencana: 50, produksi_rencana: 900, bulan_mulai: 5, bulan_panen: 8, tahun: 2026 },
];

export default function LttKatamPage() {
  const [realRows, setRealRows] = useState<LttKatamRow[] | null>(null);
  const [year, setYear] = useState("");
  const [kecamatan, setKecamatan] = useState("all");
  const [jenis, setJenis] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    fetchLttKatam()
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
    () => scopedRows.filter((r) => (jenis === "all" ? true : r.jenis === jenis)),
    [scopedRows, jenis],
  );

  const tableRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((r) =>
      [r.komoditas, r.kecamatan, r.jenis].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [filtered, query]);

  const perKec = useMemo(() => {
    const m = new Map<string, { rencana: number; tanam: number; panen: number }>();
    filtered.forEach((r) => {
      const cur = m.get(r.kecamatan) ?? { rencana: 0, tanam: 0, panen: 0 };
      cur.rencana += r.luas_rencana ?? 0;
      cur.tanam += r.luas_tanam ?? 0;
      cur.panen += r.luas_panen ?? 0;
      m.set(r.kecamatan, cur);
    });
    return [...m.entries()].sort((a, b) => b[1].rencana + b[1].tanam - (a[1].rencana + a[1].tanam));
  }, [filtered]);

  if (realRows === null) {
    return (
      <DefaultLayout>
        <section className="flex flex-col gap-8">
          <PageHeader
            icon={<CalendarDays className="h-6 w-6" />}
            title="LTT & Kalender Tanam"
            subtitle="Laporan realisasi tanam–panen (LTT) dan rencana kalender tanam (Katam) per komoditas & kecamatan Kabupaten Banjarnegara."
          />
          <LoadingSpinner label="Memuat data LTT & kalender tanam…" />
        </section>
      </DefaultLayout>
    );
  }

  /* ---------- statistik turunan (non-hook) ---------- */
  const totalRencana = filtered.reduce((s, r) => s + (r.luas_rencana ?? 0), 0);
  const totalTanam = filtered.reduce((s, r) => s + (r.luas_tanam ?? 0), 0);
  const totalProd = filtered.reduce((s, r) => s + (r.produksi_aktual ?? 0), 0);
  const kecCount = new Set(filtered.map((r) => r.kecamatan)).size;
  const topProdKec = [...filtered.reduce((m, r) => {
    m.set(r.kecamatan, (m.get(r.kecamatan) ?? 0) + (r.produksi_aktual ?? 0));
    return m;
  }, new Map<string, number>())].sort((a, b) => b[1] - a[1])[0];

  const chartData = perKec.map(([kec, v]) => ({
    kecamatan: kec,
    Rencana: v.rencana,
    Tanam: v.tanam,
    Panen: v.panen,
  }));

  const perKomoditas = [...filtered.reduce((m, r) => {
    m.set(r.komoditas, (m.get(r.komoditas) ?? 0) + (r.luas_rencana ?? 0) + (r.luas_tanam ?? 0));
    return m;
  }, new Map<string, number>())]
    .map(([komoditas, luas]) => ({ komoditas, luas }))
    .filter((x) => x.luas > 0)
    .sort((a, b) => b.luas - a.luas);
  const totalLuasKomoditas = perKomoditas.reduce((s, x) => s + x.luas, 0);

  const resetFilters = () => {
    setYear("");
    setKecamatan("all");
    setJenis("all");
    setQuery("");
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8">
        <PageHeader
          icon={<CalendarDays className="h-6 w-6" />}
          title="LTT & Kalender Tanam"
          subtitle="Laporan realisasi tanam–panen (LTT) dan rencana kalender tanam (Katam) per komoditas & kecamatan Kabupaten Banjarnegara."
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
              contoh, bukan angka resmi. Data resmi LTT &amp; kalender tanam dijadwalkan tersedia{" "}
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
          <ToolbarField label="Jenis">
            <select
              value={jenis}
              onChange={(e) => setJenis(e.target.value)}
              className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20"
            >
              <option value="all">LTT &amp; Katam</option>
              {JENIS_LIST.map((j) => (
                <option key={j} value={j}>
                  {j === "LTT" ? "LTT (realisasi)" : "Katam (rencana)"}
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
            icon={<Ruler className="h-5 w-5" />}
            label="Luas Rencana"
            value={formatNum(totalRencana)}
            unit="Ha"
            color="bg-cyan-300"
            hint="Σ rencana tanam pada filter aktif (Katam/LTT)"
          />
          <KpiCard
            icon={<Sprout className="h-5 w-5" />}
            label="Luas Tanam (realisasi)"
            value={formatNum(totalTanam)}
            unit="Ha"
            color="bg-blue-300"
            hint="Σ realisasi tanam — terisi pada entri LTT"
          />
          <KpiCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="Produksi Aktual"
            value={formatNum(totalProd)}
            unit="Ton"
            color="bg-amber-300"
            hint={
              topProdKec && topProdKec[1] > 0
                ? `kecamatan teratas: ${topProdKec[0]} (${formatNum(topProdKec[1])} Ton)`
                : "terisi pada entri LTT (realisasi)"
            }
          />
          <SectionCard
            title="Komposisi Komoditas"
            icon={<Layers className="h-4 w-4 text-blue-800" />}
            className="flex-1"
          >
            <div className="flex h-full flex-col justify-center gap-2.5">
              {perKomoditas.map((k) => {
                const pct = totalLuasKomoditas > 0 ? (k.luas / totalLuasKomoditas) * 100 : 0;
                return (
                  <div key={k.komoditas} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 truncate text-slate-600">{k.komoditas}</span>
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
              {perKomoditas.length === 0 && (
                <p className="text-xs text-slate-400">Tidak ada data pada filter ini.</p>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ---------- Grafik ---------- */}
        <SectionCard
          title={`Luas per Kecamatan${activeYear ? ` — Tahun ${activeYear}` : ""}`}
          icon={<BarChart3 className="h-4 w-4 text-blue-800" />}
          actions={
            <>
              <Badge tone="blue">Ha</Badge>
              <Badge tone="slate">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {kecCount} kecamatan
                </span>
              </Badge>
            </>
          }
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
                  width={130}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(30, 64, 175, 0.06)" }}
                  formatter={(v) => `${fmt.format(Number(v))} Ha`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Rencana" stackId="luas" fill={CHART_COLORS.rencana} name="Rencana (Katam/LTT)" />
                <Bar dataKey="Tanam" stackId="luas" fill={CHART_COLORS.tanam} name="Tanam (realisasi)" />
                <Bar dataKey="Panen" stackId="luas" fill={CHART_COLORS.panen} name="Panen (realisasi)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* ---------- Tabel ---------- */}
        <SectionCard
          title="Tabel LTT & Kalender Tanam"
          icon={<Table2 className="h-4 w-4 text-blue-800" />}
          actions={
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari komoditas / kecamatan…"
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
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Komoditas</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Kecamatan</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Jenis</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Musim</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Rencana (Ha)</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tanam (Ha)</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Panen (Ha)</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Prod. Rencana (Ton)</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Prod. Aktual (Ton)</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tahun</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => (
                  <tr
                    key={`${r.komoditas}-${r.kecamatan}-${r.jenis}-${r.tahun}-${i}`}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5 border-b border-slate-100 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 font-medium text-slate-700">{r.komoditas}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-slate-700">{r.kecamatan}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100">
                      <Badge tone={JENIS_TONE[r.jenis] ?? "slate"}>{r.jenis}</Badge>
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-slate-700">
                      {musim(r.bulan_mulai, r.bulan_panen)}
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-700">{formatNum(r.luas_rencana)}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-700">{formatNum(r.luas_tanam)}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-700">{formatNum(r.luas_panen)}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-700">{formatNum(r.produksi_rencana)}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-700">{formatNum(r.produksi_aktual)}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-700">{r.tahun ?? "—"}</td>
                  </tr>
                ))}
                {tableRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-sm text-slate-400">
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
                      {formatNum(tableRows.reduce((s, r) => s + (r.luas_rencana ?? 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatNum(tableRows.reduce((s, r) => s + (r.luas_tanam ?? 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatNum(tableRows.reduce((s, r) => s + (r.luas_panen ?? 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatNum(tableRows.reduce((s, r) => s + (r.produksi_rencana ?? 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatNum(tableRows.reduce((s, r) => s + (r.produksi_aktual ?? 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-500">
            Sumber: Distankan Kab. Banjarnegara — bidang 6.4 LTT &amp; Kalender Tanam. LTT = laporan
            realisasi tanam–panen; Katam = rencana pola tanam. Satuan: luas Ha, produksi Ton; musim
            ditampilkan bulan tanam–bulan panen.
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
