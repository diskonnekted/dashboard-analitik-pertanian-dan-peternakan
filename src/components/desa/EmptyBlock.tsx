import { Info } from "lucide-react";

/**
 * EmptyBlock — blok seragam untuk panel yang data-nya belum tersedia.
 * Dipakai bersama oleh DesaLahan, DesaDemografi, DesaTernak, DesaKelembagaan.
 */
interface Props {
  label: string;
  message: string;
}

export function EmptyBlock({ label, message }: Props) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <header className="mb-2.5 flex items-start gap-2">
        <span
          aria-hidden
          className="
            mt-1 inline-block h-4 w-1 rounded-full
            bg-emerald-500
          "
        />
        <div>
          <h2 className="text-base font-bold text-slate-800 leading-tight">{label}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Data agregat tidak tersedia untuk desa ini.
          </p>
        </div>
      </header>

      <div
        className="
          rounded-md border border-dashed border-emerald-200
          bg-emerald-50/40
          px-3 py-3
          flex items-start gap-2.5
          text-xs text-slate-600
        "
      >
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-600" aria-hidden />
        <p className="leading-relaxed">{message}</p>
      </div>
    </section>
  );
}