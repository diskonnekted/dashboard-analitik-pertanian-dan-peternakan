import { Users, Wheat, Fish, Sprout } from "lucide-react";
import type { St2023DesaExtra } from "../../services/api";
import { EmptyBlock } from "./DesaLahan";

interface Props {
  data: St2023DesaExtra | null;
}

/**
 * Demografi Pertanian (BPS ST2023): rumah tangga, petani, perikanan.
 * Data "ternak" ada di komponen terpisah (DesaTernak) — nested object.
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

  const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

  const rt = num((data as unknown as Record<string, unknown>).rumahTanggaPetani);
  const petani = num((data as unknown as Record<string, unknown>).petani);
  const rtPerik = num((data as unknown as Record<string, unknown>).rtPerikanan);
  const rtTangkap = num((data as unknown as Record<string, unknown>).rtPerikananTangkap);
  const rtBudidaya = num((data as unknown as Record<string, unknown>).rtPerikananBudidaya);

  const tiles = [
    { icon: <Users className="w-4 h-4 text-sky-600" />, label: "RT Petani", value: rt },
    { icon: <Users className="w-4 h-4 text-sky-700" />, label: "Petani", value: petani },
    { icon: <Fish className="w-4 h-4 text-cyan-600" />, label: "RT Perikanan", value: rtPerik },
    { icon: <Fish className="w-4 h-4 text-cyan-700" />, label: "RT Tangkap", value: rtTangkap },
    { icon: <Sprout className="w-4 h-4 text-emerald-600" />, label: "RT Budidaya", value: rtBudidaya },
  ];

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <header className="mb-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Wheat className="w-4 h-4 text-amber-600" />
          Demografi Pertanian (BPS ST2023)
        </h2>
        <p className="text-xs text-slate-500">Rumah tangga pertanian & perikanan.</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">
              {t.icon}
              {t.label}
            </div>
            <div className="text-base font-bold text-slate-800">
              {t.value.toLocaleString("id-ID")}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
