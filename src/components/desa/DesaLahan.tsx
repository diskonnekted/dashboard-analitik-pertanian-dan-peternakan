import { Sprout, Home } from "lucide-react";
import type { LahanDesa } from "../../services/api";

interface Props {
  data: LahanDesa[];
}

/**
 * Penggunaan Lahan (Stat cards) — breakdown sawah & bukan sawah, dipisah
 * per tahun jika data multi-tahun tersedia.
 */
export function DesaLahan({ data }: Props) {
  if (!data || data.length === 0) {
    return <EmptyBlock label="Penggunaan Lahan" message="Belum ada data lahan untuk desa ini." />;
  }

  // Kelompokkan berdasarkan tahun
  const byTahun = new Map<string, LahanDesa[]>();
  for (const r of data) {
    const t = r.tahun || "—";
    if (!byTahun.has(t)) byTahun.set(t, []);
    byTahun.get(t)!.push(r);
  }

  // Akumulasikan (kalau ada > 1 row per desa per tahun — biasanya hanya 1, tapi defensive)
  const totals: { tahun: string; sawah: number; bukanSawah: number; total: number }[] = [];
  for (const [tahun, rows] of [...byTahun.entries()].sort()) {
    const sawah = rows.reduce((a, r) => a + (r.lahanSawah || 0), 0);
    const bs = rows.reduce((a, r) => a + (r.lahanBukanSawah || 0), 0);
    const allJumlah = rows.reduce((a, r) => a + (r.jumlah || 0), 0);
    totals.push({ tahun, sawah, bukanSawah: bs, total: allJumlah || sawah + bs });
  }

  const unit = (n: number): string =>
    n.toLocaleString("id-ID", { maximumFractionDigits: 2 });

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <header className="mb-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Sprout className="w-4 h-4 text-emerald-600" />
          Penggunaan Lahan
        </h2>
        <p className="text-xs text-slate-500">Luas lahan sawah & bukan sawah (Ha) per tahun.</p>
      </header>

      <div className="space-y-4">
        {totals.map((t) => (
          <div key={t.tahun}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-slate-700">Tahun {t.tahun}</span>
              <span className="text-xs text-slate-500">Total {unit(t.total)} Ha</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Tile
                icon={<Sprout className="w-4 h-4 text-emerald-600" />}
                label="Lahan Sawah"
                value={`${unit(t.sawah)} Ha`}
              />
              <Tile
                icon={<Home className="w-4 h-4 text-amber-600" />}
                label="Lahan Bukan Sawah"
                value={`${unit(t.bukanSawah)} Ha`}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">
        {icon}
        {label}
      </div>
      <div className="text-base font-bold text-slate-800">{value}</div>
    </div>
  );
}

function EmptyBlock({ label, message }: { label: string; message: string }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <header className="mb-2">
        <h2 className="text-lg font-bold text-slate-800">{label}</h2>
      </header>
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        {message}
      </div>
    </section>
  );
}

export { EmptyBlock };
