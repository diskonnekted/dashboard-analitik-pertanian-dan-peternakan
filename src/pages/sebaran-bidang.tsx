/**
 * /sebaran/:bidang — Sebaran Wilayah Spasial per Bidang (Submenu 4; Peternakan = Submenu 5)
 *
 * Notulen Distankan KP 21 Sep 2026: setiap bidang wajib memiliki submenu
 * "Sebaran Wilayah Spasial (Per Kecamatan & Per Desa)". Peta tematik per bidang
 * dibangun pada Fase 2 (lihat public/pengembangan.md); sementara itu halaman
 * ini menampilkan rencana cakupan + NAVIGASI NYATA ke 20 profil kecamatan
 * yang sudah aktif (data agregat lintas domain + daftar desa tersedia di sana)
 * — mengikuti pola placeholder auto-upgrade.
 */
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Beef,
  Carrot,
  Fish,
  MapPin,
  TreePine,
  Wheat,
} from "lucide-react";
import DefaultLayout from "@/layouts/default";
import { Badge, LoadingSpinner, PageHeader, SectionCard } from "@/components/ui";
import { fetchKecamatanIndex, type KecamatanIndex } from "@/services/kecamatan";

type BidangKey = "pangan" | "hortikultura" | "perkebunan" | "perikanan" | "peternakan";

const BIDANG_CONFIG: Record<
  BidangKey,
  {
    nama: string;
    icon: typeof Wheat;
    tone: "amber" | "emerald" | "violet" | "red" | "blue";
    rencana: string[];
  }
> = {
  pangan: {
    nama: "Tanaman Pangan",
    icon: Wheat,
    tone: "amber",
    rencana: [
      "Peta luas tanam & produksi padi serta palawija per kecamatan per tahun",
      "Drill-down per desa: lahan usaha tani ST2023 (Tabel 4.10) & batas persawahan",
      "Peringkat kecamatan sentra produksi pada tahun terpilih",
    ],
  },
  hortikultura: {
    nama: "Hortikultura",
    icon: Carrot,
    tone: "emerald",
    rencana: [
      "Peta sentra sayuran kawasan Dieng (Kejajar, Batur, Pejawaran, Wanayasa, ...)",
      "Sebaran 27 jenis sayuran semusim & buah-buahan per kecamatan",
      "Drill-down per desa: kategori lahan (sawah, kentang, kobis, ladang) dari popup desa",
    ],
  },
  perkebunan: {
    nama: "Perkebunan",
    icon: TreePine,
    tone: "violet",
    rencana: [
      "Peta luas areal & produksi 8 komoditas BPS (kopi robusta, kakao, teh, kelapa dalam, ...)",
      "Sentra komoditas baru — kelapa deres, talas, porang (menunggu import data dinas)",
      "Drill-down per desa untuk komoditas perkebunan rakyat",
    ],
  },
  perikanan: {
    nama: "Perikanan",
    icon: Fish,
    tone: "red",
    rencana: [
      "Peta kolam & tempat pemeliharaan (KJA, karamba, kolam tanah, minapadi, pema) per kecamatan",
      "Sebaran Pokdakan & kelompok perikanan per desa",
      "Sentra jenis ikan unggulan: lele, nila & mujair, gurame, patin, gabus & belut",
    ],
  },
  peternakan: {
    nama: "Peternakan",
    icon: Beef,
    tone: "blue",
    rencana: [
      "Peta populasi ternak besar, ternak kecil (kambing, domba, domba batur) & unggas per kecamatan",
      "Drill-down per desa: populasi ST2023 + estimasi telur",
      "Lokasi pemotongan: RPH Pemerintah (resmi) vs luar RPH (perkiraan); poultry shop menyusul",
    ],
  },
};

export default function SebaranBidangPage() {
  const { bidang } = useParams<{ bidang: string }>();
  const cfg = bidang ? BIDANG_CONFIG[bidang as BidangKey] : undefined;
  const [kecamatan, setKecamatan] = useState<KecamatanIndex[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchKecamatanIndex()
      .then((d) => {
        if (alive) setKecamatan(d);
      })
      .catch(() => {
        if (alive) setKecamatan([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!cfg) return <Navigate to="/kecamatan" replace />;

  const Icon = cfg.icon;
  return (
    <DefaultLayout>
      <section className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          icon={<Icon className="h-6 w-6" />}
          title={`Sebaran Wilayah ${cfg.nama}`}
          subtitle={`Per kecamatan & per desa — Bidang ${cfg.nama} (menu "Sebaran Wilayah Spasial", notulen Distankan KP 21 Sep 2026).`}
          actions={
            kecamatan ? (
              <Badge tone={cfg.tone}>
                {kecamatan.length} Kecamatan
              </Badge>
            ) : undefined
          }
        />

        {/* Status pengembangan */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">Peta tematik per bidang sedang dibangun (Fase 2).</span>{" "}
            Sementara itu, halaman ini menautkan ke <span className="font-semibold">profil kecamatan</span>{" "}
            yang sudah aktif — memuat data agregat bidang {cfg.nama.toLowerCase()} terkini per kecamatan
            beserta daftar desa &amp; luas wilayahnya.
          </p>
        </div>

        {/* Rencana cakupan */}
        <SectionCard title="Rencana Cakupan Peta Spasial" icon={<MapPin size={16} className="text-slate-600" />}>
          <ul className="space-y-2 text-sm text-slate-700">
            {cfg.rencana.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Navigasi nyata: 20 profil kecamatan */}
        <SectionCard
          title={`Profil Kecamatan — Bidang ${cfg.nama}`}
          icon={<MapPin size={16} className="text-slate-600" />}
        >
          {kecamatan === null ? (
            <LoadingSpinner label="Memuat daftar kecamatan..." />
          ) : kecamatan.length === 0 ? (
            <p className="text-sm text-slate-500">
              Daftar kecamatan tidak dapat dimuat. Muat ulang halaman atau buka menu "Profil Kecamatan".
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {kecamatan.map((k) => (
                <Link
                  key={k.slug}
                  to={`/kecamatan/${k.slug}`}
                  className="group flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-sm"
                >
                  <span className="flex items-center gap-2 font-semibold text-slate-900">
                    <MapPin className="h-4 w-4 text-slate-400" aria-hidden />
                    {k.namaTampil}
                  </span>
                  <span className="text-xs text-slate-500">
                    {k.jumlahDesa} desa/kelurahan ·{" "}
                    {new Intl.NumberFormat("id-ID").format(Math.round(k.luasWilayahHa))} Ha
                  </span>
                  <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-blue-700 opacity-0 transition-opacity group-hover:opacity-100">
                    Buka profil <ArrowRight className="h-3 w-3" aria-hidden />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </section>
    </DefaultLayout>
  );
}
