import { Card } from "@heroui/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { month: "Jan", padi: 4000, jagung: 2400 },
  { month: "Feb", padi: 3000, jagung: 1398 },
  { month: "Mar", padi: 2000, jagung: 9800 },
  { month: "Apr", padi: 2780, jagung: 3908 },
  { month: "Mei", padi: 1890, jagung: 4800 },
  { month: "Jun", padi: 2390, jagung: 3800 },
  { month: "Jul", padi: 3490, jagung: 4300 },
];

export const ProductionChart = () => {
  return (
    <Card
      className="border-none bg-background/60 dark:bg-default-100/50 shadow-sm"
    >
      <div className="flex flex-col items-start px-6 pb-0 pt-6">
        <h4 className="text-large font-medium">Tren Produksi Pangan (Ton)</h4>
        <p className="text-small text-default-500">
          Prediksi hasil panen 7 bulan terakhir
        </p>
      </div>
      <div className="px-2 py-4">
        <div className="h-[300px] w-full">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPadi" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#17c964" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#17c964" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorJagung" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#f5a524" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f5a524" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                strokeOpacity={0.2}
                vertical={false}
              />
              <XAxis
                axisLine={false}
                dataKey="month"
                fontSize={12}
                strokeOpacity={0.5}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                fontSize={12}
                strokeOpacity={0.5}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "10px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Area
                dataKey="padi"
                fill="url(#colorPadi)"
                fillOpacity={1}
                stroke="#17c964"
                type="monotone"
              />
              <Area
                dataKey="jagung"
                fill="url(#colorJagung)"
                fillOpacity={1}
                stroke="#f5a524"
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};
