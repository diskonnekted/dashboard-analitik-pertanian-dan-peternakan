/**
 * Komoditas & Varietas Unggulan — halaman placeholder.
 *
 * Data akan mengalir dari `GET /api/v1/komoditas-unggulan` (backend route / schema `komoditas_unggulan`).
 * UI di-mirror dari pola /livestock: chart line (produksi tren), bar (per kecamatan), KPI, tabel.
 */
import { useEffect, useMemo, useState } from "react";
import { KpiCard, SectionCard, PageHeader } from "@/components/ui";
import type { KomoditasUnggulanRow } from "@/services/api";
import { fetchKomoditasUnggulan } from "@/services/api";

export default function KomoditasUnggulanPage() {
  const [rows, setRows] = useState<KomoditasUnggulanRow[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    fetchKomoditasUnggulan()
      .then((d: KomoditasUnggulanRow[]) => { if (alive) setRows(d); })
      .catch((e: Error) => { if (alive) setError(e); });
    return () => { alive = false; };
  }, []);

  const kpis = useMemo(() => {
    const komoditasSet = new Set((rows ?? []).map((r: KomoditasUnggulanRow) => r.komoditas));
    const varietasSet = new Set((rows ?? []).map((r: KomoditasUnggulanRow) => r.varietas));
    const totalLuas = (rows ?? []).reduce((s: number, r: KomoditasUnggulanRow) => s + (r.luas_lahan ?? 0), 0);
    return { jumlahKomoditas: komoditasSet.size, jumlahVarietas: varietasSet.size, totalLuas };
  }, [rows]);

  return (
    <>
      <PageHeader
        title="Komoditas Unggulan & Varietas"
        subtitle="Data komoditas unggulan dan varietas per kecamatan (bidang pertanian, hortikultura, perkebunan, peternakan, perikanan)."
      />

      <div className="container mx-auto py-6 px-4 lg:px-8">
        {/* --- Loading / Error / Empty --- */}
        {error && <p className="text-sm text-red-600">Gagal memuat data: {error.message}</p>}
        {!rows && !error && (
          <p className="mt-4 text-sm text-slate-500 animate-pulse">Memuat komoditas unggulan…</p>
        )}
        {rows && rows.length === 0 && (
          <EmptyBlock
            label="Komoditas unggulan"
            action={{ label: "Coming Soon", onClick: () => {} }}
            note="Data akan diberikan 23 Sep 2026. UI sudah siap menampilkan chart & tabel."
          />
        )}

        {/* --- KPI --- */}
        {rows && rows.length > 0 && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <KpiCard icon={<span>🌾</span>} label="Komoditas" value={String(kpis.jumlahKomoditas)} />
              <KpiCard icon={<span>🧬</span>} label="Varietas" value={String(kpis.jumlahVarietas)} />
              <KpiCard icon={<span>🌍</span>} label="Total Luas" value={kpis.totalLuas.toFixed(2)} unit="Ha" />
            </div>

            {/* --- Tabel data --- */}
            <SectionCard title="Tabel Data" className="mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-100">
                      <th className="px-3 py-2 text-left font-semibold">Komoditas</th>
                      <th className="px-3 py-2 text-left font-semibold">Varietas</th>
                      <th className="px-3 py-2 text-left font-semibold">Kecamatan</th>
                      <th className="px-3 py-2 text-right font-semibold">Luas (Ha)</th>
                      <th className="px-3 py-2 text-right font-semibold">Prod. (Ton)</th>
                      <th className="px-3 py-2 text-left font-semibold">Tahun</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{r.komoditas}</td>
                        <td className="px-3 py-2">{r.varietas}</td>
                        <td className="px-3 py-2">{r.kecamatan ?? "-"}</td>
                        <td className="px-3 py-2 text-right">{r.luas_lahan?.toFixed(2) ?? "-"}</td>
                        <td className="px-3 py-2 text-right">{r.produksi?.toFixed(2) ?? "-"}</td>
                        <td className="px-3 py-2">{r.tahun ?? "-"}</td>
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
