import { ArrowLeft, Maximize, MapPin, Users, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import {
  namaKecamatanTanpaSingkatan,
  singkatanKecamatan,
} from "../../services/desa";
import type { DesaDetail } from "../../services/desa";

interface Props {
  desa: DesaDetail;
}

export function DesaHero({ desa }: Props) {
  const petani = desa.st2023?.petani ?? null;
  const rtPertanian = desa.st2023?.rumahTanggaPetani ?? null;

  return (
    <header
      className="
        relative overflow-hidden rounded-xl shadow-sm
        bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-800
        text-white
      "
    >
      {/* Pola radial samar untuk kedalaman visual */}
      <div
        aria-hidden
        className="
          pointer-events-none absolute inset-0 opacity-[0.08]
          bg-[radial-gradient(circle_at_top_right,white_0%,transparent_55%)]
        "
      />

      <div className="relative px-5 sm:px-6 py-6 sm:py-7">
        {/* Breadcrumb */}
        <nav
          aria-label="breadcrumb"
          className="flex items-center text-[11px] text-emerald-100/85 mb-3"
        >
          <Link
            to="/"
            className="
              inline-flex items-center gap-1.5 rounded-full
              bg-white/10 hover:bg-white/20 transition-colors
              px-2.5 py-1
            "
          >
            <ArrowLeft size={11} aria-hidden />
            <span>Dasbor Banjarnegara</span>
          </Link>
          <span aria-hidden className="mx-1.5 text-emerald-300/60">/</span>
          <Link
            to={`/?kecamatan=${encodeURIComponent(desa.kecamatanSlug)}`}
            className="hover:text-white transition-colors truncate"
          >
            {singkatanKecamatan(desa.kecamatanTampil)}
          </Link>
          <span aria-hidden className="mx-1.5 text-emerald-300/60">/</span>
          <span className="text-white font-semibold truncate">{desa.namaTampil}</span>
        </nav>

        {/* Judul + subtitle */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
          {desa.namaTampil}
        </h1>
        <p className="mt-1 text-xs text-emerald-100/90">
          Kecamatan {namaKecamatanTanpaSingkatan(desa.kecamatanTampil)}, Kabupaten {desa.kabupaten}
        </p>

        {/* 4 stat tiles */}
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
          <Stat
            Icon={Maximize}
            label="Luas Wilayah"
            value={desa.luasHa > 0
              ? `${desa.luasHa.toLocaleString("id-ID", { maximumFractionDigits: 2 })} Ha`
              : "—"}
          />
          <Stat
            Icon={Sprout}
            label="RT Pertanian"
            value={rtPertanian != null
              ? rtPertanian.toLocaleString("id-ID")
              : "—"}
          />
          <Stat
            Icon={Users}
            label="Petani"
            value={petani != null
              ? petani.toLocaleString("id-ID")
              : "—"}
          />
          <Stat
            Icon={MapPin}
            label="Koordinat"
            value={desa.centroid
              ? `${desa.centroid[1].toFixed(4)}, ${desa.centroid[0].toFixed(4)}`
              : "—"}
            small
          />
        </dl>
      </div>
    </header>
  );
}

function Stat({
  Icon,
  label,
  value,
  small = false,
}: {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div
      className="
        rounded-lg bg-white/10 backdrop-blur-sm
        border border-white/15
        px-3 py-2
      "
    >
      <dt className="flex items-center gap-1 text-emerald-100/85 text-[10px] font-medium uppercase tracking-wider mb-0.5">
        <Icon size={10} aria-hidden className="opacity-85" />
        <span>{label}</span>
      </dt>
      <dd
        className={
          small
            ? "text-xs font-semibold tabular-nums leading-tight"
            : "text-lg font-semibold tabular-nums leading-tight"
        }
      >
        {value}
      </dd>
    </div>
  );
}