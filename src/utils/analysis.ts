/**
 * Modul Analisis Statistik untuk Pertanian
 * Berisi kalkulasi ilmiah yang dipakai di halaman Rekomendasi & ChatBot "Si Pertani"
 *
 * Referensi ilmiah:
 * - Koefisien Variasi (CV): Pearson (1895) - ukuran dispersi relatif
 * - Indeks Herfindahl-Hirschman (HHI): Hirschman (1964) - konsentrasi geografis
 * - Linier Regression Least Squares: Gauss (1809, 1823)
 * - Estimasi Nilai Ekonomi: harga acuan pasar Kabupaten Banjarnegara 2024-2025
 */

export interface SectorStats {
  mean: number;
  median: number;
  stdDev: number;
  cv: number; // Coefficient of Variation (%)
  min: number;
  max: number;
  count: number;
  total: number;
  productivity?: number; // ton/ha (jika ada data luas)
}

export interface ConcentrationMetrics {
  hhi: number; // 0-10000, <1500 rendah, 1500-2500 sedang, >2500 tinggi
  top1Share: number; // share kecamatan terbesar (%)
  top3Share: number; // share 3 kecamatan terbesar (%)
  giniLike: number; // 0-1, ukuran ketimpangan
  interpretation: "Sangat Terkonsentrasi" | "Terkonsentrasi" | "Sedang" | "Merata";
}

export interface TrendProjection {
  slope: number;
  intercept: number;
  r2: number;
  projectionNext: number;
  pctChange: number;
  direction: "Naik" | "Turun" | "Stabil";
}

export interface EconomicValuation {
  gabah: number; // Rp
  sapi: number;
  kambing: number;
  ikan: number;
  totalEst: number;
}

const REFERENCE_PRICES = {
  gabahKering: 6000, // Rp/kg
  sapi: 18_000_000, // Rp/ekor
  kambing: 3_000_000, // Rp/ekor
  ikanNila: 35_000, // Rp/kg
} as const;

/* ──────────────────────────────────────────────────────────
 * Statistik Deskriptif
 * ────────────────────────────────────────────────────────── */

export function describe(values: number[]): SectorStats {
  const clean = values.filter((v) => Number.isFinite(v) && v >= 0);
  if (clean.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      cv: 0,
      min: 0,
      max: 0,
      count: 0,
      total: 0,
    };
  }
  const total = clean.reduce((a, b) => a + b, 0);
  const mean = total / clean.length;
  const sorted = [...clean].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  const variance =
    clean.reduce((acc, v) => acc + (v - mean) ** 2, 0) / clean.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? (stdDev / mean) * 100 : 0;

  return {
    mean,
    median,
    stdDev,
    cv,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: clean.length,
    total,
  };
}

/** Produktivitas (ton/ha) agregat */
export function computeProductivity(
  production: number,
  area: number,
): number | undefined {
  if (!Number.isFinite(production) || !Number.isFinite(area) || area <= 0)
    return undefined;
  return production / area;
}

/* ──────────────────────────────────────────────────────────
 * Konsentrasi Geografis
 * ────────────────────────────────────────────────────────── */

export function computeConcentration(
  values: number[],
): ConcentrationMetrics {
  const clean = values.filter((v) => Number.isFinite(v) && v >= 0);
  const total = clean.reduce((a, b) => a + b, 0);

  if (total <= 0 || clean.length === 0) {
    return {
      hhi: 0,
      top1Share: 0,
      top3Share: 0,
      giniLike: 0,
      interpretation: "Merata",
    };
  }

  // HHI = Σ (share_i × 100)^2
  const shares = clean.map((v) => (v / total) * 100);
  const hhi = shares.reduce((acc, s) => acc + s * s, 0);

  const sortedShares = [...shares].sort((a, b) => b - a);
  const top1Share = sortedShares[0] || 0;
  const top3Share =
    sortedShares.slice(0, 3).reduce((a, b) => a + b, 0) || 0;

  // Gini-like coefficient (sederhana, tidak berdasarkan Lorenz penuh)
  // G = (n + 1 - 2 × Σ B_i) / n, dengan B_i = cumulative share / mean
  const n = sortedShares.length;
  const meanShare = 100 / n;
  const cumulativeSum = sortedShares.reduce(
    (acc, s, i) => acc + (i + 1) * s,
    0,
  );
  const giniLike =
    meanShare > 0
      ? Math.max(0, Math.min(1, (2 * cumulativeSum) / (n * meanShare * n) - (n + 1) / n))
      : 0;

  let interpretation: ConcentrationMetrics["interpretation"] = "Merata";
  if (hhi >= 2500 || top1Share >= 40) interpretation = "Sangat Terkonsentrasi";
  else if (hhi >= 1500 || top1Share >= 25)
    interpretation = "Terkonsentrasi";
  else if (hhi >= 1000) interpretation = "Sedang";

  return {
    hhi: Math.round(hhi),
    top1Share: Math.round(top1Share * 10) / 10,
    top3Share: Math.round(top3Share * 10) / 10,
    giniLike: Math.round(giniLike * 1000) / 1000,
    interpretation,
  };
}

/* ──────────────────────────────────────────────────────────
 * Linear Regression (Least Squares)
 * ────────────────────────────────────────────────────────── */

export function projectTrend(
  years: number[],
  values: number[],
): TrendProjection {
  const pairs = years
    .map((y, i) => [y, values[i]] as [number, number])
    .filter(([_, v]) => Number.isFinite(v) && v >= 0);

  if (pairs.length < 2) {
    return {
      slope: 0,
      intercept: 0,
      r2: 0,
      projectionNext: pairs[0]?.[1] || 0,
      pctChange: 0,
      direction: "Stabil",
    };
  }

  const n = pairs.length;
  const sumX = pairs.reduce((a, [x]) => a + x, 0);
  const sumY = pairs.reduce((a, [, y]) => a + y, 0);
  const sumXY = pairs.reduce((a, pair) => a + pair[0] * pair[1], 0);
  const sumX2 = pairs.reduce((a, [x]) => a + x * x, 0);

  const meanX = sumX / n;
  const meanY = sumY / n;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  const intercept = meanY - slope * meanX;

  // R² = 1 - SS_res / SS_tot
  const ssTot = pairs.reduce((a, [, y]) => a + (y - meanY) ** 2, 0);
  const ssRes = pairs.reduce((a, [x, y]) => {
    const predicted = slope * x + intercept;
    return a + (y - predicted) ** 2;
  }, 0);
  const r2 = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;

  const lastYear = Math.max(...years);
  const lastValue = pairs.find(([y]) => y === lastYear)?.[1] || meanY;
  const projectionNext = slope * (lastYear + 1) + intercept;
  const pctChange =
    lastValue > 0 ? ((projectionNext - lastValue) / lastValue) * 100 : 0;

  let direction: TrendProjection["direction"] = "Stabil";
  if (Math.abs(pctChange) < 2) direction = "Stabil";
  else if (pctChange > 0) direction = "Naik";
  else direction = "Turun";

  return {
    slope,
    intercept,
    r2: Math.round(r2 * 1000) / 1000,
    projectionNext: Math.max(0, projectionNext),
    pctChange: Math.round(pctChange * 10) / 10,
    direction,
  };
}

/* ──────────────────────────────────────────────────────────
 * Estimasi Nilai Ekonomi
 * ────────────────────────────────────────────────────────── */

export function estimateEconomicValue(input: {
  padiTon: number;
  sapiEkor: number;
  kambingEkor: number;
  ikanTon: number;
}): EconomicValuation {
  const gabah = input.padiTon * 1000 * REFERENCE_PRICES.gabahKering;
  const sapi = input.sapiEkor * REFERENCE_PRICES.sapi;
  const kambing = input.kambingEkor * REFERENCE_PRICES.kambing;
  const ikan = input.ikanTon * 1000 * REFERENCE_PRICES.ikanNila;
  return {
    gabah,
    sapi,
    kambing,
    ikan,
    totalEst: gabah + sapi + kambing + ikan,
  };
}

/* ──────────────────────────────────────────────────────────
 * Formatting
 * ────────────────────────────────────────────────────────── */

export function formatRupiah(n: number): string {
  if (!Number.isFinite(n)) return "Rp 0";
  if (n >= 1e12) return `Rp ${(n / 1e12).toFixed(2)} T`;
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(2)} M`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)} jt`;
  if (n >= 1e3) return `Rp ${(n / 1e3).toFixed(0)} rb`;
  return `Rp ${Math.round(n)}`;
}

export function formatPct(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return "0%";
  return `${n.toFixed(decimals)}%`;
}
