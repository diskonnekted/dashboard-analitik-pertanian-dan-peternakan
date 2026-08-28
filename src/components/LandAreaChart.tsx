import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { LahanDesa } from "@/services/api";

interface LandAreaChartProps {
  data: LahanDesa[];
}

export const LandAreaChart = ({ data }: LandAreaChartProps) => {
  const chartData = [...data]
    .sort((a, b) => b.lahanSawah - a.lahanSawah)
    .slice(0, 15)
    .map((item) => ({
      ...item,
      desa: item.desa.split(" ")[0].substring(0, 12).toUpperCase(),
    }));

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col p-6"
    >
      <div className="flex flex-col mb-4 border-b border-slate-200 pb-3">
        <h4 className="text-lg font-mono font-bold uppercase flex items-center gap-2 tracking-wide">
          <TrendingUp className="text-emerald-600" />
          Top 15 Desa
        </h4>
        <p className="text-xs font-mono font-bold text-slate-500 uppercase mt-1">
          Berdasarkan Luas Lahan Sawah Tertinggi (Ha)
        </p>
      </div>
      <div className="h-[420px] w-full mt-2">
        {data.length > 0 ? (
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 90 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#64748b"
                strokeOpacity={0.1}
                vertical={false}
              />
              <XAxis
                angle={-45}
                axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                className="font-mono font-bold text-[8px]"
                dataKey="desa"
                interval={0}
                textAnchor="end"
                height={70}
                tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }}
                tickLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
              />
              <YAxis
                width={70}
                axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                className="font-mono font-bold text-[9px]"
                tickFormatter={(value) => `${value.toLocaleString("id-ID")}`}
                tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }}
                tickLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  fontSize: "11px",
                }}
                cursor={{ fill: "rgba(0,0,0,0.05)" }}
                formatter={(value: any) => [
                  `${Number(value || 0).toLocaleString("id-ID")} Ha`,
                  "",
                ]}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => <span className="text-slate-800 uppercase">{value}</span>}
                wrapperStyle={{
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  fontSize: "11px"
                }}
              />
              <Bar
                dataKey="lahanSawah"
                fill="#10b981"
                stroke="#64748b"
                strokeWidth={1}
                maxBarSize={32}
                name="Lahan Sawah"
              />
              <Bar
                dataKey="lahanBukanSawah"
                fill="#f59e0b"
                stroke="#64748b"
                strokeWidth={1}
                maxBarSize={32}
                name="Bukan Sawah"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 font-mono">
            Memuat data lahan...
          </div>
        )}
      </div>
    </div>
  );
};
