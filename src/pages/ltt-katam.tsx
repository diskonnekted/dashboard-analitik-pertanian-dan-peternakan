/**
 * LTT + Kalender Tanam — halaman placeholder.
 *
 * Data dari `GET /api/v1/ltt-katam` (schema: ltt_katam).
 * UI di-mirror dari /livestock.
 */
import { useEffect, useMemo, useState } from "react";
import { KpiCard, SectionCard, PageHeader } from "@/components/ui";
import DefaultLayout from "@/layouts/default";
import type { LttKatamRow } from "@/services/api";
import { fetchLttKatam } from "@/services/api";

export default function LttKatamPage() {
  const [rows, setRows] = useState<LttKatamRow[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    fetchLttKatam()
      .then((d: LttKatamRow[]) => { if (alive) setRows(d); })
      .catch((e: Error) => { if (alive) setError(e); });
    return () => { alive = false; };
  }, []);

  const kpis = useMemo(() => {
    const totalLuasTanam = (rows ?? []).reduce((s: number, r: LttKatamRow) => s + (r.luas_tanam ?? 0), 0);
    const totalProd = (rows ?? []).reduce((s: number, r: LttKatamRow) => s + (r.produksi_aktual ?? 0), 0);
    const komoditasSet = new Set((rows ?? []).map((r: LttKatamRow) => r.komoditas));
    const lttCount = (rows ?? []).filter((r: LttKatamRow) => r.jenis === "LTT").length;
    return { totalLuasTanam, totalProd, komoditasCount: komoditasSet.size, lttCount };
  }, [rows]);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8">
      <PageHeader
        title="LTT & Kalender Tanam"
        subtitle="Laporan Tanam-Tanam (LTT) dan Kalender tanam per komoditas/kecamatan."
      />

      <div>
        {error && <p className="text-sm text-red-600">Gagal memuat data: {error.message}</p>}
        {!rows && !error && (
          <p className="mt-4 text-sm text-slate-500 animate-pulse">Memuat data LTT & kalender tanam…</p>
        )}
        {rows && rows.length === 0 && (
          <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center">
            <p className="text-slate-600">📋 Belum ada data LTT & Kalender Tanam.</p>
            <p className="mt-1 text-sm text-slate-500">
              Data akan diberikan 23 Sep 2026. UI sudah siap menampilkan chart & tabel.
            </p>
          </div>
        )}

        {rows && rows.length > 0 && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              <KpiCard icon={<span>🌾</span>} label="Total Luas Tanam" value={kpis.totalLuasTanam.toFixed(2)} unit="Ha" />
              <KpiCard icon={<span>📦</span>} label="Prod. Aktual" value={kpis.totalProd.toFixed(2)} unit="Ton" />
              <KpiCard icon={<span>🌍</span>} label="Komoditas" value={String(kpis.komoditasCount)} />
              <KpiCard icon={<span>📋</span>} label="LTT Entry" value={String(kpis.lttCount)} />
            </div>

            <SectionCard title="Tabel Data" className="mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-100">
                      <th className="px-3 py-2 text-left font-semibold">Komoditas</th>
                      <th className="px-3 py-2 text-left font-semibold">Kecamatan</th>
                      <th className="px-3 py-2 text-left font-semibold">Jenis</th>
                      <th className="px-3 py-2 text-right font-semibold">Luas Tanam (Ha)</th>
                      <th className="px-3 py-2 text-right font-semibold">Luas Panen (Ha)</th>
                      <th className="px-3 py-2 text-right font-semibold">Prod. (Ton)</th>
                      <th className="px-3 py-2 text-left font-semibold">Tahun</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r: LttKatamRow, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{r.komoditas}</td>
                        <td className="px-3 py-2">{r.kecamatan}</td>
                        <td className="px-3 py-2">{r.jenis}</td>
                        <td className="px-3 py-2 text-right">{r.luas_tanam?.toFixed(2) ?? "-"}</td>
                        <td className="px-3 py-2 text-right">{r.luas_panen?.toFixed(2) ?? "-"}</td>
                        <td className="px-3 py-2 text-right">{r.produksi_aktual?.toFixed(2) ?? "-"}</td>
                        <td className="px-3 py-2">{r.tahun}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        )}
      </div>
      </section>
    </DefaultLayout>
  );
}
