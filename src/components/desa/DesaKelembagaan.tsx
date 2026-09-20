import { Users2, Tractor, Fish, Trees, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { KelompokTaniRow } from "../../services/api";
import { EmptyBlock } from "./EmptyBlock";

interface Props {
  data: KelompokTaniRow[];
}

/**
 * Kelembagaan Pertanian — agregasi per desa:
 *   - Kelompok tani (jumlah + total anggota)
 *   - Kelompok perikanan (jumlah + total anggota)
 *   - Gapoktan (jumlah + total anggota)
 *   - KTH (Kelompok Tani Hutan) bila ada field
 */
export function DesaKelembagaan({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <EmptyBlock
        label="Kelembagaan Pertanian"
        message="Data kelompok tani/perikanan belum tersedia untuk desa ini."
      />
    );
  }

  const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const field = (row: Record<string, unknown>, k: string): number => num(row[k]);
  let sumKT = 0, sumAnggotaTani = 0;
  let sumKP = 0, sumAnggotaPerik = 0;
  let sumGap = 0, sumAnggotaGap = 0;
  let sumKTH = 0;
  let sumKTHPemula = 0;
  let sumKTHMadya = 0;
  let sumKTHUtama = 0;

  for (const r of data) {
    const row = r as unknown as Record<string, unknown>;
    sumKT += field(row, "kelompokTani");
    sumAnggotaTani += field(row, "anggotaTani");
    sumKP += field(row, "kelompokPerikanan");
    sumAnggotaPerik += field(row, "anggotaPerikanan");
    sumGap += field(row, "gapoktan");
    sumAnggotaGap += field(row, "anggotaGapoktan");
    sumKTH += field(row, "kelompokTaniHutan");
    sumKTHPemula += field(row, "kthPemula");
    sumKTHMadya += field(row, "kthMadya");
    sumKTHUtama += field(row, "kthUtama");
  }

  const tiles = [
    {
      Icon: Users2,
      iconColor: "text-emerald-700",
      accent: "from-emerald-500 to-teal-500",
      label: "Kelompok Tani",
      value: sumKT,
      extra: sumAnggotaTani ? `${sumAnggotaTani.toLocaleString("id-ID")} anggota` : undefined,
    },
    {
      Icon: Fish,
      iconColor: "text-cyan-700",
      accent: "from-cyan-500 to-blue-500",
      label: "Kelompok Perikanan",
      value: sumKP,
      extra: sumAnggotaPerik ? `${sumAnggotaPerik.toLocaleString("id-ID")} anggota` : undefined,
    },
    {
      Icon: Tractor,
      iconColor: "text-amber-700",
      accent: "from-amber-500 to-orange-500",
      label: "Gapoktan",
      value: sumGap,
      extra: sumAnggotaGap ? `${sumAnggotaGap.toLocaleString("id-ID")} anggota` : undefined,
    },
    {
      Icon: Trees,
      iconColor: "text-green-700",
      accent: "from-green-500 to-emerald-600",
      label: "KTH (Hutan)",
      value: sumKTH,
      extra: sumKTH ? `${sumKTHPemula}p / ${sumKTHMadya}m / ${sumKTHUtama}u` : undefined,
    },
  ];

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4">
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
            <Users2 className="w-4 h-4 text-emerald-700" />
            Kelembagaan Pertanian
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Kelompok tani, perikanan, gapoktan, dan KTH.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="
              relative overflow-hidden
              rounded-lg border border-slate-200 bg-white
              px-3 py-2
              hover:border-slate-300 transition-colors
            "
          >
            {/* accent bar di atas */}
            <span
              aria-hidden
              className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${t.accent}`}
            />
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">
              <t.Icon className={`w-3.5 h-3.5 ${t.iconColor}`} />
              {t.label}
            </div>
            <div className="text-base font-bold text-slate-800 tabular-nums">
              {t.value.toLocaleString("id-ID")}
            </div>
            {t.extra && (
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">{t.extra}</div>
            )}
          </div>
        ))}
      </div>

      {/* CTA ringkas */}
      <div
        className="
          mt-3 rounded-md
          bg-slate-50 ring-1 ring-slate-200
          px-3 py-2
          flex items-center gap-2
          text-[11px] text-slate-500
        "
      >
        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
        <p className="leading-snug">
          Daftar per-kelompok lihat di{" "}
          <Link
            to="/farmers"
            className="font-semibold text-emerald-700 hover:text-emerald-800 underline decoration-emerald-300 underline-offset-2"
          >
            halaman Kelompok Tani
          </Link>
          .
        </p>
      </div>
    </section>
  );
}