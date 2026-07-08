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
      className="bg-white border-2 border-[#171717] rounded-none shadow-[4px_4px_0px_0px_#171717] h-full flex flex-col p-6"
    >
      <div className="flex flex-col mb-4 border-b-2 border-[#171717] pb-3">
        <h4 className="text-xl font-serif font-black uppercase flex items-center gap-2">
          <TrendingUp className="text-emerald-600" />
          Top 15 Desa
        </h4>
        <p className="text-xs font-mono font-bold text-neutral-500 uppercase mt-1">
          Berdasarkan Luas Lahan Sawah Tertinggi (Ha)
        </p>
      </div>
      <div className="h-[300px] w-full mt-2">
        {data.length > 0 ? (
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#171717"
                strokeOpacity={0.1}
                vertical={false}
              />
              <XAxis
                angle={-45}
                axisLine={{ stroke: '#171717', strokeWidth: 2 }}
                className="font-mono font-bold text-[9px]"
                dataKey="desa"
                interval={0}
                textAnchor="end"
                tickLine={{ stroke: '#171717', strokeWidth: 2 }}
              />
              <YAxis
                axisLine={{ stroke: '#171717', strokeWidth: 2 }}
                className="font-mono font-bold text-[10px]"
                tickFormatter={(value) => `${value.toLocaleString("id-ID")}`}
                tickLine={{ stroke: '#171717', strokeWidth: 2 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "2px solid #171717",
                  borderRadius: "0px",
                  boxShadow: "3px 3px 0px 0px #171717",
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
                wrapperStyle={{ 
                  fontFamily: "monospace", 
                  fontWeight: "bold", 
                  fontSize: "11px" 
                }} 
              />
              <Bar
                dataKey="lahanSawah"
                fill="#a7f3d0"
                stroke="#171717"
                strokeWidth={2}
                maxBarSize={32}
                name="Lahan Sawah"
              />
              <Bar
                dataKey="lahanBukanSawah"
                fill="#fde047"
                stroke="#171717"
                strokeWidth={2}
                maxBarSize={32}
                name="Bukan Sawah"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-400 font-mono">
            Memuat data lahan...
          </div>
        )}
      </div>
    </div>
  );
};
