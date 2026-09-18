import type { ReactNode } from "react";
import { KpiCard } from "@/components/ui";

interface StatWidgetProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: string;
}

/**
 * Dipertahankan demi kompatibilitas halaman dasbor.
 * Visual kini memakai KpiCard (model card dasbor) — satu sumber kebenaran.
 */
export const StatWidget = ({ title, value, icon, trend, trendUp, color }: StatWidgetProps) => (
  <KpiCard icon={icon} label={title} value={value} trend={trend} trendUp={trendUp} color={color} />
);
