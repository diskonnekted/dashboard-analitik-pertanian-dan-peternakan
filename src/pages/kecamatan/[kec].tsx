/**
 * /kecamatan/:kec — profil pertanian satu kecamatan (mirror logika halaman
 * detail desa /desa/:kec/:nama, tapi level agregat kecamatan):
 * DefaultLayout di semua state, hero gradient (dengan dropdown pengalih
 * kecamatan), KPI, panel per domain
 * (lahan ST2023, tanaman pangan, ternak, perikanan, lumbung, kelembagaan),
 * daftar desa yang menaut ke detail desa, banner agregat bila ada sumber gagal.
 *
 * Semua panel independently-failable: sumber gagal → panel disembunyikan
 * (anti-kedip), tidak pernah menampilkan angka salah.
 */
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Home,
  MapPin,
  Ruler,
  Sprout,
  Table2,
  Users,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DefaultLayout from "@/layouts/default";
import { Badge, LoadingSpinner, SectionCard } from "@/components/ui";
import { KecamatanMapMini } from "@/components/kecamatan/KecamatanMapMini";
import {
  fetchKecamatanDetail,
  fetchKecamatanIndex,
  type KecamatanDetailResult,
  type KecamatanIndex,
} from "@/services/kecamatan";

const fmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const num = (v?: number | null) => (v == null ? "—" : fmt.format(v));
const num1 = (v?: number | null) => (v == null ? "—" : fmt1.format(v));

/* ---------- komponen baris label-nilai kecil ---------- */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-1.5 text-sm last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold tabular-nums text-slate-800">{value}</span>
    </div>
  );
}

export default function KecamatanDetailPage() {
  const { kec } = useParams<{ kec: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<KecamatanDetailResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  /** Index 20 kecamatan — untuk dropdown pengalih di hero + chips NotFound. */
  const [index, setIndex] = useState<KecamatanIndex[] | null>(null);

  useEffect(() => {
    let alive = true;
    setNotFound(false);
    setResult(null);
    // Index dimuat di semua state (cached, tanpa biaya tambahan) — dipakai
    // dropdown "Lihat kecamatan lain" dan daftar chips saat NotFound.
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
            .map(([k]) => ({ lahan: "lahan usaha tani", pangan: "tanaman pangan", ternak: "ternak", perikanan: "perikanan", lumbung: "lumbung pangan", kelembagaan: "kelembagaan tani" })[k] ?? k)
        : [],
    [result],
  );

  if (notFound) {
    return (
      <DefaultLayout>
        <section className="mx-auto w-full max-w-2xl py-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <MapPin className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <h1 className="text-lg font-semibold text-slate-800">
              Kecamatan “{kec}” tidak ditemukan
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Periksa kembali alamat, atau pilih salah satu dari {index?.length ?? 20}{" "}
              kecamatan di bawah ini.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {index?.map((k) => (
                <Link
                  key={k.slug}
                  to={`/kecamatan/${k.slug}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
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
        <section className="flex flex-col gap-8">
          <LoadingSpinner label="Memuat profil kecamatan…" />
        </section>
      </DefaultLayout>
    );
  }

  const d = result.detail;

  /* ---------- agregat turunan ---------- */
  const lahanSawah = d.lahan.reduce((s, r) => s + (r.lahanSawah || 0), 0);
  const lahanBukan = d.lahan.reduce((s, r) => s + (r.lahanBukanSawah || 0), 0);
  const lahanTotal = d.lahan.reduce(
    (s, r) => s + ((r.totalDikuasai ?? (r.lahanSawah ?? 0) + (r.lahanBukanSawah ?? 0)) || 0),
    0,
  );
  const tanamanTahunan = d.lahan.reduce((s, r) => s + (r.tanamanTahunan ?? 0), 0);

  const kt = d.kelompokTani;
  const totalPoktan = kt.reduce((s, r) => s + r.kelompokTani, 0);
  const totalAnggotaPoktan = kt.reduce((s, r) => s + r.anggotaTani, 0);
  const totalGapoktan = kt.reduce((s, r) => s + r.gapoktan, 0);
  const totalAnggotaGapoktan = kt.reduce((s, r) => s + r.anggotaGapoktan, 0);
  const totalPokdakan = kt.reduce((s, r) => s + r.kelompokPerikanan, 0);

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

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-6">
        {/* ---------- Hero ---------- */}
        <header className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-800 text-white shadow-sm">
          <div className="relative px-5 py-6 sm:px-6 sm:py-7">
            <nav className="mb-3 flex items-center gap-1.5 text-xs text-emerald-100">
              <Link to="/" className="inline-flex items-center gap-1 hover:text-white">
                <Home className="h-3.5 w-3.5" />
                Beranda
              </Link>
              <span>/</span>
              <Link to="/kecamatan" className="hover:text-white">
                Profil Kecamatan
              </Link>
              <span>/</span>
              <span className="font-semibold text-white">{d.namaTampil}</span>
            </nav>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">
                  Kecamatan {d.namaTampil}
                </h1>
                <p className="mt-1.5 text-sm text-emerald-100">
                  Kabupaten Banjarnegara · {d.jumlahDesa} desa/kelurahan ·{" "}
                  {num(d.luasWilayahHa)} Ha wilayah
                </p>
              </div>
              <div className="flex flex-col items-start gap-2.5 sm:items-end">
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
                      className="h-8 max-w-[14rem] rounded-lg border border-white/40 bg-white px-2 text-xs font-semibold text-slate-800 focus:outline-none"
                    >
                      {index.map((k) => (
                        <option key={k.slug} value={k.slug}>
                          {k.namaTampil}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="flex gap-2">
                  <Badge tone="emerald">{d.jumlahDesa} desa</Badge>
                  <Badge tone="blue">{num(d.luasWilayahHa)} Ha</Badge>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ---------- Banner sumber gagal ---------- */}
        {failedSources.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Sebagian sumber data gagal dimuat ({failedSources.join(", ")}) — panel
              terkait disembunyikan agar tidak menampilkan angka salah. Coba muat ulang
              halaman.
            </p>
          </div>
        )}

        {/* ---------- KPI ---------- */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-300 text-slate-900">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Desa / Kelurahan
                </p>
                <p className="text-lg font-bold text-slate-800">{fmt.format(d.jumlahDesa)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-300 text-slate-900">
                <Sprout className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Lahan Usaha Tani (ST2023)
                </p>
                <p className="text-lg font-bold text-slate-800">
                  {num1(lahanTotal)} <span className="text-xs font-medium text-slate-500">Ha</span>
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-300 text-slate-900">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Kelompok Tani
                </p>
                <p className="text-lg font-bold text-slate-800">
                  {fmt.format(totalPoktan)} <span className="text-xs font-medium text-slate-500">poktan</span>
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-300 text-slate-900">
                <Ruler className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Tanaman Pangan (tercatat)
                </p>
                <p className="text-lg font-bold text-slate-800">
                  {fmt.format(d.panganItems.length)}{" "}
                  <span className="text-xs font-medium text-slate-500">komoditas</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Peta wilayah (minimap) ---------- */}
        {d.desa.some((v) => v.geometry) && (
          <KecamatanMapMini desaList={d.desa} namaKecamatan={d.namaTampil} />
        )}

        {/* ---------- Panel domain ---------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {hasLahan && (
            <SectionCard
              title="Lahan Usaha Tani (ST2023)"
              icon={<Ruler className="h-4 w-4 text-blue-800" />}
              actions={<Badge tone="slate">{d.lahan[0]?.tahun ?? ""}</Badge>}
            >
              <Row label="Sawah (Ha)" value={num1(lahanSawah)} />
              <Row label="Bukan sawah (Ha)" value={num1(lahanBukan)} />
              {tanamanTahunan > 0 && (
                <Row label="Tanaman tahunan & lainnya (Ha)" value={num1(tanamanTahunan)} />
              )}
              <Row label="Total dikuasai usaha tani (Ha)" value={num1(lahanTotal)} />
              <Row label="Desa terdata" value={`${d.lahan.length} dari ${d.jumlahDesa}`} />
            </SectionCard>
          )}

          {hasTernak && (
            <SectionCard
              title="Populasi Ternak"
              icon={<Users className="h-4 w-4 text-blue-800" />}
              actions={<Badge tone="slate">{d.ternakTahun ?? ""}</Badge>}
            >
              {tb && (
                <>
                  <Row label="Sapi perah (ekor)" value={num(tb.sapiPerah)} />
                  <Row label="Sapi potong (ekor)" value={num(tb.sapi)} />
                  <Row label="Kerbau (ekor)" value={num(tb.kerbau)} />
                  {tb.kuda ? <Row label="Kuda (ekor)" value={num(tb.kuda)} /> : null}
                </>
              )}
              {tk && (
                <>
                  <Row label="Kambing (ekor)" value={num(tk.kambing)} />
                  <Row label="Domba (ekor)" value={num(tk.domba)} />
                </>
              )}
              {ug && (
                <>
                  <Row label="Ayam kampung (ekor)" value={num(ug.ayamKampung)} />
                  <Row label="Ayam ras layer (ekor)" value={num(ug.ayamRasLayer)} />
                  <Row label="Ayam ras pedaging (ekor)" value={num(ug.ayamBroiler)} />
                  <Row label="Itik & manila (ekor)" value={num((ug.itikBiasa ?? 0) + (ug.itikManila ?? 0))} />
                </>
              )}
            </SectionCard>
          )}

          {hasPangan && (
            <SectionCard
              title="Tanaman Pangan"
              icon={<Sprout className="h-4 w-4 text-blue-800" />}
              actions={<Badge tone="slate">{d.panganTahun ?? ""}</Badge>}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-2 pr-3">Komoditas</th>
                      <th className="py-2 pr-3 text-right">Luas Panen (Ha)</th>
                      <th className="py-2 pr-3 text-right">Produksi (ton)</th>
                      <th className="py-2 text-right">Rata-rata (Ku/Ha)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.panganItems
                      .filter((it) => (it.produksi ?? 0) > 0 || (it.luasPanen ?? 0) > 0)
                      .map((it, i) => (
                        <tr key={`${it.komoditas}-${i}`} className="border-b border-slate-100">
                          <td className="py-2 pr-3 font-medium text-slate-700">{it.komoditas}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-slate-700">{num1(it.luasPanen)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-slate-700">{num1(it.produksi)}</td>
                          <td className="py-2 text-right tabular-nums text-slate-700">{num1(it.rataRata)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Sumber: {d.panganItems[0]?.grup} dst. — tahun {d.panganTahun}.
              </p>
            </SectionCard>
          )}

          {hasPerikanan && (
            <SectionCard
              title="Perikanan"
              icon={<Users className="h-4 w-4 text-blue-800" />}
              actions={<Badge tone="slate">{d.perikananTahun ?? ""}</Badge>}
            >
              {pb && (
                <>
                  <Row label="Kolam pembesaran (kg)" value={num(pb.kolamPembesaran)} />
                  <Row label="Karamba apung (kg)" value={num(pb.karambaApung)} />
                  <Row label="Mina penyelang (kg)" value={num(pb.minaPenyelang)} />
                  <Row label="Mina tumpangsari (kg)" value={num(pb.minaTumpangsari)} />
                </>
              )}
              {pt && (
                <>
                  <Row label="Tangkap — jala tebar (kg)" value={num(pt.jalaTebar)} />
                  <Row label="Tangkap — pancing (kg)" value={num(pt.pancing)} />
                  <Row label="Tangkap — jaring insang (kg)" value={num(pt.jaringIngsang)} />
                  <Row label="Tangkap — lainnya (kg)" value={num(pt.lainnya)} />
                </>
              )}
            </SectionCard>
          )}

          {hasLumbung && lb && (
            <SectionCard
              title="Lumbung & Gudang Pangan"
              icon={<Ruler className="h-4 w-4 text-blue-800" />}
              actions={<Badge tone="slate">{lb.tahun}</Badge>}
            >
              <Row label="Lumbung pangan (unit)" value={num(lb.lumbungUnit)} />
              <Row label="Kapasitas lumbung (ton)" value={num1(lb.lumbungKapasitas)} />
              <Row label="Gudang (m²)" value={num(lb.gudangLuas)} />
              <Row label="Kapasitas gudang (ton)" value={num1(lb.gudangKapasitas)} />
            </SectionCard>
          )}

          {hasKelembagaan && (
            <SectionCard
              title="Kelembagaan Tani"
              icon={<Users className="h-4 w-4 text-blue-800" />}
              actions={<Badge tone="slate">{d.kelembagaanTahun ?? ""}</Badge>}
            >
              <Row label="Kelompok tani / poktan" value={num(totalPoktan)} />
              <Row label="Anggota poktan (orang)" value={num(totalAnggotaPoktan)} />
              <Row label="Gapoktan" value={num(totalGapoktan)} />
              <Row label="Anggota gapoktan (orang)" value={num(totalAnggotaGapoktan)} />
              <Row label="Kelompok perikanan / pokdakan" value={num(totalPokdakan)} />
              <p className="mt-1 text-[11px] text-slate-400">
                Σ {kt.length} desa terdata — tahun {d.kelembagaanTahun}.
              </p>
            </SectionCard>
          )}
        </div>

        {/* ---------- Daftar desa ---------- */}
        <SectionCard
          title={`Desa & Kelurahan di Kecamatan ${d.namaTampil}`}
          icon={<Table2 className="h-4 w-4 text-blue-800" />}
          actions={<Badge tone="slate">{d.desa.length} desa</Badge>}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {d.desa
              .slice()
              .sort((a, b) => a.namaSlug.localeCompare(b.namaSlug))
              .map((v) => (
                <Link
                  key={v.namaSlug}
                  to={`/desa/${v.kecamatanSlug}/${v.namaSlug}`}
                  className="group flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-emerald-300"
                >
                  <span className="truncate font-medium text-slate-700 group-hover:text-emerald-700">
                    {v.namaTampil}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
                    {num(v.luasHa)} Ha
                    <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                </Link>
              ))}
          </div>
        </SectionCard>

        <p className="text-xs leading-relaxed text-slate-500">
          Sumber: peta desa resmi (geojson BIG) untuk identitas wilayah; lahan usaha
          tani ST2023 (BPS T4.10); padi &amp; palawija, ternak, perikanan, lumbung
          pangan, dan kelembagaan tani dari Distankan Kab. Banjarnegara. Angka
          per-kecamatan adalah agregat data resmi per sumber masing-masing.
        </p>
      </section>
    </DefaultLayout>
  );
}
