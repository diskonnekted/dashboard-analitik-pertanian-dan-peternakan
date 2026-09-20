import { Users, Sprout, Fish, Anchor, Sailboat } from "lucide-react";
import type { St2023DesaExtra } from "../../services/api";
import { EmptyBlock } from "./EmptyBlock";

interface Props {
  data: St2023DesaExtra | null;
}

/**
 * Demografi Pertanian (BPS ST2023) — kartu-kartu ringkas per kategori.
 */
export function DesaDemografi({ data }: Props) {
  if (!data) {
    return (
      <EmptyBlock
        label="Demografi Pertanian"
        message="Data BPS ST2023 belum tersedia untuk desa ini."
      />
    );
  }

  const tiles: Array<{
    label: string;
    value: number | null | undefined;
    icon: React.ReactNode;
    accent: "emerald" | "blue" | "cyan";
  }> = [
    {
      label: "RT Pertanian",
      value: data.rumahTanggaPetani,
      icon: <Sprout className="w-4 h-4 text-emerald-600" />,
      accent: "emerald",
    },
    {
      label: "Petani",
      value: data.petani,
      icon: <Users className="w-4 h-4 text-emerald-600" />,
      accent: "emerald",
    },
    {
      label: "RTUP (Kelompok)",
      value: data.rtup,
      icon: <Users className="w-4 h-4 text-blue-600" />,
      accent: "blue",
    },
    {
      label: "Anggota Kelompok",
      value: data.rtAnggotaKelompok,
      icon: <Users className="w-4 h-4 text-blue-600" />,
      accent: "blue",
    },
    {
      label: "Bukan Anggota Kelompok",
      value: data.rtBukanAnggotaKelompok,
      icon: <Users className="w-4 h-4 text-blue-600" />,
      accent: "blue",
    },
    {
      label: "RT Perikanan",
      value: data.rtPerikanan,
      icon: <Fish className="w-4 h-4 text-cyan-600" />,
      accent: "cyan",
    },
    {
      label: "RT Budidaya Ikan",
      value: data.rtPerikananBudidaya,
      icon: <Anchor className="w-4 h-4 text-cyan-600" />,
      accent: "cyan",
    },
    {
      label: "RT Tangkap Ikan",
      value: data.rtPerikananTangkap,
      icon: <Sailboat className="w-4 h-4 text-cyan-600" />,
      accent: "cyan",
    },
  ];

  const visible = tiles.filter((t) => t.value != null);

  if (visible.length === 0) {
    return (
      <EmptyBlock
        label="Demografi Pertanian"
        message="Data BPS ST2023 belum tersedia untuk desa ini."
      />
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4">
      <header className="mb-2.5 flex items-start gap-2.5">
        <span
          aria-hidden
          className="
            mt-1 inline-block h-5 w-1 rounded-full
            bg-gradient-to-b from-blue-500 to-blue-700
          "
        />
        <div className="flex-1">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 leading-tight">
            <Users className="w-4 h-4 text-blue-600" />
            Demografi Pertanian
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Rumah tangga & pelaku utama pertanian (BPS ST2023).
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((t) => (
          <Tile
            key={t.label}
            icon={t.icon}
            label={t.label}
            value={t.value as number}
            accent={t.accent}
          />
        ))}
      </div>
    </section>
  );
}

function Tile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: "emerald" | "blue" | "cyan";
}) {
  const accentMap: Record<string, { bg: string; ring: string; ringHover: string }> = {
    emerald: {
      bg: "from-emerald-50 to-white",
      ring: "ring-emerald-100",
      ringHover: "group-hover:ring-emerald-300",
    },
    blue: {
      bg: "from-blue-50 to-white",
      ring: "ring-blue-100",
      ringHover: "group-hover:ring-blue-300",
    },
    cyan: {
      bg: "from-cyan-50 to-white",
      ring: "ring-cyan-100",
      ringHover: "group-hover:ring-cyan-300",
    },
  };
  const c = accentMap[accent];

  return (
    <div
      className={`
        group relative overflow-hidden
        rounded-lg ring-1 ${c.ring} ${c.ringHover}
        bg-gradient-to-br ${c.bg}
        px-3 py-2
        transition-shadow hover:shadow-sm
      `}
    >
      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">
        {icon}
        {label}
      </div>
      <div className="text-base font-bold text-slate-800 tabular-nums">
        {value.toLocaleString("id-ID")}
      </div>
    </div>
  );
}