import { ReactNode } from "react";

interface StatWidgetProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: string;
}

export const StatWidget = ({
  title,
  value,
  icon,
  trend,
  trendUp,
  color = "bg-blue-50 text-blue-600",
}: StatWidgetProps) => {
  return (
    <div
      className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-row items-center gap-4 transition-all duration-200 hover:shadow-md hover:border-slate-300 cursor-pointer"
    >
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-slate-800 transition-transform duration-250 ${color}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <p className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-2xl font-sans font-bold tracking-tight text-slate-800">{value}</p>
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
      </div>
    </div>
  );
};
