/**
 * /kecamatan/:kec — profil pertanian satu kecamatan.
 *
 * Redesign visual (sep 2026): hero ber-dekorasi + strip statistik kaca
 * (menggantikan baris kartu KPI), panel domain dengan karakter visual
 * berbeda per domain (tile rasio + bar komposisi utk lahan; kartu grup
 * ber-gradient dgn bar proporsional utk ternak/perikanan; tabel zebra +
 * highlight komoditas terbesar utk pangan; grid tile utk lumbung &
 * kelembagaan), ikon chip berwarna per domain, kartu desa dgn hover lift
 * + bar luas relatif.
 *
 * Logika data TIDAK berubah dari versi sebelumnya: semua panel
 * independently-failable (sumber gagal → panel disembunyikan, anti-kedip),
 * agregat dihitung dari baris per desa.
 */
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Anchor,
  ArrowRight,
  Beef,
  Bird,
  BookOpen,
  Building,
  Fish,
  Home,
  Landmark,
  Leaf,
  MapPin,
  Package,
  Rabbit,
  Ruler,
  Scale,
  Sprout,
  Table2,
  UserCheck,
  Users,
  Warehouse,
  Wheat,
} from "lucide-react";
import DefaultLayout from "@/layouts/default";
import { Badge, LoadingSpinner } from "@/components/ui";
import { KecamatanMapMini } from "@/components/kecamatan/KecamatanMapMini";
import {
  fetchKecamatanDetail,
  fetchKecamatanIndex,
  type KecamatanDetailResult,
  type KecamatanIndex,
} from "@/services/kecamatan";

/* ---------- util presentasi ---------- */

type IconType = ComponentType<{ className?: string }>;

/** Warna aksen per domain — chip ikon panel. */
const TONES = {
  blue: "from-blue-500 to-blue-700",
  amber: "from-amber-500 to-orange-600",
  emerald: "from-emerald-500 to-teal-600",
  cyan: "from-cyan-500 to-sky-600",
  orange: "from-orange-500 to-red-500",
  violet: "from-violet-500 to-purple-600",
  teal: "from-teal-500 to-emerald-600",
} as const;

const fmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const num = (v?: number | null) => (v == null ? "—" : fmt.format(v));
const num1 = (v?: number | null) => (v == null ? "—" : fmt1.format(v));

/** Ubah pasangan [label, nilai] → baris terurut menurun, tanpa nilai 0. */
function rowsOf(
  pairs: Array<[string, number | null | undefined]>,
): Array<{ label: string; value: number }> {
  return pairs
    .map(([label, v]) => ({ label, value: Number(v) || 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
}

/* ---------- komponen presentasi lokal ---------- */

/** Kartu panel domain — chip ikon berwarna, judul, subjudul, slot aksi. */
function PanelCard({
  icon: Icon,
  tone,
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  icon: IconType;
  tone: keyof typeof TONES;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
    >
      <header className="mb-3 flex items-start gap-3">
        <span
          className={`
            flex h-9 w-9 shrink-0 items-center justify-center
            rounded-xl bg-gradient-to-br text-white shadow-sm
            ${TONES[tone]}
          `}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-tight text-slate-900">
            {title}
          </h2>
          <p className="mt-0.5 text-xs leading-snug text-slate-500">{subtitle}</p>
        </div>
        {actions != null && <div className="shrink-0">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

/** Kartu grup (ternak / perikanan) — ikon + total + bar proporsional. */
function GroupCard({
  icon: Icon,
  title,
  sub,
  total,
  unit,
  rows,
  bg,
  ring,
  bar,
}: {
  icon: IconType;
  title: string;
  sub: string;
  total: number;
  unit: string;
  rows: Array<{ label: string; value: number }>;
  bg: string;
  ring: string;
  bar: string;
}) {
  const max = rows[0]?.value ?? 0;
  return (
    <div className={`rounded-lg bg-gradient-to-br p-3 ring-1 ${bg} ${ring}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-slate-200">
          <Icon className="h-3.5 w-3.5 text-slate-700" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold leading-tight text-slate-800">
            {title}
          </div>
          <div className="text-[10px] leading-tight text-slate-500">{sub}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold tabular-nums text-slate-800">
            {fmt.format(total)}
          </div>
          <div className="text-[10px] leading-none text-slate-500">{unit}</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const pct = max > 0 ? (r.value / max) * 100 : 0;
          return (
            <div key={r.label} className="text-xs">
              <div className="mb-0.5 flex items-baseline justify-between gap-2">
                <span className="truncate font-medium text-slate-700">
                  {r.label}
                </span>
                <span className="ml-2 shrink-0 tabular-nums text-slate-600">
                  {fmt.format(r.value)}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/70">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${bar} transition-all`}
                  style={{ width: `${Math.max(2, pct).toFixed(1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Tile statistik kecil — ikon, label, nilai, opsional sub & bar rasio. */
function TileStat({
  icon: Icon,
  iconClass,
  label,
  value,
  sub,
  ratio,
  barClass,
}: {
  icon: IconType;
  iconClass: string;
  label: string;
  value: string;
  sub?: string;
  ratio?: number;
  barClass?: string;
}) {
  return (
    <div
      className="
        relative overflow-hidden rounded-lg border border-slate-200
        bg-gradient-to-br from-white to-slate-50 px-3 py-2.5
      "
    >
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
        <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
        {label}
      </div>
      <div className="text-base font-bold tabular-nums leading-tight text-slate-800">
        {value}
      </div>
      {sub != null && (
        <div className="mt-0.5 text-[10px] text-slate-500">{sub}</div>
      )}
      {ratio != null && barClass != null && (
        <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barClass}`}
            style={{
              width: `${Math.min(100, Math.max(0, ratio * 100)).toFixed(1)}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Bar komposisi bertumpuk + legenda persentase. */
function StackBar({
  parts,
}: {
  parts: Array<{ label: string; value: number; className: string; dot: string }>;
}) {
  const active = parts.filter((p) => p.value > 0);
  const total = active.reduce((a, p) => a + p.value, 0);
  if (total <= 0) return null;
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full ring-1 ring-slate-200">
        {active.map((p) => (
          <div
            key={p.label}
            className={`${p.className} flex-none transition-all`}
            style={{ width: `${((p.value / total) * 100).toFixed(2)}%` }}
            title={`${p.label}: ${num1(p.value)} Ha`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {active.map((p) => (
          <span
            key={p.label}
            className="flex items-center gap-1.5 text-[10px] text-slate-500"
          >
            <span className={`h-2 w-2 rounded-full ${p.dot}`} />
            {p.label}
            <span className="font-semibold tabular-nums text-slate-700">
              {((p.value / total) * 100).toFixed(0)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Chip statistik kaca di hero. */
function HeroChip({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: IconType;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-2 ring-1 ring-white/20 backdrop-blur-sm">
      <Icon className="h-4 w-4 shrink-0 text-emerald-100/90" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase leading-none tracking-wider text-emerald-100/70">
          {label}
        </p>
        <p className="mt-1 text-sm font-bold leading-none tabular-nums text-white">
          {value}
          {unit != null && (
            <span className="ml-1 text-[10px] font-medium text-emerald-100/80">
              {unit}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

/* ---------- halaman ---------- */

export default function KecamatanDetailPage() {
  const { kec } = useParams<{ kec: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<KecamatanDetailResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  /** Index 20 kecamatan — dropdown pengalih di hero + chips NotFound. */
  const [index, setIndex] = useState<KecamatanIndex[] | null>(null);

  useEffect(() => {
    let alive = true;
    setNotFound(false);
    setResult(null);
    fetchKecamatanIndex()
      .then((idx) => alive && setIndex(idx))
      .catch(() => alive && setIndex([]));
    fetchKecamatanDetail(kec ?? "")
      .then((r) => {
        if (!alive) return;
        if (!r.detail) {
          setNotFound(true);
        } else {
          setResult(r);
        }
      })
      .catch(() => {
        if (alive) setNotFound(true);
      });
    return () => {
      alive = false;
    };
  }, [kec]);

  const failedSources = useMemo(
    () =>
      result
        ? Object.entries(result.failures)
            .filter(([, v]) => v)
            .map(
              ([k]) =>
                ({
                  lahan: "lahan usaha tani",
                  pangan: "tanaman pangan",
                  ternak: "ternak",
                  perikanan: "perikanan",
                  lumbung: "lumbung pangan",
                  kelembagaan: "kelembagaan tani",
                })[k] ?? k,
            )
        : [],
    [result],
  );

  if (notFound) {
    return (
      <DefaultLayout>
        <section className="mx-auto w-full max-w-2xl py-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100">
              <MapPin className="h-6 w-6 text-rose-600" />
            </div>
            <h1 className="text-lg font-semibold text-slate-800">
              Kecamatan “{kec}” tidak ditemukan
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Periksa kembali alamat, atau pilih salah satu dari{" "}
              {index?.length ?? 20} kecamatan di bawah ini.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {index?.map((k) => (
                <Link
                  key={k.slug}
                  to={`/kecamatan/${k.slug}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                >
                  {k.namaTampil}
                </Link>
              ))}
            </div>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              <Home className="h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </div>
        </section>
      </DefaultLayout>
    );
  }

  if (!result || !result.detail) {
    return (
      <DefaultLayout>
        <section className="flex min-h-[50vh] flex-col gap-8">
          <LoadingSpinner label="Memuat profil kecamatan…" />
        </section>
      </DefaultLayout>
    );
  }

  const d = result.detail;

  /* ---------- agregat turunan (baris per desa → kecamatan) ---------- */
  const lahanSawah = d.lahan.reduce((s, r) => s + (r.lahanSawah || 0), 0);
  const lahanBukan = d.lahan.reduce((s, r) => s + (r.lahanBukanSawah || 0), 0);
  const tanamanTahunan = d.lahan.reduce((s, r) => s + (r.tanamanTahunan ?? 0), 0);
  const lahanTotal = d.lahan.reduce(
    (s, r) =>
      s +
      ((r.totalDikuasai ?? (r.lahanSawah ?? 0) + (r.lahanBukanSawah ?? 0)) || 0),
    0,
  );

  const kt = d.kelompokTani;
  const totalPoktan = kt.reduce((s, r) => s + r.kelompokTani, 0);
  const totalAnggotaPoktan = kt.reduce((s, r) => s + r.anggotaTani, 0);
  const totalGapoktan = kt.reduce((s, r) => s + r.gapoktan, 0);
  const totalAnggotaGapoktan = kt.reduce((s, r) => s + r.anggotaGapoktan, 0);
  const totalKelompokPerikanan = kt.reduce((s, r) => s + r.kelompokPerikanan, 0);

  const hasLahan = d.lahan.length > 0;
  const hasPangan = d.panganItems.length > 0;
  const hasTernak = !!(d.ternakBesar || d.ternakKecil || d.unggas);
  const hasPerikanan = !!(d.budidaya || d.tangkap);
  const hasLumbung = !!d.lumbung;
  const hasKelembagaan = kt.length > 0;

  const tb = d.ternakBesar;
  const tk = d.ternakKecil;
  const ug = d.unggas;
  const pb = d.budidaya;
  const pt = d.tangkap;
  const lb = d.lumbung;
  /** Kecamatan tanpa lumbung/gudang sama sekali → catatan jujur, bukan 4 tile "0". */
  const lbAllZero =
    !!lb &&
    (lb.lumbungUnit ?? 0) === 0 &&
    (lb.lumbungKapasitas ?? 0) === 0 &&
    (lb.gudangLuas ?? 0) === 0 &&
    (lb.gudangKapasitas ?? 0) === 0;

  /* ---------- baris grup ternak / perikanan ---------- */
  const tbRows = tb
    ? rowsOf([
        ["Sapi perah", tb.sapiPerah],
        ["Sapi potong", tb.sapi],
        ["Kerbau", tb.kerbau],
        ["Kuda", tb.kuda],
      ])
    : [];
  const tkRows = tk
    ? rowsOf([
        ["Kambing", tk.kambing],
        ["Domba", tk.domba],
      ])
    : [];
  const ugRows = ug
    ? rowsOf([
        ["Ayam ras petelur", ug.ayamRasLayer],
        ["Ayam ras pedaging", ug.ayamBroiler],
        ["Ayam kampung", ug.ayamKampung],
        ["Itik & Manila", (ug.itikBiasa ?? 0) + (ug.itikManila ?? 0)],
      ])
    : [];
  const pbRows = pb
    ? rowsOf([
        ["Kolam pembesaran", pb.kolamPembesaran],
        ["Karamba apung", pb.karambaApung],
        ["Mina penyelang", pb.minaPenyelang],
        ["Mina tumpangsari", pb.minaTumpangsari],
      ])
    : [];
  const ptRows = pt
    ? rowsOf([
        ["Jala tebar", pt.jalaTebar],
        ["Pancing", pt.pancing],
        ["Jaring insang", pt.jaringIngsang],
        ["Lainnya", pt.lainnya],
      ])
    : [];

  /* ---------- pangan ---------- */
  const panganAktif = d.panganItems.filter(
    (it) => (it.produksi ?? 0) > 0 || (it.luasPanen ?? 0) > 0,
  );
  const topProduksi = Math.max(...panganAktif.map((it) => it.produksi ?? 0), 0);
  const panganGrup = Array.from(
    new Set(panganAktif.map((it) => it.grup).filter(Boolean)),
  ).join(", ");

  /* ---------- desa ---------- */
  const maxLuas = Math.max(...d.desa.map((v) => v.luasHa || 0), 1);

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-5">
        {/* ---------- Hero ---------- */}
        <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900 text-white shadow-md">
          {/* dekorasi latar */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10" />
            <div className="absolute right-1/3 top-8 h-20 w-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-teal-300/10" />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />
          </div>

          <div className="relative px-5 py-6 sm:px-7 sm:py-7">
            <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-emerald-100/80">
              <Link
                to="/"
                className="inline-flex items-center gap-1 transition-colors hover:text-white"
              >
                <Home className="h-3 w-3" />
                Beranda
              </Link>
              <span className="text-emerald-200/40">/</span>
              <Link to="/kecamatan" className="transition-colors hover:text-white">
                Profil Kecamatan
              </Link>
              <span className="text-emerald-200/40">/</span>
              <span className="font-semibold text-white">{d.namaTampil}</span>
            </nav>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                    <MapPin className="h-5 w-5 text-emerald-50" />
                  </span>
                  <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                    Kecamatan {d.namaTampil}
                  </h1>
                </div>
                <p className="mt-2 text-xs text-emerald-100/85">
                  Kabupaten Banjarnegara · {d.jumlahDesa} desa/kelurahan ·{" "}
                  {num(d.luasWilayahHa)} Ha wilayah administratif
                </p>
              </div>
              {index && index.length > 0 && (
                <label className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-100">
                    Lihat kecamatan lain
                  </span>
                  <select
                    aria-label="Pilih kecamatan lain"
                    value={d.slug}
                    onChange={(e) => {
                      const slug = e.currentTarget.value;
                      if (slug && slug !== d.slug) {
                        navigate(`/kecamatan/${slug}`);
                      }
                    }}
                    className="
                      h-8 max-w-[14rem] rounded-lg border border-white/25
                      bg-white/10 px-2 text-xs font-semibold text-white
                      backdrop-blur-sm transition-colors hover:bg-white/20
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                    "
                  >
                    {index.map((k) => (
                      <option key={k.slug} value={k.slug} className="text-slate-800">
                        {k.namaTampil}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {/* strip statistik kaca — menggantikan baris kartu KPI */}
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <HeroChip
                icon={MapPin}
                label="Desa/Kelurahan"
                value={`${d.jumlahDesa}`}
              />
              <HeroChip
                icon={Ruler}
                label="Lahan usaha tani"
                value={hasLahan ? num1(lahanTotal) : "—"}
                unit={hasLahan ? "Ha" : undefined}
              />
              <HeroChip
                icon={Users}
                label="Kelompok tani"
                value={hasKelembagaan ? num(totalPoktan) : "—"}
                unit={hasKelembagaan ? "poktan" : undefined}
              />
              <HeroChip
                icon={Wheat}
                label="Komoditas pangan"
                value={hasPangan ? `${panganAktif.length}` : "—"}
                unit={hasPangan ? "jenis" : undefined}
              />
            </div>
          </div>
        </header>

        {/* ---------- Banner sumber gagal ---------- */}
        {failedSources.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-900">
              Sebagian sumber data gagal dimuat ({failedSources.join(", ")}) —
              panel terkait disembunyikan agar tidak menampilkan angka salah.
              Coba muat ulang halaman.
            </p>
          </div>
        )}

        {/* ---------- Peta wilayah (minimap) ---------- */}
        {d.desa.some((v) => v.geometry) && (
          <KecamatanMapMini desaList={d.desa} namaKecamatan={d.namaTampil} />
        )}

        {/* ---------- Panel domain ---------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {hasLahan && (
            <PanelCard
              icon={Ruler}
              tone="blue"
              title="Lahan Usaha Tani (ST2023)"
              subtitle={`Komposisi lahan — diagregasi dari ${d.lahan.length} dari ${d.jumlahDesa} desa terdata.`}
              actions={
                <Badge tone="slate">{d.lahan[0]?.tahun ?? ""}</Badge>
              }
            >
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2.5">
                  <TileStat
                    icon={Sprout}
                    iconClass="text-emerald-600"
                    label="Sawah"
                    value={`${num1(lahanSawah)} Ha`}
                    ratio={lahanTotal ? lahanSawah / lahanTotal : 0}
                    barClass="from-emerald-400 to-emerald-600"
                  />
                  <TileStat
                    icon={Home}
                    iconClass="text-amber-600"
                    label="Bukan Sawah"
                    value={`${num1(lahanBukan)} Ha`}
                    ratio={lahanTotal ? lahanBukan / lahanTotal : 0}
                    barClass="from-amber-400 to-amber-600"
                  />
                  <TileStat
                    icon={Leaf}
                    iconClass="text-lime-700"
                    label="Tanaman Tahunan"
                    value={`${num1(tanamanTahunan)} Ha`}
                    ratio={lahanTotal ? tanamanTahunan / lahanTotal : 0}
                    barClass="from-lime-400 to-lime-600"
                  />
                </div>
                <div className="rounded-lg bg-slate-50/70 p-3">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      Komposisi lahan dikuasai
                    </span>
                    <span className="text-xs font-bold tabular-nums text-slate-700">
                      {num1(lahanTotal)} Ha
                    </span>
                  </div>
                  <StackBar
                    parts={[
                      {
                        label: "Lahan sawah",
                        value: lahanSawah,
                        className: "bg-emerald-500",
                        dot: "bg-emerald-500",
                      },
                      {
                        label: "Bukan sawah",
                        value: lahanBukan,
                        className: "bg-amber-500",
                        dot: "bg-amber-500",
                      },
                    ]}
                  />
                </div>
              </div>
            </PanelCard>
          )}

          {hasTernak && (
            <PanelCard
              icon={Beef}
              tone="amber"
              title="Populasi Ternak"
              subtitle="Populasi per kelompok ternak (ekor) — BPS ST2023."
              actions={<Badge tone="slate">{d.ternakTahun ?? ""}</Badge>}
            >
              <div className="space-y-3">
                {tb && tbRows.length > 0 && (
                  <GroupCard
                    icon={Beef}
                    title="Ternak Besar"
                    sub="Sapi, kerbau, kuda"
                    total={tbRows.reduce((a, r) => a + r.value, 0)}
                    unit="ekor"
                    rows={tbRows}
                    bg="from-amber-50/70 to-white"
                    ring="ring-amber-100"
                    bar="from-amber-500 to-orange-500"
                  />
                )}
                {tk && tkRows.length > 0 && (
                  <GroupCard
                    icon={Rabbit}
                    title="Ternak Kecil"
                    sub="Kambing & domba"
                    total={tkRows.reduce((a, r) => a + r.value, 0)}
                    unit="ekor"
                    rows={tkRows}
                    bg="from-emerald-50/70 to-white"
                    ring="ring-emerald-100"
                    bar="from-emerald-500 to-teal-500"
                  />
                )}
                {ug && ugRows.length > 0 && (
                  <GroupCard
                    icon={Bird}
                    title="Unggas"
                    sub="Ayam, itik, & lainnya"
                    total={ugRows.reduce((a, r) => a + r.value, 0)}
                    unit="ekor"
                    rows={ugRows}
                    bg="from-blue-50/70 to-white"
                    ring="ring-blue-100"
                    bar="from-blue-500 to-indigo-500"
                  />
                )}
                {tbRows.length + tkRows.length + ugRows.length === 0 && (
                  <p className="text-xs text-slate-400">
                    Tidak ada populasi ternak tercatat pada sensus terakhir.
                  </p>
                )}
              </div>
            </PanelCard>
          )}

          {hasPangan && (
            <PanelCard
              icon={Wheat}
              tone="emerald"
              title="Produksi Tanaman Pangan"
              subtitle="Padi & palawija per komoditas — agregat desa, Distankan."
              actions={<Badge tone="slate">{d.panganTahun ?? ""}</Badge>}
              className="lg:col-span-2"
            >
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100/80 text-left text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="px-3.5 py-2.5 font-semibold">Komoditas</th>
                      <th className="px-3.5 py-2.5 text-right font-semibold">
                        Luas panen (Ha)
                      </th>
                      <th className="px-3.5 py-2.5 text-right font-semibold">
                        Produksi (ton)
                      </th>
                      <th className="px-3.5 py-2.5 text-right font-semibold">
                        Rata-rata (Ku/Ha)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {panganAktif.map((it, i) => {
                      const top =
                        (it.produksi ?? 0) === topProduksi && topProduksi > 0;
                      return (
                        <tr
                          key={`${it.komoditas}-${i}`}
                          className={`
                            border-t border-slate-100 transition-colors
                            ${top ? "bg-emerald-50/80" : "even:bg-slate-50/50 hover:bg-slate-50"}
                          `}
                        >
                          <td className="px-3.5 py-2.5">
                            <span className="flex items-center gap-1.5 font-medium text-slate-700">
                              {it.komoditas}
                              {top && (
                                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                                  terbesar
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right tabular-nums text-slate-600">
                            {num1(it.luasPanen)}
                          </td>
                          <td
                            className={`px-3.5 py-2.5 text-right tabular-nums ${
                              top ? "font-bold text-emerald-700" : "text-slate-700"
                            }`}
                          >
                            {num1(it.produksi)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right tabular-nums text-slate-500">
                            {num1(it.rataRata)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Sumber: {panganGrup || "Distktan"} — tahun {d.panganTahun}.
              </p>
            </PanelCard>
          )}

          {hasPerikanan && (
            <PanelCard
              icon={Fish}
              tone="cyan"
              title="Perikanan"
              subtitle="Hasil per jenis alat/usaha (kg) — Distankan."
              actions={<Badge tone="slate">{d.perikananTahun ?? ""}</Badge>}
            >
              <div className="space-y-3">
                {pb && pbRows.length > 0 && (
                  <GroupCard
                    icon={Fish}
                    title="Budidaya"
                    sub="Kolam, karamba, mina"
                    total={pbRows.reduce((a, r) => a + r.value, 0)}
                    unit="kg"
                    rows={pbRows}
                    bg="from-cyan-50/70 to-white"
                    ring="ring-cyan-100"
                    bar="from-cyan-500 to-sky-500"
                  />
                )}
                {pt && ptRows.length > 0 && (
                  <GroupCard
                    icon={Anchor}
                    title="Penangkapan"
                    sub="Perairan umum"
                    total={ptRows.reduce((a, r) => a + r.value, 0)}
                    unit="kg"
                    rows={ptRows}
                    bg="from-indigo-50/70 to-white"
                    ring="ring-indigo-100"
                    bar="from-indigo-500 to-blue-500"
                  />
                )}
                {pbRows.length + ptRows.length === 0 && (
                  <p className="text-xs text-slate-400">
                    Tidak ada hasil perikanan tercatat pada tahun terbaru.
                  </p>
                )}
              </div>
            </PanelCard>
          )}

          {hasLumbung && lb && (
            <PanelCard
              icon={Warehouse}
              tone="orange"
              title="Lumbung & Gudang Pangan"
              subtitle="Prasarana penyimpanan pangan — Distankan."
              actions={<Badge tone="slate">{lb.tahun}</Badge>}
            >
              {lbAllZero ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center text-xs text-slate-500">
                  Tidak ada lumbung/gudang pangan yang tercatat di kecamatan
                  ini (tahun {lb.tahun}).
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                <TileStat
                  icon={Warehouse}
                  iconClass="text-orange-600"
                  label="Lumbung Pangan"
                  value={`${num(lb.lumbungUnit)} unit`}
                  sub={`Kapasitas ${num1(lb.lumbungKapasitas)} ton`}
                />
                <TileStat
                  icon={Scale}
                  iconClass="text-amber-600"
                  label="Kapasitas Lumbung"
                  value={`${num1(lb.lumbungKapasitas)} ton`}
                  sub="Gabah/bersih per tahun"
                />
                <TileStat
                  icon={Building}
                  iconClass="text-slate-600"
                  label="Gudang Pangan"
                  value={`${num1(lb.gudangLuas)} m²`}
                  sub="Total luas lantai"
                />
                <TileStat
                  icon={Package}
                  iconClass="text-orange-600"
                  label="Kapasitas Gudang"
                  value={`${num1(lb.gudangKapasitas)} ton`}
                  sub="Penyimpanan per tahun"
                />
                </div>
              )}
            </PanelCard>
          )}

          {hasKelembagaan && (
            <PanelCard
              icon={Users}
              tone="violet"
              title="Kelembagaan Tani"
              subtitle={`Agregat dari ${kt.length} desa terdata — Distankan/SIMLUH.`}
              actions={<Badge tone="slate">{d.kelembagaanTahun ?? ""}</Badge>}
              className="lg:col-span-2"
            >
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                <TileStat
                  icon={Users}
                  iconClass="text-violet-600"
                  label="Kelompok Tani"
                  value={`${num(totalPoktan)} poktan`}
                />
                <TileStat
                  icon={UserCheck}
                  iconClass="text-violet-600"
                  label="Anggota Poktan"
                  value={`${num(totalAnggotaPoktan)} orang`}
                />
                <TileStat
                  icon={Landmark}
                  iconClass="text-purple-600"
                  label="Gapoktan"
                  value={`${num(totalGapoktan)} gabungan`}
                />
                <TileStat
                  icon={UserCheck}
                  iconClass="text-purple-600"
                  label="Anggota Gapoktan"
                  value={`${num(totalAnggotaGapoktan)} orang`}
                />
                <TileStat
                  icon={Fish}
                  iconClass="text-violet-600"
                  label="Kelompok Perikanan"
                  value={`${num(totalKelompokPerikanan)} kelompok`}
                />
              </div>
            </PanelCard>
          )}
        </div>

        {/* ---------- Daftar desa ---------- */}
        <PanelCard
          icon={Table2}
          tone="teal"
          title="Desa & Kelurahan"
          subtitle={`${d.desa.length} wilayah — luas menurut peta desa (BIG). Bar menunjukkan luas relatif desa terluas.`}
          actions={<Badge tone="slate">{d.desa.length} desa</Badge>}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {d.desa
              .slice()
              .sort((a, b) => a.namaSlug.localeCompare(b.namaSlug))
              .map((v) => {
                const luas = v.luasHa || 0;
                const pct = Math.min(100, (luas / maxLuas) * 100);
                return (
                  <Link
                    key={v.namaSlug}
                    to={`/desa/${v.kecamatanSlug}/${v.namaSlug}`}
                    className={`
                      group relative overflow-hidden rounded-lg border border-slate-200
                      bg-white px-3 py-2.5 transition-all
                      hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-teal-600" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 transition-colors group-hover:text-teal-800">
                        {v.namaTampil}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                        {luas > 0 ? `${num(luas)} Ha` : "—"}
                      </span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-teal-600" />
                    </div>
                    <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all"
                        style={{ width: `${pct.toFixed(1)}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
          </div>
        </PanelCard>

        {/* ---------- Sumber data ---------- */}
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            Sumber Data
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              "Peta desa — BIG",
              "Lahan usaha tani — BPS ST2023 T4.10",
              "Padi & palawija — Distankan",
              "Ternak — BPS ST2023",
              "Perikanan — Distankan",
              "Lumbung pangan — Distankan",
              "Kelembagaan tani — Distankan/SIMLUH",
            ].map((s) => (
              <span
                key={s}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600"
              >
                {s}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
            Angka per-kecamatan adalah agregat data resmi per sumber
            masing-masing pada tahun acuan berbeda (lihat penanda tahun di tiap
            panel); dapat berbeda dari angka resmi kecamatan karena cakupan
            desa terdata.
          </p>
        </div>
      </section>
    </DefaultLayout>
  );
}
