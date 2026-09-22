/**
 * Produksi Susu & Kulit — halaman publik.
 *
 * Data dari backend `GET /api/v1/peternakan/susu-kulit`.
 * 2 grup: Sapi/Kerbau (susu) & Kambing/Domba (kulit) per kecamatan/tahun.
 * Sigma data live = 121.087 unit (verifikasi backend).
 *
 * UI mengikuti pola /livestock (chart line + bar, KPI, tabel + thead/tfoot, empty state).
 */
import { useEffect, useMemo, useState } from "react";
import DefaultLayout from "@/layouts/default";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import { CalendarDays, ClipboardList, Droplets, Table2, Trophy } from "lucide-react";
import { KpiCard, SectionCard, Toolbar, ToolbarField, LoadingSpinner, Badge, PageHeader } from "@/components/ui";
import type { TernakSusuKulit } from "@/services/api";
import { fetchTernakSusuKulit } from "@/services/api";

const GRUP_OPTIONS = [
  { value: "susu", label: "Sapi / Kerbau (Susu)" },
  { value: "kulit", label: "Kambing / Domba (Kulit)" },
] as const;

function fmt(v: number) {
  return v.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

export default function PeternakanSusuKulitPage() {
  const [group, setGroup] = useState<"susu" | "kulit">("susu");
  const [limit, setLimit] = useState(50);

  const [rows, setRows] = useState<TernakSusuKulit[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const error = fetchError;

  useEffect(() => {
    let alive = true;
    fetchTernakSusuKulit()
      .then((d) => { if (alive) { setRows(d); setLoading(false); } })
      .catch((e: Error) => { if (alive) { setFetchError(e); setRows(null); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const kecList = useMemo(
    () =>
      Array.from(new Set((rows ?? []).map((r) => r.kecamatan))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows],
  );
  const [kec, setKec] = useState("");

  const kecRows = useMemo(() => {
    let out = rows ?? [];
    if (kec) out = out.filter((r: TernakSusuKulit) => r.kecamatan === kec);
    if (group === "susu") out = out.filter((r: TernakSusuKulit) => r.jenis === "Sapi/Kerbau");
    if (group === "kulit") out = out.filter((r: TernakSusuKulit) => r.jenis === "Kambing/Domba");
    return out;
  }, [rows, kec, group]);

  // --- KPI ---
  const kpiTotal = kecRows.reduce((a: number, r: TernakSusuKulit) => a + r.jumlah, 0);
  const unitLabel = group === "susu" ? "liter" : "lembar";
  const topRow = kecRows.reduce(
    (best: TernakSusuKulit | null, r: TernakSusuKulit) => (r.jumlah > (best?.jumlah ?? 0) ? r : best),
    kecRows[0] ?? null,
  );

  // --- Trend line (Σ per tahun) ---
  const trendData = useMemo(() => {
    const m = new Map<string, number>();
    kecRows.forEach((r: TernakSusuKulit) => {
      m.set(r.tahun, (m.get(r.tahun) ?? 0) + r.jumlah);
    });
    return Array.from(m.entries())
      .map(([periode, total]) => ({ periode, total }))
      .sort((a, b) => a.periode.localeCompare(b.periode));
  }, [kecRows]);

  // --- Bar chart (Σ per kecamatan) ---
  const barData = useMemo(() => {
    const m = new Map<string, number>();
    kecRows.forEach((r: TernakSusuKulit) => {
      m.set(r.kecamatan, (m.get(r.kecamatan) ?? 0) + r.jumlah);
    });
    return Array.from(m.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [kecRows]);

  // --- Tabel ---
  const tableRows = useMemo(() => {
    const m = new Map<string, { kec: string; tahun: string; jumlah: number }>();
    kecRows.forEach((r: TernakSusuKulit) => {
      const key = `${r.kecamatan}|${r.tahun}`;
      const cur = m.get(key);
      if (cur) cur.jumlah += r.jumlah;
      else m.set(key, { kec: r.kecamatan, tahun: r.tahun, jumlah: r.jumlah });
    });
    return Array.from(m.values()).sort((a, b) =>
      a.kec.localeCompare(b.kec) || a.tahun.localeCompare(b.tahun),
    );
  }, [kecRows]);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8">
        <PageHeader
          icon={<Droplets className="h-6 w-6" />}
          title="Produksi Susu &amp; Kulit"
          subtitle={
            rows && rows.length > 0
              ? `Produksi susu (liter) dari sapi/kerbau dan kulit (lembar) dari kambing/domba per kecamatan. Σ ${fmt(kpiTotal)} ${unitLabel} — diverifikasi backend.`
              : "Memuat data produksi susu & kulit..."
          }
        />

        {/* --- Toolbar filter --- */}
        <Toolbar>
          <ToolbarField label="Kecamatan">
            <select
              value={kec}
              onChange={(e) => setKec(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">Semua ({kecList.length} kec)</option>
              {kecList.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </ToolbarField>
          <ToolbarField label="Grup Produk">
            <div className="mt-1 flex gap-2">
              {GRUP_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGroup(g.value)}
                  className={
                    g.value === group
                      ? "rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white"
                      : "rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  }
                >
                  {g.label}
                </button>
              ))}
            </div>
          </ToolbarField>
          <ToolbarField label="Tampil">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              {[25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </ToolbarField>
        </Toolbar>

        {/* --- Loading / Error / Empty --- */}
        {error && (
          <p className="text-sm text-red-600">Gagal memuat data: {error.message}</p>
        )}
        {!rows && loading && (
          <div className="flex justify-center">
            <LoadingSpinner label="Memuat data susu &amp; kulit…" />
          </div>
        )}
        {rows && rows.length === 0 && (
          <p className="text-sm text-slate-500">
            Server mengembalikan data kosong. Belum ada data produksi susu/kulit.
          </p>
        )}

        {/* --- KPI + charts --- */}
        {rows && rows.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard
                icon={<ClipboardList className="h-5 w-5" />}
                label="Total Produksi"
                value={fmt(kpiTotal)}
                unit={unitLabel}
                color="bg-blue-300"
                hint="Σ produksi pada filter aktif"
              />
              <KpiCard
                icon={<Trophy className="h-5 w-5" />}
                label="Kecamatan Teratas"
                value={topRow?.kecamatan ?? "-"}
                unit={topRow ? `${fmt(topRow.jumlah)} ${unitLabel}` : ""}
                color="bg-amber-300"
                hint="kecamatan dengan produksi terbesar"
              />
              <KpiCard
                icon={<CalendarDays className="h-5 w-5" />}
                label="Tahun Terbaru"
                value={topRow?.tahun ?? "-"}
                unit=""
                color="bg-emerald-300"
                hint="periode data terakhir tersedia"
              />
            </div>

            <SectionCard title="Tren Produksi per Tahun">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periode" />
                    <YAxis tickFormatter={(v) => fmt(v)} />
                    <Tooltip
                      formatter={(v: any) => [fmt(v), group === "susu" ? "Total Liter" : "Total Lembar"]}
                      labelFormatter={(p: any) => `Tahun ${p}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke={group === "susu" ? "#3b82f6" : "#f59e0b"}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {loading && <p className="mt-2 text-xs text-slate-400">Memperbarui data…</p>}
            </SectionCard>

            <SectionCard title={`Sebaran ${unitLabel === "liter" ? "Susu" : "Kulit"} per Kecamatan`}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickFormatter={(n: string) => n.slice(0, 12)} />
                    <YAxis tickFormatter={(v) => fmt(v)} />
                    <Tooltip
                      formatter={(v: any) => [fmt(v), unitLabel]}
                      labelFormatter={(n: any) => `Kec. ${n}`}
                    />
                    <Legend />
                    <Bar dataKey="total" fill={group === "susu" ? "#3b82f6" : "#f59e0b"} name={unitLabel} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </>
        )}

        {/* --- Tabel --- */}
        {rows && rows.length > 0 && kecRows.length > 0 && (
          <SectionCard title="Tabel Data" icon={<Table2 className="h-4 w-4 text-blue-800" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100">
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Kecamatan</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Tahun</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-700">Jumlah</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Satuan</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.slice(0, limit).map((r) => (
                    <tr key={`${r.kec}|${r.tahun}`} className="border-t border-slate-100">
                      <td className="px-3 py-2"><Badge tone="slate">{r.kec}</Badge></td>
                      <td className="px-3 py-2">{r.tahun}</td>
                      <td className="px-3 py-2 text-right">{fmt(r.jumlah)}</td>
                      <td className="px-3 py-2">{unitLabel}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 font-semibold">
                    <td colSpan={2} className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{fmt(tableRows.slice(0, limit).reduce((a, r) => a + r.jumlah, 0))}</td>
                    <td className="px-3 py-2">{unitLabel}</td>
                  </tr>
                </tfoot>
              </table>
              {tableRows.length > limit && (
                <p className="mt-2 text-xs text-slate-500">
                  Menampilkan {limit} dari {tableRows.length} baris.
                </p>
              )}
            </div>
          </SectionCard>
        )}
    </section>
  </DefaultLayout>
  );
}
