import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  Fish,
  MapPin,
  Milk,
  Sigma,
  Sprout,
  TreePine,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import DefaultLayout from "@/layouts/default";
import {
  EmptyStatePlaceholder,
  KpiCard,
  LoadingSpinner,
  PageHeader,
  SectionCard,
} from "@/components/ui";
import { SebaranBidangMap, formatNilaiSebaran } from "@/components/kecamatan/SebaranBidangMap";
import {
  fetchKecamatanGeo,
  fetchSebaranBidang,
  isSebaranBidangKey,
  type KecGeoCollection,
  type SebaranBidangData,
  type SebaranBidangKey,
} from "@/services/kecamatan";

/**
 * /sebaran/:bidang — peta tematik choropleth kabupaten→kecamatan.
 *
 * Indikator menyesuaikan bidang yang ditangani:
 *   pangan → Σ produksi tanaman pangan (ton)
 *   hortikultura → Σ produksi sayuran + buah (ton)
 *   perkebunan → Σ produksi perkebunan (ton)
 *   peternakan → Σ populasi ternak + unggas (ekor)
 *   perikanan → Σ produksi budidaya + tangkap (ton)
 *
 * Layout & style mengikuti halaman Profil Kecamatan (/kecamatan):
 * DefaultLayout + PageHeader + baris KpiCard + SectionCard + catatan
 * sumber di kaki halaman.
 */

const BIDANG_CONFIG: Record<SebaranBidangKey, { icon: LucideIcon; label: string }> = {
  pangan: { icon: Wheat, label: "Tanaman Pangan" },
  hortikultura: { icon: Sprout, label: "Hortikultura" },
  perkebunan: { icon: TreePine, label: "Perkebunan" },
  peternakan: { icon: Milk, label: "Peternakan" },
  perikanan: { icon: Fish, label: "Perikanan" },
};

const BIDANG_URUTAN: SebaranBidangKey[] = [
  "pangan",
  "hortikultura",
  "perkebunan",
  "peternakan",
  "perikanan",
];

/** Skala YlGn ColorBrewer 5 kelas (terang → gelap). */
const KELAS_WARNA = ["#ffffcc", "#c2e699", "#78c679", "#31a354", "#006837"];
const WARNA_TANPA_DATA = "#e2e8f0";

const fmt = formatNilaiSebaran;

export default function SebaranBidangPage() {
  const { bidang: bidangParam } = useParams<{ bidang: string }>();
  const bidangValid = isSebaranBidangKey(bidangParam);

  const [data, setData] = useState<SebaranBidangData | null>(null);
  const [geo, setGeo] = useState<KecGeoCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bidangValid) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setData(null);
    Promise.all([fetchSebaranBidang(bidangParam), fetchKecamatanGeo()])
      .then(([d, g]) => {
        if (!alive) return;
        setData(d);
        setGeo(g);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [bidangParam, bidangValid]);

  /** Kelas kuantil 5: batas atas kelas k dari nilai terurut naik. */
  const kelasInfo = useMemo(() => {
    const vals = (data?.rows ?? []).map((r) => r.nilai).filter((n) => n > 0).sort((a, b) => a - b);
    let breaks: number[] = [];
    if (vals.length >= 5) {
      const n = vals.length;
      breaks = [0, 1, 2, 3].map(
        (k) => vals[Math.min(n - 1, Math.ceil(((k + 1) * n) / 5) - 1)],
      );
    } else if (vals.length >= 2 && vals[vals.length - 1] > vals[0]) {
      // Data sedikit: rentang sama antara min–max.
      const min = vals[0];
      const w = (vals[vals.length - 1] - min) / 5;
      breaks = [1, 2, 3, 4].map((k) => min + k * w);
    }
    const kelasOf = (n: number): number => {
      for (let i = 0; i < breaks.length; i++) if (n <= breaks[i]) return i;
      return breaks.length;
    };
    return { breaks, kelasOf };
  }, [data]);

  if (!bidangValid) {
    return (
      <DefaultLayout>
        <EmptyStatePlaceholder
          icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          title="Bidang tidak dikenal"
          message={`Tidak ada indikator sebaran untuk "${bidangParam}". Pilih salah satu dari lima bidang yang tersedia.`}
          action={
            <Link
              to="/sebaran/pangan"
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Buka sebaran tanaman pangan →
            </Link>
          }
        />
      </DefaultLayout>
    );
  }

  const bidang = bidangParam as SebaranBidangKey;
  const cfg = BIDANG_CONFIG[bidang];
  const Icon = cfg.icon;

  const rowsBerdata = (data?.rows ?? []).filter((r) => r.nilai > 0);
  const totalKec = geo?.features.length ?? 20;
  const tanpaData = totalKec - rowsBerdata.length;
  const jmlPerKelas = new Array(5).fill(0);
  for (const r of rowsBerdata) jmlPerKelas[kelasInfo.kelasOf(r.nilai)] += 1;
  const totalNilai = rowsBerdata.reduce((s, r) => s + r.nilai, 0);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8">
        {/* Kop halaman — pola PageHeader standar aplikasi */}
        <PageHeader
          icon={<Icon className="w-5 h-5" />}
          title={data?.judul ?? `Sebaran ${cfg.label}`}
          subtitle="Peta tematik choropleth kabupaten → kecamatan — indikator angka & kelas warna menyesuaikan bidang yang ditangani."
          actions={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-800 px-3 py-1 text-xs font-semibold ring-1 ring-blue-200">
              <Icon className="w-3 h-3" aria-hidden />
              {cfg.label}
            </span>
          }
        />

        {/* Baris KPI — pola kartu dasbor standar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            icon={<Sigma className="w-5 h-5" />}
            label={`Total ${data?.judul?.replace(/^Sebaran\s+/i, "") ?? "Agregat"} Kab.`}
            value={data ? fmt(totalNilai) : "…"}
            unit={data?.unit}
            color="bg-emerald-50 text-emerald-600"
            hint="Σ nilai terbaru antar-dataset dalam bidang"
          />
          <KpiCard
            icon={<MapPin className="w-5 h-5" />}
            label="Kecamatan Berdata"
            value={data ? `${rowsBerdata.length}/${totalKec}` : "…"}
            unit="kecamatan"
            color="bg-blue-50 text-blue-600"
            hint={
              tanpaData > 0
                ? `${tanpaData} kecamatan tanpa baris data tercatat`
                : "Seluruh kecamatan memiliki data tercatat"
            }
          />
          <KpiCard
            icon={<Calendar className="w-5 h-5" />}
            label="Tahun Data Terbaru"
            value={data?.tahun || "…"}
            unit={data?.unit ? `per ${data.unit}` : undefined}
            color="bg-amber-50 text-amber-600"
            hint="Baris terbaru tiap dataset dalam bidang"
          />
        </div>

        {/* Tab pemilih bidang — indikator mengikuti bidang */}
        <nav className="flex flex-wrap gap-2" aria-label="Pemilih bidang sebaran">
          {BIDANG_URUTAN.map((k) => {
            const Ic = BIDANG_CONFIG[k].icon;
            const aktif = k === bidang;
            return (
              <Link
                key={k}
                to={`/sebaran/${k}`}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  aktif
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-700",
                ].join(" ")}
                aria-current={aktif ? "page" : undefined}
              >
                <Ic className="w-4 h-4" aria-hidden />
                {BIDANG_CONFIG[k].label}
              </Link>
            );
          })}
        </nav>

        {/* Isi */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <LoadingSpinner height="h-[480px]" label="Memuat peta & data sebaran…" />
          </div>
        ) : error ? (
          <EmptyStatePlaceholder
            icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
            title="Gagal memuat data sebaran"
            message={error}
            action={
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Coba muat ulang →
              </button>
            }
          />
        ) : !data || !geo ? (
          <EmptyStatePlaceholder
            icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
            title="Belum ada data"
            message="Tidak ada baris data yang dapat dipetakan untuk bidang ini."
          />
        ) : (
          <>
            {/* Peta choropleth */}
            <SebaranBidangMap
              key={bidang}
              geo={geo}
              rows={data.rows}
              breaks={kelasInfo.breaks}
              colors={KELAS_WARNA}
              unit={data.unit}
              judul={data.judul}
            />

            {/* Legenda + tabel peringkat */}
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              {/* Legenda kelas */}
              <SectionCard
                title={`Legenda — kelas ${data.unit}`}
                icon={<Sigma className="w-4 h-4 text-slate-500" />}
                className="self-start"
              >
                <p className="text-xs text-slate-500 -mt-1 mb-3">
                  5 kelas kuantil (±{Math.max(1, Math.ceil(rowsBerdata.length / 5))}{" "}
                  kecamatan per kelas)
                </p>
                <ul className="space-y-1.5">
                  {kelasInfo.breaks.length === 4
                    ? [0, 1, 2, 3, 4].map((k) => {
                        const rentang =
                          k === 0
                            ? `≤ ${fmt(kelasInfo.breaks[0])}`
                            : k === 4
                              ? `> ${fmt(kelasInfo.breaks[3])}`
                              : `> ${fmt(kelasInfo.breaks[k - 1])} – ${fmt(kelasInfo.breaks[k])}`;
                        return (
                          <LegendItem
                            key={k}
                            warna={KELAS_WARNA[k]}
                            label={rentang}
                            jumlah={jmlPerKelas[k]}
                          />
                        );
                      })
                    : rowsBerdata.length > 0 && (
                        <LegendItem
                          warna={KELAS_WARNA[KELAS_WARNA.length - 1]}
                          label="seluruh kecamatan berdata"
                          jumlah={rowsBerdata.length}
                        />
                      )}
                  {tanpaData > 0 && (
                    <LegendItem
                      warna={WARNA_TANPA_DATA}
                      label="tanpa data tercatat"
                      jumlah={tanpaData}
                    />
                  )}
                </ul>
                <p className="text-[11px] leading-relaxed text-slate-500 mt-3 pt-3 border-t border-slate-100">
                  {data.indikator}.
                </p>
              </SectionCard>

              {/* Tabel peringkat */}
              <SectionCard
                title="Peringkat Kecamatan"
                icon={<MapPin className="w-4 h-4 text-slate-500" />}
                actions={
                  <span className="text-xs font-semibold text-slate-400">
                    {data.unit}
                  </span>
                }
                bodyClassName=""
              >
                {rowsBerdata.length === 0 ? (
                  <p className="px-5 py-10 text-sm text-slate-500 text-center">
                    Tidak ada kecamatan dengan data tercatat.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-slate-50">
                          <th className="px-5 py-2.5 font-semibold">#</th>
                          <th className="px-2 py-2.5 font-semibold">Kecamatan</th>
                          <th className="px-2 py-2.5 font-semibold text-right">Nilai</th>
                          <th className="px-5 py-2.5 font-semibold">Tahun data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rowsBerdata.map((r, i) => {
                          const kelas = kelasInfo.kelasOf(r.nilai);
                          return (
                            <tr key={r.kecamatanSlug} className="hover:bg-emerald-50/40">
                              <td className="px-5 py-2.5 text-slate-400 tabular-nums">{i + 1}</td>
                              <td className="px-2 py-2.5">
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    aria-hidden
                                    className="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-black/10 shrink-0"
                                    style={{
                                      backgroundColor:
                                        kelasInfo.breaks.length === 4
                                          ? KELAS_WARNA[kelas]
                                          : KELAS_WARNA[KELAS_WARNA.length - 1],
                                    }}
                                  />
                                  <Link
                                    to={`/kecamatan/${r.kecamatanSlug}`}
                                    className="font-medium text-slate-800 hover:text-emerald-700 hover:underline"
                                  >
                                    {r.kecamatan}
                                  </Link>
                                </span>
                              </td>
                              <td className="px-2 py-2.5 text-right tabular-nums font-semibold text-slate-800">
                                {fmt(r.nilai)}
                              </td>
                              <td className="px-5 py-2.5 text-slate-500 tabular-nums">
                                {r.tahun || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
                          <td className="px-5 py-2.5" colSpan={2}>
                            Total {rowsBerdata.length} kecamatan berdata
                          </td>
                          <td className="px-2 py-2.5 text-right tabular-nums">
                            {fmt(totalNilai)}
                          </td>
                          <td className="px-5 py-2.5 text-slate-400">
                            {data.tahun || "—"}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Catatan sumber — pola kaki halaman standar */}
            <p className="text-xs leading-relaxed text-slate-500">
              Sumber: Badan Pusat Statistik (BPS) Kabupaten Banjarnegara melalui CBS
              dan snapshot resmi — rincian dataset tersedia di{" "}
              <Link to="/info" className="text-emerald-700 hover:text-emerald-800 hover:underline">
                Info SISPERTANI
              </Link>
              . Nilai tiap kecamatan = jumlah baris data terbaru antar-dataset dalam
              bidang {cfg.label.toLowerCase()}; klik polygon peta atau nama kecamatan
              untuk membuka profil wilayah.
            </p>
          </>
        )}
      </section>
    </DefaultLayout>
  );
}

function LegendItem({
  warna,
  label,
  jumlah,
}: {
  warna: string;
  label: ReactNode;
  jumlah: number;
}) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span
        aria-hidden
        className="inline-block w-4 h-4 rounded ring-1 ring-black/10 shrink-0"
        style={{ backgroundColor: warna }}
      />
      <span className="text-slate-700 tabular-nums">{label}</span>
      <span className="ml-auto text-xs text-slate-400">{jumlah} kec.</span>
    </li>
  );
}
