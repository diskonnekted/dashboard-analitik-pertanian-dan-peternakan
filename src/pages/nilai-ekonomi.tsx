/**
 * Nilai Ekonomi per Bidang — /nilai-ekonomi/:bidang
 *
 * Estimasi = volume produksi (fetcher api.ts yang SUDAH ADA, dikomposisikan
 * di src/services/nilai-ekonomi-estimasi.ts) × harga referensi
 * (src/data/harga-referensi.ts — kelas "resmi-live" Bappebti / "indikatif").
 * Bidang perikanan dialihkan ke /economic-value — halaman kanonik nilai
 * produksi perikanan (budidaya + tangkap, data aktual Distankan).
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
  Fish,
  Trophy,
  Wheat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  fetchNilaiEkonomiResmi,
  loadEstimasiUnit,
  subtotalUnit,
  type BidangKey,
  type EstimasiUnit,
  type KelasEstimasi,
  type NilaiEkonomiResmiRow,
} from "@/services/nilai-ekonomi-estimasi";

const IKON_BIDANG = { wheat: Wheat, carrot: Carrot, coffee: Coffee, beef: Beef } as const;

type PemilihBidangItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
};

/**
 * Tab pemilih bidang — 4 bidang estimasi (/nilai-ekonomi/:bidang) + perikanan
 * yang dialihkan ke halaman kanonik /economic-value (budidaya + tangkap, data
 * aktual). Pola tab sama dengan halaman sebaran & komoditas unggulan supaya
 * ketiga halaman lintas bidang tampil seragam.
 */
const PEMILIH_BIDANG: PemilihBidangItem[] = [
  ...BIDANG_NILAI_EKONOMI.map((key) => ({
    key,
    label: BIDANG_META[key].label,
    icon: IKON_BIDANG[BIDANG_META[key].ikon],
    href: `/nilai-ekonomi/${key}`,
  })),
  {
    key: "perikanan",
    label: "Perikanan",
    icon: Fish,
    href: "/economic-value",
  },
];

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
  const [resmi, setResmi] = useState<NilaiEkonomiResmiRow[] | null>(null);
  const [periode, setPeriode] = useState<"tahunan" | "triwulan" | "semester">("tahunan");

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

  // Data resmi (tabel nilai_ekonomi_tahunan — input Dinas via dasbor admin,
  // endpoint /api/v1/ekonomi/nilai-ekonomi). null = belum ada → halaman tetap
  // mode estimasi harga referensi (pola auto-upgrade, keputusan notulen #4).
  useEffect(() => {
    if (!bidangKey) return;
    let aktif = true;
    setResmi(null);
    setPeriode("tahunan");
    fetchNilaiEkonomiResmi(bidangKey).then((rows) => {
      if (aktif && rows) setResmi(rows);
    });
    return () => {
      aktif = false;
    };
  }, [bidangKey, retry]);

  const modeResmi = resmi != null && resmi.length > 0;
  const adaTriwulanResmi = (resmi ?? []).some((r) => r.triwulan != null);

  const tahunList = useMemo(
    () =>
      [
        ...new Set(
          modeResmi
            ? (resmi ?? []).map((r) => String(r.tahun))
            : units.map((u) => u.tahun),
        ),
      ].sort((a, b) => b.localeCompare(a)),
    [modeResmi, resmi, units],
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

  /* ---------- derivasi data resmi (modeResmi) ---------- */
  const resmiRowsTahun = useMemo(
    () => (modeResmi ? (resmi ?? []).filter((r) => String(r.tahun) === tahun) : []),
    [modeResmi, resmi, tahun],
  );

  const barisResmi = useMemo<BarisKomoditas[]>(() => {
    if (!modeResmi || periode !== "tahunan") return [];
    return resmiRowsTahun
      .filter((r) => r.triwulan == null)
      .map((r) => ({
        komoditas: r.komoditas,
        volume: r.volume,
        satuanVolume: r.satuan,
        konversiKg: 0,
        hargaRp: r.hargaProdusen,
        satuanHarga: r.satuan,
        subtotalRp: r.nilaiRp,
        terhitung: true,
        kelas: "resmi-live" as KelasEstimasi,
        sumber: "Tabel nilai_ekonomi_tahunan — input Dinas",
      }))
      .sort((a, b) => b.subtotalRp - a.subtotalRp);
  }, [modeResmi, periode, resmiRowsTahun]);

  // Triwulan langsung dari baris; Semester = gabungan (S1 = T1+T2, S2 = T3+T4).
  const periodeGroups = useMemo(() => {
    if (!modeResmi || periode === "tahunan") return [];
    const rows = resmiRowsTahun.filter((r) => r.triwulan != null);
    if (periode === "triwulan") {
      return [1, 2, 3, 4].map((t) => ({
        key: `T${t}`,
        label: `Triwulan ${t}`,
        rows: rows.filter((r) => r.triwulan === t),
      }));
    }
    return [
      {
        key: "S1",
        label: "Semester 1 (T1–T2)",
        rows: rows.filter((r) => (r.triwulan ?? 0) <= 2),
      },
      {
        key: "S2",
        label: "Semester 2 (T3–T4)",
        rows: rows.filter((r) => (r.triwulan ?? 0) >= 3),
      },
    ];
  }, [modeResmi, periode, resmiRowsTahun]);

  const periodeMatrix = useMemo(() => {
    if (periodeGroups.length === 0) return [];
    const semua = periodeGroups.flatMap((g) => g.rows);
    return [...new Set(semua.map((r) => r.komoditas))]
      .sort()
      .map((k) => {
        const sel = periodeGroups.map((g) => {
          const rs = g.rows.filter((r) => r.komoditas === k);
          return {
            ada: rs.length > 0,
            volume: rs.reduce((s, r) => s + r.volume, 0),
            nilai: rs.reduce((s, r) => s + r.nilaiRp, 0),
          };
        });
        return {
          komoditas: k,
          satuan: semua.find((r) => r.komoditas === k)?.satuan ?? "",
          sel,
          total: sel.reduce((s, x) => s + x.nilai, 0),
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [periodeGroups]);

  const totalResmiRp = useMemo(
    () => barisResmi.reduce((s, b) => s + b.subtotalRp, 0),
    [barisResmi],
  );
  const totalPeriodeRp = useMemo(
    () =>
      periodeGroups.reduce(
        (s, g) => s + g.rows.reduce((t, r) => t + r.nilaiRp, 0),
        0,
      ),
    [periodeGroups],
  );
  const teratasResmi = barisResmi[0];
  const shareTeratasResmi =
    teratasResmi && totalResmiRp > 0
      ? (teratasResmi.subtotalRp / totalResmiRp) * 100
      : 0;

  const chartResmiK = useMemo(
    () =>
      barisResmi
        .map((b) => ({ name: b.komoditas, nilai: b.subtotalRp / 1_000_000 }))
        .sort((a, b) => b.nilai - a.nilai)
        .slice(0, 12),
    [barisResmi],
  );
  const chartResmiHarga = useMemo(
    () =>
      barisResmi
        .filter((b) => b.hargaRp != null)
        .map((b) => ({
          name: b.komoditas,
          harga: (b.hargaRp ?? 0) / 1_000_000,
          satuan: `/${b.satuanHarga}`,
        }))
        .sort((a, b) => b.harga - a.harga)
        .slice(0, 12),
    [barisResmi],
  );
  const chartPeriode = useMemo(
    () =>
      periodeGroups.map((g) => ({
        name: g.label,
        nilai: g.rows.reduce((s, r) => s + r.nilaiRp, 0) / 1_000_000,
      })),
    [periodeGroups],
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
  const nResmi = barisKomoditas.filter((b) => b.kelas === "resmi-live").length;
  const nIndikatif = barisKomoditas.filter((b) => b.kelas === "indikatif").length;
  const nTanpa = barisKomoditas.filter((b) => !b.terhitung).length;

  /* ---------- render ---------- */

  if (!bidangKey) {
    return <Navigate to="/nilai-ekonomi/pangan" replace />;
  }

  const meta = BIDANG_META[bidangKey];
  const Ikon = IKON_BIDANG[meta.ikon];
  const namaSeri = "Estimasi Nilai (juta Rp)";
  const namaSeriResmi = "Nilai resmi (juta Rp)";
  const cakupanKec =
    kecamatan === SEMUA_KEC ? `${perKecamatan.length} kecamatan` : kecamatan;

  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          icon={<Ikon className="h-6 w-6" aria-hidden />}
          title={meta.judul}
          subtitle={`${meta.tagline} Harga referensi diakses ${AKSES_HARGA_TANGGAL}.`}
        />

        {/* Tab pemilih bidang — seragam dengan halaman sebaran & komoditas */}
        <nav className="flex flex-wrap gap-2" aria-label="Pemilih bidang nilai ekonomi">
          {PEMILIH_BIDANG.map((b) => {
            const Ic = b.icon;
            const aktif = b.key === bidangKey;
            return (
              <Link
                key={b.key}
                to={b.href}
                className={[
                  "inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                  aktif
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-700",
                ].join(" ")}
                aria-current={aktif ? "page" : undefined}
              >
                <Ic className="h-4 w-4" aria-hidden />
                {b.label}
              </Link>
            );
          })}
        </nav>

        <Toolbar>
          {/* Periode triwulan/semester (notulen Distankan KP 21 Sep 2026):
              aktif otomatis begitu baris triwulan tersedia di tabel
              nilai_ekonomi_tahunan (input Dinas via dasbor admin). */}
          <ToolbarField label="Periode">
            <div
              className="flex h-9 overflow-hidden rounded-lg border border-slate-200"
              title={
                modeResmi && adaTriwulanResmi
                  ? "Granularitas periode — data resmi input Dinas (Semester = T1+T2 / T3+T4)"
                  : "Triwulan & Semester aktif otomatis setelah data dinas diimpor (dasbor admin → domain Ekonomi → sheet Nilai Ekonomi)"
              }
            >
              <button
                type="button"
                onClick={() => setPeriode("tahunan")}
                className={
                  periode === "tahunan"
                    ? "border-r border-slate-200 bg-blue-800 px-3 text-xs font-semibold uppercase tracking-wide text-white"
                    : "border-r border-slate-200 px-3 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                }
              >
                Tahunan
              </button>
              <button
                type="button"
                disabled={!modeResmi || !adaTriwulanResmi}
                title="Menunggu data triwulan dari Dinas"
                onClick={() => setPeriode("triwulan")}
                className={
                  periode === "triwulan"
                    ? "border-r border-slate-200 bg-blue-800 px-3 text-xs font-semibold uppercase tracking-wide text-white"
                    : !modeResmi || !adaTriwulanResmi
                      ? "cursor-not-allowed border-r border-slate-200 bg-slate-50 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400"
                      : "border-r border-slate-200 px-3 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                }
              >
                Triwulan
              </button>
              <button
                type="button"
                disabled={!modeResmi || !adaTriwulanResmi}
                title="Menunggu data semester dari Dinas (S1 = T1+T2, S2 = T3+T4)"
                onClick={() => setPeriode("semester")}
                className={
                  periode === "semester"
                    ? "bg-blue-800 px-3 text-xs font-semibold uppercase tracking-wide text-white"
                    : !modeResmi || !adaTriwulanResmi
                      ? "cursor-not-allowed bg-slate-50 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400"
                      : "px-3 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                }
              >
                Semester
              </button>
            </div>
          </ToolbarField>
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
          {modeResmi ? (
            <ToolbarField label="Cakupan">
              <span className="inline-flex h-9 items-center rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                Kabupaten · data resmi Dinas
              </span>
            </ToolbarField>
          ) : (
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
          )}
          {(modeResmi
            ? periode === "tahunan"
              ? barisResmi.length > 0
              : periodeMatrix.length > 0
            : units.length > 0) && (
            <p className="ml-auto self-center text-xs text-slate-400">
              {modeResmi
                ? `${
                    periode === "tahunan" ? barisResmi.length : periodeMatrix.length
                  } komoditas · kabupaten (resmi)${tahun ? ` · ${tahun}` : ""}${
                    periode !== "tahunan" ? ` · ${periode}` : ""
                  }`
                : `${barisKomoditas.length} komoditas · ${cakupanKec}${
                    tahun ? ` · ${tahun}` : ""
                  }`}
            </p>
          )}
        </Toolbar>

        {loading ? (
          <LoadingSpinner label="Memuat dataset produksi…" />
        ) : modeResmi ? (
          <>
            {/* MODE RESMI — data input Dinas (tabel nilai_ekonomi_tahunan).
                Estimasi harga referensi tidak dipakai selama data resmi tersedia. */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <KpiCard
                icon={<DollarSign className="h-6 w-6" aria-hidden />}
                label={
                  periode === "tahunan"
                    ? "Total Nilai (Resmi)"
                    : `Total Nilai — ${periode === "triwulan" ? "Triwulan" : "Semester"}`
                }
                value={fmtRp(periode === "tahunan" ? totalResmiRp : totalPeriodeRp)}
                hint={`input Dinas · kabupaten${tahun ? ` · ${tahun}` : ""}`}
                color="bg-emerald-50 text-emerald-600"
              />
              <KpiCard
                icon={<Trophy className="h-6 w-6" aria-hidden />}
                label="Kontributor Terbesar"
                value={
                  periode === "tahunan"
                    ? (teratasResmi?.komoditas ?? "—")
                    : (periodeMatrix[0]?.komoditas ?? "—")
                }
                unit={
                  periode === "tahunan"
                    ? teratasResmi
                      ? fmtRp(teratasResmi.subtotalRp)
                      : undefined
                    : periodeMatrix[0]
                      ? fmtRp(periodeMatrix[0].total)
                      : undefined
                }
                hint={`porsi ${(
                  periode === "tahunan" ? shareTeratasResmi : totalPeriodeRp > 0 && periodeMatrix[0]
                    ? (periodeMatrix[0].total / totalPeriodeRp) * 100
                    : 0
                ).toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari total`}
                color="bg-blue-50 text-blue-600"
              />
              <KpiCard
                icon={<BadgeCheck className="h-6 w-6" aria-hidden />}
                label="Sumber Data"
                value="Resmi · Dinas"
                unit={
                  periode === "tahunan"
                    ? `${barisResmi.length} komoditas`
                    : `${periodeMatrix.length} komoditas`
                }
                hint={`tabel nilai_ekonomi_tahunan${periode !== "tahunan" ? ` · mode ${periode}` : ""}`}
                color="bg-blue-50 text-blue-700"
              />
            </div>

            {periode === "tahunan" ? (
              <>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <SectionCard
                    title="Kontribusi komoditas (juta Rp)"
                    icon={<Trophy className="h-4 w-4" aria-hidden />}
                  >
                    <div className="h-72">
                      <ResponsiveContainer>
                        <BarChart
                          data={chartResmiK}
                          layout="vertical"
                          margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis
                            type="number"
                            tickFormatter={(v) => `${v} jt`}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={110}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip
                            formatter={(v) => [fmtRp(Number(v ?? 0) * 1_000_000), namaSeriResmi]}
                          />
                          <Bar dataKey="nilai" name={namaSeriResmi} radius={[0, 4, 4, 0]}>
                            {chartResmiK.map((_, i) => (
                              <Cell key={i} fill={PALET[i % PALET.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                  <SectionCard
                    title="Harga produsen per komoditas (juta Rp)"
                    icon={<BadgeCheck className="h-4 w-4" aria-hidden />}
                  >
                    <div className="h-72">
                      <ResponsiveContainer>
                        <BarChart
                          data={chartResmiHarga}
                          layout="vertical"
                          margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis
                            type="number"
                            tickFormatter={(v) => `${v} jt`}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={110}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip
                            formatter={(v) => [fmtRp(Number(v ?? 0) * 1_000_000), "Harga produsen"]}
                          />
                          <Bar dataKey="harga" name="Harga produsen (juta Rp)" radius={[0, 4, 4, 0]}>
                            {chartResmiHarga.map((_, i) => (
                              <Cell key={i} fill={PALET[i % PALET.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                </div>

                <SectionCard
                  title={`Rincian resmi — kabupaten${tahun ? ` · ${tahun}` : ""}`}
                  icon={<DollarSign className="h-4 w-4" aria-hidden />}
                  bodyClassName="p-0"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-3 font-semibold">Komoditas</th>
                          <th className="px-4 py-3 text-right font-semibold">Volume</th>
                          <th className="px-4 py-3 text-right font-semibold">Harga Produsen</th>
                          <th className="px-4 py-3 text-right font-semibold">Nilai (Rp)</th>
                          <th className="px-4 py-3 font-semibold">Sumber</th>
                        </tr>
                      </thead>
                      <tbody>
                        {barisResmi.map((b) => (
                          <tr key={b.komoditas} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-700">{b.komoditas}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                              {fmtNum(b.volume)} {b.satuanVolume}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                              {fmtRp(b.hargaRp ?? 0)}/{b.satuanHarga}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">
                              {fmtRp(b.subtotalRp)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge tone="emerald">Resmi · input Dinas</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                          <td className="px-4 py-3">Jumlah total</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {fmtNum(barisResmi.reduce((s, b) => s + b.volume, 0))}{" "}
                            {barisResmi[0]?.satuanVolume ?? ""}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400">—</td>
                          <td className="px-4 py-3 text-right tabular-nums">{fmtRp(totalResmiRp)}</td>
                          <td className="px-4 py-3" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </SectionCard>
              </>
            ) : (
              <>
                <SectionCard
                  title={`Nilai per ${periode === "triwulan" ? "triwulan" : "semester"} (juta Rp)${tahun ? ` — ${tahun}` : ""}`}
                  icon={<DollarSign className="h-4 w-4" aria-hidden />}
                >
                  <div className="h-64">
                    <ResponsiveContainer>
                      <BarChart data={chartPeriode} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={48}
                        />
                        <YAxis
                          tickFormatter={(v) => `${v} jt`}
                          tick={{ fontSize: 11 }}
                          width={64}
                        />
                        <Tooltip
                          formatter={(v) => [fmtRp(Number(v ?? 0) * 1_000_000), namaSeriResmi]}
                        />
                        <Bar dataKey="nilai" name={namaSeriResmi} radius={[4, 4, 0, 0]}>
                          {chartPeriode.map((_, i) => (
                            <Cell key={i} fill={PALET[i % PALET.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {periode === "semester"
                      ? "Semester diturunkan dari gabungan triwulan (S1 = T1+T2, S2 = T3+T4)."
                      : "Angka per triwulan sesuai input Dinas pada sheet Nilai Ekonomi."}
                  </p>
                </SectionCard>

                <SectionCard
                  title={`Matriks komoditas × ${periode === "triwulan" ? "triwulan" : "semester"}${tahun ? ` — ${tahun}` : ""}`}
                  icon={<Trophy className="h-4 w-4" aria-hidden />}
                  bodyClassName="p-0"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-3 font-semibold">Komoditas</th>
                          {periodeGroups.map((g) => (
                            <th key={g.key} className="px-4 py-3 text-right font-semibold">
                              {g.label}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-right font-semibold">Total (Rp)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodeMatrix.map((m) => (
                          <tr
                            key={m.komoditas}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                          >
                            <td className="px-4 py-3 font-medium text-slate-700">{m.komoditas}</td>
                            {m.sel.map((s, i) => (
                              <td
                                key={i}
                                className="px-4 py-3 text-right tabular-nums text-slate-600"
                                title={s.ada ? `${fmtNum(s.volume)} ${m.satuan}` : undefined}
                              >
                                {s.ada ? fmtRp(s.nilai) : "—"}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">
                              {fmtRp(m.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                          <td className="px-4 py-3">Jumlah per periode</td>
                          {chartPeriode.map((c) => (
                            <td key={c.name} className="px-4 py-3 text-right tabular-nums">
                              {fmtRp(c.nilai * 1_000_000)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right tabular-nums">{fmtRp(totalPeriodeRp)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </SectionCard>
              </>
            )}
          </>
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
          />
        ) : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <KpiCard
                icon={<DollarSign className="h-6 w-6" aria-hidden />}
                label="Total Estimasi Nilai"
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
                color="bg-blue-50 text-blue-600"
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
                title="Harga referensi per komoditas"
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
                  <p className="mt-2 text-xs text-slate-400">
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
                            className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
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
                            <p className="mt-0.5 text-[10px] text-slate-400">
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
                            <span className="text-[10px] text-slate-400">{b.sumber}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-blue-200 bg-blue-50/50">
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">
                        Jumlah ({barisKomoditas.length} komoditas · {cakupanKec})
                      </td>
                      <td className="px-4 py-3 text-xs font-bold tabular-nums text-slate-700">
                        {fmtNum(totalVolume)} {satuanVolumeBidang}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold tabular-nums text-slate-700">
                        {hargaImplisit != null ? `${fmtRp(hargaImplisit)}/kg (implisit)` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold tabular-nums text-blue-900">
                        {fmtRp(totalRp)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
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
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-500">
            {meta.catatan.map((c) => (
              <li key={c}>{c}</li>
            ))}
            <li>
              Kelas sumber: <span className="font-semibold text-emerald-700">resmi-live</span> = harga
              Bappebti infoharga tingkat petani ({AKSES_HARGA_TANGGAL});{" "}
              <span className="font-semibold text-amber-700">indikatif</span> = harga wajar yang
              belum terverifikasi — perlu verifikasi lapangan.
            </li>
            <li>{KETERANGAN_PENCARIAN}</li>
            {modeResmi ? (
              <li className="font-semibold text-emerald-700">
                Mode RESMI aktif — data dari tabel nilai_ekonomi_tahunan (input Dinas
                via dasbor admin; endpoint /api/v1/ekonomi/nilai-ekonomi). Estimasi
                harga referensi tidak dipakai untuk bidang ini.
                {adaTriwulanResmi
                  ? " Data triwulan tersedia — Semester = gabungan T1+T2 / T3+T4."
                  : " Tombol Triwulan/Semester aktif otomatis setelah baris triwulan diimpor."}
              </li>
            ) : (
              <li>
                Struktur halaman siap menyerap dataset resmi /api/v1/ekonomi/nilai-ekonomi
                (tabel nilai_ekonomi_tahunan — input Dinas via dasbor admin, domain
                Ekonomi, sheet Nilai Ekonomi) begitu tersedia — estimasi harga referensi
                akan diganti nilai aktual.
              </li>
            )}
          </ul>
        </SectionCard>
      </div>
    </DefaultLayout>
  );
}
