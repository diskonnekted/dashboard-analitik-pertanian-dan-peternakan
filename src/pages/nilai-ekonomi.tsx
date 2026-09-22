/**
 * Nilai Ekonomi — halaman placeholder.
 * Data dari GET /api/v1/nilai-ekonomi (schema: nilai_ekonomi_tahunan).
 * UI di-mirror dari /livestock.
 */
import { useEffect, useMemo, useState } from "react";
import { KpiCard, SectionCard, PageHeader } from "@/components/ui";
import DefaultLayout from "@/layouts/default";
import type { NilaiEkonomiRow } from "@/services/api";
import { fetchNilaiEkonomi } from "@/services/api";

export default function NilaiEkonomiPage() {
  const [rows, setRows] = useState<NilaiEkonomiRow[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    fetchNilaiEkonomi()
      .then((d: NilaiEkonomiRow[]) => { if (alive) setRows(d); })
      .catch((e: Error) => { if (alive) setError(e); });
    return () => { alive = false; };
  }, []);

  const kpis = useMemo(() => {
    const total = (rows ?? []).reduce((s: number, r: NilaiEkonomiRow) => s + (r.nilai_rupiah ?? 0), 0);
    const bidangSet = new Set((rows ?? []).map((r: NilaiEkonomiRow) => r.bidang));
    const tahunSet = new Set((rows ?? []).map((r: NilaiEkonomiRow) => r.tahun));
    return {
      total,
      bidangCount: bidangSet.size,
      tahunList: Array.from(tahunSet).sort(),
    };
  }, [rows]);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8">
      <PageHeader title="Nilai Ekonomi Pertanian" subtitle="Nilai ekonomi agregat per bidang, tahun, dan triwulan (dalam Rupiah)." />
      <div>
        {error && <p className="text-sm text-red-600">Gagal memuat data: {error.message}</p>}
        {!rows && !error && <p className="mt-4 text-sm text-slate-500 animate-pulse">Memuat nilai ekonomi…</p>}
        {rows && rows.length === 0 && (
          <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center">
            <p className="text-slate-600">📋 Belum ada data nilai ekonomi.</p>
            <p className="mt-1 text-sm text-slate-500">Data akan diberikan 23 Sep 2026. UI sudah siap menampilkan chart & tabel.</p>
          </div>
        )}
        {rows && rows.length > 0 && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <KpiCard icon={<span>💰</span>} label="Total Nilai" value={(kpis.total / 1e9).toFixed(2)} unit="Miliar Rp" />
              <KpiCard icon={<span>🌾</span>} label="Bidang" value={String(kpis.bidangCount)} />
              <KpiCard icon={<span>📅</span>} label="Rentang Tahun" value={`${kpis.tahunList[0] ?? "-"} – ${kpis.tahunList[kpis.tahunList.length - 1] ?? "-"}`} />
            </div>
            <SectionCard title="Tabel Data" className="mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-slate-100"><th className="px-3 py-2 text-left">Bidang</th><th className="px-3 py-2 text-left">Komoditas</th><th className="px-3 py-2 text-left">Tahun</th><th className="px-3 py-2 text-left">Triw.</th><th className="px-3 py-2 text-right">Volume</th><th className="px-3 py-2 text-right">Nilai (Rp)</th><th className="px-3 py-2 text-left">Satuan</th></tr></thead>
                  <tbody>
                    {rows.slice(0, 50).map((r: NilaiEkonomiRow, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{r.bidang}</td>
                        <td className="px-3 py-2">{r.komoditas ?? "-"}</td>
                        <td className="px-3 py-2">{r.tahun}</td>
                        <td className="px-3 py-2">{r.triwulan ?? "-"}</td>
                        <td className="px-3 py-2 text-right">{r.volume?.toLocaleString("id-ID") ?? "-"}</td>
                        <td className="px-3 py-2 text-right">{(r.nilai_rupiah ?? 0).toLocaleString("id-ID")}</td>
                        <td className="px-3 py-2">{r.satuan}</td>
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
