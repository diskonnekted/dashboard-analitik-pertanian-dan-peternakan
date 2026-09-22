/**
 * /kecamatan — index 20 kecamatan Kabupaten Banjarnegara.
 * Identitas (jumlah desa, Σ luas wilayah) dari geoindex desa peta_desa_v3.geojson
 * (cached). Dropdown menaut ke /kecamatan/:slug.
 */
import { useEffect, useState } from "react";
import { MapPin, Ruler, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DefaultLayout from "@/layouts/default";
import { KpiCard, LoadingSpinner, PageHeader } from "@/components/ui";
import { fetchKecamatanIndex, type KecamatanIndex } from "@/services/kecamatan";

const fmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export default function KecamatanIndexPage() {
  const [rows, setRows] = useState<KecamatanIndex[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4">
          <label
            className="text-sm font-semibold whitespace-nowrap text-slate-700"
            htmlFor="pilih-kecamatan"
          >
            Pilih kecamatan
          </label>
          <select
            id="pilih-kecamatan"
            value=""
            onChange={(e) => {
              const slug = e.currentTarget.value;
              if (slug) navigate(`/kecamatan/${slug}`);
            }}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none sm:max-w-md"
          >
            <option value="" disabled>
              — Pilih kecamatan untuk membuka profilnya —
            </option>
            {rows?.map((k) => (
              <option key={k.slug} value={k.slug}>
                {k.namaTampil} — {k.jumlahDesa} desa/kelurahan ·{" "}
                {fmt.format(k.luasWilayahHa)} Ha
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            {rows?.length ?? 0} kecamatan tersedia
          </p>
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
