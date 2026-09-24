import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DefaultLayout from "@/layouts/default";
import { LoadingSpinner } from "@/components/ui";
import { FsvaMap } from "@/components/fsva/FsvaMap";
import { fetchAllDesa, type DesaIndex } from "@/services/desa";
import { ShieldCheck, Info, ArrowUpRight } from "lucide-react";
import {
  FSVA_DATA,
  FSVA_YEARS,
  FSVA_INDICATORS,
  FSVA_RAMP_BETTER,
  FSVA_RAMP_WORSE,
  FSVA_KOMPOSIT_COLOR,
  rampToColor,
  kompositLabel,
  type FsvaYear,
  type FsvaIndicatorKey,
  type FsvaDesa,
  type FsvaIndicatorDef,
} from "@/data/fsva";

/*
 * Peta Sebaran Ketahanan Pangan (FSVA — Food Security & Vulnerability Atlas,
 * Badan Pangan Nasional) tingkat DESA, 278 desa × 4 tahun (2021–2024).
 *
 * Indikator yang bisa dipilih:
 *  - Indikator utama : IKP (0–100) & indeks komposit (1–6)
 *  - Tiga Pilar      : ketersediaan, keterjangkauan, pemanfaatan (6 rasio)
 *
 * Warna: hijau = tahan/baik, merah = rawan/buruk (divergen), atau kategorikal
 * untuk komposit (6 warna) & tanpa-akses (2 warna).
 */

interface LegendItem {
  color: string;
  label: string;
}

interface Classification {
  colorOf: (v: number) => string;
  legend: LegendItem[];
}

function quantileBreaks(values: number[], k: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return [];
  const breaks: number[] = [];
  for (let i = 1; i < k; i++) {
    const idx = (i / k) * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const w = idx - lo;
    breaks.push(sorted[lo] * (1 - w) + sorted[hi] * w);
  }
  return breaks;
}

function buildClassification(indikator: FsvaIndicatorDef, rows: FsvaDesa[]): Classification {
  if (indikator.categorical) {
    if (indikator.key === "komposit") {
      const present = [...new Set(rows.map((r) => r.komposit))].sort((a, b) => a - b);
      return {
        colorOf: (v) => FSVA_KOMPOSIT_COLOR[Math.round(v)] ?? "#cbd5e1",
        legend: present.map((k) => ({
          color: FSVA_KOMPOSIT_COLOR[k] ?? "#cbd5e1",
          label: `${k} — ${kompositLabel(k)}`,
        })),
      };
    }
    // tanpaAkses (biner)
    const ada = rows.filter((r) => r.tanpaAkses === 0).length;
    return {
      colorOf: (v) => (v === 1 ? "#d73027" : "#1a9850"),
      legend: [
        { color: "#1a9850", label: `Ada akses (${ada} desa)` },
        { color: "#d73027", label: `Tanpa akses (${rows.length - ada} desa)` },
      ],
    };
  }

  const values = rows.map((r) => r[indikator.key] as number);
  const breaks = quantileBreaks(values, 5);
  const ramp = indikator.higherIsBetter ? FSVA_RAMP_BETTER : FSVA_RAMP_WORSE;
  const fmt = indikator.format;
  const legend: LegendItem[] = [
    { color: ramp[0], label: `≤ ${fmt(breaks[0])}` },
    { color: ramp[1], label: `${fmt(breaks[0])} – ${fmt(breaks[1])}` },
    { color: ramp[2], label: `${fmt(breaks[1])} – ${fmt(breaks[2])}` },
    { color: ramp[3], label: `${fmt(breaks[2])} – ${fmt(breaks[3])}` },
    { color: ramp[4], label: `> ${fmt(breaks[3])}` },
  ];
  return { colorOf: rampToColor(breaks, ramp), legend };
}

export default function FsvaPage() {
  const [desa, setDesa] = useState<DesaIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [tahun, setTahun] = useState<FsvaYear>(2024);
  const [indKey, setIndKey] = useState<FsvaIndicatorKey>("ikp");

  useEffect(() => {
    const load = async () => {
      try {
        setDesa(await fetchAllDesa());
      } catch (err) {
        console.error("Gagal memuat peta desa:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const rows = useMemo(() => FSVA_DATA[tahun], [tahun]);
  const indikator = useMemo(
    () => FSVA_INDICATORS.find((i) => i.key === indKey) ?? FSVA_INDICATORS[0],
    [indKey],
  );

  const classification = useMemo(
    () => buildClassification(indikator, rows),
    [indikator, rows],
  );

  const desaByOid = useMemo(() => {
    const m = new Map<number, DesaIndex>();
    for (const d of desa) m.set(d.objectId, d);
    return m;
  }, [desa]);

  // Ranking desa (terbaik vs terendah) sesuai arah indikator.
  const ranking = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const av = a[indikator.key] as number;
      const bv = b[indikator.key] as number;
      return indikator.higherIsBetter ? bv - av : av - bv;
    });
    return { best: sorted.slice(0, 10), worst: [...sorted].reverse().slice(0, 10) };
  }, [rows, indikator]);

  const rataRata = useMemo(() => {
    if (!rows.length) return 0;
    return rows.reduce((s, r) => s + (r[indikator.key] as number), 0) / rows.length;
  }, [rows, indikator]);

  if (loading) {
    return (
      <DefaultLayout>
        <div className="py-16 flex justify-center">
          <LoadingSpinner label="Memuat peta ketahanan pangan..." />
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-6 py-2">
        {/* Hero */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-r from-teal-50 via-white to-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-2xl leading-tight font-bold tracking-tight text-slate-800 sm:text-3xl">
                Ketahanan Pangan (FSVA)
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                Atlas kerentanan &amp; ketahanan pangan tingkat desa — Badan Pangan
                Nasional. Indeks Ketahanan Pangan (IKP) beserta enam indikator Tiga
                Pilar (ketersediaan, keterjangkauan, pemanfaatan).
              </p>
            </div>
          </div>
        </div>

        {/* Kontrol tahun + indikator */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Tahun:</span>
            <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
              {FSVA_YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setTahun(y)}
                  aria-pressed={tahun === y}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tahun === y
                      ? "bg-white text-teal-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FSVA_INDICATORS.map((i) => (
              <button
                key={i.key}
                type="button"
                onClick={() => setIndKey(i.key)}
                aria-pressed={indKey === i.key}
                title={i.label}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
                  indKey === i.key
                    ? "bg-teal-600 text-white ring-teal-600"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {i.short}
              </button>
            ))}
          </div>
        </div>

        {/* KPI ringkas */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label={`Rata-rata ${indikator.short}`}
            value={`${indikator.format(rataRata)}${indikator.unit}`}
          />
          <Kpi
            label="Desa berdata"
            value={`${rows.length}`}
          />
          <Kpi
            label="Terbaik"
            value={ranking.best[0] ? ranking.best[0].desa : "—"}
            detail={
              ranking.best[0]
                ? `${indikator.format(ranking.best[0][indikator.key] as number)}${indikator.unit}`
                : undefined
            }
          />
          <Kpi
            label="Terendah"
            value={ranking.worst[0] ? ranking.worst[0].desa : "—"}
            detail={
              ranking.worst[0]
                ? `${indikator.format(ranking.worst[0][indikator.key] as number)}${indikator.unit}`
                : undefined
            }
          />
        </div>

        {/* Peta + legenda */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
          <FsvaMap
            key={`${tahun}-${indKey}`}
            desaIndex={desa}
            rows={rows}
            indikator={indikator}
            colorOf={classification.colorOf}
            judul={`${indikator.label} · ${tahun}`}
            berdata={rows.length}
            total={desa.length}
          />
          <LegendPanel
            indicator={indikator}
            legend={classification.legend}
            higherIsBetter={indikator.higherIsBetter}
            categorical={indikator.categorical}
          />
        </div>

        {/* Tabel ranking */}
        <RankingSection
          judul={`10 Desa ${indikator.higherIsBetter ? "Terbaik" : "Terendah"}`}
          subtitle={`Berdasarkan ${indikator.label.toLowerCase()} tahun ${tahun}.`}
          rows={ranking.best}
          indikator={indikator}
          desaByOid={desaByOid}
        />

        <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Indikator negatif (persentase penduduk miskin, rumah tangga tanpa air
          bersih, tanpa akses) dibalik arahnya: nilai tinggi ditampilkan merah
          (makin rawan). IKP dan indeks komposit makin tinggi = makin tahan.
          Sumber: FSVA Badan Pangan Nasional (2021–2024).
        </p>
      </section>
    </DefaultLayout>
  );
}

function Kpi({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg bg-white px-4 py-3 ring-1 ring-slate-200 shadow-sm">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-base font-bold text-slate-800">{value}</div>
      {detail ? <div className="text-[11px] text-slate-500">{detail}</div> : null}
    </div>
  );
}

function LegendPanel({
  indicator,
  legend,
  higherIsBetter,
  categorical,
}: {
  indicator: FsvaIndicatorDef;
  legend: LegendItem[];
  higherIsBetter: boolean;
  categorical: boolean;
}) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1 text-xs font-bold text-slate-800">{indicator.label}</div>
      <div className="mb-3 text-[10px] text-slate-500">
        {categorical
          ? "Pembagian kategori."
          : `Sebaran 278 desa dibagi 5 kelas kuantil${higherIsBetter ? "" : " (dibalik karena indikator negatif)"}.`}
      </div>
      <ul className="space-y-1.5">
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-2 text-[11px] text-slate-600">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded"
              style={{ backgroundColor: l.color }}
            />
            {l.label}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function RankingSection({
  judul,
  subtitle,
  rows,
  indikator,
  desaByOid,
}: {
  judul: string;
  subtitle: string;
  rows: FsvaDesa[];
  indikator: FsvaIndicatorDef;
  desaByOid: Map<number, DesaIndex>;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-bold text-slate-800">{judul}</h3>
        <span className="text-[10px] text-slate-400">{subtitle}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-500">
              <th className="py-1.5 pr-2 font-semibold">#</th>
              <th className="py-1.5 pr-2 font-semibold">Desa</th>
              <th className="py-1.5 pr-2 font-semibold">Kecamatan</th>
              <th className="py-1.5 text-right font-semibold">{indikator.short}</th>
              <th className="py-1.5 pl-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const d = desaByOid.get(r.objectId);
              return (
                <tr key={r.objectId} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 pr-2 tabular-nums text-slate-400">{i + 1}</td>
                  <td className="py-1.5 pr-2 font-semibold text-slate-700">{r.desa}</td>
                  <td className="py-1.5 pr-2 text-slate-500">{r.kecamatan}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums text-slate-800">
                    {indikator.format(r[indikator.key] as number)}
                    {indikator.unit}
                  </td>
                  <td className="py-1.5 pl-2 text-right">
                    {d ? (
                      <Link
                        to={`/desa/${d.kecamatanSlug}/${d.namaSlug}`}
                        className="inline-flex items-center gap-0.5 text-teal-600 hover:text-teal-700"
                        aria-label={`Detail ${r.desa}`}
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
