/**
 * Nilai Ekonomi per Bidang — /nilai-ekonomi/:bidang
 *
 * Estimasi = volume produksi (fetcher api.ts yang SUDAH ADA, dikomposisikan
 * di src/services/nilai-ekonomi-estimasi.ts) × harga referensi
 * (src/data/harga-referensi.ts — kelas "resmi-live" Bappebti / "indikatif").
 * Khusus perikanan: menampilkan nilai produksi AKTUAL dataset Distankan
 * (budidaya + tangkap), bukan estimasi harga.
 *
 * Struktur baris komoditas sengaja di-align dengan schema tabel
 * nilai_ekonomi_tahunan (endpoint /api/v1/nilai-ekonomi, data resmi datang
 * 23 Sep 2026) — begitu dataset resmi tersedia, cukup ganti sumber load
 * tanpa rombak UI.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeCheck,
  Beef,
  Carrot,
  Coffee,
  DollarSign,
  ExternalLink,
  Fish,
  Trophy,
  Wheat,
} from "lucide-react";
import DefaultLayout from "@/layouts/default";
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
import { AKSES_HARGA_TANGGAL, KETERANGAN_PENCARIAN } from "@/data/harga-referensi";
import {
  BIDANG_META,
  BIDANG_NILAI_EKONOMI,
  loadEstimasiUnit,
  subtotalUnit,
  type BidangKey,
  type EstimasiUnit,
  type KelasEstimasi,
} from "@/services/nilai-ekonomi-estimasi";

const IKON_BIDANG = { wheat: Wheat, carrot: Carrot, coffee: Coffee, beef: Beef, fish: Fish } as const;

const PALET = [
  "#1d4ed8",
  "#0d9488",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#65a30d",
  "#0891b2",
  "#9333ea",
  "#dc2626",
  "#ca8a04",
];

const SEMUA_KEC = "Semua Kecamatan";

const fmtRp = (v: number | null): string =>
  v == null
    ? "—"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(v);

const fmtNum = (v: number): string =>
  v.toLocaleString("id-ID", { maximumFractionDigits: 1 });

const isBidangValid = (b?: string): b is BidangKey =>
  !!b && (BIDANG_NILAI_EKONOMI as readonly string[]).includes(b);

/* ---------- agregat komoditas untuk tabel/KPI ---------- */
interface BarisKomoditas {
  komoditas: string;
  volume: number;
  satuanVolume: string;
  konversiKg: number;
  hargaRp: number | null;
  satuanHarga: string;
  subtotalRp: number;
  terhitung: boolean;
  kelas: KelasEstimasi;
  sumber: string;
  catatan?: string;
  bobotKgPerEkor?: number;
}

const badgeKelas = (kelas: KelasEstimasi) => {
  switch (kelas) {
    case "resmi-live":
      return <Badge tone="emerald">Resmi-live · Bappebti</Badge>;
    case "resmi-dataset":
      return <Badge tone="blue">Dataset resmi</Badge>;
    case "indikatif":
      return <Badge tone="amber">Indikatif · perlu verifikasi</Badge>;
    default:
      return <Badge tone="slate">Belum ada harga</Badge>;
  }
};

export default function NilaiEkonomiPage() {
  const { bidang } = useParams<{ bidang?: string }>();
  const bidangKey: BidangKey | null = isBidangValid(bidang) ? bidang : null;

  const [units, setUnits] = useState<EstimasiUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [gagal, setGagal] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [tahun, setTahun] = useState("");
  const [kecamatan, setKecamatan] = useState(SEMUA_KEC);

  useEffect(() => {
    if (!bidangKey) return;
    let aktif = true;
    setLoading(true);
    setGagal(null);
    loadEstimasiUnit(bidangKey)
      .then((u) => {
        if (!aktif) return;
        setUnits(u);
      })
      .catch(() => {
        if (!aktif) return;
        setUnits([]);
        setGagal(
          "Gagal memuat dataset produksi (backend & fallback CSV tidak merespons). Coba muat ulang.",
        );
      })
      .finally(() => {
        if (!aktif) return;
        setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, [bidangKey, retry]);

  const tahunList = useMemo(
    () => [...new Set(units.map((u) => u.tahun))].sort((a, b) => b.localeCompare(a)),
    [units],
  );

  useEffect(() => {
    if (tahunList.length === 0) {
      setTahun("");
      return;
    }
    if (!tahunList.includes(tahun)) setTahun(tahunList[0]);
  }, [tahunList, tahun]);

  const kecamatanList = useMemo(() => {
    const set = new Set(
      units.filter((u) => u.tahun === tahun).map((u) => u.kecamatan),
    );
    return [SEMUA_KEC, ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [units, tahun]);

  useEffect(() => {
    if (!kecamatanList.includes(kecamatan)) setKecamatan(SEMUA_KEC);
  }, [kecamatanList, kecamatan]);

  const filtered = useMemo(
    () =>
      units.filter(
        (u) =>
          u.tahun === tahun &&
          (kecamatan === SEMUA_KEC || u.kecamatan === kecamatan),
      ),
    [units, tahun, kecamatan],
  );

  const barisKomoditas = useMemo<BarisKomoditas[]>(() => {
    const map = new Map<string, BarisKomoditas>();
    filtered.forEach((u) => {
      const sub = subtotalUnit(u);
      const ada = map.get(u.komoditas);
      if (ada) {
        ada.volume += u.volume;
        ada.konversiKg += u.konversiKg;
        ada.subtotalRp += sub ?? 0;
      } else {
        map.set(u.komoditas, {
          komoditas: u.komoditas,
          volume: u.volume,
          satuanVolume: u.satuanVolume,
          konversiKg: u.konversiKg,
          hargaRp: u.hargaRp,
          satuanHarga: u.satuanHarga,
          subtotalRp: sub ?? 0,
          terhitung: sub != null,
          kelas: u.kelas,
          sumber: u.sumber,
          catatan: u.catatan,
          bobotKgPerEkor: u.bobotKgPerEkor,
        });
      }
    });
    return [...map.values()].sort((a, b) => b.subtotalRp - a.subtotalRp);
  }, [filtered]);

  const perKecamatan = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((u) => {
      const sub = subtotalUnit(u) ?? 0;
      map.set(u.kecamatan, (map.get(u.kecamatan) ?? 0) + sub);
    });
    return [...map.entries()]
      .map(([name, v]) => ({ name, nilaiJuta: v / 1e6 }))
      .sort((a, b) => b.nilaiJuta - a.nilaiJuta);
  }, [filtered]);

  const totalRp = useMemo(() => barisKomoditas.reduce((s, b) => s + b.subtotalRp, 0), [barisKomoditas]);
  const totalKonversiKg = useMemo(
    () => barisKomoditas.reduce((s, b) => s + b.konversiKg, 0),
    [barisKomoditas],
  );
  const totalVolume = useMemo(() => barisKomoditas.reduce((s, b) => s + b.volume, 0), [barisKomoditas]);
  const satuanVolumeBidang = barisKomoditas[0]?.satuanVolume ?? "—";
  const hargaImplisit = totalKonversiKg > 0 ? totalRp / totalKonversiKg : null;

  const teratas = barisKomoditas.find((b) => b.terhitung);
  const shareTeratas = teratas && totalRp > 0 ? (teratas.subtotalRp / totalRp) * 100 : 0;
  const nResmi = barisKomoditas.filter(
    (b) => b.kelas === "resmi-live" || b.kelas === "resmi-dataset",
  ).length;
  const nIndikatif = barisKomoditas.filter((b) => b.kelas === "indikatif").length;
  const nTanpa = barisKomoditas.filter((b) => !b.terhitung).length;

  /* ---------- render ---------- */

  if (!bidangKey) {
    return <Navigate to="/nilai-ekonomi/pangan" replace />;
  }

  const meta = BIDANG_META[bidangKey];
  const Ikon = IKON_BIDANG[meta.ikon];
  const isPerikanan = bidangKey === "perikanan";
  const namaSeri = isPerikanan ? "Nilai Produksi (juta Rp)" : "Estimasi Nilai (juta Rp)";
  const cakupanKec =
    kecamatan === SEMUA_KEC ? `${perKecamatan.length} kecamatan` : kecamatan;

  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          icon={<Ikon className="h-6 w-6" aria-hidden />}
          title={meta.judul}
          subtitle={`${meta.tagline} ${isPerikanan ? "" : `Harga referensi diakses ${AKSES_HARGA_TANGGAL}.`}`}
          actions={
            isPerikanan ? (
              <Link
                to="/economic-value"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700"
              >
                Detail Nilai Perikanan <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : undefined
          }
        />

        <Toolbar>
          <ToolbarField label="Tahun">
            <select
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              disabled={tahunList.length === 0}
              className="h-9 w-36 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 focus:border-blue-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
            >
              {tahunList.length === 0 && <option value="">—</option>}
              {tahunList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </ToolbarField>
          <ToolbarField label="Kecamatan">
            <select
              value={kecamatan}
              onChange={(e) => setKecamatan(e.target.value)}
              disabled={kecamatanList.length <= 1}
              className="h-9 w-56 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 focus:border-blue-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
            >
              {kecamatanList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </ToolbarField>
          {units.length > 0 && (
            <p className="ml-auto self-center text-xs font-mono text-slate-400">
              {barisKomoditas.length} komoditas · {cakupanKec}
              {tahun ? ` · ${tahun}` : ""}
            </p>
          )}
        </Toolbar>

        {loading ? (
          <LoadingSpinner label="Memuat dataset produksi…" />
        ) : gagal ? (
          <EmptyStatePlaceholder
            title="Dataset tidak dapat dimuat"
            message={gagal}
            action={
              <button
                type="button"
                onClick={() => setRetry((r) => r + 1)}
                className="rounded-lg bg-blue-800 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900"
              >
                Muat Ulang
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyStatePlaceholder
            title={`Data nilai ekonomi ${meta.label.toLowerCase()} menyusul`}
            message={
              units.length === 0
                ? `Volume produksi bidang ${meta.label.toLowerCase()} belum tersedia dari dataset Distankan/CKAN. ` +
                  "Struktur halaman sudah siap menyerap dataset resmi nilai ekonomi (tabel nilai_ekonomi_tahunan) begitu diunggah — perkiraan 23 Sep 2026."
                : `Tidak ada data ${meta.label.toLowerCase()} untuk filter tahun${tahun ? ` ${tahun}` : ""} dan kecamatan terpilih. Pilih kombinasi filter lain.`
            }
            action={
              isPerikanan ? (
                <Link
                  to="/economic-value"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700"
                >
                  Lihat Nilai Produksi Perikanan <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <KpiCard
                icon={<DollarSign className="h-6 w-6" aria-hidden />}
                label={isPerikanan ? "Total Nilai Produksi" : "Total Estimasi Nilai"}
                value={fmtRp(totalRp)}
                hint={`${barisKomoditas.length} komoditas · ${cakupanKec}${tahun ? ` · ${tahun}` : ""}`}
                color="bg-emerald-50 text-emerald-600"
              />
              <KpiCard
                icon={<Trophy className="h-6 w-6" aria-hidden />}
                label="Kontributor Terbesar"
                value={teratas?.komoditas ?? "—"}
                unit={teratas ? fmtRp(teratas.subtotalRp) : undefined}
                hint={teratas ? `porsi ${shareTeratas.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari total` : "belum ada subtotal terhitung"}
                color="bg-violet-50 text-violet-600"
              />
              <KpiCard
                icon={<BadgeCheck className="h-6 w-6" aria-hidden />}
                label="Kualitas Sumber Harga"
                value={`${nResmi} resmi · ${nIndikatif} indikatif`}
                hint={
                  nTanpa > 0
                    ? `${nTanpa} komoditas tanpa harga referensi (subtotal ditunda) · akses ${AKSES_HARGA_TANGGAL}`
                    : `Semua komoditas punya harga referensi · akses ${AKSES_HARGA_TANGGAL}`
                }
                color="bg-amber-50 text-amber-600"
              />
            </div>

            {/* Estimasi per kecamatan */}
            {kecamatan === SEMUA_KEC && perKecamatan.length > 1 && (
              <SectionCard
                title={`Estimasi nilai per kecamatan — ${tahun}`}
                icon={<DollarSign className="h-4 w-4 text-blue-800" aria-hidden />}
              >
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perKecamatan} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={64}
                        interval={0}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickFormatter={(v: number) => `${v.toLocaleString("id-ID")} jt`}
                      />
                      <Tooltip
                        formatter={(v) => [
                          `Rp ${Number(v ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 1 })} juta`,
                          namaSeri,
                        ]}
                      />
                      <Bar dataKey="nilaiJuta" name={namaSeri} fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Kontribusi per komoditas */}
              <SectionCard
                title="Kontribusi komoditas (juta Rp)"
                icon={<Trophy className="h-4 w-4 text-blue-800" aria-hidden />}
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barisKomoditas.map((b) => ({
                        name: b.komoditas.length > 18 ? `${b.komoditas.slice(0, 17)}…` : b.komoditas,
                        nilaiJuta: b.subtotalRp / 1e6,
                      }))}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickFormatter={(v: number) => `${v.toLocaleString("id-ID")} jt`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 10, fill: "#475569" }}
                      />
                      <Tooltip
                        formatter={(v) => [
                          `Rp ${Number(v ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 1 })} juta`,
                          namaSeri,
                        ]}
                      />
                      <Bar dataKey="nilaiJuta" name={namaSeri} radius={[0, 4, 4, 0]}>
                        {barisKomoditas.map((b, i) => (
                          <Cell key={b.komoditas} fill={PALET[i % PALET.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              {/* Harga referensi per komoditas */}
              <SectionCard
                title={isPerikanan ? "Harga implisit per komoditas (Rp/kg)" : "Harga referensi per komoditas"}
                icon={<BadgeCheck className="h-4 w-4 text-blue-800" aria-hidden />}
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barisKomoditas
                        .filter((b) => b.hargaRp != null)
                        .map((b) => ({
                          name: b.komoditas.length > 18 ? `${b.komoditas.slice(0, 17)}…` : b.komoditas,
                          harga: b.hargaRp as number,
                        }))}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickFormatter={(v: number) => `${(v / 1000).toLocaleString("id-ID")}rb`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={{ fontSize: 10, fill: "#475569" }}
                      />
                      <Tooltip
                        formatter={(v) => [fmtRp(Number(v ?? 0)), "Harga referensi (Rp/kg)"]}
                      />
                      <Bar dataKey="harga" name="Harga referensi (Rp/kg)" fill="#0d9488" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {barisKomoditas.some((b) => b.hargaRp == null) && (
                  <p className="mt-2 text-xs font-mono text-slate-400">
                    {barisKomoditas.filter((b) => b.hargaRp == null).length} komoditas tanpa
                    harga referensi tidak ditampilkan pada grafik harga.
                  </p>
                )}
              </SectionCard>
            </div>

            {/* Tabel rincian */}
            <SectionCard
              title={`Rincian estimasi — ${cakupanKec}${tahun ? ` · ${tahun}` : ""}`}
              icon={<DollarSign className="h-4 w-4 text-blue-800" aria-hidden />}
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      {["Komoditas", "Volume", "Harga Referensi", "Subtotal Estimasi", "Sumber Harga"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {barisKomoditas.map((b) => (
                      <tr key={b.komoditas} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{b.komoditas}</p>
                          {(b.catatan || b.bobotKgPerEkor != null) && (
                            <p className="mt-0.5 text-[10px] font-mono text-slate-400">
                              {b.bobotKgPerEkor != null && `≈ ${b.bobotKgPerEkor.toLocaleString("id-ID")} kg/ekor`}
                              {b.bobotKgPerEkor != null && b.catatan ? " · " : ""}
                              {b.catatan}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">
                          {fmtNum(b.volume)} {b.satuanVolume}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">
                          {b.hargaRp != null ? `${fmtRp(b.hargaRp)}/${b.satuanHarga}` : "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-slate-800">
                          {b.terhitung ? fmtRp(b.subtotalRp) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            {badgeKelas(b.kelas)}
                            <span className="text-[10px] font-mono text-slate-400">{b.sumber}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-blue-200 bg-blue-50/50">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">
                        Jumlah ({barisKomoditas.length} komoditas · {cakupanKec})
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold tabular-nums text-slate-700">
                        {fmtNum(totalVolume)} {satuanVolumeBidang}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold tabular-nums text-slate-700">
                        {hargaImplisit != null ? `${fmtRp(hargaImplisit)}/kg (implisit)` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold tabular-nums text-blue-900">
                        {fmtRp(totalRp)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {nResmi} resmi · {nIndikatif} indikatif
                        {nTanpa > 0 ? ` · ${nTanpa} tanpa harga` : ""}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </SectionCard>
          </>
        )}

        {/* Disklosur metodologi & sumber */}
        <SectionCard
          title="Metodologi, Harga & Sumber"
          icon={<BadgeCheck className="h-4 w-4 text-blue-800" aria-hidden />}
        >
          <ul className="list-disc space-y-1.5 pl-4 font-mono text-xs leading-relaxed text-slate-500">
            {meta.catatan.map((c) => (
              <li key={c}>{c}</li>
            ))}
            <li>
              Kelas sumber: <span className="font-semibold text-emerald-700">resmi-live</span> = harga
              Bappebti infoharga tingkat petani ({AKSES_HARGA_TANGGAL});{" "}
              <span className="font-semibold text-amber-700">indikatif</span> = harga wajar yang
              belum terverifikasi — perlu verifikasi lapangan;{" "}
              <span className="font-semibold text-blue-700">resmi-dataset</span> = nilai aktual
              dataset Distankan.
            </li>
            <li>{KETERANGAN_PENCARIAN}</li>
            <li>
              Struktur halaman siap menyerap dataset resmi /api/v1/nilai-ekonomi (tabel
              nilai_ekonomi_tahunan) begitu tersedia — estimasi harga referensi akan diganti nilai
              aktual.
            </li>
          </ul>
        </SectionCard>
      </div>
    </DefaultLayout>
  );
}
