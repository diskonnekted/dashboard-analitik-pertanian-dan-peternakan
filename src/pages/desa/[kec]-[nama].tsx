import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Home, RefreshCw, AlertTriangle, MapPin, Users2 } from "lucide-react";

import {
  fetchDesaDetail,
  fetchAllDesa,
  type DesaDetail,
  type DesaIndex,
} from "../../services/desa";
import {
  fetchPerikananBudidaya,
  fetchPerikananTangkap,
  type PerikananBudidaya,
  type PerikananTangkap,
} from "../../services/api";
import { DesaHero } from "../../components/desa/DesaHero";
import { DesaMapMini } from "../../components/desa/DesaMapMini";
import { DesaLahan } from "../../components/desa/DesaLahan";
import { DesaDemografi } from "../../components/desa/DesaDemografi";
import { DesaTernak } from "../../components/desa/DesaTernak";
import { DesaKelembagaan } from "../../components/desa/DesaKelembagaan";
import { DesaPerikanan } from "../../components/desa/DesaPerikanan";
import { DesaFsva } from "../../components/desa/DesaFsva";
import DefaultLayout from "../../layouts/default";
import { LoadingSpinner } from "../../components/ui";

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

  // P1-5: konteks perikanan kecamatan (BPS budidaya + tangkap) — diambil sekali,
  // difilter per kecamatan di panel DesaPerikanan.
  const [perikanan, setPerikanan] = useState<{
    budidaya: PerikananBudidaya[];
    tangkap: PerikananTangkap[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchPerikananBudidaya(), fetchPerikananTangkap()])
      .then(([budidaya, tangkap]) => {
        if (!cancelled) setPerikanan({ budidaya, tangkap });
      })
      .catch((e: unknown) => {
        console.warn("Gagal memuat konteks perikanan kecamatan:", e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      <DefaultLayout>
        <section className="flex flex-col gap-8">
          <LoadingSpinner label="Memuat data desa…" />
        </section>
      </DefaultLayout>
    );
  }

  if (error || !detail) {
    return <NotFoundView kecSlug={kec ?? ""} namaSlug={nama ?? ""} />;
  }

  const hasAnyFailure = sourceFailures.lahan || sourceFailures.kelompokTani || sourceFailures.st2023;

  return (
    <DefaultLayout>
      <section className="flex flex-col gap-6">
        <DesaHero desa={detail} />

        {hasAnyFailure && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 flex-shrink-0">
              <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
            </div>
            <div className="flex-1">
              <span className="font-medium">Sebagian data tidak termuat</span>
              <span className="text-amber-800/85">
                {" — "}
                {[
                  sourceFailures.lahan && "lahan",
                  sourceFailures.kelompokTani && "kelompok tani",
                  sourceFailures.st2023 && "ST2023",
                ]
                  .filter(Boolean)
                  .join(", ")}
                {" kemungkinan CKAN sedang tidak tersedia."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRetryToken((t) => t + 1)}
              className="
                inline-flex items-center text-xs
                bg-white hover:bg-amber-50
                text-amber-800
                ring-1 ring-amber-200 hover:ring-amber-300
                px-2 py-0.5 rounded flex-shrink-0
                transition-colors
              "
              aria-label="Coba muat ulang data"
            >
              <RefreshCw className="w-2.5 h-2.5 mr-0.5" />
              Coba lagi
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {detail.centroid && detail.geometry ? (
              <DesaMapMini
                centerLng={detail.centroid[0]}
                centerLat={detail.centroid[1]}
                geometry={detail.geometry}
                namaTampil={detail.namaTampil}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                <MapPin className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs text-slate-500">Geometri polygon tidak tersedia.</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {detail.tetangga.length > 0 && (
              <aside className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
                <header className="mb-2 flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-1 inline-block h-4 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-700"
                  />
                  <div>
                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-800 leading-tight">
                      <Users2 className="w-3.5 h-3.5 text-emerald-700" />
                      Desa Terdekat
                    </h3>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      Tetangga administrasi.
                    </p>
                  </div>
                </header>
                <ul className="space-y-0.5">
                  {detail.tetangga.map((t, i) => (
                    <li
                      key={i}
                      className="
                        flex items-center justify-between gap-2
                        rounded px-1.5 py-1
                        text-xs text-slate-700
                        hover:bg-emerald-50/60 transition-colors
                      "
                    >
                      <span className="font-medium truncate">{t.nama}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 whitespace-nowrap">
                        Kec. {t.kecamatan}
                      </span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DesaLahan data={detail.lahan} />
          <DesaDemografi data={detail.st2023} />
          <DesaTernak data={detail.st2023?.ternak ?? null} />
          <DesaPerikanan
            kecamatan={detail.kecamatanTampil}
            budidaya={perikanan?.budidaya ?? []}
            tangkap={perikanan?.tangkap ?? []}
            ready={perikanan !== null}
          />
          <DesaKelembagaan data={detail.kelompokTani} />
          <DesaFsva objectId={detail.objectId} />
        </div>
      </section>
    </DefaultLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Halaman "Tidak Ditemukan" yang lebih ramah */
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
    <DefaultLayout>
      <section className="mx-auto w-full max-w-2xl py-8">
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
                  className="
                    block rounded-lg
                    border border-slate-200 bg-white
                    px-3 py-2 text-sm
                    hover:border-emerald-400 hover:bg-emerald-50
                    transition-colors
                  "
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
      </section>
    </DefaultLayout>
  );
}