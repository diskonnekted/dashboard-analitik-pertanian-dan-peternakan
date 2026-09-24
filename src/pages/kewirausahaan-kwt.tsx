/**
 * /kewirausahaan/kwt — Kewirausahaan Kelompok Wanita Tani.
 *
 * Jenis kelompok (schema `kwt_kelompok_wanita_tani`):
 * KWT (Kelompok Wanita Tani) · Pokdakan (Kelompok Memelihara Ikan Air Tawar) ·
 * Poklahsar (Kelompok Pengolah & Pemasar Hasil Perikanan) ·
 * Pokmamas (Kelompok Usaha Pangan Masyarakat).
 *
 * Endpoint backend /v1/kewirausahaan/kwt belum tersedia (data resmi
 * dijadwalkan 23 Sep 2026). Selama itu, halaman menampilkan DATA CONTOH
 * (placeholder) bertanda badge & banner amber — otomatis tergantikan begitu
 * endpoint mengembalikan data, tanpa perubahan kode.
 */
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Info,
  MapPin,
  RotateCcw,
  Sprout,
  Store,
  Table2,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DefaultLayout from "@/layouts/default";
import {
  Badge,
  KpiCard,
  LoadingSpinner,
  PageHeader,
  SectionCard,
  Toolbar,
  ToolbarField,
} from "@/components/ui";
import { fetchKwt, type KwtRow } from "@/services/api";

const fmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const formatNum = (v?: number | null) => (v == null ? "—" : fmt.format(v));

const JENIS_LIST = ["KWT", "Pokdakan", "Poklahsar", "Pokmamas"] as const;
const JENIS_TONE: Record<string, "blue"> = {
  KWT: "blue",
  Pokdakan: "blue",
  Poklahsar: "blue",
  Pokmamas: "blue",
};
const CHART_COLORS: Record<string, string> = {
  KWT: "#1e40af",
  Pokdakan: "#0891b2",
  Poklahsar: "#7c3aed",
  Pokmamas: "#d97706",
};

/* ------------------------------------------------------------------
   DATA CONTOH (placeholder) — 19 kelompok lintas kecamatan, struktur
   identik data resmi (KwtRow). Nama kelompok & produk = ilustratif;
   kecamatan/desa nyata Banjarnegara. Tidak untuk dipakai sebagai data
   resmi; otomatis tergantikan saat endpoint /v1/kewirausahaan/kwt
   mengembalikan data.
   ------------------------------------------------------------------ */
const PLACEHOLDER_ROWS: KwtRow[] = [
  { id: 1, nama_kelompok: "KWT Srikandi Sejahtera", kecamatan: "Banjarnegara", desa: "Kutabanjarnegara", jenis: "KWT", jumlah_anggota: 24, produk_andalan: "Keripik singkong & opak", tahun_registrasi: 2019 },
  { id: 2, nama_kelompok: "KWT Mekar Sari", kecamatan: "Purwanegara", desa: "Purwanegara", jenis: "KWT", jumlah_anggota: 18, produk_andalan: "Sayur hidroponik", tahun_registrasi: 2020 },
  { id: 3, nama_kelompok: "KWT Tunas Baru", kecamatan: "Susukan", desa: "Srayo", jenis: "KWT", jumlah_anggota: 20, produk_andalan: "Emping melinjo", tahun_registrasi: 2018 },
  { id: 4, nama_kelompok: "KWT Amanah", kecamatan: "Mandiraja", desa: "Mandirajawetan", jenis: "KWT", jumlah_anggota: 15, produk_andalan: "Katering & olahan beku", tahun_registrasi: 2021 },
  { id: 5, nama_kelompok: "KWT Berlian", kecamatan: "Bawang", desa: "Karangtengah", jenis: "KWT", jumlah_anggota: 22, produk_andalan: "Telur asin", tahun_registrasi: 2019 },
  { id: 6, nama_kelompok: "KWT Flamboyan", kecamatan: "Madukara", desa: "Semabong", jenis: "KWT", jumlah_anggota: 16, produk_andalan: "Olahan jahe & herbal", tahun_registrasi: 2022 },
  { id: 7, nama_kelompok: "KWT Melati", kecamatan: "Wanayasa", desa: "Wanayasa", jenis: "KWT", jumlah_anggota: 19, produk_andalan: "Kopi robusta olahan", tahun_registrasi: 2020 },
  { id: 8, nama_kelompok: "KWT Rosella", kecamatan: "Sigaluh", desa: "Sigaluh", jenis: "KWT", jumlah_anggota: 14, produk_andalan: "Selai & manisan buah", tahun_registrasi: 2023 },
  { id: 9, nama_kelompok: "KWT Lestari", kecamatan: "Purwareja Klampok", desa: "Purwadadi", jenis: "KWT", jumlah_anggota: 21, produk_andalan: "Keripik pisang kemasan", tahun_registrasi: 2019 },
  { id: 10, nama_kelompok: "KWT Karya Wangi", kecamatan: "Rakit", desa: "Candiwungu", jenis: "KWT", jumlah_anggota: 13, produk_andalan: "Abon ikan waduk", tahun_registrasi: 2021 },
  { id: 11, nama_kelompok: "KWT Sumber Rejeki", kecamatan: "Karangkobar", desa: "Karangkobar", jenis: "KWT", jumlah_anggota: 17, produk_andalan: "Pisang goreng kemasan", tahun_registrasi: 2022 },
  { id: 12, nama_kelompok: "Pokdakan Air Berkah", kecamatan: "Banjarnegara", desa: "Beji", jenis: "Pokdakan", jumlah_anggota: 12, produk_andalan: "Lele & nila konsumsi", tahun_registrasi: 2020 },
  { id: 13, nama_kelompok: "Pokdakan Tirta Mandiri", kecamatan: "Susukan", desa: "Susukan", jenis: "Pokdakan", jumlah_anggota: 10, produk_andalan: "Ikan hias & nila", tahun_registrasi: 2019 },
  { id: 14, nama_kelompok: "Pokdakan Mina Jaya", kecamatan: "Wanayasa", desa: "Merden", jenis: "Pokdakan", jumlah_anggota: 9, produk_andalan: "Lele kolam terpal", tahun_registrasi: 2021 },
  { id: 15, nama_kelompok: "Pokdakan Sehat Alam", kecamatan: "Bawang", desa: "Karanglojo", jenis: "Pokdakan", jumlah_anggota: 8, produk_andalan: "Nila & patin", tahun_registrasi: 2023 },
  { id: 16, nama_kelompok: "Poklahsar Berkah Tani", kecamatan: "Purwanegara", desa: "Kalicupak", jenis: "Poklahsar", jumlah_anggota: 9, produk_andalan: "Baso & nugget ikan", tahun_registrasi: 2022 },
  { id: 17, nama_kelompok: "Poklahsar Mina Rahayu", kecamatan: "Rakit", desa: "Galih", jenis: "Poklahsar", jumlah_anggota: 7, produk_andalan: "Ikan asin & kering waduk", tahun_registrasi: 2021 },
  { id: 18, nama_kelompok: "Pokmamas Pangan Makmur", kecamatan: "Mandiraja", desa: "Purwodadi", jenis: "Pokmamas", jumlah_anggota: 8, produk_andalan: "Tiwul instan", tahun_registrasi: 2022 },
  { id: 19, nama_kelompok: "Pokmamas Warung Sehat", kecamatan: "Purwareja Klampok", desa: "Brekat", jenis: "Pokmamas", jumlah_anggota: 6, produk_andalan: "Ampok & jagung pipil", tahun_registrasi: 2023 },
];

export default function KewirausahaanKwtPage() {
  const [realRows, setRealRows] = useState<KwtRow[] | null>(null);
  const [jenis, setJenis] = useState("all");
  const [kecamatan, setKecamatan] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    fetchKwt()
      .then((d) => {
        if (alive) setRealRows(d);
      })
      .catch(() => {
        if (alive) setRealRows([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const isPlaceholder = !(realRows && realRows.length > 0);
  const baseRows = isPlaceholder ? PLACEHOLDER_ROWS : (realRows ?? []);

  const kecamatanList = useMemo(
    () => [...new Set(baseRows.map((r) => r.kecamatan).filter((x): x is string => !!x))].sort(),
    [baseRows],
  );

  const scopedRows = useMemo(
    () => baseRows.filter((r) => (kecamatan === "all" ? true : r.kecamatan === kecamatan)),
    [baseRows, kecamatan],
  );

  const filtered = useMemo(
    () => scopedRows.filter((r) => (jenis === "all" ? true : r.jenis === jenis)),
    [scopedRows, jenis],
  );

  const tableRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((r) =>
      [r.nama_kelompok, r.kecamatan, r.desa, r.jenis, r.produk_andalan].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  }, [filtered, query]);

  const perKec = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    filtered.forEach((r) => {
      const cur = m.get(r.kecamatan) ?? { KWT: 0, Pokdakan: 0, Poklahsar: 0, Pokmamas: 0 };
      cur[r.jenis] = (cur[r.jenis] ?? 0) + 1;
      m.set(r.kecamatan, cur);
    });
    const tot = (v: { KWT: number; Pokdakan: number; Poklahsar: number; Pokmamas: number }) =>
      v.KWT + v.Pokdakan + v.Poklahsar + v.Pokmamas;
    return [...m.entries()]
      .map(([kecamatan, v]) => ({
        kecamatan,
        KWT: v.KWT ?? 0,
        Pokdakan: v.Pokdakan ?? 0,
        Poklahsar: v.Poklahsar ?? 0,
        Pokmamas: v.Pokmamas ?? 0,
      }))
      .sort((a, b) => tot(b) - tot(a));
  }, [filtered]);

  if (realRows === null) {
    return (
      <DefaultLayout>
        <section className="flex flex-col gap-8">
          <PageHeader
            icon={<Store className="h-6 w-6" />}
            title="Kewirausahaan KWT"
            subtitle="Kelompok Wanita Tani (KWT), Pokdakan, Poklahsar, dan Pokmamas per kecamatan/desa Kabupaten Banjarnegara."
          />
          <LoadingSpinner label="Memuat data kelompok wanita tani…" />
        </section>
      </DefaultLayout>
    );
  }

  /* ---------- statistik turunan (non-hook) ---------- */
  const totalKelompok = filtered.length;
  const totalKwt = filtered.filter((r) => r.jenis === "KWT").length;
  const totalAnggota = filtered.reduce((s, r) => s + (r.jumlah_anggota ?? 0), 0);
  const kecCount = new Set(filtered.map((r) => r.kecamatan)).size;
  const avgAnggota = totalKelompok > 0 ? totalAnggota / totalKelompok : 0;

  const perJenis = JENIS_LIST.map((j) => ({
    jenis: j,
    n: filtered.filter((r) => r.jenis === j).length,
  }));

  const resetFilters = () => {
    setJenis("all");
    setKecamatan("all");
    setQuery("");
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8">
        <PageHeader
          icon={<Store className="h-6 w-6" />}
          title="Kewirausahaan KWT"
          subtitle="Kelompok Wanita Tani (KWT), Pokdakan, Poklahsar, dan Pokmamas per kecamatan/desa Kabupaten Banjarnegara."
          actions={
            <>
              {isPlaceholder ? (
                <Badge tone="amber">Data Contoh · Placeholder</Badge>
              ) : (
                <Badge tone="emerald">Data Resmi</Badge>
              )}
              <Badge tone="blue">{totalKelompok} kelompok</Badge>
            </>
          }
        />

        {isPlaceholder && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm leading-relaxed">
              <span className="font-semibold">Pratinjau dengan data contoh.</span> Struktur tampilan
              (filter, KPI, grafik, tabel) sudah final dan konsisten dengan halaman lain; nama
              kelompok &amp; angka di bawah adalah data contoh, bukan angka resmi. Data resmi
              kewirausahaan (KWT/Pokdakan/Poklahsar/Pokmamas) dijadwalkan tersedia{" "}
              <span className="font-semibold">23 September 2026</span> dan akan otomatis menggantikan
              seluruh data contoh begitu basis data tersambung.
            </p>
          </div>
        )}

        {/* ---------- Filter ---------- */}
        <Toolbar>
          <ToolbarField label="Jenis">
            <select
              value={jenis}
              onChange={(e) => setJenis(e.target.value)}
              className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20"
            >
              <option value="all">Semua Jenis</option>
              {JENIS_LIST.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </ToolbarField>
          <ToolbarField label="Kecamatan">
            <select
              value={kecamatan}
              onChange={(e) => setKecamatan(e.target.value)}
              className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20"
            >
              <option value="all">Semua Kecamatan</option>
              {kecamatanList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </ToolbarField>
          <button
            type="button"
            onClick={resetFilters}
            className="h-[38px] inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset
          </button>
        </Toolbar>

        {/* ---------- KPI + komposisi ---------- */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            label="Total Kelompok"
            value={formatNum(totalKelompok)}
            unit="kelompok"
            color="bg-blue-300"
            hint="semua jenis pada filter aktif"
          />
          <KpiCard
            icon={<Sprout className="h-5 w-5" />}
            label="Kelompok KWT"
            value={formatNum(totalKwt)}
            unit="kelompok"
            color="bg-emerald-300"
            hint="jenis lain: Pokdakan · Poklahsar · Pokmamas"
          />
          <KpiCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="Total Anggota"
            value={formatNum(totalAnggota)}
            unit="orang"
            color="bg-amber-300"
            hint={`rata-rata ${fmt.format(Math.round(avgAnggota * 10) / 10)} orang/kelompok`}
          />
          <SectionCard
            title="Komposisi Jenis"
            icon={<MapPin className="h-4 w-4 text-blue-800" />}
            className="flex-1"
          >
            <div className="flex h-full flex-col justify-center gap-2.5">
              {perJenis.map((j) => {
                const pct = totalKelompok > 0 ? (j.n / totalKelompok) * 100 : 0;
                return (
                  <div key={j.jenis} className="flex items-center gap-2 text-xs">
                    <span className="w-20 shrink-0 truncate text-slate-600">{j.jenis}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-blue-800"
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right tabular-nums text-slate-500">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
              {totalKelompok === 0 && (
                <p className="text-xs text-slate-400">Tidak ada data pada filter ini.</p>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ---------- Grafik ---------- */}
        <SectionCard
          title="Sebaran Kelompok per Kecamatan"
          icon={<BarChart3 className="h-4 w-4 text-blue-800" />}
          actions={
            <>
              <Badge tone="blue">kelompok</Badge>
              <Badge tone="slate">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {kecCount} kecamatan
                </span>
              </Badge>
            </>
          }
        >
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perKec} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="kecamatan"
                  width={130}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(30, 64, 175, 0.06)" }}
                  formatter={(v) => [`${v} kelompok`, undefined]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {JENIS_LIST.map((j) => (
                  <Bar
                    key={j}
                    dataKey={j}
                    stackId="kel"
                    fill={CHART_COLORS[j]}
                    name={j}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* ---------- Tabel ---------- */}
        <SectionCard
          title="Tabel Kelompok"
          icon={<Table2 className="h-4 w-4 text-blue-800" />}
          actions={
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama / desa / produk…"
                className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20"
              />
              <Badge tone="slate">{tableRows.length} baris</Badge>
            </>
          }
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">No.</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nama Kelompok</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Jenis</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Kecamatan</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Desa</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Anggota</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Produk Andalan</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tahun Registrasi</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => (
                  <tr
                    key={r.id ?? `${r.nama_kelompok}-${i}`}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5 border-b border-slate-100 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 font-medium text-slate-700">{r.nama_kelompok}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100">
                      <Badge tone={JENIS_TONE[r.jenis] ?? "slate"}>{r.jenis}</Badge>
                    </td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-slate-700">{r.kecamatan}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-slate-700">{r.desa}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-700">{formatNum(r.jumlah_anggota)}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-slate-700">{r.produk_andalan ?? "—"}</td>
                    <td className="px-4 py-2.5 border-b border-slate-100 text-right tabular-nums text-slate-700">{r.tahun_registrasi ?? "—"}</td>
                  </tr>
                ))}
                {tableRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                      Tidak ada baris yang cocok dengan filter / pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
              {tableRows.length > 0 && (
                <tfoot className="bg-slate-50 font-semibold text-slate-800">
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={5} className="px-4 py-3">Jumlah ({tableRows.length} kelompok)</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatNum(tableRows.reduce((s, r) => s + (r.jumlah_anggota ?? 0), 0))} org
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">—</td>
                    <td className="px-4 py-3 text-right text-slate-400">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-500">
            Sumber: Distankan Kab. Banjarnegara — bidang 6.2 Kewirausahaan. KWT = Kelompok Wanita
            Tani; Pokdakan = kelompok memelihara ikan air tawar; Poklahsar = pengolah &amp;
            pemasar hasil perikanan; Pokmamas = kelompok usaha pangan masyarakat.
            {isPlaceholder && (
              <span className="font-semibold text-amber-700">
                {" "}Saat ini menampilkan DATA CONTOH (placeholder), bukan angka resmi.
              </span>
            )}
          </div>
        </SectionCard>
      </section>
    </DefaultLayout>
  );
}
