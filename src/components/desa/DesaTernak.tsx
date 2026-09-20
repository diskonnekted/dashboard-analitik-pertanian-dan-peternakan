import { Beef, Drumstick } from "lucide-react";
import type { St2023DesaExtra } from "../../services/api";
import { EmptyBlock } from "./DesaLahan";

interface Props {
  data: St2023DesaExtra | null;
}

/**
 * Populasi Ternak (BPS ST2023 nested):
 *   sapiPotong, kerbau, kambing, domba, ayamKampung, itik, merpati, unggasLainnya
 * Ditampilkan sebagai stat cards + mini bar visual.
 */
export function DesaTernak({ data }: Props) {
  if (!data) {
    return (
      <EmptyBlock
        label="Populasi Ternak"
        message="Data ternak dari BPS ST2023 belum tersedia untuk desa ini."
      />
    );
  }

  const d = data as unknown as Record<string, unknown>;

  const num = (key: string): number => {
    const v = d[key];
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  };

  const groups = [
    {
      label: "Ternak Besar",
      icon: <Beef className="w-4 h-4 text-red-600" />,
      items: [
        { k: "sapiPotong", l: "Sapi Potong" },
        { k: "kerbau", l: "Kerbau" },
        { k: "kuda", l: "Kuda" },
      ],
    },
    {
      label: "Ternak Kecil",
      icon: <Beef className="w-4 h-4 text-amber-600" />,
      items: [
        { k: "kambing", l: "Kambing" },
        { k: "domba", l: "Domba" },
      ],
    },
    {
      label: "Unggas",
      icon: <Drumstick className="w-4 h-4 text-yellow-600" />,
      items: [
        { k: "ayamKampung", l: "Ayam Kampung" },
        { k: "itik", l: "Itik" },
        { k: "merpati", l: "Merpati" },
        { k: "unggasLainnya", l: "Unggas Lainnya" },
      ],
    },
  ];

  const flat = groups.flatMap((g) => g.items.map((it) => ({ ...it, group: g.label })));
  const max = Math.max(1, ...flat.map((x) => num(x.k)));

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <header className="mb-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Beef className="w-4 h-4 text-red-700" />
          Populasi Ternak
        </h2>
        <p className="text-xs text-slate-500">Populasi ternak & unggas (ekor). Sumber: BPS ST2023.</p>
      </header>

      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              {g.icon}
              {g.label}
            </div>
            <div className="space-y-1.5">
              {g.items.map((it) => {
                const v = num(it.k);
                const pct = Math.round((v / max) * 100);
                return (
                  <div key={it.k} className="flex items-center gap-3">
                    <div className="w-24 sm:w-32 text-xs text-slate-600">{it.l}</div>
                    <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-16 text-right text-xs font-semibold text-slate-700 tabular-nums">
                      {v.toLocaleString("id-ID")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
