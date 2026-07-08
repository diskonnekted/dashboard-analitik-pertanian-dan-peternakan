import { ReactNode } from "react";

interface StatWidgetProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export const StatWidget = ({
  title,
  value,
  icon,
  trend,
  trendUp,
}: StatWidgetProps) => {
  return (
    <div
      className="bg-white border-2 border-[#171717] rounded-none shadow-[4px_4px_0px_0px_#171717] p-5 flex flex-row items-center gap-4"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border-2 border-[#171717] bg-emerald-100 text-[#171717] shadow-[2px_2px_0px_0px_#171717] rounded-none">
        {icon}
      </div>
      <div className="flex flex-col">
        <p className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-wider">{title}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-2xl font-serif font-black tracking-tight">{value}</p>
          {trend && (
            <span
              className={`text-xs font-mono font-bold px-1.5 py-0.5 border border-[#171717] bg-white ${
                trendUp ? "text-emerald-600" : "text-red-600"
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
