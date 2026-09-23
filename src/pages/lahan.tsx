/**
 * Luas & Penggunaan Lahan — halaman publik.
 *
 * Seri waktu tahunan penggunaan lahan Kabupaten Banjarnegara (Ha):
 * I. Lahan sawah (irigasi, tadah hujan, pasang surut), II. Bukan
 * lahan sawah (tegal/kebun, perkebunan, hutan rakyat, dll.), dan
 * III. Lahan bukan pertanian.
 *
 * Sumber utama: CKAN opendata.banjarnegarakab.go.id — dataset
 * "Luas Penggunaan Lahan Menurut Jenis Penggunaan (Ha) 2025",
 * resource c79b7e5e… (datastore aktif, 2017-2025), diambil via
 * proxy /api/3/* (CKAN tidak mengirim CORS header). Fallback:
 * CSV tidy Distankan lokal (2014-2024). Keduanya dinormalisasi
 * oleh fetchLahanPenggunaan() di services/api.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  Building2,
  Droplets,
  ExternalLink,
  LandPlot,
  Sprout,
  TriangleAlert,
} from "lucide-react";
import {
  Badge,
  EmptyStatePlaceholder,
  KpiCard,
  LoadingSpinner,
  PageHeader,
  SectionCard,
  Toolbar,
  ToolbarField,
} from "@/components/ui";
import DefaultLayout from "@/layouts/default";
import {
  fetchLahanPenggunaan,
  LAHAN_SERI_ORDER,
  type LahanPenggunaan,
  type LahanPenggunaanSerie,
} from "@/services/api";

const DATASET_URL =
  "https://opendata.banjarnegarakab.go.id/dataset/luas-penggunaan-lahan-menurut-jenis-penggunaan-ha-2025";

const fmtHa = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 0 });
const fmtHa2 = (v: number) =>
  v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v: number) => `${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
const fmtDelta = (v: number) => `${v >= 0 ? "+" : "−"}${fmtHa2(Math.abs(v))}`;

const getVal = (s: LahanPenggunaanSerie | undefined, tahun: number): number | null => {
  if (!s) return null;
  const v = s.nilai[String(tahun)];
  return typeof v === "number" && !isNaN(v) ? v : null;
};

interface KomposisiPoint {
  tahun: number;
  "Lahan sawah": number | null;
  "Bukan lahan sawah": number | null;
  "Bukan pertanian": number | null;
}

interface SawahTrenPoint {
  tahun: number;
  "Lahan sawah": number | null;
  "Irigasi": number | null;
  "Tadah hujan": number | null;
  "Pasang surut": number | null;
}

interface TabelBaris {
  id: string;
  kategori: string;
  grup: string;
  level: "utama" | "rincian";
  luas: number | null;
  pct: number | null;
  delta: number | null;
}

function LahanPage() {
  const [data, setData] = useState<LahanPenggunaan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tahunPilih, setTahunPilih] = useState<number | null>(null);

  useEffect(() => {
    let aktif = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const hasil = await fetchLahanPenggunaan();
        if (!aktif) return;
        if (!hasil) {
          setError(
            "Data penggunaan lahan tidak dapat dimuat — portal opendata dan CSV lokal sama-sama tidak terjangkau.",
          );
          setData(null);
        } else {
          setData(hasil);
          setTahunPilih(hasil.tahunList[hasil.tahunList.length - 1]);
        }
      } catch {
        if (!aktif) return;
        setError("Terjadi kesalahan saat memuat data penggunaan lahan.");
        setData(null);
      } finally {
        if (aktif) setLoading(false);
      }
    })();
    return () => {
      aktif = false;
    };
  }, []);

  const turunan = useMemo(() => {
    if (!data) return null;
    const byId = new Map(data.series.map((s) => [s.id, s]));
    const tahunList = data.tahunList;
    const tAkhir = tahunList[tahunList.length - 1];
    const tSebelum = tahunList.length > 1 ? tahunList[tahunList.length - 2] : null;

    const sawah = byId.get("sawah");
    const bukanSawah = byId.get("bukan-sawah");
    const bukanPertanian = byId.get("bukan-pertanian");

    const totalAkhir =
      (getVal(sawah, tAkhir) ?? 0) + (getVal(bukanSawah, tAkhir) ?? 0) + (getVal(bukanPertanian, tAkhir) ?? 0);

    const trendPct = (s: LahanPenggunaanSerie | undefined): string | null => {
      const kini = getVal(s, tAkhir);
      const dulu = tSebelum !== null ? getVal(s, tSebelum) : null;
      if (kini === null || dulu === null || dulu === 0) return null;
      return `${Math.abs(((kini - dulu) / dulu) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
    };
    const trendNaik = (s: LahanPenggunaanSerie | undefined): boolean => {
      const kini = getVal(s, tAkhir);
      const dulu = tSebelum !== null ? getVal(s, tSebelum) : null;
      return kini !== null && dulu !== null ? kini >= dulu : true;
    };

    const komposisiData: KomposisiPoint[] = tahunList.map((t) => ({
      tahun: t,
      "Lahan sawah": getVal(sawah, t),
      "Bukan lahan sawah": getVal(bukanSawah, t),
      "Bukan pertanian": getVal(bukanPertanian, t),
    }));

    const sawahTrenData: SawahTrenPoint[] = tahunList.map((t) => ({
      tahun: t,
      "Lahan sawah": getVal(sawah, t),
      "Irigasi": getVal(byId.get("sawah-irigasi"), t),
      "Tadah hujan": getVal(byId.get("sawah-tadah-hujan"), t),
      "Pasang surut": getVal(byId.get("sawah-pasang-surut"), t),
    }));

    // Deteksi reklasifikasi: "Lainnya" runtuh + "bukan pertanian" melonjak
    // dalam satu tahun (ambang konservatif) → catatan metodologi.
    let reklas: { tahun: number; lainnyaSebelum: number; lainnyaSesudah: number; bpSebelum: number; bpSesudah: number } | null =
      null;
    const lainnya = byId.get("lainnya");
    for (let i = 1; i < tahunList.length; i++) {
      const t = tahunList[i];
      const tPrev = tahunList[i - 1];
      const lSesudah = getVal(lainnya, t);
      const lSebelum = getVal(lainnya, tPrev);
      const bpSesudah = getVal(bukanPertanian, t);
      const bpSebelum = getVal(bukanPertanian, tPrev);
      if (lSesudah === null || lSebelum === null || bpSesudah === null || bpSebelum === null) continue;
      const lainnyaRuntuh = lSebelum > 0 && lSesudah / lSebelum < 0.5;
      const bpMelonjak = bpSebelum > 0 && bpSesudah / bpSebelum > 1.5;
      if (lainnyaRuntuh && bpMelonjak) {
        reklas = { tahun: t, lainnyaSebelum: lSebelum, lainnyaSesudah: lSesudah, bpSebelum, bpSesudah };
        break;
      }
    }

    return { byId, tahunList, tAkhir, tSebelum, sawah, bukanSawah, bukanPertanian, totalAkhir, trendPct, trendNaik, komposisiData, sawahTrenData, reklas };
  }, [data]);

  const tabel = useMemo(() => {
    if (!data || !turunan || tahunPilih === null) return null;
    const tahunSebelumPilih = (() => {
      const idx = data.tahunList.indexOf(tahunPilih);
      return idx > 0 ? data.tahunList[idx - 1] : null;
    })();
    const totalPilih =
      (getVal(turunan.sawah, tahunPilih) ?? 0) +
      (getVal(turunan.bukanSawah, tahunPilih) ?? 0) +
      (getVal(turunan.bukanPertanian, tahunPilih) ?? 0);
    const baris: TabelBaris[] = LAHAN_SERI_ORDER.filter((id) => turunan.byId.has(id)).map((id) => {
      const s = turunan.byId.get(id)!;
      const luas = getVal(s, tahunPilih);
      const sebelum = tahunSebelumPilih !== null ? getVal(s, tahunSebelumPilih) : null;
      return {
        id,
        kategori: s.kategori,
        grup: s.grup,
        level: s.level,
        luas,
        pct: luas !== null && totalPilih > 0 ? (luas / totalPilih) * 100 : null,
        delta: luas !== null && sebelum !== null ? luas - sebelum : null,
      };
    });
    const totalDelta =
      tahunSebelumPilih !== null
        ? (getVal(turunan.sawah, tahunPilih) ?? 0) +
            (getVal(turunan.bukanSawah, tahunPilih) ?? 0) +
            (getVal(turunan.bukanPertanian, tahunPilih) ?? 0) -
          ((getVal(turunan.sawah, tahunSebelumPilih) ?? 0) +
            (getVal(turunan.bukanSawah, tahunSebelumPilih) ?? 0) +
            (getVal(turunan.bukanPertanian, tahunSebelumPilih) ?? 0))
        : null;
    return { baris, totalPilih, totalDelta, tahunSebelumPilih };
  }, [data, turunan, tahunPilih]);

  if (loading) {
    return (
      <DefaultLayout>
        <LoadingSpinner height="min-h-[60vh]" label="Memuat data penggunaan lahan..." />
      </DefaultLayout>
    );
  }

  if (error || !data || !turunan) {
    return (
      <DefaultLayout>
        <PageHeader
          icon={<LandPlot className="h-6 w-6" />}
          title="Luas & Penggunaan Lahan"
          subtitle="Seri tahunan penggunaan lahan sawah, bukan sawah & non-pertanian tingkat kabupaten (Ha)."
        />
        <EmptyStatePlaceholder
          icon={<TriangleAlert className="h-6 w-6" />}
          title="Data belum tersedia"
          message={error ?? "Sumber data penggunaan lahan sedang tidak dapat dijangkau."}
        />
      </DefaultLayout>
    );
  }

  const { tAkhir, tSebelum } = turunan;
  const seriLabel = `${turunan.tahunList[0]}–${tAkhir}`;

  return (
    <DefaultLayout>
      <PageHeader
        icon={<LandPlot className="h-6 w-6" />}
        title="Luas & Penggunaan Lahan"
        subtitle={`Seri tahunan ${seriLabel} tingkat kabupaten — ${data.series.length} kategori penggunaan lahan, satuan hektare. Kategori utama: lahan sawah, bukan lahan sawah, dan lahan bukan pertanian.`}
        actions={
          <>
            <Badge tone={data.sumber === "ckan" ? "emerald" : "amber"}>
              {data.sumber === "ckan" ? "opendata CKAN · live" : "CSV lokal · offline"}
            </Badge>
            <a
              href={DATASET_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Dataset opendata
            </a>
          </>
        }
      />

      {/* KPI tahun terakhir */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Droplets className="h-6 w-6" />}
          color="bg-emerald-50 text-emerald-600"
          label={`Lahan Sawah ${tAkhir}`}
          value={fmtHa(getVal(turunan.sawah, tAkhir) ?? 0)}
          unit="Ha"
          trend={turunan.trendPct(turunan.sawah) ?? undefined}
          trendUp={turunan.trendNaik(turunan.sawah)}
          hint={tSebelum !== null ? `Δ vs ${tSebelum} · irigasi + tadah hujan + pasang surut` : "irigasi + tadah hujan + pasang surut"}
        />
        <KpiCard
          icon={<Sprout className="h-6 w-6" />}
          color="bg-amber-50 text-amber-600"
          label={`Bukan Lahan Sawah ${tAkhir}`}
          value={fmtHa(getVal(turunan.bukanSawah, tAkhir) ?? 0)}
          unit="Ha"
          trend={turunan.trendPct(turunan.bukanSawah) ?? undefined}
          trendUp={turunan.trendNaik(turunan.bukanSawah)}
          hint={tSebelum !== null ? `Δ vs ${tSebelum} · tegal/kebun, perkebunan, hutan rakyat, dll.` : "tegal/kebun, perkebunan, hutan rakyat, dll."}
        />
        <KpiCard
          icon={<Building2 className="h-6 w-6" />}
          color="bg-slate-100 text-slate-600"
          label={`Lahan Bukan Pertanian ${tAkhir}`}
          value={fmtHa(getVal(turunan.bukanPertanian, tAkhir) ?? 0)}
          unit="Ha"
          trend={turunan.trendPct(turunan.bukanPertanian) ?? undefined}
          trendUp={turunan.trendNaik(turunan.bukanPertanian)}
          hint={tSebelum !== null ? `Δ vs ${tSebelum} · permukiman, fasilitas, dll.` : "permukiman, fasilitas, dll."}
        />
        <KpiCard
          icon={<LandPlot className="h-6 w-6" />}
          color="bg-blue-50 text-blue-600"
          label="Total Luas"
          value={fmtHa(turunan.totalAkhir)}
          unit="Ha"
          hint={`Sawah + bukan sawah + bukan pertanian · ${fmtPct(((getVal(turunan.sawah, tAkhir) ?? 0) / (turunan.totalAkhir || 1)) * 100)} sawah`}
        />
      </div>

      {/* Catatan metodologi reklasifikasi */}
      {turunan.reklas && (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="text-sm leading-relaxed text-amber-800">
            <p className="font-semibold">
              Catatan metodologi — reklasifikasi statistik {turunan.reklas.tahun}
            </p>
            <p className="mt-1">
              Mulai {turunan.reklas.tahun}, kategori <em>Lainnya</em> menyusut drastis ({fmtHa(turunan.reklas.lainnyaSebelum)} →{" "}
              {fmtHa(turunan.reklas.lainnyaSesudah)} Ha) sementara <em>Lahan bukan pertanian</em> melonjak (
              {fmtHa(turunan.reklas.bpSebelum)} → {fmtHa(turunan.reklas.bpSesudah)} Ha). Pergeseran ini adalah
              reklasifikasi oleh sumber data — bukan perubahan fisik lahan dalam satu tahun — sehingga perbandingan
              antar tahun sebaiknya dilakukan dengan hati-hati.
            </p>
          </div>
        </div>
      )}

      {/* Komposisi per tahun */}
      <SectionCard className="mt-6" title="Komposisi Penggunaan Lahan per Tahun" icon={<LandPlot className="h-4 w-4 text-blue-800" />}>
        <p className="mb-4 text-sm text-slate-500">
          Luas tiap kelompok utama per tahun (Ha). Tinggi batang ≈ total luas wilayah kabupaten yang relatif konstan —
          perhatikan pergeseran proporsi antar kelompok.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={turunan.komposisiData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="tahun" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis
              tickFormatter={(v) => fmtHa(Number(v))}
              tick={{ fontSize: 11, fill: "#64748b" }}
              width={58}
            />
            <Tooltip formatter={(v: any) => [`${fmtHa2(Number(v))} Ha`]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Lahan sawah" stackId="luas" fill="#059669" />
            <Bar dataKey="Bukan lahan sawah" stackId="luas" fill="#d97706" />
            <Bar dataKey="Bukan pertanian" stackId="luas" fill="#64748b" />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Tren lahan sawah */}
      <SectionCard
        className="mt-6"
        title={`Tren Lahan Sawah ${seriLabel}`}
        icon={<Droplets className="h-4 w-4 text-blue-800" />}
      >
        <p className="mb-4 text-sm text-slate-500">
          Luas lahan sawah total beserta rinciannya (Ha). Penurunan luas sawah mengindikasikan alih fungsi lahan.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={turunan.sawahTrenData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="tahun" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis
              tickFormatter={(v) => fmtHa(Number(v))}
              tick={{ fontSize: 11, fill: "#64748b" }}
              width={58}
            />
            <Tooltip formatter={(v: any) => [`${fmtHa2(Number(v))} Ha`]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="Lahan sawah" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Irigasi" stroke="#0891b2" strokeWidth={1.8} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="Tadah hujan" stroke="#ca8a04" strokeWidth={1.8} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="Pasang surut" stroke="#94a3b8" strokeWidth={1.8} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Rincian per jenis */}
      <SectionCard
        className="mt-6"
        title="Rincian per Jenis Penggunaan"
        icon={<BookOpen className="h-4 w-4 text-blue-800" />}
        actions={
          <Toolbar className="border-0 bg-transparent p-0 shadow-none">
            <ToolbarField label="Tahun">
              <select
                value={tahunPilih ?? undefined}
                onChange={(e) => setTahunPilih(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                {turunan.tahunList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </ToolbarField>
          </Toolbar>
        }
      >
        {tabel ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2.5 font-semibold">Jenis Penggunaan</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Luas (Ha)</th>
                  <th className="px-3 py-2.5 text-right font-semibold">% Total</th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    {tabel.tahunSebelumPilih !== null ? `Δ vs ${tabel.tahunSebelumPilih} (Ha)` : "Δ (Ha)"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tabel.baris.map((b) => (
                  <tr
                    key={b.id}
                    className={`border-b border-slate-100 ${b.level === "utama" ? "bg-slate-50/60 font-semibold text-slate-800" : "text-slate-600"}`}
                  >
                    <td className="px-3 py-2.5">
                      {b.level === "rincian" && <span className="mr-2 text-slate-400">—</span>}
                      {b.kategori}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {b.luas !== null ? fmtHa2(b.luas) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                      {b.pct !== null ? fmtPct(b.pct) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {b.delta === null ? (
                        <span className="text-slate-400">—</span>
                      ) : b.delta === 0 ? (
                        <span className="text-slate-400">0,00</span>
                      ) : (
                        <span className={b.delta > 0 ? "text-emerald-600" : "text-red-600"}>
                          {fmtDelta(b.delta)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-blue-50/40 font-semibold text-slate-800">
                  <td className="px-3 py-3">Total (I + II + III)</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtHa2(tabel.totalPilih)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">100%</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {tabel.totalDelta === null ? (
                      <span className="text-slate-400">—</span>
                    ) : tabel.totalDelta === 0 ? (
                      <span className="text-slate-400">0,00</span>
                    ) : (
                      <span className={tabel.totalDelta > 0 ? "text-emerald-600" : "text-red-600"}>
                        {fmtDelta(tabel.totalDelta)}
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">Pilih tahun untuk melihat rincian.</p>
        )}
      </SectionCard>

      {/* Sumber & metodologi */}
      <SectionCard className="mt-6" title="Sumber & Metodologi" icon={<BookOpen className="h-4 w-4 text-blue-800" />}>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
          {data.sumber === "ckan" ? (
            <>
              <li>
                Sumber utama:{" "}
                <span className="font-semibold text-slate-800">opendata.banjarnegarakab.go.id</span> — dataset “Luas
                Penggunaan Lahan Menurut Jenis Penggunaan (Ha) 2025” (Dinas Pertanian, Perikanan &amp; Ketahanan
                Pangan), diambil langsung dari <span className="font-semibold">API CKAN datastore</span> ketika
                halaman dibuka.{" "}
                <a href={DATASET_URL} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                  Lihat dataset asli ↗
                </a>
              </li>
              <li>Seri {seriLabel}, satuan hektare; angka mengikuti tabel resmi Distankan (2 desimal).</li>
            </>
          ) : (
            <li>
              Portal opendata tidak terjangkau — menampilkan snapshot <span className="font-semibold">CSV lokal
              Distankan</span> (seri {seriLabel}). Segarkan halaman untuk mencoba mengambil data terbaru dari
              opendata.
            </li>
          )}
          <li>
            Total = I. Lahan sawah + II. Bukan lahan sawah + III. Lahan bukan pertanian ≈ luas wilayah Kabupaten
            Banjarnegara.
          </li>
          <li>
            Baris “I./II./III.” adalah kategori utama; baris berindentasi (—) adalah rinciannya. Penanda catatan
            kaki BPS pada label sumber (mis. “lainnya¹”) telah dibersihkan saat normalisasi.
          </li>
        </ul>
      </SectionCard>
    </DefaultLayout>
  );
}

export default LahanPage;
