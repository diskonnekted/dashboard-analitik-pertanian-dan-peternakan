import type { ReactNode } from "react";

/* =========================================================
   SISPERTANI UI kit — gaya government (opsi B)
   Kartu KPI memakai model card dasbor (StatWidget).
   ========================================================= */

/* ---------- Kop halaman ---------- */
export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-800 text-white">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold leading-tight text-slate-800">{title}</h1>
          {subtitle && <p className="mt-0.5 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ---------- Kartu KPI — model card dasbor ---------- */
export function KpiCard({
  icon,
  label,
  value,
  unit,
  color = "bg-blue-50 text-blue-600",
  trend,
  trendUp = true,
  hint,
  className = "",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  unit?: string;
  color?: string;
  trend?: string;
  trendUp?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-row items-center gap-4 text-left transition-all duration-200 hover:shadow-md hover:border-slate-300 ${className}`}
    >
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-slate-800 ${color}`}>
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <p className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-2 mt-1 flex-wrap">
          <p className="text-2xl font-sans font-bold tracking-tight text-slate-800 tabular-nums break-words">
            {value}
          </p>
          {unit && <span className="text-xs font-semibold text-slate-400">{unit}</span>}
          {trend && (
            <span
              className={`text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full ${
                trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              }`}
            >
              {trendUp ? "↑" : "↓"} {trend}
            </span>
          )}
        </div>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

/* ---------- Panel konten ---------- */
export function SectionCard({
  title,
  icon,
  actions,
  children,
  className = "",
  bodyClassName = "p-5",
}: {
  title?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`bg-white border border-slate-200 rounded-lg shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-200">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            {icon}
            {title}
          </h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/* ---------- Toolbar filter ---------- */
export function Toolbar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex flex-wrap items-end gap-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function ToolbarField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-left ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

/* ---------- Badge ---------- */
const badgeTones: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600",
  blue: "bg-blue-50 text-blue-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  violet: "bg-violet-50 text-violet-700",
};

export function Badge({
  tone = "slate",
  children,
  className = "",
}: {
  tone?: keyof typeof badgeTones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeTones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ---------- Pill tren naik/turun ---------- */
export function TrendPill({
  value,
  label,
  className = "",
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${
        up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      } ${className}`}
    >
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
      {label && <span className="text-slate-400">· {label}</span>}
    </span>
  );
}

/* ---------- Loading spinner ---------- */
export function LoadingSpinner({
  height = "h-[300px]",
  label,
}: {
  height?: string;
  label?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${height}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-800" />
      {label && <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>}
    </div>
  );
}
