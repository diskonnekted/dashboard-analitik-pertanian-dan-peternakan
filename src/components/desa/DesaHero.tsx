import { ArrowLeft, MapPin, Maximize, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import type { DesaDetail } from "../../services/desa";

interface Props {
  desa: DesaDetail;
}

export function DesaHero({ desa }: Props) {
  return (
    <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav
          aria-label="breadcrumb"
          className="flex items-center text-xs text-emerald-100/80 mb-3"
        >
          <Link to="/" className="hover:text-white">Beranda</Link>
          <span className="mx-1.5">/</span>
          <Link to="/map" className="hover:text-white">Peta</Link>
          <span className="mx-1.5">/</span>
          <Link
            to={`/map?kecamatan=${encodeURIComponent(desa.kecamatanTampil)}`}
            className="hover:text-white"
          >
            {desa.kecamatanTampil}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-white font-medium">{desa.namaTampil}</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
          {desa.namaTampil}
        </h1>
        <p className="text-sm text-emerald-100">
          Kecamatan {desa.kecamatanTampil}, Kabupaten {desa.kabupaten}
          <span className="mx-2">•</span>
          OBJECTID {desa.objectId}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <Stat icon={<Maximize className="w-4 h-4" />} label="Luas Wilayah">
            {desa.luasHa > 0 ? `${desa.luasHa.toLocaleString("id-ID", { maximumFractionDigits: 2 })} Ha` : "—"}
          </Stat>
          <Stat icon={<Layers className="w-4 h-4" />} label="Polygon">
            {desa.geometry ? "1 fitur" : "—"}
          </Stat>
          <Stat icon={<MapPin className="w-4 h-4" />} label="Koordinat">
            {desa.centroid
              ? `${desa.centroid[1].toFixed(4)}, ${desa.centroid[0].toFixed(4)}`
              : "—"}
          </Stat>
          <Stat icon={<MapPin className="w-4 h-4" />} label="Link Permanen">
            <code className="text-xs">/desa/{desa.kecamatanSlug}/{desa.namaSlug}</code>
          </Stat>
        </div>

        <div className="mt-6">
          <Link
            to="/map"
            className="inline-flex items-center text-xs bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Kembali ke Peta
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/15 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-emerald-100 text-[10px] uppercase tracking-wide mb-0.5">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold">{children}</div>
    </div>
  );
}
