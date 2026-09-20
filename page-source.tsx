import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Home, RefreshCw, AlertTriangle } from "lucide-react";

import {
  fetchDesaDetail,
  fetchAllDesa,
  type DesaDetail,
  type DesaIndex,
} from "../../services/desa";
import { DesaHero } from "../../components/desa/DesaHero";
import { DesaMapMini } from "../../components/desa/DesaMapMini";
import { DesaLahan } from "../../components/desa/DesaLahan";
import { DesaDemografi } from "../../components/desa/DesaDemografi";
import { DesaTernak } from "../../components/desa/DesaTernak";
import { DesaKelembagaan } from "../../components/desa/DesaKelembagaan";
import { DesaFooter } from "../../components/desa/DesaFooter";

/**
 * Status pelaporan kegagalan per-sumber data agregat.
 * `true` = endpoint publik gagal/dimuat offline (fallback kosong).
 * `false` = data termuat (meskipun bisa saja list kosong).
 */
type SourceStatus = {
  lahan: boolean;
  kelompokTani: boolean;
  st2023: boolean;
};

const NO_FAILURE: SourceStatus = { lahan: false, kelompokTani: false, st2023: false };

export default function DesaDetailPage() {
  const { kec, nama } = useParams<{ kec: string; nama: string }>();
  const [detail, setDetail] = useState<DesaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFailures, setSourceFailures] = useState<SourceStatus>(NO_FAILURE);
  /** Counter untuk memicu re-fetch manual lewat tombol "Coba lagi". */
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!kec || !nama) {
      setLoading(false);
      setError("Parameter kecamatan / nama tidak lengkap.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSourceFailures(NO_FAILURE);
    fetchDesaDetail(kec, nama)
      .then(({ detail: d, failures }) => {
        if (cancelled) return;
        if (!d) {
          setError(`Desa "${nama}" di Kecamatan "${kec}" tidak ditemukan dalam dataset.`);
          setDetail(null);
          return;
        }
        setDetail(d);
        setSourceFailures(failures);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kec, nama, retryToken]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-sm">Memuat data desa…</p>
      </div>
    );
  }

  if (error || !detail) {
    return <NotFoundView kecSlug={kec ?? ""} namaSlug={nama ?? ""} />;
  }

  const hasAnyFailure = sourceFailures.lahan || sourceFailures.kelompokTani || sourceFailures.st2023;

  return (
    <div>
      <DesaHero desa={detail} />

      {hasAnyFailure && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-start gap-3 text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
            <div className="flex-1">
              <span className="font-medium">Sebagian data agregat tidak dapat dimuat</span>
              <span className="text-amber-800/80">
                {" — "}
                {[
                  sourceFailures.lahan && "penggunaan lahan",
                  sourceFailures.kelompokTani && "kelompok tani",
                  sourceFailures.st2023 && "statistik ST2023",
                ]
                  .filter(Boolean)
                  .join(", ")}
                {" "}kemungkinan endpoint CKAN sedang tidak tersedia.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRetryToken((t) => t + 1)}
              className="inline-flex items-center text-xs bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-md flex-shrink-0"
              aria-label="Coba muat ulang data"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Coba lagi
            </button>
          </div>
        </div>
      )}

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

/* ------------------------------------------------------------------ */
/* Halaman "Tidak Ditemukan" yang lebih ramah                          */
/* ------------------------------------------------------------------ */

function NotFoundView({ kecSlug, namaSlug }: { kecSlug: string; namaSlug: string }) {
  /** Semua desa di kecamatan yang sama — untuk ditampilkan sebagai saran. */
  const [siblings, setSiblings] = useState<DesaIndex[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAllDesa()
      .then((all) => {
        if (cancelled) return;
        const inKec = kecSlug ? all.filter((d) => d.kecamatanSlug === kecSlug) : [];
        setSiblings(inKec);
      })
      .catch(() => {
        if (!cancelled) setSiblings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kecSlug]);

  const backHref = kecSlug
    ? `/?kecamatan=${encodeURIComponent(kecSlug)}`
    : "/";

  return (
    <div className="min-h-[60vh] max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Desa tidak ditemukan</h1>
      <p className="text-sm text-slate-600 mb-6">
        Desa <span className="font-medium">{namaSlug || "—"}</span> di Kecamatan{" "}
        <span className="font-medium">{kecSlug || "—"}</span> tidak ada dalam dataset. Periksa
        kembali ejaan nama dan kecamatan. Mungkin maksud Anda salah satu desa di bawah ini?
      </p>

      {!loading && siblings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Desa di kecamatan yang sama
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {siblings.slice(0, 12).map((d) => (
              <li key={d.objectId}>
                <Link
                  to={`/desa/${d.kecamatanSlug}/${d.namaSlug}`}
                  className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                >
                  <span className="font-medium text-slate-800">{d.namaTampil}</span>
                  <span className="text-xs text-slate-500"> · {d.luasHa.toLocaleString("id-ID")} Ha</span>
                </Link>
              </li>
            ))}
          </ul>
          {siblings.length > 12 && (
            <p className="mt-2 text-xs text-slate-500">
              +{siblings.length - 12} desa lainnya. Buka halaman kecamatan untuk daftar lengkap.
            </p>
          )}
        </div>
      )}

      <Link
        to={backHref}
        className="inline-flex items-center text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
      >
        <Home className="w-4 h-4 mr-1.5" />
        Kembali ke Peta
      </Link>
    </div>
  );
}
