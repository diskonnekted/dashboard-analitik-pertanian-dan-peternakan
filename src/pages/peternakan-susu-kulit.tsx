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
import { Droplets } from "lucide-react";
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
    if (kec) out = out.filter((r) => r.kecamatan === kec);
    if (group === "susu") out = out.filter((r) => r.satuan === "liter");
    if (group === "kulit") out = out.filter((r) => r.satuan === "lembar");
    return out;
  }, [rows, kec, group]);

  // --- KPI ---
  const kpiTotal = kecRows.reduce((a, r) => a + r.jumlah_unit, 0);
  const unitLabel = group === "susu" ? "liter" : "lembar";
  const topRow = kecRows.reduce(
    (best, r) => (r.jumlah_unit > best.jumlah_unit ? r : best),
    kecRows[0] ?? null,
  );

  // --- Trend line (Σ per tahun) ---
  const trendData = useMemo(() => {
    const m = new Map<string, number>();
    kecRows.forEach((r) => {
      m.set(r.periode, (m.get(r.periode) ?? 0) + r.jumlah_unit);
    });
    return Array.from(m.entries())
      .map(([periode, total]) => ({ periode, total }))
      .sort((a, b) => a.periode.localeCompare(b.periode));
  }, [kecRows]);

  // --- Bar chart (Σ per kecamatan) ---
  const barData = useMemo(() => {
    const m = new Map<string, number>();
    kecRows.forEach((r) => {
      m.set(r.kecamatan, (m.get(r.kecamatan) ?? 0) + r.jumlah_unit);
    });
    return Array.from(m.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [kecRows]);

  // --- Tabel ---
  const tableRows = useMemo(() => {
    const m = new Map<string, { kec: string; periode: string; jumlah_unit: number }>();
    kecRows.forEach((r) => {
      const key = `${r.kecamatan}|${r.periode}`;
      const cur = m.get(key);
      if (cur) cur.jumlah_unit += r.jumlah_unit;
      else m.set(key, { kec: r.kecamatan, periode: r.periode, jumlah_unit: r.jumlah_unit });
    });
    return Array.from(m.values()).sort((a, b) =>
      a.kec.localeCompare(b.kec) || a.periode.localeCompare(b.periode),
    );
  }, [kecRows]);

  return (
    <DefaultLayout>
      <section className="py-8">
        <div className="container mx-auto px-4 lg:px-8">
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
        <Toolbar className="mt-6">
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
          <p className="mt-6 text-sm text-red-600">Gagal memuat data: {error.message}</p>
        )}
        {!rows && loading && (
          <div className="mt-8 flex justify-center">
            <LoadingSpinner label="Memuat data susu &amp; kulit…" />
          </div>
        )}
        {rows && rows.length === 0 && (
          <p className="mt-8 text-sm text-slate-500">
            Server mengembalikan data kosong. Belum ada data produksi susu/kulit.
          </p>
        )}

        {/* --- KPI + charts --- */}
        {rows && rows.length > 0 && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <KpiCard
                icon={<span className="text-2xl">📊</span>}
                label="Total Produksi"
                value={fmt(kpiTotal)}
                unit={unitLabel}
              />
              <KpiCard
                icon={<span className="text-2xl">🏆</span>}
                label="Kecamatan Teratas"
                value={topRow?.kecamatan ?? "-"}
                unit={topRow ? `${fmt(topRow.jumlah_unit)} ${unitLabel}` : ""}
              />
              <KpiCard
                icon={<span className="text-2xl">📅</span>}
                label="Tahun Terbaru"
                value={topRow?.periode ?? "-"}
                unit=""
              />
            </div>

            <SectionCard title="Tren Produksi per Tahun" className="mt-6">
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

            <SectionCard title={`Sebaran ${unitLabel === "liter" ? "Susu" : "Kulit"} per Kecamatan`} className="mt-6">
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
          <SectionCard title="Tabel Data" className="mt-6">
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
                    <tr key={`${r.kec}|${r.periode}`} className="border-t border-slate-100">
                      <td className="px-3 py-2"><Badge tone="slate">{r.kec}</Badge></td>
                      <td className="px-3 py-2">{r.periode}</td>
                      <td className="px-3 py-2 text-right">{fmt(r.jumlah_unit)}</td>
                      <td className="px-3 py-2">{unitLabel}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 font-semibold">
                    <td colSpan={2} className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{fmt(tableRows.slice(0, limit).reduce((a, r) => a + r.jumlah_unit, 0))}</td>
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
      </div>
    </section>
  </DefaultLayout>
  );
}
