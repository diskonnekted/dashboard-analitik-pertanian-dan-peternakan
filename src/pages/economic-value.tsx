import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  Tag,
  Trophy,
  Waves,
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
import {
  fetchNilaiProduksiBudidaya,
  fetchNilaiProduksiTangkap,
  type NilaiProduksiRow,
} from "@/services/api";
import {
  PRODUK_IKAN_TAWAR,
  PRODUK_IKAN_SUMBER,
  PRODUK_IKAN_TANGGAL,
  hargaTengah,
} from "@/data/produk-ikan";
import {
  BIDANG_META,
  BIDANG_NILAI_EKONOMI,
} from "@/services/nilai-ekonomi-estimasi";

/**
 * Nilai Ekonomi Perikanan — /economic-value (halaman kanonik perikanan).
 *
 * Seragam dengan /nilai-ekonomi/:bidang (PageHeader + tab pemilih bidang +
 * Toolbar + KpiCard + SectionCard + PALET). Sumber = data aktual Distankan
 * (budidaya + tangkap), BUKAN estimasi harga referensi.
 *
 * Catatan penting: data BPS memublikasikan produksi per METODE PEMELIHARAAN /
 * ALAT TANGKAP (kolam, KJA, jala, dll.) — TIDAK per jenis ikan. Sehingga
 * "rincian per jenis ikan" di bawah adalah ESTIMASI komposisi pangsa (% indikatif)
 * dari data/produk-ikan.ts, bukan angka BPS.
 */

const IKON_BIDANG = { wheat: Wheat, carrot: Carrot, coffee: Coffee, beef: Beef } as const;

type PemilihBidangItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
};

/** Tab pemilih bidang — sama dengan /nilai-ekonomi/:bidang; perikanan aktif. */
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

type SubSektor = "Budidaya" | "Tangkap";

export default function EconomicValuePage() {
  const [budidayaData, setBudidayaData] = useState<NilaiProduksiRow[]>([]);
  const [tangkapData, setTangkapData] = useState<NilaiProduksiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [gagal, setGagal] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const [subSektor, setSubSektor] = useState<SubSektor>("Budidaya");
  const [tahun, setTahun] = useState("");
  const [kecamatan, setKecamatan] = useState(SEMUA_KEC);

  useEffect(() => {
    let aktif = true;
    setLoading(true);
    setGagal(null);
    Promise.all([fetchNilaiProduksiBudidaya(), fetchNilaiProduksiTangkap()])
      .then(([budidaya, tangkap]) => {
        if (!aktif) return;
        setBudidayaData(budidaya);
        setTangkapData(tangkap);
      })
      .catch(() => {
        if (!aktif) return;
        setGagal("Gagal memuat data nilai produksi perikanan (backend & fallback CSV tidak merespons).");
      })
      .finally(() => {
        if (!aktif) return;
        setLoading(false);
      });
    return () => {
      aktif = false;
    };
  }, [retry]);

  const activeRaw = useMemo(
    () => (subSektor === "Budidaya" ? budidayaData : tangkapData),
    [subSektor, budidayaData, tangkapData],
  );

  const tahunList = useMemo(
    () =>
      Array.from(new Set(activeRaw.map((d) => d.tahun).filter(Boolean))).sort(
        (a, b) => b.localeCompare(a),
      ),
    [activeRaw],
  );

  useEffect(() => {
    if (tahunList.length > 0 && !tahunList.includes(tahun)) setTahun(tahunList[0]);
    if (tahunList.length === 0) setTahun("");
  }, [tahunList, tahun]);

  const currentData = useMemo(
    () => activeRaw.filter((d) => d.tahun === tahun),
    [activeRaw, tahun],
  );

  const kecamatanList = useMemo(() => {
    const set = new Set(currentData.map((d) => d.kecamatan));
    return [SEMUA_KEC, ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [currentData]);

  useEffect(() => {
    if (!kecamatanList.includes(kecamatan)) setKecamatan(SEMUA_KEC);
  }, [kecamatanList, kecamatan]);

  const filteredData = useMemo(
    () =>
      kecamatan === SEMUA_KEC
        ? currentData
        : currentData.filter((d) => d.kecamatan === kecamatan),
    [currentData, kecamatan],
  );

  // Nilai sumber = ribu rupiah -> rupiah penuh
  const toRupiah = (ribu: number) => ribu * 1000;

  // Agregat per METODE pemeliharaan / alat tangkap (data aktual BPS)
  const byMetode = useMemo(() => {
    const map = new Map<string, { nilai: number; produksi: number }>();
    filteredData.forEach((row) => {
      row.jenis.forEach((j) => {
        const cur = map.get(j.label) || { nilai: 0, produksi: 0 };
        cur.nilai += j.nilai;
        cur.produksi += j.produksi;
        map.set(j.label, cur);
      });
    });
    return Array.from(map.entries()).map(([label, v]) => ({
      label,
      nilaiRibu: v.nilai,
      nilaiRp: toRupiah(v.nilai),
      produksi: v.produksi,
      hargaImplisit: v.produksi > 0 ? toRupiah(v.nilai) / v.produksi : 0,
    }));
  }, [filteredData]);

  const stats = useMemo(() => {
    const totalNilaiRibu = byMetode.reduce((a, j) => a + j.nilaiRibu, 0);
    const totalProduksi = byMetode.reduce((a, j) => a + j.produksi, 0);
    const totalRp = toRupiah(totalNilaiRibu);
    const hargaRata = totalProduksi > 0 ? totalRp / totalProduksi : 0;
    let topMetode = "—";
    let topVal = 0;
    byMetode.forEach((j) => {
      if (j.nilaiRibu > topVal) {
        topVal = j.nilaiRibu;
        topMetode = j.label;
      }
    });
    return {
      totalRp,
      totalProduksi,
      hargaRata,
      topMetode,
      topNilaiRp: toRupiah(topVal),
      topShare: totalNilaiRibu > 0 ? (topVal / totalNilaiRibu) * 100 : 0,
    };
  }, [byMetode]);

  const perKecamatan = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach((row) => {
      const total = row.jenis.reduce((a, j) => a + j.nilai, 0);
      map.set(row.kecamatan, (map.get(row.kecamatan) || 0) + total);
    });
    return Array.from(map.entries())
      .map(([name, nilaiRibu]) => ({ name, nilaiJuta: toRupiah(nilaiRibu) / 1_000_000 }))
      .sort((a, b) => b.nilaiJuta - a.nilaiJuta);
  }, [filteredData]);

  const kontribusi = useMemo(() => {
    const total = byMetode.reduce((a, j) => a + j.nilaiRibu, 0);
    return byMetode
      .map((j) => ({
        name: j.label,
        nilaiJuta: j.nilaiRp / 1_000_000,
        pct: total > 0 ? (j.nilaiRibu / total) * 100 : 0,
      }))
      .sort((a, b) => b.nilaiJuta - a.nilaiJuta);
  }, [byMetode]);

  const hargaData = useMemo(
    () =>
      byMetode
        .filter((j) => j.produksi > 0)
        .map((j) => ({ name: j.label, harga: Math.round(j.hargaImplisit) }))
        .sort((a, b) => b.harga - a.harga),
    [byMetode],
  );

  // Estimasi per JENIS IKAN (spesies) — pangsa komposisi indikatif dari
  // produk-ikan.ts. Basis = gabungan budidaya + tangkap tingkat KABUPATEN
  // untuk tahun terpilih (pangsa tidak tersedia per sub-sektor/kecamatan).
  const perSpesies = useMemo(() => {
    const semua = [...budidayaData, ...tangkapData].filter((d) => d.tahun === tahun);
    const nilaiRibu = semua.reduce(
      (a, r) => a + r.jenis.reduce((b, j) => b + j.nilai, 0),
      0,
    );
    const produksi = semua.reduce(
      (a, r) => a + r.jenis.reduce((b, j) => b + j.produksi, 0),
      0,
    );
    const nilaiRp = toRupiah(nilaiRibu);
    return PRODUK_IKAN_TAWAR.map((p) => {
      const pangsa = p.pangsa ?? 0;
      return {
        nama: p.nama,
        pangsa,
        harga: hargaTengah(p),
        estimasiProduksi: (produksi * pangsa) / 100,
        estimasiNilai: (nilaiRp * pangsa) / 100,
        estimasiNilaiJuta: (nilaiRp * pangsa) / 100 / 1_000_000,
        sentra: p.sentra ?? [],
        catatan: p.catatan,
      };
    }).sort((a, b) => b.estimasiNilai - a.estimasiNilai);
  }, [budidayaData, tangkapData, tahun]);

  const cakupanKec =
    kecamatan === SEMUA_KEC ? `${perKecamatan.length} kecamatan` : kecamatan;

  return (
    <DefaultLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          icon={<Fish className="h-6 w-6" aria-hidden />}
          title="Nilai Ekonomi Perikanan"
          subtitle="Nilai produksi, harga rata-rata implisit & kontribusi sub-sektor perikanan Kabupaten Banjarnegara — data aktual Distankan (budidaya & tangkap)."
        />

        {/* Tab pemilih bidang — seragam dengan /nilai-ekonomi/:bidang */}
        <nav className="flex flex-wrap gap-2" aria-label="Pemilih bidang nilai ekonomi">
          {PEMILIH_BIDANG.map((b) => {
            const Ic = b.icon;
            const aktif = b.key === "perikanan";
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
          <ToolbarField label="Sub-sektor">
            <div className="flex h-9 overflow-hidden rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setSubSektor("Budidaya")}
                className={
                  subSektor === "Budidaya"
                    ? "flex items-center gap-1.5 border-r border-slate-200 bg-blue-800 px-3 text-xs font-semibold uppercase tracking-wide text-white"
                    : "flex items-center gap-1.5 border-r border-slate-200 px-3 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                }
              >
                <Fish className="h-3.5 w-3.5" aria-hidden /> Budidaya
              </button>
              <button
                type="button"
                onClick={() => setSubSektor("Tangkap")}
                className={
                  subSektor === "Tangkap"
                    ? "flex items-center gap-1.5 bg-blue-800 px-3 text-xs font-semibold uppercase tracking-wide text-white"
                    : "flex items-center gap-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                }
              >
                <Waves className="h-3.5 w-3.5" aria-hidden /> Tangkap
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
          {byMetode.length > 0 && (
            <p className="ml-auto self-center text-xs text-slate-400">
              {byMetode.length} metode · {cakupanKec}
              {tahun ? ` · ${tahun}` : ""} · {subSektor}
            </p>
          )}
        </Toolbar>

        {loading ? (
          <LoadingSpinner label="Memuat data nilai produksi perikanan…" />
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
        ) : byMetode.length === 0 ? (
          <EmptyStatePlaceholder
            title={`Data nilai ekonomi ${subSektor.toLowerCase()} tidak tersedia`}
            message={
              `Tidak ada data nilai produksi ${subSektor.toLowerCase()} untuk tahun` +
              (tahun ? ` ${tahun}` : "") +
              " dan kecamatan terpilih. Pilih kombinasi filter lain."
            }
          />
        ) : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <KpiCard
                icon={<DollarSign className="h-6 w-6" aria-hidden />}
                label={`Total Nilai Ekonomi — ${subSektor}`}
                value={fmtRp(stats.totalRp)}
                hint={`${fmtNum(stats.totalProduksi)} kg produksi · ${cakupanKec}${tahun ? ` · ${tahun}` : ""}`}
                color="bg-emerald-50 text-emerald-600"
              />
              <KpiCard
                icon={<Tag className="h-6 w-6" aria-hidden />}
                label="Harga Rata-rata Implisit"
                value={fmtRp(stats.hargaRata)}
                hint="Per kg (nilai ÷ produksi)"
                color="bg-amber-50 text-amber-600"
              />
              <KpiCard
                icon={<Trophy className="h-6 w-6" aria-hidden />}
                label="Kontributor Terbesar"
                value={fmtRp(stats.topNilaiRp)}
                hint={`${stats.topMetode} · porsi ${stats.topShare.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`}
                color="bg-blue-50 text-blue-600"
              />
            </div>

            {/* Nilai per kecamatan */}
            {kecamatan === SEMUA_KEC && perKecamatan.length > 1 && (
              <SectionCard
                title={`Nilai ekonomi per kecamatan — ${tahun}`}
                icon={<DollarSign className="h-4 w-4 text-blue-800" aria-hidden />}
              >
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perKecamatan} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
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
                          "Nilai",
                        ]}
                      />
                      <Bar dataKey="nilaiJuta" name="Nilai" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SectionCard
                title="Kontribusi per metode produksi (juta Rp)"
                icon={<Trophy className="h-4 w-4 text-blue-800" aria-hidden />}
              >
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={kontribusi.map((k) => ({
                        name: k.name.length > 18 ? `${k.name.slice(0, 17)}…` : k.name,
                        nilaiJuta: k.nilaiJuta,
                        pct: k.pct,
                      }))}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickFormatter={(v: number) => `${v.toLocaleString("id-ID")} jt`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        tick={{ fontSize: 10, fill: "#475569" }}
                      />
                      <Tooltip
                        formatter={(v: any, _n: any, p: any) => [
                          `Rp ${Number(v).toLocaleString("id-ID", { maximumFractionDigits: 1 })} juta (${p.payload.pct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%)`,
                          "Nilai",
                        ]}
                      />
                      <Bar dataKey="nilaiJuta" name="Nilai" radius={[0, 4, 4, 0]}>
                        {kontribusi.map((k, i) => (
                          <Cell key={k.name} fill={PALET[i % PALET.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard
                title="Harga implisit per metode produksi (Rp/kg)"
                icon={<Tag className="h-4 w-4 text-blue-800" aria-hidden />}
              >
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={hargaData.map((h) => ({
                        name: h.name.length > 18 ? `${h.name.slice(0, 17)}…` : h.name,
                        harga: h.harga,
                      }))}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickFormatter={(v: number) => `${(v / 1000).toLocaleString("id-ID")}rb`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        tick={{ fontSize: 10, fill: "#475569" }}
                      />
                      <Tooltip formatter={(v) => [fmtRp(Number(v ?? 0)), "Harga implisit (Rp/kg)"]} />
                      <Bar dataKey="harga" name="Harga implisit (Rp/kg)" fill="#0d9488" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </div>

            {/* ===== Rincian per JENIS IKAN (spesies — estimasi komposisi) ===== */}
            <SectionCard
              title={`Estimasi nilai per jenis ikan — ${tahun || "—"}`}
              icon={<Fish className="h-4 w-4 text-blue-800" aria-hidden />}
            >
              <p className="mb-3 text-xs text-slate-500">
                BPS tidak memublikasikan volume per jenis ikan, hanya per metode
                pemeliharaan/alat tangkap. Rincian ini adalah{" "}
                <span className="font-semibold text-amber-700">estimasi komposisi pangsa</span>{" "}
                (indikatif) atas total produksi & nilai kabupaten — basis{" "}
                {PRODUK_IKAN_SUMBER.toLowerCase()} ({PRODUK_IKAN_TANGGAL}).
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={perSpesies.map((s) => ({
                      name: s.nama,
                      nilaiJuta: s.estimasiNilaiJuta,
                    }))}
                    margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      angle={-20}
                      textAnchor="end"
                      height={56}
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
                        "Estimasi nilai",
                      ]}
                    />
                    <Bar dataKey="nilaiJuta" name="Estimasi nilai" radius={[4, 4, 0, 0]}>
                      {perSpesies.map((s, i) => (
                        <Cell key={s.nama} fill={PALET[i % PALET.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard
              title="Rincian per jenis ikan"
              icon={<Fish className="h-4 w-4 text-blue-800" aria-hidden />}
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      {[
                        "Jenis Ikan",
                        "Pangsa",
                        "Harga Ref. (Rp/kg)",
                        "Estimasi Produksi (kg)",
                        "Estimasi Nilai (Rp)",
                        "Sentra Utama",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {perSpesies.map((s) => (
                      <tr key={s.nama} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{s.nama}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{s.catatan}</p>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">
                          {s.pangsa.toLocaleString("id-ID")}%
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">{fmtRp(s.harga)}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">
                          {fmtNum(s.estimasiProduksi)}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-slate-800">
                          {fmtRp(s.estimasiNilai)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {s.sentra.length > 0 ? s.sentra.join(", ") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-blue-200 bg-blue-50/50">
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">
                        Jumlah ({perSpesies.length} jenis)
                      </td>
                      <td className="px-4 py-3 text-xs font-bold tabular-nums text-slate-700">100%</td>
                      <td className="px-4 py-3 text-xs font-bold tabular-nums text-slate-700">
                        tertimbang
                      </td>
                      <td className="px-4 py-3 text-xs font-bold tabular-nums text-slate-700">
                        {fmtNum(perSpesies.reduce((a, s) => a + s.estimasiProduksi, 0))}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold tabular-nums text-blue-900">
                        {fmtRp(perSpesies.reduce((a, s) => a + s.estimasiNilai, 0))}
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="border-t border-slate-100 px-4 py-2">
                <Badge tone="amber">
                  Indikatif · estimasi komposisi — bukan angka BPS per jenis
                </Badge>
              </div>
            </SectionCard>

            {/* Rincian per metode produksi (data aktual Distankan) */}
            <SectionCard
              title={`Rincian per metode ${subSektor.toLowerCase()} — ${cakupanKec}${tahun ? ` · ${tahun}` : ""}`}
              icon={<DollarSign className="h-4 w-4 text-blue-800" aria-hidden />}
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      {["Metode", "Produksi (kg)", "Nilai (Rp)", "Harga Implisit (Rp/kg)"].map(
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
                    {byMetode.map((j) => (
                      <tr key={j.label} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-800">{j.label}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">{fmtNum(j.produksi)}</td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-slate-800">
                          {fmtRp(j.nilaiRp)}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-700">
                          {j.produksi > 0 ? fmtRp(j.hargaImplisit) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-blue-200 bg-blue-50/50">
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">
                        Jumlah ({byMetode.length} metode · {cakupanKec})
                      </td>
                      <td className="px-4 py-3 text-xs font-bold tabular-nums text-slate-700">
                        {fmtNum(stats.totalProduksi)}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold tabular-nums text-blue-900">
                        {fmtRp(stats.totalRp)}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold tabular-nums text-slate-700">
                        {stats.totalProduksi > 0 ? fmtRp(stats.hargaRata) : "—"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </SectionCard>
          </>
        )}

        {/* Metodologi & sumber */}
        <SectionCard
          title="Metodologi, Harga & Sumber"
          icon={<BadgeCheck className="h-4 w-4 text-blue-800" aria-hidden />}
        >
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-500">
            <li>
              Nilai produksi bersumber dari data Distankan KP (budidaya & tangkap) —
              satuan <span className="font-semibold">ribu rupiah</span> pada sumber,
              dikonversi ke rupiah penuh di halaman ini.
            </li>
            <li>
              Harga rata-rata implisit = total nilai ÷ total produksi (kg) — bukan
              harga pasar per jenis.
            </li>
            <li>
              Rincian per jenis ikan memakai <span className="font-semibold">pangsa komposisi indikatif</span>{" "}
              (Σ = 100%) sesuai katalog {PRODUK_IKAN_SUMBER.toLowerCase()} (
              {PRODUK_IKAN_TANGGAL}) — Lele mendominasi, disusul grup Nila/Mujair.
            </li>
            <li>
              Catatan koreksi data sumber: pada 2022 budidaya, 4 sel kecamatan di xlsx
              tertulis rupiah penuh (1000× lipat) — KJA: Bawang & Wanadadi; Minapadi:
              Mandiraja & Purwanegara — dikoreksi saat regenerasi CSV; baris Jumlah
              xlsx 2022 untuk KJA & Minapadi ikut terdistorsi sehingga tidak dipakai
              sebagai pembanding. Harga implisit 2022 pasca-koreksi kembali wajar
              (KJA ≈ Rp 24.000/kg, Minapadi ≈ Rp 20.000/kg). Minapadi 2021 tidak
              tercatat pada sumber.
            </li>
            <li>
              Dua sel "Lainnya" 2021 tangkap (Bawang, Wanadadi) bernilai jauh di bawah
              produksi × harga wajar (quirk data BPS) — dibiarkan sesuai sumber.
            </li>
          </ul>
        </SectionCard>
      </div>
    </DefaultLayout>
  );
}
