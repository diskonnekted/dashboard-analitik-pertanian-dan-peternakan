import { useState } from "react";
import { ShieldCheck, Wheat, Wallet, HeartPulse, CalendarRange } from "lucide-react";
import { FSVA_DATA, FSVA_YEARS, kompositLabel, type FsvaYear } from "../../data/fsva";
import { EmptyBlock } from "./EmptyBlock";

interface Props {
  objectId: number;
}

/**
 * Ketahanan Pangan Desa (FSVA — Badan Pangan Nasional).
 * Menampilkan IKP, indeks komposit, dan enam indikator Tiga Pilar
 * (ketersediaan, keterjangkauan, pemanfaatan) untuk satu desa,
 * dengan pemilih tahun 2021-2024.
 */
export function DesaFsva({ objectId }: Props) {
  const [tahun, setTahun] = useState<FsvaYear>(2024);
  const rows = FSVA_DATA[tahun];
  const row = rows.find((r) => r.objectId === objectId);

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="
              mt-1 inline-block h-5 w-1 rounded-full
              bg-gradient-to-b from-teal-500 to-teal-700
            "
          />
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 leading-tight">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Ketahanan Pangan
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Indeks Ketahanan Pangan (IKP) — FSVA Badan Pangan Nasional.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
          {FSVA_YEARS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setTahun(y)}
              aria-pressed={tahun === y}
              className={`
                rounded-md px-2 py-1 text-[11px] font-semibold transition-colors
                ${tahun === y ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}
              `}
            >
              {y}
            </button>
          ))}
        </div>
      </header>

      {!row ? (
        <EmptyBlock
          label="Ketahanan Pangan"
          message="Data FSVA belum tersedia untuk desa ini."
        />
      ) : (
        <div className="space-y-4">
          {/* IKP + komposit */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat
              label="IKP"
              value={row.ikp.toFixed(1)}
              sub={kompositLabel(row.komposit)}
              tone={toneFor(row.komposit)}
            />
            <Stat
              label="Indeks Komposit"
              value={`${row.komposit} / 6`}
              sub={kompositLabel(row.komposit)}
              tone={toneFor(row.komposit)}
            />
            <Stat
              label="Peringkat"
              value={`#${row.ikpRanking}`}
              sub="dari 278 desa"
              tone="neutral"
            />
          </div>

          {/* enam indikator Tiga Pilar */}
          <div className="space-y-3">
            <Pillar title="Ketersediaan" icon={<Wheat className="w-3.5 h-3.5 text-emerald-600" />}>
              <RatioBar label="Rasio luas lahan pertanian" value={row.rasioLahan} />
              <RatioBar label="Rasio sarana pangan" value={row.rasioSarana} />
            </Pillar>
            <Pillar title="Keterjangkauan" icon={<Wallet className="w-3.5 h-3.5 text-amber-600" />}>
              <RatioBar label="Rasio penduduk miskin desil 1" value={row.rasioMiskin} />
              <RatioBar
                label="Tanpa akses penghubung"
                value={row.tanpaAkses}
                binary
              />
            </Pillar>
            <Pillar title="Pemanfaatan" icon={<HeartPulse className="w-3.5 h-3.5 text-rose-600" />}>
              <RatioBar label="Rasio rumah tangga tanpa air bersih" value={row.tanpaAirBersih} />
              <RatioBar label="Rasio tenaga kesehatan" value={row.rasioNakes} />
            </Pillar>
          </div>

          <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <CalendarRange className="w-3 h-3" />
            Sumber: FSVA Badan Pangan Nasional, tahun {tahun}.
          </p>
        </div>
      )}
    </section>
  );
}

function toneFor(komposit: number): "good" | "fair" | "poor" {
  if (komposit >= 5) return "good";
  if (komposit === 4) return "fair";
  return "poor";
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "good" | "fair" | "poor" | "neutral";
}) {
  const palettes = {
    good: { text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" },
    fair: { text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200" },
    poor: { text: "text-rose-700", bg: "bg-rose-50", ring: "ring-rose-200" },
    neutral: { text: "text-slate-700", bg: "bg-slate-50", ring: "ring-slate-200" },
  };
  const p = palettes[tone];

  return (
    <div className={`rounded-lg ring-1 ${p.ring} ${p.bg} px-3 py-2.5`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${p.text}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
  );
}

function Pillar({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        {icon}
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RatioBar({
  label,
  value,
  binary,
}: {
  label: string;
  value: number;
  binary?: boolean;
}) {
  const pct = binary ? (value === 1 ? 100 : 0) : Math.min(100, Math.max(0, value * 100));
  const text = binary ? (value === 1 ? "Ya" : "Tidak") : `${(value * 100).toFixed(1)}%`;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800 tabular-nums">{text}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200/70">
        <div
          className="h-1.5 rounded-full bg-slate-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
