/**
 * Kewirausahaan: KWT, Pokdakan, Poklahsar, Pokmamas.
 *
 * Data dari `GET /api/v1/kewirausahaan/kwt` (schema: kwt_kelompok_wanita_tani).
 * UI di-mirror dari /livestock (chart line + bar, KPI, tabel).
 */
import { useEffect, useMemo, useState } from "react";
import { KpiCard, SectionCard, PageHeader } from "@/components/ui";
import type { KwtRow } from "@/services/api";
import { fetchKwt } from "@/services/api";

export default function KewirausahaanKwtPage() {
  const [rows, setRows] = useState<KwtRow[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    fetchKwt()
      .then((d: KwtRow[]) => { if (alive) setRows(d); })
      .catch((e: Error) => { if (alive) setError(e); });
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalAnggota = 0;
    (rows ?? []).forEach((r: KwtRow) => {
      counts[r.jenis] = (counts[r.jenis] ?? 0) + 1;
      totalAnggota += r.jumlah_anggota ?? 0;
    });
    return { counts, totalAnggota };
  }, [rows]);

  return (
    <>
      <PageHeader
        title="Kelompok Wanita Tani (KWT)"
        subtitle="Kelompok Wanita Tani, Pokdakan, Poklahsar, dan Pokmamas per desa/kecamatan."
      />

      <div className="container mx-auto py-6 px-4 lg:px-8">
        {error && <p className="text-sm text-red-600">Gagal memuat data: {error.message}</p>}
        {!rows && !error && (
          <p className="mt-4 text-sm text-slate-500 animate-pulse">Memuat data kelompok wanita tani…</p>
        )}
        {rows && rows.length === 0 && (
          <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center">
            <p className="text-slate-600">📋 Belum ada data KWT.</p>
            <p className="mt-1 text-sm text-slate-500">
              Data akan diberikan 23 Sep 2026. UI sudah siap menampilkan chart & tabel.
            </p>
          </div>
        )}

        {rows && rows.length > 0 && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              <KpiCard icon={<span>📊</span>} label="Total KWT" value={String(Object.values(stats.counts).reduce((a, b) => a + b, 0))} />
              <KpiCard icon={<span>🐄</span>} label="KWT" value={String(stats.counts["KWT"] ?? 0)} />
              <KpiCard icon={<span>👩‍🌾</span>} label="Pokdakan" value={String(stats.counts["Pokdakan"] ?? 0)} />
              <KpiCard icon={<span>👥</span>} label="Anggota" value={String(stats.totalAnggota)} unit="org" />
            </div>

            <SectionCard title="Tabel Data" className="mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-100">
                      <th className="px-3 py-2 text-left font-semibold">Nama</th>
                      <th className="px-3 py-2 text-left font-semibold">Jenis</th>
                      <th className="px-3 py-2 text-left font-semibold">Kecamatan</th>
                      <th className="px-3 py-2 text-left font-semibold">Desa</th>
                      <th className="px-3 py-2 text-right font-semibold">Anggota</th>
                      <th className="px-3 py-2 text-left font-semibold">Produk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r: KwtRow) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2">{r.nama_kelompok}</td>
                        <td className="px-3 py-2">{r.jenis}</td>
                        <td className="px-3 py-2">{r.kecamatan}</td>
                        <td className="px-3 py-2">{r.desa}</td>
                        <td className="px-3 py-2 text-right">{r.jumlah_anggota ?? "-"}</td>
                        <td className="px-3 py-2">{r.produk_andalan ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </>
  );
}
