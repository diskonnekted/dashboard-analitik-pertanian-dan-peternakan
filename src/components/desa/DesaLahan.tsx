import { Sprout, Home } from "lucide-react";
import type { LahanDesa } from "../../services/api";
import { EmptyBlock } from "./EmptyBlock";

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
    <section className="bg-white border border-slate-200 rounded-xl p-4">
      <SectionHeader
        icon={<Sprout className="w-4 h-4 text-emerald-600" />}
        title="Penggunaan Lahan"
        subtitle="Luas lahan sawah & bukan sawah (Ha) per tahun."
      />

      <div className="space-y-3">
        {totals.map((t) => (
          <div key={t.tahun}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <span
                  aria-hidden
                  className="
                    inline-block h-3 w-3 rounded-full
                    bg-gradient-to-br from-emerald-400 to-emerald-600
                  "
                />
                Tahun {t.tahun}
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                Total {unit(t.total)} Ha
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Tile
                icon={<Sprout className="w-4 h-4 text-emerald-600" />}
                label="Lahan Sawah"
                value={`${unit(t.sawah)} Ha`}
                ratio={t.total ? t.sawah / t.total : 0}
                accent="emerald"
              />
              <Tile
                icon={<Home className="w-4 h-4 text-amber-600" />}
                label="Lahan Bukan Sawah"
                value={`${unit(t.bukanSawah)} Ha`}
                ratio={t.total ? t.bukanSawah / t.total : 0}
                accent="amber"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="mb-2.5 flex items-start gap-2.5">
      <span
        aria-hidden
        className="
          mt-1 inline-block h-5 w-1 rounded-full
          bg-gradient-to-b from-emerald-500 to-emerald-700
        "
      />
      <div className="flex-1">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 leading-tight">
          {icon}
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
    </header>
  );
}

function Tile({
  icon,
  label,
  value,
  ratio,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ratio: number;
  accent: "emerald" | "amber";
}) {
  const barColor =
    accent === "emerald"
      ? "from-emerald-400 to-emerald-600"
      : "from-amber-400 to-amber-600";

  return (
    <div
      className="
        relative overflow-hidden
        rounded-lg border border-slate-200
        bg-gradient-to-br from-white to-slate-50
        px-3 py-2
      "
    >
      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">
        {icon}
        {label}
      </div>
      <div className="text-base font-bold text-slate-800 tabular-nums">{value}</div>
      {/* mini progress bar sebagai visual cue rasio */}
      <div className="mt-1 h-0.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, ratio * 100)).toFixed(1)}%` }}
        />
      </div>
    </div>
  );
}