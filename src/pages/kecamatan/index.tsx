/**
 * /kecamatan — index 20 kecamatan Kabupaten Banjarnegara.
 * Identitas (jumlah desa, Σ luas wilayah) dari geoindex desa peta_desa_v3.geojson
 * (cached). Kartu menaut ke /kecamatan/:slug.
 */
import { useEffect, useState } from "react";
import { ArrowRight, MapPin, Ruler, Users } from "lucide-react";
import { Link } from "react-router-dom";
import DefaultLayout from "@/layouts/default";
import { KpiCard, LoadingSpinner, PageHeader } from "@/components/ui";
import { fetchKecamatanIndex, type KecamatanIndex } from "@/services/kecamatan";

const fmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export default function KecamatanIndexPage() {
  const [rows, setRows] = useState<KecamatanIndex[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchKecamatanIndex()
      .then((d) => {
        if (alive) setRows(d);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "Gagal memuat data kecamatan.");
      });
    return () => {
      alive = false;
    };
  }, []);

  if (rows === null && !error) {
    return (
      <DefaultLayout>
        <section className="flex flex-col gap-8">
          <PageHeader
            icon={<MapPin className="h-6 w-6" />}
            title="Profil Kecamatan"
            subtitle="Profil pertanian per kecamatan Kabupaten Banjarnegara — lahan, tanaman pangan, ternak, perikanan, lumbung pangan, dan kelembagaan tani."
          />
          <LoadingSpinner label="Memuat data kecamatan…" />
        </section>
      </DefaultLayout>
    );
  }

  if (error) {
    return (
      <DefaultLayout>
        <section className="flex flex-col gap-8">
          <PageHeader
            icon={<MapPin className="h-6 w-6" />}
            title="Profil Kecamatan"
            subtitle="Profil pertanian per kecamatan Kabupaten Banjarnegara."
          />
          <p className="text-sm text-red-600">Gagal memuat data: {error}</p>
        </section>
      </DefaultLayout>
    );
  }

  const totalDesa = rows?.reduce((s, k) => s + k.jumlahDesa, 0) ?? 0;
  const totalLuas = rows?.reduce((s, k) => s + k.luasWilayahHa, 0) ?? 0;

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-8">
        <PageHeader
          icon={<MapPin className="h-6 w-6" />}
          title="Profil Kecamatan"
          subtitle="Profil pertanian per kecamatan Kabupaten Banjarnegara — lahan, tanaman pangan, ternak, perikanan, lumbung pangan, dan kelembagaan tani."
          actions={<Badge20 count={rows?.length ?? 0} />}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard
            icon={<MapPin className="h-5 w-5" />}
            label="Kecamatan"
            value={fmt.format(rows?.length ?? 0)}
            unit="kecamatan"
            color="bg-emerald-300"
            hint="seluruh Kabupaten Banjarnegara"
          />
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            label="Desa & Kelurahan"
            value={fmt.format(totalDesa)}
            unit="desa"
            color="bg-blue-300"
            hint="desa/kelurahan di seluruh kabupaten"
          />
          <KpiCard
            icon={<Ruler className="h-5 w-5" />}
            label="Luas Wilayah"
            value={fmt.format(totalLuas)}
            unit="Ha"
            color="bg-amber-300"
            hint="Σ luas polygon desa (geojson)"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows?.map((k) => (
            <Link
              key={k.slug}
              to={`/kecamatan/${k.slug}`}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700">
                  {k.namaTampil}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {k.jumlahDesa} desa/kelurahan · {fmt.format(k.luasWilayahHa)} Ha
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                Lihat profil
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-slate-500">
          Sumber: peta desa resmi (geojson BIG) untuk identitas wilayah; data domain
          (lahan ST2023, padi &amp; palawija, ternak, perikanan, lumbung pangan,
          kelembagaan tani) dari Distankan Kab. Banjarnegara &amp; BPS — ditampilkan
          pada halaman profil masing-masing kecamatan.
        </p>
      </section>
    </DefaultLayout>
  );
}

function Badge20({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-blue-800 px-3 py-1 text-xs font-semibold text-white">
      {count} kecamatan
    </span>
  );
}
