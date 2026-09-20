import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Home } from "lucide-react";

import {
  fetchDesaDetail,
  type DesaDetail,
} from "../../services/desa";
import { DesaHero } from "../../components/desa/DesaHero";
import { DesaMapMini } from "../../components/desa/DesaMapMini";
import { DesaLahan } from "../../components/desa/DesaLahan";
import { DesaDemografi } from "../../components/desa/DesaDemografi";
import { DesaTernak } from "../../components/desa/DesaTernak";
import { DesaKelembagaan } from "../../components/desa/DesaKelembagaan";
import { DesaFooter } from "../../components/desa/DesaFooter";

export default function DesaDetailPage() {
  const { kec, nama } = useParams<{ kec: string; nama: string }>();
  const [detail, setDetail] = useState<DesaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kec || !nama) {
      setLoading(false);
      setError("Parameter kecamatan / nama tidak lengkap.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDesaDetail(kec, nama)
      .then((d) => {
        if (cancelled) return;
        if (!d) {
          setError(`Desa "${nama}" di Kecamatan "${kec}" tidak ditemukan dalam dataset.`);
          setDetail(null);
        } else {
          setDetail(d);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [kec, nama]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-sm">Memuat data desa…</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-[60vh] max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Desa tidak ditemukan</h1>
        <p className="text-sm text-slate-600 mb-6">
          {error ?? "Desa ini tidak ada dalam dataset. Periksa kembali ejaan nama & kecamatan."}
        </p>
        <Link
          to="/"
          className="inline-flex items-center text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
        >
          <Home className="w-4 h-4 mr-1.5" />
          Kembali ke Peta
        </Link>
      </div>
    );
  }

  return (
    <div>
      <DesaHero desa={detail} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <div className="lg:col-span-2">
            {detail.centroid && detail.geometry ? (
              <DesaMapMini
                centerLng={detail.centroid[0]}
                centerLat={detail.centroid[1]}
                geometry={detail.geometry}
                namaTampil={detail.namaTampil}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Geometri polygon tidak tersedia untuk desa ini.
              </div>
            )}
          </div>

          <div className="space-y-4">
            {detail.tetangga.length > 0 && (
              <aside className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Desa Terdekat</h3>
                <ul className="space-y-1.5 text-xs">
                  {detail.tetangga.map((t, i) => (
                    <li key={i} className="text-slate-600">
                      <span className="font-medium">{t.nama}</span>
                      <span className="text-slate-400"> — Kec. {t.kecamatan}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <DesaLahan data={detail.lahan} />
          <DesaDemografi data={detail.st2023} />
          <DesaTernak data={detail.st2023} />
          <DesaKelembagaan data={detail.kelompokTani} />
        </div>

        <div className="mt-5">
          <DesaFooter />
        </div>
      </main>
    </div>
  );
}
